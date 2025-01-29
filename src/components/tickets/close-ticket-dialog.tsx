import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface CloseTicketDialogProps {
  isOpen: boolean
  onClose: () => void
  onResolve: (wasResolved: boolean) => void
}

export function CloseTicketDialog({
  isOpen,
  onClose,
  onResolve,
}: CloseTicketDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Close Ticket</DialogTitle>
          <DialogDescription>
            Was the issue resolved?
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-4 mt-4">
          <Button variant="outline" onClick={() => onResolve(false)}>
            No
          </Button>
          <Button onClick={() => onResolve(true)}>
            Yes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
} 