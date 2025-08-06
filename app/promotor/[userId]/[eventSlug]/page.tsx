import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { Database } from '@/lib/database.types';
import GuestRegistrationForm from './GuestRegistrationForm';
import EventDescription from './EventDescription';
import GuestRegistrationWrapper from './GuestRegistrationWrapper';

interface PageProps {
  params: Promise<{
    userId: string;
    eventSlug: string;
  }>;
}

export default async function EventGuestPage({ params }: PageProps) {
  const resolvedParams = await params;
  const cookieStore = await cookies();
  const supabase = createServerComponentClient<Database>({ cookies: () => cookieStore });

  try {
    // 1. Resolver promotor usando slug
    const { data: slugData, error: slugError } = await supabase
      .rpc('resolve_promoter_slug' as any, { input_slug: resolvedParams.userId });

    if (slugError || !slugData || !Array.isArray(slugData) || slugData.length === 0) {
      console.error('Promoter slug resolution failed:', slugError);
      notFound();
    }

    const promoter = (slugData as any[])[0];
    const promoterData = {
      id: promoter.promoter_id,
      first_name: promoter.first_name,
      last_name: promoter.last_name,
      slug: promoter.slug
    };

    // 2. Resolver evento pelo slug
    const { data: eventSlugData, error: eventSlugError } = await (supabase as any)
      .from('event_slugs')
      .select('event_id')
      .eq('slug', resolvedParams.eventSlug)
      .eq('is_active', true)
      .single();

    if (eventSlugError || !eventSlugData) {
      console.error('Event slug resolution failed:', eventSlugError);
      notFound();
    }

    // 3. Buscar dados do evento
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select(`
        id, title, description, date, time, location,
        guest_list_open_datetime, guest_list_close_datetime,
        guest_list_settings, is_published, flyer_url,
        organizations ( id, name, logo_url )
      `)
      .eq('id', (eventSlugData as any).event_id)
      .single();

    if (eventError || !eventData) {
      console.error('Event data fetch failed:', eventError);
      notFound();
    }

    // 4. Verificar se a guest list está aberta
    const now = new Date();
    const guestListOpen = new Date(eventData.guest_list_open_datetime);
    const guestListClose = new Date(eventData.guest_list_close_datetime);
    const isGuestListOpen = now >= guestListOpen && now <= guestListClose;

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 font-['Inter',sans-serif]">
        {/* Elementos decorativos de fundo */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none" aria-hidden="true">
          <div className="absolute -top-40 -left-40 w-80 h-80 bg-emerald-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
          <div className="absolute top-40 right-40 w-80 h-80 bg-violet-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
          <div className="absolute bottom-40 left-20 w-60 h-60 bg-amber-200 rounded-full mix-blend-multiply filter blur-2xl opacity-15"></div>
        </div>

        <div className="relative z-10">
          {/* Header Simplificado */}
          <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200/60">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 sm:space-x-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl flex items-center justify-center font-bold text-white text-base sm:text-lg shadow-lg">
                    T
                  </div>
                  <div>
                    <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-900 bg-clip-text text-transparent">TYCAT</h1>
              </div>
            </div>
            <div className="text-right">
                  <p className="text-xs sm:text-sm text-emerald-600 font-medium mb-1">Promotor</p>
                  <p className="font-bold text-slate-800 text-sm sm:text-lg">
                {promoterData.first_name} {promoterData.last_name}
              </p>
                </div>
            </div>
          </div>
        </div>

          {/* Página Unificada do Evento */}
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
            <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl sm:rounded-3xl overflow-hidden shadow-xl shadow-slate-900/5">
              {/* Flyer Section - Ajustado às Bordas */}
            {eventData.flyer_url && (
                <div className="relative">
                  {/* Imagem ocupando toda a largura até às bordas */}
                  <div className="w-full relative overflow-hidden">
                <img 
                  src={eventData.flyer_url} 
                  alt={eventData.title}
                      className="w-full h-auto object-cover"
                />
              </div>
                  
                  {/* Info Compacta com Cores do Promotor - Mobile Optimized */}
                  <div className="p-4 sm:p-6">
                    <div className="border-2 border-emerald-500 rounded-xl sm:rounded-2xl p-3 sm:p-4 bg-transparent">
                      <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-8 text-sm">
                        <div className="flex items-center space-x-2 text-slate-700">
                          <div className="w-6 h-6 bg-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0">
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <span className="font-medium">
                            {new Date(eventData.date).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' })}
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-2 text-slate-700">
                          <div className="w-6 h-6 bg-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0">
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <span className="font-medium">{eventData.time}</span>
                        </div>
                        
                        <div className="flex items-center space-x-2 text-slate-700">
                          <div className="w-6 h-6 bg-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0">
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <span className="font-medium">{eventData.location}</span>
                        </div>
                      </div>
                </div>
                </div>
                </div>
              )}
              
              {/* Event Details & Registration Combined */}
              <div className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8">
                {/* Event Title & Description */}
                <div className="text-center">
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-800 mb-3 sm:mb-4">{eventData.title}</h1>
                  
                                    {eventData.description && (
                    <EventDescription description={eventData.description} />
                  )}
          </div>

                          {/* Guest Registration Section */}
                {!isGuestListOpen ? (
                  <div className="border-t border-slate-200 pt-6 sm:pt-8">
                    <div className="text-center mb-6 sm:mb-8">
                      <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl sm:rounded-2xl mb-3 sm:mb-4 shadow-lg">
                        <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                        </svg>
                      </div>
                      <h2 className="text-xl sm:text-2xl font-bold text-slate-800">
                        Registo Guest List
                      </h2>
                    </div>
                    
                    <div className="text-center py-6 sm:py-8">
                      <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl sm:rounded-2xl p-6 sm:p-8 max-w-md mx-auto shadow-sm">
                        <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg">
                          <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <h3 className="text-lg sm:text-xl font-bold text-amber-800 mb-2 sm:mb-3">Guest List Temporariamente Fechada</h3>
                        <p className="text-amber-700 mb-4 sm:mb-6 text-sm sm:text-base">
                          O registo será disponibilizado em breve. Não percas esta oportunidade!
                        </p>
                        <div className="bg-white/80 rounded-lg sm:rounded-xl p-3 sm:p-4 space-y-2 text-xs sm:text-sm text-amber-700">
                          <div><span className="font-semibold">Abertura:</span> {guestListOpen.toLocaleString('pt-PT')}</div>
                          <div><span className="font-semibold">Fecho:</span> {guestListClose.toLocaleString('pt-PT')}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <GuestRegistrationWrapper
                    eventId={eventData.id}
                    promoterId={promoterData.id}
                    eventTitle={eventData.title}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );

  } catch (error) {
    console.error('Event guest page error:', error);
    notFound();
  }
}