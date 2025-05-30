'use client'

import React from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LoadingOverlayProps {
  isLoading: boolean
  message?: string
  submessage?: string
  className?: string
  children?: React.ReactNode
}

export function LoadingOverlay({ 
  isLoading, 
  message = 'Carregando...', 
  submessage,
  className,
  children 
}: LoadingOverlayProps) {
  if (!isLoading) return <>{children}</>

  return (
    <div className={cn('relative', className)}>
      {/* Conteúdo com overlay */}
      <div className={cn('transition-all duration-200', isLoading && 'opacity-30 pointer-events-none')}>
        {children}
      </div>
      
      {/* Overlay de loading */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-10">
          <div className="flex flex-col items-center gap-3 p-6 bg-white rounded-lg shadow-lg border">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <div className="text-center">
              <p className="text-sm font-medium text-gray-900">{message}</p>
              {submessage && (
                <p className="text-xs text-gray-500 mt-1">{submessage}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 