// ============================================
// Allocation — Tests
// ============================================
//
// Tests pure helpers and the allocation runner.
// Pure helpers: no DB, no mocks needed.
// Runner: uses a FakeDb that simulates Supabase query builder patterns.

import { describe, it, expect } from "vitest";
import {
  addDaysISO,
  diffDaysISO,
  todayISO,
  getCurrentAllocationPeriod,
  isProgramEligible,
  computeAllocationState,
  checkPartnerCapacity,
  runAutomaticAllocation,
  DEFAULT_PROGRAM_LEAD_LIMIT,
  DEFAULT_WEEKLY_LEAD_LIMIT,
  ALLOCATION_PERIOD_DAYS,
  PROGRAM_DURATION_DAYS,
  type AllocationRunResult,
} from "./allocation";

// ============================================
// Pure helper tests
// ============================================

describe("addDaysISO", () => {
  it("adds days correctly", () => {
    expect(addDaysISO("2026-01-01", 1)).toBe("2026-01-02");
    expect(addDaysISO("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDaysISO("2026-12-30", 3)).toBe("2027-01-02");
  });

  it("handles subtracting days via negative", () => {
    expect(addDaysISO("2026-01-02", -1)).toBe("2026-01-01");
    expect(addDaysISO("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("handles zero days", () => {
    expect(addDaysISO("2026-06-15", 0)).toBe("2026-06-15");
  });
});

describe("diffDaysISO", () => {
  it("computes positive diff", () => {
    expect(diffDaysISO("2026-01-01", "2026-01-02")).toBe(1);
    expect(diffDaysISO("2026-01-01", "2026-02-01")).toBe(31);
  });

  it("computes negative diff", () => {
    expect(diffDaysISO("2026-01-02", "2026-01-01")).toBe(-1);
  });

  it("same date = 0", () => {
    expect(diffDaysISO("2026-06-15", "2026-06-15")).toBe(0);
  });
});

describe("getCurrentAllocationPeriod", () => {
  it("returns day 1 of first period on start date", () => {
    const result = getCurrentAllocationPeriod("2026-01-01", "2026-01-01");
    expect(result.start).toBe("2026-01-01");
    expect(result.end).toBe("2026-01-08");
    expect(result.dayInPeriod).toBe(1);
  });

  it("returns day 7 of first period", () => {
    const result = getCurrentAllocationPeriod("2026-01-01", "2026-01-07");
    expect(result.start).toBe("2026-01-01");
    expect(result.end).toBe("2026-01-08");
    expect(result.dayInPeriod).toBe(7);
  });

  it("returns second period correctly", () => {
    const result = getCurrentAllocationPeriod("2026-01-01", "2026-01-08");
    expect(result.start).toBe("2026-01-08");
    expect(result.end).toBe("2026-01-15");
    expect(result.dayInPeriod).toBe(1);
  });

  it("returns third period correctly", () => {
    const result = getCurrentAllocationPeriod("2026-01-01", "2026-01-20");
    expect(result.start).toBe("2026-01-15");
    expect(result.end).toBe("2026-01-22");
    expect(result.dayInPeriod).toBe(6);
  });

  it("handles program start in the future", () => {
    const result = getCurrentAllocationPeriod("2026-02-01", "2026-01-15");
    expect(result.start).toBe("2026-02-01");
    expect(result.end).toBe("2026-02-08");
    expect(result.dayInPeriod).toBe(0);
  });
});

describe("isProgramEligible", () => {
  it("eligible when within program", () => {
    const result = isProgramEligible("2026-01-01", "2026-01-15", true);
    expect(result.eligible).toBe(true);
  });

  it("not eligible when allocation disabled", () => {
    const result = isProgramEligible("2026-01-01", "2026-01-15", false);
    expect(result.eligible).toBe(false);
    expect(result.reason).toContain("disabled");
  });

  it("not eligible when program hasn't started", () => {
    const result = isProgramEligible("2026-02-01", "2026-01-15", true);
    expect(result.eligible).toBe(false);
    expect(result.reason).toContain("not started");
  });

  it("not eligible when program expired", () => {
    const result = isProgramEligible("2026-01-01", "2026-02-01", true);
    expect(result.eligible).toBe(false);
    expect(result.reason).toContain("expired");
  });

  it("eligible on last day of program", () => {
    const result = isProgramEligible("2026-01-01", "2026-01-30", true);
    expect(result.eligible).toBe(true);
  });
});

describe("computeAllocationState", () => {
  it("computes correct state for active partner", () => {
    const state = computeAllocationState({
      partnerId: "p1",
      programStartDate: "2026-01-01",
      today: "2026-01-15",
      totalAssigned: 50,
      effectiveProgramLimit: 400,
      approvedExtraLeads: 0,
      weeklyLimit: 100,
      weeklyUsed: 30,
      allocationEnabled: true,
    });

    expect(state.partnerId).toBe("p1");
    expect(state.programDay).toBe(15);
    expect(state.totalAssigned).toBe(50);
    expect(state.effectiveProgramLimit).toBe(400);
    expect(state.programCapacity).toBe(350);
    expect(state.weeklyLimit).toBe(100);
    expect(state.weeklyUsed).toBe(30);
    expect(state.weeklyCapacity).toBe(70);
    expect(state.eligible).toBe(true);
  });

  it("computes correct state for expired partner", () => {
    const state = computeAllocationState({
      partnerId: "p1",
      programStartDate: "2026-01-01",
      today: "2026-02-01",
      totalAssigned: 200,
      effectiveProgramLimit: 400,
      approvedExtraLeads: 0,
      weeklyLimit: 100,
      weeklyUsed: 0,
      allocationEnabled: true,
    });

    expect(state.programExpired).toBe(true);
    expect(state.eligible).toBe(false);
    expect(state.programCapacity).toBe(200);
  });

  it("includes approved extra leads in effective limit", () => {
    const state = computeAllocationState({
      partnerId: "p1",
      programStartDate: "2026-01-01",
      today: "2026-01-15",
      totalAssigned: 380,
      effectiveProgramLimit: 500,
      approvedExtraLeads: 100,
      weeklyLimit: 100,
      weeklyUsed: 0,
      allocationEnabled: true,
    });

    expect(state.effectiveProgramLimit).toBe(500);
    expect(state.approvedExtraLeads).toBe(100);
    expect(state.programCapacity).toBe(120);
  });
});

// ============================================
// Shared test data (visible to all test blocks)
// ============================================

// Use start date 3 days ago so partner is active (day 4 of 30) and in first period
const recentStart = (() => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 3);
  return d.toISOString().slice(0, 10);
})();

// Use start date 35 days ago so partner is expired
const expiredStart = (() => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 35);
  return d.toISOString().slice(0, 10);
})();

