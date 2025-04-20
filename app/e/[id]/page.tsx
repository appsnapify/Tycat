'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { CalendarIcon, MapPin, Share2, TicketIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/components/ui/use-toast'
import { supabase } from '@/lib/supabase'
import { Badge } from '@/components/ui/badge'
import { use } from 'react'

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
  ticket_url?: string
  type?: string
  is_active: boolean
  organization_id: string
  ticket_settings?: any
}

// Componente que lida com a lógica de dados da página
function EventPageContent({ eventId }: { eventId: string }) {
  const router = useRouter()
  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Buscar dados do evento
  useEffect(() => {
    async function loadEvent() {
      try {
        setLoading(true)
        
        // Buscar evento do Supabase
        const { data: eventData, error: eventError } = await supabase
          .from('events')
          .select('*')
          .eq('id', eventId)
          .eq('is_published', true)
          .eq('is_active', true)
          .not('type', 'eq', 'guest-list') // Eventos normais, não guest list
          .single()
          
        if (eventError) {
          throw new Error('Evento não encontrado ou não está ativo')
        }
        
        if (!eventData) {
          throw new Error('Evento não encontrado')
        }
        
        console.log("Dados do evento carregados:", eventData)
        setEvent(eventData)
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
          <div className="w-full h-full bg-gradient-to-r from-indigo-600 to-purple-600"></div>
        )}
        
        <div className="absolute inset-0 bg-black bg-opacity-40 flex items-end">
          <div className="container max-w-4xl mx-auto px-4 pb-8">
            <Badge className="mb-2 bg-purple-600">Evento</Badge>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{event.title}</h1>
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
          
          {/* Coluna lateral */}
          <div className="md:col-span-1">
            <Card className="sticky top-4">
              <CardHeader className="bg-purple-50 border-b">
                <CardTitle className="text-purple-700">
                  Informações de Ingresso
                </CardTitle>
                <CardDescription>
                  {event.ticket_url 
                    ? 'Compre seu ingresso online' 
                    : 'Informações sobre ingressos'}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="pt-6">
                <div className="text-center py-4">
                  <TicketIcon className="h-16 w-16 mx-auto text-purple-500 mb-4" />
                  
                  {event.ticket_url ? (
                    <>
                      <p className="text-gray-600 text-sm mb-4">
                        Os ingressos estão disponíveis online. Clique no botão abaixo para comprar.
                      </p>
                      <Button 
                        className="w-full bg-purple-600 hover:bg-purple-700"
                        onClick={() => window.open(event.ticket_url, '_blank')}
                      >
                        Comprar Ingresso
                      </Button>
                    </>
                  ) : (
                    <>
                      <p className="text-gray-600 text-sm mb-4">
                        Para informações sobre ingressos, entre em contato com o organizador ou
                        verifique as redes sociais do evento.
                      </p>
                      <Button 
                        variant="outline"
                        className="w-full" 
                      >
                        Mais Informações
                      </Button>
                    </>
                  )}
                </div>
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