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
  public: {
    Tables: {
      app_clock: {
        Row: {
          demo_now: string | null
          id: number
        }
        Insert: {
          demo_now?: string | null
          id?: number
        }
        Update: {
          demo_now?: string | null
          id?: number
        }
        Relationships: []
      }
      bite_cases: {
        Row: {
          age_years: number | null
          animal: string | null
          bitten_on: string
          category: number | null
          clinic_id: string
          created_at: string | null
          guardian_id: string | null
          id: string
          patient_name: string
          previously_vaccinated: boolean | null
          public_token: string
          regimen: string | null
          rig_given: boolean | null
          status: string | null
        }
        Insert: {
          age_years?: number | null
          animal?: string | null
          bitten_on: string
          category?: number | null
          clinic_id?: string
          created_at?: string | null
          guardian_id?: string | null
          id?: string
          patient_name: string
          previously_vaccinated?: boolean | null
          public_token: string
          regimen?: string | null
          rig_given?: boolean | null
          status?: string | null
        }
        Update: {
          age_years?: number | null
          animal?: string | null
          bitten_on?: string
          category?: number | null
          clinic_id?: string
          created_at?: string | null
          guardian_id?: string | null
          id?: string
          patient_name?: string
          previously_vaccinated?: boolean | null
          public_token?: string
          regimen?: string | null
          rig_given?: boolean | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bite_cases_guardian_id_fkey"
            columns: ["guardian_id"]
            isOneToOne: false
            referencedRelation: "guardians"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bite_cases_regimen_fkey"
            columns: ["regimen"]
            isOneToOne: false
            referencedRelation: "rabies_regimens"
            referencedColumns: ["code"]
          },
        ]
      }
      bite_doses: {
        Row: {
          bite_case_id: string | null
          clinic_id: string
          day_offset: number | null
          due_date: string | null
          given_at: string | null
          id: string
          status: Database["public"]["Enums"]["dose_status"] | null
          vial_id: string | null
          visit_id: string | null
        }
        Insert: {
          bite_case_id?: string | null
          clinic_id?: string
          day_offset?: number | null
          due_date?: string | null
          given_at?: string | null
          id?: string
          status?: Database["public"]["Enums"]["dose_status"] | null
          vial_id?: string | null
          visit_id?: string | null
        }
        Update: {
          bite_case_id?: string | null
          clinic_id?: string
          day_offset?: number | null
          due_date?: string | null
          given_at?: string | null
          id?: string
          status?: Database["public"]["Enums"]["dose_status"] | null
          vial_id?: string | null
          visit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bite_doses_bite_case_id_fkey"
            columns: ["bite_case_id"]
            isOneToOne: false
            referencedRelation: "bite_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bite_doses_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      child_doses: {
        Row: {
          batch_no: string | null
          child_id: string | null
          clinic_id: string
          code: string | null
          due_date: string | null
          given_on: string | null
          id: string
          status: Database["public"]["Enums"]["dose_status"]
          visit_id: string | null
          where_given: string | null
        }
        Insert: {
          batch_no?: string | null
          child_id?: string | null
          clinic_id?: string
          code?: string | null
          due_date?: string | null
          given_on?: string | null
          id?: string
          status?: Database["public"]["Enums"]["dose_status"]
          visit_id?: string | null
          where_given?: string | null
        }
        Update: {
          batch_no?: string | null
          child_id?: string | null
          clinic_id?: string
          code?: string | null
          due_date?: string | null
          given_on?: string | null
          id?: string
          status?: Database["public"]["Enums"]["dose_status"]
          visit_id?: string | null
          where_given?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "child_doses_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "child_doses_code_fkey"
            columns: ["code"]
            isOneToOne: false
            referencedRelation: "vaccine_doses"
            referencedColumns: ["code"]
          },
        ]
      }
      children: {
        Row: {
          clinic_id: string
          created_at: string | null
          dob: string
          guardian_id: string | null
          id: string
          name: string
          public_token: string
          sex: string | null
        }
        Insert: {
          clinic_id?: string
          created_at?: string | null
          dob: string
          guardian_id?: string | null
          id?: string
          name: string
          public_token: string
          sex?: string | null
        }
        Update: {
          clinic_id?: string
          created_at?: string | null
          dob?: string
          guardian_id?: string | null
          id?: string
          name?: string
          public_token?: string
          sex?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "children_guardian_id_fkey"
            columns: ["guardian_id"]
            isOneToOne: false
            referencedRelation: "guardians"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_settings: {
        Row: {
          auto_approve_bite_rebook: boolean | null
          bite_windows: Json
          capacity: Json | null
          city: string | null
          clinic_id: string
          clinic_name: string | null
          doctor_name: string | null
          hepa_type: string | null
          holidays: string[] | null
          id: number
          id_sites_per_vial: number | null
          mins_per_manual_replan: number | null
          mins_per_recall_call: number | null
          opd_hours: Json
          phone: string | null
          rabies_default_regimen: string | null
          rota_brand: string | null
          vial_life_hours: number | null
        }
        Insert: {
          auto_approve_bite_rebook?: boolean | null
          bite_windows: Json
          capacity?: Json | null
          city?: string | null
          clinic_id: string
          clinic_name?: string | null
          doctor_name?: string | null
          hepa_type?: string | null
          holidays?: string[] | null
          id?: number
          id_sites_per_vial?: number | null
          mins_per_manual_replan?: number | null
          mins_per_recall_call?: number | null
          opd_hours: Json
          phone?: string | null
          rabies_default_regimen?: string | null
          rota_brand?: string | null
          vial_life_hours?: number | null
        }
        Update: {
          auto_approve_bite_rebook?: boolean | null
          bite_windows?: Json
          capacity?: Json | null
          city?: string | null
          clinic_id?: string
          clinic_name?: string | null
          doctor_name?: string | null
          hepa_type?: string | null
          holidays?: string[] | null
          id?: number
          id_sites_per_vial?: number | null
          mins_per_manual_replan?: number | null
          mins_per_recall_call?: number | null
          opd_hours?: Json
          phone?: string | null
          rabies_default_regimen?: string | null
          rota_brand?: string | null
          vial_life_hours?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "clinic_settings_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinics: {
        Row: {
          city: string | null
          created_at: string
          id: string
          name: string
          phone: string | null
        }
        Insert: {
          city?: string | null
          created_at?: string
          id?: string
          name: string
          phone?: string | null
        }
        Update: {
          city?: string | null
          created_at?: string
          id?: string
          name?: string
          phone?: string | null
        }
        Relationships: []
      }
      guardians: {
        Row: {
          clinic_id: string
          created_at: string | null
          id: string
          lang: string | null
          name: string | null
          phone: string
        }
        Insert: {
          clinic_id?: string
          created_at?: string | null
          id?: string
          lang?: string | null
          name?: string | null
          phone: string
        }
        Update: {
          clinic_id?: string
          created_at?: string | null
          id?: string
          lang?: string | null
          name?: string | null
          phone?: string
        }
        Relationships: []
      }
      impact_events: {
        Row: {
          clinic_id: string
          created_at: string | null
          id: string
          kind: string | null
          minutes_saved: number | null
        }
        Insert: {
          clinic_id?: string
          created_at?: string | null
          id?: string
          kind?: string | null
          minutes_saved?: number | null
        }
        Update: {
          clinic_id?: string
          created_at?: string | null
          id?: string
          kind?: string | null
          minutes_saved?: number | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          audio_url: string | null
          body_en: string | null
          body_hi: string | null
          clinic_id: string
          created_at: string | null
          direction: string | null
          draft_reply: Json | null
          guardian_id: string | null
          id: string
          kind: string | null
          parsed: Json | null
          quick_replies: Json | null
          scheduled_for: string | null
          sent_at: string | null
          status: string | null
          visit_id: string | null
        }
        Insert: {
          audio_url?: string | null
          body_en?: string | null
          body_hi?: string | null
          clinic_id?: string
          created_at?: string | null
          direction?: string | null
          draft_reply?: Json | null
          guardian_id?: string | null
          id?: string
          kind?: string | null
          parsed?: Json | null
          quick_replies?: Json | null
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string | null
          visit_id?: string | null
        }
        Update: {
          audio_url?: string | null
          body_en?: string | null
          body_hi?: string | null
          clinic_id?: string
          created_at?: string | null
          direction?: string | null
          draft_reply?: Json | null
          guardian_id?: string | null
          id?: string
          kind?: string | null
          parsed?: Json | null
          quick_replies?: Json | null
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string | null
          visit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_guardian_id_fkey"
            columns: ["guardian_id"]
            isOneToOne: false
            referencedRelation: "guardians"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_inr: number
          clinic_id: string
          created_at: string | null
          id: string
          method: string | null
          ref: string | null
          visit_id: string | null
        }
        Insert: {
          amount_inr: number
          clinic_id?: string
          created_at?: string | null
          id?: string
          method?: string | null
          ref?: string | null
          visit_id?: string | null
        }
        Update: {
          amount_inr?: number
          clinic_id?: string
          created_at?: string | null
          id?: string
          method?: string | null
          ref?: string | null
          visit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_changes: {
        Row: {
          bite_case_id: string | null
          child_id: string | null
          clinic_id: string
          created_at: string | null
          decided_at: string | null
          diff: Json
          id: string
          reason: string | null
          source_message_id: string | null
          status: string | null
        }
        Insert: {
          bite_case_id?: string | null
          child_id?: string | null
          clinic_id?: string
          created_at?: string | null
          decided_at?: string | null
          diff: Json
          id?: string
          reason?: string | null
          source_message_id?: string | null
          status?: string | null
        }
        Update: {
          bite_case_id?: string | null
          child_id?: string | null
          clinic_id?: string
          created_at?: string | null
          decided_at?: string | null
          diff?: Json
          id?: string
          reason?: string | null
          source_message_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plan_changes_bite_case_id_fkey"
            columns: ["bite_case_id"]
            isOneToOne: false
            referencedRelation: "bite_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_changes_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
        ]
      }
      rabies_regimens: {
        Row: {
          code: string
          day_offsets: number[]
          label_en: string | null
          label_hi: string | null
          rig_for_cat3: boolean | null
          route: string | null
        }
        Insert: {
          code: string
          day_offsets: number[]
          label_en?: string | null
          label_hi?: string | null
          rig_for_cat3?: boolean | null
          route?: string | null
        }
        Update: {
          code?: string
          day_offsets?: number[]
          label_en?: string | null
          label_hi?: string | null
          rig_for_cat3?: boolean | null
          route?: string | null
        }
        Relationships: []
      }
      staff_requests: {
        Row: {
          clinic_id: string
          created_at: string
          email: string | null
          user_id: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          email?: string | null
          user_id: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          email?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_requests_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      stock: {
        Row: {
          clinic_id: string
          name: string | null
          on_hand: number | null
          reorder_level: number | null
          sku: string
        }
        Insert: {
          clinic_id?: string
          name?: string | null
          on_hand?: number | null
          reorder_level?: number | null
          sku: string
        }
        Update: {
          clinic_id?: string
          name?: string | null
          on_hand?: number | null
          reorder_level?: number | null
          sku?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          clinic_id: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          clinic_id: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          clinic_id?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      vaccine_doses: {
        Row: {
          code: string
          is_live: boolean | null
          label_en: string | null
          label_hi: string | null
          min_age_d: number | null
          min_gap_prev_d: number | null
          notes: string | null
          rec_age_d: number | null
          series: string | null
          sort: number | null
          stock_sku: string | null
        }
        Insert: {
          code: string
          is_live?: boolean | null
          label_en?: string | null
          label_hi?: string | null
          min_age_d?: number | null
          min_gap_prev_d?: number | null
          notes?: string | null
          rec_age_d?: number | null
          series?: string | null
          sort?: number | null
          stock_sku?: string | null
        }
        Update: {
          code?: string
          is_live?: boolean | null
          label_en?: string | null
          label_hi?: string | null
          min_age_d?: number | null
          min_gap_prev_d?: number | null
          notes?: string | null
          rec_age_d?: number | null
          series?: string | null
          sort?: number | null
          stock_sku?: string | null
        }
        Relationships: []
      }
      vials: {
        Row: {
          batch_no: string | null
          clinic_id: string
          expires_at: string
          id: string
          opened_at: string
          sites_total: number
          sites_used: number | null
        }
        Insert: {
          batch_no?: string | null
          clinic_id?: string
          expires_at: string
          id?: string
          opened_at: string
          sites_total: number
          sites_used?: number | null
        }
        Update: {
          batch_no?: string | null
          clinic_id?: string
          expires_at?: string
          id?: string
          opened_at?: string
          sites_total?: number
          sites_used?: number | null
        }
        Relationships: []
      }
      visits: {
        Row: {
          bite_case_id: string | null
          checked_in_at: string | null
          child_id: string | null
          clinic_id: string
          created_at: string | null
          day: string
          fee_inr: number | null
          id: string
          kind: string
          paid_at: string | null
          slot_label: string | null
          starts_at: string | null
          status: Database["public"]["Enums"]["visit_status"]
        }
        Insert: {
          bite_case_id?: string | null
          checked_in_at?: string | null
          child_id?: string | null
          clinic_id?: string
          created_at?: string | null
          day: string
          fee_inr?: number | null
          id?: string
          kind: string
          paid_at?: string | null
          slot_label?: string | null
          starts_at?: string | null
          status?: Database["public"]["Enums"]["visit_status"]
        }
        Update: {
          bite_case_id?: string | null
          checked_in_at?: string | null
          child_id?: string | null
          clinic_id?: string
          created_at?: string | null
          day?: string
          fee_inr?: number | null
          id?: string
          kind?: string
          paid_at?: string | null
          slot_label?: string | null
          starts_at?: string | null
          status?: Database["public"]["Enums"]["visit_status"]
        }
        Relationships: [
          {
            foreignKeyName: "visits_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_staff_by_email: {
        Args: {
          _clinic: string
          _email: string
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: string
      }
      approve_staff: {
        Args: { _approve: boolean; _clinic: string; _user_id: string }
        Returns: undefined
      }
      create_clinic: {
        Args: { _city: string; _name: string; _phone: string }
        Returns: string
      }
      is_any_staff: { Args: never; Returns: boolean }
      is_clinic_doctor: { Args: { _clinic: string }; Returns: boolean }
      is_staff_of: { Args: { _clinic: string }; Returns: boolean }
      list_clinic_staff: {
        Args: { _clinic: string }
        Returns: {
          email: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }[]
      }
      remove_staff: {
        Args: { _clinic: string; _user_id: string }
        Returns: undefined
      }
      request_join_clinic: { Args: { _clinic: string }; Returns: undefined }
    }
    Enums: {
      app_role: "doctor" | "desk"
      dose_status:
        | "planned"
        | "booked"
        | "given"
        | "given_elsewhere"
        | "skipped"
      visit_status:
        | "planned"
        | "booked"
        | "confirmed"
        | "checked_in"
        | "done"
        | "missed"
        | "cancelled"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["doctor", "desk"],
      dose_status: ["planned", "booked", "given", "given_elsewhere", "skipped"],
      visit_status: [
        "planned",
        "booked",
        "confirmed",
        "checked_in",
        "done",
        "missed",
        "cancelled",
      ],
    },
  },
} as const
