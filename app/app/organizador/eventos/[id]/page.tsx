import { Metadata } from 'next'
// import { supabase } from '@/lib/supabase'; // Remover, usar server client
import { CalendarIcon, MapPinIcon, ArrowLeftIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
// import DiagnosticWrapper from './DiagnosticWrapper'; // Removido
import EventDetailsClient from './EventDetailsClient';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers'; // Importar cookies
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'; // Importar server client
import Link from 'next/link'; // Importar Link para navegação
import BackButton from './BackButton'; // Importar o componente cliente separado

interface PageProps {
  params: Promise<{ id: string }>;
}

// Simplificar generateMetadata para evitar buscas complexas aqui
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const routeParams = await params;
  const eventId = routeParams.id;
  if (!eventId) return { title: 'Evento não encontrado' };
  return { title: `Evento ${eventId} - Detalhes` };
}

// Funções de busca (recebendo supabase)
async function fetchEvent(id: string, supabaseClient: any) {
    const { data, error } = await supabaseClient
    .from('events')
    .select('*') // Selecionar todos os campos necessários para EventDetailsClient
    .eq('id', id)
    .single();

  if (error) {
    console.error("Erro Supabase fetchEvent:", error);
    if (error.code === 'PGRST116') { 
        throw new Error("Evento não encontrado ou sem permissão."); 
    } else {
    throw new Error(`Erro ao carregar evento: ${error.message}`);
    }
  }
  if (!data) {
    throw new Error("Evento não encontrado (no data).");
  }
  return data;
}

// Função para buscar estatísticas básicas de convidados (usando RPC)
async function fetchGuestStats(eventId: string, supabaseClient: any) {
  // console.log(`[Stats] Buscando estatísticas via RPC para evento: ${eventId}`);

  const { data, error } = await supabaseClient.rpc(
    'get_guest_stats_for_event', 
    { p_event_id: eventId }
  );

  if (error) {
    console.error("[Stats] Erro ao chamar RPC get_guest_stats_for_event:", error);
    return { totalGuests: 0, totalCheckedIn: 0 };
  }

  if (!data || data.length === 0) {
    console.log("[Stats] RPC get_guest_stats_for_event retornou dados vazios.");
    return { totalGuests: 0, totalCheckedIn: 0 };
  }

  const stats = data[0];
      // console.log(`[Stats] RPC - Total: ${stats.total_guests}, CheckedIn: ${stats.total_checked_in}`);
  
  return {
    totalGuests: parseInt(stats.total_guests) || 0,
    totalCheckedIn: parseInt(stats.total_checked_in) || 0,
  };
}

// Função para buscar Top 5 Equipas (usando RPC)
async function fetchTopTeamsStats(eventId: string, supabaseClient: any) {
  // console.log(`[Stats] Buscando Top Equipas via RPC para evento: ${eventId}`);

  const { data, error } = await supabaseClient.rpc(
    'get_top_teams_for_event', 
    { p_event_id: eventId }
  );

  if (error) {
    console.error("[Stats] Erro ao chamar RPC get_top_teams_for_event:", error);
    return [];
  }

  if (!data) {
    console.log("[Stats] RPC get_top_teams_for_event retornou null/undefined data.");
    return [];
  }

      // console.log(`[Stats] Top Equipas (RPC) encontradas: ${data.length}`);
  return data; // Retorna diretamente os dados da função RPC
}

// Função para buscar Top 5 Promotores (agora usando RPC)
async function fetchTopPromotersStats(eventId: string, supabaseClient: any) {
  // console.log(`[Stats] Buscando Top Promotores via RPC para evento: ${eventId}`);

  const { data, error } = await supabaseClient.rpc(
    'get_top_promoters_for_event', 
    { p_event_id: eventId } // Passa o event_id como argumento para a função SQL
  );

  if (error) {
    console.error("[Stats] Erro ao chamar RPC get_top_promoters_for_event:", error);
    return []; // Retorna array vazio em caso de erro na chamada RPC
  }

  if (!data) {
     console.log("[Stats] RPC get_top_promoters_for_event retornou null/undefined data.");
     return []; // Retorna array vazio se não houver dados
  }

  // A função RPC já retorna os dados no formato correto (Array de PromoterStat)
      // console.log(`[Stats] Top Promotores (RPC) encontrados: ${data.length}`);
  return data; // Retorna diretamente os dados da função RPC
}

// Função para buscar estatísticas de gênero (usando RPC)
async function fetchGenderStats(eventId: string, supabaseClient: any) {
  // console.log(`[Stats] Buscando estatísticas de gênero via RPC para evento: ${eventId}`);

  const { data, error } = await supabaseClient.rpc(
    'get_gender_stats_for_event', 
    { p_event_id: eventId }
  );

  if (error) {
    console.error("[Stats] Erro ao chamar RPC get_gender_stats_for_event:", error);
    return { genderData: [] };
  }

  if (!data || data.length === 0) {
    console.log("[Stats] RPC get_gender_stats_for_event retornou dados vazios.");
    return { genderData: [] };
  }

  // Transformar dados da RPC no formato esperado
  const genderData = data.map((item: any) => {
    // Converter códigos de gênero para nomes descritivos
    let genderName = 'Outro';
    if (item.gender === 'M') genderName = 'Masculino';
    else if (item.gender === 'F') genderName = 'Feminino';
    
    return {
      gender: item.gender,
      genderName,
      count: parseInt(item.count) || 0,
      percentage: parseFloat(item.percentage) || 0
    };
  });

  // console.log(`[Stats] Dados de gênero (RPC): ${JSON.stringify(genderData)}`);
  
  return { genderData };
}

// Removido fetchOrganizationTeams
// Removido fetchCurrentAssociations


// Componente da Página Principal
export default async function EventoDetalhesPage({ params }: PageProps) {
  // Inicializar cookies e supabaseClient aqui
  const cookieStore = await cookies();
  const supabase = createServerComponentClient({ cookies: () => cookieStore });

  const routeParams = await params;
  const eventId = routeParams.id;
  if (!eventId) {
    notFound();
  }

  // Os dados agora serão buscados usando o supabase client inicializado acima
  try {
    const eventData = await fetchEvent(eventId, supabase);
    const guestStats = await fetchGuestStats(eventId, supabase);
    const teamsStats = await fetchTopTeamsStats(eventId, supabase);
    const promotersStats = await fetchTopPromotersStats(eventId, supabase);
    const genderDataStats = await fetchGenderStats(eventId, supabase);

    if (!eventData) {
      notFound();
    }

    return (
      <div className="container mx-auto p-4 md:p-6 lg:p-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <BackButton />
          <h1 className="text-lg md:text-xl font-semibold text-gray-900 text-right truncate">
            {eventData.title}
          </h1>
        </div>
        <EventDetailsClient 
          event={eventData} 
          totalGuests={guestStats.totalGuests}
          totalCheckedIn={guestStats.totalCheckedIn}
          topTeamsStats={teamsStats}
          topPromotersStats={promotersStats}
          genderStats={genderDataStats}
        />
      </div>
    );
  } catch (error: any) {
    console.error("Erro ao carregar dados da página do evento:", error.message);
    // Considerar uma página de erro mais amigável ou um estado de erro na UI
    // notFound(); // Pode ser muito agressivo, depende do tipo de erro
    return (
      <div className="container mx-auto p-4 text-center">
        <BackButton />
        <p className="mt-4 text-red-500">Ocorreu um erro ao carregar os detalhes do evento: {error.message}</p>
      </div>
    );
  }
}

