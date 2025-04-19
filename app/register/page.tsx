"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { motion } from 'framer-motion'
import { ArrowLeft, User, Mail, Building2, Lock } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/hooks/use-auth'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Loader2 } from 'lucide-react'

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
      const newUser = await signUp(data.email, data.password, {
        first_name: data.first_name,
        last_name: data.last_name,
        role: data.role
      });

      if (newUser) {
        // Sucesso: Mostrar mensagem e redirecionar
        toast.success("Conta criada com sucesso! Redirecionando...");

        // Determinar o dashboard correto OU a página de escolha de equipe
        const redirectPath = data.role === 'organizador' 
          ? '/app/organizador/dashboard' 
          : '/app/promotor/equipes';
        
        // Adicionar um pequeno delay antes de redirecionar para dar tempo ao toast
        setTimeout(() => {
          router.push(redirectPath);
        }, 1500); // Delay de 1.5 segundos

      } else {
        // Caso inesperado onde signUp não retorna usuário ou erro
        throw new Error('Falha ao obter dados do usuário após registro.');
      }

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
    } finally {
      // Definir isLoading como false apenas se não estivermos redirecionando
      // O redirecionamento cuidará da mudança de página
      // setIsLoading(false); 
      // Comentado para evitar que o botão volte ao estado normal antes do redirect
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
        <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-lg">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-bold">Criar Conta</h2>
              <p className="mt-2 text-sm text-gray-600">
                Já tem uma conta?{' '}
                <Link href="/login" className="text-blue-600 hover:text-blue-800">
                  Faça login
                </Link>
              </p>
            </div>
            <Link href="/">
              <Button variant="ghost" className="text-gray-600 hover:text-gray-800">
                Voltar
              </Button>
          </Link>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="first_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome</FormLabel>
                      <FormControl>
                        <Input placeholder="João" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="last_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sobrenome</FormLabel>
                      <FormControl>
                        <Input placeholder="Silva" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>

              <FormField
                control={form.control}
                  name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="joao@exemplo.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Tipo de Conta</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col space-y-1"
                      >
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="organizador" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Organizador - Criar e gerenciar eventos
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="promotor" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Promotor - Promover e vender eventos
                          </FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Senha</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirmar Senha</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Registrando...
                  </>
                ) : (
                  'Registrar'
                )}
            </Button>
          </form>
          </Form>
          </div>
        </motion.div>
    </div>
  )
}

