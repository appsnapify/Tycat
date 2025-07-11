'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useClienteIsolado } from '@/hooks/useClienteIsolado'
import { Phone, User, Loader2 } from 'lucide-react'

export default function ClienteLoginPage() {
  const [phone, setPhone] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [showNameFields, setShowNameFields] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const { login, isAuthenticated, isLoading, error } = useClienteIsolado()
  const router = useRouter()

  // ✅ Redirect se já autenticado - PARA URL CORRETA
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      router.push('/cliente-isolado/dashboard')
    }
  }, [isAuthenticated, isLoading, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!phone) return
    
    setIsSubmitting(true)
    
    const success = await login(
      phone,
      showNameFields ? firstName : undefined,
      showNameFields ? lastName : undefined
    )
    
    if (success) {
      router.push('/cliente-isolado/dashboard')
    } else {
      // Se falhou, pode ser utilizador novo
      if (!showNameFields) {
        setShowNameFields(true)
      }
    }
    
    setIsSubmitting(false)
  }

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    
    if (numbers.length <= 9) {
      return numbers.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3').trim()
    }
    
    return numbers.substring(0, 9).replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3')
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value)
    setPhone(formatted)
  }

  // ✅ Se já autenticado, mostrar loading
  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center text-white">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>A redirecionar para dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Bem-vindo!</h1>
          <p className="text-gray-400">Entre com o seu número de telefone</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Phone Input */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Número de telefone
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="tel"
                value={phone}
                onChange={handlePhoneChange}
                placeholder="123 456 789"
                className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                maxLength={11}
              />
            </div>
          </div>

          {/* Name Fields (conditional) */}
          {showNameFields && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Primeiro nome
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="João"
                    className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required={showNameFields}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Apelido
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Silva"
                    className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required={showNameFields}
                  />
                </div>
              </div>
            </>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-900/20 border border-red-700 rounded-lg p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            {(isSubmitting || isLoading) ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : null}
            {showNameFields ? 'Criar conta e entrar' : 'Entrar'}
          </button>
        </form>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-xs text-gray-500">
            Sistema cliente otimizado
          </p>
        </div>
      </div>
    </div>
  )
} 