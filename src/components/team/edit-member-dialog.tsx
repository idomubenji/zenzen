"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import { TeamMember } from "./team-member-card"
import { toast } from "sonner"

interface Team {
  id: string
  name: string
  focus_area: string | null
}

interface EditMemberDialogProps {
  member: TeamMember
  isOpen: boolean
  onClose: () => void
  onUpdate: (member: TeamMember) => Promise<void>
  availableTeams: Team[]
}

// Available roles for editing (excluding Customer)
const ROLES = ['Administrator', 'Worker', 'PendingWorker'] as const
type EditableRole = typeof ROLES[number]

export function EditMemberDialog({
  member,
  isOpen,
  onClose,
  onUpdate,
  availableTeams = []
}: EditMemberDialogProps) {
  const [role, setRole] = useState<EditableRole>(member.role === 'Customer' ? 'Worker' : member.role as EditableRole)
  const [selectedTeams, setSelectedTeams] = useState<Team[]>(member.teams || [])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      // If the member is a Customer, we shouldn't allow editing their role
      if (member.role === 'Customer') {
        onClose()
        toast.error("Customer roles cannot be edited")
        return
      }
      setRole(member.role as EditableRole)
      setSelectedTeams(member.teams || [])
      setShowConfirmation(false)
    }
  }, [isOpen, member, onClose])

  const handleRoleChange = (newRole: EditableRole) => {
    if (
      (member.role === 'Administrator' && newRole !== 'Administrator') ||
      (member.role !== 'Administrator' && newRole === 'Administrator')
    ) {
      setRole(newRole)
      setShowConfirmation(true)
      return
    }

    setRole(newRole)
  }

  const handleTeamSelect = (teamId: string) => {
    const team = availableTeams.find(t => t.id === teamId)
    if (!team) return

    setSelectedTeams(prev => {
      const isSelected = prev.some(t => t.id === team.id)
      if (isSelected) {
        return prev.filter(t => t.id !== team.id)
      }
      return [...prev, team]
    })
  }

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true)
      await onUpdate({
        ...member,
        role,
        teams: selectedTeams
      })
      toast.success("Member updated successfully")
      onClose()
    } catch (error) {
      console.error('Error updating member:', error)
      toast.error("Failed to update member")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (showConfirmation) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Role Change</DialogTitle>
          </DialogHeader>
          <div className="py-6">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to change {member.name || member.email}&apos;s role from{' '}
              <span className="font-medium">{member.role}</span> to{' '}
              <span className="font-medium">{role}</span>?
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRole(member.role as EditableRole)
                setShowConfirmation(false)
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                setShowConfirmation(false)
              }}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Team Member</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Name</h4>
            <p className="text-sm text-muted-foreground">
              {member.name || 'No name provided'}
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-medium">Email</h4>
            <p className="text-sm text-muted-foreground">
              {member.email}
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-medium">Role</h4>
            <Select value={role} onValueChange={handleRoleChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-medium">Teams</h4>
            <Select
              value=""
              onValueChange={handleTeamSelect}
            >
              <SelectTrigger>
                <SelectValue placeholder="Add team..." />
              </SelectTrigger>
              <SelectContent>
                {availableTeams.map((team) => (
                  <SelectItem 
                    key={team.id} 
                    value={team.id}
                    disabled={selectedTeams.some(t => t.id === team.id)}
                  >
                    {team.name}
                    {team.focus_area && ` (${team.focus_area})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedTeams.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {selectedTeams.map((team) => (
                  <span
                    key={team.id}
                    className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-1 rounded-full"
                  >
                    {team.name}
                    <button
                      onClick={() => setSelectedTeams(prev => prev.filter(t => t.id !== team.id))}
                      className="hover:text-blue-900"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 