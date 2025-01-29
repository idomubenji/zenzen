"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { X } from "lucide-react"
import { toast } from "sonner"
import type { TeamMember } from "./team-member-card"

interface CreateTeamDialogProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: { name: string; focus_area: string; member_ids: string[] }) => Promise<void>
  availableMembers: TeamMember[]
}

export function CreateTeamDialog({
  isOpen,
  onClose,
  onSubmit,
  availableMembers = []
}: CreateTeamDialogProps) {
  const [name, setName] = useState("")
  const [focusArea, setFocusArea] = useState("")
  const [selectedMembers, setSelectedMembers] = useState<TeamMember[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

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
      await onSubmit({
        name: name.trim(),
        focus_area: focusArea.trim(),
        member_ids: selectedMembers.map(m => m.id)
      })
      toast.success("Team created successfully")
      setName("")
      setFocusArea("")
      setSelectedMembers([])
      onClose()
    } catch (error) {
      console.error('Error creating team:', error)
      toast.error("Failed to create team")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Only show workers and administrators as available team members
  const eligibleMembers = availableMembers.filter(
    member => member.role === 'Worker' || member.role === 'Administrator'
  )

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Team</DialogTitle>
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

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create Team"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 