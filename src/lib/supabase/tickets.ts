import { supabase } from '@/lib/supabase/client'

export type Ticket = {
  id: string
  customer_id: string
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
  custom_fields: Record<string, any>
  customer?: {
    name: string | null
    email: string
  }
}

export async function getTickets() {
  const { data: tickets, error } = await supabase
    .from('tickets')
    .select(`
      *,
      customer:users!tickets_customer_id_fkey(name, email)
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching tickets:', error)
    return []
  }

  return tickets as unknown as Ticket[]
}

export async function getTicketsByStatus(status: Ticket['status']) {
  const { data: tickets, error } = await supabase
    .from('tickets')
    .select(`
      *,
      customer:users!tickets_customer_id_fkey(name, email)
    `)
    .eq('status', status)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching tickets:', error)
    return []
  }

  return tickets as unknown as Ticket[]
}

export async function getTicketCount(status?: Ticket['status']) {
  let query = supabase
    .from('tickets')
    .select('id', { count: 'exact' })
  
  if (status) {
    query = query.eq('status', status)
  }
  
  const { count, error } = await query

  if (error) {
    console.error('Error counting tickets:', error)
    return 0
  }

  return count || 0
} 