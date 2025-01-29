import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Star } from "lucide-react"
import { cn } from "@/lib/utils"

interface FeedbackDialogProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (score: number, comment?: string) => void
  existingFeedback?: { score: number, comment?: string } | null
}

export function FeedbackDialog({ isOpen, onClose, onSubmit, existingFeedback }: FeedbackDialogProps) {
  const [hoveredRating, setHoveredRating] = useState<number | null>(null)
  const [selectedRating, setSelectedRating] = useState<number | null>(existingFeedback?.score ?? null)
  const [comment, setComment] = useState(existingFeedback?.comment ?? "")
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (existingFeedback) {
      setSelectedRating(existingFeedback.score)
      setComment(existingFeedback.comment ?? "")
    }
  }, [existingFeedback])

  const handleStarHover = (starIndex: number) => {
    if (!selectedRating) {
      setHoveredRating(starIndex + 1)
    }
  }

  const handleStarClick = (starIndex: number) => {
    setSelectedRating(starIndex + 1)
    setHoveredRating(null)
  }

  const handleSubmit = async () => {
    if (!selectedRating) return

    setIsSubmitting(true)
    try {
      await onSubmit(selectedRating, comment || undefined)
      onClose()
    } catch (error) {
      console.error('Failed to submit feedback:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setHoveredRating(null)
    setSelectedRating(null)
    setComment("")
    onClose()
  }

  const rating = selectedRating || hoveredRating || 0
  const displayRating = Math.round((rating / 100) * 100)

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">
            {existingFeedback ? 'Update Your Feedback!' : 'Leave us Feedback!'}
          </DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <div 
            className="text-center mb-4 text-2xl font-semibold"
            onClick={() => {
              setSelectedRating(null)
              setHoveredRating(null)
            }}
          >
            {displayRating}/100
          </div>
          <div 
            className="grid grid-cols-[repeat(20,1fr)] grid-rows-5 gap-1 mb-6 max-w-[600px] mx-auto"
            onMouseLeave={() => !selectedRating && setHoveredRating(null)}
          >
            {Array.from({ length: 100 }).map((_, index) => {
              const row = Math.floor(index / 20)
              const col = index % 20
              const starIndex = row * 20 + col
              const isActive = (selectedRating ?? hoveredRating ?? 0) > starIndex

              return (
                <Star
                  key={starIndex}
                  className={cn(
                    "h-4 w-4 cursor-pointer transition-colors",
                    isActive
                      ? selectedRating !== null
                        ? "fill-yellow-500 text-yellow-500" // Selected state (gold)
                        : "fill-yellow-300 text-yellow-300" // Hover state (yellow)
                      : "text-gray-300" // Inactive state
                  )}
                  onMouseEnter={() => handleStarHover(starIndex)}
                  onClick={() => handleStarClick(starIndex)}
                />
              )
            })}
          </div>
          <Textarea
            placeholder="Tell us about your experience..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="min-h-[100px] mb-4"
          />
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={!selectedRating || isSubmitting}
            >
              {isSubmitting ? "Submitting..." : existingFeedback ? "Update" : "Confirm"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 