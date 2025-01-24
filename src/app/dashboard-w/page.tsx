"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Clock, 
  MessageSquare, 
  CheckCircle2, 
  AlertCircle,
  Flame,
  Thermometer,
  ThermometerSnowflake,
  Minus,
  LayoutGrid,
  LayoutList
} from "lucide-react"
import { getTickets, getTicketCount, type Ticket } from "@/lib/supabase/tickets"
import { formatDistanceToNow } from "date-fns"
import { TicketWindow } from "@/components/tickets/ticket-window"
import { Toggle } from "@/components/ui/toggle"
import { supabase } from "@/lib/supabase/client"

const PriorityIcon = ({ priority }: { priority: Ticket['priority'] }) => {
  switch (priority) {
    case 'CRITICAL':
      return <Flame className="h-4 w-4 text-red-600" />
    case 'HIGH':
      return <Thermometer className="h-4 w-4 text-orange-500" />
    case 'MEDIUM':
      return <Thermometer className="h-4 w-4 text-yellow-500" />
    case 'LOW':
      return <ThermometerSnowflake className="h-4 w-4 text-blue-500" />
    default:
      return <Minus className="h-4 w-4 text-gray-400" />
  }
}

const getPriorityColor = (priority: Ticket['priority']) => {
  switch (priority) {
    case 'CRITICAL':
      return 'text-red-600'
    case 'HIGH':
      return 'text-orange-500'
    case 'MEDIUM':
      return 'text-yellow-500'
    case 'LOW':
      return 'text-blue-500'
    default:
      return 'text-gray-400'
  }
}

export default function DashboardPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [counts, setCounts] = useState({
    open: 0,
    pending: 0,
    resolved: 0,
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
      const openCount = await getTicketCount('UNOPENED')
      const inProgressCount = await getTicketCount('IN PROGRESS')
      const resolvedCount = await getTicketCount('RESOLVED')
      
      // Count urgent tickets (HIGH or CRITICAL priority)
      const urgentTickets = allTickets.filter(
        ticket => ticket.priority === 'HIGH' || ticket.priority === 'CRITICAL'
      ).length

      setCounts({
        open: openCount,
        pending: inProgressCount,
        resolved: resolvedCount,
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
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
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
            <CardTitle className="text-sm font-medium">Resolved Today</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{counts.resolved}</div>
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

      <div>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-semibold">Recent Tickets</h3>
          <div className="flex items-center gap-2">
            <Toggle
              pressed={isGridView}
              onPressedChange={setIsGridView}
              size="sm"
              aria-label="Toggle layout"
            >
              {isGridView ? (
                <LayoutGrid className="h-4 w-4" />
              ) : (
                <LayoutList className="h-4 w-4" />
              )}
            </Toggle>
            <span className="text-sm text-muted-foreground">
              {isGridView ? 'Grid View' : 'List View'}
            </span>
          </div>
        </div>
        <div className={isGridView ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-4"}>
          {tickets.slice(0, 6).map((ticket) => (
            <Card 
              key={ticket.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setSelectedTicket(ticket)}
            >
              <CardContent className="p-6">
                <div className={`flex ${isGridView ? 'flex-col h-full' : 'flex-row justify-between items-center'}`}>
                  <div className={`flex-1 ${!isGridView && 'flex items-center gap-6'}`}>
                    <div className="flex items-center gap-2">
                      <PriorityIcon priority={ticket.priority} />
                      <h4 className="font-medium text-lg">{ticket.title}</h4>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      {ticket.customer?.name || ticket.customer?.email} <span className="mx-2">•</span> 
                      {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })} <span className="mx-2">•</span> 
                      <span className={getPriorityColor(ticket.priority)}>
                        {ticket.priority}
                      </span>
                    </p>
                  </div>
                  <div className={isGridView ? 'mt-4' : 'ml-4'}>
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