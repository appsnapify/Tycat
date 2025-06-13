import React from 'react'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'

interface StatCardProps {
  title: string
  value: string | number
  icon?: React.ReactNode
  change?: string
  color?: "primary" | "secondary" | "accent" | "neutral"
  loading?: boolean
}

export function StatCard({ 
  title, 
  value, 
  icon, 
  change, 
  color = "primary",
  loading = false
}: StatCardProps) {
  // Sistema de cores azul moderno - baseado no PromoterPublicLinkCard
  const getColors = () => {
    const colorMap = {
      primary: {
        bgGradient: "from-blue-50 to-blue-100",
        border: "border-blue-200",
        iconColor: "text-blue-600",
        iconBg: "bg-blue-100",
        circleColor: "bg-blue-600",
        circleIcon: "text-white"
      },
      secondary: {
        bgGradient: "from-blue-50 to-blue-100",
        border: "border-blue-200", 
        iconColor: "text-blue-600",
        iconBg: "bg-blue-100",
        circleColor: "bg-blue-600",
        circleIcon: "text-white"
      },
      accent: {
        bgGradient: "from-blue-50 to-blue-100",
        border: "border-blue-200",
        iconColor: "text-blue-600",
        iconBg: "bg-blue-100",
        circleColor: "bg-blue-600",
        circleIcon: "text-white"
      },
      neutral: {
        bgGradient: "from-blue-50 to-blue-100",
        border: "border-blue-200",
        iconColor: "text-blue-600",
        iconBg: "bg-blue-100",
        circleColor: "bg-blue-600",
        circleIcon: "text-white"
      }
    }
    
    return colorMap[color]
  }
  
  const colors = getColors()
  
  return (
    <Card className={cn(
      "bg-white dark:bg-gray-800 shadow-[0px_0px_15px_rgba(0,0,0,0.09)] dark:shadow-[0px_0px_15px_rgba(255,255,255,0.05)] hover:shadow-[0px_0px_20px_rgba(0,0,0,0.15)] dark:hover:shadow-[0px_0px_20px_rgba(255,255,255,0.1)] transition-all duration-300 relative overflow-hidden rounded-xl",
      colors.border
    )}>
      {/* Elemento decorativo circular no canto - ícone centralizado */}
      <div className={cn("w-14 h-14 md:w-16 md:h-16 rounded-full absolute -right-2 -top-3 md:-right-3 md:-top-4 flex items-center justify-center", colors.circleColor)}>
        {icon && React.cloneElement(icon as React.ReactElement, { 
          className: cn("w-3 h-3 md:w-4 md:h-4", colors.circleIcon) 
        })}
      </div>
      
      <div className="p-4 md:p-6">
        {/* Ícone principal e título */}
        <div className="flex items-start justify-between mb-3 md:mb-4">
          <div className="space-y-1">
            <h3 className="text-gray-600 dark:text-gray-300 font-medium text-xs md:text-sm">{title}</h3>
            {icon && (
              <div className={cn("w-6 h-6 md:w-8 md:h-8 flex items-center justify-center", colors.iconColor)}>
                {React.cloneElement(icon as React.ReactElement, { 
                  className: "w-6 h-6 md:w-8 md:h-8" 
                })}
              </div>
            )}
          </div>
        </div>
        
        {/* Valor principal */}
        <div className="space-y-1 md:space-y-2">
          {loading ? (
            <div className="h-6 md:h-8 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-md w-16 md:w-20"></div>
          ) : (
            <p className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
          )}
          
          {/* Mudança percentual */}
          {change && (
            <p className={cn(
              "text-xs font-medium",
              change.startsWith('+') ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            )}>
              {change} desde o último período
            </p>
          )}
        </div>
      </div>
    </Card>
  )
} 