"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
// motion removed for performance
import { ArrowLeft, Mail, Lock, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Alert, AlertDescription } from '@/components/ui/alert'

// Cores alinhadas com a homepage TYCAT
const colors = {
  background: 'bg-gradient-to-br from-slate-50 via-white to-emerald-50/30',
  textPrimary: 'text-slate-800',
  textSecondary: 'text-slate-600',
  textMuted: 'text-slate-500',
  accentEmerald: 'text-emerald-600',
  accentViolet: 'text-violet-600',
  bgAccentEmerald: 'bg-emerald-500',
  bgAccentViolet: 'bg-violet-500',
  borderEmerald: 'border-emerald-400',
  borderViolet: 'border-violet-200',
}

interface FormData {
  email: string
  password: string
}

// Normalizar role do usuário
const normalizeUserRole = (role: string): string => {
  return role?.toLowerCase() || 'desconhecido';
};

// Determinar URL para promotor
const getPromotorUrl = (userMetadata?: any): string => {
  return userMetadata?.team_id 
    ? '/app/promotor/dashboard' 
    : '/app/promotor/equipes/escolha';
};

// Mapear role para URL
const getRoleUrl = (normalizedRole: string, userMetadata?: any): string => {
  const roleMap: Record<string, string> = {
    'organizador': '/app/organizador/dashboard',
    'organizer': '/app/organizador/dashboard',
    'chefe-equipe': '/app/chefe-equipe/dashboard',
    'team-leader': '/app/chefe-equipe/dashboard'
  };
  
  if (roleMap[normalizedRole]) {
    return roleMap[normalizedRole];
  }
  
  if (normalizedRole === 'promotor' || normalizedRole === 'promoter') {
    return getPromotorUrl(userMetadata);
  }
  
  console.warn('[LOGIN] Role desconhecido:', normalizedRole, '- Redirecionando para página inicial');
  return '/app';
};

// FUNÇÃO CRÍTICA: Redirecionamento baseado no role
const getRedirectUrlByRole = (role: string, userMetadata?: any): string => {
  const normalizedRole = normalizeUserRole(role);
  return getRoleUrl(normalizedRole, userMetadata);
};

