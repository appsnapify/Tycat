import React from 'react'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'

interface StatCardProps {
  title: string
  value: string | number
  icon?: React.ReactNode
  change?: string
  color?: "lime" | "fuchsia" | "blue" | "amber"
  loading?: boolean
}

export function StatCard({ 
  title, 
  value, 
  icon, 
  change, 
  color = "lime",
  loading = false
}: StatCardProps) {
  // Mapeia as cores para classes tailwind
  const getColors = () => {
    const colorMap = {
      lime: {
        bgGradient: "from-lime-50 to-lime-100",
        border: "border-lime-200",
        iconColor: "text-lime-500",
        iconBg: "bg-lime-100"
      },
      fuchsia: {
        bgGradient: "from-fuchsia-50 to-fuchsia-100",
        border: "border-fuchsia-200", 
        iconColor: "text-fuchsia-500",
        iconBg: "bg-fuchsia-100"
      },
      blue: {
        bgGradient: "from-blue-50 to-blue-100",
        border: "border-blue-200",
        iconColor: "text-blue-500",
        iconBg: "bg-blue-100"
      },
      amber: {
        bgGradient: "from-amber-50 to-amber-100",
        border: "border-amber-200",
        iconColor: "text-amber-500",
        iconBg: "bg-amber-100"
      }
    }
    
    return colorMap[color]
  }
  
  const colors = getColors()
  
  return (
    <Card className={cn(
      "bg-gradient-to-br border shadow-sm transition-all duration-200 hover:shadow-md",
      colors.bgGradient,
      colors.border
    )}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-gray-600 font-medium text-sm">{title}</h3>
          {icon && (
            <div className={cn("p-2 rounded-lg", colors.iconColor, colors.iconBg)}>
              {icon}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1">
          {loading ? (
            <div className="h-8 bg-gray-200 animate-pulse rounded-md w-16"></div>
          ) : (
            <p className="text-2xl font-bold text-gray-800">{value}</p>
          )}
          {change && (
            <p className={cn(
              "text-xs font-medium",
              change.startsWith('+') ? 'text-green-600' : 'text-red-600'
            )}>
              {change} desde último período
            </p>
          )}
        </div>
      </div>
    </Card>
  )
} 