// Compute the current allocation period for recentStart
const currentPeriod = getCurrentAllocationPeriod(recentStart, todayISO());

// ============================================
// Runner tests (with FakeDb)
// ============================================

class FakeQuery {
  private data: Record<string, unknown>[] = [];
  private filters: { type: string; key: string; value: unknown }[] = [];
  private _single = false;
  private _maybeSingle = false;
  private _count: { exact: boolean; head: boolean } | null = null;
  private _order: { column: string; ascending: boolean } | null = null;
  private _limit: number | null = null;
  private selectColumns: string | null = null;

  constructor(initialData: Record<string, unknown>[]) {
    this.data = initialData;
  }

  select(columns?: string, opts?: { count?: string; head?: boolean }) {
    this.selectColumns = columns || "*";
    if (opts?.count === "exact" && opts?.head) {
      this._count = { exact: true, head: true };
    }
    return this;
  }

  eq(col: string, val: unknown) {
    this.filters.push({ type: "eq", key: col, value: val });
    return this;
  }

  in(col: string, vals: unknown[]) {
    this.filters.push({ type: "in", key: col, value: vals });
    return this;
  }

  single() {
    this._single = true;
    return this;
  }

  maybeSingle() {
    this._maybeSingle = true;
    return this;
  }

  order(col: string, opts: { ascending: boolean }) {
    this._order = { column: col, ascending: opts.ascending };
    return this;
  }

  limit(n: number) {
    this._limit = n;
    return this;
  }

  async then(resolve: (result: { data: unknown; error: null | { message: string }; count?: number }) => void) {
    let filtered = [...this.data];

    for (const f of this.filters) {
      if (f.type === "eq") {
        filtered = filtered.filter((r) => r[f.key] === f.value);
      } else if (f.type === "in") {
        const vals = f.value as unknown[];
        filtered = filtered.filter((r) => vals.includes(r[f.key]));
      }
    }

    if (this._order) {
      const col = this._order.column;
      const asc = this._order.ascending;
      filtered.sort((a, b) => {
        const av = a[col] ?? "";
        const bv = b[col] ?? "";
        return asc ? (av as string).localeCompare(bv as string) : (bv as string).localeCompare(av as string);
      });
    }

    if (this._limit !== null) {
      filtered = filtered.slice(0, this._limit);
    }

    if (this._count) {
      resolve({ data: null, error: null, count: filtered.length });
      return;
    }

    if (this._single) {
      if (filtered.length === 0) {
        resolve({ data: null, error: { message: "Not found" } });
      } else {
        resolve({ data: filtered[0], error: null });
      }
      return;
    }

    if (this._maybeSingle) {
      resolve({ data: filtered[0] || null, error: null });
      return;
    }

    resolve({ data: filtered, error: null });
  }
}

