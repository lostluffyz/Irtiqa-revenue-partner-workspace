import { describe, it, expect, vi } from "vitest";
import {
  CreatePartnerSchema,
  ResetPasswordSchema,
  UpdatePartnerStatusSchema,
  UpdatePartnerRegionSchema,
  DeletePartnerSchema,
  LeadAssignmentSchema,
  AnnouncementSchema,
  ResourceSchema,
  validateCsvHeaders,
  validateCsvRow,
  generateTemporaryPassword,
} from "./admin";

// Mock server-side dependencies (next/headers, cookies)
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  adminClient: {},
}));

// ============================================
// CSV Validation Helpers
// ============================================

describe("validateCsvHeaders", () => {
  it("accepts valid headers with company_name", () => {
    expect(validateCsvHeaders(["company_name", "website", "email"])).toBeNull();
  });

  it("rejects headers missing company_name", () => {
    const result = validateCsvHeaders(["website", "email"]);
    expect(result).toContain("company_name");
  });

  it("is case-sensitive (requires lowercase exact match)", () => {
    const result = validateCsvHeaders(["Company_Name", "WEBSITE"]);
    expect(result).not.toBeNull();
    expect(result).toContain("company_name");
  });
});

describe("validateCsvRow", () => {
  it("accepts a valid row", () => {
    const row = { company_name: "Acme Corp", website: "https://acme.com" };
    const result = validateCsvRow(row);
    expect(result).toBeNull();
  });

  it("rejects a row with missing company_name", () => {
    const row = { company_name: "", website: "https://acme.com" };
    const result = validateCsvRow(row);
    expect(result).toContain("required");
  });

  it("rejects a row with only whitespace company_name", () => {
    const row = { company_name: "   " };
    const result = validateCsvRow(row);
    expect(result).toContain("required");
  });

  it("trims company_name before validation", () => {
    const row = { company_name: "  Acme Corp  " };
    const result = validateCsvRow(row);
    expect(result).toBeNull();
  });

  it("rejects company_name exceeding 500 characters", () => {
    const row = { company_name: "X".repeat(501) };
    const result = validateCsvRow(row);
    expect(result).toContain("500");
  });

  it("rejects website exceeding 500 characters", () => {
    const row = { company_name: "Acme Corp", website: "https://" + "x".repeat(500) };
    const result = validateCsvRow(row);
    expect(result).toContain("500");
  });
});

// ============================================
// Password Generation
// ============================================

describe("generateTemporaryPassword", () => {
  it("generates a string", () => {
    const pwd = generateTemporaryPassword();
    expect(typeof pwd).toBe("string");
  });

  it("generates a password of sufficient length (min 12)", () => {
    const pwd = generateTemporaryPassword();
    expect(pwd.length).toBeGreaterThanOrEqual(12);
  });

  it("generates different passwords each call", () => {
    const pwd1 = generateTemporaryPassword();
    const pwd2 = generateTemporaryPassword();
    expect(pwd1).not.toBe(pwd2);
  });

  it("contains at least one uppercase letter", () => {
    const pwd = generateTemporaryPassword();
    expect(pwd).toMatch(/[A-Z]/);
  });

  it("contains at least one lowercase letter", () => {
    const pwd = generateTemporaryPassword();
    expect(pwd).toMatch(/[a-z]/);
  });

  it("contains at least one digit", () => {
    const pwd = generateTemporaryPassword();
    expect(pwd).toMatch(/[0-9]/);
  });

  it("has expected default length of 16", () => {
    const pwd = generateTemporaryPassword();
    expect(pwd.length).toBe(16);
  });
});

// ============================================
// Zod Schemas
// ============================================

const UUID = "00000000-0000-4000-8000-000000000001";

