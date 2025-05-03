// Este ficheiro representa a página pública de registo para uma guest list de evento com rastreamento de promotor.
// [...params] captura /promo/[eventId]/[promoterId]/[teamId]

import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

// Importar o mesmo Client Component usado em /g/[id]
import GuestListPageClient from '../../g/[id]/GuestListPageClient';

// Interface para props da página
interface PageProps {
  params: Promise<{ params: string[] }>;
}

// Server Component que captura parâmetros da URL e os passa para o cliente
export default async function PromoterGuestListPage({ params }: PageProps) {
  // Extrair os parâmetros da URL - await params antes de acessar params.params
  const resolvedParams = await params;
  const urlParams = resolvedParams.params;
  
  console.log('Promoter Page - Parâmetros recebidos:', urlParams);
  
  // Verificar se temos todos os 3 parâmetros necessários
  if (!urlParams || urlParams.length !== 3) {
    console.error('URL inválida, esperados 3 parâmetros: /promo/[eventId]/[promoterId]/[teamId]');
    notFound();
  }

  const [eventId, promoterId, teamId] = urlParams;

  // Validação básica dos IDs (formato UUID)
  const isValidUUID = (id: string) => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id);
  
  if (!isValidUUID(eventId) || !isValidUUID(promoterId) || !isValidUUID(teamId)) {
    console.error('ID(s) inválido(s) na URL');
    notFound();
  }
  
  // Verificar se existe uma associação válida entre o evento, promotor e equipe
  try {
    const supabase = createClient();
    
    // Verificar se existe uma associação válida na tabela event_promoters
    const { data: eventPromoterData, error: eventPromoterError } = await supabase
      .from('event_promoters')
      .select('id, promoter_id, team_id')
      .eq('event_id', eventId)
      .eq('promoter_id', promoterId)
      .eq('team_id', teamId)
      .maybeSingle();
    
    // Registrar dados para debug
    console.log('Verificação event_promoters:', { 
      eventId, 
      promoterId, 
      teamId, 
      encontrado: !!eventPromoterData,
      erro: eventPromoterError ? eventPromoterError.message : null
    });
    
    // Não bloquear se não encontrar associação exata - apenas registrar
    if (eventPromoterError) {
      console.warn('Não foi encontrada associação exata em event_promoters, mas continuando:', eventPromoterError);
    }
    
    // Verificar se o evento existe e está ativo
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('id, title, is_published')
      .eq('id', eventId)
      .eq('is_published', true)
      .maybeSingle();
      
    if (eventError || !eventData) {
      console.error('Evento não encontrado ou não publicado:', eventError);
      notFound();
    }
    
    // Verificar se promotor existe, mas NÃO bloquear se não existir
    const { data: promoterData, error: promoterError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .eq('id', promoterId)
      .maybeSingle();
      
    if (promoterError) {
      console.warn(`Erro ao verificar promotor ${promoterId}:`, promoterError);
      // Não bloquear - continuar mesmo com erro
    } else if (!promoterData) {
      // Registrar apenas um aviso e permitir o acesso
      console.warn(`Promotor ${promoterId} não encontrado, mas permitindo acesso`);
    } else {
      console.log(`Promotor encontrado: ${promoterData.first_name} ${promoterData.last_name}`);
    }
    
    // Chegando aqui, os parâmetros são válidos, mesmo que não haja um registro exato em event_promoters
    console.log('Parâmetros validados. Renderizando página com:', { eventId, promoterId, teamId });
    
    // Renderizar o componente GuestListPageClient com os parâmetros da URL
    return (
      <GuestListPageClient
        eventId={eventId}
        promoterId={promoterId}
        teamId={teamId}
      />
    );
    
  } catch (error) {
    console.error('Erro ao validar associação entre evento e promotor:', error);
    
    // Em vez de notFound(), que mostra uma página 404,
    // vamos renderizar o componente mesmo assim com uma mensagem de erro
    return (
      <div className="container mx-auto p-4 md:p-8 text-center">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          <h2 className="text-lg font-semibold mb-2">Erro ao carregar detalhes</h2>
          <p>Ocorreu um problema ao validar os parâmetros, mas você ainda pode se registrar.</p>
        </div>
        
        <GuestListPageClient
          eventId={eventId}
          promoterId={promoterId}
          teamId={teamId}
        />
      </div>
    );
  }
} 