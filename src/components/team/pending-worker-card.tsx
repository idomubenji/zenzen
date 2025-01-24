import { Card, CardContent } from "@/components/ui/card"
import { Users } from "lucide-react"
import { Button } from "@/components/ui/button"

export interface PendingWorker {
  id: string
  name: string | null
  email: string
  role: 'PendingWorker'
}

interface PendingWorkerCardProps {
  member: PendingWorker
  onApprove: (member: PendingWorker) => Promise<void>
  onDeny: (member: PendingWorker) => Promise<void>
  className?: string
  isGridView?: boolean
}

export function PendingWorkerCard({ 
  member, 
  onApprove, 
  onDeny, 
  className, 
  isGridView = true 
}: PendingWorkerCardProps) {
  return (
    <Card className={`hover:shadow-md transition-shadow ${className}`}>
      <CardContent className="p-6">
        <div className={`flex ${isGridView ? 'flex-col h-full' : 'flex-col'}`}>
          <div className={`flex ${!isGridView ? 'flex-row justify-between items-start' : ''}`}>
            <div className={`flex-1 ${!isGridView && 'flex items-center gap-6'}`}>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <h4 className="font-medium text-lg">{member.name || member.email}</h4>
                <span className="mx-3 text-muted-foreground">・</span>
                <span className="text-xs px-2 py-1 rounded-full font-medium bg-yellow-100 text-yellow-800">
                  Pending Worker
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {member.email}
              </p>
            </div>
          </div>
          <div className={`flex gap-2 ${isGridView ? 'mt-4' : 'mt-3'}`}>
            <Button 
              variant="outline" 
              className="flex-1 bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
              onClick={() => onApprove(member)}
            >
              Approve
            </Button>
            <Button 
              variant="outline" 
              className="flex-1 bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
              onClick={() => onDeny(member)}
            >
              Deny
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 