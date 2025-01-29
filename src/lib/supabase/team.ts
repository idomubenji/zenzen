import { supabase } from "./client"
import type { TeamMember } from "@/components/team/team-member-card"
import type { PendingWorker } from "@/components/team/pending-worker-card"

export async function getTeamMembers(): Promise<TeamMember[]> {
  // Get users who are Workers or Administrators
  const { data: users, error } = await supabase
    .from('users')
    .select(`
      id,
      name,
      email,
      role,
      user_teams (
        team:teams (
          id,
          name,
          focus_area
        )
      )
    `)
    .in('role', ['Worker', 'Administrator'])
    .order('role')

  if (error) {
    console.error('Error fetching team members:', error)
    throw error
  }

  console.log('Raw user data:', JSON.stringify(users, null, 2))

  // Transform the data to match the TeamMember interface
  return users.map(user => {
    console.log(`Processing user ${user.email}:`, user)
    console.log(`user_teams for ${user.email}:`, user.user_teams)
    
    // Extract teams from the nested structure
    const teams = (user.user_teams || [])
      .map(ut => {
        console.log(`Processing user_team entry:`, ut)
        return ut.team
      })
      .filter((team): team is NonNullable<typeof team> => {
        console.log(`Filtering team:`, team)
        return team !== null
      })

    console.log(`Final teams for user ${user.email}:`, teams)
    
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role as TeamMember['role'],
      teams
    }
  })
}

export async function getPendingWorkers(): Promise<PendingWorker[]> {
  const { data: users, error } = await supabase
    .from('users')
    .select('id, name, email, role')
    .eq('role', 'PendingWorker')
    .order('created_at')

  if (error) {
    console.error('Error fetching pending workers:', error)
    throw error
  }

  return users as PendingWorker[]
}

export async function approveWorker(userId: string): Promise<void> {
  const { error } = await supabase
    .from('users')
    .update({ role: 'Worker' })
    .eq('id', userId)
    .eq('role', 'PendingWorker')

  if (error) {
    console.error('Error approving worker:', error)
    throw error
  }
}

export async function denyWorker(userId: string): Promise<void> {
  const { error } = await supabase
    .from('users')
    .update({ role: 'Customer' })
    .eq('id', userId)
    .eq('role', 'PendingWorker')

  if (error) {
    console.error('Error denying worker:', error)
    throw error
  }
}

export async function updateMemberRole(userId: string, role: TeamMember['role']): Promise<void> {
  const { error } = await supabase
    .from('users')
    .update({ role })
    .eq('id', userId)

  if (error) {
    console.error('Error updating member role:', error)
    throw error
  }
}

export async function updateMemberTeams(userId: string, teamIds: string[]): Promise<void> {
  console.log('Updating teams for user:', userId)
  console.log('New team IDs:', teamIds)

  // First delete existing team associations
  const { data: existingTeams, error: fetchError } = await supabase
    .from('user_teams')
    .select('team_id')
    .eq('user_id', userId)

  if (fetchError) {
    console.error('Error fetching existing team associations:', fetchError)
    throw fetchError
  }

  console.log('Existing team associations:', existingTeams)

  // First delete existing team associations
  const { error: deleteError } = await supabase
    .from('user_teams')
    .delete()
    .eq('user_id', userId)

  if (deleteError) {
    console.error('Error deleting team associations:', deleteError)
    throw deleteError
  }

  console.log('Deleted existing team associations')

  // If there are new teams to add
  if (teamIds.length > 0) {
    const newAssociations = teamIds.map(teamId => ({
      user_id: userId,
      team_id: teamId
    }))
    
    console.log('Adding new team associations:', newAssociations)

    const { error: insertError } = await supabase
      .from('user_teams')
      .insert(newAssociations)

    if (insertError) {
      console.error('Error adding team associations:', insertError)
      throw insertError
    }

    console.log('Successfully added new team associations')
  }
} 