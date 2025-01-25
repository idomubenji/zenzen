"use client"

import { useEffect, useState } from "react"
import { LayoutGrid, LayoutList, Plus, Pencil } from "lucide-react"
import { Toggle } from "@/components/ui/toggle"
import { TeamMemberCard, type TeamMember } from "@/components/team/team-member-card"
import { PendingWorkerCard, type PendingWorker } from "@/components/team/pending-worker-card"
import { EditMemberDialog } from "@/components/team/edit-member-dialog"
import { EditTeamDialog } from "@/components/team/edit-team-dialog"
import { 
  getTeamMembers, 
  getPendingWorkers, 
  approveWorker, 
  denyWorker,
  updateMemberRole,
  updateMemberTeams
} from "@/lib/supabase/team"
import { useSession } from "@/lib/hooks/use-session"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase/client"
import { CreateTeamDialog } from "@/components/team/create-team-dialog"
import { Button } from "@/components/ui/button"

interface Team {
  id: string
  name: string
  focus_area: string | null
}

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [pendingWorkers, setPendingWorkers] = useState<PendingWorker[]>([])
  const [isGridView, setIsGridView] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null)
  const [availableTeams, setAvailableTeams] = useState<Team[]>([])
  const [showCreateTeam, setShowCreateTeam] = useState(false)
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const { session } = useSession()

  // Debug session structure
  console.log('Full session object:', JSON.stringify(session, null, 2))
  console.log('Session user:', session?.user)
  console.log('User metadata:', session?.user?.user_metadata)

  useEffect(() => {
    async function checkAdminStatus() {
      if (!session?.user?.id) return false
      
      const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single()

      if (error) {
        console.error('Error checking admin status:', error)
        return false
      }

      return data?.role === 'Administrator'
    }

    async function loadTeams() {
      const { data: teams, error } = await supabase
        .from('teams')
        .select('id, name, focus_area')
        .order('name')

      if (error) {
        console.error('Error loading teams:', error)
        return []
      }

      return teams
    }

    async function loadData() {
      try {
        const [adminStatus, teamMembers, pendingMembers, teams] = await Promise.all([
          checkAdminStatus(),
          getTeamMembers(),
          getPendingWorkers(),
          loadTeams()
        ])
        setIsAdmin(adminStatus)
        setMembers(teamMembers)
        setPendingWorkers(pendingMembers)
        setAvailableTeams(teams)
      } catch (error) {
        console.error('Error loading team data:', error)
        toast.error("Failed to load team data")
      } finally {
        setIsLoading(false)
      }
    }

    loadData()

    // Set up real-time subscription for user role changes
    const userSubscription = supabase
      .channel('user-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'users'
        },
        async (payload) => {
          // Refresh both members and pending workers lists when a user changes
          const [teamMembers, pendingMembers] = await Promise.all([
            getTeamMembers(),
            getPendingWorkers()
          ])
          setMembers(teamMembers)
          setPendingWorkers(pendingMembers)
        }
      )
      .subscribe()

    // Cleanup subscription on unmount
    return () => {
      userSubscription.unsubscribe()
    }
  }, [session])

  const handleApproveWorker = async (member: PendingWorker) => {
    try {
      await approveWorker(member.id)
      setPendingWorkers(prev => prev.filter(p => p.id !== member.id))
      toast.success("Worker approved successfully")
      
      // Refresh the team members list
      const teamMembers = await getTeamMembers()
      setMembers(teamMembers)
    } catch (error) {
      console.error('Error approving worker:', error)
      toast.error("Failed to approve worker")
    }
  }

  const handleDenyWorker = async (member: PendingWorker) => {
    try {
      await denyWorker(member.id)
      setPendingWorkers(prev => prev.filter(p => p.id !== member.id))
      toast.success("Worker application denied")
    } catch (error) {
      console.error('Error denying worker:', error)
      toast.error("Failed to deny worker")
    }
  }

  const handleUpdateMember = async (updatedMember: TeamMember) => {
    try {
      // Update role first
      await updateMemberRole(updatedMember.id, updatedMember.role)

      // If not a customer, update teams
      if (updatedMember.role !== 'Customer') {
        await updateMemberTeams(
          updatedMember.id, 
          (updatedMember.teams || []).map(t => t.id)
        )
      } else {
        // If customer, remove from all teams
        await updateMemberTeams(updatedMember.id, [])
      }

      // Refresh member list
      const teamMembers = await getTeamMembers()
      setMembers(teamMembers)

      return Promise.resolve()
    } catch (error) {
      console.error('Error updating member:', error)
      throw error
    }
  }

  const handleCreateTeam = async (data: { name: string; focus_area: string; member_ids: string[] }) => {
    try {
      const { data: team, error } = await supabase
        .from('teams')
        .insert([
          {
            name: data.name,
            focus_area: data.focus_area
          }
        ])
        .select()
        .single()

      if (error) throw error

      if (data.member_ids.length > 0) {
        const { error: memberError } = await supabase
          .from('user_teams')
          .insert(
            data.member_ids.map(memberId => ({
              user_id: memberId,
              team_id: team.id
            }))
          )

        if (memberError) throw memberError
      }

      // Refresh teams and members
      const { data: teams } = await supabase
        .from('teams')
        .select('id, name, focus_area')
        .order('name')

      const teamMembers = await getTeamMembers()

      setAvailableTeams(teams || [])
      setMembers(teamMembers)
    } catch (error) {
      console.error('Error creating team:', error)
      throw error
    }
  }

  const handleUpdateTeam = async (
    teamId: string,
    data: { name: string; focus_area: string; member_ids: string[] }
  ) => {
    try {
      // Update team details
      const { error: teamError } = await supabase
        .from('teams')
        .update({
          name: data.name,
          focus_area: data.focus_area
        })
        .eq('id', teamId)

      if (teamError) throw teamError

      // Delete all existing team members
      const { error: deleteError } = await supabase
        .from('user_teams')
        .delete()
        .eq('team_id', teamId)

      if (deleteError) throw deleteError

      // Add new team members
      if (data.member_ids.length > 0) {
        const { error: memberError } = await supabase
          .from('user_teams')
          .insert(
            data.member_ids.map(memberId => ({
              user_id: memberId,
              team_id: teamId
            }))
          )

        if (memberError) throw memberError
      }

      // Refresh teams and members
      const { data: teams } = await supabase
        .from('teams')
        .select('id, name, focus_area')
        .order('name')

      const teamMembers = await getTeamMembers()

      setAvailableTeams(teams || [])
      setMembers(teamMembers)
    } catch (error) {
      console.error('Error updating team:', error)
      throw error
    }
  }

  const handleDeleteTeam = async (teamId: string) => {
    try {
      // Delete team (this will cascade delete user_teams entries)
      const { error } = await supabase
        .from('teams')
        .delete()
        .eq('id', teamId)

      if (error) throw error

      // Refresh teams and members
      const { data: teams } = await supabase
        .from('teams')
        .select('id, name, focus_area')
        .order('name')

      const teamMembers = await getTeamMembers()

      setAvailableTeams(teams || [])
      setMembers(teamMembers)
    } catch (error) {
      console.error('Error deleting team:', error)
      throw error
    }
  }

  return (
    <div className="min-h-screen p-8">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
          <h2 className="text-3xl font-bold">Team Members</h2>
          {isAdmin && (
            <span className="text-xs px-2 py-1 rounded-full font-medium bg-blue-100 text-blue-800">
              Admin Mode
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Toggle
            pressed={!isGridView}
            onPressedChange={(pressed) => setIsGridView(!pressed)}
            aria-label="Toggle list view"
          >
            <LayoutList className="h-4 w-4" />
          </Toggle>
          <Toggle
            pressed={isGridView}
            onPressedChange={(pressed) => setIsGridView(pressed)}
            aria-label="Toggle grid view"
          >
            <LayoutGrid className="h-4 w-4" />
          </Toggle>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center text-muted-foreground">Loading team members...</div>
      ) : (
        <>
          {isAdmin && pendingWorkers.length > 0 && (
            <div className="mb-8">
              <h3 className="text-xl font-semibold mb-4">Pending Workers</h3>
              <div className={isGridView ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-4"}>
                {pendingWorkers.map((member) => (
                  <PendingWorkerCard
                    key={member.id}
                    member={member}
                    onApprove={handleApproveWorker}
                    onDeny={handleDenyWorker}
                    isGridView={isGridView}
                  />
                ))}
              </div>
            </div>
          )}

          <div>
            {members.length === 0 ? (
              <div className="text-center text-muted-foreground">No team members found</div>
            ) : (
              <div className={isGridView ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-4"}>
                {members.map((member) => (
                  <TeamMemberCard
                    key={member.id}
                    member={member}
                    isGridView={isGridView}
                    isAdmin={isAdmin}
                    onEdit={setSelectedMember}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {selectedMember && (
        <EditMemberDialog
          member={selectedMember}
          isOpen={!!selectedMember}
          onClose={() => setSelectedMember(null)}
          onUpdate={handleUpdateMember}
          availableTeams={availableTeams}
        />
      )}

      {/* Teams Section */}
      <div className="mt-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold">Teams</h2>
          {isAdmin && (
            <Button onClick={() => setShowCreateTeam(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Team
            </Button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {availableTeams.map((team) => {
            const teamMembers = members.filter(member => 
              member.teams?.some(t => t.id === team.id)
            )
            
            return (
              <div 
                key={team.id}
                className="group bg-card rounded-lg shadow-sm border border-border p-4 space-y-3 relative"
                onClick={() => isAdmin && setSelectedTeam(team)}
                role={isAdmin ? "button" : undefined}
              >
                {isAdmin && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedTeam(team)
                    }}
                    className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Pencil className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                  </button>
                )}

                <div>
                  <h3 className="text-lg font-medium text-foreground">{team.name}</h3>
                  {team.focus_area && (
                    <p className="text-sm text-muted-foreground">{team.focus_area}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Team Members</h4>
                  {teamMembers.length > 0 ? (
                    <div className="space-y-1">
                      {teamMembers.map((member) => (
                        <div 
                          key={member.id}
                          className="text-sm flex items-center justify-between py-1"
                        >
                          <span className="text-foreground">{member.name || member.email}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                            {member.role}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No members</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Add CreateTeamDialog */}
      {isAdmin && (
        <>
          <CreateTeamDialog
            isOpen={showCreateTeam}
            onClose={() => setShowCreateTeam(false)}
            onSubmit={handleCreateTeam}
            availableMembers={members}
          />

          {selectedTeam && (
            <EditTeamDialog
              team={selectedTeam}
              isOpen={!!selectedTeam}
              onClose={() => setSelectedTeam(null)}
              onUpdate={handleUpdateTeam}
              onDelete={handleDeleteTeam}
              availableMembers={members}
              currentMembers={members.filter(member => 
                member.teams?.some(t => t.id === selectedTeam.id)
              )}
            />
          )}
        </>
      )}
    </div>
  )
} 