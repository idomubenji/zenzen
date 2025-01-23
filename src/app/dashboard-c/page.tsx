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
    async function loadTickets() {
      setIsLoading(true)
      const allTickets = await getTickets()
      setTickets(allTickets)
      setIsLoading(false)
    }

    loadTickets()
  }, [])

  const openTickets = tickets.filter(ticket => ticket.status !== 'RESOLVED')
  const closedTickets = tickets.filter(ticket => ticket.status === 'RESOLVED')

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
            <div className="space-y-4">
              {openTickets.map((ticket) => (
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
                          Opened {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      <div>
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
            <div className="space-y-4">
              {[...Array(2)].map((_, i) => (
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
            <div className="space-y-4">
              {closedTickets.map((ticket) => (
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
                          Resolved {formatDistanceToNow(new Date(ticket.updated_at || ticket.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs px-3 py-1.5 rounded-full font-medium bg-green-100 text-green-800">
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
        />
      )}
    </div>
  )
} 