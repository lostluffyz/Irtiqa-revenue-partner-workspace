// ============================================
// Assignment Methods — Registry Pattern
// ============================================
//
// Each method is a config object. Adding a new method = adding one entry.
// The dialog reads this registry to render dynamic fields and build queries.

import {
  Shuffle, Globe, MapPin, Building2, Clock,
  UserMinus, Link, BarChart3, Filter, Users, Scale,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FieldConfig {
  /** Maps to formData key and state key. */
  key: string;
  /** Label shown in UI. */
  label: string;
  /** Determines which UI component renders. */
  type: "select" | "searchable" | "number" | "time_range";
  /** Whether the field is required. */
  required: boolean;
  /** Options for select/time_range type. */
  options?: { value: string; label: string }[];
  /** Placeholder text. */
  placeholder?: string;
  /** Fetch distinct values from server for searchable type. */
  fetchFrom?: string;
}

export interface AssignmentMethodConfig {
  value: string;
  label: string;
  description: string;
  icon: LucideIcon;
  fields: FieldConfig[];
  /** Minimum partners required for this method. Default: 1. */
  minPartners?: number;
}

// ---------------------------------------------------------------------------
// Status options (matches STATUS_CONFIG in lead-table.tsx)
// ---------------------------------------------------------------------------

const STATUS_OPTIONS = [
  { value: "not_contacted", label: "Not Contacted" },
  { value: "contacted", label: "Contacted" },
  { value: "follow_up_required", label: "Follow Up Required" },
  { value: "appointment_booked", label: "Appointment Booked" },
  { value: "closed", label: "Closed" },
  { value: "not_interested", label: "Not Interested" },
  { value: "invalid_contact", label: "Invalid Contact" },
];

const TIME_RANGE_OPTIONS = [
  { value: "last_import", label: "Last Import" },
  { value: "today", label: "Today" },
  { value: "this_week", label: "This Week" },
  { value: "last_30_days", label: "Last 30 Days" },
];

// ---------------------------------------------------------------------------
// Method Registry
// ---------------------------------------------------------------------------

export const ASSIGNMENT_METHODS: AssignmentMethodConfig[] = [
  {
    value: "random",
    label: "Random",
    description: "Randomly select eligible leads",
    icon: Shuffle,
    fields: [],
  },
  {
    value: "auto_balance",
    label: "Auto Balance",
    description:
      "Distribute leads evenly among selected partners based on current workload. Requires 2+ partners.",
    icon: Scale,
    fields: [],
    minPartners: 2,
  },
  {
    value: "country",
    label: "Country",
    description: "Assign leads by country",
    icon: Globe,
    fields: [
      {
        key: "country",
        label: "Country",
        type: "searchable",
        required: true,
        placeholder: "Search countries...",
        fetchFrom: "country",
      },
    ],
  },
  {
    value: "state",
    label: "State",
    description: "Assign leads by state or province",
    icon: MapPin,
    fields: [
      {
        key: "country",
        label: "Country",
        type: "searchable",
        required: false,
        placeholder: "All countries",
        fetchFrom: "country",
      },
      {
        key: "state",
        label: "State",
        type: "searchable",
        required: true,
        placeholder: "Search states...",
        fetchFrom: "state",
      },
    ],
  },
  {
    value: "city",
    label: "City",
    description: "Assign leads by city",
    icon: MapPin,
    fields: [
      {
        key: "country",
        label: "Country",
        type: "searchable",
        required: false,
        placeholder: "All countries",
        fetchFrom: "country",
      },
      {
        key: "state",
        label: "State",
        type: "searchable",
        required: false,
        placeholder: "All states",
        fetchFrom: "state",
      },
      {
        key: "city",
        label: "City",
        type: "searchable",
        required: true,
        placeholder: "Search cities...",
        fetchFrom: "city",
      },
    ],
  },
  {
    value: "industry",
    label: "Industry",
    description: "Assign leads by industry",
    icon: Building2,
    fields: [
      {
        key: "industry",
        label: "Industry",
        type: "searchable",
        required: true,
        placeholder: "Search industries...",
        fetchFrom: "industry",
      },
    ],
  },
  {
    value: "recently_imported",
    label: "Recently Imported",
    description: "Assign recently imported leads",
    icon: Clock,
    fields: [
      {
        key: "timeRange",
        label: "Time Range",
        type: "select",
        required: true,
        options: TIME_RANGE_OPTIONS,
      },
    ],
  },
  {
    value: "unassigned",
    label: "Only Unassigned",
    description: "Assign currently unassigned leads",
    icon: UserMinus,
    fields: [],
  },
  {
    value: "website_domain",
    label: "Website Domain",
    description: "Assign leads by website domain",
    icon: Link,
    fields: [
      {
        key: "domain",
        label: "Domain",
        type: "searchable",
        required: true,
        placeholder: "Search domains...",
        fetchFrom: "website",
      },
    ],
  },
  {
    value: "status",
    label: "Status",
    description: "Assign leads by status",
    icon: BarChart3,
    fields: [
      {
        key: "status",
        label: "Status",
        type: "select",
        required: true,
        options: STATUS_OPTIONS,
      },
    ],
  },
  {
    value: "custom",
    label: "Custom Filter",
    description: "Combine multiple filters",
    icon: Filter,
    fields: [
      {
        key: "country",
        label: "Country",
        type: "searchable",
        required: false,
        placeholder: "Any country",
        fetchFrom: "country",
      },
      {
        key: "state",
        label: "State",
        type: "searchable",
        required: false,
        placeholder: "Any state",
        fetchFrom: "state",
      },
      {
        key: "industry",
        label: "Industry",
        type: "searchable",
        required: false,
        placeholder: "Any industry",
        fetchFrom: "industry",
      },
      {
        key: "status",
        label: "Status",
        type: "select",
        required: false,
        options: [{ value: "", label: "Any status" }, ...STATUS_OPTIONS],
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function getMethodConfig(value: string): AssignmentMethodConfig | undefined {
  return ASSIGNMENT_METHODS.find((m) => m.value === value);
}

export type AssignmentMethod = typeof ASSIGNMENT_METHODS[number]["value"];
