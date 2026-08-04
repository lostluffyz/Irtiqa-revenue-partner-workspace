"use server";

import { revalidatePath } from "next/cache";
import {
  requirePartner,
  LeadStatusUpdateSchema,
  DailyReportSchema,
  logPartnerActivity,
  PROGRAM_TIMEZONE,
} from "@/lib/partner";
import { getBusinessDate } from "@/lib/program-timezone";
import type { LeadStatus } from "@/types/database";

// ============================================
// Update Lead Status
// ============================================

export async function updateLeadStatusAction(
  _prev: unknown,
  formData: FormData,
): Promise<{ success?: boolean; error?: string }> {
  const { supabase, partner } = await requirePartner();

  const raw = {
    leadId: formData.get("leadId"),
    status: formData.get("status"),
  };

  const parsed = LeadStatusUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Invalid input" };
  }

  // Get current lead status for history
  const { data: lead, error: fetchError } = await supabase
    .from("leads")
    .select("status")
    .eq("id", parsed.data.leadId)
    .single();

  if (fetchError || !lead) {
    return { error: "Lead not found" };
  }

  // Update lead status (RLS enforces partner can only update assigned leads)
  const { error: updateError } = await supabase
    .from("leads")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.leadId);

  if (updateError) {
    return { error: updateError.message };
  }

  // Log status history (RLS enforces changed_by = auth.uid())
  const { error: historyError } = await supabase
    .from("lead_status_history")
    .insert({
      lead_id: parsed.data.leadId,
      changed_by: partner.id,
      old_status: lead.status,
      new_status: parsed.data.status,
    });

  if (historyError) {
    console.error("Failed to log status history:", historyError.message);
  }

  // Log partner activity
  await logPartnerActivity(supabase, partner.id, "lead_status_updated", {
    leadId: parsed.data.leadId,
    oldStatus: lead.status,
    newStatus: parsed.data.status,
  });

  revalidatePath("/partner/leads");
  return { success: true };
}

// ============================================
// Submit Daily Report — ONE SUBMISSION ONLY
// ============================================

export async function submitDailyReportAction(
  _prev: unknown,
  formData: FormData,
): Promise<{ success?: boolean; error?: string }> {
  const { supabase, partner } = await requirePartner();

  const raw = {
    leadsContacted: formData.get("leadsContacted"),
    appointmentsBooked: formData.get("appointmentsBooked"),
    dealsClosed: formData.get("dealsClosed"),
    biggestChallenge: formData.get("biggestChallenge"),
    additionalNotes: formData.get("additionalNotes"),
  };

  const parsed = DailyReportSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Invalid input" };
  }

  const today = getBusinessDate(PROGRAM_TIMEZONE);

  // Check if today's report already exists — reject if submitted
  const { data: existing } = await supabase
    .from("daily_reports")
    .select("id")
    .eq("partner_id", partner.id)
    .eq("report_date", today)
    .maybeSingle();

  if (existing) {
    return { error: "You have already submitted today's report." };
  }

  // Insert new report
  const { error } = await supabase
    .from("daily_reports")
    .insert({
      partner_id: partner.id,
      report_date: today,
      leads_contacted: parsed.data.leadsContacted,
      appointments_booked: parsed.data.appointmentsBooked,
      deals_closed: parsed.data.dealsClosed,
      biggest_challenge: parsed.data.biggestChallenge || null,
      additional_notes: parsed.data.additionalNotes || null,
    });

  if (error) {
    return { error: error.message };
  }

  // Log partner activity
  await logPartnerActivity(supabase, partner.id, "daily_report_submitted", {
    reportDate: today,
  });

  revalidatePath("/partner/report");
  return { success: true };
}

// ============================================
// Fetch Lead Details (for drawer)
// ============================================

export type LeadDetail = {
  id: string;
  company_name: string;
  website: string | null;
  email: string | null;
  phone: string | null;
  industry: string | null;
  country: string | null;
  status: LeadStatus;
  internal_notes: string | null;
  assigned_at: string | null;
  created_at: string;
};

export type StatusHistoryEntry = {
  id: string;
  old_status: string;
  new_status: string;
  changed_at: string;
  changed_by: string;
};

export type LeadDetailsResult = {
  lead: LeadDetail | null;
  statusHistory: StatusHistoryEntry[];
  error?: string;
};

export async function fetchLeadDetailsAction(
  leadId: string,
): Promise<LeadDetailsResult> {
  try {
    const { supabase, partner } = await requirePartner();

    // Fetch lead — RLS policy enforces assigned_to = auth.uid()
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("id, company_name, website, email, phone, industry, country, status, internal_notes, assigned_at, created_at")
      .eq("id", leadId)
      .single();

    if (leadError || !lead) {
      return { lead: null, statusHistory: [], error: "Lead not found" };
    }

    // Fetch status history
    const { data: history } = await supabase
      .from("lead_status_history")
      .select("id, old_status, new_status, changed_at, changed_by")
      .eq("lead_id", leadId)
      .order("changed_at", { ascending: false });

    return {
      lead: lead as LeadDetail,
      statusHistory: (history || []) as StatusHistoryEntry[],
    };
  } catch {
    return { lead: null, statusHistory: [], error: "Failed to load lead details" };
  }
}

// ============================================
// Update Lead Notes (autosave)
// ============================================

export async function updateLeadNotesAction(
  leadId: string,
  notes: string,
): Promise<{ success?: boolean; error?: string }> {
  const { supabase, partner } = await requirePartner();

  // Verify partner owns this lead (RLS enforced)
  const { error } = await supabase
    .from("leads")
    .update({ internal_notes: notes })
    .eq("id", leadId)
    .eq("assigned_to", partner.id);

  if (error) {
    return { error: error.message };
  }

  await logPartnerActivity(supabase, partner.id, "lead_notes_updated", {
    leadId,
  });

  revalidatePath("/partner/leads");
  return { success: true };
}
