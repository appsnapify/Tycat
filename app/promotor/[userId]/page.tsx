import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { Database } from '@/lib/database.types';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Calendar, Users, Star, TrendingUp, Award } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

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
  event_slug?: string | null;
};

// Helper function to get initials
const getInitials = (firstName?: string | null, lastName?: string | null): string => {
  const firstInitial = firstName?.charAt(0)?.toUpperCase() || '';
  const lastInitial = lastName?.charAt(0)?.toUpperCase() || '';
  return `${firstInitial}${lastInitial}`;
};

// Helper function to format date
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-PT', { 
    day: 'numeric', 
    month: 'short' 
  });
};

// Simple Promoter Header Component
function PromoterHeader({ 
  userData
}: { 
  userData: { first_name: string | null; last_name: string | null }; 
}) {
  const initials = getInitials(userData.first_name, userData.last_name);
  const fullName = `${userData.first_name || 'Promotor'} ${userData.last_name || ''}`.trim();
  
  return (
    <div className="relative px-4 sm:px-6 pt-16 sm:pt-20 pb-8 sm:pb-12">
      {/* TYCAT Logo */}
      <div className="absolute top-6 right-6 z-20">
        <div className="text-xl sm:text-2xl font-black bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent">
          TYCAT
        </div>
          </div>

      <div className="relative z-10 max-w-6xl mx-auto text-center">
        {/* Simple Avatar */}
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center mx-auto mb-6 shadow-lg">
          <span className="text-2xl sm:text-3xl font-bold text-white">
            {initials}
          </span>
        </div>

        {/* Simple Profile Info */}
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2 tracking-tight">
          {fullName}
        </h1>
        <p className="text-slate-600 text-lg">Promotor de Eventos</p>
      </div>
    </div>
  );
}

// Modern Error component
function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-6">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-red-500 text-2xl">⚠️</span>
        </div>
        <h1 className="text-2xl font-bold mb-4 text-slate-800">Ocorreu um erro</h1>
        <p className="text-slate-600 mb-6">{message}</p>
        <button
          onClick={() => window.history.back()}
          className="px-6 py-3 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 transition-colors"
        >
          Voltar
        </button>
      </div>
    </div>
  );
}

interface PageProps {
  params: Promise<{
    userId: string; // Pode ser UUID ou slug
  }>;
}

// Helper function to detect if a string is a UUID
function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// ✅ FUNÇÃO AUXILIAR 1: Resolver dados do usuário (Complexidade: 3)
async function resolveUserData(supabase: any, userId: string): Promise<{ id: string; first_name: string | null; last_name: string | null } | null> {
  if (isUUID(userId)) {
      const { data, error } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .eq('id', userId)
      .single();
      
    if (error || !data) return null;
    return data;
    } else {
      const { data: slugData, error: slugError } = await supabase
      .rpc('resolve_promoter_slug' as any, { input_slug: userId });
      
      if (slugError || !slugData || !Array.isArray(slugData) || slugData.length === 0) {
      return null;
      }
      
      const promoterData = (slugData as any[])[0];
    return {
        id: promoterData.promoter_id,
        first_name: promoterData.first_name,
        last_name: promoterData.last_name
      };
  }
}

// ✅ FUNÇÃO AUXILIAR 2: Obter slug do promotor (Complexidade: 2)
async function getPromoterSlug(supabase: any, userId: string, userParam: string): Promise<string> {
  if (isUUID(userParam)) {
      const { data: slugData } = await (supabase as any)
        .from('profile_slugs')
        .select('slug')
      .eq('profile_id', userId)
        .eq('is_active', true)
        .single();
    return slugData?.slug || '';
    } else {
    return userParam;
  }
}

