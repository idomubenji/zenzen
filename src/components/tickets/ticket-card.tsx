import { Card, CardContent } from "@/components/ui/card"
import { Flame, Thermometer, ThermometerSnowflake, Minus } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import type { Ticket } from "@/lib/supabase/tickets"
import { cn } from "@/lib/utils"

const PriorityIcon = ({ priority }: { priority: Ticket['priority'] }) => {
  switch (priority) {
    case 'CRITICAL':
      return <Flame className="h-5 w-5 text-red-600" />
    case 'HIGH':
      return <Thermometer className="h-5 w-5 text-orange-500" />
    case 'MEDIUM':
      return <Thermometer className="h-5 w-5 text-yellow-500" />
    case 'LOW':
      return <ThermometerSnowflake className="h-5 w-5 text-blue-500" />
    default:
      return <Minus className="h-5 w-5 text-gray-400" />
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
      className={cn(
        "cursor-pointer hover:shadow-md transition-shadow",
        className
      )}
      onClick={() => onClick?.(ticket)}
    >
      <CardContent className="p-6">
        <div className={`flex ${isGridView ? 'flex-col h-full' : 'flex-col'}`}>
          <div className={`flex ${!isGridView ? 'flex-row justify-between items-start' : ''}`}>
            <div className={`flex-1 ${!isGridView && 'flex items-center gap-6'}`}>
              <div className="flex items-start gap-3">
                <div className="shrink-0">
                  <PriorityIcon priority={ticket.priority} />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-medium text-lg break-words">{ticket.title}</h4>
                  <p className="text-sm text-muted-foreground mt-2">
                    {ticket.customer?.name || ticket.customer_id} <span className="mx-2">•</span> 
                    {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })} <span className="mx-2">•</span> 
                    <span className={getPriorityColor(ticket.priority)}>
                      {ticket.priority}
                    </span>
                  </p>
                </div>
              </div>
            </div>
            <div className={isGridView ? 'mt-4' : 'shrink-0 ml-4'}>
              <span className={`
                text-xs px-3 py-1.5 rounded-full font-medium whitespace-nowrap
                ${ticket.status === 'UNOPENED' ? 'bg-red-100 text-red-800' : ''}
                ${ticket.status === 'IN PROGRESS' ? 'bg-yellow-100 text-yellow-800' : ''}
                ${ticket.status === 'RESOLVED' ? 'bg-green-100 text-green-800' : ''}
                ${ticket.status === 'UNRESOLVED' ? 'bg-slate-100 text-slate-800' : ''}
              `}>
                {ticket.status}
              </span>
            </div>
          </div>
          {ticket.tags && ticket.tags.length > 0 && (
            <div className={`flex flex-wrap gap-1 ${isGridView ? 'mt-4' : 'mt-3'}`}>
              {ticket.tags.map((tag, i) => (
                <span key={i} className="text-xs bg-blue-50 hover:bg-blue-100/80 text-blue-700 border border-blue-700/30 px-3 py-1 rounded-full">
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