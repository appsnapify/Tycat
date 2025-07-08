'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Loader2, ArrowLeft } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { AuthResponse, RegisterRequest, ClienteUser } from './types'

// Schema de validação robusto
const registerSchema = z.object({
  phone: z.string().min(9, 'O telefone deve ter pelo menos 9 dígitos'),
  email: z.string().email('Email inválido').max(255, 'Email muito longo'),
  first_name: z.string()
    .min(2, 'O nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome muito longo')
    .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, 'Nome contém caracteres inválidos'),
  last_name: z.string()
    .min(2, 'O apelido deve ter pelo menos 2 caracteres') 
    .max(100, 'Apelido muito longo')
    .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, 'Apelido contém caracteres inválidos'),
  birth_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de data inválido')
    .optional()
    .or(z.literal('')),
  postal_code: z.string()
    .regex(/^\d{4}-\d{3}$/, 'Formato deve ser: 4750-850'),
  gender: z.enum(['M', 'F', 'O']).optional(),
  password: z.string()
    .min(8, 'A palavra-passe deve ter pelo menos 8 caracteres')
    .max(128, 'Palavra-passe muito longa')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, 'Deve conter: maiúscula, minúscula e número'),
  confirmPassword: z.string().min(1, 'Confirma a tua palavra-passe')
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As palavras-passe não coincidem',
  path: ['confirmPassword']
})

type RegisterFormData = z.infer<typeof registerSchema>

interface RegisterFormClienteProps {
  phone: string
  onSuccess: (user: ClienteUser) => void
  onBack: () => void
}