describe("CreatePartnerSchema", () => {
  it("accepts valid input", () => {
    const result = CreatePartnerSchema.safeParse({
      fullName: "John Doe",
      regionId: UUID,
      phone: "+1-555-0123",
    });
    expect(result.success).toBe(true);
  });

  it("accepts minimal input (no phone)", () => {
    const result = CreatePartnerSchema.safeParse({
      fullName: "John Doe",
      regionId: UUID,
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing fullName", () => {
    const result = CreatePartnerSchema.safeParse({
      regionId: UUID,
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing regionId", () => {
    const result = CreatePartnerSchema.safeParse({
      fullName: "John Doe",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty fullName", () => {
    const result = CreatePartnerSchema.safeParse({
      fullName: "",
      regionId: UUID,
    });
    expect(result.success).toBe(false);
  });

  it("rejects too-long fullName", () => {
    const result = CreatePartnerSchema.safeParse({
      fullName: "X".repeat(256),
      regionId: UUID,
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-uuid regionId", () => {
    const result = CreatePartnerSchema.safeParse({
      fullName: "John Doe",
      regionId: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });

  it("defaults phone to empty string when omitted", () => {
    const result = CreatePartnerSchema.safeParse({
      fullName: "John Doe",
      regionId: UUID,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.phone).toBe("");
    }
  });
});

describe("ResetPasswordSchema", () => {
  it("accepts valid partnerId with newPassword", () => {
    const result = ResetPasswordSchema.safeParse({
      partnerId: UUID,
      newPassword: "Str0ng!Pass",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing partnerId", () => {
    const result = ResetPasswordSchema.safeParse({
      newPassword: "Str0ng!Pass",
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-uuid partnerId", () => {
    const result = ResetPasswordSchema.safeParse({
      partnerId: "not-a-uuid",
      newPassword: "Str0ng!Pass",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing newPassword (required field)", () => {
    const result = ResetPasswordSchema.safeParse({
      partnerId: UUID,
    });
    expect(result.success).toBe(false);
  });

  it("rejects too-short newPassword", () => {
    const result = ResetPasswordSchema.safeParse({
      partnerId: UUID,
      newPassword: "short",
    });
    expect(result.success).toBe(false);
  });
});

describe("UpdatePartnerStatusSchema", () => {
  it("accepts valid status values", () => {
    for (const status of ["active", "inactive", "suspended"]) {
      const result = UpdatePartnerStatusSchema.safeParse({ partnerId: UUID, status });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid status", () => {
    const result = UpdatePartnerStatusSchema.safeParse({ partnerId: UUID, status: "deleted" });
    expect(result.success).toBe(false);
  });

  it("rejects non-uuid partnerId", () => {
    const result = UpdatePartnerStatusSchema.safeParse({ partnerId: "not-uuid", status: "active" });
    expect(result.success).toBe(false);
  });
});

describe("UpdatePartnerRegionSchema", () => {
  it("accepts valid regionId", () => {
    const result = UpdatePartnerRegionSchema.safeParse({ partnerId: UUID, regionId: UUID });
    expect(result.success).toBe(true);
  });

  it("rejects non-uuid regionId", () => {
    const result = UpdatePartnerRegionSchema.safeParse({ partnerId: UUID, regionId: "not-uuid" });
    expect(result.success).toBe(false);
  });

  it("rejects non-uuid partnerId", () => {
    const result = UpdatePartnerRegionSchema.safeParse({ partnerId: "not-uuid", regionId: UUID });
    expect(result.success).toBe(false);
  });
});

describe("DeletePartnerSchema", () => {
  it("accepts valid partner UUID", () => {
    const result = DeletePartnerSchema.safeParse({ partnerId: UUID });
    expect(result.success).toBe(true);
  });

  it("rejects missing partnerId", () => {
    const result = DeletePartnerSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects non-uuid partnerId", () => {
    const result = DeletePartnerSchema.safeParse({ partnerId: "not-a-uuid" });
    expect(result.success).toBe(false);
  });

  it("rejects empty string partnerId", () => {
    const result = DeletePartnerSchema.safeParse({ partnerId: "" });
    expect(result.success).toBe(false);
  });

  it("rejects null partnerId", () => {
    const result = DeletePartnerSchema.safeParse({ partnerId: null });
    expect(result.success).toBe(false);
  });

  it("accepts optional partnerName", () => {
    const result = DeletePartnerSchema.safeParse({
      partnerId: UUID,
      partnerName: "John Doe",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.partnerName).toBe("John Doe");
    }
  });

  it("defaults partnerName to undefined when omitted", () => {
    const result = DeletePartnerSchema.safeParse({ partnerId: UUID });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.partnerName).toBeUndefined();
    }
  });
});

describe("LeadAssignmentSchema", () => {
  it("accepts valid lead IDs", () => {
    const result = LeadAssignmentSchema.safeParse({
      leadIds: [UUID, "00000000-0000-4000-8000-000000000002"],
      partnerId: UUID,
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty leadIds", () => {
    const result = LeadAssignmentSchema.safeParse({
      leadIds: [],
      partnerId: UUID,
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-array leadIds", () => {
    const result = LeadAssignmentSchema.safeParse({
      leadIds: "not-an-array",
      partnerId: UUID,
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing partnerId", () => {
    const result = LeadAssignmentSchema.safeParse({
      leadIds: [UUID],
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-uuid lead IDs", () => {
    const result = LeadAssignmentSchema.safeParse({
      leadIds: ["not-a-uuid"],
      partnerId: UUID,
    });
    expect(result.success).toBe(false);
  });

  it("rejects batch larger than 500", () => {
    const result = LeadAssignmentSchema.safeParse({
      leadIds: Array(501).fill(UUID),
      partnerId: UUID,
    });
    expect(result.success).toBe(false);
  });

  it("accepts batch of exactly 500", () => {
    const result = LeadAssignmentSchema.safeParse({
      leadIds: Array(500).fill(UUID),
      partnerId: UUID,
    });
    expect(result.success).toBe(true);
  });
});

describe("AnnouncementSchema", () => {
  it("accepts valid announcement", () => {
    const result = AnnouncementSchema.safeParse({
      title: "Test Announcement",
      content: "Some content here",
      isPinned: false,
    });
    expect(result.success).toBe(true);
  });

  it("accepts isPinned as true", () => {
    const result = AnnouncementSchema.safeParse({
      title: "Pinned!",
      content: "Important",
      isPinned: true,
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing title", () => {
    const result = AnnouncementSchema.safeParse({
      content: "Some content",
      isPinned: false,
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing content", () => {
    const result = AnnouncementSchema.safeParse({
      title: "Title",
      isPinned: false,
    });
    expect(result.success).toBe(false);
  });
});

describe("ResourceSchema", () => {
  it("accepts valid resource", () => {
    const result = ResourceSchema.safeParse({
      title: "Guide",
      description: "A guide",
      type: "document",
      url: "https://example.com",
      sortOrder: 1,
      isActive: true,
    });
    expect(result.success).toBe(true);
  });

  it("accepts minimal resource (no description or url)", () => {
    const result = ResourceSchema.safeParse({
      title: "Guide",
      type: "document",
      sortOrder: 0,
      isActive: true,
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid type", () => {
    const result = ResourceSchema.safeParse({
      title: "Guide",
      type: "invalid-type",
      sortOrder: 0,
      isActive: true,
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing title", () => {
    const result = ResourceSchema.safeParse({
      type: "document",
      sortOrder: 0,
      isActive: true,
    });
    expect(result.success).toBe(false);
  });
});

// ============================================
// System Accounts
// ============================================

import {
  isProtectedAccount,
  getPartnerAuthEmail,
  extractCompanyIdFromEmail,
  PROTECTED_ACCOUNTS,
  PARTNER_EMAIL_DOMAIN,
} from "./system-accounts";

describe("isProtectedAccount", () => {
  it("protects the admin email", () => {
    expect(isProtectedAccount("admin@irtiqa.ai")).toBe(true);
  });

  it("does NOT protect partner emails (even synthetic ones)", () => {
    expect(isProtectedAccount("rp-1001@rp.irtiqa.internal")).toBe(false);
    expect(isProtectedAccount("qa-test-001@rp.irtiqa.internal")).toBe(false);
  });

  it("does NOT protect arbitrary emails", () => {
    expect(isProtectedAccount("user@example.com")).toBe(false);
    expect(isProtectedAccount("admin@rp.irtiqa.internal")).toBe(false);
  });

  it("is case-sensitive (exact match)", () => {
    expect(isProtectedAccount("Admin@irtiqa.ai")).toBe(false);
    expect(isProtectedAccount("ADMIN@IRTIQA.AI")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isProtectedAccount("")).toBe(false);
  });

  it("PROTECTED_ACCOUNTS set is not empty", () => {
    expect(PROTECTED_ACCOUNTS.size).toBeGreaterThan(0);
  });
});

describe("getPartnerAuthEmail", () => {
  it("generates correct synthetic email", () => {
    expect(getPartnerAuthEmail("RP-1001")).toBe("rp-1001@rp.irtiqa.internal");
  });

  it("lowercases the company ID", () => {
    expect(getPartnerAuthEmail("QA-TEST-001")).toBe("qa-test-001@rp.irtiqa.internal");
  });

  it("trims whitespace", () => {
    expect(getPartnerAuthEmail("  RP-1001  ")).toBe("rp-1001@rp.irtiqa.internal");
  });

  it("uses the correct domain", () => {
    const email = getPartnerAuthEmail("RP-1001");
    expect(email).toContain(`@${PARTNER_EMAIL_DOMAIN}`);
  });
});

describe("extractCompanyIdFromEmail", () => {
  it("extracts company ID from partner email", () => {
    expect(extractCompanyIdFromEmail("rp-1001@rp.irtiqa.internal")).toBe("RP-1001");
  });

  it("returns null for non-partner emails", () => {
    expect(extractCompanyIdFromEmail("admin@irtiqa.ai")).toBeNull();
    expect(extractCompanyIdFromEmail("user@example.com")).toBeNull();
  });

  it("returns null for malformed emails", () => {
    expect(extractCompanyIdFromEmail("not-an-email")).toBeNull();
    expect(extractCompanyIdFromEmail("")).toBeNull();
  });

  it("uppercases the result", () => {
    expect(extractCompanyIdFromEmail("qa-test-001@rp.irtiqa.internal")).toBe("QA-TEST-001");
  });
});
