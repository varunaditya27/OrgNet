import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface StatCardProps {
  title: string
  value: string | number
  description?: string
  icon?: React.ReactNode
  trend?: {
    label: string
    isPositive?: boolean
  }
}

export const StatCard = ({ title, value, description, icon, trend }: StatCardProps) => {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon ? <div className="text-muted-foreground">{icon}</div> : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <span className="text-2xl font-bold text-foreground">{value}</span>
        {trend ? (
          <span
            className={trend.isPositive ? 'text-xs text-emerald-600' : 'text-xs text-amber-600'}
          >
            {trend.label}
          </span>
        ) : null}
        {description ? (
          <p className="text-xs text-muted-foreground">{description}</p>
        ) : null}
      </CardContent>
    </Card>
  )
}
