import { Card, CardContent } from "@/components/ui/card"
import { Flame, Thermometer, ThermometerSnowflake, Minus } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import type { Ticket } from "@/lib/supabase/tickets"

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

interface TicketCardProps {
  ticket: Ticket
  onClick?: (ticket: Ticket) => void
  className?: string
  isGridView?: boolean
}

export function TicketCard({ ticket, onClick, className, isGridView = true }: TicketCardProps) {
  return (
    <Card 
      className={`cursor-pointer hover:shadow-md transition-shadow ${className}`}
      onClick={() => onClick?.(ticket)}
    >
      <CardContent className="p-6">
        <div className={`flex ${isGridView ? 'flex-col h-full' : 'flex-row justify-between items-center'}`}>
          <div className={`flex-1 ${!isGridView && 'flex items-center gap-6'}`}>
            <div className="flex items-center gap-2">
              <PriorityIcon priority={ticket.priority} />
              <h4 className="font-medium text-lg">{ticket.title}</h4>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {ticket.customer?.name || ticket.customer_id} <span className="mx-2">•</span> 
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
          {ticket.tags && ticket.tags.length > 0 && (
            <div className={`flex flex-wrap gap-1 ${isGridView ? 'mt-4' : 'ml-4'}`}>
              {ticket.tags.map((tag, i) => (
                <span key={i} className="text-xs bg-muted px-2 py-1 rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
} 