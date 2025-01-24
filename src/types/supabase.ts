export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
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
      coverage_schedules: {
        Row: {
          created_at: string
          created_by: string | null
          end_date: string
          id: string
          start_date: string
          team_id: string | null
          timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          end_date: string
          id?: string
          start_date: string
          team_id?: string | null
          timezone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          end_date?: string
          id?: string
          start_date?: string
          team_id?: string | null
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coverage_schedules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coverage_schedules_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      coverage_shifts: {
        Row: {
          created_at: string
          end_time: string
          id: string
          schedule_id: string | null
          start_time: string
          worker_id: string | null
        }
        Insert: {
          created_at?: string
          end_time: string
          id?: string
          schedule_id?: string | null
          start_time: string
          worker_id?: string | null
        }
        Update: {
          created_at?: string
          end_time?: string
          id?: string
          schedule_id?: string | null
          start_time?: string
          worker_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coverage_shifts_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "coverage_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coverage_shifts_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          score: number | null
          ticket_id: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          score?: number | null
          ticket_id?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          score?: number | null
          ticket_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      file_upload_logs: {
        Row: {
          file_id: string | null
          file_size_bytes: number | null
          id: string
          timestamp: string | null
          upload_duration_ms: number | null
        }
        Insert: {
          file_id?: string | null
          file_size_bytes?: number | null
          id?: string
          timestamp?: string | null
          upload_duration_ms?: number | null
        }
        Update: {
          file_id?: string | null
          file_size_bytes?: number | null
          id?: string
          timestamp?: string | null
          upload_duration_ms?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "file_upload_logs_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
        ]
      }
      files: {
        Row: {
          file_url: string
          id: string
          ticket_id: string | null
          uploaded_at: string
        }
        Insert: {
          file_url: string
          id?: string
          ticket_id?: string | null
          uploaded_at?: string
        }
        Update: {
          file_url?: string
          id?: string
          ticket_id?: string | null
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "files_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      help_articles: {
        Row: {
          category: string | null
          content: string
          created_at: string
          created_by: string | null
          id: string
          published: boolean | null
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          published?: boolean | null
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          published?: boolean | null
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "help_articles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          ticket_id: string | null
          timestamp: string
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          ticket_id?: string | null
          timestamp?: string
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          ticket_id?: string | null
          timestamp?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          id: string
          ticket_id: string | null
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          ticket_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          ticket_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      query_performance_logs: {
        Row: {
          execution_time_ms: number | null
          id: string
          query_id: string | null
          query_text: string | null
          rows_affected: number | null
          timestamp: string | null
        }
        Insert: {
          execution_time_ms?: number | null
          id?: string
          query_id?: string | null
          query_text?: string | null
          rows_affected?: number | null
          timestamp?: string | null
        }
        Update: {
          execution_time_ms?: number | null
          id?: string
          query_id?: string | null
          query_text?: string | null
          rows_affected?: number | null
          timestamp?: string | null
        }
        Relationships: []
      }
      realtime_sync_logs: {
        Row: {
          id: string
          operation: string | null
          sync_delay_ms: number | null
          table_name: string | null
          timestamp: string | null
        }
        Insert: {
          id?: string
          operation?: string | null
          sync_delay_ms?: number | null
          table_name?: string | null
          timestamp?: string | null
        }
        Update: {
          id?: string
          operation?: string | null
          sync_delay_ms?: number | null
          table_name?: string | null
          timestamp?: string | null
        }
        Relationships: []
      }
      teams: {
        Row: {
          created_at: string
          focus_area: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          focus_area?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          focus_area?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      templates: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          id: string
          tags: string[] | null
          team_id: string | null
          title: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          tags?: string[] | null
          team_id?: string | null
          title: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          tags?: string[] | null
          team_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "templates_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          assigned_team: string | null
          assigned_to: string | null
          created_at: string
          custom_fields: Json | null
          customer_id: string | null
          first_response_at: string | null
          id: string
          priority: string | null
          reopen_count: number | null
          resolved_at: string | null
          status: string
          tags: string[] | null
          timestamp: string
          title: string
          updated_at: string | null
        }
        Insert: {
          assigned_team?: string | null
          assigned_to?: string | null
          created_at?: string
          custom_fields?: Json | null
          customer_id?: string | null
          first_response_at?: string | null
          id?: string
          priority?: string | null
          reopen_count?: number | null
          resolved_at?: string | null
          status: string
          tags?: string[] | null
          timestamp?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          assigned_team?: string | null
          assigned_to?: string | null
          created_at?: string
          custom_fields?: Json | null
          customer_id?: string | null
          first_response_at?: string | null
          id?: string
          priority?: string | null
          reopen_count?: number | null
          resolved_at?: string | null
          status?: string
          tags?: string[] | null
          timestamp?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tickets_assigned_team_fkey"
            columns: ["assigned_team"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_teams: {
        Row: {
          id: string
          team_id: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          team_id?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          team_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_teams_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_teams_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          approval_notes: string | null
          approval_requested_at: string | null
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          created_at: string
          email: string
          id: string
          name: string | null
          role: string
          timestamp: string
        }
        Insert: {
          approval_notes?: string | null
          approval_requested_at?: string | null
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          email: string
          id?: string
          name?: string | null
          role: string
          timestamp?: string
        }
        Update: {
          approval_notes?: string | null
          approval_requested_at?: string | null
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string | null
          role?: string
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_logs: {
        Row: {
          attempt_count: number | null
          created_at: string
          error: string | null
          event: string
          id: string
          payload: Json
          response: string | null
          status_code: number | null
          updated_at: string
          webhook_id: string | null
        }
        Insert: {
          attempt_count?: number | null
          created_at?: string
          error?: string | null
          event: string
          id?: string
          payload: Json
          response?: string | null
          status_code?: number | null
          updated_at?: string
          webhook_id?: string | null
        }
        Update: {
          attempt_count?: number | null
          created_at?: string
          error?: string | null
          event?: string
          id?: string
          payload?: Json
          response?: string | null
          status_code?: number | null
          updated_at?: string
          webhook_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "webhook_logs_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "webhooks"
            referencedColumns: ["id"]
          },
        ]
      }
      webhooks: {
        Row: {
          created_at: string
          created_by: string | null
          events: string[]
          id: string
          is_active: boolean | null
          name: string
          secret: string
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          events: string[]
          id?: string
          is_active?: boolean | null
          name: string
          secret: string
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          events?: string[]
          id?: string
          is_active?: boolean | null
          name?: string
          secret?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhooks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      worker_chat: {
        Row: {
          creation_date: string
          id: string
          theme: string | null
          title: string
        }
        Insert: {
          creation_date?: string
          id?: string
          theme?: string | null
          title: string
        }
        Update: {
          creation_date?: string
          id?: string
          theme?: string | null
          title?: string
        }
        Relationships: []
      }
      worker_chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          user_id: string | null
          worker_chat_id: string | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          user_id?: string | null
          worker_chat_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          user_id?: string | null
          worker_chat_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "worker_chat_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_chat_messages_worker_chat_id_fkey"
            columns: ["worker_chat_id"]
            isOneToOne: false
            referencedRelation: "worker_chat"
            referencedColumns: ["id"]
          },
        ]
      }
      worker_skills: {
        Row: {
          created_at: string
          endorsed_by: string
          id: string
          proficiency_level: string
          skill_name: string
          updated_at: string
          worker_id: string
        }
        Insert: {
          created_at?: string
          endorsed_by: string
          id?: string
          proficiency_level: string
          skill_name: string
          updated_at?: string
          worker_id: string
        }
        Update: {
          created_at?: string
          endorsed_by?: string
          id?: string
          proficiency_level?: string
          skill_name?: string
          updated_at?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "worker_skills_endorsed_by_fkey"
            columns: ["endorsed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_skills_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      vw_file_upload_performance: {
        Row: {
          avg_file_size_bytes: number | null
          avg_upload_duration_ms: number | null
          max_upload_duration_ms: number | null
          upload_count: number | null
        }
        Relationships: []
      }
      vw_realtime_sync_performance: {
        Row: {
          avg_sync_delay_ms: number | null
          max_sync_delay_ms: number | null
          operation: string | null
          operation_count: number | null
          table_name: string | null
        }
        Relationships: []
      }
      vw_slow_queries: {
        Row: {
          avg_execution_time_ms: number | null
          last_occurrence: string | null
          occurrence_count: number | null
          query_id: string | null
          query_text: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      approve_worker: {
        Args: {
          worker_id: string
          admin_notes?: string
        }
        Returns: undefined
      }
      create_webhook_log: {
        Args: {
          p_webhook_id: string
          p_event: string
          p_payload: Json
          p_status_code?: number
          p_response?: string
          p_error?: string
        }
        Returns: string
      }
      get_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_worker: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      reject_worker: {
        Args: {
          worker_id: string
          admin_notes?: string
        }
        Returns: undefined
      }
      truncate_tables: {
        Args: {
          table_names: string[]
        }
        Returns: undefined
      }
      update_webhook_log: {
        Args: {
          p_log_id: string
          p_status_code: number
          p_response?: string
          p_error?: string
        }
        Returns: undefined
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

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

