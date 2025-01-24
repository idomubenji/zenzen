"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Clock, 
  MessageSquare, 
  CheckCircle2, 
  AlertCircle,
  LayoutGrid,
  LayoutList
} from "lucide-react"
import { getTickets, getTicketCount, type Ticket } from "@/lib/supabase/tickets"
import { formatDistanceToNow } from "date-fns"
import { TicketWindow } from "@/components/tickets/ticket-window"
import { Toggle } from "@/components/ui/toggle"
import { supabase } from "@/lib/supabase/client"
import { TicketCard } from "@/components/tickets/ticket-card"

export default function DashboardPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [counts, setCounts] = useState({
    open: 0,
    pending: 0,
    urgent: 0
  })
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [isGridView, setIsGridView] = useState(true)

  useEffect(() => {
    async function loadData() {
      // Get all tickets for the recent tickets list
      const allTickets = await getTickets()
      setTickets(allTickets)

      // Get counts for different statuses
      const inProgressCount = await getTicketCount('IN PROGRESS')
      const unopenedCount = await getTicketCount('UNOPENED')
      
      // Count urgent tickets (HIGH or CRITICAL priority that are UNOPENED or IN PROGRESS)
      const urgentTickets = allTickets.filter(
        ticket => (ticket.priority === 'HIGH' || ticket.priority === 'CRITICAL') &&
                 (ticket.status === 'UNOPENED' || ticket.status === 'IN PROGRESS')
      ).length

      setCounts({
        open: inProgressCount,
        pending: unopenedCount,
        urgent: urgentTickets
      })
    }

    loadData()
    
    const setupSubscriptions = async () => {
      console.log('Setting up real-time subscriptions for worker dashboard...')
      
      const channel = supabase
        .channel('worker-dashboard')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'tickets'
          },
          (payload) => {
            console.log('Received ticket update:', payload)
            loadData()
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'feedback'
          },
          (payload) => {
            console.log('Received feedback update:', payload)
            loadData()
          }
        )
        .subscribe((status) => {
          console.log('Subscription status:', status)
          if (status === 'SUBSCRIBED') {
            loadData()
          }
        })

      return () => {
        console.log('Cleaning up subscriptions...')
        if (channel) {
          channel.unsubscribe()
        }
      }
    }

    const cleanup = setupSubscriptions()
    return () => {
      cleanup.then(cleanupFn => cleanupFn())
    }
  }, [])

  const handleTicketUpdate = (updatedTicket: Ticket) => {
    setTickets(prev => prev.map(ticket => 
      ticket.id === updatedTicket.id ? updatedTicket : ticket
    ))
    setSelectedTicket(updatedTicket)
  }

  return (
    <div className="min-h-screen p-8">
      <h2 className="text-3xl font-bold mb-8">Dashboard</h2>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Tickets</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{counts.open}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{counts.pending}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Urgent</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{counts.urgent}</div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">Recent Tickets</h3>
          <div className="flex items-center gap-2">
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

        <div className={isGridView ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-4"}>
          {tickets.slice(0, 6).map((ticket) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              onClick={() => setSelectedTicket(ticket)}
              isGridView={isGridView}
            />
          ))}
        </div>
      </div>

      {selectedTicket && (
        <TicketWindow
          ticket={selectedTicket}
          isOpen={!!selectedTicket}
          onClose={() => setSelectedTicket(null)}
          showMetadata={true}
          onTicketUpdate={handleTicketUpdate}
          isWorker={true}
        />
      )}
    </div>
  )
} 