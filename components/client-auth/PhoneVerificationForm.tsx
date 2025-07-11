'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, RefreshCw, Phone, Shield, QrCode } from 'lucide-react'
import PhoneInput from 'react-phone-number-input'
import flags from 'react-phone-number-input/flags'
import 'react-phone-number-input/style.css'
import { Progress } from '@/components/ui/progress'
import { isValidPhoneNumber } from 'react-phone-number-input'
import React from 'react'

interface PhoneVerificationFormProps {
  onVerified: (phone: string, exists: boolean, userId?: string | null) => void
  defaultPhone?: string
}

export function PhoneVerificationForm({ onVerified, defaultPhone = '' }: PhoneVerificationFormProps) {
  const [phone, setPhone] = useState<string>(defaultPhone)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [progress, setProgress] = useState(0)
  const [retryCount, setRetryCount] = useState(0)
  const timeoutRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const updateProgress = (step: number) => {
    setProgress(step * 33.33)
  }

  const handleVerifyPhone = async () => {
    if (!phone) {
      setError('Por favor, introduz o teu número de telefone')
      return
    }

    if (!isValidPhoneNumber(phone)) {
      setError('Por favor, introduz um número válido')
      return
    }

    setLoading(true)
    setError('')
    updateProgress(1)

    try {
      updateProgress(2)
      
      const response = await fetch('/api/client-auth/check-phone', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone }),
      })
      
      if (!response.ok) {
        throw new Error('Erro na verificação')
      }

      const result = await response.json()

      if (result.success) {
        updateProgress(3)
        await new Promise(resolve => setTimeout(resolve, 500))
        onVerified(phone, result.exists, result.userId)
      } else {
        throw new Error(result.error || 'Erro na verificação')
      }
    } catch (error) {
      console.error('Erro na verificação:', error)
      setError('Erro ao verificar número. Tenta novamente.')
      setRetryCount(prev => prev + 1)
      updateProgress(0)
    } finally {
      setLoading(false)
    }
  }

  const handleRetry = () => {
    setError('')
    setProgress(0)
    setRetryCount(0)
  }

  return (
    <div className="w-full max-w-md mx-auto px-6 py-8">
      {/* Progress Steps - VERSÃO ORIGINAL EXATA */}
      <div className="flex items-center justify-center mb-12">
        <div className="flex items-center space-x-8">
          {/* Step 1: Verificar Telefone */}
          <div className="flex flex-col items-center">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
              progress > 0 
                ? 'bg-blue-500' 
                : 'bg-gray-200'
            }`}>
              <Phone className={`w-8 h-8 ${progress > 0 ? 'text-white' : 'text-gray-400'}`} />
            </div>
            <div className="mt-3 text-center">
              <p className="text-sm font-medium text-gray-900">Verificar Telefone</p>
              <p className="text-xs text-gray-500 mt-1">Confirme seu número</p>
            </div>
          </div>

          {/* Linha conectora 1 */}
          <div className={`w-16 h-[2px] ${progress > 33 ? 'bg-blue-500' : 'bg-gray-300'}`}></div>

          {/* Step 2: Autenticar */}
          <div className="flex flex-col items-center">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
              progress > 33 
                ? 'bg-blue-500' 
                : 'bg-gray-200'
            }`}>
              <Shield className={`w-8 h-8 ${progress > 33 ? 'text-white' : 'text-gray-400'}`} />
              </div>
            <div className="mt-3 text-center">
              <p className="text-sm font-medium text-gray-900">Autenticar</p>
              <p className="text-xs text-gray-500 mt-1">Login ou registro</p>
              </div>
          </div>
          
          {/* Linha conectora 2 */}
          <div className={`w-16 h-[2px] ${progress > 66 ? 'bg-blue-500' : 'bg-gray-300'}`}></div>

          {/* Step 3: QR Code */}
          <div className="flex flex-col items-center">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
              progress > 66 
                ? 'bg-blue-500' 
                : 'bg-gray-200'
            }`}>
              <QrCode className={`w-8 h-8 ${progress > 66 ? 'text-white' : 'text-gray-400'}`} />
            </div>
            <div className="mt-3 text-center">
              <p className="text-sm font-medium text-gray-900">QR Code</p>
              <p className="text-xs text-gray-500 mt-1">Gerar acesso</p>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-8">
        <Progress value={progress} className="h-2" />
      </div>

      {/* Phone Input - VERSÃO ORIGINAL */}
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Número de telemóvel
          </label>
          <PhoneInput
            international
            defaultCountry="PT"
            value={phone}
            onChange={setPhone}
            placeholder="Introduz o teu número"
            className="w-full"
            disabled={loading}
            style={{
              '--PhoneInputCountryFlag-height': '1.2em',
              '--PhoneInput-color--focus': '#6366f1',
            }}
          />
        </div>

        {error && (
          <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="text-red-600 text-sm">{error}</div>
            {retryCount > 0 && (
              <Button 
                variant="ghost"
                size="sm"
                onClick={handleRetry}
                className="text-red-600 hover:text-red-700"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            )}
          </div>
            )}
            
            <Button 
          onClick={handleVerifyPhone}
          disabled={loading || !phone}
          className="w-full bg-[#6366f1] hover:bg-[#4f46e5] text-white py-3 rounded-md font-medium"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Verificando...
                </>
              ) : (
            'Continuar'
              )}
            </Button>
          </div>
    </div>
  )
} 