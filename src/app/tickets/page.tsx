"use client"

import { useState } from "react"
import { LayoutGrid, LayoutList } from "lucide-react"
import { Toggle } from "@/components/ui/toggle"
import { cn } from "@/lib/utils"
import { TicketWindow } from "@/components/tickets/ticket-window"
import { TicketCard } from "@/components/tickets/ticket-card"
import type { Ticket } from "@/lib/supabase/tickets"

export default function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [isGridView, setIsGridView] = useState(true)

  const handleTicketUpdate = (updatedTicket: Ticket) => {
    setTickets(prev => prev.map(ticket => 
      ticket.id === updatedTicket.id ? updatedTicket : ticket
    ))
    setSelectedTicket(updatedTicket)
  }

  return (
    <div className="container py-8">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Tickets</h1>
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

        <div className={cn(
          isGridView 
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            : "space-y-4"
        )}>
          {tickets.map((ticket) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              onClick={() => setSelectedTicket(ticket)}
            />
          ))}
        </div>
      </div>

      {selectedTicket && (
        <TicketWindow
          ticket={selectedTicket}
          isOpen={!!selectedTicket}
          onClose={() => setSelectedTicket(null)}
          onTicketUpdate={handleTicketUpdate}
          showMetadata
          isWorker
        />
      )}
    </div>
  )
} 