"use client"

import { useState, useEffect, useRef } from "react"
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
import type { Template } from "@/lib/supabase/templates"
import { updateTemplate, getTeamsForTemplate } from "@/lib/supabase/templates"
import { Plus, X } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface EditTemplateDialogProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  template: Template | null
}

export function EditTemplateDialog({
  isOpen,
  onClose,
  onSuccess,
  template
}: EditTemplateDialogProps) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isAddingTag, setIsAddingTag] = useState(false)
  const [newTag, setNewTag] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [teams, setTeams] = useState<{ id: string; name: string; focus_area: string | null }[]>([])
  const [selectedTeamId, setSelectedTeamId] = useState<string>('none')
  const tagInputRef = useRef<HTMLInputElement>(null)

  // Load teams when dialog opens
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

  // Update form values when template changes
  useEffect(() => {
    if (template) {
      setTitle(template.title)
      setContent(template.content)
      setTags(template.tags || [])
      setSelectedTeamId(template.team_id || 'none')
    } else {
      setTitle('')
      setContent('')
      setTags([])
      setSelectedTeamId('none')
    }
  }, [template])

  useEffect(() => {
    if (isAddingTag && tagInputRef.current) {
      tagInputRef.current.focus()
    }
  }, [isAddingTag])

  const handleAddTag = (tag: string) => {
    const trimmedTag = tag.trim()
    if (!trimmedTag) return
    if (!tags.includes(trimmedTag)) {
      setTags(prev => [...prev, trimmedTag])
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(prev => prev.filter(tag => tag !== tagToRemove))
  }

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      handleAddTag(newTag)
      setNewTag("")
      if (e.key === 'Enter') {
        setIsAddingTag(false)
      }
    } else if (e.key === 'Escape') {
      setIsAddingTag(false)
      setNewTag("")
    }
  }

  const handleSubmit = async () => {
    if (!template) return

    if (!title.trim() || !content.trim()) {
      toast.error('Please fill in all fields')
      return
    }

    setIsSubmitting(true)
    try {
      await updateTemplate(template.id, {
        title: title.trim(),
        content: content.trim(),
        tags,
        team_id: selectedTeamId === 'none' ? null : selectedTeamId
      })
      toast.success('Template updated successfully')
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Failed to update template:', error)
      toast.error('Failed to update template')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Template</DialogTitle>
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
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium">Tags</label>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2"
                onClick={() => setIsAddingTag(true)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Tag
              </Button>
            </div>
            {isAddingTag && (
              <div className="mt-2">
                <input
                  ref={tagInputRef}
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={handleTagInputKeyDown}
                  onBlur={() => {
                    if (newTag.trim()) {
                      handleAddTag(newTag)
                    }
                    setIsAddingTag(false)
                    setNewTag("")
                  }}
                  className="w-full text-xs px-2 py-1 rounded-full bg-muted border-none focus:ring-1 focus:ring-ring"
                  placeholder="Type and press enter..."
                />
              </div>
            )}
            <div className="flex flex-wrap gap-2 mt-2">
              {tags.map((tag, index) => (
                <div
                  key={index}
                  className="group relative text-xs px-4 py-1.5 rounded-full bg-blue-50 hover:bg-blue-100/80 text-blue-700 border border-blue-700/30"
                >
                  <span className="px-4">{tag}</span>
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Updating...' : 'Update Template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 