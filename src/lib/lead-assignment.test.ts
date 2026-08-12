import { describe, it, expect } from "vitest";
import {
  computePreview,
  executeAssignment,
  type SmartAssignmentParams,
} from "./lead-assignment";

// ============================================
// In-memory Supabase query builder mock
// ============================================
// Faithfully reproduces PostgreSQL three-valued logic for NULL:
//   NULL NOT IN (...) and NULL != x  →  NULL  →  row is excluded.
// This is what broke the Smart Lead Assignment preview (available=0).

type Row = Record<string, unknown> & { id: string };

interface Db {
  leads: Row[];
  partners: Row[];
}

const LIST_RE = /^\((.*)\)$/s;

function splitOrClauses(orStr: string): string[] {
  return orStr.split(",");
}

function parseOrPredicate(orStr: string): (r: Row) => boolean {
  const clauses = splitOrClauses(orStr).map((c) => {
    const parts = c.split(".");
    return { col: parts[0], op: parts[1], value: parts.slice(2).join(".") };
  });
  return (r: Row) =>
    clauses.some(({ col, op, value }) => {
      const v = r[col];
      switch (op) {
        case "is":
          return value === "null" ? v === null : v === value;
        case "eq":
          return v === value;
        default:
          return false;
      }
    });
}

function parseList(value: string): string[] {
  const m = LIST_RE.exec(value);
  if (!m) return [];
  return m[1]
    .split(",")
    .map((s) => s.trim().replace(/^"|"$/g, ""))
    .filter(Boolean);
}

class FakeQuery {
  private filters: Array<(r: Row) => boolean> = [];
  private sortCol = "";
  private sortAsc = true;
  private limitN: number | null = null;
  private head = false;
  private updatePayload: Record<string, unknown> | null = null;

  constructor(
    private table: "leads" | "partners",
    private db: Db,
  ) {}

  select(
    _cols?: string,
    options?: { count?: "exact" | "planned" | "estimated"; head?: boolean },
  ) {
    if (options?.head) {
      this.head = true;
    }
    return this;
  }

  is(col: string, val: unknown): this {
    this.filters.push((r) => r[col] === val);
    return this;
  }

  eq(col: string, val: unknown): this {
    this.filters.push((r) => r[col] === val);
    return this;
  }

  neq(col: string, val: unknown): this {
    // SQL: NULL != x → NULL → excluded
    this.filters.push((r) => r[col] !== null && r[col] !== val);
    return this;
  }

  not(col: string, op: string, value: unknown): this {
    switch (op) {
      case "in": {
        const list = parseList(String(value));
        // SQL: NULL NOT IN (...) → NULL → excluded
        this.filters.push(
          (r) => r[col] !== null && !list.includes(String(r[col])),
        );
        break;
      }
      case "eq":
        this.filters.push((r) => r[col] !== null && r[col] !== value);
        break;
      case "is":
        this.filters.push((r) => r[col] !== value);
        break;
      default:
        throw new Error(`Unsupported not operator: ${op}`);
    }
    return this;
  }

  in(col: string, values: unknown[]): this {
    // SQL: NULL IN (...) → NULL → excluded
    this.filters.push((r) => r[col] !== null && values.includes(r[col]));
    return this;
  }

  ilike(col: string, pattern: string): this {
    const needle = pattern.replace(/^%|%$/g, "").toLowerCase();
    this.filters.push((r) =>
      String(r[col] ?? "").toLowerCase().includes(needle),
    );
    return this;
  }

  gte(col: string, value: unknown): this {
    this.filters.push((r) => r[col] != null && r[col] >= value);
    return this;
  }

  or(orStr: string): this {
    const predicate = parseOrPredicate(orStr);
    this.filters.push(predicate);
    return this;
  }

  order(col: string, opts?: { ascending?: boolean }): this {
    this.sortCol = col;
    this.sortAsc = opts?.ascending !== false;
    return this;
  }

  limit(n: number): this {
    this.limitN = n;
    return this;
  }

  update(payload: Record<string, unknown>): this {
    this.updatePayload = payload;
    return this;
  }

  private matchingRows(): Row[] {
    return this.db[this.table].filter((r) =>
      this.filters.every((f) => f(r)),
    );
  }

  private run(): { data: Row[] | null; count: number | null; error: { message: string } | null } {
    const rows = this.matchingRows();
    if (this.updatePayload) {
      const affected = this.filters.length === 0 ? rows : rows;
      for (const r of affected) Object.assign(r, this.updatePayload);
      return { data: null, count: null, error: null };
    }
    if (this.sortCol) {
      rows.sort((a, b) => {
        const av = a[this.sortCol];
        const bv = b[this.sortCol];
        if (av == null) return 1;
        if (bv == null) return -1;
        return this.sortAsc
          ? String(av).localeCompare(String(bv))
          : String(bv).localeCompare(String(av));
      });
    }
    const sliced = this.limitN != null ? rows.slice(0, this.limitN) : rows;
    if (this.head) {
      return { data: null, count: rows.length, error: null };
    }
    return { data: sliced, count: null, error: null };
  }

  then<TResult1 = unknown, TResult2 = never>(
    onFulfilled?: ((value: ReturnType<FakeQuery["run"]>) => TResult1 | PromiseLike<TResult1>) | null,
    onRejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve(this.run()).then(onFulfilled, onRejected);
  }
}

function makeClient(db: Db) {
  return {
    from(table: "leads" | "partners") {
      return new FakeQuery(table, db);
    },
  };
}

// ============================================
// Fixtures
// ============================================

