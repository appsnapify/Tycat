'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@/hooks/useUser'
import { Calendar, MapPin, Heart, ArrowLeft, Loader2 } from 'lucide-react'
import Header from '@/components/user/Header'
import BottomNav from '@/components/user/BottomNav'
import QRModal from '@/components/user/QRModal'
import ProtectedRoute from '@/components/user/ProtectedRoute'
import { useRouter } from 'next/navigation'
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
}

export default function EventsPage() {
  const { user } = useUser()
  const router = useRouter()
  const [events, setEvents] = useState<EventGuest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<EventGuest | null>(null)
  const [qrModalOpen, setQrModalOpen] = useState(false)

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
      console.error('❌ [EVENTS-PAGE] Erro:', error)
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

  const formatEventDate = (dateString: string) => {
    const date = new Date(dateString)
    return {
      day: date.toLocaleDateString('pt-PT', { day: '2-digit' }),
      month: date.toLocaleDateString('pt-PT', { month: '2-digit' }),
      full: date.toLocaleDateString('pt-PT', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })
    }
  }

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-yellow-400 mx-auto mb-4" />
            <p className="text-gray-400">A carregar eventos...</p>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-900 text-white pb-20">
        <Header />
        
        <main className="p-4 space-y-6">
          {/* Header com botão voltar */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/user/dashboard')}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-md transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
    <div>
              <h1 className="text-2xl font-bold text-white">Todos os Eventos</h1>
              <p className="text-gray-400 text-sm">
                {events.length} {events.length === 1 ? 'evento' : 'eventos'} no total
              </p>
            </div>
          </div>

          {/* PRÓXIMOS EVENTOS */}
          {upcomingEvents.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-white mb-4">
                Próximos Eventos ({upcomingEvents.length})
              </h2>
              
              <div className="space-y-4">
                {upcomingEvents.map(event => {
                  const dateInfo = formatEventDate(event.date)
                  return (
                    <div key={event.id} className="relative bg-gray-800 rounded-lg overflow-hidden">
                      <div className="relative h-40">
                        {event.flyer_url ? (
                          <Image
                            src={event.flyer_url}
                            alt={event.title}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-r from-yellow-500 to-orange-500" />
                        )}
                        
                        <div className="absolute inset-0 bg-black/40" />
                        
                        <div className="absolute top-3 left-3 bg-yellow-500 text-black px-3 py-2 rounded text-sm font-bold">
                          {dateInfo.day}/{dateInfo.month}
                        </div>
                        
                        <div className="absolute top-3 right-3">
                          <Heart className="w-6 h-6 text-white/70" />
                        </div>
                        
                        <div className="absolute bottom-0 left-0 right-0 p-4">
                          <h3 className="text-white font-bold text-lg mb-1">{event.title}</h3>
                          <div className="flex items-center gap-1 text-white/80 text-sm">
                            <MapPin className="w-4 h-4" />
                            {event.location}
                          </div>
                        </div>
                        
                        <div className="absolute bottom-4 right-4">
                          <button
                            onClick={() => handleViewQR(event)}
                            className="bg-yellow-500 hover:bg-yellow-600 text-black px-4 py-2 rounded text-sm font-bold transition-colors"
                          >
                            Ver QR
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* EVENTOS PASSADOS */}
          {pastEvents.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-white mb-4">
                Eventos Passados ({pastEvents.length})
              </h2>
              
              <div className="space-y-4">
                {pastEvents.map(event => {
                  const dateInfo = formatEventDate(event.date)
                  return (
                    <div key={event.id} className="relative bg-gray-800 rounded-lg overflow-hidden opacity-75">
                      <div className="relative h-32">
                        {event.flyer_url ? (
                          <Image
                            src={event.flyer_url}
                            alt={event.title}
                            fill
                            className="object-cover grayscale"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-r from-gray-600 to-gray-700" />
                        )}
                        
                        <div className="absolute inset-0 bg-black/60" />
                        
                        <div className="absolute top-3 left-3 bg-gray-600 text-white px-3 py-2 rounded text-sm font-bold">
                          PASSADO
                        </div>
                        
                        <div className="absolute bottom-0 left-0 right-0 p-4">
                          <h3 className="text-white font-bold text-lg mb-1">{event.title}</h3>
                          <div className="flex items-center gap-1 text-white/60 text-sm">
                            <Calendar className="w-4 h-4" />
                            {dateInfo.full}
                          </div>
                          <div className="flex items-center gap-1 text-white/60 text-sm">
                            <MapPin className="w-4 h-4" />
                            {event.location}
                          </div>
                        </div>
                        
                        <div className="absolute bottom-4 right-4">
                          <button
                            onClick={() => handleViewQR(event)}
                            className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded text-sm font-bold transition-colors"
                          >
                            Ver QR
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* Empty State */}
          {events.length === 0 && !error && (
            <div className="text-center py-20">
              <Calendar className="w-16 h-16 text-gray-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Nenhum evento encontrado</h3>
              <p className="text-gray-400 mb-4">Ainda não tens eventos registados.</p>
              <button
                onClick={fetchEvents}
                className="bg-yellow-500 hover:bg-yellow-600 text-black px-6 py-2 rounded-md font-medium transition-colors"
              >
                Atualizar
              </button>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 text-center">
              <p className="text-red-400 mb-3">{error}</p>
              <button
                onClick={fetchEvents}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md transition-colors"
              >
                Tentar novamente
              </button>
            </div>
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