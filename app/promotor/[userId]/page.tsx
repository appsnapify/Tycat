import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Database } from '@/lib/database.types';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { EventsList } from './EventsList';

// Define the expected return type from our RPC
type RPCEventData = {
  promoter_first_name: string;
  promoter_last_name: string;
  promoter_avatar_url: string;
  event_id: string;
  event_title: string;
  event_flyer_url: string;
  event_type: string;
  event_date: string;
  event_time: string;
  org_id: string;
  org_name: string;
  org_logo_url: string;
  tracking_promoter_id: string;
  tracking_team_id: string;
};

// Type for EventsList component
type EventForList = {
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
};

// Helper function to get initials
const getInitials = (firstName?: string | null, lastName?: string | null): string => {
  const firstInitial = firstName?.charAt(0)?.toUpperCase() || '';
  const lastInitial = lastName?.charAt(0)?.toUpperCase() || '';
  return `${firstInitial}${lastInitial}`;
};

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

// Error component
function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
      <p className="font-medium">Ocorreu um erro</p>
      <p className="text-sm">{message}</p>
    </div>
  );
}

interface PageProps {
  params: Promise<{
    userId: string;
  }>;
}

export default async function PromoterPublicPage({ params }: PageProps) {
  // Await params before using its properties (Next.js 15 requirement)
  const resolvedParams = await params;
  
  if (!resolvedParams?.userId) {
    console.error('[ERROR] ID do usuário não fornecido');
    notFound();
  }

  // Await cookies before using (Next.js 15 requirement)
  const cookieStore = await cookies();
  const supabase = createServerComponentClient<Database>({ cookies: () => cookieStore });

  try {
    // Buscar dados do usuário
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', resolvedParams.userId)
      .single();

    if (userError || !userData) {
      console.error('[ERROR] Erro ao buscar dados do usuário:', userError);
      notFound();
    }

    // Buscar eventos usando a função RPC get_public_promoter_page_data
    const { data: eventsData, error: eventsError } = await supabase
      .rpc('get_public_promoter_page_data', {
        promoter_user_id: resolvedParams.userId
      }) as { data: RPCEventData[] | null, error: any };

    if (eventsError) {
      console.error('[ERROR] Erro ao buscar eventos:', eventsError);
      return <div>Ocorreu um erro ao buscar os eventos. Por favor, tente novamente mais tarde.</div>;
    }

    // Map RPC data to EventsList format
    const mappedEvents = eventsData ? mapRPCDataToEventsList(eventsData) : [];

    // Filtrar apenas eventos futuros
    const currentDate = new Date();
    const futureEvents = mappedEvents.filter(event => {
      const eventDate = new Date(event.event_date);
      return eventDate >= currentDate;
    });

    // Se não houver eventos futuros, mostrar página sem eventos
    if (!futureEvents || futureEvents.length === 0) {
      return (
        <div className="container mx-auto p-4">
          <div className="text-center mb-8">
            <Avatar className="w-24 h-24 mx-auto mb-4">
              <AvatarImage src={userData.avatar_url || undefined} />
              <AvatarFallback>{getInitials(userData.first_name, userData.last_name)}</AvatarFallback>
            </Avatar>
            <h1 className="text-3xl font-bold">
              {userData.first_name} {userData.last_name}
            </h1>
            <p className="text-muted-foreground">Promotor</p>
          </div>

          <div className="text-center p-8 bg-gray-50 rounded-lg">
            <p className="text-lg text-gray-600">Este promotor não tem eventos ativos no momento.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="container mx-auto p-4">
        <div className="text-center mb-8">
          <Avatar className="w-24 h-24 mx-auto mb-4">
            <AvatarImage src={userData.avatar_url || undefined} />
            <AvatarFallback>{getInitials(userData.first_name, userData.last_name)}</AvatarFallback>
          </Avatar>
          <h1 className="text-3xl font-bold">
            {userData.first_name} {userData.last_name}
          </h1>
          <p className="text-muted-foreground">Promotor</p>
        </div>

        <EventsList events={futureEvents} />
      </div>
    );
  } catch (error) {
    console.error('[ERROR] Erro não tratado:', error);
    return <div>Ocorreu um erro ao carregar a página. Por favor, tente novamente mais tarde.</div>;
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

// Function to map RPC data to EventsList format
function mapRPCDataToEventsList(rpcData: RPCEventData[]): EventForList[] {
  return rpcData.map(event => ({
    event_id: event.event_id,
    event_title: event.event_title,
    event_flyer_url: event.event_flyer_url,
    event_date: event.event_date,
    event_time: event.event_time,
    end_date: null, // Not available from RPC
    end_time: null, // Not available from RPC
    location: null, // Not available from RPC
    event_type: event.event_type,
    tracking_promoter_id: event.tracking_promoter_id,
    tracking_team_id: event.tracking_team_id,
    is_active: true, // Assumed true from RPC filter
    is_published: true, // Assumed true from RPC filter
  }));
} 