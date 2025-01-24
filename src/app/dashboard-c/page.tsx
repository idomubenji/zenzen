"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { getTickets, type Ticket } from "@/lib/supabase/tickets"
import { formatDistanceToNow } from "date-fns"
import { TicketWindow } from "@/components/tickets/ticket-window"

export default function CustomerDashboard() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadTickets()
  }, [])

  async function loadTickets() {
    setIsLoading(true)
    const allTickets = await getTickets()
    setTickets(allTickets)
    setIsLoading(false)
  }

  const handleTicketUpdate = (updatedTicket: Ticket) => {
    setTickets(prev => prev.map(ticket => 
      ticket.id === updatedTicket.id ? updatedTicket : ticket
    ))
    setSelectedTicket(updatedTicket)
  }

  const openTickets = tickets.filter(ticket => 
    !['RESOLVED', 'UNRESOLVED'].includes(ticket.status)
  )
  const closedTickets = tickets.filter(ticket => 
    ['RESOLVED', 'UNRESOLVED'].includes(ticket.status)
  )

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-3xl font-bold mb-8">Welcome Back</h1>

      <div className="space-y-8">
        {/* Open Tickets Section */}
        <div>
          <h2 className="text-2xl font-semibold mb-4">Open Tickets</h2>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-6 bg-muted rounded w-1/3 mb-4" />
                    <div className="h-4 bg-muted rounded w-1/4" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : openTickets.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">You have no open tickets.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {openTickets.map((ticket) => (
                <Card 
                  key={ticket.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setSelectedTicket(ticket)}
                >
                  <CardContent className="p-6">
                    <div className="flex flex-col h-full">
                      <div className="flex-1">
                        <h4 className="font-medium text-lg">{ticket.title}</h4>
                        <p className="text-sm text-muted-foreground mt-2">
                          Opened {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      <div className="mt-4">
                        <span className={`
                          text-xs px-3 py-1.5 rounded-full font-medium
                          ${ticket.status === 'UNOPENED' ? 'bg-red-100 text-red-800' : ''}
                          ${ticket.status === 'IN PROGRESS' ? 'bg-yellow-100 text-yellow-800' : ''}
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
        </div>

        {/* Closed Tickets Section */}
        <div>
          <h2 className="text-2xl font-semibold mb-4">Closed Tickets</h2>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-6 bg-muted rounded w-1/3 mb-4" />
                    <div className="h-4 bg-muted rounded w-1/4" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : closedTickets.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">You have no closed tickets.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {closedTickets.map((ticket) => (
                <Card 
                  key={ticket.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setSelectedTicket(ticket)}
                >
                  <CardContent className="p-6">
                    <div className="flex flex-col h-full">
                      <div className="flex-1">
                        <h4 className="font-medium text-lg">{ticket.title}</h4>
                        <p className="text-sm text-muted-foreground mt-2">
                          {ticket.status === 'RESOLVED' 
                            ? `Resolved ${formatDistanceToNow(new Date(ticket.updated_at || ticket.created_at), { addSuffix: true })}`
                            : `Closed (Unresolved) ${formatDistanceToNow(new Date(ticket.updated_at || ticket.created_at), { addSuffix: true })}`
                          }
                        </p>
                      </div>
                      <div className="mt-4">
                        <span className={`
                          text-xs px-3 py-1.5 rounded-full font-medium
                          ${ticket.status === 'RESOLVED' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-800'}
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
        </div>
      </div>

      {selectedTicket && (
        <TicketWindow
          ticket={selectedTicket}
          isOpen={!!selectedTicket}
          onClose={() => setSelectedTicket(null)}
          onTicketUpdate={handleTicketUpdate}
        />
      )}
    </div>
  )
} 