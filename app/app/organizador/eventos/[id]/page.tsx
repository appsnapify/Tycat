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

// Client Component para o botão de voltar
const BackButton = () => {
  return (
    <Link href="/app/organizador/eventos" className="inline-block">
      <Button 
        variant="outline" 
        size="sm" 
        className="flex items-center space-x-2"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        <span>Voltar</span>
      </Button>
    </Link>
  );
}

interface PageProps {
  params: { id: string };
}

// Simplificar generateMetadata para evitar buscas complexas aqui
export async function generateMetadata({ params: routeParams }: PageProps): Promise<Metadata> {
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

// Nova Função para buscar estatísticas básicas de convidados
async function fetchGuestStats(eventId: string, supabaseClient: any) {
  console.log(`[Stats] Buscando estatísticas para evento: ${eventId}`);

  // Buscar IDs para contar total
  const { data: guestsData, error: totalError } = await supabaseClient
    .from('guests')
    .select('id') // Selecionar apenas o ID
    .eq('event_id', eventId);

  // Buscar contagem para check-in (manter como estava, pois funcionava)
  const { count: totalCheckedIn, error: checkedInError } = await supabaseClient
    .from('guests')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', eventId)
    .eq('checked_in', true);

  if (totalError) {
    console.error("[Stats] Erro ao buscar convidados para contagem total:", totalError);
    // Não lançar erro, apenas retornar 0 ou null para permitir que a página carregue
  }
  if (checkedInError) {
    console.error("[Stats] Erro ao contar check-ins:", checkedInError);
     // Não lançar erro
  }

  // Calcular total a partir dos dados buscados
  const calculatedTotalGuests = guestsData?.length ?? 0;

  console.log(`[Stats] Total (calculado): ${calculatedTotalGuests}, CheckedIn: ${totalCheckedIn ?? 0}`);
  return {
    totalGuests: calculatedTotalGuests, // Usar contagem manual
    totalCheckedIn: totalCheckedIn ?? 0,
  };
}

// Nova Função para buscar Top 5 Equipas
async function fetchTopTeamsStats(eventId: string, supabaseClient: any) {
  console.log(`[Stats] Buscando Top Equipas para evento: ${eventId}`);
  const { data, error } = await supabaseClient
    .from('guests')
    .select(`
      team_id,
      teams!inner ( id, name ),
      checked_in
    `)
    .eq('event_id', eventId)
    .not('team_id', 'is', null); // Ainda manter para otimização inicial

  if (error) {
    console.error("[Stats] Erro ao buscar dados de equipas:", error);
    return []; // Retorna array vazio em caso de erro
  }

  if (!data || data.length === 0) {
    console.log("[Stats] Nenhum convidado com equipa encontrado.");
    return [];
  }

  // Agrupar e contar manualmente no lado do servidor
  const statsMap = new Map<string, { id: string; name: string; total_guests: number; total_checked_in: number }>();

  data.forEach((guest: any) => {
    const teamName = guest.teams?.name; 
    if (!guest.teams || !teamName) {
        console.warn(`[Stats] Guest ${guest.id} tem team_id ${guest.team_id} mas não foi possível obter dados da equipa.`);
        return; // Skip se o join falhou ou equipa não existe/sem nome
    }

    const teamId = guest.team_id;

    if (!statsMap.has(teamId)) {
      statsMap.set(teamId, { id: teamId, name: teamName, total_guests: 0, total_checked_in: 0 });
    }

    const currentStats = statsMap.get(teamId)!;
    currentStats.total_guests += 1;
    if (guest.checked_in) {
      currentStats.total_checked_in += 1;
    }
  });

  // Converter para array, ordenar e limitar
  const sortedStats = Array.from(statsMap.values()).sort((a, b) => b.total_guests - a.total_guests);

  console.log(`[Stats] Top Equipas encontradas: ${sortedStats.slice(0, 5).length}`);
  return sortedStats.slice(0, 5); // Retorna Top 5
}

// Função para buscar Top 5 Promotores (agora usando RPC)
async function fetchTopPromotersStats(eventId: string, supabaseClient: any) {
  console.log(`[Stats] Buscando Top Promotores via RPC para evento: ${eventId}`);

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
  console.log(`[Stats] Top Promotores (RPC) encontrados: ${data.length}`);
  return data; // Retorna diretamente os dados da função RPC
}

// Nova Função para buscar estatísticas de gênero
async function fetchGenderStats(eventId: string, supabaseClient: any) {
  console.log(`[Stats] Buscando estatísticas de gênero para evento: ${eventId}`);
  
  // Corrigindo a consulta para buscar todos os gêneros, não apenas M e F
  const { data: allGuests, error: allError } = await supabaseClient
    .from('guests')
    .select('gender')
    .eq('event_id', eventId)
    .not('gender', 'is', null);
    
  if (allError) {
    console.error("[Stats] Erro ao buscar todos os dados de gênero:", allError);
    return { 
      genderData: [] 
    };
  }
  
  if (!allGuests || allGuests.length === 0) {
    console.log("[Stats] Nenhum dado de gênero encontrado.");
    return { 
      genderData: [] 
    };
  }
  
  // Calcular contagens para todos os gêneros presentes nos dados
  const genderCounts = {};
  allGuests.forEach(guest => {
    const gender = guest.gender;
    genderCounts[gender] = (genderCounts[gender] || 0) + 1;
  });
  
  // Calcular o total
  const total = allGuests.length;
  
  // Transformar em array com percentuais
  const genderData = Object.entries(genderCounts).map(([gender, count]) => {
    const percentage = total > 0 ? Math.round((count as number / total) * 100) : 0;
    
    // Converter códigos de gênero para nomes descritivos
    let genderName = 'Outro';
    if (gender === 'M') genderName = 'Masculino';
    else if (gender === 'F') genderName = 'Feminino';
    
    return {
      gender,
      genderName,
      count,
      percentage
    };
  });
  
  // Ordenar por contagem (maior para menor)
  genderData.sort((a, b) => b.count as number - a.count as number);
  
  console.log(`[Stats] Dados de gênero: ${JSON.stringify(genderData)}`);
  
  return {
    genderData
  };
}

// Removido fetchOrganizationTeams
// Removido fetchCurrentAssociations


// Componente da Página Principal
export default async function EventoDetalhesPage({ params: routeParams }: PageProps) {
  // Inicializar cookies e supabaseClient aqui
  const cookieStore = await cookies();
  const supabase = createServerComponentClient({ cookies: () => cookieStore });

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
        <div className="mb-6">
          <BackButton />
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

