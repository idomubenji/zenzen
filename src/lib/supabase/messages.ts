import { supabase } from '@/lib/supabase/client'

export interface Message {
  id: string
  ticket_id: string | null
  user_id: string | null
  content: string
  created_at: string
  timestamp: string
  user: {
    name: string | null
    email: string
  } | null
}

export async function getTicketMessages(ticketId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from("messages")
    .select(`
      *,
      user:users(name, email)
    `)
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true })

  if (error) {
    console.error("Error fetching messages:", error)
    return []
  }

  return data
}

export async function sendMessage(ticketId: string, content: string): Promise<Message | null> {
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) {
    console.error("Error getting current user:", userError)
    return null
  }

  const { data, error } = await supabase
    .from("messages")
    .insert([
      {
        ticket_id: ticketId,
        user_id: userData.user.id,
        content
      }
    ])
    .select(`
      *,
      user:users(name, email)
    `)
    .single()

  if (error) {
    console.error("Error sending message:", error)
    return null
  }

  return data
} 