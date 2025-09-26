import { ChevronLeft, ChevronRight } from 'lucide-react'

import { Button } from './button'
import { cn } from '@/lib/utils'

type PaginationProps = {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  className?: string
}

export const Pagination = ({ page, totalPages, onPageChange, className }: PaginationProps) => {
  const canPrev = page > 1
  const canNext = page < totalPages

  return (
    <div className={cn('flex items-center justify-between gap-3', className)}>
      <Button
        variant="outline"
        size="sm"
        disabled={!canPrev}
        onClick={() => canPrev && onPageChange(page - 1)}
        className="gap-1"
      >
        <ChevronLeft className="h-4 w-4" />
        Previous
      </Button>
      <span className="text-sm text-muted-foreground">
        Page <span className="font-medium text-foreground">{page}</span> of{' '}
        <span className="font-medium text-foreground">{Math.max(totalPages, 1)}</span>
      </span>
      <Button
        variant="outline"
        size="sm"
        disabled={!canNext}
        onClick={() => canNext && onPageChange(page + 1)}
        className="gap-1"
      >
        Next
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}
