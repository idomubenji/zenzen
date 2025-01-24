"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Plus, FileText } from "lucide-react"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { getTemplates, type Template } from "@/lib/supabase/templates"
import { cn } from "@/lib/utils"

interface QuickSelectTemplateProps {
  onSelect: (template: Template) => void
  onShowAll: () => void
}

export function QuickSelectTemplate({
  onSelect,
  onShowAll,
}: QuickSelectTemplateProps) {
  const [open, setOpen] = useState(false)
  const [templates, setTemplates] = useState<Template[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (open) {
      loadTemplates()
    }
  }, [open])

  const loadTemplates = async () => {
    try {
      const templates = await getTemplates()
      setTemplates(templates)
    } catch (error) {
      console.error('Error loading templates:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          <div className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Template
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search templates..." />
          <CommandEmpty>
            {isLoading ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Loading templates...
              </p>
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No templates found.
              </p>
            )}
          </CommandEmpty>
          <CommandGroup>
            {templates.map((template) => (
              <CommandItem
                key={template.id}
                onSelect={() => {
                  onSelect(template)
                  setOpen(false)
                }}
                className="flex flex-col items-start gap-1 py-2"
              >
                <span className="font-medium">{template.title}</span>
                {template.team && (
                  <span className="text-xs text-muted-foreground">
                    Team: {template.team.name}
                  </span>
                )}
              </CommandItem>
            ))}
            <CommandItem
              onSelect={() => {
                onShowAll()
                setOpen(false)
              }}
              className="border-t"
            >
              <FileText className="h-4 w-4 mr-2" />
              Show All Templates
            </CommandItem>
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  )
} 