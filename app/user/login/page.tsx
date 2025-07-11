'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import { Phone, User, Lock, Eye, EyeOff, Loader2 } from 'lucide-react'
import PhoneInput from 'react-phone-number-input'
import { isValidPhoneNumber } from 'react-phone-number-input'
import flags from 'react-phone-number-input/flags'
import 'react-phone-number-input/style.css'

// ✅ Cores modernizadas - mesmas do design original (cliente)
const colors = {
  background: 'bg-gradient-to-br from-gray-100 via-gray-50 to-white',
  textPrimary: 'text-gray-800',
  textSecondary: 'text-gray-500',
  accentLime: 'text-lime-600',
  accentMagenta: 'text-fuchsia-600',
  bgAccentLime: 'bg-lime-500',
  bgAccentMagenta: 'bg-fuchsia-500',
  borderLime: 'border-lime-400',
  borderFuchsia: 'border-fuchsia-200',
  cardBg: 'bg-white/90',
  borderLight: 'border-gray-200',
}

export default function UserLoginPage() {
  const router = useRouter()
  const { login, register, checkPhone, error, clearError } = useUser()
  
  // Limpar sessão ao montar o componente
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userKeys = Object.keys(localStorage).filter(key => 
        key.startsWith('user-system-') || 
        key.startsWith('user-cache-') ||
        key.startsWith('user-auth')
      )
      
      userKeys.forEach(key => {
        localStorage.removeItem(key)
      })
    }
  }, [])

  // Estados do fluxo
  const [step, setStep] = useState<'phone' | 'password' | 'register'>('phone')
  const [phoneValue, setPhoneValue] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // ✅ Verificar se telefone é válido
  const isPhoneValid = phoneValue ? isValidPhoneNumber(phoneValue) : false

  // ✅ Adicionar estilos personalizados para PhoneInput
  useState(() => {
    if (typeof document !== 'undefined') {
      const styleTag = document.createElement('style')
      styleTag.innerHTML = `
        .PhoneInputInput {
          flex: 1;
          border: none;
          background: transparent;
          outline: none;
          font-size: 1rem;
          padding: 0.75rem 0.5rem;
          width: 100%;
          color: rgb(31 41 55);
        }
        .PhoneInputInput:focus {
          outline: none;
        }
        .PhoneInputCountry {
          margin-right: 0.5rem;
          display: flex;
          align-items: center;
        }
        .PhoneInputCountryIcon {
          width: 1.5rem;
          height: 1rem;
          border-radius: 2px;
          overflow: hidden;
        }
        .PhoneInputCountrySelectArrow {
          margin-left: 0.25rem;
          width: 0.5rem;
          height: 0.5rem;
          border-style: solid;
          border-color: currentColor transparent transparent;
          border-width: 0.25rem 0.25rem 0;
          opacity: 0.6;
        }
      `
      document.head.appendChild(styleTag)
      
      return () => {
        if (document.head.contains(styleTag)) {
          document.head.removeChild(styleTag)
        }
      }
    }
  })

  // PASSO 1: Verificar telemóvel
  const handleCheckPhone = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!phoneValue || !isPhoneValid) {
      return
    }

    setIsLoading(true)
    clearError()
    
    try {
      const result = await checkPhone(phoneValue)
      
      if (result.status === 'BLOQUEADO') {
        setError(result.message)
        return
      }
    
      if (result.exists) {
        setStep('password')
      } else {
        setStep('register')
      }
      
    } catch (error) {
      console.error('[LOGIN] Erro na verificação:', error)
      setError('Erro ao verificar telemóvel. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }

  // PASSO 2: Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!password.trim()) {
      return
    }

    setIsLoading(true)
    clearError()
    
    try {
      const success = await login(phoneValue, password)
    
      if (success) {
        router.push('/user/dashboard')
        return
      }
    } catch (error) {
      console.error('[LOGIN] Erro no login:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // PASSO 3: Registo
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!firstName.trim() || !lastName.trim() || !password.trim()) {
      return
    }

    setIsLoading(true)
    clearError()
    
    try {
      const success = await register(phoneValue, firstName.trim(), lastName.trim(), password)
    
      if (success) {
        router.push('/user/dashboard')
        return
      }
    } catch (error) {
      console.error('[LOGIN] Erro no registro:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleBack = () => {
    if (step === 'password' || step === 'register') {
      setStep('phone')
      setPassword('')
      setFirstName('')
      setLastName('')
      clearError()
    }
  }

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center ${colors.background} py-12 px-4 sm:px-6 lg:px-8 relative`}>
      {/* Elementos decorativos no fundo */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -left-20 w-96 h-96 bg-lime-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
        <div className="absolute top-0 -right-20 w-96 h-96 bg-fuchsia-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
        <div className="absolute -bottom-32 left-1/2 transform -translate-x-1/2 w-96 h-96 bg-lime-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
      </div>

      {/* Elemento decorativo superior */}
      <div className="absolute top-8 left-1/2 transform -translate-x-1/2 flex items-center justify-center mb-8">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-lime-500 to-fuchsia-500 flex items-center justify-center shadow-lg">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </div>
        <div className="ml-3 text-2xl font-bold text-gray-800">SNAP</div>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className={`text-3xl font-bold ${colors.textPrimary} mb-2`}>Bem-vindo!</h1>
          <p className={colors.textSecondary}>
            {step === 'phone' && 'Entre com o seu número de telemóvel'}
            {step === 'password' && 'Digite a sua palavra-passe'}
            {step === 'register' && 'Complete o seu registo'}
          </p>
        </div>

        {/* Forms */}
        <div className={`${colors.cardBg} backdrop-blur-lg rounded-xl p-6 border ${colors.borderLight} shadow-lg`}>
          {step === 'phone' && (
            <form onSubmit={handleCheckPhone} className="space-y-4">
              <div>
                <label className={`block text-sm font-medium ${colors.textPrimary} mb-2`}>
                  Número de telemóvel
                </label>
                <div className={`relative border ${colors.borderLight} rounded-lg ${colors.cardBg} focus-within:border-lime-400 focus-within:ring-1 focus-within:ring-lime-400 transition-colors`}>
                  <PhoneInput
                    international
                    defaultCountry="PT"
                    value={phoneValue}
                    onChange={setPhoneValue}
                    flags={flags}
                    className="w-full flex items-center px-3 py-3"
                    numberInputProps={{
                      className: 'PhoneInputInput'
                    }}
                  />
                </div>
                {phoneValue && !isPhoneValid && (
                  <p className="mt-1 text-sm text-red-600">Formato de telemóvel inválido</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading || !phoneValue || !isPhoneValid}
                className={`w-full ${colors.bgAccentLime} hover:bg-lime-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2`}
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  'Verificar Telemóvel'
                )}
              </button>
            </form>
          )}

          {step === 'password' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="text-center mb-4">
                <p className="text-lime-600 text-sm">✓ Telemóvel: {phoneValue}</p>
              </div>

              <div>
                <label className={`block text-sm font-medium ${colors.textPrimary} mb-2`}>
                  Palavra-passe
                </label>
                <div className="relative">
                  <Lock className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${colors.textSecondary} w-5 h-5`} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="A sua palavra-passe"
                    className={`w-full pl-10 pr-12 py-3 ${colors.cardBg} border ${colors.borderLight} rounded-lg ${colors.textPrimary} placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-lime-400 focus:border-transparent transition-colors`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${colors.textSecondary} hover:${colors.textPrimary} transition-colors`}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleBack}
                  className={`flex-1 bg-gray-200 hover:bg-gray-300 ${colors.textPrimary} py-3 px-4 rounded-lg transition-colors`}
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !password}
                  className={`flex-2 ${colors.bgAccentLime} hover:bg-lime-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2`}
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    'Entrar'
                  )}
                </button>
              </div>
            </form>
          )}

          {step === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="text-center mb-4">
                <p className="text-fuchsia-600 text-sm">📱 Novo utilizador: {phoneValue}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-sm font-medium ${colors.textPrimary} mb-2`}>
                    Primeiro nome
                  </label>
                  <div className="relative">
                    <User className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${colors.textSecondary} w-5 h-5`} />
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="João"
                      className={`w-full pl-10 pr-4 py-3 ${colors.cardBg} border ${colors.borderLight} rounded-lg ${colors.textPrimary} placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-400 focus:border-transparent transition-colors`}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className={`block text-sm font-medium ${colors.textPrimary} mb-2`}>
                    Apelido
                  </label>
                  <div className="relative">
                    <User className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${colors.textSecondary} w-5 h-5`} />
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Silva"
                      className={`w-full pl-10 pr-4 py-3 ${colors.cardBg} border ${colors.borderLight} rounded-lg ${colors.textPrimary} placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-400 focus:border-transparent transition-colors`}
                      required
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium ${colors.textPrimary} mb-2`}>
                  Criar palavra-passe
                </label>
                <div className="relative">
                  <Lock className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${colors.textSecondary} w-5 h-5`} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className={`w-full pl-10 pr-12 py-3 ${colors.cardBg} border ${colors.borderLight} rounded-lg ${colors.textPrimary} placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-400 focus:border-transparent transition-colors`}
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${colors.textSecondary} hover:${colors.textPrimary} transition-colors`}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleBack}
                  className={`flex-1 bg-gray-200 hover:bg-gray-300 ${colors.textPrimary} py-3 px-4 rounded-lg transition-colors`}
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !firstName || !lastName || !password}
                  className={`flex-2 ${colors.bgAccentMagenta} hover:bg-fuchsia-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2`}
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    'Criar Conta'
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Error Display */}
          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-xs text-gray-500">
            Sistema User v1.0 - Powered by SNAP
          </p>
        </div>
      </div>
    </div>
  )
} 