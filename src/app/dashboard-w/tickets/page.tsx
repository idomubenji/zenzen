"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { 
  Flame,
  Thermometer,
  ThermometerSnowflake,
  Minus
} from "lucide-react"
import { getTickets, type Ticket } from "@/lib/supabase/tickets"
import { formatDistanceToNow } from "date-fns"
import { TicketWindow } from "@/components/tickets/ticket-window"

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

export default function TicketsPage() {
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

  return (
    <div className="min-h-screen p-8">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold">Tickets</h2>
        {/* We can add filters/search here later */}
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
          <p className="text-sm text-muted-foreground mt-1">When tickets are created, they will appear here.</p>
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
          showMetadata={true}
        />
      )}
    </div>
  )
} 