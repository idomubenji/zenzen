import { useEffect, useRef, useState } from "react"
import { X, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { formatDistanceToNow } from "date-fns"
import type { Ticket } from "@/lib/supabase/tickets"
import { getTicketMessages, sendMessage, type Message } from "@/lib/supabase/messages"

interface TicketWindowProps {
  ticket: Ticket
  onClose: () => void
  isOpen: boolean
}

export function TicketWindow({ ticket, onClose, isOpen }: TicketWindowProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    // Load messages when ticket is opened
    if (isOpen && ticket.id) {
      loadMessages()
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
      setMessages(prev => [...prev, message])
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
    <>
      {/* Backdrop - adjusted opacity and color for dark mode */}
      <div 
        className={`fixed inset-0 bg-black/40 dark:bg-black/70 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />
      
      {/* Ticket Window */}
      <div
        ref={containerRef}
        className={`fixed top-0 right-0 h-screen w-[50vw] bg-background/95 dark:bg-background/95 shadow-2xl dark:shadow-lg dark:shadow-black/40 transform transition-transform duration-300 ease-in-out flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ zIndex: 50 }}
      >
        {/* Header - enhanced backdrop blur */}
        <div className="p-4 border-b border-border/40 flex justify-between items-center bg-background/95 dark:bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 dark:supports-[backdrop-filter]:bg-background/60">
          <h3 className="text-lg font-semibold">Ticket #{ticket.id.slice(0, 8)}</h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Main content area */}
        <div className="flex-1 flex">
          {/* Chat area */}
          <div className="flex-1 flex flex-col">
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

            {/* Message input - enhanced backdrop blur */}
            <div className="p-4 border-t border-border/40 bg-background/95 dark:bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 dark:supports-[backdrop-filter]:bg-background/60">
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

          {/* Metadata sidebar - adjusted background for dark mode */}
          <div className="w-72 p-4 space-y-4 overflow-y-auto border-l border-border/40 bg-muted/30 dark:bg-muted/20">
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
        </div>
      </div>
    </>
  )
} 