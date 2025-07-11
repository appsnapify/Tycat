'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@/hooks/useUser'
import { Users, Ticket, Loader2, Heart, Calendar, MapPin } from 'lucide-react'
import QRModal from '@/components/user/QRModal'
import { useToast } from '@/hooks/use-toast'
import Image from 'next/image'

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
  type: 'guest-list' | 'ticket'
}

export default function UserDashboard() {
  const { user } = useUser()
  const { toast } = useToast()
  const [events, setEvents] = useState<EventGuest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<EventGuest | null>(null)
  const [qrModalOpen, setQrModalOpen] = useState(false)
  const [showPastEvents, setShowPastEvents] = useState(false)

  // ✅ Fetch eventos
  const fetchEvents = async () => {
    if (!user?.id) return

    try {
      setError(null)
      
      const response = await fetch(`/api/user/events?userId=${user.id}`)
      const data = await response.json()

      if (data.success) {
        setEvents(data.events || [])
      } else {
        throw new Error(data.error || 'Erro ao carregar eventos')
      }
    } catch (error) {
      console.error('❌ [USER-DASHBOARD] Erro:', error)
      setError(error instanceof Error ? error.message : 'Erro ao carregar eventos')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (user?.id) {
      fetchEvents()
    }
  }, [user?.id])

  // ✅ Categorizar eventos
  const categorizeEvents = (events: EventGuest[]) => {
    const now = new Date()
    
    const upcomingEvents = events
      .filter(event => new Date(event.date) >= now)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    const pastEvents = events
      .filter(event => new Date(event.date) < now)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    return { upcomingEvents, pastEvents }
  }

  const { upcomingEvents, pastEvents } = categorizeEvents(events)

  const handleViewQR = (event: EventGuest) => {
    setSelectedEvent(event)
    setQrModalOpen(true)
  }

  const handleViewPastEvents = () => {
    setShowPastEvents(true)
  }

  const formatEventDate = (dateString: string) => {
    const date = new Date(dateString)
    return {
      day: date.toLocaleDateString('pt-PT', { day: '2-digit' }),
      month: date.toLocaleDateString('pt-PT', { month: '2-digit' })
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-6 h-6 animate-spin text-yellow-400 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">A carregar...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="user-dashboard text-white">
      <main className="px-4 py-6 pb-24 max-w-md mx-auto space-y-6">
        {/* PRÓXIMOS EVENTOS */}
        <section>
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-lg font-medium text-white">Próximos Eventos</h2>
            <span className="text-sm text-gray-400">
              {upcomingEvents.length} {upcomingEvents.length === 1 ? 'evento' : 'eventos'}
            </span>
          </div>

          {upcomingEvents.length > 0 ? (
            <div className="space-y-4">
              {upcomingEvents.map(event => {
                const dateInfo = formatEventDate(event.date)
                return (
                  <div key={event.id} className="event-card relative bg-gray-800 rounded-2xl overflow-hidden shadow-lg">
                    {/* Imagem de Fundo */}
                    <div className="relative h-36">
                      {event.flyer_url ? (
                        <Image
                          src={event.flyer_url}
                          alt={event.title}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-yellow-500 via-orange-500 to-red-500" />
                      )}
                      
                      {/* Overlay suave */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                      
                      {/* Data e Tipo do Evento */}
                      <div className="absolute top-3 left-3 flex gap-2">
                        <div className="bg-yellow-500 text-black px-2.5 py-1.5 rounded-lg text-xs font-bold shadow-lg">
                          {dateInfo.day}/{dateInfo.month}
                        </div>
                        {event.type === 'guest-list' ? (
                          <div className="bg-purple-500 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold shadow-lg flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            Guest List
                          </div>
                        ) : (
                          <div className="bg-blue-500 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold shadow-lg flex items-center gap-1">
                            <Ticket className="w-3 h-3" />
                            Bilhete
                          </div>
                        )}
                      </div>
                      
                      {/* Coração no canto direito */}
                      <div className="absolute top-3 right-3">
                        <Heart className="w-5 h-5 text-white/80 drop-shadow-lg" />
                      </div>
                      
                      {/* Informações do Evento */}
                      <div className="absolute bottom-0 left-0 right-0 p-4">
                        <h3 className="event-title text-white font-semibold text-base mb-1 drop-shadow-lg">{event.title}</h3>
                        <div className="event-location flex items-center gap-1 text-white/90 text-xs">
                          <MapPin className="w-3 h-3" />
                          <span className="drop-shadow">{event.location}</span>
                        </div>
                      </div>
                      
                      {/* Botão Ver QR */}
                      <div className="absolute bottom-3 right-3">
                        <button
                          onClick={() => handleViewQR(event)}
                          className="bg-yellow-500 hover:bg-yellow-600 active:bg-yellow-700 text-black px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:translate-y-0"
                        >
                          Ver QR
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhum evento próximo</p>
            </div>
          )}
        </section>

        {/* EVENTOS PASSADOS */}
        <section>
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-lg font-medium text-white">Eventos Passados</h2>
            <span className="text-sm text-gray-400">
              {pastEvents.length} {pastEvents.length === 1 ? 'evento' : 'eventos'}
            </span>
          </div>

          {pastEvents.length > 0 && (
            <>
              {showPastEvents ? (
                <div className="space-y-4">
                  {pastEvents.map(event => {
                    const dateInfo = formatEventDate(event.date)
                    return (
                      <div key={event.id} className="event-card relative bg-gray-800/50 rounded-2xl overflow-hidden shadow-lg grayscale hover:grayscale-0 transition-all">
                        <div className="relative h-36">
                          {event.flyer_url ? (
                            <Image
                              src={event.flyer_url}
                              alt={event.title}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-gray-500 via-gray-600 to-gray-700" />
                          )}
                          
                          <div className="absolute inset-0 bg-black/40" />
                          
                          {/* Data e Tipo do Evento */}
                          <div className="absolute top-3 left-3 flex gap-2">
                            <div className="bg-gray-600 text-white/80 px-2.5 py-1.5 rounded-lg text-xs font-bold">
                              {dateInfo.day}/{dateInfo.month}
                            </div>
                            {event.type === 'guest-list' ? (
                              <div className="bg-purple-900/50 text-purple-200 px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                Guest List
                              </div>
                            ) : (
                              <div className="bg-blue-900/50 text-blue-200 px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1">
                                <Ticket className="w-3 h-3" />
                                Bilhete
                              </div>
                            )}
                          </div>
                          
                          <div className="absolute bottom-0 left-0 right-0 p-4">
                            <h3 className="text-white/80 font-semibold text-base mb-1">{event.title}</h3>
                            <div className="flex items-center gap-1 text-white/60 text-xs">
                              <MapPin className="w-3 h-3" />
                              <span>{event.location}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <button
                  onClick={handleViewPastEvents}
                  className="w-full bg-gray-800 hover:bg-gray-700 text-white py-3 px-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:translate-y-0"
                >
                  Ver {pastEvents.length} Eventos Passados
                </button>
              )}
            </>
          )}
        </section>

        {/* Error State */}
        {error && (
          <div className="bg-red-900/20 border border-red-700/50 rounded-xl p-4 text-center">
            <p className="text-red-400 mb-3 text-sm">{error}</p>
            <button
              onClick={fetchEvents}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {/* QR Modal */}
        <QRModal
          isOpen={qrModalOpen}
          onClose={() => setQrModalOpen(false)}
          event={selectedEvent}
        />
      </main>
    </div>
  )
} 