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
import { supabase } from "@/lib/supabase/client"
import { TicketCard } from "@/components/tickets/ticket-card"

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
    
    const setupSubscriptions = async () => {
      console.log('Setting up real-time subscriptions for worker tickets page...')
      
      const channel = supabase
        .channel('worker-tickets')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'tickets'
          },
          (payload) => {
            console.log('Received ticket update:', payload)
            loadTickets()
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
            loadTickets()
          }
        )
        .subscribe((status) => {
          console.log('Subscription status:', status)
          if (status === 'SUBSCRIBED') {
            loadTickets()
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
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold">Tickets</h2>
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
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Sort by:</span>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1"
              onClick={() => handleSort('priority')}
            >
              Priority
              {sortConfig.key === 'priority' && (
                sortConfig.direction === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
              )}
              {sortConfig.key !== 'priority' && <ArrowUpDown className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1"
              onClick={() => handleSort('created_at')}
            >
              Date
              {sortConfig.key === 'created_at' && (
                sortConfig.direction === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
              )}
              {sortConfig.key !== 'created_at' && <ArrowUpDown className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1"
              onClick={() => handleSort('status')}
            >
              Status
              {sortConfig.key === 'status' && (
                sortConfig.direction === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
              )}
              {sortConfig.key !== 'status' && <ArrowUpDown className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1"
              onClick={() => handleSort('customer')}
            >
              Customer
              {sortConfig.key === 'customer' && (
                sortConfig.direction === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
              )}
              {sortConfig.key !== 'customer' && <ArrowUpDown className="h-4 w-4" />}
            </Button>
          </div>
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
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              onClick={() => setSelectedTicket(ticket)}
              isGridView={isGridView}
            />
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