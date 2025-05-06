"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { motion } from 'framer-motion'
import { ArrowLeft, Mail, Lock, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/hooks/use-auth'
import { Alert, AlertDescription } from '@/components/ui/alert'

// Cores modernizadas
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

interface FormData {
  email: string
  password: string
}

export default function LoginPage() {
  const router = useRouter()
  const { signIn } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: ''
  })

  // Efeito para limpar sessão quando há erro de autenticação
  useEffect(() => {
    const hasAuthError = new URLSearchParams(window.location.search).has('auth_error');
    
    if (hasAuthError) {
      // Limpar URL
      if (window.history && window.history.replaceState) {
        const url = new URL(window.location.href);
        url.searchParams.delete('auth_error');
        window.history.replaceState({}, document.title, url.toString());
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      await signIn(formData.email, formData.password)
      // Se chegou aqui, o login foi bem sucedido
      setIsLoading(false)
    } catch (error: any) {
      console.error('Erro ao fazer login:', error)
      setIsLoading(false) // Garantir que o loading seja resetado em caso de erro
      
      if (error?.message?.includes('Invalid login credentials') || 
          error?.message?.includes('Email ou senha incorretos')) {
        setError('Email ou senha incorretos. Por favor, verifique suas credenciais e tente novamente.')
      } else if (error?.message?.includes('rate limit')) {
        setError('Muitas tentativas de login. Por favor, aguarde alguns minutos antes de tentar novamente.')
      } else {
        setError(`Ocorreu um erro ao fazer login: ${error.message}`)
      }
    }
  }

  // Função para limpar campos e erro
  const resetForm = () => {
    setFormData({ email: '', password: '' })
    setError(null)
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

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md z-10 mt-24"
      >
        <div className="border border-gray-100 rounded-xl shadow-lg p-8 bg-white/80 backdrop-blur-lg relative overflow-hidden">
          {/* Borda decorativa lateral */}
          <div className="absolute left-0 top-0 h-full w-1.5 bg-gradient-to-b from-lime-500 to-fuchsia-500"></div>
          
          <div className="flex justify-between items-center">
            <div>
              <h2 className={`text-3xl font-bold ${colors.textPrimary}`}>Iniciar Sessão</h2>
              <p className={`mt-2 text-sm ${colors.textSecondary}`}>
                Não tem uma conta?{' '}
                <Link href="/register" className={`${colors.accentLime} font-medium`}>
                  Registre-se
                </Link>
              </p>
            </div>
            <Link href="/">
              <Button variant="ghost" className={colors.textSecondary}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
            </Link>
          </div>

          {error && (
            <Alert variant="destructive" className="mt-4 border-fuchsia-200 bg-fuchsia-50 text-fuchsia-800">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6 mt-6">
            <div>
              <Label htmlFor="email" className={`block text-sm font-medium ${colors.textPrimary}`}>
                E-mail
              </Label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className={`h-5 w-5 text-lime-500`} />
                </div>
                <Input
                  id="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={`pl-10 bg-white/70 border-gray-200 text-gray-900 rounded-md focus:ring-1 focus:ring-lime-500 focus:border-lime-500`}
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="password" className={`block text-sm font-medium ${colors.textPrimary}`}>
                Palavra-passe
              </Label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className={`h-5 w-5 text-fuchsia-500`} />
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className={`pl-10 bg-white/70 border-gray-200 text-gray-900 rounded-md focus:ring-1 focus:ring-fuchsia-500 focus:border-fuchsia-500`}
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="flex items-center justify-center">
              <Button 
                type="submit" 
                disabled={isLoading}
                className={`${colors.bgAccentLime} text-white w-full font-semibold shadow-md`}
              >
                {isLoading ? 'A iniciar sessão...' : 'Iniciar Sessão'}
              </Button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <p className={`text-sm ${colors.textSecondary}`}>
              Esqueceu sua senha?{" "}
              <Link href="/forgot-password" className={`font-medium ${colors.accentMagenta}`}>
                Recuperar Acesso
              </Link>
            </p>
          </div>
        </div>

        {/* Sombra adicional para profundidade */}
        <div className="h-2 mx-8 bg-gradient-to-r from-transparent via-gray-200 to-transparent rounded-full opacity-50 mt-1"></div>
      </motion.div>
    </div>
  )
}

