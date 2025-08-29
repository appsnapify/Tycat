'use client';

import { Badge } from '@/components/ui/badge';
import Image from 'next/image';

interface ClientEvent {
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
}

interface PastEventCardProps {
  event: ClientEvent;
}

// ✅ FUNÇÃO: Format date (Complexidade: 1)
function formatEventDate(dateString: string) {
  const date = new Date(dateString);
  return {
    day: date.getDate().toString().padStart(2, '0'),
    month: date.toLocaleDateString('pt-PT', { month: 'short' }).toUpperCase(),
    year: date.getFullYear()
  };
}

// ✅ COMPONENTE: Past Event Card (Complexidade: 2)
export function PastEventCard({ event }: PastEventCardProps) {
  const { day, month, year } = formatEventDate(event.event_date);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
      <div className="absolute -top-2 -right-2 z-20">
        <div className="relative">
          <div className={`
            px-3 py-1.5 text-[10px] font-bold text-white shadow-lg transform rotate-3
            ${event.source === 'ORGANIZATION' 
              ? 'bg-gradient-to-r from-emerald-500 to-emerald-600' 
              : 'bg-gradient-to-r from-violet-500 to-violet-600'
            }
            rounded-lg border-2 border-white/50
          `}>
            {event.source === 'ORGANIZATION' ? 'GUEST' : 'BILHETE'}
          </div>
          <div className="absolute inset-0 bg-black/20 rounded-lg transform rotate-3 translate-x-1 translate-y-1 -z-10"></div>
        </div>
      </div>

      <div className="absolute inset-0">
        {event.event_flyer_url ? ( // +1
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

      <div className="relative p-6 h-64 flex flex-col justify-between">
        <div className="flex justify-between items-start">
          <div className="text-white/80 text-xs font-medium tracking-wider">
            {event.organization_name?.toUpperCase() || 'ORGANIZATION'}
          </div>
        </div>

        <div className="text-center">
          <h3 className="text-white font-bold text-lg mb-2 leading-tight">
            {event.title}
          </h3>
          <div className="text-white/90 text-sm">
            <div className="flex items-center justify-center gap-2">
              <span className="text-2xl font-bold">{day}</span>
              <div className="text-xs">
                <div>{month}</div>
                <div>{year}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center">
          <div className="text-lg font-black text-white">
            PASSADO
          </div>
        </div>
      </div>
    </div>
  );
}
