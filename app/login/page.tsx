"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { motion } from 'framer-motion'
import { ArrowLeft, Mail, Lock, AlertTriangle, Info } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/hooks/use-auth'
import { resetSession } from '@/lib/auth'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { createClient } from '@supabase/supabase-js'

interface FormData {
  email: string
  password: string
}

export default function LoginPage() {
  const router = useRouter()
  const { signIn } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<string | null>(null)
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
    setDebugInfo(null)

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
    setDebugInfo(null)
  }

  // Função para testar a conexão direta com o Supabase
  const testSupabaseConnection = async () => {
    setDebugInfo("Testando conexão com Supabase...");
    try {
      // Criar um cliente Supabase diretamente
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      
      // Tentar obter informação pública para testar a conexão
      const { data, error } = await supabase.from('profiles').select('count').limit(1)
      
      if (error) {
        setDebugInfo(`Erro na conexão: ${error.message}`);
        return;
      }
      
      // Verificar se há tokens no localStorage
      const tokens = Object.keys(localStorage)
        .filter(key => key.startsWith('sb-') || key.includes('supabase'))
        .map(key => `${key}: ${localStorage.getItem(key) ? "Existe" : "Vazio"}`)
        .join('\n');
      
      // Mostrar informações de depuração
      setDebugInfo(`
Conexão com Supabase: OK
URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL}
Tokens no localStorage:
${tokens || "Nenhum token encontrado"}
      `);
    } catch (error: any) {
      setDebugInfo(`Erro ao testar conexão: ${error.message}`);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
        <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-lg shadow-xl p-8">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-bold">Iniciar Sessão</h2>
              <p className="mt-2 text-sm text-gray-600">
                Não tem uma conta?{' '}
                <Link href="/register" className="text-blue-600 hover:text-blue-800">
                  Registre-se
                </Link>
              </p>
            </div>
            <Link href="/">
              <Button variant="ghost" className="text-gray-600 hover:text-gray-800">
                Voltar
              </Button>
          </Link>
          </div>

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {debugInfo && (
            <Alert className="mt-4 bg-blue-50 text-blue-800 border-blue-300">
              <Info className="h-4 w-4" />
              <AlertDescription>
                <pre className="whitespace-pre-wrap text-xs">{debugInfo}</pre>
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6 mt-6">
            <div>
              <Label htmlFor="email" className="block text-sm font-medium text-gray-700">
                E-mail
              </Label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <Input
                  id="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="pl-10"
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Palavra-passe
              </Label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
              </div>
                <Input
                  id="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="pl-10"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => testSupabaseConnection()}
                className="flex items-center"
              >
                <Info className="h-4 w-4 mr-2" />
                Testar Conexão
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'A iniciar sessão...' : 'Iniciar Sessão'}
              </Button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Ainda não tem uma conta?{" "}
              <Link href="/register" className="font-medium text-indigo-600 hover:text-indigo-500">
                Criar Conta
              </Link>
            </p>
          </div>
          </div>
        </motion.div>
    </div>
  )
}

