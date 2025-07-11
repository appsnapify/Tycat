'use client'

import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Calendar, Clock, MapPin, X } from 'lucide-react'
import Image from 'next/image'

interface QRModalProps {
  isOpen: boolean
  onClose: () => void
  event: {
    title: string
    date: string
    location: string
    qr_code_url: string
    time?: string
  } | null
}

export default function QRModal({ isOpen, onClose, event }: QRModalProps) {
  if (!event) return null

  const formatEventDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="bg-[#0B0F17] text-white p-0 w-[90%] max-w-[400px] rounded-lg [&>button]:hidden"
      >
        <DialogTitle className="sr-only">
          {event.title}
        </DialogTitle>
        <DialogDescription className="sr-only">
          QR Code de acesso para o evento {event.title}. Apresente este código na entrada do evento.
        </DialogDescription>
        
        {/* Barra Superior Amarela */}
        <div className="bg-[#F5B333] w-full h-14 px-4 flex justify-between items-center">
          <h1 className="text-black font-bold text-lg">{event.title}</h1>
          <div className="flex items-center gap-2">
            <span className="text-black text-sm font-medium">Tycat</span>
            <button
              onClick={onClose}
              className="bg-black/20 p-1 rounded-lg hover:bg-black/30 transition-colors"
            >
              <X className="w-4 h-4 text-black" />
            </button>
          </div>
        </div>

        {/* Conteúdo Principal */}
        <div className="p-4">
          {/* Info do Evento */}
          <div className="space-y-2 mb-6">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#F5B333]" />
              <span className="text-gray-300 text-sm">{formatEventDate(event.date)}</span>
            </div>
            
            {event.time && (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#F5B333]" />
                <span className="text-gray-300 text-sm">{event.time}</span>
              </div>
            )}
            
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#F5B333]" />
              <span className="text-gray-300 text-sm">{event.location}</span>
            </div>
          </div>

          {/* QR Code */}
          <div className="flex justify-center">
            <div className="bg-white p-3 rounded-xl">
              <Image
                src={event.qr_code_url}
                alt="QR Code"
                width={200}
                height={200}
                className="w-full h-auto"
                priority
                sizes="(max-width: 400px) 200px, 200px"
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 