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
  const isPastEvent = eventDate < now
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('pt-PT', { 
      day: 'numeric', 
      month: 'short' 
    })
  }

  return (
    <div className={`bg-gray-800 border border-gray-700 rounded-xl overflow-hidden ${isPastEvent ? 'opacity-75' : ''}`}>
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
        {event.checked_in && (
          <div className="absolute top-2 right-2 bg-red-600 text-white px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            USADO
          </div>
        )}
        
        {isPastEvent && !event.checked_in && (
          <div className="absolute top-2 right-2 bg-gray-600 text-white px-2 py-1 rounded-md text-xs font-medium">
            PASSADO
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        <h3 className="font-bold text-white text-lg leading-tight">{event.title}</h3>
        
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-gray-300 text-sm">
            <Calendar className="w-4 h-4 text-blue-400" />
            {formatDate(event.date)}
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

        {!event.checked_in && !isPastEvent && (
          <div className="bg-green-900/20 border border-green-700 rounded-md p-2">
            <div className="text-green-400 text-xs">
              ✅ Válido - Ainda não foi usado
            </div>
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={onViewQR}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md font-medium transition-colors"
        >
          <QrCode className="w-4 h-4" />
          Ver QR Code
        </button>
      </div>
    </div>
  )
} 