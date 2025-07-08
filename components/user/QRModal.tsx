'use client'

import React from 'react'
import Image from 'next/image'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { X, Download, Share2, Calendar, MapPin, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface QRModalProps {
  isOpen: boolean
  onClose: () => void
  event: {
    id: string
    title: string
    date: string
    location: string
    qr_code_url: string
    checked_in: boolean
    check_in_time: string | null
    time?: string
  } | null
}

export default function QRModal({ isOpen, onClose, event }: QRModalProps) {
  if (!event) return null

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('pt-PT', { 
      weekday: 'long',
      day: 'numeric', 
      month: 'long',
      year: 'numeric'
    })
  }

  const formatTime = (timeString?: string) => {
    if (!timeString) return null
    return timeString.substring(0, 5)
  }

  const handleDownload = async () => {
    try {
      const response = await fetch(event.qr_code_url)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `qr-${event.title.toLowerCase().replace(/\s+/g, '-')}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Erro ao baixar QR code:', error)
    }
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `QR Code - ${event.title}`,
          text: `QR Code para o evento: ${event.title}`,
          url: event.qr_code_url,
        })
      } catch (error) {
        console.error('Erro ao compartilhar:', error)
      }
    } else {
      // Fallback para copiar URL
      navigator.clipboard.writeText(event.qr_code_url)
      alert('Link do QR code copiado!')
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-gray-900 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-white text-lg font-bold">
            QR Code do Evento
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Event Info */}
          <div className="bg-gray-800 rounded-lg p-4 space-y-2">
            <h3 className="font-bold text-lg text-white">{event.title}</h3>
            
            <div className="space-y-1">
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

            {/* Status */}
            {event.checked_in && event.check_in_time ? (
              <div className="bg-red-900/20 border border-red-700 rounded-md p-2">
                <div className="flex items-center gap-2 text-red-400 text-xs">
                  <Clock className="w-3 h-3" />
                  Check-in realizado em: {new Date(event.check_in_time).toLocaleString('pt-PT')}
                </div>
              </div>
            ) : (
              <div className="bg-green-900/20 border border-green-700 rounded-md p-2">
                <div className="text-green-400 text-xs">
                  ✅ QR Code válido - Não foi utilizado
                </div>
              </div>
            )}
          </div>

          {/* QR Code */}
          <div className="flex justify-center">
            <div className="bg-white p-4 rounded-lg">
              <Image
                src={event.qr_code_url}
                alt={`QR Code para ${event.title}`}
                width={200}
                height={200}
                className="w-48 h-48"
                unoptimized
              />
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-blue-900/20 border border-blue-700 rounded-md p-3">
            <p className="text-blue-300 text-xs text-center">
              Apresente este QR code na entrada do evento para fazer check-in
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={handleDownload}
              variant="outline"
              className="flex-1 bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
            >
              <Download className="w-4 h-4 mr-2" />
              Baixar
            </Button>
            <Button
              onClick={handleShare}
              variant="outline"
              className="flex-1 bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Partilhar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 