"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { getTickets, type Ticket } from "@/lib/supabase/tickets"
import { formatDistanceToNow } from "date-fns"
import { TicketWindow } from "@/components/tickets/ticket-window"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { NewTicketDialog } from "@/components/tickets/new-ticket-dialog"

export default function CustomerTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isNewTicketOpen, setIsNewTicketOpen] = useState(false)

  useEffect(() => {
    loadTickets()
  }, [])

  async function loadTickets() {
    setIsLoading(true)
    const allTickets = await getTickets()
    setTickets(allTickets)
    setIsLoading(false)
  }

  const handleTicketCreated = async (ticketId: string) => {
    await loadTickets()
    const newTicket = tickets.find(t => t.id === ticketId)
    if (newTicket) {
      setSelectedTicket(newTicket)
    }
  }

  return (
    <div className="min-h-screen p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">My Tickets</h1>
        <Button onClick={() => setIsNewTicketOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> New Ticket
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-6 bg-muted rounded w-1/3 mb-4" />
                <div className="h-4 bg-muted rounded w-1/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : tickets.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-muted-foreground">No tickets found</h3>
          <p className="text-sm text-muted-foreground mt-1">Create a new ticket to get started.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {tickets.map((ticket) => (
            <Card 
              key={ticket.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setSelectedTicket(ticket)}
            >
              <CardContent className="p-6">
                <div className="flex justify-between items-center">
                  <div className="flex-1">
                    <h4 className="font-medium text-lg">{ticket.title}</h4>
                    <p className="text-sm text-muted-foreground mt-2">
                      {ticket.status === 'RESOLVED' 
                        ? `Resolved ${formatDistanceToNow(new Date(ticket.updated_at || ticket.created_at), { addSuffix: true })}`
                        : `Opened ${formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}`
                      }
                    </p>
                  </div>
                  <div>
                    <span className={`
                      text-xs px-3 py-1.5 rounded-full font-medium
                      ${ticket.status === 'UNOPENED' ? 'bg-red-100 text-red-800' : ''}
                      ${ticket.status === 'IN PROGRESS' ? 'bg-yellow-100 text-yellow-800' : ''}
                      ${ticket.status === 'RESOLVED' ? 'bg-green-100 text-green-800' : ''}
                      ${ticket.status === 'UNRESOLVED' ? 'bg-gray-100 text-gray-800' : ''}
                    `}>
                      {ticket.status}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedTicket && (
        <TicketWindow
          ticket={selectedTicket}
          isOpen={!!selectedTicket}
          onClose={() => setSelectedTicket(null)}
        />
      )}

      <NewTicketDialog
        isOpen={isNewTicketOpen}
        onClose={() => setIsNewTicketOpen(false)}
        onTicketCreated={handleTicketCreated}
      />
    </div>
  )
} 