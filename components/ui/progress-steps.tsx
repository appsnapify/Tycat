'use client'

import React from 'react'
import { Phone, Shield, QrCode } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Step {
  id: string
  title: string
  subtitle: string
  icon: React.ComponentType<{ className?: string }>
}

interface ProgressStepsProps {
  currentStep: string
  completedSteps: string[]
  className?: string
}

const steps: Step[] = [
  {
    id: 'phone',
    title: 'Verificar',
    subtitle: 'Confirme seu número',
    icon: Phone
  },
  {
    id: 'auth',
    title: 'Autenticar',
    subtitle: 'Login ou registro',
    icon: Shield
  },
  {
    id: 'qr',
    title: 'QR Code',
    subtitle: 'Gerar acesso',
    icon: QrCode
  }
]

export function ProgressSteps({ currentStep, completedSteps, className }: ProgressStepsProps) {
  return (
    <div className={cn("w-full max-w-3xl mx-auto px-4", className)}>
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isActive = step.id === currentStep;
          const isCompleted = completedSteps.includes(step.id);
          const Icon = step.icon;
          
          return (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center text-center">
                {/* Círculo com ícone */}
                <div className={cn(
                  "w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300",
                  {
                    "bg-[#7C3AED] text-white": isActive,
                    "bg-[#F3F4F6] text-gray-400": !isActive && !isCompleted,
                    "bg-[#7C3AED]/20 text-[#7C3AED]": !isActive && isCompleted
                  }
                )}>
                  <Icon className="w-8 h-8" strokeWidth={1.5} />
                </div>

                {/* Textos */}
                <div className="mt-4 space-y-1">
                  <p className={cn(
                    "text-sm font-semibold",
                    {
                      "text-[#7C3AED]": isActive,
                      "text-gray-900": !isActive && isCompleted,
                      "text-gray-500": !isActive && !isCompleted
                    }
                  )}>
                    {step.title}
                  </p>
                  <p className="text-xs text-gray-500">
                    {step.subtitle}
                  </p>
                </div>
              </div>

              {/* Linha conectora */}
              {index < steps.length - 1 && (
                <div className="flex-1 mx-4 h-[2px] bg-gray-200">
                  <div 
                    className="h-full bg-[#7C3AED] transition-all duration-300"
                    style={{ 
                      width: isCompleted ? '100%' : '0%',
                      opacity: isCompleted ? 1 : 0
                    }}
                  />
                </div>
              )}
            </React.Fragment>
          )
        })}
      </div>
    </div>
  )
} 