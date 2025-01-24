"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { getTickets, type Ticket } from "@/lib/supabase/tickets"
import { formatDistanceToNow } from "date-fns"
import { TicketWindow } from "@/components/tickets/ticket-window"
import { LayoutGrid, LayoutList } from "lucide-react"
import { Toggle } from "@/components/ui/toggle"
import { cn } from "@/lib/utils"

export default function CustomerDashboard() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [isGridView, setIsGridView] = useState(true)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadTickets()
  }, [])

  const loadTickets = async () => {
    setIsLoading(true)
    try {
      const allTickets = await getTickets()
      console.log('Loaded tickets:', allTickets)
      setTickets(allTickets)
    } catch (error) {
      console.error('Failed to load tickets:', error)
      // You might want to show an error toast here
    } finally {
      setIsLoading(false)
    }
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
    <div className="container py-8">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">View:</span>
            <Toggle
              pressed={!isGridView}
              onPressedChange={(pressed) => setIsGridView(!pressed)}
              aria-label="Toggle list view"
            >
              <LayoutList className="h-4 w-4" />
            </Toggle>
            <Toggle
              pressed={isGridView}
              onPressedChange={(pressed) => setIsGridView(pressed)}
              aria-label="Toggle grid view"
            >
              <LayoutGrid className="h-4 w-4" />
            </Toggle>
          </div>
        </div>

        <div className="space-y-8">
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Open Tickets</h2>
            <div className={cn(
              isGridView 
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                : "space-y-4"
            )}>
              {isLoading ? (
                [...Array(3)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-6">
                      <div className="h-6 bg-muted rounded w-1/3 mb-4" />
                      <div className="h-4 bg-muted rounded w-1/4" />
                    </CardContent>
                  </Card>
                ))
              ) : openTickets.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">You have no open tickets.</p>
                </div>
              ) : (
                openTickets.map((ticket) => (
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
                ))
              )}
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Closed Tickets</h2>
            <div className={cn(
              isGridView 
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                : "space-y-4"
            )}>
              {isLoading ? (
                [...Array(3)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-6">
                      <div className="h-6 bg-muted rounded w-1/3 mb-4" />
                      <div className="h-4 bg-muted rounded w-1/4" />
                    </CardContent>
                  </Card>
                ))
              ) : closedTickets.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">You have no closed tickets.</p>
                </div>
              ) : (
                closedTickets.map((ticket) => (
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
                ))
              )}
            </div>
          </div>
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