export default function LoginPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: ''
  })

  // Verificar se o usuário já está autenticado e redirecionar
  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session?.user) {
          const userRole = session.user.user_metadata?.role
          const redirectUrl = getRedirectUrlByRole(userRole, session.user.user_metadata)
          router.push(redirectUrl)
        }
      } catch (error) {
        console.error('Erro ao verificar sessão:', error)
      }
    }

    checkAuthAndRedirect()
  }, [router])

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

  // ✅ MAPA DE ERROS: Tratamento centralizado (Complexidade: 0)
  const LOGIN_ERROR_MESSAGES = {
    credentials: 'Email ou senha incorretos. Por favor, verifique suas credenciais e tente novamente.',
    rateLimit: 'Muitas tentativas de login. Por favor, aguarde alguns minutos antes de tentar novamente.',
    default: (message: string) => `Ocorreu um erro ao fazer login: ${message || 'Erro desconhecido.'}`
  };

  // ✅ FUNÇÃO AUXILIAR: Processar erro de login (Complexidade: 1)
  const getErrorMessage = (error: any): string => {
    const message = error?.message ?? '';
    const errorTypes = [
      { condition: message.includes('Invalid login credentials') || message.includes('Email ou senha incorretos'), type: 'credentials' },
      { condition: message.includes('rate limit'), type: 'rateLimit' }
    ];
    
    const errorType = errorTypes.find(type => type.condition);
    return errorType ? LOGIN_ERROR_MESSAGES[errorType.type] : LOGIN_ERROR_MESSAGES.default(message);
  };

  // ✅ FUNÇÃO AUXILIAR: Processar sucesso do login (Complexidade: 2)
  const handleLoginSuccess = (data: any) => {
    if (!data.user) return;                                  // +1 (if)
    
    const userRole = data.user.user_metadata?.role;
    const redirectUrl = getRedirectUrlByRole(userRole, data.user.user_metadata);
    router.push(redirectUrl);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {                                                    // +1 (try)
      const supabase = createClient();
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password
      });
      
      if (signInError) {                                     // +1 (if)
        throw signInError;
      }

      handleLoginSuccess(data);

    } catch (error: any) {                                   // +1 (catch)
      console.error('Erro ao fazer login:', error);
      setIsLoading(false);
      setError(getErrorMessage(error));
    }
  }

  // Função para limpar campos e erro
  const resetForm = () => {
    setFormData({ email: '', password: '' })
    setError(null)
  }

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center ${colors.background} py-12 px-4 sm:px-6 lg:px-8 relative`}>
      {/* Elementos decorativos no fundo - alinhados com homepage */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -left-20 w-96 h-96 bg-emerald-200 rounded-full mix-blend-multiply filter blur-3xl opacity-15"></div>
        <div className="absolute top-0 -right-20 w-96 h-96 bg-violet-200 rounded-full mix-blend-multiply filter blur-3xl opacity-15"></div>
        <div className="absolute -bottom-32 left-1/2 transform -translate-x-1/2 w-96 h-96 bg-emerald-200 rounded-full mix-blend-multiply filter blur-3xl opacity-15"></div>
      </div>

      {/* Logo TYCAT Melhorado */}
      <div className="absolute top-8 left-1/2 transform -translate-x-1/2 flex items-center justify-center mb-8">
        <div className="relative">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-violet-600 flex items-center justify-center shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
            <div className="w-8 h-8 relative">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5H7a2 2 0 00-2 2v1a2 2 0 001 1.732l1 .732a2 2 0 011 1.732V14a2 2 0 002 2h2M15 5h2a2 2 0 012 2v1a2 2 0 01-1 1.732l-1 .732a2 2 0 01-1 1.732V14a2 2 0 01-2 2h-2m-6-4h6m2 5.5V19a2 2 0 01-2 2H6a2 2 0 01-2-2v-1.5"/>
              </svg>
            </div>
            <div className="absolute inset-0 rounded-2xl bg-white/20 opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
          </div>
          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-gradient-to-br from-violet-400 to-emerald-400 rounded-full border-2 border-white shadow-md"></div>
        </div>
        <div className={`ml-4 text-3xl font-bold ${colors.textPrimary} tracking-tight`}>
          <span className="bg-gradient-to-r from-emerald-600 to-violet-600 bg-clip-text text-transparent">TY</span>
          <span className={colors.textPrimary}>CAT</span>
        </div>
      </div>

      <div className="w-full max-w-md z-10 mt-24">
        <div className="border border-slate-200 rounded-xl shadow-lg p-8 bg-white/90 backdrop-blur-lg relative overflow-hidden">
          {/* Borda decorativa lateral - cores TYCAT */}
          <div className="absolute left-0 top-0 h-full w-1.5 bg-gradient-to-b from-emerald-500 to-violet-500"></div>
          
          <div className="flex justify-between items-center">
            <div>
              <h2 className={`text-3xl font-bold ${colors.textPrimary}`}>Iniciar Sessão</h2>
              <p className={`mt-2 text-sm ${colors.textSecondary}`}>
                Não tem uma conta?{' '}
                <Link href="/register" className={`${colors.accentEmerald} font-medium hover:${colors.accentViolet} transition-colors`}>
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
            <Alert variant="destructive" className="mt-4 border-red-200 bg-red-50 text-red-800">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6 mt-6">
            <div>
              <Label htmlFor="email" className={`block text-sm font-medium ${colors.textPrimary} mb-2`}>
                Email
              </Label>
              <div className="relative">
                <Mail className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${colors.accentEmerald}`} />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className={`pl-10 block w-full ${colors.textPrimary} border-slate-300 focus:border-emerald-500 focus:ring-emerald-500`}
                  placeholder="seu@email.com"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="password" className={`block text-sm font-medium ${colors.textPrimary} mb-2`}>
                Palavra-passe
              </Label>
              <div className="relative">
                <Lock className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${colors.accentEmerald}`} />
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  className={`pl-10 block w-full ${colors.textPrimary} border-slate-300 focus:border-emerald-500 focus:ring-emerald-500`}
                  placeholder="••••••••"
                />
              </div>
            </div>
            <Button 
              type="submit" 
              disabled={isLoading} 
              className={`w-full ${colors.bgAccentEmerald} hover:bg-emerald-600 text-white py-3 font-medium transition-colors shadow-sm hover:shadow-md`}
            >
              {isLoading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Entrando...</span>
                </div>
              ) : (
                'Entrar'
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}