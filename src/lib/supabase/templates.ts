import { supabase } from '@/lib/supabase/client'

export type Template = {
  id: string
  created_by: string
  title: string
  content: string
  created_at: string
  team_id?: string
  tags: string[]
  creator?: {
    name: string | null
    email: string
  }
  team?: {
    id: string
    name: string
    focus_area: string | null
  }
}

export async function getTemplates() {
  const { data: templates, error } = await supabase
    .from('templates')
    .select(`
      *,
      creator:created_by (
        name,
        email
      ),
      team:team_id (
        name,
        focus_area
      )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching templates:', error)
    throw error
  }

  return templates as Template[]
}

export async function createTemplate(
  title: string, 
  content: string, 
  userId: string,
  teamId?: string,
  tags: string[] = []
) {
  const { data, error } = await supabase
    .from('templates')
    .insert({
      title,
      content,
      created_by: userId,
      team_id: teamId,
      tags
    })
    .select(`
      *,
      creator:created_by (
        name,
        email
      ),
      team:team_id (
        name,
        focus_area
      )
    `)
    .single()

  if (error) {
    console.error('Error creating template:', error)
    throw error
  }

  return data as Template
}

export async function deleteTemplate(id: string) {
  const { error } = await supabase
    .from('templates')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting template:', error)
    throw error
  }
}

export async function updateTemplate(
  id: string,
  updates: {
    title?: string
    content?: string
    team_id?: string | null
    tags?: string[]
  }
) {
  const { data, error } = await supabase
    .from('templates')
    .update(updates)
    .eq('id', id)
    .select(`
      *,
      creator:created_by (
        name,
        email
      ),
      team:team_id (
        name,
        focus_area
      )
    `)
    .single()

  if (error) {
    console.error('Error updating template:', error)
    throw error
  }

  return data as Template
}

export async function getTeamsForTemplate() {
  const { data: teams, error } = await supabase
    .from('teams')
    .select('id, name, focus_area')
    .order('name')

  if (error) {
    console.error('Error fetching teams:', error)
    throw error
  }

  return teams
} 