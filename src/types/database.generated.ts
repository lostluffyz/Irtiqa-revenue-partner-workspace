export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      announcements: {
        Row: {
          content: string
          created_at: string
          created_by: string
          id: string
          is_pinned: boolean
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by: string
          id?: string
          is_pinned?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          is_pinned?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_reports: {
        Row: {
          additional_notes: string | null
          appointments_booked: number
          biggest_challenge: string | null
          created_at: string
          deals_closed: number
          id: string
          leads_contacted: number
          partner_id: string
          report_date: string
          updated_at: string
        }
        Insert: {
          additional_notes?: string | null
          appointments_booked?: number
          biggest_challenge?: string | null
          created_at?: string
          deals_closed?: number
          id?: string
          leads_contacted?: number
          partner_id: string
          report_date?: string
          updated_at?: string
        }
        Update: {
          additional_notes?: string | null
          appointments_booked?: number
          biggest_challenge?: string | null
          created_at?: string
          deals_closed?: number
          id?: string
          leads_contacted?: number
          partner_id?: string
          report_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_reports_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_status_history: {
        Row: {
          changed_at: string
          changed_by: string
          id: string
          lead_id: string
          new_status: string
          old_status: string
        }
        Insert: {
          changed_at?: string
          changed_by: string
          id?: string
          lead_id: string
          new_status: string
          old_status: string
        }
        Update: {
          changed_at?: string
          changed_by?: string
          id?: string
          lead_id?: string
          new_status?: string
          old_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_status_history_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          assigned_at: string | null
          assigned_to: string | null
          company_name: string
          country: string | null
          created_at: string
          created_by: string
          email: string | null
          id: string
          industry: string | null
          internal_notes: string | null
          phone: string | null
          status: string
          updated_at: string
          website: string | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_to?: string | null
          company_name: string
          country?: string | null
          created_at?: string
          created_by: string
          email?: string | null
          id?: string
          industry?: string | null
          internal_notes?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          assigned_at?: string | null
          assigned_to?: string | null
          company_name?: string
          country?: string | null
          created_at?: string
          created_by?: string
          email?: string | null
          id?: string
          industry?: string | null
          internal_notes?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_activity_log: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          partner_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          partner_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          partner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_activity_log_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partners: {
        Row: {
          approved_extra_leads: number
          allocation_enabled: boolean
          company_id: string
          created_at: string
          default_program_lead_limit: number
          default_weekly_lead_limit: number
          id: string
          last_login_at: string | null
          phone: string | null
          program_start_date: string
          region_id: string | null
          status: string
          updated_at: string
          weekly_lead_limit_override: number | null
        }
        Insert: {
          approved_extra_leads?: number
          allocation_enabled?: boolean
          company_id: string
          created_at?: string
          default_program_lead_limit?: number
          default_weekly_lead_limit?: number
          id: string
          last_login_at?: string | null
          phone?: string | null
          program_start_date: string
          region_id?: string | null
          status?: string
          updated_at?: string
          weekly_lead_limit_override?: number | null
        }
        Update: {
          approved_extra_leads?: number
          allocation_enabled?: boolean
          company_id?: string
          created_at?: string
          default_program_lead_limit?: number
          default_weekly_lead_limit?: number
          id?: string
          last_login_at?: string | null
          phone?: string | null
          program_start_date?: string
          region_id?: string | null
          status?: string
          updated_at?: string
          weekly_lead_limit_override?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "partners_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partners_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          is_active: boolean
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id: string
          is_active?: boolean
          role: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      regions: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      resources: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          file_path: string | null
          id: string
          is_active: boolean
          sort_order: number
          title: string
          type: string
          updated_at: string
          url: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          file_path?: string | null
          id?: string
          is_active?: boolean
          sort_order?: number
          title: string
          type: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          file_path?: string | null
          id?: string
          is_active?: boolean
          sort_order?: number
          title?: string
          type?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "resources_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_audit_log: {
        Row: {
          id: string
          admin_id: string
          admin_email: string
          action: string
          target_id: string | null
          target_name: string | null
          target_meta: Json | null
          result: string
          error_msg: string | null
          duration_ms: number | null
          created_at: string
        }
        Insert: {
          id?: string
          admin_id: string
          admin_email: string
          action: string
          target_id?: string | null
          target_name?: string | null
          target_meta?: Json | null
          result?: string
          error_msg?: string | null
          duration_ms?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          admin_id?: string
          admin_email?: string
          action?: string
          target_id?: string | null
          target_name?: string | null
          target_meta?: Json | null
          result?: string
          error_msg?: string | null
          duration_ms?: number | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_audit_log_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_allocation_batches: {
        Row: {
          id: string
          partner_id: string
          allocation_period_start: string
          allocation_period_end: string
          lead_count: number
          program_total_after: number
          source: string
          triggered_by: string | null
          reason: string | null
          created_at: string
        }
        Insert: {
          id?: string
          partner_id: string
          allocation_period_start: string
          allocation_period_end: string
          lead_count?: number
          program_total_after?: number
          source: string
          triggered_by?: string | null
          reason?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          partner_id?: string
          allocation_period_start?: string
          allocation_period_end?: string
          lead_count?: number
          program_total_after?: number
          source?: string
          triggered_by?: string | null
          reason?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_allocation_batches_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_allocation_batches_triggered_by_fkey"
            columns: ["triggered_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_allocation_approvals: {
        Row: {
          id: string
          partner_id: string
          quantity: number
          reason: string | null
          approved_by: string
          approved_at: string
          expires_on: string | null
          created_at: string
        }
        Insert: {
          id?: string
          partner_id: string
          quantity: number
          reason?: string | null
          approved_by: string
          approved_at?: string
          expires_on?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          partner_id?: string
          quantity?: number
          reason?: string | null
          approved_by?: string
          approved_at?: string
          expires_on?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_allocation_approvals_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_allocation_approvals_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_company_id: { Args: never; Returns: string }
      is_admin: { Args: never; Returns: boolean }
      is_partner: { Args: never; Returns: boolean }
      allocate_automatic_batch: {
        Args: {
          p_partner_id: string
          p_period_start: string
          p_period_end: string
          p_max_count: number
          p_reason?: string
        }
        Returns: number
      }
      record_manual_batch: {
        Args: {
          p_partner_id: string
          p_lead_ids: string[]
          p_period_start: string
          p_period_end: string
          p_source: string
          p_triggered_by: string
          p_reason: string
        }
        Returns: number
      }
      approve_extra_leads: {
        Args: {
          p_partner_id: string
          p_quantity: number
          p_reason: string
          p_approved_by: string
          p_expires_on?: string
        }
        Returns: number
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
