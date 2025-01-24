import { supabase } from '@/lib/supabase/client'
import type { Database } from '@/types/supabase'

type Tables = Database['public']['Tables']
type TemplateRow = Tables['templates']['Row']

type DbTemplate = TemplateRow & {
  creator: {
    name: string | null
    email: string
  } | null
  team: {
    id: string
    name: string
    focus_area: string | null
  } | null
}

export type Template = {
  id: string
  created_by: string | null
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
        id,
        name,
        focus_area
      )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching templates:', error)
    throw error
  }

  if (!templates) {
    return []
  }

  return (templates as DbTemplate[]).map(template => ({
    id: template.id,
    created_by: template.created_by,
    title: template.title,
    content: template.content,
    created_at: template.created_at,
    team_id: template.team_id || undefined,
    tags: template.tags || [],
    creator: template.creator || undefined,
    team: template.team || undefined
  }))
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
        id,
        name,
        focus_area
      )
    `)
    .single()

  if (error) {
    console.error('Error creating template:', error)
    throw error
  }

  if (!data) {
    throw new Error('No data returned from template creation')
  }

  const template = data as DbTemplate
  return {
    id: template.id,
    created_by: template.created_by,
    title: template.title,
    content: template.content,
    created_at: template.created_at,
    team_id: template.team_id || undefined,
    tags: template.tags || [],
    creator: template.creator || undefined,
    team: template.team || undefined
  }
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
        id,
        name,
        focus_area
      )
    `)
    .single()

  if (error) {
    console.error('Error updating template:', error)
    throw error
  }

  if (!data) {
    throw new Error('No data returned from template update')
  }

  const template = data as DbTemplate
  return {
    id: template.id,
    created_by: template.created_by,
    title: template.title,
    content: template.content,
    created_at: template.created_at,
    team_id: template.team_id || undefined,
    tags: template.tags || [],
    creator: template.creator || undefined,
    team: template.team || undefined
  }
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