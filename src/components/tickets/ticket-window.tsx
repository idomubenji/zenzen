"use client"

import { useEffect, useRef, useState } from "react"
import { X, Plus, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatDistanceToNow } from "date-fns"
import type { Ticket } from "@/lib/supabase/tickets"
import { getTicketMessages, sendMessage, type Message } from "@/lib/supabase/messages"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase/client"
import { CloseTicketDialog } from "./close-ticket-dialog"
import { FeedbackDialog } from "./feedback-dialog"
import { submitFeedback } from "@/lib/supabase/feedback"
import { toast } from "sonner"
import { getNotes, createNote, updateNote, deleteNote, type Note } from "@/lib/supabase/notes"
import { NoteDialog } from "./note-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SimpleTemplateDialog } from "@/components/templates/simple-template-dialog"
import type { Template } from "@/lib/supabase/templates"

interface TicketWindowProps {
  ticket: Ticket
  isOpen: boolean
  onClose: () => void
  showMetadata?: boolean
  onTicketUpdate?: (ticket: Ticket) => void
  isWorker?: boolean
}

export function TicketWindow({ 
  ticket, 
  isOpen, 
  onClose,
  showMetadata = false,
  onTicketUpdate,
  isWorker = false
}: TicketWindowProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isCloseDialogOpen, setIsCloseDialogOpen] = useState(false)
  const [localTicket, setLocalTicket] = useState(ticket)
  const [hasInitialized, setHasInitialized] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const [existingFeedback, setExistingFeedback] = useState<{ score: number, comment?: string } | null>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(isOpen)
  const [isAddingTag, setIsAddingTag] = useState(false)
  const [newTag, setNewTag] = useState("")
  const tagInputRef = useRef<HTMLInputElement>(null)
  const [notes, setNotes] = useState<Note[]>([])
  const [isAddingNote, setIsAddingNote] = useState(false)
  const [editingNote, setEditingNote] = useState<Note | null>(null)
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false)

  useEffect(() => {
    setLocalTicket(ticket)
  }, [ticket])

  useEffect(() => {
    if (isOpen && localTicket.id && isWorker && localTicket.status === 'UNOPENED') {
      const initializeTicket = async () => {
        try {
          const updatedTicket = await updateTicketStatus('IN PROGRESS')
          if (onTicketUpdate) {
            onTicketUpdate(updatedTicket)
          }
        } catch (error) {
          console.error('Failed to initialize ticket:', error)
        }
      }
      initializeTicket()
    }
  }, [isOpen, localTicket.id, isWorker, localTicket.status])

  useEffect(() => {
    if (isOpen && localTicket.id) {
      loadMessages()
      loadNotes()

      // Set up real-time subscription for ticket updates
      const ticketChannel = supabase
        .channel(`ticket-${localTicket.id}-updates`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'tickets',
            filter: `id=eq.${localTicket.id}`
          },
          async (payload) => {
            console.log('Ticket update received:', payload)
            // Fetch the complete ticket data with customer info
            const { data: updatedTicket } = await supabase
              .from('tickets')
              .select(`
                *,
                customer:users!tickets_customer_id_fkey(name, email),
                feedback(id, score, comment, created_at)
              `)
              .eq('id', localTicket.id)
              .single()

            if (updatedTicket) {
              const ticketWithFeedback: Ticket = {
                id: updatedTicket.id,
                customer_id: updatedTicket.customer_id as string,
                title: updatedTicket.title,
                status: updatedTicket.status as Ticket['status'],
                priority: updatedTicket.priority as Ticket['priority'],
                created_at: updatedTicket.created_at,
                updated_at: updatedTicket.updated_at,
                first_response_at: updatedTicket.first_response_at,
                resolved_at: updatedTicket.resolved_at,
                reopen_count: updatedTicket.reopen_count || 0,
                assigned_to: updatedTicket.assigned_to,
                assigned_team: updatedTicket.assigned_team,
                tags: updatedTicket.tags || [],
                custom_fields: updatedTicket.custom_fields as Record<string, any> || {},
                customer: updatedTicket.customer || undefined,
                feedback: updatedTicket.feedback?.[0] ? {
                  ...updatedTicket.feedback[0],
                  score: updatedTicket.feedback[0].score as number
                } : null
              }
              setLocalTicket(ticketWithFeedback)
              if (onTicketUpdate) {
                onTicketUpdate(ticketWithFeedback)
              }
            }
          }
        )
        .subscribe((status) => {
          console.log(`Ticket updates channel status for ticket ${localTicket.id}:`, status)
        })

      // Set up real-time subscription for messages
      const channel = supabase
        .channel(`ticket-${localTicket.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `ticket_id=eq.${localTicket.id}`
          },
          async (payload) => {
            // Fetch the complete message with user information
            const { data: messageWithUser } = await supabase
              .from('messages')
              .select(`
                *,
                user:users(name, email)
              `)
              .eq('id', payload.new.id)
              .single()

            if (messageWithUser) {
              setMessages(prev => 
                prev.some(msg => msg.id === messageWithUser.id)
                  ? prev
                  : [...prev, messageWithUser]
              )
            }
          }
        )
        .subscribe()

      // Set up real-time subscription for notes with explicit event handling
      const notesChannel = supabase
        .channel(`ticket-${localTicket.id}-notes`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notes',
            filter: `ticket_id=eq.${localTicket.id}`
          },
          async (payload) => {
            console.log('Note INSERT:', payload)
            // Fetch complete note data with creator info
            const { data: noteWithCreator } = await supabase
              .from('notes')
              .select(`
                *,
                creator:created_by (
                  id,
                  name,
                  email
                )
              `)
              .eq('id', payload.new.id)
              .single()

            if (noteWithCreator) {
              setNotes(prev => [...prev, noteWithCreator])
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'notes',
            filter: `ticket_id=eq.${localTicket.id}`
          },
          async (payload) => {
            console.log('Note UPDATE:', payload)
            // Fetch complete note data with creator info
            const { data: noteWithCreator } = await supabase
              .from('notes')
              .select(`
                *,
                creator:created_by (
                  id,
                  name,
                  email
                )
              `)
              .eq('id', payload.new.id)
              .single()

            if (noteWithCreator) {
              setNotes(prev => prev.map(note => 
                note.id === noteWithCreator.id ? noteWithCreator : note
              ))
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'notes',
            filter: `ticket_id=eq.${localTicket.id}`
          },
          (payload) => {
            console.log('Note DELETE received:', payload)
            if (payload.old?.id) {
              console.log('Deleting note with ID:', payload.old.id)
              setNotes(prev => {
                console.log('Current notes:', prev.map(n => n.id))
                const filtered = prev.filter(note => note.id !== payload.old.id)
                console.log('Filtered notes:', filtered.map(n => n.id))
                return filtered
              })
            }
          }
        )
        .subscribe((status) => {
          console.log(`Notes channel status for ticket ${localTicket.id}:`, status)
        })

      return () => {
        console.log('Cleaning up subscriptions...')
        channel.unsubscribe()
        notesChannel.unsubscribe()
        ticketChannel.unsubscribe()
      }
    }
  }, [isOpen, localTicket.id])

  useEffect(() => {
    if (isOpen && localTicket.id && !isWorker) {
      // Fetch existing feedback
      const fetchFeedback = async () => {
        const { data, error } = await supabase
          .from('feedback')
          .select('score, comment')
          .eq('ticket_id', localTicket.id)
          .single()
        
        if (!error && data && typeof data.score === 'number') {
          setExistingFeedback({
            score: data.score,
            comment: data.comment || undefined
          })
        }
      }
      
      fetchFeedback()
    }
  }, [isOpen, localTicket.id, isWorker])

  useEffect(() => {
    setIsSheetOpen(isOpen)
  }, [isOpen])

  const handleSheetOpenChange = (open: boolean) => {
    if (!open) {
      setIsSheetOpen(false)
      // Wait for animation to complete before calling onClose
      setTimeout(onClose, 500)
    } else {
      setIsSheetOpen(true)
    }
  }

  const loadMessages = async () => {
    setIsLoading(true)
    const ticketMessages = await getTicketMessages(localTicket.id)
    setMessages(ticketMessages)
    setIsLoading(false)
  }

  const loadNotes = async () => {
    try {
      const ticketNotes = await getNotes(localTicket.id)
      console.log('Loaded notes:', ticketNotes)
      setNotes(ticketNotes)
    } catch (error) {
      console.error('Failed to load notes:', error)
      toast.error('Failed to load notes')
    }
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return

    const message = await sendMessage(localTicket.id, newMessage.trim())
    if (message) {
      setNewMessage("")
      // Reset textarea height to initial state
      const textarea = document.querySelector('textarea')
      if (textarea) {
        textarea.style.height = '40px'
      }
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const updateTicketStatus = async (status: Ticket['status']) => {
    try {
      const { data, error } = await supabase
        .from('tickets')
        .update({ status })
        .eq('id', localTicket.id)
        .select('*, customer:users!tickets_customer_id_fkey(name, email)')
        .single()

      if (error) throw error

      const updatedTicket = data as Ticket
      setLocalTicket(updatedTicket)
      return updatedTicket
    } catch (error) {
      console.error('Error updating ticket:', error)
      throw error
    }
  }

  const updateTicketPriority = async (priority: Ticket['priority']) => {
    try {
      const { data, error } = await supabase
        .from('tickets')
        .update({ priority })
        .eq('id', localTicket.id)
        .select('*, customer:users!tickets_customer_id_fkey(name, email)')
        .single()

      if (error) throw error

      const updatedTicket = data as Ticket
      setLocalTicket(updatedTicket)
      if (onTicketUpdate) {
        onTicketUpdate(updatedTicket)
      }
      return updatedTicket
    } catch (error) {
      console.error('Error updating ticket priority:', error)
      throw error
    }
  }

  const handlePriorityChange = async (newPriority: Ticket['priority']) => {
    try {
      await updateTicketPriority(newPriority)
      toast.success(`Priority updated to ${newPriority}`)
    } catch (error) {
      toast.error("Failed to update priority. Please try again.")
    }
  }

  const handleCloseTicket = async (wasResolved: boolean) => {
    setIsClosing(true)
    try {
      const newStatus = wasResolved ? 'RESOLVED' : 'UNRESOLVED'
      console.log('Attempting to close ticket:', { id: localTicket.id, newStatus })
      
      const updatedTicket = await updateTicketStatus(newStatus)
      
      if (onTicketUpdate) {
        onTicketUpdate(updatedTicket)
      }
      
      setIsCloseDialogOpen(false)
      
      // Show feedback dialog only for customers after closing their ticket
      if (!isWorker) {
        console.log('Showing feedback dialog for customer')
        setShowFeedback(true)
      } else {
        onClose()
      }
    } catch (error) {
      console.error('Failed to close ticket:', error)
      toast.error("Failed to close ticket. Please try again.")
    } finally {
      setIsClosing(false)
    }
  }

  const handleReopenTicket = async () => {
    try {
      console.log('Attempting to reopen ticket:', { id: localTicket.id })
      const updatedTicket = await updateTicketStatus('IN PROGRESS')
      console.log('Ticket reopened successfully:', updatedTicket)
      
      setLocalTicket(updatedTicket)
      if (onTicketUpdate) {
        onTicketUpdate(updatedTicket)
      }
    } catch (error) {
      console.error('Failed to reopen ticket:', error)
      toast.error("Failed to reopen ticket. Please try again.")
    }
  }

  const handleFeedbackSubmit = async (score: number, comment?: string) => {
    try {
      console.log('Submitting feedback:', { ticketId: localTicket.id, score, comment })
      const feedback = await submitFeedback(localTicket.id, score, comment)
      
      // Fetch updated ticket data with feedback
      const { data: updatedTicket, error } = await supabase
        .from('tickets')
        .select(`
          *,
          customer:users!tickets_customer_id_fkey(name, email),
          feedback(id, score, comment, created_at)
        `)
        .eq('id', localTicket.id)
        .single()

      if (error) throw error

      // Transform the feedback array to a single object and ensure types match Ticket interface
      const ticketWithFeedback: Ticket = {
        id: updatedTicket.id,
        customer_id: updatedTicket.customer_id as string,
        title: updatedTicket.title,
        status: updatedTicket.status as Ticket['status'],
        priority: updatedTicket.priority as Ticket['priority'],
        created_at: updatedTicket.created_at,
        updated_at: updatedTicket.updated_at,
        first_response_at: updatedTicket.first_response_at,
        resolved_at: updatedTicket.resolved_at,
        reopen_count: updatedTicket.reopen_count || 0,
        assigned_to: updatedTicket.assigned_to,
        assigned_team: updatedTicket.assigned_team,
        tags: updatedTicket.tags || [],
        custom_fields: updatedTicket.custom_fields as Record<string, any> || {},
        customer: updatedTicket.customer || undefined,
        feedback: updatedTicket.feedback?.[0] ? {
          ...updatedTicket.feedback[0],
          score: updatedTicket.feedback[0].score as number
        } : null
      }

      // Update the local ticket state and notify parent
      setLocalTicket(ticketWithFeedback)
      if (onTicketUpdate) {
        onTicketUpdate(ticketWithFeedback)
      }

      toast.success("Thank you for your feedback!")
      onClose()
    } catch (error) {
      console.error('Failed to submit feedback:', error)
      toast.error("Failed to submit feedback. Please try again.")
    }
  }

  const updateTicketTags = async (tags: string[]) => {
    try {
      const { data, error } = await supabase
        .from('tickets')
        .update({ tags })
        .eq('id', localTicket.id)
        .select('*, customer:users!tickets_customer_id_fkey(name, email)')
        .single()

      if (error) throw error

      const updatedTicket = data as Ticket
      setLocalTicket(updatedTicket)
      if (onTicketUpdate) {
        onTicketUpdate(updatedTicket)
      }
      return updatedTicket
    } catch (error) {
      console.error('Error updating ticket tags:', error)
      throw error
    }
  }

  const handleAddTag = async (tag: string) => {
    const trimmedTag = tag.trim()
    if (!trimmedTag) return

    try {
      const newTags = [...(localTicket.tags || []), trimmedTag]
      await updateTicketTags(newTags)
      toast.success(`Tag "${trimmedTag}" added`)
    } catch (error) {
      toast.error("Failed to add tag. Please try again.")
    }
  }

  const handleRemoveTag = async (tagToRemove: string) => {
    try {
      const newTags = (localTicket.tags || []).filter(tag => tag !== tagToRemove)
      await updateTicketTags(newTags)
      toast.success(`Tag "${tagToRemove}" removed`)
    } catch (error) {
      toast.error("Failed to remove tag. Please try again.")
    }
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

  useEffect(() => {
    if (isAddingTag && tagInputRef.current) {
      tagInputRef.current.focus()
    }
  }, [isAddingTag])

  const isClosed = localTicket.status === 'RESOLVED' || localTicket.status === 'UNRESOLVED'
  const canClose = localTicket.status !== 'UNOPENED'

  const scrollToBottom = () => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleAddNote = async (content: string) => {
    try {
      await createNote(localTicket.id, content)
      // Real-time subscription will update the notes
    } catch (error) {
      console.error('Failed to add note:', error)
      throw error
    }
  }

  const handleUpdateNote = async (content: string) => {
    if (!editingNote) return
    try {
      await updateNote(editingNote.id, content)
      setEditingNote(null)
      // Real-time subscription will update the notes
    } catch (error) {
      console.error('Failed to update note:', error)
      throw error
    }
  }

  const handleDeleteNote = async (noteId: string) => {
    try {
      await deleteNote(noteId)
      // Update state immediately instead of waiting for subscription
      setNotes(prevNotes => prevNotes.filter(note => note.id !== noteId))
      toast.success('Note deleted successfully')
    } catch (error) {
      console.error('Failed to delete note:', error)
      toast.error('Failed to delete note')
    }
  }

  const adjustTextareaHeight = (textarea: HTMLTextAreaElement) => {
    textarea.style.height = 'auto'
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px'
  }

  const handleTemplateSelect = (template: Template) => {
    setNewMessage(prev => prev + template.content)
    // Find and adjust textarea after state update
    setTimeout(() => {
      const textarea = document.querySelector('textarea')
      if (textarea) {
        adjustTextareaHeight(textarea)
      }
    }, 0)
  }

  // Adjust height whenever newMessage changes (typing, pasting, template)
  useEffect(() => {
    const textarea = document.querySelector('textarea')
    if (textarea) {
      adjustTextareaHeight(textarea)
    }
  }, [newMessage])

  return (
    <>
      <Sheet open={isSheetOpen} onOpenChange={handleSheetOpenChange}>
        <SheetContent 
          side="right"
          hasCloseButton={false}
          className={cn(
            "w-full sm:max-w-[50vw] p-0 bg-background/95 dark:bg-background/95",
            showMetadata && "grid grid-cols-[1fr_280px]"
          )}
        >
          {/* Main chat section */}
          <div className="flex flex-col h-[100dvh]">
            {/* Header */}
            <div className="shrink-0 p-4 border-b border-border/40 flex justify-between items-center bg-background/95 dark:bg-background/95 backdrop-blur-md">
              <div className="flex flex-col">
                <h3 className="text-lg font-semibold">{localTicket.title}</h3>
                <p className="text-sm text-muted-foreground">Ticket #{localTicket.id.slice(0, 8)}</p>
              </div>
              <div className="flex items-center gap-2">
                {canClose && (
                  <Button
                    variant={isClosed && !isWorker ? "outline" : "outline"}
                    onClick={isClosed 
                      ? (isWorker ? handleReopenTicket : () => setShowFeedback(true))
                      : () => setIsCloseDialogOpen(true)
                    }
                    className={cn(
                      // Only apply special styling when it's the "Leave Feedback" button
                      isClosed && !isWorker && !existingFeedback && !isClosing
                        ? "relative group overflow-hidden bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white hover:text-white border-0 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-purple-500/25 after:absolute after:inset-0 after:bg-gradient-to-r after:from-transparent after:via-white/25 after:to-transparent after:-translate-x-full hover:after:translate-x-full after:transition-transform after:duration-500"
                        : ""
                    )}
                  >
                    <span className={cn(
                      "relative z-10",
                      // Only add flex styling for the feedback button
                      isClosed && !isWorker && !existingFeedback && !isClosing ? "flex items-center gap-2" : ""
                    )}>
                      {isClosed 
                        ? (isWorker ? 'Reopen Ticket' : existingFeedback ? 'Change Feedback' : (
                          <>
                            <span className="animate-bounce">✨</span>
                            Leave Feedback
                            <span className="animate-bounce delay-100">✨</span>
                          </>
                        ))
                        : 'Close Ticket'
                      }
                    </span>
                  </Button>
                )}
                <Button variant="ghost" size="icon" onClick={() => handleSheetOpenChange(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Messages container */}
            <div 
              ref={containerRef}
              className={cn(
                "flex-1 p-4 overflow-y-auto min-h-0",
                isClosed && "opacity-40"
              )}
            >
              <div className="space-y-4">
                {isLoading ? (
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="text-sm">Loading messages...</p>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="text-sm">No messages yet</p>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex flex-col ${
                        message.user_id === localTicket.customer_id
                          ? "items-start"
                          : "items-end"
                      }`}
                    >
                      <div className="mb-1 text-sm">
                        <span className="font-medium">
                          {message.user?.name || message.user?.email}
                        </span>
                      </div>
                      <div
                        className={`max-w-[80%] rounded-lg p-3 ${
                          message.user_id === localTicket.customer_id
                            ? "bg-muted"
                            : "bg-primary text-primary-foreground"
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Message input */}
            <div className="shrink-0 p-4 border-t border-border/40 bg-background/95 dark:bg-background/95">
              <div className="flex gap-2">
                <textarea
                  placeholder="Type a message... (Shift+Enter for new line)"
                  className="flex-1 rounded-md border border-border/40 bg-background/95 dark:bg-background/95 p-2 resize-none min-h-[40px] max-h-[120px] overflow-y-auto"
                  value={newMessage}
                  onChange={(e) => {
                    e.target.style.height = 'auto'
                    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
                    setNewMessage(e.target.value)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSendMessage()
                    }
                  }}
                  disabled={isClosed}
                  rows={1}
                />
                <Button onClick={handleSendMessage} disabled={isClosed}>Send</Button>
              </div>
            </div>
          </div>

          {/* Metadata sidebar */}
          {showMetadata && (
            <div className="border-l border-border/40 bg-muted/30 dark:bg-muted/20 flex flex-col h-[100dvh]">
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Status</h4>
                  <div className={`
                    text-xs px-2 py-1 rounded inline-block
                    ${localTicket.status === 'UNOPENED' ? 'bg-red-100 text-red-800' : ''}
                    ${localTicket.status === 'IN PROGRESS' ? 'bg-yellow-100 text-yellow-800' : ''}
                    ${localTicket.status === 'RESOLVED' ? 'bg-green-100 text-green-800' : ''}
                    ${localTicket.status === 'UNRESOLVED' ? 'bg-slate-100 text-slate-800' : ''}
                  `}>
                    {localTicket.status}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-2">Customer</h4>
                  <p className="text-sm text-muted-foreground">
                    {localTicket.customer?.name || localTicket.customer?.email || 'Unknown'}
                  </p>
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-2">Created</h4>
                  <p className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(localTicket.created_at), { addSuffix: true })}
                  </p>
                </div>

                {/* Templates section */}
                {isWorker && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Templates</h4>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => setIsTemplateDialogOpen(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Template
                    </Button>
                  </div>
                )}

                {isWorker && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Priority</h4>
                    <Select
                      value={localTicket.priority}
                      onValueChange={handlePriorityChange}
                    >
                      <SelectTrigger className={cn(
                        "w-[140px]",
                        localTicket.priority === 'CRITICAL' && "text-red-800 bg-red-100",
                        localTicket.priority === 'HIGH' && "text-orange-800 bg-orange-100",
                        localTicket.priority === 'MEDIUM' && "text-yellow-800 bg-yellow-100",
                        localTicket.priority === 'LOW' && "text-blue-800 bg-blue-100",
                        localTicket.priority === 'NONE' && "text-gray-800 bg-gray-100"
                      )}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CRITICAL">Critical</SelectItem>
                        <SelectItem value="HIGH">High</SelectItem>
                        <SelectItem value="MEDIUM">Medium</SelectItem>
                        <SelectItem value="LOW">Low</SelectItem>
                        <SelectItem value="NONE">None</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Tags section */}
                <div>
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-medium">Tags</h4>
                    {isWorker && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2"
                        onClick={() => setIsAddingTag(true)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Tag
                      </Button>
                    )}
                  </div>
                  {isAddingTag && isWorker && (
                    <div className="mt-2 mb-3">
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
                  <div className="flex flex-wrap gap-2">
                    {localTicket.tags && localTicket.tags.map((tag, index) => (
                      <div
                        key={index}
                        className="group relative text-xs px-4 py-1.5 rounded-full bg-blue-50 hover:bg-blue-100/80 text-blue-700 border border-blue-700/30"
                      >
                        <span className="px-4">{tag}</span>
                        {isWorker && (
                          <button
                            onClick={() => handleRemoveTag(tag)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Notes section */}
                {isWorker && (
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-sm font-medium">Notes</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2"
                        onClick={() => setIsAddingNote(true)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Note
                      </Button>
                    </div>
                    <div className="space-y-3">
                      {notes.map(note => (
                        <div key={note.id} className="space-y-1.5">
                          <div
                            className="group relative border border-border/50 rounded-md p-3 bg-background/50 overflow-hidden"
                            style={{ height: '140px' }}
                          >
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1 z-10">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => setEditingNote(note)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 hover:text-destructive"
                                onClick={() => handleDeleteNote(note.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                            <div 
                              className="h-full overflow-y-auto cursor-pointer pr-10 break-words"
                              onClick={() => setEditingNote(note)}
                            >
                              <p className="text-sm whitespace-pre-wrap break-words">{note.content}</p>
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground px-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium">{note.creator?.name || note.creator?.email || 'Unknown'}</span>
                              <span className="text-muted-foreground/60">·</span>
                              <span className="text-muted-foreground/75">{formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Custom Fields section - anchored to bottom */}
                {localTicket.custom_fields && Object.keys(localTicket.custom_fields).length > 0 && (
                  <div className="shrink-0 border-t border-border/40 bg-muted/30 dark:bg-muted/20 p-4">
                    <h4 className="text-sm font-medium mb-2">Custom Fields</h4>
                    <div className="space-y-2">
                      {Object.entries(localTicket.custom_fields).map(([key, value]) => (
                        <div key={key}>
                          <span className="text-xs text-muted-foreground">{key}</span>
                          <p className="text-sm">{String(value)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <CloseTicketDialog
        isOpen={isCloseDialogOpen}
        onClose={() => setIsCloseDialogOpen(false)}
        onResolve={handleCloseTicket}
      />

      <FeedbackDialog
        isOpen={showFeedback}
        onClose={() => {
          setShowFeedback(false)
          onClose()
        }}
        onSubmit={handleFeedbackSubmit}
        existingFeedback={existingFeedback}
      />

      <NoteDialog
        isOpen={isAddingNote}
        onClose={() => setIsAddingNote(false)}
        onSubmit={handleAddNote}
        mode="add"
      />

      <NoteDialog
        isOpen={!!editingNote}
        onClose={() => setEditingNote(null)}
        onSubmit={handleUpdateNote}
        initialContent={editingNote?.content}
        mode="edit"
      />

      <SimpleTemplateDialog
        isOpen={isTemplateDialogOpen}
        onClose={() => setIsTemplateDialogOpen(false)}
        onSelect={(template) => {
          handleTemplateSelect(template)
          setIsTemplateDialogOpen(false)
        }}
      />
    </>
  )
} 