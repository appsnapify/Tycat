import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface MetricCardProps {
  title: string
  value: string | number
  description: string
  icon?: React.ReactNode
  trend?: {
    value: number
    isPositive: boolean
  }
}

export function MetricCard({
  title,
  value,
  description,
  icon,
  trend
}: MetricCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
          {icon && <span className="mr-2">{icon}</span>}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold mb-1">
          {value}
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {description}
          </p>
          {trend && (
            <div className={`text-xs flex items-center ${trend.isPositive ? 'text-green-500' : 'text-red-500'}`}>
              {trend.isPositive ? '↑' : '↓'} {trend.value}%
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default MetricCard 