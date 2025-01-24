"use client"

import { useEffect, useRef, useState } from "react"
import { X } from "lucide-react"
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

      // Set up real-time subscription
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
          (payload) => {
            const newMessage = payload.new as Message
            setMessages(prev => 
              prev.some(msg => msg.id === newMessage.id)
                ? prev
                : [...prev, newMessage]
            )
          }
        )
        .subscribe()

      return () => {
        channel.unsubscribe()
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

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return

    const message = await sendMessage(localTicket.id, newMessage.trim())
    if (message) {
      setNewMessage("")
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

  const isClosed = localTicket.status === 'RESOLVED' || localTicket.status === 'UNRESOLVED'
  const canClose = localTicket.status !== 'UNOPENED'

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
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b border-border/40 flex justify-between items-center bg-background/95 dark:bg-background/95 backdrop-blur-md">
              <div className="flex flex-col">
                <h3 className="text-lg font-semibold">{localTicket.title}</h3>
                <p className="text-sm text-muted-foreground">Ticket #{localTicket.id.slice(0, 8)}</p>
              </div>
              <div className="flex items-center gap-2">
                {canClose && (
                  <Button
                    variant="outline"
                    onClick={isClosed 
                      ? (isWorker ? handleReopenTicket : () => setShowFeedback(true))
                      : () => setIsCloseDialogOpen(true)
                    }
                  >
                    {isClosed 
                      ? (isWorker ? 'Reopen Ticket' : existingFeedback ? 'Change Feedback' : 'Leave Feedback')
                      : 'Close Ticket'
                    }
                  </Button>
                )}
                <Button variant="ghost" size="icon" onClick={() => handleSheetOpenChange(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Messages container */}
            <div className={cn(
              "flex-1 p-4 overflow-y-auto",
              isClosed && "opacity-40"
            )}>
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
                      <div
                        className={`max-w-[80%] rounded-lg p-3 ${
                          message.user_id === localTicket.customer_id
                            ? "bg-muted"
                            : "bg-primary text-primary-foreground"
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {message.user?.name || message.user?.email}{" "}
                        • {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Message input */}
            <div className="p-4 border-t border-border/40 bg-background/95 dark:bg-background/95">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Type a message..."
                  className="flex-1 rounded-md border border-border/40 bg-background/95 dark:bg-background/95 p-2"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyPress}
                  disabled={isClosed}
                />
                <Button onClick={handleSendMessage} disabled={isClosed}>Send</Button>
              </div>
            </div>
          </div>

          {/* Metadata sidebar */}
          {showMetadata && (
            <div className="border-l border-border/40 bg-muted/30 dark:bg-muted/20 p-4 space-y-4 overflow-y-auto">
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
                <h4 className="text-sm font-medium mb-2">Priority</h4>
                <div className={`
                  text-xs px-2 py-1 rounded inline-block
                  ${localTicket.priority === 'CRITICAL' ? 'bg-red-100 text-red-800' : ''}
                  ${localTicket.priority === 'HIGH' ? 'bg-orange-100 text-orange-800' : ''}
                  ${localTicket.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' : ''}
                  ${localTicket.priority === 'LOW' ? 'bg-blue-100 text-blue-800' : ''}
                  ${localTicket.priority === 'NONE' ? 'bg-gray-100 text-gray-800' : ''}
                `}>
                  {localTicket.priority}
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

              {localTicket.tags && localTicket.tags.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Tags</h4>
                  <div className="flex flex-wrap gap-1">
                    {localTicket.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="text-xs px-2 py-1 rounded bg-muted"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {localTicket.custom_fields && Object.keys(localTicket.custom_fields).length > 0 && (
                <div>
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
    </>
  )
} 