"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { motion } from 'framer-motion'
import { ArrowLeft, Mail, Lock, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/app/app/_providers/auth-provider'
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
  const { signIn, user, supabase } = useAuth()
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
      const { error: signInError } = await signIn({ email: formData.email, password: formData.password })
      
      setIsLoading(false)

      if (signInError) {
        throw signInError;
      }

      // CORRETO: Verificar a sessão no lado do cliente após o signIn bem-sucedido
      if (supabase) { 
        const { data: clientSessionData, error: clientSessionError } = await supabase.auth.getSession();
        console.log('[LoginPage] Client-side session after signIn:', clientSessionData?.session);
        if (clientSessionError) {
          console.error('[LoginPage] Error getting client-side session after signIn:', clientSessionError);
        }
      } else {
        console.warn('[LoginPage] Supabase client not available from useAuth for getSession check.');
      }
      
      // Se não houve erro, o onAuthStateChange no provider deve ter tratado o user.
      // O redirecionamento pode ser tratado aqui ou num useEffect que observa o user.
      // Por agora, vamos assumir que o provider lida com o redirecionamento ou que
      // a página de destino fará a verificação.
      // router.push('/'); // Exemplo de redirecionamento, pode ser ajustado

    } catch (error: any) {
      console.error('Erro ao fazer login:', error)
      setIsLoading(false)
      
      if (error?.message?.includes('Invalid login credentials') || 
          error?.message?.includes('Email ou senha incorretos')) {
        setError('Email ou senha incorretos. Por favor, verifique suas credenciais e tente novamente.')
      } else if (error?.message?.includes('rate limit')) {
        setError('Muitas tentativas de login. Por favor, aguarde alguns minutos antes de tentar novamente.')
      } else {
        setError(`Ocorreu um erro ao fazer login: ${error.message || 'Erro desconhecido.'}`)
      }
    }
  }

  useEffect(() => {
    if (user) { // user é do useAuth(), que é atualizado pelo onAuthStateChange
      console.log("[LoginPage] User state updated, attempting redirect to /app/organizador/dashboard");
      router.push('/app/organizador/dashboard'); 
    }
  }, [user, router]);

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
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className={`mt-1 block w-full ${colors.textPrimary}`}
              />
            </div>
            <div>
              <Label htmlFor="password" className={`block text-sm font-medium ${colors.textPrimary}`}>
                Senha
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                className={`mt-1 block w-full ${colors.textPrimary}`}
              />
            </div>
            <Button type="submit" disabled={isLoading} className={`w-full ${colors.bgAccentLime} text-white`}>
              {isLoading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  )
}