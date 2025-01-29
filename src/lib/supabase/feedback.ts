import { supabase } from "./client"

export async function submitFeedback(ticketId: string, score: number, comment?: string) {
  const { data, error } = await supabase
    .from('feedback')
    .insert([
      {
        ticket_id: ticketId,
        score,
        comment
      }
    ])
    .select()
    .single()

  if (error) throw error
  return data
} 