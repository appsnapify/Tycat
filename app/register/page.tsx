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
import { createClient } from '@/lib/supabase'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'

// Cores alinhadas com TYCAT
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

    try {
      const supabase = createClient()
      const { data: signUpData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            first_name: data.first_name,
            last_name: data.last_name,
            role: data.role,
            email_verified: true
          }
        }
      })

      if (error) {
        throw error;
      }

      if (signUpData.user) {
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
      }

    } catch (error) {
      console.error('Error during registration:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido ao criar conta.';
      toast.error(errorMessage);
      setIsLoading(false);
    }
  }

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center ${colors.background} py-12 px-4 sm:px-6 lg:px-8 relative`}>
      {/* Elementos decorativos no fundo - TYCAT */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -left-20 w-96 h-96 bg-emerald-200 rounded-full mix-blend-multiply filter blur-3xl opacity-15"></div>
        <div className="absolute top-0 -right-20 w-96 h-96 bg-violet-200 rounded-full mix-blend-multiply filter blur-3xl opacity-15"></div>
        <div className="absolute -bottom-32 left-1/2 transform -translate-x-1/2 w-96 h-96 bg-emerald-200 rounded-full mix-blend-multiply filter blur-3xl opacity-15"></div>
      </div>

      {/* Logo TYCAT Melhorado - Igual ao Login */}
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

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md z-10 mt-24"
      >
        <div className="border border-slate-200 rounded-xl shadow-lg p-8 bg-white/90 backdrop-blur-lg relative overflow-hidden">
          {/* Borda decorativa lateral - TYCAT */}
          <div className="absolute left-0 top-0 h-full w-1.5 bg-gradient-to-b from-emerald-500 to-violet-500"></div>
          
          <div className="flex justify-between items-center">
            <div>
              <h2 className={`text-3xl font-bold ${colors.textPrimary}`}>Criar Conta</h2>
              <p className={`mt-2 text-sm ${colors.textSecondary}`}>
                Já tem uma conta?{' '}
                <Link href="/login" className={`${colors.accentEmerald} font-medium hover:${colors.accentViolet} transition-colors`}>
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
                            <User className={`h-4 w-4 ${colors.accentEmerald}`} />
                          </div>
                          <Input 
                            placeholder="João" 
                            {...field} 
                            className={`pl-10 ${colors.textPrimary} border-slate-300 focus:border-emerald-500 focus:ring-emerald-500`}
                          />
                        </div>
                      </FormControl>
                      <FormMessage className="text-red-600" />
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
                            <User className={`h-4 w-4 ${colors.accentEmerald}`} />
                          </div>
                          <Input 
                            placeholder="Silva" 
                            {...field} 
                            className={`pl-10 ${colors.textPrimary} border-slate-300 focus:border-emerald-500 focus:ring-emerald-500`}
                          />
                        </div>
                      </FormControl>
                      <FormMessage className="text-red-600" />
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
                          <Mail className={`h-4 w-4 ${colors.accentEmerald}`} />
                        </div>
                        <Input 
                          type="email" 
                          placeholder="joao@exemplo.com" 
                          {...field} 
                          className={`pl-10 ${colors.textPrimary} border-slate-300 focus:border-emerald-500 focus:ring-emerald-500`}
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="text-red-600" />
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
                        className="flex flex-col space-y-2 p-2 rounded-md bg-white/70 border border-slate-200"
                      >
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="organizador" className={`${colors.borderEmerald} ${colors.accentEmerald}`} />
                          </FormControl>
                          <FormLabel className={`font-normal ${colors.textPrimary}`}>
                            Organizador - Criar e gerenciar eventos
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="promotor" className={`${colors.borderViolet} ${colors.accentViolet}`} />
                          </FormControl>
                          <FormLabel className={`font-normal ${colors.textPrimary}`}>
                            Promotor - Promover e vender eventos
                          </FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage className="text-red-600" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={colors.textPrimary}>Palavra-passe</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Lock className={`h-4 w-4 ${colors.accentEmerald}`} />
                        </div>
                        <Input 
                          type="password" 
                          placeholder="••••••••"
                          {...field} 
                          className={`pl-10 ${colors.textPrimary} border-slate-300 focus:border-emerald-500 focus:ring-emerald-500`}
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="text-red-600" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={colors.textPrimary}>Confirmar Palavra-passe</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Lock className={`h-4 w-4 ${colors.accentViolet}`} />
                        </div>
                        <Input 
                          type="password" 
                          placeholder="••••••••"
                          {...field} 
                          className={`pl-10 ${colors.textPrimary} border-slate-300 focus:border-violet-500 focus:ring-violet-500`}
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="text-red-600" />
                  </FormItem>
                )}
              />

              <div className="flex items-center justify-center pt-4">
                <Button 
                  type="submit" 
                  className={`${colors.bgAccentEmerald} hover:bg-emerald-600 text-white w-full py-3 font-medium transition-colors shadow-sm hover:shadow-md`} 
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Criando conta...</span>
                    </div>
                  ) : (
                    'Criar Conta'
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </div>
        
        {/* Sombra adicional para profundidade */}
        <div className="h-2 mx-8 bg-gradient-to-r from-transparent via-slate-200 to-transparent rounded-full opacity-50 mt-1"></div>
      </motion.div>
    </div>
  )
}