// ✅ FUNÇÃO AUXILIAR 3: Processar dados de eventos (Complexidade: 2)
async function processEventsData(supabase: any, userData: any, eventsData: RPCEventData[]): Promise<EventForList[]> {
  let mappedEvents = mapRPCDataToEventsList(eventsData);

    if (mappedEvents.length > 0) {
      const eventIds = mappedEvents.map(event => event.event_id);
      
    const [{ data: locationData }, { data: eventSlugsData }] = await Promise.all([
      supabase.from('events').select('id, location').in('id', eventIds),
      (supabase as any).from('event_slugs').select('event_id, slug').in('event_id', eventIds).eq('is_active', true)
    ]);

        mappedEvents = mappedEvents.map(event => {
        const locationInfo = locationData?.find(loc => loc.id === event.event_id);
        const slugInfo = (eventSlugsData as any)?.find((slug: any) => slug.event_id === event.event_id);
          return {
            ...event,
          location: locationInfo?.location || null,
          event_slug: slugInfo?.slug || null
          };
        });
    }

  return mappedEvents;
}

// ✅ FUNÇÃO AUXILIAR 4: Filtrar eventos futuros (Complexidade: 1)
function filterFutureEvents(events: EventForList[]): EventForList[] {
    const currentDate = new Date();
  return events.filter(event => {
      const eventDate = new Date(event.event_date);
      return eventDate >= currentDate;
    });
}

// ✅ FUNÇÃO AUXILIAR 5: Renderizar página sem eventos (Complexidade: 1)
function renderNoEventsPage(userData: any): JSX.Element {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30">
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none" aria-hidden="true">
            <div className="absolute -top-40 -left-40 w-80 h-80 bg-emerald-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
            <div className="absolute top-40 right-40 w-80 h-80 bg-violet-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
            <div className="absolute bottom-40 left-20 w-60 h-60 bg-amber-200 rounded-full mix-blend-multiply filter blur-2xl opacity-15"></div>
          </div>

          <div className="relative z-10">
          <PromoterHeader userData={userData} />
          
            <div className="px-4 sm:px-6 pb-16 sm:pb-20 max-w-4xl mx-auto">
              <div className="mb-8">
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-2">Eventos</h2>
                <p className="text-slate-600">Descubra os próximos eventos deste promotor</p>
            </div>
            
            <div className="text-center py-16">
                <div className="relative">
                  <div className="absolute -inset-1 bg-gradient-to-r from-emerald-200 to-violet-200 rounded-3xl blur opacity-25"></div>
                  <div className="relative w-20 h-20 bg-gradient-to-br from-emerald-100 to-violet-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
                    <Calendar className="h-10 w-10 text-emerald-600" />
                  </div>
              </div>
                <h3 className="text-xl font-bold text-slate-800 mb-3">Nenhum evento disponível</h3>
                <p className="text-slate-600 mb-6">Este promotor ainda não tem eventos publicados.</p>
                <div className="bg-white border border-slate-200 rounded-xl p-6 max-w-md mx-auto">
                  <div className="text-sm text-slate-600 space-y-2">
                <p>• Os eventos aparecerão aqui quando forem publicados</p>
                    <p>• Volte em breve para ver as novidades</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

// ✅ FUNÇÃO AUXILIAR 6: Renderizar página com eventos + PREFETCH (Complexidade: 2)
function renderEventsPage(userData: any, futureEvents: EventForList[], promoterSlug: string): JSX.Element {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none" aria-hidden="true">
          <div className="absolute -top-40 -left-40 w-80 h-80 bg-emerald-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
          <div className="absolute top-40 right-40 w-80 h-80 bg-violet-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
          <div className="absolute bottom-40 left-20 w-60 h-60 bg-amber-200 rounded-full mix-blend-multiply filter blur-2xl opacity-15"></div>
        </div>

        <div className="relative z-10">
        <PromoterHeader userData={userData} />
        
          <div className="px-4 sm:px-6 pb-16 sm:pb-20 max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4">Eventos</h2>
          </div>
          
            <div className="columns-1 sm:columns-2 lg:columns-2 xl:columns-2 gap-8 space-y-8">
            {futureEvents.map((event, index) => {
              const eventUrl = event.event_slug && promoterSlug 
                ? `/promotor/${promoterSlug}/${event.event_slug}`
                : `/promo/${event.event_id}/${event.tracking_promoter_id}/${event.tracking_team_id}`;
              
              return (
              <Link 
                key={event.event_id}
                  href={eventUrl}
                  prefetch={true}
                    className="block group break-inside-avoid"
                  >
                    <div className="relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 group-hover:scale-[1.02]">
                      <div className="relative">
                        {event.event_flyer_url ? (
                        <Image
                          src={event.event_flyer_url}
                          alt={event.event_title}
                            width={500}
                            height={750}
                            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 50vw, 33vw"
                            className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-300"
                          priority={index === 0}
                          loading={index === 0 ? "eager" : "lazy"}
                          placeholder="blur"
                          blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
                        />
                        ) : (
                          <div className="w-full aspect-[3/4] bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center">
                            <Calendar className="w-16 h-16 text-slate-400" />
                          </div>
                        )}
                        
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent">
                          <div className="absolute bottom-0 left-0 right-0 p-4">
                            <h3 className="text-white font-bold text-lg mb-2 line-clamp-2">
                              {event.event_title}
                            </h3>
                            <div className="flex items-center text-white/90 text-sm mb-3">
                              <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
                              <span className="truncate">{event.location || 'Local não especificado'}</span>
                            </div>
                            <div className="bg-emerald-500 text-white text-center py-2 px-4 rounded-lg font-semibold text-sm">
                              Aceder Guest List
                            </div>
                          </div>
                        </div>
                        
                        <div className="absolute top-4 right-4">
                          <div className="bg-white/90 backdrop-blur-sm rounded-xl px-3 py-2 shadow-lg">
                            <div className="text-center">
                              <div className="text-xs text-slate-600 uppercase font-medium">
                                {formatDate(event.event_date).split(' ')[1]}
                              </div>
                              <div className="text-lg font-bold text-slate-800">
                                {formatDate(event.event_date).split(' ')[0]}
                        </div>
                          </div>
                          </div>
                        </div>
                      </div>
                    </div>
              </Link>
              );
            })}
            </div>
          </div>
        </div>
      </div>
    );
}

