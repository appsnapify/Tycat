'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, ArrowLeft, Eye, EyeOff } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { AuthResponse, LoginRequest, ClienteUser } from './types'

// Schema de validação
const loginSchema = z.object({
  password: z.string().min(1, 'A palavra-passe é obrigatória')
})

type LoginFormData = z.infer<typeof loginSchema>

interface LoginFormClienteProps {
  phone: string
  userId: string | null
  onSuccess: (user: ClienteUser) => void
  onBack: () => void
}

export function LoginFormCliente({ 
  phone, 
  userId, 
  onSuccess, 
  onBack 
}: LoginFormClienteProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [loginAttempts, setLoginAttempts] = useState(0)
  const [currentAttempt, setCurrentAttempt] = useState(0) // ✅ NOVO: tracking de tentativa atual
  const [isRetrying, setIsRetrying] = useState(false) // ✅ NOVO: estado de retry
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      password: ''
    }
  })
  
  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true)
    setError(null)
    
    // ✅ SOLUÇÃO DEFINITIVA: Login client-side direto (como funcionava antes)
    const MAX_RETRIES = 3
    let attempt = 0
    
    // Importar client do sistema isolado
    const { getLoginClienteSupabase } = await import('@/lib/login-cliente/auth-client')
    const supabase = getLoginClienteSupabase()
    
    while (attempt < MAX_RETRIES) {
      attempt++
      setCurrentAttempt(attempt)
      setIsRetrying(attempt > 1)
      
      try {
        console.log(`[LOGIN-CLIENTE] Tentativa ${attempt}/${MAX_RETRIES} - CLIENT-SIDE`)
        
        // 1. Buscar dados do utilizador primeiro
        let query = supabase.from('client_users').select('*')
        
        if (userId) {
          query = query.eq('id', userId)
        } else {
          query = query.eq('phone', phone.trim())
        }
        
        const { data: user, error: queryError } = await query.maybeSingle()
        
        if (queryError) {
          console.error('[LOGIN-CLIENTE] Erro ao buscar utilizador:', queryError)
          throw new Error('Erro interno do servidor')
        }
        
        if (!user) {
          throw new Error('Utilizador não encontrado')
        }
        
        // 2. Fazer login Supabase Auth CLIENT-SIDE
        let userEmail = user.email
        if (!userEmail) {
          userEmail = `client_${user.id}@temp.snap.com`
        }
        
        console.log('[LOGIN-CLIENTE] Fazendo login client-side com email:', userEmail)
        
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: userEmail,
          password: data.password
        })
        
        if (authError) {
          console.error('[LOGIN-CLIENTE] Erro Auth client-side:', authError)
          
          // Se falhou, tentar password da tabela (sistema híbrido)
          if (user.password) {
            const bcrypt = await import('bcryptjs')
            
            let passwordValid = false
            if (user.password.startsWith('$2')) {
              passwordValid = await bcrypt.compare(data.password, user.password)
            } else {
              passwordValid = user.password === data.password
            }
            
            if (!passwordValid) {
              if (authError.message.includes('Invalid login credentials')) {
                throw new Error('Palavra-passe incorreta')
              }
              throw new Error(authError.message)
            }
            
            // Password da tabela é válida, mas não há Auth - criar/atualizar
            console.log('[LOGIN-CLIENTE] Password tabela válida, tentando criar Auth...')
            
            // Tentar criar user no Auth se não existir
            const { error: signUpError } = await supabase.auth.signUp({
              email: userEmail,
              password: data.password,
              options: {
                data: {
                  client_user_id: user.id,
                  first_name: user.first_name,
                  last_name: user.last_name,
                  phone: user.phone
                }
              }
            })
            
            if (signUpError && !signUpError.message.includes('already registered')) {
              console.error('[LOGIN-CLIENTE] Erro ao criar Auth:', signUpError)
              throw new Error('Erro na autenticação')
            }
            
            // Tentar login novamente
            const { data: retryAuthData, error: retryAuthError } = await supabase.auth.signInWithPassword({
              email: userEmail,
              password: data.password
            })
            
            if (retryAuthError) {
              throw new Error('Erro na autenticação após criação')
            }
            
            authData.user = retryAuthData.user
          } else {
            throw new Error('Palavra-passe incorreta')
          }
        }
        
        if (!authData?.user) {
          throw new Error('Falha na autenticação')
        }
        
        // 3. Garantir metadados estão corretos
        if (!authData.user.user_metadata?.client_user_id) {
          console.log('[LOGIN-CLIENTE] Atualizando metadados client-side...')
          
          const { error: updateError } = await supabase.auth.updateUser({
            data: {
              client_user_id: user.id,
              first_name: user.first_name,
              last_name: user.last_name,
              phone: user.phone
            }
          })
          
          if (updateError) {
            console.warn('[LOGIN-CLIENTE] Falha ao atualizar metadados:', updateError)
          }
        }
        
        // 4. Aguardar um momento para sessão estabelecer
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // 5. Sucesso - preparar dados do utilizador
        const clientUser = {
          id: user.id,
          firstName: user.first_name,
          lastName: user.last_name,
          email: user.email || '',
          phone: user.phone || ''
        }
        
        console.log(`[LOGIN-CLIENTE] Login client-side bem-sucedido na tentativa ${attempt}`)
        
        // Reset states e chamar callback
        setLoginAttempts(0)
        reset()
        onSuccess(clientUser)
        return // Sucesso - sair do loop
        
      } catch (error: any) {
        console.error(`[LOGIN-CLIENTE] Erro na tentativa ${attempt}:`, error)
        
        // Lógica de retry baseada no tipo de erro
        const isRetryableError = 
          error.message.includes('network') ||
          error.message.includes('fetch') ||
          error.message.includes('timeout') ||
          error.message.includes('servidor')
        
        // Erros específicos que não devem retry
        if (error.message.includes('incorreta') || 
            error.message.includes('não encontrado') ||
            !isRetryableError) {
          setError(error.message)
          break
        }
        
        // Se chegou à última tentativa
        if (attempt >= MAX_RETRIES) {
          setError('Falha após múltiplas tentativas. Verifique sua conexão.')
          break
        }
        
        // Backoff antes do retry
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 3000)
        console.log(`[LOGIN-CLIENTE] Aguardando ${delay}ms antes do retry...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
    
    setIsLoading(false)
    setCurrentAttempt(0)
    setIsRetrying(false)
  }

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword)
  }

  const handleRetry = () => {
    setError(null)
    setLoginAttempts(0)
    reset()
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center pb-2">
        <CardTitle className="text-xl">Iniciar Sessão</CardTitle>
        <CardDescription className="text-sm">
          Entre com a sua palavra-passe
        </CardDescription>
        {userId && (
          <p className="text-xs text-muted-foreground">
            Utilizador identificado: {phone}
          </p>
        )}
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription className="text-sm">
                {error}
                {loginAttempts >= 3 && loginAttempts < 5 && (
                  <div className="mt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleRetry}
                    >
                      Limpar e tentar novamente
                    </Button>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}
          
          {/* Telefone - Readonly para referência */}
          <div className="space-y-1">
            <Label htmlFor="phone_display" className="text-sm">Telefone</Label>
            <Input
              id="phone_display"
              type="tel"
              value={phone}
              disabled={true}
              className="bg-muted text-sm"
            />
          </div>
          
          {/* Password */}
          <div className="space-y-1">
            <Label htmlFor="password" className="text-sm">Palavra-passe *</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="A sua palavra-passe"
                {...register('password')}
                disabled={isLoading || loginAttempts >= 5}
                className="text-sm pr-10"
                autoFocus
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={togglePasswordVisibility}
                disabled={isLoading}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
            {errors.password && (
              <p className="text-xs text-destructive">{errors.password.message}</p>
            )}
          </div>
          
          {/* Contador de tentativas */}
          {loginAttempts > 0 && loginAttempts < 5 && (
            <div className="text-center">
              <p className="text-xs text-muted-foreground">
                Tentativas: {loginAttempts}/5
              </p>
            </div>
          )}
          
          {/* Botões */}
          <div className="flex flex-col gap-2 pt-2">
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {isRetrying ? (
                    <span>Tentativa {currentAttempt} de 3...</span>
                  ) : (
                    <span>A iniciar sessão...</span>
                  )}
                </div>
              ) : (
                'Iniciar Sessão'
              )}
            </Button>
            
            {/* ✅ NOVO: Mostrar status de retry */}
            {isRetrying && (
              <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                <div className="flex items-center gap-2 text-sm text-blue-700">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>
                    {currentAttempt === 1 && "Tentando conectar..."}
                    {currentAttempt === 2 && "Reestabelecendo conexão..."}
                    {currentAttempt === 3 && "Última tentativa..."}
                  </span>
                </div>
              </div>
            )}
            
            <Button
              type="button"
              variant="outline"
              onClick={onBack}
              disabled={isLoading}
              className="w-full"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          </div>
          
          {/* Informação de segurança */}
          {loginAttempts >= 2 && loginAttempts < 5 && (
            <div className="text-center pt-2">
              <p className="text-xs text-amber-600">
                ⚠️ Atenção: Após 5 tentativas incorretas será necessário aguardar
              </p>
            </div>
          )}
          
          {loginAttempts >= 5 && (
            <div className="text-center pt-2">
              <p className="text-xs text-red-600">
                🔒 Conta temporariamente bloqueada por segurança
              </p>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  )
} 