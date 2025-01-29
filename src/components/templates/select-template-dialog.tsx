"use client"

import { useState, useEffect } from "react"
import { Check, FileText, Loader2 } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getTemplates, type Template } from "@/lib/supabase/templates"

interface SelectTemplateDialogProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (template: Template) => void
}

export function SelectTemplateDialog({
  isOpen,
  onClose,
  onSelect,
}: SelectTemplateDialogProps) {
  const [templates, setTemplates] = useState<Template[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (isOpen) {
      loadTemplates()
    }
  }, [isOpen])

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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Select Template</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : templates.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No templates available</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Create templates in the templates page
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 p-1">
              {templates.map((template) => (
                <Card 
                  key={template.id} 
                  className="group cursor-pointer hover:shadow-md transition-shadow relative"
                  onClick={() => onSelect(template)}
                >
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="h-8 w-8 p-0"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  </div>
                  <CardHeader>
                    <CardTitle className="text-xl truncate pr-10">{template.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {template.content}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
} 