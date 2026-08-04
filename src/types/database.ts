// ============================================
// Revenue Partner Workspace — Database Types
// GENERATED from linked Supabase project via:
//   npm run db:types:linked
// Do not edit table schemas directly.
// ============================================

import type { Database as GeneratedDatabase } from "./database.generated";

// ---- Re-export generated Database type ----

export type { Json } from "./database.generated";
export type { Tables, TablesInsert, TablesUpdate, Enums, CompositeTypes } from "./database.generated";

// ---- Higher-level type aliases (preserved from hand-maintained types) ----
// These provide meaningful constraints beyond what the generated types offer.

export type Role = "admin" | "partner";

export type LeadStatus =
  | "not_contacted"
  | "contacted"
  | "follow_up_required"
  | "appointment_booked"
  | "closed"
  | "not_interested"
  | "invalid_contact";

export type PartnerStatus = "active" | "inactive" | "suspended";

export type ResourceType = "document" | "link" | "video" | "faq";

// ---- Application-level table types ----
// Derived from the generated Database to get typed fields via the aliases above.

export type Profile = GeneratedDatabase["public"]["Tables"]["profiles"]["Row"] & {
  role: Role;
};

export type Partner = GeneratedDatabase["public"]["Tables"]["partners"]["Row"] & {
  status: PartnerStatus;
};

export type Lead = GeneratedDatabase["public"]["Tables"]["leads"]["Row"] & {
  status: LeadStatus;
};

export type DailyReport = GeneratedDatabase["public"]["Tables"]["daily_reports"]["Row"];

export type Announcement = GeneratedDatabase["public"]["Tables"]["announcements"]["Row"];

export type Resource = GeneratedDatabase["public"]["Tables"]["resources"]["Row"] & {
  type: ResourceType;
};

export type LeadStatusHistory = GeneratedDatabase["public"]["Tables"]["lead_status_history"]["Row"];

export type PartnerActivityLog = GeneratedDatabase["public"]["Tables"]["partner_activity_log"]["Row"];

export type Region = GeneratedDatabase["public"]["Tables"]["regions"]["Row"];

export type AdminAuditLog = GeneratedDatabase["public"]["Tables"]["admin_audit_log"]["Row"];
