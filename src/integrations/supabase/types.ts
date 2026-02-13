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
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string
          commune: string
          created_at: string
          display_name: string
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
        }
        Insert: {
          avatar_url?: string | null
          bio?: string
          commune?: string
          created_at?: string
          display_name?: string
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
        }
        Update: {
          avatar_url?: string | null
          bio?: string
          commune?: string
          created_at?: string
          display_name?: string
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
        }
        Relationships: []
      }
      reports: {
        Row: {
          commune: string
          created_at: string
          description: string
          id: string
          latitude: number | null
          location: string
          longitude: number | null
          photo_url: string | null
          quartier: string
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
          commune?: string
          created_at?: string
          description: string
          id?: string
          latitude?: number | null
          location: string
          longitude?: number | null
          photo_url?: string | null
          quartier?: string
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
          commune?: string
          created_at?: string
          description?: string
          id?: string
          latitude?: number | null
          location?: string
          longitude?: number | null
          photo_url?: string | null
          quartier?: string
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
      corroborate_report: { Args: { p_report_id: string }; Returns: undefined }
      find_nearest_commune: {
        Args: { p_lat: number; p_lon: number }
        Returns: {
          couleur: string
          distance_km: number
          nom: string
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
