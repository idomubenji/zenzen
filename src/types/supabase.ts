export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
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
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          ticket_id: string | null
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          ticket_id?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          ticket_id?: string | null
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
          title: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          title: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
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
          created_at: string
          email: string
          id: string
          name: string | null
          role: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          name?: string | null
          role: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string | null
          role?: string
        }
        Relationships: []
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
      set_ticket_context: {
        Args: {
          ticket_id: string
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
