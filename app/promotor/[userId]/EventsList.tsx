'use client';

import Link from 'next/link';
import { EventImage } from '@/components/ui/event-image';
import { formatDate } from '@/lib/utils/date';

type Event = {
  event_id: string;
  event_title: string;
  event_flyer_url: string | null;
  event_date: string;
  event_time: string | null;
  location: string | null;
  tracking_promoter_id: string;
  tracking_team_id: string | null;
  event_type?: string;
};

export function EventsList({ events }: { events: Event[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {events.map((event) => {
        // Construir o link baseado no tipo de evento
        const linkHref = event.event_type === 'guest-list' && event.tracking_team_id
          ? `/promo/${event.event_id}/${event.tracking_promoter_id}/${event.tracking_team_id}`
          : `/e/${event.event_id}`;

        return (
          <Link
            key={event.event_id}
            href={linkHref}
            className="group"
          >
            <div className="bg-white rounded-lg shadow-md overflow-hidden transition-transform duration-300 group-hover:shadow-xl">
              <div className="relative aspect-[3/2]">
                {event.event_flyer_url ? (
                  <EventImage src={event.event_flyer_url} alt={event.event_title} />
                ) : (
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                    <span className="text-gray-400">Sem imagem</span>
                  </div>
                )}
              </div>
              
              <div className="p-4">
                <h3 className="font-bold text-lg mb-2 text-gray-900 group-hover:text-blue-600 transition-colors">
                  {event.event_title}
                </h3>
                
                <div className="text-sm text-gray-600">
                  <p>{formatDate(event.event_date)}</p>
                  {event.event_time && (
                    <p>{event.event_time.substring(0, 5)}h</p>
                  )}
                  {event.location && (
                    <p className="mt-1">{event.location}</p>
                  )}
                </div>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
} 