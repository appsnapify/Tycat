import { Metadata } from 'next'
// import { supabase } from '@/lib/supabase'; // Remover, usar server client
import { CalendarIcon, MapPinIcon, ArrowLeftIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Suspense } from 'react';
import DiagnosticWrapper from './DiagnosticWrapper';
import EventDetailsClient from './EventDetailsClient';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers'; // Importar cookies
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'; // Importar server client

interface PageProps {
  params: { id: string };
}

// Simplificar generateMetadata para evitar buscas complexas aqui
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const eventId = params.id;
  if (!eventId) return { title: 'Evento não encontrado' };
  return { title: `Evento ${eventId} - Detalhes` };
}

// Funções de busca (recebendo supabase)
async function fetchEvent(id: string, supabaseClient: any) {
    const { data, error } = await supabaseClient
    .from('events')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    console.error("Erro Supabase fetchEvent:", error);
    // Verificar se é erro de RLS ou não encontrado
    if (error.code === 'PGRST116') { // code for 'relation "events" does not exist or permission denied'
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
async function fetchOrganizationTeams(organizationId: string, supabaseClient: any) {
  const { data, error } = await supabaseClient
    .from('teams')
    .select('id, name')
    .eq('organization_id', organizationId);

  if (error) {
    console.error("Erro ao buscar equipas da organização:", error);
    return []; // Retorna array vazio em caso de erro, não lançar erro aqui
  }
  return data || [];
}
async function fetchCurrentAssociations(eventId: string, supabaseClient: any) {
   const { data, error } = await supabaseClient
    .from('event_teams')
    .select('team_id')
    .eq('event_id', eventId);
    
   if (error) {
     console.error("Erro ao buscar associações atuais:", error);
     return new Set<string>(); // Retorna set vazio em caso de erro
   }
   return new Set(data?.map(a => a.team_id) || []);
}


// Componente da Página Principal
export default async function EventoDetalhesPage({ params }: PageProps) {

  // Acessar params aqui DENTRO da função async é seguro
  const eventId = params.id;
  if (!eventId) {
    notFound();
  }

  // Criar cliente Supabase aqui DENTRO, APÓS validar eventId
  let supabase;
  try {
      const cookieStore = cookies();
      supabase = createServerComponentClient({ cookies: () => cookieStore });
  } catch (error) {
      console.error("Erro ao criar Supabase server client:", error);
      return <div className="p-6 text-red-500">Erro interno ao inicializar a ligação de dados.</div>;
  }

  // Buscar dados
  let eventData, organizationTeams, initialAssociatedIds;
  try {
    // Primeiro buscar o evento para obter organization_id
    eventData = await fetchEvent(eventId, supabase);

    // Agora buscar associações e equipas em paralelo
    [initialAssociatedIds, organizationTeams] = await Promise.all([
        fetchCurrentAssociations(eventId, supabase),
        fetchOrganizationTeams(eventData.organization_id, supabase)
    ]);

  } catch (error: any) {
    console.error("Erro ao buscar dados da página de detalhes do evento:", error);
    // Usar notFound para erros específicos de não encontrar
    if (error.message.includes("não encontrado") || error.message.includes("sem permissão")) {
        notFound();
    }
    // Renderizar um componente de erro ou retornar uma mensagem para outros erros
    return <div className="p-6 text-red-500">Erro ao carregar dados do evento: {error.message}</div>;
  }

  // Renderiza o Client Component (como antes)
  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="mb-4">
        <a href="/app/organizador/eventos">
              <Button variant="outline" size="sm">
                <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Voltar para Eventos
              </Button>
            </a>
      </div>

      <EventDetailsClient
         key={eventData.id}
         event={eventData}
         teams={organizationTeams} // Passar a lista de equipas
         initialAssociatedIds={initialAssociatedIds} // Passar o Set de IDs associados
      />

      {/* Ferramenta de diagnóstico (como antes) */}
      {eventData.type === 'guest-list' && (
         <Suspense fallback={<div>Carregando diagnóstico...</div>}>
           <DiagnosticWrapper eventId={eventId} />
         </Suspense>
      )}
    </div>
  );
}

