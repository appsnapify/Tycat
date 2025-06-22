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
  org_name?: string | null;
};

// Helper function to get initials
const getInitials = (firstName?: string | null, lastName?: string | null): string => {
  const firstInitial = firstName?.charAt(0)?.toUpperCase() || '';
  const lastInitial = lastName?.charAt(0)?.toUpperCase() || '';
  return `${firstInitial}${lastInitial}`;
};

// Shared background component with festival image - VERSION 6.0 FIXED PATH
function SharedBackground() {
  return (
    <>
      {/* Festival Hero Background Image with Correct Path */}
      <div 
        className="absolute inset-0"
        style={{
          backgroundImage: `
            url("/images/festival-hero-bg.jpg"),
            linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)
          `,
          backgroundSize: 'cover, cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundColor: '#1a1a2e',
        }}
      >
        {/* Overlay for text legibility */}
        <div className="absolute inset-0 bg-black/25"></div>
      </div>

      {/* Floating orbs for visual interest */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/8 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-32 right-16 w-96 h-96 bg-purple-500/8 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-indigo-500/8 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>
    </>
  );
}

// Shared header component with enhanced contrast
function SharedHeader() {
  return (
    <div className="px-4 sm:px-6 pt-8 pb-6">
      <div className="text-left">
        <h1 className="text-xl font-bold text-white mb-2 tracking-tight drop-shadow-lg">
          TYCAT
        </h1>
        <p className="text-white/80 text-sm italic drop-shadow-md">
          "Where the night comes alive"
        </p>
      </div>
    </div>
  );
}

// Hero section component with enhanced contrast
function PromoterHero({ userData }: { userData: any }) {
  return (
    <div className="px-4 sm:px-6 py-16 text-center">
      <h1 className="text-6xl md:text-8xl font-black text-white mb-8 tracking-tight drop-shadow-2xl [text-shadow:_0_4px_8px_rgb(0_0_0_/_0.8)]">
        {userData.first_name?.toUpperCase()} {userData.last_name?.toUpperCase()}
      </h1>
    </div>
  );
}

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
    <div className="min-h-screen bg-white relative flex items-center justify-center">
      {/* Overlay Pattern Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 via-transparent to-gray-100/40"></div>
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `radial-gradient(circle at 25px 25px, rgba(59, 130, 246, 0.5) 2px, transparent 0), 
                         radial-gradient(circle at 75px 75px, rgba(99, 102, 241, 0.3) 1px, transparent 0)`,
        backgroundSize: '100px 100px'
      }}></div>
      
      <div className="relative z-10 bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-2xl max-w-md mx-4">
        <p className="font-medium">Ocorreu um erro</p>
        <p className="text-sm">{message}</p>
      </div>
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
      return (
        <div className="min-h-screen bg-white relative flex items-center justify-center">
          {/* Overlay Pattern Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 via-transparent to-gray-100/40"></div>
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: `radial-gradient(circle at 25px 25px, rgba(59, 130, 246, 0.5) 2px, transparent 0), 
                             radial-gradient(circle at 75px 75px, rgba(99, 102, 241, 0.3) 1px, transparent 0)`,
            backgroundSize: '100px 100px'
          }}></div>
          
          <div className="relative z-10 text-center text-gray-900 max-w-md mx-4">
            <p className="text-lg">Ocorreu um erro ao buscar os eventos.</p>
            <p className="text-gray-500 text-sm mt-2">Por favor, tente novamente mais tarde.</p>
          </div>
        </div>
      );
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
        <div className="min-h-screen bg-black">
          {/* Hero Section com imagem de fundo */}
          <div className="relative overflow-hidden">
            <SharedBackground />
            
            <div className="relative z-20">
              <SharedHeader />
              <PromoterHero userData={userData} />
            </div>
            
            {/* Gradiente de transição suave para branco */}
            <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-b from-transparent via-transparent to-white"></div>
            
            {/* Gradiente adicional para transição super suave */}
            <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-b from-transparent via-black/5 to-white/95"></div>
            
            {/* Gradiente final para garantir transição perfeita */}
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-b from-transparent to-white"></div>
          </div>

          {/* Events Section sem imagem de fundo */}
          <div className="bg-white px-4 sm:px-6 pt-4 pb-12">
            <div className="text-center">
              <h2 className="text-4xl font-black text-black mb-8">Eventos</h2>
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-12 max-w-md mx-auto shadow-sm">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 border border-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <span className="text-3xl">📅</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Sem eventos ativos</h3>
                <p className="text-gray-600 text-sm leading-relaxed">Este promotor não tem eventos disponíveis no momento.</p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-black">
        {/* Hero Section com imagem de fundo */}
        <div className="relative overflow-hidden">
          <SharedBackground />
          
          <div className="relative z-20">
            <SharedHeader />
            <PromoterHero userData={userData} />
          </div>
          
          {/* Gradiente de transição suave para branco */}
          <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-b from-transparent via-transparent to-white"></div>
          
          {/* Gradiente adicional para transição super suave */}
          <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-b from-transparent via-black/5 to-white/95"></div>
          
          {/* Gradiente final para garantir transição perfeita */}
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-b from-transparent to-white"></div>
        </div>

        {/* Events Section sem imagem de fundo */}
        <div className="bg-white px-4 sm:px-6 pt-4 pb-12">
          <div className="text-center mb-8">
            <h2 className="text-4xl font-black text-black mb-8">Eventos</h2>
          </div>
          <EventsList events={futureEvents} />
        </div>
      </div>
    );
  } catch (error) {
    console.error('[ERROR] Erro não tratado:', error);
    return (
      <div className="min-h-screen bg-white relative flex items-center justify-center">
        {/* Overlay Pattern Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 via-transparent to-gray-100/40"></div>
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `radial-gradient(circle at 25px 25px, rgba(59, 130, 246, 0.5) 2px, transparent 0), 
                           radial-gradient(circle at 75px 75px, rgba(99, 102, 241, 0.3) 1px, transparent 0)`,
          backgroundSize: '100px 100px'
        }}></div>
        
        <div className="relative z-10 text-center text-gray-900 max-w-md mx-4">
          <p className="text-lg">Ocorreu um erro ao carregar a página.</p>
          <p className="text-gray-500 text-sm mt-2">Por favor, tente novamente mais tarde.</p>
        </div>
      </div>
    );
  }
}

// Loading component for events
function EventsLoading() {
  return (
    <div className="min-h-screen bg-black">
      {/* Hero Section com imagem de fundo */}
      <div className="relative overflow-hidden">
        <SharedBackground />
        
        <div className="relative z-20 space-y-6">
          {/* Header skeleton */}
          <div className="px-4 sm:px-6 pt-8 pb-6">
            <Skeleton className="h-6 w-16 bg-white/20 rounded" />
            <Skeleton className="h-4 w-32 bg-white/10 rounded mt-2" />
          </div>
          
          {/* Hero skeleton */}
          <div className="px-4 sm:px-6 py-16 text-center">
            <Skeleton className="h-20 md:h-32 w-3/4 mx-auto bg-white/20 rounded mb-8" />
            <Skeleton className="h-4 w-48 mx-auto bg-white/10 rounded" />
          </div>
        </div>
        
        {/* Gradiente de transição suave para branco */}
        <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-b from-transparent via-transparent to-white"></div>
        
        {/* Gradiente adicional para transição super suave */}
        <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-b from-transparent via-black/5 to-white/95"></div>
        
        {/* Gradiente final para garantir transição perfeita */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-b from-transparent to-white"></div>
      </div>
      
      {/* Events Section sem imagem de fundo */}
      <div className="bg-white px-4 sm:px-6 pt-4 pb-12">
        <Skeleton className="h-12 w-32 mx-auto bg-gray-300 rounded mb-8" />
        
        {/* Events grid skeleton */}
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-80 rounded-3xl bg-gray-200" />
            ))}
          </div>
        </div>
      </div>
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
    is_active: true, // Assume active from RPC
    is_published: true, // Assume published from RPC
    org_name: event.org_name, // Nome do organizador
  }));
} 