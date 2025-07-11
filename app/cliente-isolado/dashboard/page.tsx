'use client'

import { useState, useEffect } from 'react'
import { useClienteIsolado } from '@/hooks/useClienteIsolado'
import ProtectedRoute from '@/components/cliente-isolado/ProtectedRoute'
import Header from '@/components/cliente-isolado/Dashboard/Header'
import BottomNav from '@/components/cliente-isolado/Dashboard/BottomNav'
import EventCard from '@/components/cliente-isolado/Dashboard/EventCard'
import QRModal from '@/components/cliente-isolado/Dashboard/QRModal'
import { Loader2, Calendar, RefreshCw, Users, Ticket } from 'lucide-react'

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
  type: 'guest' | 'ticket'
}

export default function DashboardPage() {
  const { user } = useClienteIsolado()
  const [events, setEvents] = useState<EventGuest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<EventGuest | null>(null)
  const [qrModalOpen, setQrModalOpen] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showAllPastEvents, setShowAllPastEvents] = useState(false)
  const [activeWallet, setActiveWallet] = useState<'guest' | 'ticket'>('guest')

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
        console.log(`🚀 [DASHBOARD-ISOLADO] ${data.events?.length || 0} eventos carregados`)
      } else {
        throw new Error(data.error || 'Erro ao carregar eventos')
      }
    } catch (error) {
      console.error('❌ [DASHBOARD-ISOLADO] Erro:', error)
      setError(error instanceof Error ? error.message : 'Erro ao carregar eventos')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  // ✅ Carregar eventos na inicialização
  useEffect(() => {
    if (user?.id) {
      fetchEvents()
    }
  }, [user?.id])

  // ✅ Refresh manual
  const handleRefresh = async () => {
    setIsRefreshing(true)
    await fetchEvents(true)
  }

  // ✅ Categorizar eventos
  const categorizeEvents = (events: EventGuest[]) => {
    const now = new Date()
    const twentyFourHoursAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000))

    // Filtrar por tipo de wallet primeiro
    const filteredEvents = events.filter(event => event.type === activeWallet)

    const upcomingEvents = filteredEvents
      .filter(event => new Date(event.date) >= now)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    const recentEvents = filteredEvents
      .filter(event => {
        const eventDate = new Date(event.date)
        return eventDate < now && eventDate >= twentyFourHoursAgo
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    const pastEvents = filteredEvents
      .filter(event => new Date(event.date) < twentyFourHoursAgo)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    // Se showAllPastEvents for false, limita a 4 eventos
    return { 
      upcomingEvents, 
      recentEvents, 
      pastEvents: showAllPastEvents ? pastEvents : pastEvents.slice(0, 4)
    }
  }

  const { upcomingEvents, recentEvents, pastEvents } = categorizeEvents(events)

  const handleViewQR = (event: EventGuest) => {
    setSelectedEvent(event)
    setQrModalOpen(true)
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-900 pb-20">
        <main className="p-4 space-y-6">
          {/* Wallet Selector */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveWallet('guest')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-all ${
                activeWallet === 'guest'
                  ? 'bg-yellow-500 text-yellow-950'
                  : 'bg-gray-800 text-gray-400'
              }`}
            >
              <Users className="w-4 h-4" />
              Guest List
            </button>
            
            <button
              onClick={() => setActiveWallet('ticket')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-all ${
                activeWallet === 'ticket'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400'
              }`}
            >
              <Ticket className="w-4 h-4" />
              Bilhetes
            </button>
          </div>

          {/* Loading State */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-400 mx-auto mb-4" />
                <p className="text-gray-400">A carregar eventos...</p>
              </div>
            </div>
          ) : error ? (
            /* Error State */
            <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 text-center">
              <p className="text-red-400 mb-3">{error}</p>
              <button
                onClick={handleRefresh}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md transition-colors"
              >
                Tentar novamente
              </button>
            </div>
          ) : (
            <>
              {/* Empty State */}
              {events.filter(e => e.type === activeWallet).length === 0 ? (
                <div className="text-center py-20">
                  <Calendar className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-white mb-2">Nenhum evento encontrado</h3>
                  <p className="text-gray-400 mb-4">
                    Não tens {activeWallet === 'guest' ? 'guest lists' : 'bilhetes'} registados.
                  </p>
                  <button
                    onClick={handleRefresh}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md transition-colors"
                  >
                    Atualizar
                  </button>
                </div>
              ) : (
                <>
                  {/* Próximos Eventos */}
                  {upcomingEvents.length > 0 ? (
                    <section>
                      <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                        Próximos Eventos
                      </h3>
                      <div className="grid gap-4">
                        {upcomingEvents.map(event => (
                          <EventCard
                            key={event.id}
                            event={event}
                            onViewQR={() => handleViewQR(event)}
                          />
                        ))}
                      </div>
                    </section>
                  ) : (
                    <div className="text-center py-10">
                      <p className="text-gray-400">Não tens eventos próximos agendados.</p>
                    </div>
                  )}

                  {/* Eventos Recentes */}
                  {recentEvents.length > 0 && (
                    <section>
                      <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                        Eventos Recentes
                      </h3>
                      <div className="grid gap-4">
                        {recentEvents.map(event => (
                          <EventCard
                            key={event.id}
                            event={event}
                            onViewQR={() => handleViewQR(event)}
                          />
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Eventos Passados */}
                  {pastEvents.length > 0 && (
                    <section>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                          <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                          Eventos Passados
                        </h3>
                        <button
                          onClick={() => setShowAllPastEvents(!showAllPastEvents)}
                          className="text-sm text-gray-400 hover:text-white transition-colors"
                        >
                          {showAllPastEvents ? 'Ver menos' : 'Ver todos'}
                        </button>
                      </div>
                      <div className="grid gap-4">
                        {pastEvents.map(event => (
                          <EventCard
                            key={event.id}
                            event={event}
                            onViewQR={() => handleViewQR(event)}
                          />
                        ))}
                      </div>
                    </section>
                  )}
                </>
              )}
            </>
          )}

          {/* QR Modal */}
          <QRModal
            isOpen={qrModalOpen}
            onClose={() => setQrModalOpen(false)}
            event={selectedEvent}
          />
        </main>
        
        <BottomNav />
      </div>
    </ProtectedRoute>
  )
} 