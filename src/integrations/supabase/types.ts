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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      gym_settings: {
        Row: {
          gym_id: string | null
          id: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          gym_id?: string | null
          id?: string
          key: string
          updated_at?: string
          value?: string
        }
        Update: {
          gym_id?: string | null
          id?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "gym_settings_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      gyms: {
        Row: {
          created_at: string
          id: string
          max_students: number
          name: string
          owner_user_id: string
          plan: string
        }
        Insert: {
          created_at?: string
          id?: string
          max_students?: number
          name: string
          owner_user_id: string
          plan?: string
        }
        Update: {
          created_at?: string
          id?: string
          max_students?: number
          name?: string
          owner_user_id?: string
          plan?: string
        }
        Relationships: []
      }
      nutrition_plans: {
        Row: {
          created_at: string
          daily_protein: string | null
          description: string | null
          estimated_calories: number | null
          goal: string
          gym_id: string | null
          id: string
          name: string
          suggested_meals: string | null
          suggested_supplements: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          daily_protein?: string | null
          description?: string | null
          estimated_calories?: number | null
          goal: string
          gym_id?: string | null
          id?: string
          name: string
          suggested_meals?: string | null
          suggested_supplements?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          daily_protein?: string | null
          description?: string | null
          estimated_calories?: number | null
          goal?: string
          gym_id?: string | null
          id?: string
          name?: string
          suggested_meals?: string | null
          suggested_supplements?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nutrition_plans_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          due_date: string
          gym_id: string | null
          id: string
          notes: string | null
          payment_date: string | null
          payment_link: string | null
          payment_method: string | null
          payment_reference: string | null
          status: string
          student_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          due_date: string
          gym_id?: string | null
          id?: string
          notes?: string | null
          payment_date?: string | null
          payment_link?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          status?: string
          student_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          due_date?: string
          gym_id?: string | null
          id?: string
          notes?: string | null
          payment_date?: string | null
          payment_link?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      routine_exercises: {
        Row: {
          created_at: string
          exercise_name: string
          id: string
          observations: string | null
          reps: string
          rest_seconds: number
          routine_id: string
          sets: number
          sort_order: number
        }
        Insert: {
          created_at?: string
          exercise_name: string
          id?: string
          observations?: string | null
          reps?: string
          rest_seconds?: number
          routine_id: string
          sets?: number
          sort_order?: number
        }
        Update: {
          created_at?: string
          exercise_name?: string
          id?: string
          observations?: string | null
          reps?: string
          rest_seconds?: number
          routine_id?: string
          sets?: number
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "routine_exercises_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "routines"
            referencedColumns: ["id"]
          },
        ]
      }
      routines: {
        Row: {
          created_at: string
          days_per_week: number
          description: string | null
          goal: string
          gym_id: string | null
          id: string
          level: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          days_per_week?: number
          description?: string | null
          goal: string
          gym_id?: string | null
          id?: string
          level: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          days_per_week?: number
          description?: string | null
          goal?: string
          gym_id?: string | null
          id?: string
          level?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "routines_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      student_nutrition_plans: {
        Row: {
          assigned_at: string
          id: string
          nutrition_plan_id: string
          student_id: string
        }
        Insert: {
          assigned_at?: string
          id?: string
          nutrition_plan_id: string
          student_id: string
        }
        Update: {
          assigned_at?: string
          id?: string
          nutrition_plan_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_nutrition_plans_nutrition_plan_id_fkey"
            columns: ["nutrition_plan_id"]
            isOneToOne: false
            referencedRelation: "nutrition_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_nutrition_plans_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_routines: {
        Row: {
          assigned_at: string
          id: string
          routine_id: string
          student_id: string
        }
        Insert: {
          assigned_at?: string
          id?: string
          routine_id: string
          student_id: string
        }
        Update: {
          assigned_at?: string
          id?: string
          routine_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_routines_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "routines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_routines_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          age: number | null
          created_at: string
          due_day: number
          email: string | null
          enrollment_date: string
          full_name: string
          gym_id: string | null
          height: number | null
          id: string
          must_change_password: boolean
          observations: string | null
          phone: string | null
          status: string
          training_goal: string | null
          updated_at: string
          user_id: string | null
          weight: number | null
        }
        Insert: {
          age?: number | null
          created_at?: string
          due_day?: number
          email?: string | null
          enrollment_date?: string
          full_name: string
          gym_id?: string | null
          height?: number | null
          id?: string
          must_change_password?: boolean
          observations?: string | null
          phone?: string | null
          status?: string
          training_goal?: string | null
          updated_at?: string
          user_id?: string | null
          weight?: number | null
        }
        Update: {
          age?: number | null
          created_at?: string
          due_day?: number
          email?: string | null
          enrollment_date?: string
          full_name?: string
          gym_id?: string | null
          height?: number | null
          id?: string
          must_change_password?: boolean
          observations?: string | null
          phone?: string | null
          status?: string
          training_goal?: string | null
          updated_at?: string
          user_id?: string | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "students_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          gym_id: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          gym_id?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          gym_id?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_gym_id_for_user: { Args: { _user_id: string }; Returns: string }
      get_student_id_for_user: { Args: { _user_id: string }; Returns: string }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff_or_owner: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "staff" | "owner" | "manager" | "student"
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
      app_role: ["admin", "staff", "owner", "manager", "student"],
    },
  },
} as const
