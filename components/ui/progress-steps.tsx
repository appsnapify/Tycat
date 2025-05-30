'use client'

import React from 'react'
import { Check, Phone, Shield, QrCode } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Step {
  id: string
  title: string
  description: string
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
    title: 'Verificar Telefone',
    description: 'Confirme seu número',
    icon: Phone
  },
  {
    id: 'auth',
    title: 'Autenticar',
    description: 'Login ou registro',
    icon: Shield
  },
  {
    id: 'qr',
    title: 'QR Code',
    description: 'Gerar acesso',
    icon: QrCode
  }
]

export function ProgressSteps({ currentStep, completedSteps, className }: ProgressStepsProps) {
  const getStepStatus = (stepId: string) => {
    if (completedSteps.includes(stepId)) return 'completed'
    if (stepId === currentStep) return 'current'
    return 'pending'
  }

  return (
    <div className={cn('w-full py-4', className)}>
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const status = getStepStatus(step.id)
          const Icon = step.icon
          
          return (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center">
                {/* Ícone do step */}
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200',
                    {
                      'bg-green-100 text-green-600 border-2 border-green-600': status === 'completed',
                      'bg-blue-100 text-blue-600 border-2 border-blue-600 ring-2 ring-blue-200': status === 'current',
                      'bg-gray-100 text-gray-400 border-2 border-gray-200': status === 'pending'
                    }
                  )}
                >
                  {status === 'completed' ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                </div>
                
                {/* Título e descrição */}
                <div className="mt-2 text-center">
                  <p className={cn(
                    'text-xs font-medium',
                    {
                      'text-green-600': status === 'completed',
                      'text-blue-600': status === 'current',
                      'text-gray-400': status === 'pending'
                    }
                  )}>
                    {step.title}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {step.description}
                  </p>
                </div>
              </div>
              
              {/* Linha conectora */}
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'flex-1 h-0.5 mx-4 transition-all duration-200',
                    {
                      'bg-green-600': completedSteps.includes(step.id),
                      'bg-gray-200': !completedSteps.includes(step.id)
                    }
                  )}
                />
              )}
            </React.Fragment>
          )
        })}
      </div>
    </div>
  )
} 