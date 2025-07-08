'use client'

import Image from 'next/image'
import { Calendar, MapPin, QrCode, CheckCircle, Clock } from 'lucide-react'

interface EventCardProps {
  event: {
    id: string
    title: string
    date: string
    location: string
    flyer_url: string
    checked_in: boolean
    check_in_time: string | null
    time?: string
  }
  onViewQR: () => void
}

export default function EventCard({ event, onViewQR }: EventCardProps) {
  const eventDate = new Date(event.date)
  const now = new Date()
  const twentyFourHoursAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000))
  
  // ✅ CATEGORIZAÇÃO IGUAL AO CLIENTE-ISOLADO
  const isUpcoming = eventDate >= now
  const isRecent = eventDate < now && eventDate >= twentyFourHoursAgo
  const isPast = eventDate < twentyFourHoursAgo
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('pt-PT', { 
      day: 'numeric', 
      month: 'short' 
    })
  }

  const formatTime = (timeString?: string) => {
    if (!timeString) return null
    return timeString.substring(0, 5)
  }

  // ✅ CORES E ESTILOS POR CATEGORIA
  const getEventStyles = () => {
    if (isUpcoming) {
      return {
        container: 'bg-gray-800 border-blue-500/30',
        badge: 'bg-yellow-600 text-yellow-100',
        badgeText: 'PRÓXIMO'
      }
    }
    if (isRecent) {
      return {
        container: 'bg-gray-800 border-orange-500/30',
        badge: 'bg-orange-600 text-orange-100',
        badgeText: 'RECENTE'
      }
    }
    // isPast
    return {
      container: 'bg-gray-700 border-gray-600 opacity-75 grayscale',
      badge: 'bg-gray-600 text-gray-200',
      badgeText: 'PASSADO'
    }
  }

  const styles = getEventStyles()

  return (
    <div className={`${styles.container} border rounded-xl overflow-hidden transition-all duration-300`}>
      {/* Flyer */}
      <div className="relative h-40 bg-gray-700">
        {event.flyer_url ? (
          <Image
            src={event.flyer_url}
            alt={event.title}
            fill
            className="object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            <Calendar className="w-12 h-12" />
          </div>
        )}
        
        {/* Status Badge */}
        {event.checked_in ? (
          <div className="absolute top-2 right-2 bg-red-600 text-white px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            USADO
          </div>
        ) : (
          <div className={`absolute top-2 right-2 ${styles.badge} px-2 py-1 rounded-md text-xs font-medium`}>
            {styles.badgeText}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        <h3 className="font-bold text-white text-lg leading-tight">{event.title}</h3>
        
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-gray-300 text-sm">
            <Calendar className="w-4 h-4 text-blue-400" />
            <span>{formatDate(event.date)}</span>
            {event.time && (
              <span className="text-gray-400">• {formatTime(event.time)}</span>
            )}
          </div>
          
          <div className="flex items-center gap-2 text-gray-300 text-sm">
            <MapPin className="w-4 h-4 text-blue-400" />
            {event.location}
          </div>
        </div>

        {/* Check-in Status */}
        {event.checked_in && event.check_in_time && (
          <div className="bg-red-900/20 border border-red-700 rounded-md p-2">
            <div className="flex items-center gap-2 text-red-400 text-xs">
              <Clock className="w-3 h-3" />
              Check-in: {new Date(event.check_in_time).toLocaleString('pt-PT')}
            </div>
          </div>
        )}

        {!event.checked_in && isUpcoming && (
          <div className="bg-green-900/20 border border-green-700 rounded-md p-2">
            <div className="text-green-400 text-xs">
              ✅ Válido - Ainda não foi usado
            </div>
          </div>
        )}

        {!event.checked_in && isRecent && (
          <div className="bg-orange-900/20 border border-orange-700 rounded-md p-2">
            <div className="text-orange-400 text-xs">
              📅 Evento recente - QR ainda válido
            </div>
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={onViewQR}
          className={`w-full flex items-center justify-center gap-2 py-2 px-4 rounded-md font-medium transition-colors ${
            isPast 
              ? 'bg-gray-600 hover:bg-gray-500 text-gray-300'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          <QrCode className="w-4 h-4" />
          {isPast ? 'Histórico' : 'Ver QR Code'}
        </button>
      </div>
    </div>
  )
} 