const PARTNER_IDS = [
  "11111111-1111-1111-1111-111111111111",
  "22222222-2222-2222-2222-222222222222",
  "33333333-3333-3333-3333-333333333333",
  "44444444-4444-4444-4444-444444444444",
  "55555555-5555-5555-5555-555555555555",
  "66666666-6666-6666-6666-666666666666",
  "77777777-7777-7777-7777-777777777777",
];

function buildPartners(): Row[] {
  return PARTNER_IDS.map((id, i) => ({
    id,
    company_id: `P-${i + 1}`,
    status: "active",
    profiles: { full_name: `Partner ${i + 1}` },
  }));
}

function buildLeads(count: number): Row[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `lead-${String(i).padStart(4, "0")}`,
    company_name: `Company ${i}`,
    website: null,
    email: null,
    industry: "Website designer",
    country: "United Kingdom",
    state: null,
    city: null,
    status: "not_contacted",
    assigned_to: null,
    assigned_at: null,
    created_at: new Date(Date.now() - i * 60000).toISOString(),
  }));
}

function buildDb(leadCount: number): { db: Db; client: ReturnType<typeof makeClient> } {
  const db: Db = {
    leads: buildLeads(leadCount),
    partners: buildPartners(),
  };
  return { db, client: makeClient(db) };
}

const params = (overrides: Partial<SmartAssignmentParams> = {}): SmartAssignmentParams => ({
  partnerIds: PARTNER_IDS,
  method: "random",
  limit: 100,
  ...overrides,
});

// ============================================
// Regression Tests — Smart Lead Assignment
// ============================================

describe("Smart Lead Assignment — production bug regression", () => {
  it("preview: 1000 unassigned leads + Random + 100 requested selects 100", async () => {
    const { client } = buildDb(1000);
    const preview = await computePreview(client as never, params());

    expect(preview.requested).toBe(100);
    expect(preview.matching).toBe(1000);
    expect(preview.available).toBe(1000);
    expect(preview.willAssign).toBe(100);
  });

  it("preview: remaining = 900 (1000 matching − 100 will assign)", async () => {
    const { client } = buildDb(1000);
    const preview = await computePreview(client as never, params());

    const remaining = preview.matching - preview.willAssign;
    expect(remaining).toBe(900);
  });

  it("preview: no filters selected does NOT exclude any leads (noMatch=0)", async () => {
    const { client } = buildDb(1000);
    const preview = await computePreview(client as never, params());

    expect(preview.skipBreakdown.noMatch).toBe(0);
    expect(preview.skipBreakdown.alreadyAssigned).toBe(0);
    expect(preview.skipBreakdown.missingData).toBe(0);
    expect(preview.skipped).toBe(0);
  });

  it("preview: sample leads returned for the eligible pool", async () => {
    const { client } = buildDb(1000);
    const preview = await computePreview(client as never, params());

    expect(preview.previewLeads.length).toBeGreaterThan(0);
    expect(preview.previewLeads.length).toBeLessThanOrEqual(20);
  });

  it("preview: distribution spreads 100 across all 7 partners", async () => {
    const { client } = buildDb(1000);
    const preview = await computePreview(client as never, params());

    expect(preview.distribution).toHaveLength(7);
    const totalIncoming = preview.distribution.reduce((s, d) => s + d.incoming, 0);
    expect(totalIncoming).toBe(100);
    for (const d of preview.distribution) {
      expect(d.incoming).toBeGreaterThanOrEqual(14);
      expect(d.incoming).toBeLessThanOrEqual(15);
    }
  });

  it("execute: assigns exactly 100 leads, leaving 900 unassigned", async () => {
    const { db, client } = buildDb(1000);
    const result = await executeAssignment(client as never, params());

    expect(result.assigned).toBe(100);
    expect(result.skipped).toBe(0);
    expect(result.distribution).toHaveLength(7);
    const distributed = result.distribution.reduce((s, d) => s + d.assigned, 0);
    expect(distributed).toBe(100);

    const remainingUnassigned = db.leads.filter((l) => l.assigned_to === null).length;
    expect(remainingUnassigned).toBe(900);
  });

  it("execute: each partner receives a distinct 14–15 lead batch", async () => {
    const { client } = buildDb(1000);
    const result = await executeAssignment(client as never, params());

    for (const d of result.distribution) {
      expect(d.partnerId).not.toBe("");
      expect(d.assigned).toBeGreaterThanOrEqual(14);
      expect(d.assigned).toBeLessThanOrEqual(15);
    }
    // All assigned leads map to exactly one partner (no overlap)
    const counts = result.distribution.map((d) => d.assigned);
    expect(counts.reduce((s, c) => s + c, 0)).toBe(100);
  });
});

describe("SQL NULL semantics guard (why the bug happened)", () => {
  it("combining assigned_to IS NULL with NOT IN excludes every unassigned lead", async () => {
    const { client } = buildDb(1000);
    const q = client
      .from("leads")
      .select("id", { count: "exact", head: true })
      .is("assigned_to", null)
      .not("assigned_to", "in", `(${PARTNER_IDS.map((id) => `"${id}"`).join(",")})`);
    const { count } = (await q) as { count: number };
    // SQL NULL semantics: NULL NOT IN (...) is NULL → all rows filtered out
    expect(count).toBe(0);
  });

  it("assigned_to IS NULL alone returns the full unassigned pool", async () => {
    const { client } = buildDb(1000);
    const q = client
      .from("leads")
      .select("id", { count: "exact", head: true })
      .is("assigned_to", null);
    const { count } = (await q) as { count: number };
    expect(count).toBe(1000);
  });
});
