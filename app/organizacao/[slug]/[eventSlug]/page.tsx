import { Suspense } from 'react';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { Database } from '@/lib/database.types';
import Image from 'next/image';
import GuestRegistrationForm from '@/app/promotor/[userId]/[eventSlug]/GuestRegistrationForm';

interface PageProps {
  params: Promise<{ slug: string; eventSlug: string }>;
}

export default async function OrganizationEventPage({ params }: PageProps) {
  const { slug, eventSlug } = await params;
  const cookieStore = await cookies();
  const supabase = createServerComponentClient<Database>({ cookies: () => cookieStore });

  // console.log('🏢 Organization Event Page - params:', { slug, eventSlug });

  try {
    // 1. Buscar organização diretamente pelo slug
    const { data: organization, error: orgError } = await (supabase as any)
      .from('organizations')
      .select('id, name, slug')
      .eq('slug', slug)
      .single();

    if (orgError || !organization) {
      console.error('❌ Erro ao buscar organização:', orgError);
      notFound();
    }

    // console.log('✅ Organização encontrada:', organization);

    // 2. Resolver evento pelo slug (similar ao sistema de promotores)
    const { data: eventSlugData, error: eventSlugError } = await (supabase as any)
      .from('event_slugs')
      .select('event_id')
      .eq('slug', eventSlug)
      .eq('is_active', true)
      .single();

    if (eventSlugError || !eventSlugData) {
      console.error('❌ Event slug resolution failed:', eventSlugError);
      notFound();
    }

    // 3. Buscar dados completos do evento
    const { data: eventData, error: eventError } = await (supabase as any)
      .from('events')
      .select(`
        id,
        title,
        description,
        date,
        time,
        location,
        flyer_url,
        organization_id,
        guest_list_open_datetime,
        guest_list_close_datetime,
        is_active,
        is_published
      `)
      .eq('id', eventSlugData.event_id)
      .eq('organization_id', organization.id)
      .eq('is_active', true)
      .eq('is_published', true)
      .single();

    if (eventError || !eventData) {
      console.error('❌ Erro ao buscar evento:', eventError);
      notFound();
    }

    const event = eventData;
    // console.log('✅ Evento encontrado:', event);

    // 3. Verificar se guest list está aberta
    const now = new Date();
    const openTime = event.guest_list_open_datetime ? new Date(event.guest_list_open_datetime) : null;
    const closeTime = event.guest_list_close_datetime ? new Date(event.guest_list_close_datetime) : null;

    const isGuestListOpen = (!openTime || now >= openTime) && (!closeTime || now <= closeTime);

    if (!isGuestListOpen) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center p-4">
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-8 text-center max-w-md">
            <h1 className="text-2xl font-bold text-white mb-4">Guest List Fechada</h1>
            <p className="text-gray-300 mb-2">O evento <strong>{event.title}</strong> não está a aceitar registos neste momento.</p>
            {openTime && now < openTime && (
              <p className="text-yellow-400 text-sm">
                Abre em: {openTime.toLocaleString('pt-PT')}
              </p>
            )}
            {closeTime && now > closeTime && (
              <p className="text-red-400 text-sm">
                Fechou em: {closeTime.toLocaleString('pt-PT')}
              </p>
            )}
          </div>
        </div>
      );
    }

    // 4. Buscar team_id (necessário para o GuestRegistrationForm)
    const { data: teamData, error: teamError } = await (supabase as any)
      .from('teams')
      .select('id')
      .eq('organization_id', organization.id)
      .order('created_at', { ascending: true }) // Pegar a primeira team criada
      .limit(1)
      .maybeSingle();

    const teamId = teamData?.id || null;
    // console.log('📋 Team ID encontrado:', teamId);
    if (teamError) {
      console.warn('⚠️ Aviso ao buscar team:', teamError);
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
        <div className="container mx-auto px-4 py-8">
          {/* Header do Evento */}
          <div className="text-center mb-8">
            {/* Imagem do Evento */}
            {event.flyer_url && (
              <div className="relative w-full max-w-md mx-auto mb-6 rounded-2xl overflow-hidden shadow-2xl">
                <Image
                  src={event.flyer_url}
                  alt={`Flyer do evento ${event.title}`}
                  width={400}
                  height={600}
                  className="object-cover w-full h-auto"
                  priority
                  sizes="(max-width: 768px) 100vw, 400px"
                  quality={85}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
              </div>
            )}

            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 mb-6">
              <h1 className="text-3xl font-bold text-white mb-2">{event.title}</h1>
              <p className="text-gray-300 mb-4">{event.description}</p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-300">
                <div>
                  <span className="block text-blue-400 font-semibold">📅 Data</span>
                  {new Date(event.date).toLocaleDateString('pt-PT', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </div>
                <div>
                  <span className="block text-blue-400 font-semibold">⏰ Hora</span>
                  {event.time}
                </div>
                <div>
                  <span className="block text-blue-400 font-semibold">📍 Local</span>
                  {event.location}
                </div>
              </div>
            </div>

            {/* Badge da Organização */}
            <div className="inline-flex items-center bg-blue-600/20 border border-blue-500/30 rounded-full px-4 py-2 mb-6">
              <span className="text-blue-400 text-sm font-medium">
                🏢 {organization.name}
              </span>
            </div>
          </div>

          {/* Formulário de Guest Registration */}
          <Suspense fallback={
            <div className="flex items-center justify-center p-8">
              <div className="text-white">Carregando...</div>
            </div>
          }>
            <GuestRegistrationForm
              eventId={event.id}
              promoterId={null} // Para organizações, não há promoter específico
              eventTitle={event.title}
              teamId={teamId}
            />
          </Suspense>
        </div>
      </div>
    );

  } catch (error) {
    console.error('❌ Erro inesperado:', error);
    notFound();
  }
}