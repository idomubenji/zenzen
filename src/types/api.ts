import { Database } from './supabase'

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T]

// Generic API Response type
export type ApiResponse<T> = {
  data?: T
  error?: {
    message: string
    details?: unknown
  }
}

// Common response types
export type MessageResponse = ApiResponse<Tables<'messages'>>
export type MessagesResponse = ApiResponse<Tables<'messages'>[]>
export type TicketResponse = ApiResponse<Tables<'tickets'>>
export type TicketsResponse = ApiResponse<Tables<'tickets'>[]>
export type UserResponse = ApiResponse<Tables<'users'>>
export type UsersResponse = ApiResponse<Tables<'users'>[]>
export type TeamResponse = ApiResponse<Tables<'teams'>>
export type TeamsResponse = ApiResponse<Tables<'teams'>[]>

// Request types
export type CreateMessageRequest = {
  ticket_id: string
  content: string
}

export type UpdateMessageRequest = {
  content: string
}

export type CreateTicketRequest = {
  title: string
  customer_id?: string
  priority?: Tables<'tickets'>['priority']
  tags?: string[]
  custom_fields?: Record<string, unknown>
}

export type UpdateTicketRequest = Partial<CreateTicketRequest> & {
  status?: Tables<'tickets'>['status']
  assigned_to?: string | null
  assigned_team?: string | null
} 