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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_messages: {
        Row: {
          commune: string
          created_at: string
          id: string
          message: string
          quartier: string
          sender_id: string
          title: string
        }
        Insert: {
          commune?: string
          created_at?: string
          id?: string
          message: string
          quartier?: string
          sender_id: string
          title: string
        }
        Update: {
          commune?: string
          created_at?: string
          id?: string
          message?: string
          quartier?: string
          sender_id?: string
          title?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          details: Json | null
          id: string
          target_id: string | null
          target_type: string
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string | null
          target_type: string
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string | null
          target_type?: string
        }
        Relationships: []
      }
      communes: {
        Row: {
          center_lat: number
          center_lon: number
          couleur: string
          created_at: string
          id: string
          nom: string
          population: number
          rayon_m: number
        }
        Insert: {
          center_lat: number
          center_lon: number
          couleur?: string
          created_at?: string
          id?: string
          nom: string
          population?: number
          rayon_m?: number
        }
        Update: {
          center_lat?: number
          center_lon?: number
          couleur?: string
          created_at?: string
          id?: string
          nom?: string
          population?: number
          rayon_m?: number
        }
        Relationships: []
      }
      corroborations: {
        Row: {
          created_at: string
          id: string
          report_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          report_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          report_id?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read: boolean
          report_id: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read?: boolean
          report_id: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          report_id?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      partner_profiles: {
        Row: {
          commune: string | null
          created_at: string
          id: string
          organization_name: string
          partner_type: string
          user_id: string
        }
        Insert: {
          commune?: string | null
          created_at?: string
          id?: string
          organization_name: string
          partner_type: string
          user_id: string
        }
        Update: {
          commune?: string | null
          created_at?: string
          id?: string
          organization_name?: string
          partner_type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string
          commune: string
          created_at: string
          display_name: string
          electricity_client_id: string
          electricity_meter_number: string
          electricity_meter_ref: string
          first_name: string
          id: string
          language: string
          last_name: string
          notifications_enabled: boolean
          phone: string | null
          quartier: string
          theme: string
          updated_at: string
          user_id: string
          user_type: string
          water_client_id: string
          water_meter_number: string
          water_meter_ref: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string
          commune?: string
          created_at?: string
          display_name?: string
          electricity_client_id?: string
          electricity_meter_number?: string
          electricity_meter_ref?: string
          first_name?: string
          id?: string
          language?: string
          last_name?: string
          notifications_enabled?: boolean
          phone?: string | null
          quartier?: string
          theme?: string
          updated_at?: string
          user_id: string
          user_type?: string
          water_client_id?: string
          water_meter_number?: string
          water_meter_ref?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string
          commune?: string
          created_at?: string
          display_name?: string
          electricity_client_id?: string
          electricity_meter_number?: string
          electricity_meter_ref?: string
          first_name?: string
          id?: string
          language?: string
          last_name?: string
          notifications_enabled?: boolean
          phone?: string | null
          quartier?: string
          theme?: string
          updated_at?: string
          user_id?: string
          user_type?: string
          water_client_id?: string
          water_meter_number?: string
          water_meter_ref?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          commune: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          quartier: string | null
          user_id: string
        }
        Insert: {
          auth: string
          commune?: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          quartier?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          commune?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          quartier?: string | null
          user_id?: string
        }
        Relationships: []
      }
      push_throttle: {
        Row: {
          commune: string
          event_type: string
          id: string
          last_sent_at: string
          quartier: string
          service_type: string
        }
        Insert: {
          commune: string
          event_type?: string
          id?: string
          last_sent_at?: string
          quartier: string
          service_type: string
        }
        Update: {
          commune?: string
          event_type?: string
          id?: string
          last_sent_at?: string
          quartier?: string
          service_type?: string
        }
        Relationships: []
      }
      quartiers: {
        Row: {
          aliases: string[]
          commune: string
          created_at: string
          hidden: boolean
          id: string
          nom: string
          source: string
          validated: boolean
        }
        Insert: {
          aliases?: string[]
          commune: string
          created_at?: string
          hidden?: boolean
          id?: string
          nom: string
          source?: string
          validated?: boolean
        }
        Update: {
          aliases?: string[]
          commune?: string
          created_at?: string
          hidden?: boolean
          id?: string
          nom?: string
          source?: string
          validated?: boolean
        }
        Relationships: []
      }
      relay_config: {
        Row: {
          key: string
          label: string
          updated_at: string
          updated_by: string | null
          value: string
        }
        Insert: {
          key: string
          label: string
          updated_at?: string
          updated_by?: string | null
          value?: string
        }
        Update: {
          key?: string
          label?: string
          updated_at?: string
          updated_by?: string | null
          value?: string
        }
        Relationships: []
      }
      relay_logs: {
        Row: {
          created_at: string
          email_to: string
          error_message: string | null
          id: string
          operator: string
          report_id: string
          sent_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          email_to: string
          error_message?: string | null
          id?: string
          operator: string
          report_id: string
          sent_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          email_to?: string
          error_message?: string | null
          id?: string
          operator?: string
          report_id?: string
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "relay_logs_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: true
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      repair_confirmations: {
        Row: {
          created_at: string | null
          id: string
          report_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          report_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          report_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "repair_confirmations_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      report_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          report_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          report_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          report_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_comments_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      report_deletions: {
        Row: {
          commune: string
          created_at: string
          description: string
          id: string
          quartier: string
          reason: string
          report_id: string
          service_type: string
          user_id: string
        }
        Insert: {
          commune?: string
          created_at?: string
          description?: string
          id?: string
          quartier?: string
          reason: string
          report_id: string
          service_type: string
          user_id: string
        }
        Update: {
          commune?: string
          created_at?: string
          description?: string
          id?: string
          quartier?: string
          reason?: string
          report_id?: string
          service_type?: string
          user_id?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          babies: number
          commune: string
          created_at: string
          description: string
          elderly: number
          id: string
          impacted_people: number
          last_reminder_at: string | null
          latitude: number | null
          location: string
          longitude: number | null
          photo_url: string | null
          pregnant: number
          quartier: string
          reminder_count: number
          repair_verifications: number | null
          report_category: string
          reporter_type: string
          resolved_at: string | null
          service_type: string
          start_time: string
          status: string
          updated_at: string
          urgency: string
          user_id: string
          validated: boolean
          validated_at: string | null
          validated_by: string | null
          verifications: number
        }
        Insert: {
          babies?: number
          commune?: string
          created_at?: string
          description: string
          elderly?: number
          id?: string
          impacted_people?: number
          last_reminder_at?: string | null
          latitude?: number | null
          location: string
          longitude?: number | null
          photo_url?: string | null
          pregnant?: number
          quartier?: string
          reminder_count?: number
          repair_verifications?: number | null
          report_category?: string
          reporter_type?: string
          resolved_at?: string | null
          service_type: string
          start_time?: string
          status?: string
          updated_at?: string
          urgency: string
          user_id: string
          validated?: boolean
          validated_at?: string | null
          validated_by?: string | null
          verifications?: number
        }
        Update: {
          babies?: number
          commune?: string
          created_at?: string
          description?: string
          elderly?: number
          id?: string
          impacted_people?: number
          last_reminder_at?: string | null
          latitude?: number | null
          location?: string
          longitude?: number | null
          photo_url?: string | null
          pregnant?: number
          quartier?: string
          reminder_count?: number
          repair_verifications?: number | null
          report_category?: string
          reporter_type?: string
          resolved_at?: string | null
          service_type?: string
          start_time?: string
          status?: string
          updated_at?: string
          urgency?: string
          user_id?: string
          validated?: boolean
          validated_at?: string | null
          validated_by?: string | null
          verifications?: number
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_resolve_report: {
        Args: { p_report_id: string }
        Returns: undefined
      }
      broadcast_admin_message: {
        Args: {
          p_message?: string
          p_title?: string
          target_commune: string
          target_quartier?: string
        }
        Returns: number
      }
      confirm_repair: { Args: { p_report_id: string }; Returns: undefined }
      corroborate_report: { Args: { p_report_id: string }; Returns: undefined }
      count_user_daily_reports: { Args: { p_user_id: string }; Returns: number }
      find_nearest_commune: {
        Args: { p_lat: number; p_lon: number }
        Returns: {
          couleur: string
          distance_km: number
          nom: string
        }[]
      }
      find_similar_reports: {
        Args: {
          p_commune: string
          p_quartier: string
          p_report_category?: string
          p_service_type: string
        }
        Returns: {
          created_at: string
          description: string
          id: string
          service_type: string
          start_time: string
          user_id: string
          verifications: number
        }[]
      }
      get_active_outage_count: { Args: never; Returns: number }
      get_commune_duration_stats: {
        Args: never
        Returns: {
          avg_duration_minutes: number
          commune: string
          couleur: string
          longest_duration_minutes: number
          service_type: string
          total_active: number
          total_resolved: number
        }[]
      }
      get_commune_infrastructure_stats: {
        Args: never
        Returns: {
          commune: string
          couleur: string
          eau_infra_actifs: number
          eau_infra_resolus: number
          eau_infra_total: number
          eau_infra_verified: number
          elec_infra_actifs: number
          elec_infra_resolus: number
          elec_infra_total: number
          elec_infra_verified: number
          mairie_infra_actifs: number
          mairie_infra_resolus: number
          mairie_infra_total: number
          mairie_infra_verified: number
          population: number
        }[]
      }
      get_commune_quartier_stats: {
        Args: { p_commune: string }
        Returns: {
          eau_actifs: number
          eau_resolus: number
          eau_total: number
          electricite_actifs: number
          electricite_resolus: number
          electricite_total: number
          mairie_actifs: number
          mairie_resolus: number
          mairie_total: number
          quartier: string
        }[]
      }
      get_commune_service_stats: {
        Args: never
        Returns: {
          commune: string
          couleur: string
          eau_actifs: number
          eau_resolus: number
          eau_total: number
          eau_verified: number
          electricite_actifs: number
          electricite_resolus: number
          electricite_total: number
          electricite_verified: number
          mairie_actifs: number
          mairie_resolus: number
          mairie_total: number
          mairie_verified: number
          population: number
        }[]
      }
      get_commune_stats: {
        Args: never
        Returns: {
          actifs: number
          commune: string
          couleur: string
          population: number
          resolus: number
          total: number
        }[]
      }
      get_commune_vulnerable_stats: {
        Args: never
        Returns: {
          commune: string
          couleur: string
          population: number
          total_actifs: number
          total_babies: number
          total_elderly: number
          total_impacted: number
          total_pregnant: number
          total_signalements: number
        }[]
      }
      get_nearby_reports: {
        Args: { p_lat: number; p_lon: number; p_rayon_m?: number }
        Returns: {
          commune: string
          created_at: string
          description: string
          distance_m: number
          id: string
          nb_verifications: number
          service_type: string
        }[]
      }
      get_public_reports: {
        Args: never
        Returns: {
          created_at: string
          description: string
          id: string
          latitude: number
          location: string
          longitude: number
          reporter_type: string
          resolved_at: string
          service_type: string
          start_time: string
          status: string
          urgency: string
          verifications: number
        }[]
      }
      get_quartier_vulnerable_stats: {
        Args: { p_commune: string }
        Returns: {
          quartier: string
          total_actifs: number
          total_babies: number
          total_elderly: number
          total_impacted: number
          total_pregnant: number
        }[]
      }
      get_reports_time_series: {
        Args: { p_days?: number }
        Returns: {
          actifs: number
          commune: string
          report_date: string
          resolus: number
          service_type: string
          total: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      partner_update_report_status: {
        Args: { p_report_id: string; p_status: string }
        Returns: undefined
      }
      resolve_report: {
        Args: { p_report_id: string; p_resolved_at: string }
        Returns: undefined
      }
      support_infra_report: {
        Args: { p_report_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user" | "test" | "partner"
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
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user", "test", "partner"],
    },
  },
} as const
