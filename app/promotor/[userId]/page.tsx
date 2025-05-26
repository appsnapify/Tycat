import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
// Removed social icons import
import { Database } from '@/lib/database.types';
import Link from 'next/link'; // Re-added Link import
import Image from 'next/image';
// Import a reusable EventCard component (adjust path as needed)
import { EventCard } from '@/components/ui/event-card';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate } from '@/lib/utils/date';
import { EventImage } from '@/components/ui/event-image';
import { PromoterProfile } from './PromoterProfile';
import { EventsList } from './EventsList';

// Define the expected return type from our RPC
type PromoterPageDataEntry = {
  promoter_first_name: string | null;
  promoter_last_name: string | null;
  promoter_avatar_url: string | null;
  event_id: string;
  event_title: string | null;
  event_flyer_url: string | null;
  event_type: string | null;
  event_date: string | null;
  event_time: string | null;
  end_date: string | null;
  end_time: string | null;
  org_id: string | null;
  org_name: string | null;
  org_logo_url: string | null;
  team_id: string | null;
  tracking_promoter_id: string;
  tracking_team_id: string | null;
  is_active?: boolean;
  is_published?: boolean;
};

// Helper function to get initials
const getInitials = (firstName?: string | null, lastName?: string | null): string => {
  const firstInitial = firstName?.charAt(0)?.toUpperCase() || '';
  const lastInitial = lastName?.charAt(0)?.toUpperCase() || '';
  return `${firstInitial}${lastInitial}`;
};

// Removed renderSocialLink function
// Removed ProfileSocialMedia type

// Validation constants
const MAX_EVENTS_PER_PAGE = 50;
const VALID_EVENT_TYPES = ['guest-list', 'regular', 'vip'] as const;
type ValidEventType = typeof VALID_EVENT_TYPES[number];

// Validation functions
function isValidUUID(uuid: string): boolean {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(uuid);
}

function isValidEventType(type: string): type is ValidEventType {
  return VALID_EVENT_TYPES.includes(type as ValidEventType);
}

function validateEvent(event: PromoterPageDataEntry): boolean {
  if (!event.event_id || !isValidUUID(event.event_id)) return false;
  if (!event.event_title?.trim()) return false;
  if (event.event_type && !isValidEventType(event.event_type)) return false;
  if (event.event_date && isNaN(new Date(event.event_date).getTime())) return false;
  return true;
}

// Error component
function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
      <p className="font-medium">Ocorreu um erro</p>
      <p className="text-sm">{message}</p>
    </div>
  );
}

// Add this new component at the top of the file, after the imports
const EventImage = ({ src, alt }: { src: string; alt: string }) => {
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      className="object-cover transform group-hover:scale-105 transition-transform duration-300"
      onError={(e) => {
        const target = e.target as HTMLImageElement;
        target.src = '/images/event-placeholder.jpg';
      }}
    />
  );
};

// Update function signature to access params properly in Next.js 14
export default async function PromoterPublicPage({
  params,
}: {
  params: { userId: string };
}) {
  // Await the cookies store
  const cookieStore = await cookies();
  const { userId } = params;

  if (!isValidUUID(userId)) {
    console.error(`Invalid UUID format: ${userId}`);
    notFound();
  }

  try {
    const supabase = createServerComponentClient<Database>({
      cookies: () => cookieStore
    });

    const { data: rpcData, error: rpcError } = await supabase.rpc(
      'get_public_promoter_page_data',
      { promoter_user_id: userId }
    );

    if (rpcError) {
      console.error(`RPC Error fetching data for promoter ${userId}:`, rpcError);
      throw new Error('Falha ao carregar dados do promotor');
    }

    if (!rpcData || !Array.isArray(rpcData) || rpcData.length === 0) {
      const { data: promoterUser, error: userError } = await supabase
        .from('profiles')
        .select('first_name, last_name, avatar_url')
        .eq('id', userId)
        .single();

      if (userError || !promoterUser) {
        console.error(`Promoter not found: ${userId}`);
        notFound();
      }

      return (
        <PromoterProfile
          promoterUser={promoterUser}
          events={[]}
        />
      );
    }

    const validEvents = rpcData
      .filter(validateEvent)
      .slice(0, MAX_EVENTS_PER_PAGE);

    const promoterInfo = validEvents[0];

    return (
      <PromoterProfile
        promoterUser={{
          first_name: promoterInfo.promoter_first_name,
          last_name: promoterInfo.promoter_last_name,
          avatar_url: promoterInfo.promoter_avatar_url
        }}
        events={validEvents}
      />
    );

  } catch (error) {
    console.error('Error in PromoterPublicPage:', error);
    throw error;
  }
}

// Loading component for events
function EventsLoading() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-12">
      {[1, 2, 3].map((i) => (
        <div key={i} className="relative flex w-full flex-col rounded-xl bg-white bg-clip-border text-gray-700 shadow-md shadow-black/20 h-full">
          <Skeleton className="h-40 w-full rounded-t-xl" />
          <div className="p-6">
            <Skeleton className="h-6 w-3/4 mb-4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Event list component with error boundary
function EventsList({ events }: { events: PromoterPageDataEntry[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-12">
      {events.map((event, index) => {
        const linkHref = event.event_type === 'guest-list' && event.team_id && event.tracking_promoter_id
          ? `/promo/${event.event_id}/${event.tracking_promoter_id}/${event.team_id}`
          : `/e/${event.event_id}`;

                const eventDate = event.event_date ? new Date(event.event_date) : null;
        const formattedDate = eventDate?.toLocaleDateString('pt-BR', { 
          day: 'numeric',
          month: 'short'
        });
                
                return (
                  <Link href={linkHref} key={event.event_id} className="block no-underline group">
            <div className="relative flex w-full flex-col rounded-xl bg-white bg-clip-border text-gray-700 shadow-md hover:shadow-lg transition-shadow duration-300 h-full">
                      <div className="relative mx-4 -mt-6 h-40 overflow-hidden rounded-xl bg-clip-border text-white shadow-lg bg-gray-200">
                        {event.event_flyer_url ? (
                  <EventImage
                            src={event.event_flyer_url}
                            alt={event.event_title || 'Evento'}
                    priority={index === 0}
                          />
                        ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100">
                    <span className="text-gray-400">Sem imagem</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="p-6 flex flex-col flex-grow relative">
                {eventDate && (
                  <div className="absolute top-0 right-4 -mt-4 bg-blue-50 p-2 rounded-md shadow-sm text-center">
                          <span className="block text-xl font-bold text-blue-600 leading-tight">
                      {formattedDate}
                          </span>
                        </div>
                )}

                <h5 className="mb-4 block font-oswald text-xl font-semibold leading-snug tracking-normal text-blue-gray-900 antialiased group-hover:text-blue-600 transition-colors duration-300">
                          {event.event_title || 'Evento sem título'}
                        </h5>

                        {event.event_type && (
                          <p className="mb-4 block font-sans text-sm font-normal leading-relaxed text-gray-700 antialiased">
                            Tipo: <span className="font-semibold capitalize">{event.event_type.replace('-', ' ')}</span>
                          </p>
                        )}
                      </div>
                      
                      <div className="p-6 pt-0 flex justify-center">
                <span className="select-none rounded-lg bg-blue-500 py-2 px-4 text-center align-middle font-sans text-xs font-bold uppercase text-white shadow-md shadow-blue-500/20 group-hover:bg-blue-600 transition-colors duration-300">
                          Ver Evento
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
      </div>
    );
} 