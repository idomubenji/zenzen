import { Card, CardContent } from "@/components/ui/card"
import { Users, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"

export interface TeamMember {
  id: string
  name: string | null
  email: string
  role: 'Administrator' | 'Worker' | 'Customer' | 'PendingWorker'
  teams?: {
    id: string
    name: string
    focus_area: string | null
  }[]
}

interface TeamMemberCardProps {
  member: TeamMember
  onClick?: (member: TeamMember) => void
  className?: string
  isGridView?: boolean
  isAdmin?: boolean
  onEdit?: (member: TeamMember) => void
}

export function TeamMemberCard({ 
  member, 
  onClick, 
  className, 
  isGridView = true,
  isAdmin = false,
  onEdit
}: TeamMemberCardProps) {
  const handleClick = () => {
    if (isAdmin && onEdit) {
      onEdit(member)
    } else if (onClick) {
      onClick(member)
    }
  }

  const getRoleStyles = (role: TeamMember['role']) => {
    switch (role) {
      case 'Administrator':
        return 'bg-blue-100 text-blue-800'
      case 'Worker':
        return 'bg-green-100 text-green-800'
      case 'PendingWorker':
        return 'bg-yellow-100 text-yellow-800'
      case 'Customer':
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <Card 
      className={`cursor-pointer hover:shadow-md transition-shadow ${className}`}
      onClick={handleClick}
    >
      <CardContent className="p-6">
        <div className={`flex ${isGridView ? 'flex-col h-full' : 'flex-col'}`}>
          <div className={`flex ${!isGridView ? 'flex-row justify-between items-start' : ''}`}>
            <div className={`flex-1 ${!isGridView && 'flex items-center gap-6'}`}>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <h4 className="font-medium text-lg">{member.name || member.email}</h4>
                <span className="mx-3 text-muted-foreground">・</span>
                <span className={`
                  text-xs px-2 py-1 rounded-full font-medium
                  ${getRoleStyles(member.role)}
                `}>
                  {member.role}
                </span>
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-2 h-8 w-8 p-0"
                    onClick={(e) => {
                      e.stopPropagation()
                      onEdit?.(member)
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {member.email}
              </p>
            </div>
          </div>
          {member.teams && member.teams.length > 0 && (
            <div className={`flex flex-wrap gap-1 ${isGridView ? 'mt-4' : 'mt-3'}`}>
              {member.teams.map((team) => (
                <span 
                  key={team.id} 
                  className="text-xs bg-blue-50 hover:bg-blue-100/80 text-blue-700 border border-blue-700/30 px-3 py-1 rounded-full"
                  title={team.focus_area || undefined}
                >
                  {team.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
} 