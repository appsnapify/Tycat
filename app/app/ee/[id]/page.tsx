'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { CalendarIcon, Clock, MapPin, Share2, UserCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/components/ui/use-toast'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Badge } from '@/components/ui/badge'
import { use } from 'react'

// Inicializar cliente do Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Schema de validação para o formulário de registro
const guestFormSchema = z.object({
  name: z.string().min(2, {
    message: "O nome deve ter pelo menos 2 caracteres",
  }),
  phone: z.string().min(8, {
    message: "O telefone deve ter pelo menos 8 dígitos",
  }),
})

type GuestFormValues = z.infer<typeof guestFormSchema>

// Interface do evento
interface Event {
  id: string
  title: string
  description: string
  date: string
  time: string
  end_date?: string
  end_time?: string
  location: string
  flyer_url?: string
  type?: string
  is_active: boolean
  organization_id: string
}

// Componente que contém a lógica da página
function EventPageContent({ eventId }: { eventId: string }) {
  const router = useRouter()
  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [registrationSuccess, setRegistrationSuccess] = useState(false)
  
  // Configuração do formulário
  const form = useForm<GuestFormValues>({
    resolver: zodResolver(guestFormSchema),
    defaultValues: {
      name: "",
      phone: ""
    },
  })
  
  // Buscar dados do evento
  useEffect(() => {
    async function loadEvent() {
      try {
        setLoading(true)
        
        // Buscar evento do Supabase
        const { data, error } = await supabase
          .from('events')
          .select('*')
          .eq('id', eventId)
          .eq('is_active', true)
          .single()
          
        if (error) {
          throw new Error('Evento não encontrado ou não está ativo')
        }
        
        if (!data) {
          throw new Error('Evento não encontrado')
        }
        
        console.log("Dados do evento carregados:", data)
        setEvent(data)
      } catch (err) {
        console.error("Erro ao carregar evento:", err)
        setError(err instanceof Error ? err.message : 'Erro ao carregar evento')
      } finally {
        setLoading(false)
      }
    }
    
    loadEvent()
  }, [eventId])
  
  // Função para formatar data
  const formatDate = (dateString: string) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }
  
  // Função para formatar hora
  const formatTime = (timeString: string) => {
    if (!timeString) return ''
    
    // Se for uma string de hora (formato HH:MM:SS)
    if (timeString.includes(':') && !timeString.includes('-') && !timeString.includes('T')) {
      const [hours, minutes] = timeString.split(':')
      return `${hours}:${minutes}`
    }
    
    // Se for uma string de data completa
    const date = new Date(timeString)
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }
  
  // Função para registrar convidado
  const onSubmit = async (data: GuestFormValues) => {
    if (!event) return
    
    setSubmitting(true)
    try {
      console.log("Registrando convidado:", data)
      
      // Gerar código QR único (simplificado, na prática você provavelmente usaria uma biblioteca)
      const qrCode = `${event.id}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
      
      // Inserir convidado no banco de dados
      const { data: guest, error } = await supabase
        .from('guests')
        .insert({
          event_id: event.id,
          name: data.name,
          phone: data.phone,
          qr_code: qrCode,
          checked_in: false,
          created_at: new Date().toISOString()
        })
        .select()
      
      if (error) {
        throw error
      }
      
      console.log("Convidado registrado:", guest)
      setRegistrationSuccess(true)
      
      toast({
        title: "Registro confirmado!",
        description: "Você foi adicionado à guest list com sucesso.",
      })
      
      // Limpar formulário
      form.reset()
    } catch (err) {
      console.error("Erro ao registrar convidado:", err)
      toast({
        title: "Erro no registro",
        description: err instanceof Error 
          ? err.message 
          : "Não foi possível completar seu registro. Tente novamente.",
        variant: "destructive"
      })
    } finally {
      setSubmitting(false)
    }
  }
  
  // Estado de carregamento
  if (loading) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-64 bg-gray-300 rounded-lg mb-6"></div>
          <div className="h-8 bg-gray-300 w-3/4 rounded mb-4"></div>
          <div className="h-4 bg-gray-300 w-full rounded mb-2"></div>
          <div className="h-4 bg-gray-300 w-full rounded mb-2"></div>
          <div className="h-4 bg-gray-300 w-2/3 rounded mb-6"></div>
        </div>
      </div>
    )
  }
  
  // Estado de erro
  if (error || !event) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Evento não encontrado</CardTitle>
            <CardDescription>
              {error || 'Não foi possível carregar os detalhes deste evento.'}
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={() => router.back()}>Voltar</Button>
          </CardFooter>
        </Card>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header do evento com imagem */}
      <div className="relative w-full h-[30vh] md:h-[40vh] bg-gray-900">
        {event.flyer_url ? (
          <Image
            src={event.flyer_url}
            alt={event.title}
            fill
            style={{ objectFit: 'cover' }}
            className="opacity-70"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-blue-600 to-purple-600"></div>
        )}
        
        <div className="absolute inset-0 bg-black bg-opacity-40 flex items-end">
          <div className="container max-w-4xl mx-auto px-4 pb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{event.title}</h1>
            {event.type === 'guest-list' && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-600 text-white">
                Guest List
              </span>
            )}
          </div>
        </div>
      </div>
      
      {/* Conteúdo do evento */}
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Coluna principal */}
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Detalhes do Evento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 text-gray-700">
                  <CalendarIcon className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="font-medium">{formatDate(event.date)}</p>
                    <p className="text-sm text-gray-500">
                      {formatTime(event.time)}
                      {event.end_time && ` - ${formatTime(event.end_time)}`}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 text-gray-700">
                  <MapPin className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="font-medium">{event.location}</p>
                  </div>
                </div>
                
                <div className="pt-4 border-t">
                  <p className="text-gray-600 whitespace-pre-wrap">{event.description}</p>
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" size="sm" className="mr-2">
                  <Share2 className="h-4 w-4 mr-2" />
                  Compartilhar
                </Button>
              </CardFooter>
            </Card>
          </div>
          
          {/* Coluna lateral - Formulário de registro ou confirmação */}
          <div className="md:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>
                  {registrationSuccess 
                    ? 'Registro Confirmado!' 
                    : 'Garantir Presença'}
                </CardTitle>
                <CardDescription>
                  {registrationSuccess 
                    ? 'Você está na guest list do evento.' 
                    : 'Registre-se para entrar na guest list'}
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                {registrationSuccess ? (
                  <div className="text-center py-4">
                    <UserCheck className="h-16 w-16 mx-auto text-green-500 mb-4" />
                    <p className="text-lg font-medium text-green-600 mb-2">
                      Você está na lista!
                    </p>
                    <p className="text-gray-600 text-sm mb-4">
                      Seu nome foi adicionado à guest list deste evento.
                    </p>
                    <Button 
                      variant="outline" 
                      onClick={() => setRegistrationSuccess(false)}
                      className="mt-2"
                    >
                      Registrar outra pessoa
                    </Button>
                  </div>
                ) : (
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome Completo</FormLabel>
                            <FormControl>
                              <Input placeholder="Seu nome" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Telefone</FormLabel>
                            <FormControl>
                              <Input placeholder="(00) 00000-0000" {...field} />
                            </FormControl>
                            <FormDescription>
                              Usado para confirmação no check-in
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <Button 
                        type="submit" 
                        className="w-full" 
                        disabled={submitting}
                      >
                        {submitting ? 'Enviando...' : 'Confirmar Presença'}
                      </Button>
                    </form>
                  </Form>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

// Componente principal que lida com os parâmetros
export default function EventPage({ params }: { params: Promise<{ id: string }> }) {
  // Desembrulhar o params usando React.use()
  const resolvedParams = use(params);
  return <EventPageContent eventId={resolvedParams.id} />;
} 