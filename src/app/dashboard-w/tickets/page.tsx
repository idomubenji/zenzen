"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { 
  Flame,
  Thermometer,
  ThermometerSnowflake,
  Minus,
  LayoutGrid,
  LayoutList,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from "lucide-react"
import { getTickets, type Ticket } from "@/lib/supabase/tickets"
import { formatDistanceToNow } from "date-fns"
import { TicketWindow } from "@/components/tickets/ticket-window"
import { Button } from "@/components/ui/button"
import { Toggle } from "@/components/ui/toggle"

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
  const [isGridView, setIsGridView] = useState(true)
  const [sortConfig, setSortConfig] = useState<{
    key: 'created_at' | 'status' | 'customer' | 'priority';
    direction: 'asc' | 'desc';
  }>({
    key: 'created_at',
    direction: 'desc'
  })

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

  const handleSort = (key: typeof sortConfig.key) => {
    setSortConfig(current => ({
      key,
      direction: 
        current.key === key
          ? current.direction === 'asc'
            ? 'desc'
            : 'asc'
          : 'asc'
    }))
  }

  const getSortedTickets = () => {
    return [...tickets].sort((a, b) => {
      if (sortConfig.key === 'created_at') {
        return sortConfig.direction === 'asc'
          ? new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          : new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
      
      if (sortConfig.key === 'status') {
        const statusOrder = { 'UNOPENED': 0, 'IN PROGRESS': 1, 'RESOLVED': 2, 'UNRESOLVED': 3 }
        return sortConfig.direction === 'asc'
          ? statusOrder[a.status] - statusOrder[b.status]
          : statusOrder[b.status] - statusOrder[a.status]
      }

      if (sortConfig.key === 'customer') {
        const aName = a.customer?.name || a.customer?.email || ''
        const bName = b.customer?.name || b.customer?.email || ''
        return sortConfig.direction === 'asc'
          ? aName.localeCompare(bName)
          : bName.localeCompare(aName)
      }

      if (sortConfig.key === 'priority') {
        const priorityOrder = { 'CRITICAL': 0, 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3, 'NONE': 4 }
        return sortConfig.direction === 'asc'
          ? priorityOrder[a.priority] - priorityOrder[b.priority]
          : priorityOrder[b.priority] - priorityOrder[a.priority]
      }

      return 0
    })
  }

  const getSortIcon = (key: typeof sortConfig.key) => {
    if (sortConfig.key !== key) return <ArrowUpDown className="h-4 w-4" />
    return sortConfig.direction === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
  }

  const handleTicketUpdate = (updatedTicket: Ticket) => {
    setTickets(prev => prev.map(ticket => 
      ticket.id === updatedTicket.id ? updatedTicket : ticket
    ))
    setSelectedTicket(updatedTicket)
  }

  return (
    <div className="min-h-screen p-8">
      <div className="flex flex-col gap-4 mb-8">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-bold">Tickets</h2>
          {/* We can add filters/search here later */}
        </div>
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
        <div className="flex gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSort('created_at')}
            className="flex items-center gap-2"
          >
            Recency {getSortIcon('created_at')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSort('status')}
            className="flex items-center gap-2"
          >
            Status {getSortIcon('status')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSort('customer')}
            className="flex items-center gap-2"
          >
            Customer {getSortIcon('customer')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSort('priority')}
            className="flex items-center gap-2"
          >
            Urgency {getSortIcon('priority')}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className={isGridView ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-4"}>
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
        <div className={isGridView ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-4"}>
          {getSortedTickets().map((ticket) => (
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
      )}

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