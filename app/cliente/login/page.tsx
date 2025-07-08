'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useClienteIsolado } from '@/hooks/useClienteIsolado'
import { User, Loader2, ArrowLeft, Lock, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import PhoneInput from 'react-phone-number-input'
import { isValidPhoneNumber } from 'react-phone-number-input'
import flags from 'react-phone-number-input/flags'
import 'react-phone-number-input/style.css'

// Cores modernizadas - mesmas do login principal ORIGINAL
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
}

export default function LoginPage() {
  // Estados principais
  const [phoneValue, setPhoneValue] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  
  // Estados do fluxo
  const [step, setStep] = useState<'phone' | 'password' | 'register'>('phone')
  const [isCheckingPhone, setIsCheckingPhone] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Estados para registro (caso seja utilizador novo)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  
  const { login, register, checkPhone, isAuthenticated, isLoading, error } = useClienteIsolado()
  const router = useRouter()

  // ✅ Verificar se telefone é válido
  const isPhoneValid = phoneValue ? isValidPhoneNumber(phoneValue) : false

  // ✅ Adicionar estilos personalizados para PhoneInput
  useEffect(() => {
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
      document.head.removeChild(styleTag)
    }
  }, [])

  // ✅ Redirect se já autenticado (removido para evitar conflitos)
  // useEffect(() => {
  //   if (isAuthenticated && !isLoading) {
  //     console.log('🔄 [LOGIN] Utilizador autenticado, redirecionando...')
  //     router.push('/cliente/dashboard')
  //   }
  // }, [isAuthenticated, isLoading, router])

  // ✅ PASSO 1: Verificar se telefone existe
  const handleCheckPhone = async (e: React.FormEvent) => {
    e.preventDefault()
    
    console.log('📞 [PHONE CHECK] Verificando telefone:', phoneValue)
    
    if (!phoneValue || !isPhoneValid) {
      console.log('❌ [PHONE CHECK] Telefone inválido')
      return
    }
    
    setIsCheckingPhone(true)
    
    try {
      // ✅ Verificar telefone usando a API REAL
      const result = await checkPhone(phoneValue)
      
      if (result.exists) {
        console.log('✅ [PHONE CHECK] Telefone encontrado na BD, mostrando password')
        setStep('password')
      } else {
        console.log('📝 [PHONE CHECK] Telefone não encontrado na BD, registo necessário')
        setStep('register')
      }
      
    } catch (error) {
      console.error('❌ [PHONE CHECK] Erro:', error)
      // Em caso de erro, permitir registo
      setStep('register')
    } finally {
      setIsCheckingPhone(false)
    }
  }

  // ✅ PASSO 2: Login com password
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    console.log('🔐 [LOGIN] Fazendo login com password')
    
    if (!password.trim()) {
      console.log('❌ [LOGIN] Password vazia')
      return
    }
    
    setIsSubmitting(true)
    
    try {
      const success = await login(phoneValue, password)
      
      if (success) {
        console.log('🚀 [LOGIN] Login bem-sucedido! Redirecionando...')
        // ✅ Redirect direto e forçado
        window.location.href = '/cliente/dashboard'
        return // Não continuar execução
      } else {
        console.log('❌ [LOGIN] Falha no login')
      }
    } catch (error) {
      console.error('💥 [LOGIN] Erro:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // ✅ PASSO 3: Registro de novo utilizador
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    
    console.log('📝 [REGISTER] Registando novo utilizador')
    
    if (!firstName.trim() || !lastName.trim() || !password.trim()) {
      console.log('❌ [REGISTER] Campos obrigatórios em falta')
      return
    }
    
    setIsSubmitting(true)
    
    try {
      const success = await register(phoneValue, firstName.trim(), lastName.trim(), password)
      
      if (success) {
        console.log('🚀 [REGISTER] Registo bem-sucedido! Redirecionando...')
        // ✅ Redirect direto e forçado
        window.location.href = '/cliente/dashboard'
        return // Não continuar execução
      }
    } catch (error) {
      console.error('💥 [REGISTER] Erro:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // ✅ Voltar ao passo anterior
  const handleBack = () => {
    if (step === 'password' || step === 'register') {
      setStep('phone')
      setPassword('')
      setFirstName('')
      setLastName('')
    }
  }

  // ✅ Se já autenticado, mostrar loading
  if (isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center text-gray-800">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>A redirecionar...</p>
        </div>
      </div>
    )
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

      <div className="w-full max-w-md z-10 mt-24">
        <div className="border border-gray-100 rounded-xl shadow-lg p-8 bg-white/80 backdrop-blur-lg relative overflow-hidden">
          {/* Borda decorativa lateral */}
          <div className="absolute left-0 top-0 h-full w-1.5 bg-gradient-to-b from-lime-500 to-fuchsia-500"></div>
          
          <div className="flex justify-between items-center">
            <div>
              <h2 className={`text-3xl font-bold ${colors.textPrimary}`}>Área do Cliente</h2>
              <p className={`mt-2 text-sm ${colors.textSecondary}`}>
                {step === 'phone' && 'Entre com o seu número de telefone'}
                {step === 'password' && 'Digite a sua palavra-passe'}
                {step === 'register' && 'Complete o seu registo'}
              </p>
            </div>
            
            {step === 'phone' ? (
              <Link href="/login">
                <Button variant="ghost" className={colors.textSecondary}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar
                </Button>
              </Link>
            ) : (
              <Button variant="ghost" onClick={handleBack} className={colors.textSecondary}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
            )}
          </div>

          <div className="mt-6">
            {/* PASSO 1: Verificar Telefone */}
            {step === 'phone' && (
              <form onSubmit={handleCheckPhone} className="space-y-6">
                <div>
                  <label className={`block text-sm font-medium ${colors.textPrimary} mb-2`}>
                    Número de telefone
                  </label>
                  <div className="relative">
                    <PhoneInput
                      international={false}
                      value={phoneValue}
                      onChange={(value) => {
                        console.log('📞 [PHONE] Novo valor:', value);
                        setPhoneValue(value || '');
                      }}
                      defaultCountry="PT"
                      flags={flags}
                      className="w-full rounded-lg bg-white/70 border border-gray-300 text-gray-900 focus:ring-2 focus:ring-lime-500 focus:border-lime-500"
                      placeholder="Número de telefone"
                    />
                  </div>
                  
                  {/* Validação em tempo real */}
                  {phoneValue && (
                    <div className="flex items-center gap-2 mt-2">
                      {isPhoneValid ? (
                        <>
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-xs text-green-600">✓ Formato de número válido!</span>
                        </>
                      ) : (
                        <>
                          <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                          <span className="text-xs text-orange-600">Formato de número incompleto ou inválido</span>
                        </>
                      )}
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isCheckingPhone || !phoneValue || !isPhoneValid}
                  className={`w-full ${colors.bgAccentLime} hover:opacity-90 disabled:bg-gray-400 disabled:cursor-not-allowed text-white py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2`}
                >
                  {isCheckingPhone ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>A verificar na base de dados...</span>
                    </>
                  ) : (
                    <span>Verificar Telefone</span>
                  )}
                </button>
              </form>
            )}

            {/* PASSO 2: Inserir Password */}
            {step === 'password' && (
              <form onSubmit={handleLogin} className="space-y-6">
                <div>
                  <label className={`block text-sm font-medium ${colors.textPrimary} mb-2`}>
                    Telefone confirmado: {phoneValue}
                  </label>
                  <div className="text-xs text-green-600 mb-4">✓ Número encontrado na base de dados</div>
                </div>

                <div>
                  <label className={`block text-sm font-medium ${colors.textPrimary} mb-2`}>
                    Palavra-passe
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="A sua palavra-passe"
                      className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-lime-500 focus:border-transparent"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-red-600 text-sm">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting || !password.trim()}
                  className={`w-full ${colors.bgAccentLime} hover:opacity-90 disabled:bg-gray-400 disabled:cursor-not-allowed text-white py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2`}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>A entrar...</span>
                    </>
                  ) : (
                    <span>Entrar</span>
                  )}
                </button>
              </form>
            )}

            {/* PASSO 3: Registo de Novo Utilizador */}
            {step === 'register' && (
              <form onSubmit={handleRegister} className="space-y-6">
                <div>
                  <label className={`block text-sm font-medium ${colors.textPrimary} mb-2`}>
                    Novo utilizador detectado
                  </label>
                  <div className="text-xs text-blue-600 mb-4">📱 {phoneValue} não está registado na base de dados. Vamos criar a sua conta!</div>
                </div>

                <div>
                  <label className={`block text-sm font-medium ${colors.textPrimary} mb-2`}>
                    Primeiro nome
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="João"
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-lime-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className={`block text-sm font-medium ${colors.textPrimary} mb-2`}>
                    Apelido
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Silva"
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-lime-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className={`block text-sm font-medium ${colors.textPrimary} mb-2`}>
                    Criar palavra-passe
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-lime-500 focus:border-transparent"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-red-600 text-sm">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting || !firstName.trim() || !lastName.trim() || !password.trim() || password.length < 6}
                  className={`w-full ${colors.bgAccentLime} hover:opacity-90 disabled:bg-gray-400 disabled:cursor-not-allowed text-white py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2`}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>A criar conta na base de dados...</span>
                    </>
                  ) : (
                    <span>Criar conta e entrar</span>
                  )}
                </button>
              </form>
            )}
          </div>

          <div className="mt-6 text-center space-y-2">
            <p className={`text-sm ${colors.textSecondary}`}>
              Não tem conta?{" "}
              <Link href="/cliente/registo" className={`font-medium ${colors.accentLime}`}>
                Criar conta completa
              </Link>
            </p>
            <p className={`text-sm ${colors.textSecondary}`}>
              Sou organizador ou promotor{" "}
              <Link href="/login" className={`font-medium ${colors.accentMagenta}`}>
                Acessar
              </Link>
            </p>
          </div>
        </div>

        {/* Sombra adicional para profundidade */}
        <div className="h-2 mx-8 bg-gradient-to-r from-transparent via-gray-200 to-transparent rounded-full opacity-50 mt-1"></div>
      </div>
    </div>
  )
} 