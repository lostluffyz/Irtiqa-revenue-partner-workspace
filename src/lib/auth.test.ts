import { describe, it, expect } from "vitest";
import {
  normalizeCompanyId,
  toAuthEmail,
  isValidCompanyId,
  fromAuthEmail,
  COMPANY_ID_MIN_LENGTH,
  COMPANY_ID_MAX_LENGTH,
} from "./auth";

describe("normalizeCompanyId", () => {
  it("trims whitespace and uppercases", () => {
    expect(normalizeCompanyId("  rp-1001  ")).toBe("RP-1001");
  });

  it("handles already-normal input", () => {
    expect(normalizeCompanyId("RP-1001")).toBe("RP-1001");
  });
});

describe("toAuthEmail", () => {
  it("maps company ID to auth email", () => {
    expect(toAuthEmail("RP-1001")).toBe("rp-1001@rp.irtiqa.internal");
  });

  it("lowercases the company ID", () => {
    expect(toAuthEmail("RP-ABC")).toBe("rp-abc@rp.irtiqa.internal");
  });
});

describe("isValidCompanyId", () => {
  it("accepts valid IDs", () => {
    expect(isValidCompanyId("RP-1001")).toBe(true);
    expect(isValidCompanyId("PARTNER_42")).toBe(true);
    expect(isValidCompanyId("ABC")).toBe(true);
    expect(isValidCompanyId("admin-1")).toBe(true);
  });

  it("rejects too-short IDs", () => {
    expect(isValidCompanyId("AB")).toBe(false);
    expect(isValidCompanyId("a")).toBe(false);
    expect(isValidCompanyId("")).toBe(false);
  });

  it("rejects IDs with special characters", () => {
    expect(isValidCompanyId("RP-1001!")).toBe(false);
    expect(isValidCompanyId("hello world")).toBe(false);
    expect(isValidCompanyId("test@id")).toBe(false);
  });
});

describe("fromAuthEmail", () => {
  it("extracts company ID from auth email", () => {
    expect(fromAuthEmail("rp-1001@rp.irtiqa.internal")).toBe("RP-1001");
  });

  it("returns null for non-partner emails", () => {
    expect(fromAuthEmail("user@gmail.com")).toBeNull();
    expect(fromAuthEmail("noatsign")).toBeNull();
  });
});

describe("constants", () => {
  it("has expected min/max length", () => {
    expect(COMPANY_ID_MIN_LENGTH).toBe(3);
    expect(COMPANY_ID_MAX_LENGTH).toBe(32);
  });
});