// ✅ FUNÇÃO PRINCIPAL REFATORADA (Complexidade: 26 → 7)
export default async function PromoterPublicPage({ params }: PageProps) {
  const resolvedParams = await params;
  
  if (!resolvedParams?.userId) {
    notFound();
  }

  const cookieStore = await cookies();
  const supabase = createServerComponentClient<Database>({ cookies: () => cookieStore });

  try {
    // 1. Resolver dados do usuário
    const userData = await resolveUserData(supabase, resolvedParams.userId);
    if (!userData) {
      notFound();
    }

    // 2. Obter slug do promotor
    const promoterSlug = await getPromoterSlug(supabase, userData.id, resolvedParams.userId);

    // 3. Buscar eventos
    const { data: eventsData, error: eventsError } = await supabase
      .rpc('get_public_promoter_page_data' as any, {
        promoter_user_id: userData.id
      }) as { data: RPCEventData[] | null, error: any };

    if (eventsError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto px-6">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-amber-600 text-2xl">⚠️</span>
            </div>
            <h1 className="text-2xl font-bold mb-4 text-slate-800">Erro ao carregar eventos</h1>
            <p className="text-slate-600 mb-6">Ocorreu um erro ao buscar os eventos. Por favor, tente novamente mais tarde.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 transition-colors"
            >
              Tentar Novamente
            </button>
          </div>
        </div>
      );
    }

    // 4. Processar dados de eventos
    const mappedEvents = eventsData ? await processEventsData(supabase, userData, eventsData) : [];

    // 5. Filtrar eventos futuros
    const futureEvents = filterFutureEvents(mappedEvents);

    // 6. Renderizar página apropriada
    if (!futureEvents || futureEvents.length === 0) {
      return renderNoEventsPage(userData);
    }

    return renderEventsPage(userData, futureEvents, promoterSlug);

  } catch (error) {
    return <ErrorMessage message="Erro interno do servidor" />;
  }
}

// Map RPC data to EventsList format
function mapRPCDataToEventsList(rpcData: RPCEventData[]): EventForList[] {
  return rpcData.map(item => ({
    event_id: item.event_id,
    event_title: item.event_title,
    event_flyer_url: item.event_flyer_url,
    event_date: item.event_date,
    event_time: item.event_time,
    end_date: null,
    end_time: null,
    location: null,
    event_type: item.event_type,
    tracking_promoter_id: item.tracking_promoter_id,
    tracking_team_id: item.tracking_team_id,
    is_active: true,
    is_published: true,
    org_name: item.org_name
  }));
}

 
