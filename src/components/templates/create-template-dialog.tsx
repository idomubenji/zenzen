"use client"

import { useEffect, useState } from "react"
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
import { toast } from "sonner"
import { createTemplate, getTeamsForTemplate } from "@/lib/supabase/templates"
import { useSession } from "@/lib/hooks/use-session"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface CreateTemplateDialogProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function CreateTemplateDialog({
  isOpen,
  onClose,
  onSuccess
}: CreateTemplateDialogProps) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [teams, setTeams] = useState<{ id: string; name: string; focus_area: string | null }[]>([])
  const [selectedTeamId, setSelectedTeamId] = useState<string>('none')
  const { session } = useSession()

  useEffect(() => {
    if (isOpen) {
      const loadTeams = async () => {
        try {
          const teams = await getTeamsForTemplate()
          setTeams(teams)
        } catch (error) {
          console.error('Failed to load teams:', error)
          toast.error('Failed to load teams')
        }
      }
      loadTeams()
    }
  }, [isOpen])

  const handleSubmit = async () => {
    if (!session?.user.id) {
      toast.error('You must be logged in to create templates')
      return
    }

    if (!title.trim() || !content.trim()) {
      toast.error('Please fill in all fields')
      return
    }

    setIsSubmitting(true)
    try {
      await createTemplate(
        title.trim(), 
        content.trim(), 
        session.user.id,
        selectedTeamId === 'none' ? undefined : selectedTeamId
      )
      toast.success('Template created successfully')
      onSuccess()
      onClose()
      // Reset form
      setTitle('')
      setContent('')
      setSelectedTeamId('none')
    } catch (error) {
      console.error('Failed to create template:', error)
      toast.error('Failed to create template')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Template</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label htmlFor="title" className="text-sm font-medium">
              Title
            </label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter template title"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="content" className="text-sm font-medium">
              Content
            </label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter template content"
              rows={8}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="team" className="text-sm font-medium">
              Team
            </label>
            <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a team" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No team</SelectItem>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 