"use client"

import { useEffect, useState } from "react"
import { LayoutGrid, LayoutList } from "lucide-react"
import { Toggle } from "@/components/ui/toggle"
import { TeamMemberCard, type TeamMember } from "@/components/team/team-member-card"
import { PendingWorkerCard, type PendingWorker } from "@/components/team/pending-worker-card"
import { EditMemberDialog } from "@/components/team/edit-member-dialog"
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
    </div>
  )
} 