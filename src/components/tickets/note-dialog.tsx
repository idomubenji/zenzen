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
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"

interface NoteDialogProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (content: string) => Promise<void>
  initialContent?: string
  mode: 'add' | 'edit'
}

export function NoteDialog({
  isOpen,
  onClose,
  onSubmit,
  initialContent = '',
  mode
}: NoteDialogProps) {
  const [content, setContent] = useState(initialContent)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (isOpen) {
      setContent(initialContent)
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus()
          textareaRef.current.setSelectionRange(initialContent.length, initialContent.length)
        }
      }, 0)
    } else {
      setContent('')
    }
  }, [isOpen, initialContent])

  const handleSubmit = async () => {
    if (!content.trim()) {
      toast.error("Note content cannot be empty")
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit(content.trim())
      setContent('')
      onClose()
      toast.success(mode === 'add' ? 'Note added successfully' : 'Note updated successfully')
    } catch (error) {
      console.error('Failed to submit note:', error)
      toast.error(mode === 'add' ? 'Failed to add note' : 'Failed to update note')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === 'add' ? 'Add Note' : 'Edit Note'}</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <Textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Enter your note..."
            className="min-h-[150px] break-words whitespace-pre-wrap"
          />
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : mode === 'add' ? 'Add Note' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 