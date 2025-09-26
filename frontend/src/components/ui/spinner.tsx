import { cn } from '@/lib/utils'

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeMap: Record<NonNullable<SpinnerProps['size']>, string> = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-[3px]',
  lg: 'h-8 w-8 border-4',
}

export const Spinner = ({ size = 'md', className }: SpinnerProps) => (
  <span
    className={cn(
      'inline-flex animate-spin rounded-full border-primary border-t-transparent',
      sizeMap[size],
      className,
    )}
  />
)