class FakeRpc {
  private calls: { fn: string; args: Record<string, unknown> }[] = [];
  private partnerLeads: Map<string, number> = new Map();

  constructor() {
    this.partnerLeads = new Map();
  }

  async call(fn: string, args: Record<string, unknown>) {
    this.calls.push({ fn, args });

    if (fn === "allocate_automatic_batch") {
      const partnerId = args.p_partner_id as string;
      const maxCount = args.p_max_count as number;
      const currentTotal = this.partnerLeads.get(partnerId) || 0;
      const newTotal = Math.min(currentTotal + maxCount, 400);
      const assigned = newTotal - currentTotal;
      this.partnerLeads.set(partnerId, newTotal);
      return { data: assigned, error: null };
    }

    return { data: 0, error: null };
  }

  getCalls() {
    return this.calls;
  }
}

function makeFakeDb(partners: Record<string, unknown>[], leads: Record<string, unknown>[] = [], batches: Record<string, unknown>[] = []) {
  const rpc = new FakeRpc();

  return {
    from: (table: string) => {
      if (table === "partners") {
        return new FakeQuery(partners);
      }
      if (table === "leads") {
        return new FakeQuery(leads);
      }
      if (table === "lead_allocation_batches") {
        return new FakeQuery(batches);
      }
      return new FakeQuery([]);
    },
    rpc: (fn: string, args: Record<string, unknown>) => rpc.call(fn, args),
    _rpc: rpc,
  };
}

describe("runAutomaticAllocation", () => {
  const basePartner = {
    id: "partner-1",
    company_id: "RP001",
    status: "active",
    program_start_date: recentStart,
    default_program_lead_limit: DEFAULT_PROGRAM_LEAD_LIMIT,
    default_weekly_lead_limit: DEFAULT_WEEKLY_LEAD_LIMIT,
    approved_extra_leads: 0,
    weekly_lead_limit_override: null,
    allocation_enabled: true,
    profiles: { full_name: "Test Partner" },
  };

  it("allocates leads to eligible partner", async () => {
    const db = makeFakeDb([basePartner], []);
    const result = await runAutomaticAllocation(db as unknown as SupabaseClient, { dryRun: false });

    expect(result.results).toHaveLength(1);
    expect(result.results[0].eligible).toBe(true);
    expect(result.results[0].assigned).toBeGreaterThan(0);
    expect(result.errors).toHaveLength(0);
  });

  it("skips expired partner", async () => {
    const expiredPartner = {
      ...basePartner,
      program_start_date: expiredStart,
    };
    const db = makeFakeDb([expiredPartner], []);
    const result = await runAutomaticAllocation(db as unknown as SupabaseClient, { dryRun: false });

    expect(result.results[0].eligible).toBe(false);
    expect(result.results[0].reason).toContain("expired");
  });

  it("dryRun returns planned assignments without writing", async () => {
    const db = makeFakeDb([basePartner], []);
    const result = await runAutomaticAllocation(db as unknown as SupabaseClient, { dryRun: true });

    expect(result.results).toHaveLength(1);
    expect(result.results[0].eligible).toBe(true);
    expect(result.results[0].assigned).toBe(DEFAULT_WEEKLY_LEAD_LIMIT);
    expect(db._rpc.getCalls()).toHaveLength(0);
  });

  it("skips partner with no remaining capacity", async () => {
    const fullPartner = {
      ...basePartner,
    };
    // Create 400 leads already assigned
    const leads = Array.from({ length: 400 }, (_, i) => ({
      id: `lead-${i}`,
      assigned_to: "partner-1",
    }));
    const db = makeFakeDb([fullPartner], leads);
    const result = await runAutomaticAllocation(db as unknown as SupabaseClient, { dryRun: false });

    expect(result.results[0].eligible).toBe(true);
    expect(result.results[0].assigned).toBe(0);
    expect(result.results[0].reason).toContain("capacity");
  });

  it("handles multiple partners", async () => {
    const partner2 = {
      ...basePartner,
      id: "partner-2",
      company_id: "RP002",
      profiles: { full_name: "Partner Two" },
    };
    const db = makeFakeDb([basePartner, partner2], []);
    const result = await runAutomaticAllocation(db as unknown as SupabaseClient, { dryRun: false });

    expect(result.results).toHaveLength(2);
    expect(result.results.every((r) => r.eligible)).toBe(true);
  });

  it("skips partner with allocation disabled (not in query results)", async () => {
    const disabledPartner = {
      ...basePartner,
      allocation_enabled: false,
    };
    // runAutomaticAllocation filters on allocation_enabled=true, so disabled partner won't appear
    const db = makeFakeDb([disabledPartner], []);
    const result = await runAutomaticAllocation(db as unknown as SupabaseClient, { dryRun: false });

    // Query filters out disabled partners — results should be empty
    expect(result.results).toHaveLength(0);
  });

  it("respects weekly capacity limit", async () => {
    const weeklyPartner = {
      ...basePartner,
      default_weekly_lead_limit: 10,
    };
    // Use manual source so the automatic idempotency check doesn't skip capacity check
    const batches = [
      {
        id: "b1",
        partner_id: "partner-1",
        allocation_period_start: currentPeriod.start,
        allocation_period_end: currentPeriod.end,
        lead_count: 10,
        source: "manual",
      },
    ];
    const db = makeFakeDb([weeklyPartner], [], batches);
    const result = await runAutomaticAllocation(db as unknown as SupabaseClient, { dryRun: false });

    // Weekly limit already reached
    expect(result.results[0].eligible).toBe(true);
    expect(result.results[0].assigned).toBe(0);
    expect(result.results[0].reason).toContain("capacity");
  });
});

