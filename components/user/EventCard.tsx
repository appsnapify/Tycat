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
  }
  onViewQR: () => void
}

export default function EventCard({ event, onViewQR }: EventCardProps) {
  const eventDate = new Date(event.date)
  const now = new Date()
  const twentyFourHoursAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000))
  
  // ✅ CATEGORIZAÇÃO IGUAL AO SISTEMA AVANÇADO
  const isUpcoming = eventDate >= now
  const isRecent = eventDate < now && eventDate >= twentyFourHoursAgo
  const isPast = eventDate < twentyFourHoursAgo
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return {
      day: date.toLocaleDateString('pt-PT', { day: '2-digit' }),
      month: date.toLocaleDateString('pt-PT', { month: 'short' }).toUpperCase(),
      full: date.toLocaleDateString('pt-PT', { 
        day: 'numeric', 
        month: 'short',
        year: 'numeric'
      })
    }
  }

  // ✅ CORES E ESTILOS POR CATEGORIA (tema azul da imagem)
  const getEventStyles = () => {
    if (isUpcoming) {
      return {
        container: 'bg-white border-blue-200 shadow-lg',
        badge: 'bg-yellow-500 text-white',
        badgeText: 'PRÓXIMO',
        dateContainer: 'bg-yellow-500',
        dateText: 'text-white',
        contentText: 'text-blue-900'
      }
    }
    if (isRecent) {
      return {
        container: 'bg-white border-orange-200 shadow-lg',
        badge: 'bg-orange-500 text-white',
        badgeText: 'RECENTE',
        dateContainer: 'bg-orange-500',
        dateText: 'text-white',
        contentText: 'text-blue-900'
      }
    }
    // isPast
    return {
      container: 'bg-gray-50 border-gray-300 opacity-80',
      badge: 'bg-gray-500 text-white',
      badgeText: 'PASSADO',
      dateContainer: 'bg-gray-500',
      dateText: 'text-white',
      contentText: 'text-gray-700'
    }
  }

  const styles = getEventStyles()
  const dateInfo = formatDate(event.date)

  return (
    <div className={`${styles.container} border rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl`}>
      {/* Flyer com data sobreposta (como na imagem) */}
      <div className="relative h-40 bg-gradient-to-r from-blue-500 to-purple-600">
        {event.flyer_url ? (
          <Image
            src={event.flyer_url}
            alt={event.title}
            fill
            className="object-cover"
            priority={isUpcoming} // Prioriza carregamento para eventos futuros
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-white">
            <Calendar className="w-12 h-12" />
          </div>
        )}
        
        {/* Data no canto esquerdo (como na imagem Sara Simões) */}
        <div className={`absolute top-3 left-3 ${styles.dateContainer} rounded-lg px-3 py-2 text-center`}>
          <div className={`text-lg font-bold ${styles.dateText}`}>
            {dateInfo.day}
          </div>
          <div className={`text-xs font-medium ${styles.dateText}`}>
            {dateInfo.month}
          </div>
        </div>
        
        {/* Status Badge no canto direito */}
        {event.checked_in ? (
          <div className="absolute top-3 right-3 bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            USADO
          </div>
        ) : (
          <div className={`absolute top-3 right-3 ${styles.badge} px-3 py-1 rounded-full text-xs font-bold`}>
            {styles.badgeText}
          </div>
        )}

        {/* Ícone de coração/favorito no canto superior direito da imagem */}
        <div className="absolute top-3 right-12 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
          <div className="w-4 h-4 text-white">♡</div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        <h3 className={`font-bold text-lg leading-tight ${styles.contentText}`}>
          {event.title}
        </h3>
        
        <div className="space-y-2">
          <div className={`flex items-center gap-2 text-sm ${styles.contentText.replace('900', '700')}`}>
            <MapPin className="w-4 h-4 text-blue-500" />
            {event.location}
          </div>
        </div>

        {/* Check-in Status */}
        {event.checked_in && event.check_in_time && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-center gap-2 text-red-600 text-sm">
              <Clock className="w-4 h-4" />
              <span className="font-medium">Check-in realizado</span>
            </div>
            <p className="text-red-500 text-xs mt-1">
              {new Date(event.check_in_time).toLocaleString('pt-PT')}
            </p>
          </div>
        )}

        {!event.checked_in && isUpcoming && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="text-green-600 text-sm font-medium">
              ✅ Válido - Ainda não foi usado
            </div>
          </div>
        )}

        {!event.checked_in && isRecent && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
            <div className="text-orange-600 text-sm font-medium">
              📅 Evento recente - QR ainda válido
            </div>
          </div>
        )}

        {/* Action Button (Ver QR) */}
        <button
          onClick={onViewQR}
          className={`w-auto px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-all duration-300 ${
            isPast 
              ? 'bg-gray-200 hover:bg-gray-300 text-gray-600'
              : 'bg-[#F5B333] hover:bg-[#e5a42f] text-white shadow-md hover:shadow-lg'
          }`}
        >
          <QrCode className="w-4 h-4" />
          {isPast ? 'Histórico' : 'Ver QR'}
        </button>
      </div>
    </div>
  )
} 