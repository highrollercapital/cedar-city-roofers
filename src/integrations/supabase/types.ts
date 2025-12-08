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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          assigned_to: string | null
          client_id: string | null
          created_at: string | null
          description: string | null
          end_time: string
          google_calendar_event_id: string | null
          id: string
          lead_id: string | null
          location: string | null
          project_id: string | null
          reminder_sent: boolean | null
          start_time: string
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          client_id?: string | null
          created_at?: string | null
          description?: string | null
          end_time: string
          google_calendar_event_id?: string | null
          id?: string
          lead_id?: string | null
          location?: string | null
          project_id?: string | null
          reminder_sent?: boolean | null
          start_time: string
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          client_id?: string | null
          created_at?: string | null
          description?: string | null
          end_time?: string
          google_calendar_event_id?: string | null
          id?: string
          lead_id?: string | null
          location?: string | null
          project_id?: string | null
          reminder_sent?: boolean | null
          start_time?: string
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_logs: {
        Row: {
          automation_type: string
          content: string | null
          created_at: string | null
          id: string
          lead_id: string | null
          metadata: Json | null
          project_id: string | null
          recipient: string
          status: string
        }
        Insert: {
          automation_type: string
          content?: string | null
          created_at?: string | null
          id?: string
          lead_id?: string | null
          metadata?: Json | null
          project_id?: string | null
          recipient: string
          status: string
        }
        Update: {
          automation_type?: string
          content?: string | null
          created_at?: string | null
          id?: string
          lead_id?: string | null
          metadata?: Json | null
          project_id?: string | null
          recipient?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          client_id: string | null
          client_signature: string | null
          client_signed_at: string | null
          content: string
          created_at: string | null
          created_by: string | null
          id: string
          project_id: string | null
          proposal_id: string | null
          roofer_signature: string | null
          roofer_signed_at: string | null
          status: Database["public"]["Enums"]["proposal_status"] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          client_id?: string | null
          client_signature?: string | null
          client_signed_at?: string | null
          content: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          project_id?: string | null
          proposal_id?: string | null
          roofer_signature?: string | null
          roofer_signed_at?: string | null
          status?: Database["public"]["Enums"]["proposal_status"] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          client_id?: string | null
          client_signature?: string | null
          client_signed_at?: string | null
          content?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          project_id?: string | null
          proposal_id?: string | null
          roofer_signature?: string | null
          roofer_signed_at?: string | null
          status?: Database["public"]["Enums"]["proposal_status"] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          body: string
          created_at: string | null
          id: string
          name: string
          subject: string
          updated_at: string | null
          variables: Json | null
        }
        Insert: {
          body: string
          created_at?: string | null
          id?: string
          name: string
          subject: string
          updated_at?: string | null
          variables?: Json | null
        }
        Update: {
          body?: string
          created_at?: string | null
          id?: string
          name?: string
          subject?: string
          updated_at?: string | null
          variables?: Json | null
        }
        Relationships: []
      }
      leads: {
        Row: {
          address: string | null
          appointment_date: string | null
          assigned_to: string | null
          booked_at: string | null
          city: string | null
          contacted_at: string | null
          created_at: string | null
          email: string
          estimate_sent_at: string | null
          id: string
          name: string
          needs_follow_up: boolean | null
          notes: string | null
          phone: string
          post_estimate_follow_up_needed: boolean | null
          profit_percentage: number | null
          profit_total: number | null
          project_id: string | null
          project_total: number | null
          roof_type: string | null
          source: string | null
          state: string | null
          status: Database["public"]["Enums"]["lead_status"] | null
          updated_at: string | null
          urgency: Database["public"]["Enums"]["urgency_level"] | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          appointment_date?: string | null
          assigned_to?: string | null
          booked_at?: string | null
          city?: string | null
          contacted_at?: string | null
          created_at?: string | null
          email: string
          estimate_sent_at?: string | null
          id?: string
          name: string
          needs_follow_up?: boolean | null
          notes?: string | null
          phone: string
          post_estimate_follow_up_needed?: boolean | null
          profit_percentage?: number | null
          profit_total?: number | null
          project_id?: string | null
          project_total?: number | null
          roof_type?: string | null
          source?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["lead_status"] | null
          updated_at?: string | null
          urgency?: Database["public"]["Enums"]["urgency_level"] | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          appointment_date?: string | null
          assigned_to?: string | null
          booked_at?: string | null
          city?: string | null
          contacted_at?: string | null
          created_at?: string | null
          email?: string
          estimate_sent_at?: string | null
          id?: string
          name?: string
          needs_follow_up?: boolean | null
          notes?: string | null
          phone?: string
          post_estimate_follow_up_needed?: boolean | null
          profit_percentage?: number | null
          profit_total?: number | null
          project_id?: string | null
          project_total?: number | null
          roof_type?: string | null
          source?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["lead_status"] | null
          updated_at?: string | null
          urgency?: Database["public"]["Enums"]["urgency_level"] | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          project_id: string | null
          read: boolean | null
          recipient_id: string | null
          sender_id: string | null
          subject: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          project_id?: string | null
          read?: boolean | null
          recipient_id?: string | null
          sender_id?: string | null
          subject?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          project_id?: string | null
          read?: boolean | null
          recipient_id?: string | null
          sender_id?: string | null
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      project_media: {
        Row: {
          caption: string | null
          created_at: string | null
          file_type: string | null
          file_url: string
          id: string
          project_id: string | null
          uploaded_by: string | null
        }
        Insert: {
          caption?: string | null
          created_at?: string | null
          file_type?: string | null
          file_url: string
          id?: string
          project_id?: string | null
          uploaded_by?: string | null
        }
        Update: {
          caption?: string | null
          created_at?: string | null
          file_type?: string | null
          file_url?: string
          id?: string
          project_id?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_media_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_media_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      project_notes: {
        Row: {
          content: string
          created_at: string | null
          created_by: string | null
          id: string
          project_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          project_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          project_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_notes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          actual_cost: number | null
          address: string
          assigned_to: string | null
          client_id: string | null
          completion_date: string | null
          created_at: string | null
          description: string | null
          estimated_cost: number | null
          id: string
          lead_id: string | null
          name: string
          stage: Database["public"]["Enums"]["project_stage"] | null
          start_date: string | null
          updated_at: string | null
        }
        Insert: {
          actual_cost?: number | null
          address: string
          assigned_to?: string | null
          client_id?: string | null
          completion_date?: string | null
          created_at?: string | null
          description?: string | null
          estimated_cost?: number | null
          id?: string
          lead_id?: string | null
          name: string
          stage?: Database["public"]["Enums"]["project_stage"] | null
          start_date?: string | null
          updated_at?: string | null
        }
        Update: {
          actual_cost?: number | null
          address?: string
          assigned_to?: string | null
          client_id?: string | null
          completion_date?: string | null
          created_at?: string | null
          description?: string | null
          estimated_cost?: number | null
          id?: string
          lead_id?: string | null
          name?: string
          stage?: Database["public"]["Enums"]["project_stage"] | null
          start_date?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      proposals: {
        Row: {
          client_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          expires_at: string | null
          id: string
          items: Json | null
          lead_id: string | null
          project_id: string | null
          sent_at: string | null
          signed_at: string | null
          status: Database["public"]["Enums"]["proposal_status"] | null
          subtotal: number | null
          tax: number | null
          title: string
          total: number | null
          updated_at: string | null
          viewed_at: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          items?: Json | null
          lead_id?: string | null
          project_id?: string | null
          sent_at?: string | null
          signed_at?: string | null
          status?: Database["public"]["Enums"]["proposal_status"] | null
          subtotal?: number | null
          tax?: number | null
          title: string
          total?: number | null
          updated_at?: string | null
          viewed_at?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          items?: Json | null
          lead_id?: string | null
          project_id?: string | null
          sent_at?: string | null
          signed_at?: string | null
          status?: Database["public"]["Enums"]["proposal_status"] | null
          subtotal?: number | null
          tax?: number | null
          title?: string
          total?: number | null
          updated_at?: string | null
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proposals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          description: string | null
          id: string
          key: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          id?: string
          key: string
          updated_at?: string | null
          value: Json
        }
        Update: {
          description?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: []
      }
      sms_templates: {
        Row: {
          created_at: string | null
          id: string
          message: string
          name: string
          updated_at: string | null
          variables: Json | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          name: string
          updated_at?: string | null
          variables?: Json | null
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          name?: string
          updated_at?: string | null
          variables?: Json | null
        }
        Relationships: []
      }
      team_members: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          permissions: Json | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          permissions?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          permissions?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          company_logo_url: string | null
          company_name: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string | null
        }
        Insert: {
          company_logo_url?: string | null
          company_name?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Update: {
          company_logo_url?: string | null
          company_name?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_or_roofer: { Args: never; Returns: boolean }
    }
    Enums: {
      lead_status:
        | "new"
        | "contacted"
        | "booked"
        | "in_progress"
        | "completed"
        | "lost"
        | "needs_follow_up"
        | "estimate_sent"
        | "post_estimate_follow_up"
        | "closed"
        | "rejected"
        | "appointment_cancelled"
      project_stage:
        | "inspection"
        | "quote_sent"
        | "approved"
        | "in_progress"
        | "completed"
      proposal_status:
        | "draft"
        | "sent"
        | "viewed"
        | "signed"
        | "approved"
        | "rejected"
      urgency_level: "low" | "medium" | "high" | "urgent"
      user_role: "admin" | "roofer" | "client"
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
      lead_status: [
        "new",
        "contacted",
        "booked",
        "in_progress",
        "completed",
        "lost",
        "needs_follow_up",
        "estimate_sent",
        "post_estimate_follow_up",
        "closed",
        "rejected",
        "appointment_cancelled",
      ],
      project_stage: [
        "inspection",
        "quote_sent",
        "approved",
        "in_progress",
        "completed",
      ],
      proposal_status: [
        "draft",
        "sent",
        "viewed",
        "signed",
        "approved",
        "rejected",
      ],
      urgency_level: ["low", "medium", "high", "urgent"],
      user_role: ["admin", "roofer", "client"],
    },
  },
} as const
