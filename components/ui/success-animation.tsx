'use client'

import React, { useEffect, useState } from 'react'
import { Check, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SuccessAnimationProps {
  show: boolean
  title?: string
  message?: string
  onComplete?: () => void
  className?: string
}

export function SuccessAnimation({ 
  show, 
  title = 'Sucesso!', 
  message = 'Operação realizada com sucesso',
  onComplete,
  className 
}: SuccessAnimationProps) {
  const [visible, setVisible] = useState(false)
  const [animate, setAnimate] = useState(false)

  useEffect(() => {
    if (show) {
      setVisible(true)
      // Pequeno delay para trigger da animação
      setTimeout(() => setAnimate(true), 50)
      
      // Auto hide após 3 segundos
      const timer = setTimeout(() => {
        setAnimate(false)
        setTimeout(() => {
          setVisible(false)
          onComplete?.()
        }, 300)
      }, 3000)
      
      return () => clearTimeout(timer)
    } else {
      setAnimate(false)
      setTimeout(() => setVisible(false), 300)
    }
  }, [show, onComplete])

  if (!visible) return null

  return (
    <div className={cn(
      'fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm',
      'transition-all duration-300',
      animate ? 'opacity-100' : 'opacity-0',
      className
    )}>
      <div className={cn(
        'relative bg-white rounded-xl p-8 max-w-sm mx-4 text-center shadow-2xl',
        'transform transition-all duration-500',
        animate ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
      )}>
        {/* Efeito de brilho */}
        <div className="absolute -top-1 -left-1 -right-1 -bottom-1 bg-gradient-to-r from-green-400 via-blue-500 to-purple-600 rounded-xl blur-sm opacity-30 animate-pulse" />
        
        {/* Conteúdo */}
        <div className="relative">
          {/* Ícone animado */}
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4 relative">
            <Check className={cn(
              'w-8 h-8 text-green-600 transition-all duration-700',
              animate ? 'scale-100' : 'scale-0'
            )} />
            
            {/* Sparkles */}
            <Sparkles className={cn(
              'absolute -top-1 -right-1 w-4 h-4 text-yellow-500 transition-all duration-1000',
              animate ? 'scale-100 rotate-12' : 'scale-0 rotate-0'
            )} />
            <Sparkles className={cn(
              'absolute -bottom-1 -left-1 w-3 h-3 text-blue-500 transition-all duration-1000 delay-200',
              animate ? 'scale-100 -rotate-12' : 'scale-0 rotate-0'
            )} />
          </div>
          
          {/* Texto */}
          <h3 className={cn(
            'text-lg font-semibold text-gray-900 mb-2 transition-all duration-500 delay-300',
            animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          )}>
            {title}
          </h3>
          
          <p className={cn(
            'text-sm text-gray-600 transition-all duration-500 delay-500',
            animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          )}>
            {message}
          </p>
        </div>
      </div>
    </div>
  )
} 