import { Badge } from '@/components/ui/badge'

const STATUS_VARIANTS: Record<string, 'success' | 'warning' | 'destructive' | 'secondary'> = {
  active: 'success',
  inactive: 'secondary',
  pending: 'warning',
  error: 'destructive',
}

interface StatusBadgeProps {
  status: string
  className?: string
}

export const StatusBadge = ({ status, className }: StatusBadgeProps) => {
  const normalized = status.toLowerCase()
  const variant = STATUS_VARIANTS[normalized] ?? 'secondary'

  return (
    <Badge className={className} variant={variant}>
      {status}
    </Badge>
  )
}
