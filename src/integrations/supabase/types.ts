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
      assessments: {
        Row: {
          answers: Json
          category_scores: Json
          created_at: string
          fundability: number
          id: string
          investment_readiness: number
          report: Json | null
          score: number
          stage: string | null
          user_id: string
          vantage_point: number
        }
        Insert: {
          answers?: Json
          category_scores?: Json
          created_at?: string
          fundability?: number
          id?: string
          investment_readiness?: number
          report?: Json | null
          score?: number
          stage?: string | null
          user_id: string
          vantage_point?: number
        }
        Update: {
          answers?: Json
          category_scores?: Json
          created_at?: string
          fundability?: number
          id?: string
          investment_readiness?: number
          report?: Json | null
          score?: number
          stage?: string | null
          user_id?: string
          vantage_point?: number
        }
        Relationships: []
      }
      communities: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          leader_id: string
          name: string
          referral_code: string
          region: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          leader_id: string
          name: string
          referral_code?: string
          region?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          leader_id?: string
          name?: string
          referral_code?: string
          region?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      community_members: {
        Row: {
          community_id: string
          founder_id: string
          id: string
          joined_at: string
          status: string
        }
        Insert: {
          community_id: string
          founder_id: string
          id?: string
          joined_at?: string
          status?: string
        }
        Update: {
          community_id?: string
          founder_id?: string
          id?: string
          joined_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_members_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      course_enrollments: {
        Row: {
          certificate_url: string | null
          completed_at: string | null
          course_id: string
          created_at: string
          id: string
          status: string
          user_id: string
        }
        Insert: {
          certificate_url?: string | null
          completed_at?: string | null
          course_id: string
          created_at?: string
          id?: string
          status?: string
          user_id: string
        }
        Update: {
          certificate_url?: string | null
          completed_at?: string | null
          course_id?: string
          created_at?: string
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          dot_reward: number
          id: string
          is_published: boolean
          title: string
          vantage_boost: number
          whop_url: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          dot_reward?: number
          id?: string
          is_published?: boolean
          title: string
          vantage_boost?: number
          whop_url?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          dot_reward?: number
          id?: string
          is_published?: boolean
          title?: string
          vantage_boost?: number
          whop_url?: string | null
        }
        Relationships: []
      }
      event_registrations: {
        Row: {
          attended: boolean
          created_at: string
          event_id: string
          id: string
          user_id: string
        }
        Insert: {
          attended?: boolean
          created_at?: string
          event_id: string
          id?: string
          user_id: string
        }
        Update: {
          attended?: boolean
          created_at?: string
          event_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          capacity: number
          created_at: string
          description: string | null
          dot_cost: number
          event_date: string | null
          id: string
          speaker: string | null
          title: string
        }
        Insert: {
          capacity?: number
          created_at?: string
          description?: string | null
          dot_cost?: number
          event_date?: string | null
          id?: string
          speaker?: string | null
          title: string
        }
        Update: {
          capacity?: number
          created_at?: string
          description?: string | null
          dot_cost?: number
          event_date?: string | null
          id?: string
          speaker?: string | null
          title?: string
        }
        Relationships: []
      }
      founder_profiles: {
        Row: {
          bio: string | null
          community_id: string | null
          country: string | null
          created_at: string
          fundability: number | null
          funding_goal: number | null
          industry: string | null
          investment_readiness: number | null
          logo_url: string | null
          stage: string | null
          updated_at: string
          user_id: string
          vantage_point: number | null
          venture_name: string | null
          website: string | null
        }
        Insert: {
          bio?: string | null
          community_id?: string | null
          country?: string | null
          created_at?: string
          fundability?: number | null
          funding_goal?: number | null
          industry?: string | null
          investment_readiness?: number | null
          logo_url?: string | null
          stage?: string | null
          updated_at?: string
          user_id: string
          vantage_point?: number | null
          venture_name?: string | null
          website?: string | null
        }
        Update: {
          bio?: string | null
          community_id?: string | null
          country?: string | null
          created_at?: string
          fundability?: number | null
          funding_goal?: number | null
          industry?: string | null
          investment_readiness?: number | null
          logo_url?: string | null
          stage?: string | null
          updated_at?: string
          user_id?: string
          vantage_point?: number | null
          venture_name?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "founder_profiles_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      investor_saves: {
        Row: {
          created_at: string
          founder_id: string
          id: string
          investor_id: string
        }
        Insert: {
          created_at?: string
          founder_id: string
          id?: string
          investor_id: string
        }
        Update: {
          created_at?: string
          founder_id?: string
          id?: string
          investor_id?: string
        }
        Relationships: []
      }
      meeting_requests: {
        Row: {
          created_at: string
          founder_id: string
          id: string
          investor_id: string
          message: string | null
          status: string
        }
        Insert: {
          created_at?: string
          founder_id: string
          id?: string
          investor_id: string
          message?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          founder_id?: string
          id?: string
          investor_id?: string
          message?: string | null
          status?: string
        }
        Relationships: []
      }
      pitchathon_applications: {
        Row: {
          created_at: string
          founder_id: string
          funding_ask: number | null
          id: string
          pitch_deck_url: string | null
          pitchathon_id: string
          status: string
          venture_name: string | null
        }
        Insert: {
          created_at?: string
          founder_id: string
          funding_ask?: number | null
          id?: string
          pitch_deck_url?: string | null
          pitchathon_id: string
          status?: string
          venture_name?: string | null
        }
        Update: {
          created_at?: string
          founder_id?: string
          funding_ask?: number | null
          id?: string
          pitch_deck_url?: string | null
          pitchathon_id?: string
          status?: string
          venture_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pitchathon_applications_pitchathon_id_fkey"
            columns: ["pitchathon_id"]
            isOneToOne: false
            referencedRelation: "pitchathons"
            referencedColumns: ["id"]
          },
        ]
      }
      pitchathon_judges: {
        Row: {
          created_at: string
          id: string
          pitchathon_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          pitchathon_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          pitchathon_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pitchathon_judges_pitchathon_id_fkey"
            columns: ["pitchathon_id"]
            isOneToOne: false
            referencedRelation: "pitchathons"
            referencedColumns: ["id"]
          },
        ]
      }
      pitchathon_scores: {
        Row: {
          application_id: string
          created_at: string
          feedback: string | null
          id: string
          judge_id: string
          score: number
        }
        Insert: {
          application_id: string
          created_at?: string
          feedback?: string | null
          id?: string
          judge_id: string
          score: number
        }
        Update: {
          application_id?: string
          created_at?: string
          feedback?: string | null
          id?: string
          judge_id?: string
          score?: number
        }
        Relationships: [
          {
            foreignKeyName: "pitchathon_scores_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "pitchathon_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      pitchathons: {
        Row: {
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          prize: string | null
          start_date: string | null
          status: string
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          prize?: string | null
          start_date?: string | null
          status?: string
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          prize?: string | null
          start_date?: string | null
          status?: string
          title?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          id: string
          name: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id: string
          name?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          type?: string
          user_id?: string
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
      wallets: {
        Row: {
          balance: number
          created_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_adjust_wallet: {
        Args: {
          _amount: number
          _description: string
          _type: string
          _user_id: string
        }
        Returns: number
      }
      deposit_dot: {
        Args: { _amount: number; _description: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      reward_dot: {
        Args: { _amount: number; _description: string }
        Returns: number
      }
      spend_dot: {
        Args: { _amount: number; _description: string }
        Returns: number
      }
    }
    Enums: {
      app_role:
        | "founder"
        | "community_leader"
        | "investor"
        | "admin"
        | "super_admin"
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
      app_role: [
        "founder",
        "community_leader",
        "investor",
        "admin",
        "super_admin",
      ],
    },
  },
} as const
