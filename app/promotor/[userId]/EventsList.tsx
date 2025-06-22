'use client';

import Link from 'next/link';
import { formatDate } from '@/lib/utils/date';
import Image from 'next/image';

type Event = {
  event_id: string;
  event_title: string;
  event_flyer_url: string | null;
  event_date: string;
  event_time: string | null;
  end_date: string | null;
  end_time: string | null;
  location: string | null;
  event_type: string | null;
  tracking_promoter_id: string;
  tracking_team_id: string | null;
  is_active: boolean;
  is_published: boolean;
  org_name?: string | null; // Nome do organizador
};

// Constants
const ANIMATION_DELAY_INCREMENT = 100; // ms
const EVENT_CARD_HEIGHT = 'h-80';
const TRANSITION_DURATION = 'duration-500';

export function EventsList({ events }: { events: Event[] }) {
  const formatEventDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      day: date.getDate().toString().padStart(2, '0'),
      month: date.toLocaleDateString('pt-PT', { month: 'short' }).toUpperCase(),
      year: date.getFullYear()
    };
  };

  const formatEventTime = (timeString: string | null) => {
    if (!timeString) return null;
    return timeString.substring(0, 5);
  };

  // Se não há eventos, mostrar mensagem
  if (!events || events.length === 0) {
    return (
      <div className="text-center">
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-12 max-w-md mx-auto shadow-sm">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 border border-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <span className="text-3xl">📅</span>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-3">Sem eventos ativos</h3>
          <p className="text-gray-600 text-sm leading-relaxed">Este promotor não tem eventos disponíveis no momento.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Grid Mobile-First adaptado para o design */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.map((event, index) => {
          // Garantir que o team_id está presente
          if (!event.tracking_team_id) {
            console.error('[ERROR] Team ID não encontrado para o evento:', event.event_id);
            return null;
          }

          // Construir o link para a página /promo
          const linkHref = `/promo/${event.event_id}/${event.tracking_promoter_id}/${event.tracking_team_id}`;
          const date = formatEventDate(event.event_date);

          return (
            <Link
              key={event.event_id}
              href={linkHref}
              className="group block focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-black rounded-3xl"
              aria-label={`Acessar guest list do evento ${event.event_title}`}
            >
              <div 
                className={`group relative overflow-hidden bg-white rounded-3xl border border-gray-200 hover:border-gray-300 transition-all ${TRANSITION_DURATION} transform hover:scale-[1.02] hover:-translate-y-2 cursor-pointer shadow-lg hover:shadow-xl`}
                style={{
                  animationDelay: `${index * ANIMATION_DELAY_INCREMENT}ms`,
                }}
              >
                {/* Background Image with Overlay */}
                <div className="absolute inset-0">
                  {event.event_flyer_url && (
                    <Image
                      src={event.event_flyer_url}
                      alt={`Flyer do evento ${event.event_title}`}
                      fill
                      className={`object-cover opacity-90 group-hover:opacity-100 transition-opacity ${TRANSITION_DURATION} group-hover:scale-105`}
                      priority={index < 3}
                      loading={index < 3 ? "eager" : "lazy"}
                      placeholder="blur"
                      blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      quality={75}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                </div>

                {/* Content */}
                <div className={`relative p-8 ${EVENT_CARD_HEIGHT} flex flex-col justify-between`}>
                  {/* Top Section */}
                  <div className="flex justify-between items-start">
                    <div className="text-white/80 text-sm font-medium tracking-wider">
                      {event.org_name || 'Organizador'}
                    </div>
                  </div>

                  {/* Center Section */}
                  <div className="text-center">
                    <h3 className={`text-2xl font-black text-white mb-2 tracking-tight group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-gray-300 transition-all ${TRANSITION_DURATION} line-clamp-2`}>
                      {event.event_title}
                    </h3>
                    {event.location && (
                      <p className="text-white/70 text-sm font-light tracking-wide">
                        {event.location}
                      </p>
                    )}
                  </div>

                  {/* Bottom Section */}
                  <div className="flex justify-between items-end">
                    <div className="text-white">
                      <div className="text-3xl font-black leading-none">{date.day}</div>
                      <div className="text-xs font-mono text-white/60 tracking-widest">{date.month}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-white/60 text-xs font-mono tracking-wider">GUEST</div>
                      <div className="text-2xl font-black text-white">LIST</div>
                    </div>
                  </div>

                  {/* Hover Overlay */}
                  <div className={`absolute inset-0 bg-gradient-to-t from-blue-500/10 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity ${TRANSITION_DURATION} pointer-events-none`}></div>
                </div>

                {/* Animated Border - versão mais suave */}
                <div className={`absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity ${TRANSITION_DURATION} pointer-events-none`}>
                  <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-blue-400 via-purple-400 to-blue-400 p-[1px] animate-pulse">
                    <div className="w-full h-full rounded-3xl bg-white"></div>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
} 