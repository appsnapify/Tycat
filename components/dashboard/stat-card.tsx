import React from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  icon?: LucideIcon
  description?: string
  className?: string
  loading?: boolean
}

export function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  description,
  className,
  loading = false
}: StatCardProps) {
  
  return (
    <Card className={cn("w-full relative border rounded-lg shadow-sm", className)}>
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-2">{title}</p>
            {loading ? (
              <div className="h-8 bg-gray-200 animate-pulse rounded-md w-20 mb-1"></div>
            ) : (
              <p className="text-3xl font-bold text-gray-900 mb-1">{value}</p>
            )}
            {description && (
              <p className="text-sm text-gray-500">{description}</p>
            )}
          </div>
          {Icon && (
            <div className="p-3 bg-white rounded-full border border-gray-200">
              <Icon className="h-6 w-6 text-gray-600" />
        </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
} 