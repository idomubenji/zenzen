"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { getTickets, type Ticket } from "@/lib/supabase/tickets"
import { formatDistanceToNow } from "date-fns"
import { TicketWindow } from "@/components/tickets/ticket-window"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { NewTicketDialog } from "@/components/tickets/new-ticket-dialog"
import { LayoutGrid, LayoutList } from "lucide-react"
import { Toggle } from "@/components/ui/toggle"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase/client"

export default function CustomerTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isNewTicketOpen, setIsNewTicketOpen] = useState(false)
  const [isGridView, setIsGridView] = useState(true)

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function setupSubscriptions() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user?.id) {
        console.error('No authenticated user found')
        return
      }

      console.log('Setting up real-time subscriptions...')
      channel = supabase
        .channel('customer-tickets')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'tickets',
            filter: `customer_id=eq.${session.user.id}`
          },
          async (payload) => {
            console.log('Ticket change detected:', payload)
            await loadTickets()
          }
        )
        .subscribe(async (status, err) => {
          console.log('Subscription status:', status)
          if (err) {
            console.error('Subscription error:', err)
          } else if (status === 'SUBSCRIBED') {
            await loadTickets()
          }
        })
    }

    loadTickets()
    setupSubscriptions()

    return () => {
      console.log('Cleaning up subscriptions...')
      if (channel) {
        channel.unsubscribe()
      }
    }
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

  const handleTicketUpdate = (updatedTicket: Ticket) => {
    setTickets(prev => prev.map(ticket => 
      ticket.id === updatedTicket.id ? updatedTicket : ticket
    ))
    setSelectedTicket(updatedTicket)
  }

  return (
    <div className="min-h-screen p-8">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">My Tickets</h1>
          <div className="flex items-center gap-4">
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
            <Button onClick={() => setIsNewTicketOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> New Ticket
            </Button>
          </div>
        </div>

        <div className={cn(
          isGridView 
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            : "space-y-4"
        )}>
          {isLoading ? (
            [...Array(5)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-6 bg-muted rounded w-1/3 mb-4" />
                  <div className="h-4 bg-muted rounded w-1/4" />
                </CardContent>
              </Card>
            ))
          ) : tickets.length === 0 ? (
            <div className="text-center py-12">
              <h3 className="text-lg font-medium text-muted-foreground">No tickets found</h3>
              <p className="text-sm text-muted-foreground mt-1">Create a new ticket to get started.</p>
            </div>
          ) : (
            tickets.map((ticket) => (
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
                          : ticket.status === 'UNRESOLVED'
                          ? `Closed (Unresolved) ${formatDistanceToNow(new Date(ticket.updated_at || ticket.created_at), { addSuffix: true })}`
                          : `Opened ${formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}`
                        }
                      </p>
                    </div>
                    <div className="mt-4">
                      <span className={`
                        text-xs px-3 py-1.5 rounded-full font-medium
                        ${ticket.status === 'UNOPENED' ? 'bg-red-100 text-red-800' : ''}
                        ${ticket.status === 'IN PROGRESS' ? 'bg-yellow-100 text-yellow-800' : ''}
                        ${ticket.status === 'RESOLVED' ? 'bg-green-100 text-green-800' : ''}
                        ${ticket.status === 'UNRESOLVED' ? 'bg-slate-100 text-slate-800' : ''}
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

      {selectedTicket && (
        <TicketWindow
          ticket={selectedTicket}
          isOpen={!!selectedTicket}
          onClose={() => setSelectedTicket(null)}
          onTicketUpdate={handleTicketUpdate}
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