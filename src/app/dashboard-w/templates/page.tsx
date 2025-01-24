"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Plus, FileText, Loader2, LayoutGrid, LayoutList, Pencil, Trash2, Check } from "lucide-react"
import { CreateTemplateDialog } from "@/components/templates/create-template-dialog"
import { EditTemplateDialog } from "@/components/templates/edit-template-dialog"
import { getTemplates, type Template, deleteTemplate, updateTemplate } from "@/lib/supabase/templates"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDistanceToNow } from "date-fns"
import { supabase } from "@/lib/supabase/client"
import { Toggle } from "@/components/ui/toggle"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

export default function TemplatesPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [templates, setTemplates] = useState<Template[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isGridView, setIsGridView] = useState(true)
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set())
  const [availableTags, setAvailableTags] = useState<string[]>([])
  const [selectedTeams, setSelectedTeams] = useState<Set<string>>(new Set())
  const [availableTeams, setAvailableTeams] = useState<{ id: string; name: string }[]>([])

  const loadTemplates = async () => {
    try {
      const templates = await getTemplates()
      setTemplates(templates)

      // Extract and sort unique tags
      const tags = new Set<string>()
      templates.forEach(template => {
        template.tags?.forEach(tag => tags.add(tag))
      })
      const sortedTags = Array.from(tags).sort()
      setAvailableTags(sortedTags)
      setSelectedTags(new Set()) // Initialize with no tags selected

      // Extract and sort unique teams
      const teams = new Map<string, string>()
      templates.forEach(template => {
        if (template.team) {
          teams.set(template.team.id, template.team.name)
        }
      })
      const sortedTeams = Array.from(teams.entries())
        .map(([id, name]) => ({ id, name }))
        .sort((a, b) => a.name.localeCompare(b.name))
      setAvailableTeams(sortedTeams)
      setSelectedTeams(new Set()) // Initialize with no teams selected
    } catch (error) {
      console.error('Error loading templates:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadTemplates()

    // Set up real-time subscription
    const channel = supabase
      .channel('templates-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'templates'
        },
        () => {
          loadTemplates()
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [])

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => {
      const newSet = new Set(prev)
      if (newSet.has(tag)) {
        newSet.delete(tag)
      } else {
        newSet.add(tag)
      }
      return newSet
    })
  }

  const toggleAllTags = () => {
    if (selectedTags.size === availableTags.length) {
      setSelectedTags(new Set())
    } else {
      setSelectedTags(new Set(availableTags))
    }
  }

  const toggleTeam = (teamId: string) => {
    setSelectedTeams(prev => {
      const newSet = new Set(prev)
      if (newSet.has(teamId)) {
        newSet.delete(teamId)
      } else {
        newSet.add(teamId)
      }
      return newSet
    })
  }

  const toggleAllTeams = () => {
    if (selectedTeams.size === availableTeams.length) {
      setSelectedTeams(new Set())
    } else {
      setSelectedTeams(new Set(availableTeams.map(team => team.id)))
    }
  }

  const getFilteredTemplates = () => {
    if (selectedTags.size === 0 && selectedTeams.size === 0) return templates // Show all templates if no filters
    return templates.filter(template => {
      const matchesTags = selectedTags.size === 0 || template.tags?.some(tag => selectedTags.has(tag))
      const matchesTeams = selectedTeams.size === 0 || (template.team && selectedTeams.has(template.team.id))
      return matchesTags && matchesTeams
    })
  }

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      await deleteTemplate(templateId)
      toast.success('Template deleted successfully')
    } catch (error) {
      console.error('Failed to delete template:', error)
      toast.error('Failed to delete template')
    }
  }

  return (
    <div className="min-h-screen p-8">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-bold">Templates</h2>
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
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          </div>
        </div>

        <div>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="tags" className="border-0">
              <AccordionTrigger className="hover:no-underline py-2">
                <div className="flex items-center gap-2">
                  <span>Filter by Tag</span>
                  <span className="text-xs text-muted-foreground">
                    ({selectedTags.size} of {availableTags.length} selected)
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleAllTags}
                    className="h-7"
                  >
                    {selectedTags.size === availableTags.length ? 'Deselect All' : 'Select All'}
                  </Button>
                  <div className="flex flex-wrap gap-2">
                    {availableTags.map(tag => (
                      <button
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        className={cn(
                          "text-xs px-3 py-1.5 rounded-full border transition-colors flex items-center gap-1.5",
                          selectedTags.has(tag)
                            ? "bg-blue-50 text-blue-700 border-blue-700/30 hover:bg-blue-100/80"
                            : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted"
                        )}
                      >
                        {tag}
                        {selectedTags.has(tag) && <Check className="h-3 w-3" />}
                      </button>
                    ))}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="teams" className="border-0">
              <AccordionTrigger className="hover:no-underline py-2">
                <div className="flex items-center gap-2">
                  <span>Filter by Team</span>
                  <span className="text-xs text-muted-foreground">
                    ({selectedTeams.size} of {availableTeams.length} selected)
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleAllTeams}
                    className="h-7"
                  >
                    {selectedTeams.size === availableTeams.length ? 'Deselect All' : 'Select All'}
                  </Button>
                  <div className="flex flex-wrap gap-2">
                    {availableTeams.map(team => (
                      <button
                        key={team.id}
                        onClick={() => toggleTeam(team.id)}
                        className={cn(
                          "text-xs px-3 py-1.5 rounded-full border transition-colors flex items-center gap-1.5",
                          selectedTeams.has(team.id)
                            ? "bg-blue-50 text-blue-700 border-blue-700/30 hover:bg-blue-100/80"
                            : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted"
                        )}
                      >
                        {team.name}
                        {selectedTeams.has(team.id) && <Check className="h-3 w-3" />}
                      </button>
                    ))}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : templates.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No templates yet</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Create your first template to get started
            </p>
          </div>
        ) : (
          <div className={cn(
            isGridView 
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              : "space-y-4"
          )}>
            {getFilteredTemplates().map((template) => (
              <Card 
                key={template.id} 
                className={cn(
                  "group cursor-pointer hover:shadow-md transition-shadow",
                  !isGridView && "flex flex-col"
                )}
              >
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="space-y-1.5 min-w-0">
                      <CardTitle className="text-xl truncate">{template.title}</CardTitle>
                      {template.team && (
                        <p className="flex items-center gap-1 text-xs truncate">
                          <span className="text-muted-foreground">Team:</span>
                          <span className="text-blue-600 truncate">{template.team.name}</span>
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditingTemplate(template)
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteTemplate(template.id)
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {!isGridView && (
                    <div className="text-xs text-muted-foreground mt-1">
                      <p>Created by {template.creator?.name || template.creator?.email}</p>
                      <p>{formatDistanceToNow(new Date(template.created_at), { addSuffix: true })}</p>
                    </div>
                  )}
                </CardHeader>
                <CardContent className={cn(
                  !isGridView && "pt-4"
                )}>
                  <p className={cn(
                    "text-sm text-muted-foreground mb-4",
                    isGridView ? "line-clamp-3" : "line-clamp-2"
                  )}>
                    {template.content}
                  </p>
                  {template.tags && template.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {template.tags.map((tag, index) => (
                        <div
                          key={index}
                          className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-700/30"
                        >
                          {tag}
                        </div>
                      ))}
                    </div>
                  )}
                  {isGridView && (
                    <div className="text-xs text-muted-foreground">
                      <p>Created by {template.creator?.name || template.creator?.email}</p>
                      <p>{formatDistanceToNow(new Date(template.created_at), { addSuffix: true })}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <CreateTemplateDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onSuccess={loadTemplates}
      />

      <EditTemplateDialog
        isOpen={!!editingTemplate}
        onClose={() => setEditingTemplate(null)}
        onSuccess={loadTemplates}
        template={editingTemplate}
      />
    </div>
  )
} 