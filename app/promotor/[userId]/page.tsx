import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { Database } from '@/lib/database.types';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Calendar, Users } from 'lucide-react';
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

// Promoter Header Component - Simplified for Server Component
function PromoterHeader({ userData }: { userData: { first_name: string | null; last_name: string | null } }) {
  const initials = getInitials(userData.first_name, userData.last_name);
  
  return (
    <div className="px-4 sm:px-6 pt-8 sm:pt-12 pb-4 sm:pb-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
            <span className="text-lg sm:text-xl font-bold text-white">
              {initials}
            </span>
          </div>
          <div>
            <p className="text-gray-400 text-xs sm:text-sm">Promotor</p>
            <h1 className="text-lg sm:text-xl font-bold text-white">
              {userData.first_name || 'Promotor'} {userData.last_name || ''}
            </h1>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl sm:text-3xl font-black text-white">
            TYCAT
          </div>
        </div>
      </div>
    </div>
  );
}

// Error component
function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white relative flex items-center justify-center">
      <div className="relative z-10 bg-red-500/10 border border-red-500/20 text-red-400 px-6 py-4 rounded-2xl max-w-md mx-4">
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
    notFound();
  }

  // Await cookies before using (Next.js 15 requirement)
  const cookieStore = await cookies();
  const supabase = createServerComponentClient<Database>({ cookies: () => cookieStore });

  try {
    // Buscar dados do usuário
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .eq('id', resolvedParams.userId)
      .single();

    if (userError || !userData) {
      notFound();
    }

    // Buscar eventos usando a função RPC get_public_promoter_page_data
    const { data: eventsData, error: eventsError } = await supabase
      .rpc('get_public_promoter_page_data', {
        promoter_user_id: resolvedParams.userId
      }) as { data: RPCEventData[] | null, error: any };

    if (eventsError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white relative flex items-center justify-center">
          <div className="relative z-10 text-center text-gray-300 max-w-md mx-4">
            <p className="text-lg">Ocorreu um erro ao buscar os eventos.</p>
            <p className="text-gray-500 text-sm mt-2">Por favor, tente novamente mais tarde.</p>
          </div>
        </div>
      );
    }

    // Map RPC data to EventsList format  
    let mappedEvents = eventsData ? mapRPCDataToEventsList(eventsData) : [];

    // Buscar locations dos eventos se houver eventos
    if (mappedEvents.length > 0) {
      const eventIds = mappedEvents.map(event => event.event_id);
      const { data: locationData } = await supabase
        .from('events')
        .select('id, location')
        .in('id', eventIds);

      // Adicionar locations aos eventos mapeados
      if (locationData) {
        mappedEvents = mappedEvents.map(event => {
          const locationInfo = locationData.find(loc => loc.id === event.event_id);
          return {
            ...event,
            location: locationInfo?.location || null
          };
        });
      }
    }

    // Filtrar apenas eventos futuros
    const currentDate = new Date();
    const futureEvents = mappedEvents.filter(event => {
      const eventDate = new Date(event.event_date);
      return eventDate >= currentDate;
    });

    // Se não houver eventos futuros, mostrar página sem eventos
    if (!futureEvents || futureEvents.length === 0) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
          <PromoterHeader userData={userData} />
          
          {/* Eventos Section */}
          <div className="px-4 sm:px-6 pb-16 sm:pb-20">
            <div className="mb-6">
              <h2 className="text-lg sm:text-xl font-bold text-blue-400">Eventos</h2>
            </div>
            
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Calendar className="h-10 w-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-300 mb-3">Nenhum evento disponível</h3>
              <p className="text-gray-400 mb-6">Este promotor ainda não tem eventos publicados.</p>
              <div className="text-sm text-gray-500">
                <p>• Os eventos aparecerão aqui quando forem publicados</p>
                <p>• Certifique-se de que tem eventos associados</p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Renderizar página com eventos - Server Component Safe
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
        <PromoterHeader userData={userData} />
        
        {/* Eventos Section */}
        <div className="px-4 sm:px-6 pb-16 sm:pb-20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-xl font-bold text-blue-400 mb-2 sm:mb-0">Eventos</h2>
            <span className="text-gray-400 text-sm">{futureEvents.length} evento{futureEvents.length !== 1 ? 's' : ''}</span>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {futureEvents.map((event, index) => (
              <Link 
                key={event.event_id}
                href={`/promo/${event.event_id}/${event.tracking_promoter_id}/${event.tracking_team_id}`}
                target="_blank"
                className="block"
              >
                <Card className="bg-gradient-to-br from-blue-600 to-purple-600 border-0 overflow-hidden rounded-2xl cursor-pointer hover:scale-[1.02] transition-transform">
                  <CardContent className="p-0 relative">
                    {/* Background Image */}
                    <div className="relative h-48 sm:h-56 overflow-hidden bg-gradient-to-br from-blue-600 to-purple-600">
                      {event.event_flyer_url && (
                        <Image
                          src={event.event_flyer_url}
                          alt={event.event_title}
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          className="object-cover"
                          priority={index === 0}
                          loading={index === 0 ? "eager" : "lazy"}
                          placeholder="blur"
                          blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                      {/* Data */}
                      <div className="absolute top-3 sm:top-4 left-3 sm:left-4">
                        <div className="bg-blue-500/90 backdrop-blur rounded-xl px-2 sm:px-3 py-1.5 sm:py-2">
                          <div className="text-center">
                            <div className="text-xs text-white uppercase font-medium">
                              {formatDate(event.event_date).split(' ')[1]}
                            </div>
                            <div className="text-sm sm:text-lg font-bold text-white">
                              {formatDate(event.event_date).split(' ')[0]}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Conteúdo */}
                      <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4">
                        <h3 className="font-bold text-white text-base sm:text-lg mb-2 line-clamp-2">
                          {event.event_title}
                        </h3>
                        
                        <div className="flex items-center text-gray-200 text-xs sm:text-sm mb-3 sm:mb-4">
                          <MapPin className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                          <span className="truncate">{event.location || 'Local não especificado'}</span>
                        </div>

                        {/* Organizacão */}
                        <div className="flex items-center justify-between">
                          <div className="text-xs text-gray-300">
                            <Users className="h-3 w-3 inline mr-1" />
                            {event.org_name || 'Organização'}
                          </div>
                          <div className="bg-blue-500/90 text-white font-semibold px-4 sm:px-6 py-2 rounded-xl text-xs sm:text-sm">
                            Aceder Guest List
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </div>
    );

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