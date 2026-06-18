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
      daily_nutrition_logs: {
        Row: {
          checked: boolean
          created_at: string
          device_id: string
          id: string
          log_date: string
          tip_index: number
          user_id: string | null
        }
        Insert: {
          checked?: boolean
          created_at?: string
          device_id: string
          id?: string
          log_date?: string
          tip_index: number
          user_id?: string | null
        }
        Update: {
          checked?: boolean
          created_at?: string
          device_id?: string
          id?: string
          log_date?: string
          tip_index?: number
          user_id?: string | null
        }
        Relationships: []
      }
      effort_sessions: {
        Row: {
          ai_analysis: Json | null
          analyzed_at: string | null
          created_at: string
          day_date: string
          device_id: string
          duration_minutes: number
          followup_notes: string[] | null
          id: string
          intensity: string
          intensity_level: string | null
          journal_text: string | null
          logged_at: string
          session_type_detected: string | null
          user_id: string | null
        }
        Insert: {
          ai_analysis?: Json | null
          analyzed_at?: string | null
          created_at?: string
          day_date?: string
          device_id: string
          duration_minutes?: number
          followup_notes?: string[] | null
          id?: string
          intensity?: string
          intensity_level?: string | null
          journal_text?: string | null
          logged_at?: string
          session_type_detected?: string | null
          user_id?: string | null
        }
        Update: {
          ai_analysis?: Json | null
          analyzed_at?: string | null
          created_at?: string
          day_date?: string
          device_id?: string
          duration_minutes?: number
          followup_notes?: string[] | null
          id?: string
          intensity?: string
          intensity_level?: string | null
          journal_text?: string | null
          logged_at?: string
          session_type_detected?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      focus_sessions: {
        Row: {
          abandoned: boolean
          completed: boolean
          created_at: string
          duration_seconds: number
          ended_at: string | null
          id: string
          started_at: string
          task_id: string
          user_id: string | null
        }
        Insert: {
          abandoned?: boolean
          completed?: boolean
          created_at?: string
          duration_seconds?: number
          ended_at?: string | null
          id?: string
          started_at?: string
          task_id: string
          user_id?: string | null
        }
        Update: {
          abandoned?: boolean
          completed?: boolean
          created_at?: string
          duration_seconds?: number
          ended_at?: string | null
          id?: string
          started_at?: string
          task_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      scan_sessions: {
        Row: {
          bpm: number
          created_at: string
          day_date: string
          device_id: string
          hrv_rmssd: number
          id: string
          is_morning_scan: boolean
          readiness_score: number
          scanned_at: string
          stress_index: number
          user_id: string | null
        }
        Insert: {
          bpm: number
          created_at?: string
          day_date?: string
          device_id: string
          hrv_rmssd: number
          id?: string
          is_morning_scan?: boolean
          readiness_score: number
          scanned_at?: string
          stress_index: number
          user_id?: string | null
        }
        Update: {
          bpm?: number
          created_at?: string
          day_date?: string
          device_id?: string
          hrv_rmssd?: number
          id?: string
          is_morning_scan?: boolean
          readiness_score?: number
          scanned_at?: string
          stress_index?: number
          user_id?: string | null
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          age: number
          ai_coach_config: Json | null
          audio_greeting_enabled: boolean
          blocked_categories: string[]
          created_at: string
          device_id: string | null
          fitness_level: string | null
          focus_lock_enabled: boolean
          goal_details: string | null
          height: number | null
          height_unit: string | null
          id: string
          main_goal: string | null
          morning_scan_enabled: boolean
          notification_enabled: boolean
          onboarding_completed: boolean
          organization_level: string | null
          pseudo: string
          reminder_minutes: number
          schedule: string | null
          sport_history: string | null
          status: string | null
          updated_at: string
          user_id: string | null
          weight: number | null
          weight_unit: string | null
          workload: string | null
        }
        Insert: {
          age: number
          ai_coach_config?: Json | null
          audio_greeting_enabled?: boolean
          blocked_categories?: string[]
          created_at?: string
          device_id?: string | null
          fitness_level?: string | null
          focus_lock_enabled?: boolean
          goal_details?: string | null
          height?: number | null
          height_unit?: string | null
          id?: string
          main_goal?: string | null
          morning_scan_enabled?: boolean
          notification_enabled?: boolean
          onboarding_completed?: boolean
          organization_level?: string | null
          pseudo: string
          reminder_minutes?: number
          schedule?: string | null
          sport_history?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string | null
          weight?: number | null
          weight_unit?: string | null
          workload?: string | null
        }
        Update: {
          age?: number
          ai_coach_config?: Json | null
          audio_greeting_enabled?: boolean
          blocked_categories?: string[]
          created_at?: string
          device_id?: string | null
          fitness_level?: string | null
          focus_lock_enabled?: boolean
          goal_details?: string | null
          height?: number | null
          height_unit?: string | null
          id?: string
          main_goal?: string | null
          morning_scan_enabled?: boolean
          notification_enabled?: boolean
          onboarding_completed?: boolean
          organization_level?: string | null
          pseudo?: string
          reminder_minutes?: number
          schedule?: string | null
          sport_history?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string | null
          weight?: number | null
          weight_unit?: string | null
          workload?: string | null
        }
        Relationships: []
      }
      weekly_summaries: {
        Row: {
          created_at: string
          device_id: string
          generated_at: string
          id: string
          sport_synthesis: string | null
          user_id: string | null
          week_start_date: string
        }
        Insert: {
          created_at?: string
          device_id: string
          generated_at?: string
          id?: string
          sport_synthesis?: string | null
          user_id?: string | null
          week_start_date: string
        }
        Update: {
          created_at?: string
          device_id?: string
          generated_at?: string
          id?: string
          sport_synthesis?: string | null
          user_id?: string | null
          week_start_date?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
  public: {
    Enums: {},
  },
} as const
