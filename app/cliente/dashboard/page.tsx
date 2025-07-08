'use client'

import { useClienteIsolado } from '@/hooks/useClienteIsolado'
import ProtectedRoute from '@/components/cliente-isolado/ProtectedRoute'
import Header from '@/components/user/Header'
import BottomNav from '@/components/user/BottomNav'
import EventCard from '@/components/user/EventCard'
import QRModal from '@/components/user/QRModal'
import { useState, useEffect } from 'react'
import { Calendar, Loader2, AlertCircle, RefreshCw } from 'lucide-react'

interface Event {
  id: string
  event_id: string
  qr_code_url: string
  checked_in: boolean
  check_in_time: string | null
  title: string
  description: string
  date: string
  time: string
  location: string
  flyer_url: string
  status: string
  event_datetime: string
}

// ✅ Interface compatível com EventCard existente
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

export default function DashboardPage() {
  const { user } = useClienteIsolado()
  const [events, setEvents] = useState<Event[]>([])
  const [isLoadingEvents, setIsLoadingEvents] = useState(true)
  const [eventsError, setEventsError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  // ✅ Estados QR Modal
  const [qrModalOpen, setQrModalOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<EventGuest | null>(null)

  // ✅ Carregar eventos do utilizador
  const fetchEvents = async (force = false) => {
    if (!user?.id) return
    
    try {
      console.log('🔥 [CLIENTE-DASHBOARD] Carregando eventos para:', user.id)
      setIsLoadingEvents(true)
      setEventsError(null)

      const response = await fetch(`/api/cliente-isolado/events?userId=${user.id}`, {
        method: 'GET',
        cache: force ? 'no-store' : 'default'
      })

      const data = await response.json()

      if (data.success) {
        console.log('✅ [CLIENTE-DASHBOARD] Eventos carregados:', data.events.length)
        setEvents(data.events || [])
      } else {
        throw new Error(data.error || 'Erro ao carregar eventos')
      }

    } catch (error) {
      console.error('❌ [CLIENTE-DASHBOARD] Erro carregar eventos:', error)
      setEventsError(error instanceof Error ? error.message : 'Erro ao carregar eventos')
    } finally {
      setIsLoadingEvents(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    fetchEvents()
  }, [user?.id])

  // ✅ Refresh manual
  const handleRefresh = async () => {
    setIsRefreshing(true)
    await fetchEvents(true)
  }

  // ✅ Converter eventos para interface compatível
  const convertToEventGuest = (events: Event[]): EventGuest[] => {
    return events.map(event => ({
      id: event.id,
      event_id: event.event_id,
      qr_code_url: event.qr_code_url,
      checked_in: event.checked_in,
      check_in_time: event.check_in_time,
      title: event.title,
      date: event.date,
      location: event.location,
      flyer_url: event.flyer_url,
      description: event.description,
      time: event.time
    }))
  }

  // ✅ Categorizar eventos por data (mesmo sistema do user/dashboard)
  const categorizeEvents = (events: EventGuest[]) => {
    const now = new Date()
    const twentyFourHoursAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000))

    const upcomingEvents = events
      .filter(event => new Date(event.date) >= now)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    const recentEvents = events
      .filter(event => {
        const eventDate = new Date(event.date)
        return eventDate < now && eventDate >= twentyFourHoursAgo
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    const pastEvents = events
      .filter(event => new Date(event.date) < twentyFourHoursAgo)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 4) // Limite de 4 eventos passados

    return { upcomingEvents, recentEvents, pastEvents }
  }

  const eventGuests = convertToEventGuest(events)
  const { upcomingEvents, recentEvents, pastEvents } = categorizeEvents(eventGuests)

  // ✅ Handler QR Modal
  const handleViewQR = (event: EventGuest) => {
    setSelectedEvent(event)
    setQrModalOpen(true)
  }

  return (
    <ProtectedRoute>
      {/* Layout original: flex flex-col min-h-screen */}
      <div className="flex flex-col min-h-screen">
        <Header 
          userFirstName={user?.firstName} 
          avatarUrl={user?.avatarUrl} 
        />
        
        <main className="flex-grow p-4 bg-white">
          {/* Header interno com visual moderno */}
          <div className="mb-6">
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Olá, {user?.firstName || 'Cliente'}!</h1>
                  <p className="text-sm text-gray-500 mt-1">
                    {isLoadingEvents 
                      ? 'A carregar os seus eventos...'
                      : `${events.length} eventos encontrados`
                    }
                  </p>
                </div>
                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
          </div>

          {/* Estados de carregamento e erro */}
          {isLoadingEvents && (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
              <p className="text-gray-600">A carregar os seus eventos...</p>
            </div>
          )}

          {eventsError && (
            <div className="text-center py-12">
              <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Erro ao carregar eventos</h3>
              <p className="text-gray-500 mb-4">{eventsError}</p>
              <button
                onClick={handleRefresh}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md transition-colors"
              >
                Tentar novamente
              </button>
            </div>
          )}

          {/* Lista de eventos */}
          {!isLoadingEvents && !eventsError && (
            <>
              {/* Próximos Eventos */}
              {upcomingEvents.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                    Próximos Eventos ({upcomingEvents.length})
                  </h2>
                  <div className="space-y-4">
                    {upcomingEvents.map((event) => (
                      <EventCard
                        key={event.id}
                        event={event}
                        onViewQR={() => handleViewQR(event)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Eventos Recentes */}
              {recentEvents.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                    Eventos Recentes ({recentEvents.length})
                  </h2>
                  <div className="space-y-4">
                    {recentEvents.map((event) => (
                      <EventCard
                        key={event.id}
                        event={event}
                        onViewQR={() => handleViewQR(event)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Eventos Passados */}
              {pastEvents.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                    Eventos Passados ({pastEvents.length})
                  </h2>
                  <div className="space-y-4">
                    {pastEvents.map((event) => (
                      <EventCard
                        key={event.id}
                        event={event}
                        onViewQR={() => handleViewQR(event)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Empty State */}
              {events.length === 0 && (
                <div className="text-center py-20">
                  <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Nenhum evento encontrado</h3>
                  <p className="text-gray-500 mb-4">Ainda não está registado em nenhum evento.</p>
                  <button
                    onClick={handleRefresh}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md transition-colors"
                  >
                    Atualizar
                  </button>
                </div>
              )}
            </>
          )}
        </main>

        <BottomNav />

        {/* QR Modal */}
        <QRModal
          isOpen={qrModalOpen}
          onClose={() => setQrModalOpen(false)}
          event={selectedEvent}
        />
      </div>
    </ProtectedRoute>
  )
} 