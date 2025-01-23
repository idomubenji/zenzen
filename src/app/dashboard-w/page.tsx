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
  Minus
} from "lucide-react"
import { getTickets, getTicketCount, type Ticket } from "@/lib/supabase/tickets"
import { formatDistanceToNow } from "date-fns"

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
  }, [])

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Dashboard</h2>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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

      <div className="mt-8">
        <h3 className="text-xl font-semibold mb-4">Recent Tickets</h3>
        <div className="space-y-4">
          {tickets.slice(0, 5).map((ticket) => (
            <Card key={ticket.id}>
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <PriorityIcon priority={ticket.priority} />
                      <h4 className="font-medium">{ticket.title}</h4>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {ticket.customer?.name || ticket.customer?.email} <span className="mx-2">•</span> 
                      {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })} <span className="mx-2">•</span> 
                      <span className={getPriorityColor(ticket.priority)}>
                        {ticket.priority}
                      </span>
                    </p>
                  </div>
                  <div>
                    <span className={`
                      text-xs px-2 py-1 rounded
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
      </div>
    </div>
  )
} 