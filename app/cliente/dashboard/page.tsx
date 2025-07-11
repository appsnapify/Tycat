'use client'

import { useState, useEffect } from 'react'
import { useClienteIsolado } from '@/hooks/useClienteIsolado'
import ProtectedRoute from '@/components/cliente-isolado/ProtectedRoute'
import Header from '@/components/cliente-isolado/Dashboard/Header'
import BottomNav from '@/components/user/BottomNav'
import { Loader2, Users, Ticket, Calendar, QrCode, ChevronRight, Clock } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/hooks/use-toast'

interface EventGuest {
  id: string
  event_id: string
  qr_code_url: string
  checked_in: boolean
  check_in_time: string | null
  title: string
  date: string
  location: string
  flyer_url: string
  description?: string
  time?: string
}

export default function ClienteDashboardPage() {
  const { user } = useClienteIsolado()
  const [events, setEvents] = useState<EventGuest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ✅ Fetch eventos ultrarrápido
  const fetchEvents = async (force = false) => {
    if (!user?.id) return

    try {
      setError(null)
      
      const response = await fetch(`/api/cliente-isolado/events?userId=${user.id}`, {
        cache: force ? 'no-store' : 'default'
      })

      const data = await response.json()

      if (data.success) {
        setEvents(data.events || [])
        console.log(`🚀 [CLIENTE-DASHBOARD] ${data.events?.length || 0} eventos carregados`)
      } else {
        throw new Error(data.error || 'Erro ao carregar eventos')
      }
    } catch (error) {
      console.error('❌ [CLIENTE-DASHBOARD] Erro:', error)
      setError(error instanceof Error ? error.message : 'Erro ao carregar eventos')
    } finally {
      setIsLoading(false)
    }
  }

  // ✅ Carregar eventos na inicialização
  useEffect(() => {
    if (user?.id) {
      fetchEvents()
    }
  }, [user?.id])

  // ✅ Handler para Guest Lists
  const handleGuestLists = () => {
    // Navegar para seção de guest lists dos eventos
    toast({
      title: "Guest Lists",
      description: "Acesso às suas guest lists de eventos.",
      duration: 2000,
    });
  }

  // ✅ Handler para Bilhetes (desativado)
  const handleBilhetes = () => {
    toast({
      title: "Em breve",
      description: "Funcionalidade de bilhetes estará disponível em breve.",
      duration: 2000,
    });
  }

  // ✅ Calcular estatísticas
  const stats = {
    totalEvents: events.length,
    upcomingEvents: events.filter(event => new Date(event.date) >= new Date()).length,
    usedTickets: events.filter(event => event.checked_in).length
  }

  return (
    <ProtectedRoute>
      {/* Fundo Azul Gradiente */}
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-blue-200 pb-24">
        <Header />
        
        <main className="p-4 space-y-6">
          {/* Header de Boas-vindas */}
          <div className="text-center py-6">
            <h1 className="text-2xl font-bold text-blue-900 mb-2">
              Bem-vindo, {user?.firstName || 'Cliente'}!
            </h1>
            <p className="text-blue-700">Gerencie seus eventos e acessos</p>
          </div>

          {/* Estatísticas Rápidas */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white/80 backdrop-blur rounded-xl p-4 text-center border border-blue-200">
              <div className="text-2xl font-bold text-blue-900">{stats.totalEvents}</div>
              <div className="text-sm text-blue-700">Eventos</div>
            </div>
            <div className="bg-white/80 backdrop-blur rounded-xl p-4 text-center border border-blue-200">
              <div className="text-2xl font-bold text-blue-900">{stats.upcomingEvents}</div>
              <div className="text-sm text-blue-700">Próximos</div>
            </div>
            <div className="bg-white/80 backdrop-blur rounded-xl p-4 text-center border border-blue-200">
              <div className="text-2xl font-bold text-blue-900">{stats.usedTickets}</div>
              <div className="text-sm text-blue-700">Usados</div>
            </div>
          </div>

          {/* Loading State */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
                <p className="text-blue-700">A carregar...</p>
              </div>
            </div>
          ) : (
            <>
              {/* Seção Guest Lists */}
              <Card className="bg-white/90 backdrop-blur border-blue-200 shadow-lg">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Users className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <CardTitle className="text-blue-900">Guest Lists</CardTitle>
                        <CardDescription className="text-blue-700">
                          Acesso às suas listas de convidados
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      Ativo
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {events.length > 0 ? (
                      events.slice(0, 3).map(event => (
                        <div key={event.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-100">
                          <div className="flex items-center gap-3">
                            <Calendar className="w-4 h-4 text-blue-600" />
                            <div>
                              <div className="font-medium text-blue-900">{event.title}</div>
                              <div className="text-sm text-blue-700">
                                {new Date(event.date).toLocaleDateString('pt-PT')}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {event.checked_in ? (
                              <Badge className="bg-red-100 text-red-800">Usado</Badge>
                            ) : (
                              <Badge className="bg-green-100 text-green-800">Válido</Badge>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={handleGuestLists}
                              className="text-blue-600 hover:bg-blue-100"
                            >
                              <QrCode className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-6 text-blue-700">
                        <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>Nenhuma guest list encontrada</p>
                      </div>
                    )}
                    
                    <Button
                      onClick={handleGuestLists}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Ver Todas as Guest Lists
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Seção Bilhetes (Desativada) */}
              <Card className="bg-white/60 backdrop-blur border-gray-300 shadow-lg opacity-75">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <Ticket className="w-6 h-6 text-gray-500" />
                      </div>
                      <div>
                        <CardTitle className="text-gray-700">Bilhetes</CardTitle>
                        <CardDescription className="text-gray-500">
                          Gestão de bilhetes de eventos
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                      Em breve
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <Clock className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p className="text-gray-600 mb-4">
                      Funcionalidade de bilhetes estará disponível em breve
                    </p>
                    <Button
                      onClick={handleBilhetes}
                      disabled
                      className="bg-gray-300 text-gray-500 cursor-not-allowed"
                    >
                      Indisponível
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Error State */}
              {error && (
                <Card className="bg-red-50 border-red-200">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-red-600 mb-3">{error}</p>
                      <Button
                        onClick={() => fetchEvents(true)}
                        variant="outline"
                        className="border-red-300 text-red-700 hover:bg-red-50"
                      >
                        Tentar novamente
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </main>

        <BottomNav />
      </div>
    </ProtectedRoute>
  )
} 