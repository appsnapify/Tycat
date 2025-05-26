'use client';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Suspense } from 'react';
import { EventsList } from './EventsList';

// Helper function to get initials
const getInitials = (firstName?: string | null, lastName?: string | null): string => {
  const firstInitial = firstName?.charAt(0)?.toUpperCase() || '';
  const lastInitial = lastName?.charAt(0)?.toUpperCase() || '';
  return `${firstInitial}${lastInitial}`;
};

// Error component
function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
      <p className="font-medium">Ocorreu um erro</p>
      <p className="text-sm">{message}</p>
    </div>
  );
}

function EventsLoading() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3].map((n) => (
        <div key={n} className="animate-pulse">
          <div className="bg-gray-200 h-48 rounded-lg mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      ))}
    </div>
  );
}

type PromoterProfileProps = {
  promoterUser: {
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  };
  events: any[]; // Use the proper type from your page component
};

export function PromoterProfile({ promoterUser, events }: PromoterProfileProps) {
  const promoterName = `${promoterUser.first_name || ''} ${promoterUser.last_name || ''}`.trim() || 'Promotor';
  const initials = getInitials(promoterUser.first_name, promoterUser.last_name);
  const avatarUrl = promoterUser.avatar_url;

  // Get current date for filtering
  const now = new Date();
  
  // Filter and sort events
  const visibleEvents = events
    .filter((event) => {
      if (!event.event_date) return false;
      
      // Convert event date to Date object with time
      const eventDate = new Date(event.event_date);
      if (event.event_time) {
        const [hours, minutes] = event.event_time.split(':');
        eventDate.setHours(parseInt(hours, 10), parseInt(minutes, 10));
      }
      
      // Handle end date and time
      let eventEndDate;
      if (event.end_date) {
        eventEndDate = new Date(event.end_date);
        if (event.end_time) {
          const [hours, minutes] = event.end_time.split(':');
          eventEndDate.setHours(parseInt(hours, 10), parseInt(minutes, 10));
        } else {
          eventEndDate.setHours(23, 59, 59, 999);
        }
      } else {
        // If no end date, use event date and set to end of day
        eventEndDate = new Date(event.event_date);
        eventEndDate.setHours(23, 59, 59, 999);
      }
      
      // Show event if:
      // 1. It's active and published
      // 2. End date/time hasn't passed yet
      // 3. Remove duplicates based on event_id
      return (
        (event.is_active !== false) && // undefined or true
        (event.is_published !== false) && // undefined or true
        eventEndDate >= now
      );
    })
    // Remove duplicates by event_id
    .filter((event, index, self) => 
      index === self.findIndex((e) => e.event_id === event.event_id)
    )
    .sort((a, b) => {
      if (!a.event_date || !b.event_date) return 0;
      const dateA = new Date(a.event_date);
      const dateB = new Date(b.event_date);
      return dateA.getTime() - dateB.getTime();
    });

  return (
    <div className="min-h-screen bg-white font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-8">
        <div className="flex flex-col items-center text-center">
          <div className="w-28 h-28 rounded-full bg-gray-200 overflow-hidden border-8 border-white shadow-md mb-4">
            <Avatar className="h-full w-full">
              {avatarUrl ? (
                <AvatarImage src={avatarUrl} alt={promoterName} className="object-cover" />
              ) : null}
              <AvatarFallback className="text-3xl">
                {initials || 'P'}
              </AvatarFallback>
            </Avatar>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 font-oswald">{promoterName}</h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-10 font-oswald">Eventos</h2>
        <Suspense fallback={<EventsLoading />}>
          {visibleEvents.length > 0 ? (
            <EventsList events={visibleEvents} />
          ) : (
            <p className="text-center text-gray-600">Nenhum evento encontrado para este promotor.</p>
          )}
        </Suspense>
      </div>
    </div>
  );
} 