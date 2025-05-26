"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { motion } from 'framer-motion'
import { ArrowLeft, User, Mail, Building2, Lock, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/app/app/_providers/auth-provider'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'

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

const formSchema = z.object({
  first_name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  last_name: z.string().min(2, 'Sobrenome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  role: z.enum(['organizador', 'promotor']),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  confirm: z.string()
}).refine((data) => data.password === data.confirm, {
  message: "Senhas não conferem",
  path: ["confirm"],
})

type FormData = z.infer<typeof formSchema>

export default function RegisterPage() {
  const router = useRouter()
  const { signUp } = useAuth()
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      role: 'promotor',
      password: '',
      confirm: ''
    }
  })

  const handleSubmit = async (data: FormData) => {
    if (isLoading) return;
    
    setIsLoading(true);
    let registrationError: Error | null = null;

    try {
      const { error } = await signUp(
        {
          email: data.email,
          password: data.password,
        },
        {
          first_name: data.first_name,
          last_name: data.last_name,
          role: data.role,
          email_verified: true
        }
      );

      if (error) {
        throw error;
      }

      // Sucesso: Mostrar mensagem e redirecionar
      toast.success("Conta criada com sucesso! Redirecionando...");

      // Determinar o dashboard correto OU a página de escolha de equipe
      const redirectPath = data.role === 'organizador' 
        ? '/app/organizador/dashboard' 
        : '/app/promotor/equipes/escolha';
      
      // Adicionar um pequeno delay antes de redirecionar para dar tempo ao toast
      setTimeout(() => {
        router.push(redirectPath);
      }, 1500); // Delay de 1.5 segundos

    } catch (error) {
      console.error('Error during registration:', error);
      // Armazena o erro para mostrar *depois* de sair do loading
      if (error instanceof Error) {
        registrationError = error;
      } else {
        registrationError = new Error('Erro desconhecido ao criar conta.');
      }
      // Exibe o toast de erro imediatamente no catch
      toast.error(registrationError.message);
      setIsLoading(false);
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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/>
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
              <h2 className={`text-3xl font-bold ${colors.textPrimary}`}>Criar Conta</h2>
              <p className={`mt-2 text-sm ${colors.textSecondary}`}>
                Já tem uma conta?{' '}
                <Link href="/login" className={`${colors.accentLime} font-medium`}>
                  Faça login
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

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 mt-6">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="first_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={colors.textPrimary}>Nome</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <User className="h-4 w-4 text-lime-500" />
                          </div>
                          <Input 
                            placeholder="João" 
                            {...field} 
                            className="pl-10 bg-white/70 border-gray-200 text-gray-900 rounded-md focus:ring-1 focus:ring-lime-500 focus:border-lime-500" 
                          />
                        </div>
                      </FormControl>
                      <FormMessage className="text-fuchsia-600" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="last_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={colors.textPrimary}>Sobrenome</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <User className="h-4 w-4 text-lime-500" />
                          </div>
                          <Input 
                            placeholder="Silva" 
                            {...field} 
                            className="pl-10 bg-white/70 border-gray-200 text-gray-900 rounded-md focus:ring-1 focus:ring-lime-500 focus:border-lime-500" 
                          />
                        </div>
                      </FormControl>
                      <FormMessage className="text-fuchsia-600" />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={colors.textPrimary}>Email</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Mail className="h-4 w-4 text-fuchsia-500" />
                        </div>
                        <Input 
                          type="email" 
                          placeholder="joao@exemplo.com" 
                          {...field} 
                          className="pl-10 bg-white/70 border-gray-200 text-gray-900 rounded-md focus:ring-1 focus:ring-fuchsia-500 focus:border-fuchsia-500" 
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="text-fuchsia-600" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel className={colors.textPrimary}>Tipo de Conta</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col space-y-2 p-2 rounded-md bg-white/70 border border-gray-100"
                      >
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="organizador" className="border-lime-500 text-lime-500" />
                          </FormControl>
                          <FormLabel className={`font-normal ${colors.textPrimary}`}>
                            Organizador - Criar e gerenciar eventos
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="promotor" className="border-fuchsia-500 text-fuchsia-500" />
                          </FormControl>
                          <FormLabel className={`font-normal ${colors.textPrimary}`}>
                            Promotor - Promover e vender eventos
                          </FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage className="text-fuchsia-600" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={colors.textPrimary}>Senha</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Lock className="h-4 w-4 text-lime-500" />
                        </div>
                        <Input 
                          type="password" 
                          {...field} 
                          className="pl-10 bg-white/70 border-gray-200 text-gray-900 rounded-md focus:ring-1 focus:ring-lime-500 focus:border-lime-500" 
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="text-fuchsia-600" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={colors.textPrimary}>Confirmar Senha</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Lock className="h-4 w-4 text-fuchsia-500" />
                        </div>
                        <Input 
                          type="password" 
                          {...field} 
                          className="pl-10 bg-white/70 border-gray-200 text-gray-900 rounded-md focus:ring-1 focus:ring-fuchsia-500 focus:border-fuchsia-500" 
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="text-fuchsia-600" />
                  </FormItem>
                )}
              />

              <div className="flex items-center justify-center pt-4">
                <Button 
                  type="submit" 
                  className={`${colors.bgAccentLime} text-white w-full font-semibold shadow-md`} 
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Registrando...
                    </>
                  ) : (
                    'Registrar'
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </div>
        
        {/* Sombra adicional para profundidade */}
        <div className="h-2 mx-8 bg-gradient-to-r from-transparent via-gray-200 to-transparent rounded-full opacity-50 mt-1"></div>
      </motion.div>
    </div>
  )
}

