'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { Loader2, X } from 'lucide-react'
import { formatPortugalTime } from '@/lib/utils/time'

type ScannerFeedbackProps = {
  success: boolean
  error: string | null
  status: 'success' | 'error' | 'already-checked' | 'processing'
  guest_name: string
  guest_phone: string
  check_in_time: string | null
  already_checked_in?: boolean
  onClear?: () => void
}

export default function ScannerFeedback({
  success,
  error,
  status,
  guest_name,
  guest_phone,
  check_in_time,
  already_checked_in,
  onClear
}: ScannerFeedbackProps) {
  const [visible, setVisible] = useState(false)
  const [message, setMessage] = useState('')
  const [currentStatus, setCurrentStatus] = useState<'success' | 'error' | 'already-checked' | 'processing'>('success')

  useEffect(() => {
    // Reset visibility quando props mudam
    setVisible(false)
    
    // Pequeno delay para permitir transição suave
    const showTimer = setTimeout(() => {
      // Sempre mostra feedback em processamento
      if (status === 'processing') {
        setVisible(true)
        setMessage('Processando QR Code...')
        setCurrentStatus('processing')
        return // Não configura timer para esconder
      }

      // Para outros estados, mostra e configura timer
      if (success || error) {
        setVisible(true)
        
        // Definir mensagem baseada no status
        if (status === 'already-checked' || already_checked_in) {
          setMessage(`Check-in já realizado: ${guest_name}`)
        } else if (success) {
          setMessage(`Check-in realizado: ${guest_name}`)
        } else {
          setMessage(error || 'Erro no processamento')
        }
        
        setCurrentStatus(status)

        // Esconde o feedback após 3 segundos apenas para estados não-processando
        const hideTimer = setTimeout(() => {
          setVisible(false)
        }, 3000)

        return () => clearTimeout(hideTimer)
      }
    }, 50)

    return () => clearTimeout(showTimer)
  }, [success, error, guest_name, status, already_checked_in])

  if (!visible) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-4">
      <div
        className={cn(
          "mx-auto max-w-sm rounded-lg p-4 shadow-lg transition-all duration-300",
          {
            'bg-green-100 border border-green-200': currentStatus === 'success',
            'bg-red-100 border border-red-200': currentStatus === 'error',
            'bg-yellow-100 border border-yellow-200': currentStatus === 'already-checked',
            'bg-blue-100 border border-blue-200': currentStatus === 'processing'
          }
        )}
      >
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 justify-between">
            <div className="flex items-center gap-2">
              {currentStatus === 'processing' && (
                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              )}
              <p
                className={cn(
                  "text-sm font-medium",
                  {
                    'text-green-800': currentStatus === 'success',
                    'text-red-800': currentStatus === 'error',
                    'text-yellow-800': currentStatus === 'already-checked',
                    'text-blue-800': currentStatus === 'processing'
                  }
                )}
              >
                {message}
              </p>
            </div>
            
            {/* Botão de fechar - só mostra se não está processando */}
            {currentStatus !== 'processing' && onClear && (
              <button
                onClick={() => {
                  setVisible(false)
                  onClear()
                }}
                className={cn(
                  "flex-shrink-0 p-1 rounded-full transition-colors",
                  {
                    'hover:bg-green-200': currentStatus === 'success',
                    'hover:bg-red-200': currentStatus === 'error',
                    'hover:bg-yellow-200': currentStatus === 'already-checked'
                  }
                )}
                title="Fechar e permitir novo scan"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          
          {/* Informações adicionais do convidado */}
          {(success || already_checked_in) && currentStatus !== 'processing' && check_in_time && (
            <div className="mt-2 text-sm">
              <p className="text-gray-600">
                Check-in: {formatPortugalTime(check_in_time)}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 