describe("checkPartnerCapacity", () => {
  it("allows assignment within limits", async () => {
    const partner = {
      id: "partner-1",
      program_start_date: recentStart,
      default_program_lead_limit: 400,
      default_weekly_lead_limit: 100,
      approved_extra_leads: 0,
      weekly_lead_limit_override: null,
      allocation_enabled: true,
    };
    const db = makeFakeDb([partner], []);
    const result = await checkPartnerCapacity(
      db as unknown as SupabaseClient,
      "partner-1",
      50,
    );

    expect(result.allowed).toBe(true);
    expect(result.programRemaining).toBe(400);
    expect(result.weeklyRemaining).toBe(100);
  });

  it("blocks assignment exceeding program limit", async () => {
    const partner = {
      id: "partner-1",
      program_start_date: recentStart,
      default_program_lead_limit: 400,
      default_weekly_lead_limit: 100,
      approved_extra_leads: 0,
      weekly_lead_limit_override: null,
      allocation_enabled: true,
    };
    const leads = Array.from({ length: 395 }, (_, i) => ({
      id: `lead-${i}`,
      assigned_to: "partner-1",
    }));
    const db = makeFakeDb([partner], leads);
    const result = await checkPartnerCapacity(
      db as unknown as SupabaseClient,
      "partner-1",
      10,
    );

    expect(result.allowed).toBe(false);
    expect(result.message).toContain("Program capacity");
  });

  it("blocks assignment exceeding weekly limit", async () => {
    const partner = {
      id: "partner-1",
      program_start_date: recentStart,
      default_program_lead_limit: 400,
      default_weekly_lead_limit: 10,
      approved_extra_leads: 0,
      weekly_lead_limit_override: null,
      allocation_enabled: true,
    };
    // Use correct period start for this partner
    const batches = [
      {
        id: "b1",
        partner_id: "partner-1",
        allocation_period_start: currentPeriod.start,
        allocation_period_end: currentPeriod.end,
        lead_count: 8,
        source: "automatic",
      },
    ];
    const db = makeFakeDb([partner], [], batches);
    const result = await checkPartnerCapacity(
      db as unknown as SupabaseClient,
      "partner-1",
      5,
    );

    expect(result.allowed).toBe(false);
    expect(result.message).toContain("Weekly capacity");
  });
});

describe("constants", () => {
  it("has correct default limits", () => {
    expect(DEFAULT_PROGRAM_LEAD_LIMIT).toBe(400);
    expect(DEFAULT_WEEKLY_LEAD_LIMIT).toBe(100);
    expect(ALLOCATION_PERIOD_DAYS).toBe(7);
    expect(PROGRAM_DURATION_DAYS).toBe(30);
  });
});
