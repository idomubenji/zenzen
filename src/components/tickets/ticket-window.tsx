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

interface TicketWindowProps {
  ticket: Ticket
  isOpen: boolean
  onClose: () => void
  showMetadata?: boolean
}

export function TicketWindow({ 
  ticket, 
  isOpen, 
  onClose,
  showMetadata = false
}: TicketWindowProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (isOpen && ticket.id) {
      loadMessages()

      // Set up real-time subscription
      const channel = supabase
        .channel(`ticket-${ticket.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `ticket_id=eq.${ticket.id}`
          },
          (payload) => {
            const newMessage = payload.new as Message
            // Only add the message if it's not already in our list
            setMessages(prev => 
              prev.some(msg => msg.id === newMessage.id)
                ? prev
                : [...prev, newMessage]
            )
          }
        )
        .subscribe()

      // Cleanup subscription on unmount or when ticket changes
      return () => {
        channel.unsubscribe()
      }
    }
  }, [isOpen, ticket.id])

  const loadMessages = async () => {
    setIsLoading(true)
    const ticketMessages = await getTicketMessages(ticket.id)
    setMessages(ticketMessages)
    setIsLoading(false)
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return

    const message = await sendMessage(ticket.id, newMessage.trim())
    if (message) {
      // We don't need to manually add the message anymore
      // as it will come through the real-time subscription
      setNewMessage("")
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent 
        className={cn(
          "w-full sm:max-w-[50vw] p-0 bg-background/95 dark:bg-background/95",
          showMetadata && "grid grid-cols-[1fr_280px]"
        )}
        hideCloseButton
      >
        {/* Main chat section */}
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-border/40 flex justify-between items-center bg-background/95 dark:bg-background/95 backdrop-blur-md">
            <div className="flex flex-col">
              <h3 className="text-lg font-semibold">{ticket.title}</h3>
              <p className="text-sm text-muted-foreground">Ticket #{ticket.id.slice(0, 8)}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Messages container */}
          <div className="flex-1 p-4 overflow-y-auto">
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
                      message.user_id === ticket.customer_id
                        ? "items-start"
                        : "items-end"
                    }`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        message.user_id === ticket.customer_id
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
              />
              <Button onClick={handleSendMessage}>Send</Button>
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
                ${ticket.status === 'UNOPENED' ? 'bg-red-100 text-red-800' : ''}
                ${ticket.status === 'IN PROGRESS' ? 'bg-yellow-100 text-yellow-800' : ''}
                ${ticket.status === 'RESOLVED' ? 'bg-green-100 text-green-800' : ''}
                ${ticket.status === 'UNRESOLVED' ? 'bg-gray-100 text-gray-800' : ''}
              `}>
                {ticket.status}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2">Priority</h4>
              <div className={`
                text-xs px-2 py-1 rounded inline-block
                ${ticket.priority === 'CRITICAL' ? 'bg-red-100 text-red-800' : ''}
                ${ticket.priority === 'HIGH' ? 'bg-orange-100 text-orange-800' : ''}
                ${ticket.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' : ''}
                ${ticket.priority === 'LOW' ? 'bg-blue-100 text-blue-800' : ''}
                ${ticket.priority === 'NONE' ? 'bg-gray-100 text-gray-800' : ''}
              `}>
                {ticket.priority}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2">Customer</h4>
              <p className="text-sm text-muted-foreground">
                {ticket.customer?.name || ticket.customer?.email || 'Unknown'}
              </p>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2">Created</h4>
              <p className="text-sm text-muted-foreground">
                {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
              </p>
            </div>

            {ticket.tags && ticket.tags.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Tags</h4>
                <div className="flex flex-wrap gap-1">
                  {ticket.tags.map((tag, index) => (
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

            {ticket.custom_fields && Object.keys(ticket.custom_fields).length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Custom Fields</h4>
                <div className="space-y-2">
                  {Object.entries(ticket.custom_fields).map(([key, value]) => (
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
  )
} 