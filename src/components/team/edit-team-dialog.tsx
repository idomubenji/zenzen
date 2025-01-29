"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { X, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import type { TeamMember } from "./team-member-card"

interface Team {
  id: string
  name: string
  focus_area: string | null
}

interface EditTeamDialogProps {
  team: Team
  isOpen: boolean
  onClose: () => void
  onUpdate: (teamId: string, data: { name: string; focus_area: string; member_ids: string[] }) => Promise<void>
  onDelete: (teamId: string) => Promise<void>
  availableMembers: TeamMember[]
  currentMembers: TeamMember[]
}

export function EditTeamDialog({
  team,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
  availableMembers = [],
  currentMembers = []
}: EditTeamDialogProps) {
  const [name, setName] = useState(team.name)
  const [focusArea, setFocusArea] = useState(team.focus_area || "")
  const [selectedMembers, setSelectedMembers] = useState<TeamMember[]>(currentMembers)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)

  const handleMemberSelect = (memberId: string) => {
    const member = availableMembers.find(m => m.id === memberId)
    if (!member) return

    setSelectedMembers(prev => {
      const isSelected = prev.some(m => m.id === member.id)
      if (isSelected) {
        return prev.filter(m => m.id !== member.id)
      }
      return [...prev, member]
    })
  }

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Team name is required")
      return
    }

    setIsSubmitting(true)
    try {
      await onUpdate(team.id, {
        name: name.trim(),
        focus_area: focusArea.trim(),
        member_ids: selectedMembers.map(m => m.id)
      })
      toast.success("Team updated successfully")
      onClose()
    } catch (error) {
      console.error('Error updating team:', error)
      toast.error("Failed to update team")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    setIsSubmitting(true)
    try {
      await onDelete(team.id)
      toast.success("Team deleted successfully")
      onClose()
    } catch (error) {
      console.error('Error deleting team:', error)
      toast.error("Failed to delete team")
    } finally {
      setIsSubmitting(false)
      setShowDeleteConfirmation(false)
    }
  }

  // Only show workers and administrators as available team members
  const eligibleMembers = availableMembers.filter(
    member => member.role === 'Worker' || member.role === 'Administrator'
  )

  if (showDeleteConfirmation) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Delete Team
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-6">
            <DialogDescription className="text-base">
              Are you sure you want to delete the team "{team.name}"? This action cannot be undone.
              {selectedMembers.length > 0 && (
                <p className="mt-2 text-destructive">
                  This will remove {selectedMembers.length} member{selectedMembers.length === 1 ? '' : 's'} from the team.
                </p>
              )}
            </DialogDescription>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirmation(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Deleting..." : "Delete Team"}
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
          <DialogTitle>Edit Team</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">
              Team Name
            </label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter team name"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="focus" className="text-sm font-medium">
              Focus Area
            </label>
            <Textarea
              id="focus"
              value={focusArea}
              onChange={(e) => setFocusArea(e.target.value)}
              placeholder="Enter team's focus area"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Team Members</label>
            <Select
              value=""
              onValueChange={handleMemberSelect}
            >
              <SelectTrigger>
                <SelectValue placeholder="Add team member..." />
              </SelectTrigger>
              <SelectContent>
                {eligibleMembers.map((member) => (
                  <SelectItem 
                    key={member.id} 
                    value={member.id}
                    disabled={selectedMembers.some(m => m.id === member.id)}
                  >
                    {member.name || member.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedMembers.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {selectedMembers.map((member) => (
                  <span
                    key={member.id}
                    className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary border border-primary/20 px-2 py-1 rounded-full"
                  >
                    {member.name || member.email}
                    <button
                      onClick={() => setSelectedMembers(prev => prev.filter(m => m.id !== member.id))}
                      className="hover:text-primary/70"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-0">
          <Button
            variant="destructive"
            onClick={() => setShowDeleteConfirmation(true)}
            className="w-full sm:w-auto"
          >
            Delete Team
          </Button>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 sm:flex-none"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 sm:flex-none"
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 