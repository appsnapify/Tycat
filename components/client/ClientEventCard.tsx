'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { QrCode, ImageOff } from 'lucide-react';
import Image from 'next/image';

interface ClientEventCardProps {
  event: {
    id: string;
    title: string;
    description: string | null;
    event_date: string;
    start_time: string;
    end_time: string;
    location: string | null;
    event_flyer_url: string | null;
    guest_id: string;
    qr_code: string;
    qr_code_url: string;
    checked_in: boolean;
    check_in_time: string | null;
    source: string;
    organization_name: string;
  };
  isPastEvent?: boolean;
}

// ✅ COMPLEXIDADE: 3 pontos (1 base + 2 condições)
export function ClientEventCard({ event, isPastEvent = false }: ClientEventCardProps) {
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

  // ✅ FUNÇÃO: Format date (Complexidade: 1)
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: '2-digit'
    });
  };

  // ✅ FUNÇÃO: Format time (Complexidade: 2)
  const formatTime = (timeString: string): string => {
    if (!timeString) return ''; // +1
    return timeString.slice(0, 5); // HH:MM
  };

  // ✅ FUNÇÃO: Get check-in display (Complexidade: 3)
  const getCheckInDisplay = () => {
    if (isPastEvent) { // +1
      return event.checked_in ? 'PRESENTE' : 'AUSENTE'; // +1
    } else {
      return event.checked_in ? 'CHECK-IN ✓' : 'VÁLIDOS'; // +1
    }
  };

  const eventDate = formatDate(event.event_date);
  const startTime = formatTime(event.start_time);
  const endTime = formatTime(event.end_time);
  const checkInStatus = getCheckInDisplay();

  return (
    <>
      {/* Container para etiqueta ficar por cima do card */}
      <div className="relative">
        {/* Indicador tipo etiqueta no canto superior direito - FORA DO CARD */}
        <div className="absolute -top-2 -right-2 z-20">
          <div className="relative">
            <div className={`
              px-3 py-1.5 text-xs font-bold text-white shadow-lg transform rotate-3
              ${event.source === 'ORGANIZATION' 
                ? 'bg-gradient-to-r from-emerald-500 to-emerald-600' 
                : 'bg-gradient-to-r from-violet-500 to-violet-600'
              }
              rounded-lg border-2 border-white/50
            `}>
              {event.source === 'ORGANIZATION' ? 'GUEST' : 'BILHETE'}
            </div>
            {/* Sombra da etiqueta */}
            <div className="absolute inset-0 bg-black/20 rounded-lg transform rotate-3 translate-x-1 translate-y-1 -z-10"></div>
          </div>
        </div>

        {/* Card EXATAMENTE igual ao dos eventos passados */}
        <div 
          className="relative overflow-hidden bg-white rounded-2xl border border-gray-200 shadow-lg"
        >
          {/* Background Image with Overlay - IGUAL AOS PASSADOS */}
          <div className="absolute inset-0">
            {event.event_flyer_url ? (
              <Image
                src={event.event_flyer_url}
                alt={`Flyer do evento ${event.title}`}
                fill
                className="object-cover opacity-90"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                quality={75}
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-slate-200 to-slate-300"></div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent"></div>
          </div>

          {/* Overlay para eventos passados */}
          {isPastEvent && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-lg">
                <span className="text-xs font-bold text-slate-800 tracking-wider">
                  REALIZADO
                </span>
              </div>
            </div>
          )}

        {/* Content - EXATAMENTE igual aos passados */}
        <div className="relative p-6 h-64 flex flex-col justify-between">
          
          {/* Top Section */}
          <div className="flex justify-between items-start">
            <div className="text-white/80 text-xs font-medium tracking-wider">
              {event.organization_name?.toUpperCase() || 'ORGANIZATION'}
            </div>
            <div className="px-2 py-1 rounded-full text-xs font-medium bg-emerald-500/80 text-white">
              VÁLIDO
            </div>
          </div>

          {/* Center Section */}
          <div className="text-center">
            <h3 className="text-lg font-black text-white mb-2 tracking-tight line-clamp-2">
              {event.title}
            </h3>
          </div>

          {/* Bottom Section */}
          <div className="flex justify-between items-end">
            <div className="text-white">
              <div className="text-2xl font-black leading-none">{formatDate(event.event_date).split('/')[0]}</div>
              <div className="text-xs font-mono text-white/60 tracking-widest">
                {new Date(event.event_date).toLocaleDateString('pt-PT', { month: 'short' }).toUpperCase()}
              </div>
            </div>
            <div className="text-right">
              <button
                onClick={() => setIsQrModalOpen(true)}
                className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-medium px-2 py-1 rounded transition-colors duration-200 flex items-center gap-1"
              >
                <QrCode className="w-3 h-3" />
                <span>QR</span>
              </button>
            </div>
          </div>
        </div>
        </div>
      </div>

      {/* Modal QR Code */}
      <Dialog open={isQrModalOpen} onOpenChange={setIsQrModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">QR Code do Evento</DialogTitle>
            <DialogDescription className="text-center text-sm text-gray-600">
              Apresente este código QR na entrada do evento para fazer check-in.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-4 p-4">
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              {event.qr_code_url ? (
                <Image
                  src={event.qr_code_url}
                  alt="QR Code"
                  width={200}
                  height={200}
                  className="w-48 h-48"
                />
              ) : (
                <div className="w-48 h-48 bg-slate-100 flex items-center justify-center rounded">
                  <QrCode className="w-12 h-12 text-slate-400" />
                </div>
              )}
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-slate-800">{event.title}</p>
              <p className="text-xs text-slate-600 mt-1">
                Apresente este código na entrada
              </p>
              {event.location && (
                <p className="text-xs text-slate-500 mt-2">
                  📍 {event.location}
                </p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