export function RegisterFormCliente({ 
  phone, 
  onSuccess, 
  onBack 
}: RegisterFormClienteProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitAttempts, setSubmitAttempts] = useState(0)
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      phone: phone,
      email: '',
      first_name: '',
      last_name: '',
      birth_date: '',
      postal_code: '',
      gender: undefined,
      password: '',
      confirmPassword: ''
    }
  })
  
  const onSubmit = async (data: RegisterFormData) => {
    // Prevenção de spam/múltiplos submits
    if (isLoading) return
    
    setSubmitAttempts(prev => prev + 1)
    if (submitAttempts >= 3) {
      setError('Muitas tentativas. Recarregue a página e tente novamente.')
      return
    }
    
    setIsLoading(true)
    setError(null)
    
    try {
      // Preparar dados para API (mapeamento correto)
      const registerRequest: RegisterRequest = {
        phone: data.phone,
        email: data.email.trim().toLowerCase(),
        first_name: data.first_name.trim(),
        last_name: data.last_name.trim(),
        password: data.password,
        birth_date: data.birth_date || undefined,
        postal_code: data.postal_code.trim(),
        gender: data.gender
      }
      
      // Timeout para evitar esperas infinitas
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 segundos
      
      const response = await fetch('/api/login-cliente/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(registerRequest),
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      const result: AuthResponse = await response.json()
      
      if (!response.ok) {
        // Tratamento específico de erros HTTP
        if (response.status === 429) {
          throw new Error('Muitas tentativas. Aguarde alguns minutos.')
        }
        if (response.status === 409) {
          throw new Error(result.error || 'Telefone ou email já registrado')
        }
        throw new Error(result.error || `Erro ${response.status}`)
      }
      
      if (!result.success || !result.user) {
        throw new Error(result.error || 'Resposta inválida do servidor')
      }
      
      // Reset de tentativas em caso de sucesso
      setSubmitAttempts(0)
      
      // Chamar callback de sucesso
      onSuccess(result.user)
      
    } catch (error: any) {
      console.error('[REGISTER-CLIENTE] Erro no registo:', error)
      
      // Tratamento específico de erros de rede
      if (error.name === 'AbortError') {
        setError('Pedido demorou muito tempo. Verifique a sua conexão.')
      } else if (error.message.includes('fetch')) {
        setError('Erro de conexão. Verifique a sua internet.')
      } else {
        setError(error.message || 'Erro desconhecido ao registar')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleGenderChange = (value: string) => {
    if (value === 'M' || value === 'F' || value === 'O') {
      setValue('gender', value as 'M' | 'F' | 'O')
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center pb-2">
        <CardTitle className="text-xl">Criar Conta</CardTitle>
        <CardDescription className="text-sm">
          Preencha os campos obrigatórios (*)
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription className="text-sm">{error}</AlertDescription>
            </Alert>
          )}
          
          {/* Telefone - Readonly */}
          <div className="space-y-1">
            <Label htmlFor="phone" className="text-sm">Telefone *</Label>
            <Input
              id="phone"
              type="tel"
              {...register('phone')}
              disabled={true}
              className="bg-muted text-sm"
            />
            {errors.phone && (
              <p className="text-xs text-destructive">{errors.phone.message}</p>
            )}
          </div>
          
          {/* Email */}
          <div className="space-y-1">
            <Label htmlFor="email" className="text-sm">Email *</Label>
            <Input
              id="email"
              type="email"
              placeholder="o.teu.email@exemplo.com"
              {...register('email')}
              disabled={isLoading}
              className="text-sm"
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>
          
          {/* Nome e Apelido */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="first_name" className="text-sm">Nome *</Label>
              <Input
                id="first_name"
                placeholder="Nome"
                {...register('first_name')}
                disabled={isLoading}
                className="text-sm"
              />
              {errors.first_name && (
                <p className="text-xs text-destructive">{errors.first_name.message}</p>
              )}
            </div>
            
            <div className="space-y-1">
              <Label htmlFor="last_name" className="text-sm">Apelido *</Label>
              <Input
                id="last_name"
                placeholder="Apelido"
                {...register('last_name')}
                disabled={isLoading}
                className="text-sm"
              />
              {errors.last_name && (
                <p className="text-xs text-destructive">{errors.last_name.message}</p>
              )}
            </div>
          </div>
          
          {/* Data de Nascimento e Género */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="birth_date" className="text-sm">Data Nasc.</Label>
              <Input
                id="birth_date"
                type="date"
                {...register('birth_date')}
                disabled={isLoading}
                className="text-sm"
              />
              {errors.birth_date && (
                <p className="text-xs text-destructive">{errors.birth_date.message}</p>
              )}
            </div>
            
            <div className="space-y-1">
              <Label htmlFor="gender" className="text-sm">Género</Label>
              <Select onValueChange={handleGenderChange} disabled={isLoading}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Escolher" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="M">Masculino</SelectItem>
                  <SelectItem value="F">Feminino</SelectItem>
                  <SelectItem value="O">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Código Postal */}
          <div className="space-y-1">
            <Label htmlFor="postal_code" className="text-sm">Código Postal *</Label>
            <Input
              id="postal_code"
              placeholder="4750-850"
              {...register('postal_code')}
              disabled={isLoading}
              className="text-sm"
            />
            {errors.postal_code && (
              <p className="text-xs text-destructive">{errors.postal_code.message}</p>
            )}
          </div>
          
          {/* Palavras-passe */}
          <div className="space-y-1">
            <Label htmlFor="password" className="text-sm">Palavra-passe *</Label>
            <Input
              id="password"
              type="password"
              placeholder="Mínimo 8 caracteres"
              {...register('password')}
              disabled={isLoading}
              className="text-sm"
            />
            {errors.password && (
              <p className="text-xs text-destructive">{errors.password.message}</p>
            )}
          </div>
          
          <div className="space-y-1">
            <Label htmlFor="confirmPassword" className="text-sm">Confirmar Palavra-passe *</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Repetir palavra-passe"
              {...register('confirmPassword')}
              disabled={isLoading}
              className="text-sm"
            />
            {errors.confirmPassword && (
              <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
            )}
          </div>
          
          {/* Botões */}
          <div className="flex flex-col gap-2 pt-4">
            <Button type="submit" disabled={isLoading || submitAttempts >= 3} className="w-full">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  A criar conta...
                </>
              ) : (
                'Criar Conta'
              )}
            </Button>
            
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
          
          {submitAttempts > 0 && submitAttempts < 3 && (
            <p className="text-xs text-muted-foreground text-center">
              Tentativa {submitAttempts}/3
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  )
} 