import { supabase } from "./client"

export interface User {
  id: string
  name: string | null
  email: string
}

export interface Note {
  id: string
  ticket_id: string | null
  created_by: string | null
  content: string
  created_at: string
  creator?: User | null
}

export async function getNotes(ticket_id: string): Promise<Note[]> {
  const { data, error } = await supabase
    .from('notes')
    .select(`
      *,
      creator:created_by (
        id,
        name,
        email
      )
    `)
    .eq('ticket_id', ticket_id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching notes:', error)
    throw error
  }

  return data || []
}

export async function createNote(ticket_id: string, content: string): Promise<Note> {
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) {
    console.error("Error getting current user:", userError)
    throw userError
  }

  const { data, error } = await supabase
    .from('notes')
    .insert([
      {
        ticket_id,
        content,
        created_by: userData.user.id
      }
    ])
    .select(`
      *,
      creator:created_by (
        id,
        name,
        email
      )
    `)
    .single()

  if (error) {
    console.error('Error creating note:', error)
    throw error
  }

  return data
}

export async function updateNote(id: string, content: string): Promise<Note> {
  const { data, error } = await supabase
    .from('notes')
    .update({ content })
    .eq('id', id)
    .select(`
      *,
      creator:created_by (
        id,
        name,
        email
      )
    `)
    .single()

  if (error) {
    console.error('Error updating note:', error)
    throw error
  }

  return data
}

export async function deleteNote(id: string): Promise<void> {
  const { error } = await supabase
    .from('notes')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting note:', error)
    throw error
  }
} 