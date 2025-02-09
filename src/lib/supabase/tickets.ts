import { supabase } from '@/lib/supabase/client'
import { getCurrentUser } from './auth'

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
  feedback?: {
    id: string
    score: number
    comment: string | null
    created_at: string
  } | null
}

export async function getTickets() {
  const { data: tickets, error } = await supabase
    .from('tickets')
    .select(`
      *,
      customer:users!tickets_customer_id_fkey(
        name,
        email
      ),
      feedback(
        id,
        score,
        comment,
        created_at
      )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching tickets:', error)
    throw error
  }

  if (!tickets) {
    console.log('No tickets found')
    return []
  }

  // Transform the feedback array to a single object since we only expect one feedback per ticket
  const transformedTickets = tickets.map(ticket => ({
    ...ticket,
    feedback: ticket.feedback?.[0] || null
  }))

  console.log('Fetched tickets:', transformedTickets)
  return transformedTickets as Ticket[]
}

export async function getTicketsByStatus(status: Ticket['status']) {
  const { data: tickets, error } = await supabase
    .from('tickets')
    .select(`
      *,
      customer:users!tickets_customer_id_fkey(name, email),
      feedback(
        id,
        score,
        comment,
        created_at
      )
    `)
    .eq('status', status)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching tickets:', error)
    return []
  }

  // Transform the feedback array to a single object
  const transformedTickets = tickets.map(ticket => ({
    ...ticket,
    feedback: ticket.feedback?.[0] || null
  }))

  return transformedTickets as Ticket[]
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

interface CreateTicketParams {
  title: string
  initialMessage: string
}

export async function createTicket({ title, initialMessage }: CreateTicketParams) {
  const user = await getCurrentUser()

  if (!user) {
    throw new Error("You must be logged in to create a ticket")
  }

  console.log('Creating ticket with:', {
    user_id: user.id,
    title,
    initialMessage
  })

  // Create the ticket with minimal fields
  const { data: ticket, error: ticketError } = await supabase
    .from('tickets')
    .insert({
      title,
      status: 'UNOPENED',
      priority: 'MEDIUM',
      customer_id: user.id,
      tags: [],
      custom_fields: {},
      reopen_count: 0
    })
    .select(`
      id
    `)
    .single()

  if (ticketError) {
    console.error('Full ticket creation error:', ticketError)
    console.error('Error code:', ticketError.code)
    console.error('Error message:', ticketError.message)
    console.error('Error details:', ticketError.details)
    throw new Error(`Failed to create ticket: ${ticketError.message}`)
  }

  console.log('Ticket created:', ticket)

  // Create the initial message
  const { error: messageError } = await supabase
    .from('messages')
    .insert({
      ticket_id: ticket.id,
      content: initialMessage,
      user_id: user.id
    })

  if (messageError) {
    console.error('Message creation error:', messageError)
    // If message creation fails, delete the ticket
    await supabase
      .from('tickets')
      .delete()
      .eq('id', ticket.id)
    throw new Error(messageError.message)
  }

  return ticket
} 