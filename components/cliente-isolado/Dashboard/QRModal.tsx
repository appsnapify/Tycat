'use client'

import { X, Download, Calendar, MapPin, CheckCircle, Clock } from 'lucide-react'
import Image from 'next/image'

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
  } | null
}

export default function QRModal({ isOpen, onClose, event }: QRModalProps) {
  if (!isOpen || !event) return null

  const downloadQR = async () => {
    try {
      const response = await fetch(event.qr_code_url)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `qr-${event.title.replace(/\s+/g, '-')}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Erro ao fazer download:', error)
    }
  }

  const getStatusInfo = () => {
    if (event.checked_in) {
      const checkInTime = event.check_in_time 
        ? new Date(event.check_in_time).toLocaleString('pt-PT', {
            day: '2-digit',
            month: '2-digit', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })
        : 'Data não disponível'
      
      return {
        text: "Usado - Check-in realizado",
        subtext: `Check-in em: ${checkInTime}`,
        color: "text-red-400",
        bgColor: "bg-red-900/20",
        borderColor: "border-red-700",
        icon: CheckCircle
      }
    } else {
      return {
        text: "Válido - Ainda não foi usado",
        subtext: "Apresente este QR code na entrada do evento",
        color: "text-green-400", 
        bgColor: "bg-green-900/20",
        borderColor: "border-green-700",
        icon: Clock
      }
    }
  }

  const status = getStatusInfo()
  const StatusIcon = status.icon

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">QR Code de Entrada</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* QR Code */}
          <div className="text-center">
            <div className="bg-white p-4 rounded-2xl inline-block relative group cursor-pointer">
              <Image
                src={event.qr_code_url}
                alt="QR Code"
                width={200}
                height={200}
                className="rounded-lg"
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.style.display = 'none'
                  target.nextElementSibling?.classList.remove('hidden')
                }}
              />
              <div className="hidden text-gray-500 text-center py-8">
                ❌ QR Code não disponível
              </div>
            </div>
          </div>

          {/* Event Info */}
          <div className="space-y-3">
            <h3 className="font-bold text-white text-lg">{event.title}</h3>
            
            <div className="flex items-center gap-2 text-gray-300">
              <MapPin className="w-4 h-4 text-blue-400" />
              {event.location}
            </div>
            
            <div className="flex items-center gap-2 text-gray-300">
              <Calendar className="w-4 h-4 text-blue-400" />
              {new Date(event.date).toLocaleDateString('pt-PT', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })}
            </div>
          </div>

          {/* Status */}
          <div className={`${status.bgColor} border ${status.borderColor} rounded-lg p-3`}>
            <div className={`flex items-center gap-2 ${status.color} font-medium text-sm`}>
              <StatusIcon className="w-4 h-4" />
              {status.text}
            </div>
            <p className={`${status.color} text-xs mt-1 opacity-75`}>
              {status.subtext}
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md font-medium transition-colors"
            >
              Fechar
            </button>
            <button
              onClick={downloadQR}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors"
            >
              <Download className="w-4 h-4" />
              Download QR
            </button>
          </div>
        </div>
      </div>
    </div>
  )
} 