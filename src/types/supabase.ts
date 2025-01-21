export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          role: 'Administrator' | 'Worker' | 'Customer'
          name: string | null
          created_at: string
          timestamp: string
        }
        Insert: {
          id?: string
          email: string
          role: 'Administrator' | 'Worker' | 'Customer'
          name?: string | null
          created_at?: string
          timestamp?: string
        }
        Update: {
          id?: string
          email?: string
          role?: 'Administrator' | 'Worker' | 'Customer'
          name?: string | null
          created_at?: string
          timestamp?: string
        }
      }
      teams: {
        Row: {
          id: string
          name: string
          focus_area: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          focus_area?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          focus_area?: string | null
          created_at?: string
        }
      }
      user_teams: {
        Row: {
          id: string
          user_id: string
          team_id: string
        }
        Insert: {
          id?: string
          user_id: string
          team_id: string
        }
        Update: {
          id?: string
          user_id?: string
          team_id?: string
        }
      }
      tickets: {
        Row: {
          id: string
          customer_id: string | null
          title: string
          status: 'UNOPENED' | 'IN PROGRESS' | 'RESOLVED' | 'UNRESOLVED'
          priority: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
          created_at: string
          updated_at: string | null
          first_response_at: string | null
          resolved_at: string | null
          reopen_count: number
          assigned_to: string | null
          assigned_team: string | null
          tags: string[]
          custom_fields: Json
          timestamp: string
        }
        Insert: {
          id?: string
          customer_id?: string | null
          title: string
          status?: 'UNOPENED' | 'IN PROGRESS' | 'RESOLVED' | 'UNRESOLVED'
          priority?: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
          created_at?: string
          updated_at?: string | null
          first_response_at?: string | null
          resolved_at?: string | null
          reopen_count?: number
          assigned_to?: string | null
          assigned_team?: string | null
          tags?: string[]
          custom_fields?: Json
          timestamp?: string
        }
        Update: {
          id?: string
          customer_id?: string | null
          title?: string
          status?: 'UNOPENED' | 'IN PROGRESS' | 'RESOLVED' | 'UNRESOLVED'
          priority?: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
          created_at?: string
          updated_at?: string | null
          first_response_at?: string | null
          resolved_at?: string | null
          reopen_count?: number
          assigned_to?: string | null
          assigned_team?: string | null
          tags?: string[]
          custom_fields?: Json
          timestamp?: string
        }
      }
      coverage_schedules: {
        Row: {
          id: string
          team_id: string
          start_date: string
          end_date: string
          timezone: string
          created_at: string
          updated_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          team_id: string
          start_date: string
          end_date: string
          timezone?: string
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          team_id?: string
          start_date?: string
          end_date?: string
          timezone?: string
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
      }
      coverage_shifts: {
        Row: {
          id: string
          schedule_id: string
          worker_id: string
          start_time: string
          end_time: string
          created_at: string
        }
        Insert: {
          id?: string
          schedule_id: string
          worker_id: string
          start_time: string
          end_time: string
          created_at?: string
        }
        Update: {
          id?: string
          schedule_id?: string
          worker_id?: string
          start_time?: string
          end_time?: string
          created_at?: string
        }
      }
    }
  }
} 