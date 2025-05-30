'use server'

import { createReadOnlyClient } from '@/lib/supabase/server';

// Tipos
interface PromoData {
  event: {
    id: string;
    title: string;
    description: string | null;
    date: string;
    time: string | null;
    location: string | null;
    flyer_url: string | null;
    is_published: boolean;
    guest_list_open_datetime: string | null;
    guest_list_close_datetime: string | null;
    organization_id: string | null;
  };
  promoter: {
    id: string;
    first_name: string | null;
    last_name: string | null;
  } | null;
  hasAssociation: boolean;
}

// Função para validar UUID
const isValidUUID = (id: string): boolean => {
  const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  return uuidRegex.test(id);
}

// Server Action para processar parâmetros e buscar dados
export async function processPromoParams(params: string[]): Promise<PromoData | null> {
  console.log('[DEBUG] processPromoParams - Parâmetros recebidos:', JSON.stringify(params));

  try {
    // Validação básica dos parâmetros
    if (!Array.isArray(params)) {
      console.error('[ERROR] Parâmetros não são um array:', params);
      return null;
    }

    if (params.length !== 3) {
      console.error('[ERROR] Número incorreto de parâmetros. Esperado: 3, Recebido:', params.length);
      return null;
    }

    const [eventId, promoterId, teamId] = params;
    console.log('[DEBUG] IDs extraídos:', { eventId, promoterId, teamId });

    // Validação individual de cada ID
    if (!eventId) {
      console.error('[ERROR] eventId está vazio ou undefined');
      return null;
    }

    if (!promoterId) {
      console.error('[ERROR] promoterId está vazio ou undefined');
      return null;
    }

    if (!teamId) {
      console.error('[ERROR] teamId está vazio ou undefined');
      return null;
    }

    if (!isValidUUID(eventId)) {
      console.error('[ERROR] eventId não é um UUID válido:', eventId);
      return null;
    }

    if (!isValidUUID(promoterId)) {
      console.error('[ERROR] promoterId não é um UUID válido:', promoterId);
      return null;
    }

    if (!isValidUUID(teamId)) {
      console.error('[ERROR] teamId não é um UUID válido:', teamId);
      return null;
    }

    const supabase = await createReadOnlyClient();

    // Buscar dados do evento com validação de timezone
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select(`
        id,
        title,
        description,
        date,
        time,
        location,
        flyer_url,
        is_published,
        guest_list_open_datetime,
        guest_list_close_datetime,
        organization_id
      `)
      .eq('id', eventId)
      .eq('is_published', true)
      .maybeSingle();

    if (eventError) {
      console.error('[ERROR] Erro ao buscar evento:', eventError);
      return null;
    }

    if (!eventData) {
      console.error('[ERROR] Evento não encontrado:', eventId);
      return null;
    }

    // Buscar dados do promotor
    const { data: promoterData, error: promoterError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .eq('id', promoterId)
      .maybeSingle();

    if (promoterError) {
      console.error('[ERROR] Erro ao buscar promotor:', promoterError);
      return null;
    }

    // Verificar associação - PRIORIDADE 1: Associação direta na tabela event_promoters
    console.log('[DEBUG] Verificando associação direta...');
    const { data: directAssociation, error: directError } = await supabase
      .from('event_promoters')
      .select('id')
      .eq('event_id', eventId)
      .eq('promoter_id', promoterId)
      .eq('team_id', teamId)
      .maybeSingle();

    if (directError) {
      console.error('[ERROR] Erro ao verificar associação direta:', directError);
    }

    let hasAssociation = !!directAssociation;
    
    if (hasAssociation) {
      console.log('[DEBUG] Associação direta encontrada');
    } else {
      console.log('[DEBUG] Associação direta não encontrada, verificando via equipa...');
      
      // PRIORIDADE 2: Verificar associação via equipa
      // 1. Verificar se o promotor é membro da equipa
      const { data: teamMember, error: teamMemberError } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', promoterId)
        .eq('team_id', teamId)
        .maybeSingle();

      if (teamMemberError) {
        console.error('[ERROR] Erro ao verificar membro da equipa:', teamMemberError);
      }

      // DEBUG: Log detalhado para entender o problema
      console.log('[DEBUG] Query team_members:', { 
        user_id: promoterId, 
        team_id: teamId, 
        result: teamMember,
        error: teamMemberError 
      });

      // DEBUG: Verificar se o promoter existe em alguma equipe
      const { data: allTeamsForUser, error: allTeamsError } = await supabase
        .from('team_members')
        .select('team_id, role')
        .eq('user_id', promoterId);
      
      console.log('[DEBUG] Todas as equipas do promotor:', allTeamsForUser);

      // DEBUG ESPECÍFICO: Investigação aprofundada para o promoter problemático
      if (promoterId === '3cc2bfd6-6aff-4301-a25f-7bc2dc5c05f4') {
        console.log('[DEBUG] ========== INVESTIGAÇÃO ESPECÍFICA PROMOTER ==========');
        
        // Tentar query mais ampla sem filtros
        const { data: allTeamMembersGlobal, error: globalError } = await supabase
          .from('team_members')
          .select('*');
        console.log('[DEBUG] Total de team_members na tabela:', allTeamMembersGlobal?.length);
        
        // Verificar se o user_id existe na tabela sem filtros específicos
        const userInAnyTeam = allTeamMembersGlobal?.filter(tm => tm.user_id === promoterId);
        console.log('[DEBUG] Este promoter em team_members (busca global):', userInAnyTeam);
        
        // Tentar com createAdminClient para bypassing RLS
        const adminClient = await import('@/lib/supabase/adminClient').then(m => m.createAdminClient());
        const { data: adminTeamData, error: adminError } = await adminClient
          .from('team_members')
          .select('*, teams!inner(name)')
          .eq('user_id', promoterId);
        
        console.log('[DEBUG] Com Admin Client (bypass RLS):', adminTeamData);
        console.log('[DEBUG] Admin Error:', adminError);
        
        // Verificar se o user existe na tabela profiles
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', promoterId);
        console.log('[DEBUG] Dados do profile:', profileData);
        
        console.log('[DEBUG] =============================================');
      }

      // DEBUG ESPECÍFICO: Investigação para o promoter que FUNCIONA
      if (promoterId === '75608297-a569-4b63-9e67-93a4e83752f3') {
        console.log('[DEBUG] ========== INVESTIGAÇÃO PROMOTER QUE FUNCIONA ==========');
        
        // Verificar todas as equipes deste promoter
        const { data: promoterTeams, error: teamsError } = await supabase
          .from('team_members')
          .select('*, teams!inner(name, team_code)')
          .eq('user_id', promoterId);
        console.log('[DEBUG] Equipes do promoter que funciona:', promoterTeams);
        
        // Verificar dados da função RPC que gera os links
        const { data: rpcData, error: rpcError } = await supabase
          .rpc('get_public_promoter_page_data', {
            promoter_user_id: promoterId
          });
        console.log('[DEBUG] Dados da função RPC get_public_promoter_page_data:', rpcData);
        console.log('[DEBUG] Erro RPC:', rpcError);
        
        // Verificar associações em event_promoters
        const { data: eventPromoters, error: epError } = await supabase
          .from('event_promoters')
          .select('*')
          .eq('promoter_id', promoterId);
        console.log('[DEBUG] Associações em event_promoters:', eventPromoters);
        
        // Verificar se pertence a organizações via equipes
        const { data: orgTeams, error: orgError } = await supabase
          .from('organization_teams')
          .select('*, organizations!inner(name)')
          .in('team_id', promoterTeams?.map(pt => pt.team_id) || []);
        console.log('[DEBUG] Organizações via equipes:', orgTeams);
        
        console.log('[DEBUG] =============================================');
      }

      // DEBUG INVESTIGAÇÃO PROMOTER PROBLEMÁTICO 1
      if (promoterId === '4d938a09-7125-4699-bf43-272243f1df4b') {
        console.log('[DEBUG] ========== INVESTIGAÇÃO PROMOTER PROBLEMÁTICO 1 ==========');
        
        const adminClient = await import('@/lib/supabase/adminClient').then(m => m.createAdminClient());
        
        // Verificar equipes com admin client
        const { data: adminTeamData, error: adminTeamError } = await adminClient
          .from('team_members')
          .select('*, teams!inner(name, team_code, organization_id)')
          .eq('user_id', promoterId);
        console.log('[DEBUG] Admin - Equipes do promoter:', adminTeamData);
        
        // Verificar organizações das equipes
        if (adminTeamData && adminTeamData.length > 0) {
          const teamIds = adminTeamData.map(t => t.team_id);
          const { data: orgTeamsData, error: orgTeamsError } = await adminClient
            .from('organization_teams')
            .select('*, organizations!inner(name)')
            .in('team_id', teamIds);
          console.log('[DEBUG] Admin - Organizações via equipes:', orgTeamsData);
        }
        
        // Verificar event_promoters para este evento
        const { data: eventPromotersForEvent, error: epEventError } = await adminClient
          .from('event_promoters')
          .select('*')
          .eq('event_id', eventId);
        console.log('[DEBUG] Admin - Todos event_promoters para este evento:', eventPromotersForEvent);
        
        console.log('[DEBUG] =============================================');
      }

      // DEBUG INVESTIGAÇÃO COMPLETA PROMOTER 3 - RPC
      if (promoterId === '75608297-a569-4b63-9e67-93a4e83752f3') {
        console.log('[DEBUG] ========== INVESTIGAÇÃO RPC PROMOTER 3 ==========');
        
        const adminClient = await import('@/lib/supabase/adminClient').then(m => m.createAdminClient());
        
        // Verificar dados da RPC com admin
        const { data: adminRpcData, error: adminRpcError } = await adminClient
          .rpc('get_public_promoter_page_data', {
            promoter_user_id: promoterId
          });
        console.log('[DEBUG] Admin RPC Data:', adminRpcData);
        console.log('[DEBUG] Admin RPC Error:', adminRpcError);
        
        // Verificar diretamente a tabela event_promoters
        const { data: allEventPromotersAdmin, error: epAdminError } = await adminClient
          .from('event_promoters')
          .select('*')
          .eq('promoter_id', promoterId);
        console.log('[DEBUG] Admin - Event promoters direto:', allEventPromotersAdmin);
        
        // Verificar se há algo errado nos dados retornados pela RPC
        if (adminRpcData) {
          adminRpcData.forEach((rpc, index) => {
            console.log(`[DEBUG] RPC Item ${index}:`, {
              tracking_promoter_id: rpc.tracking_promoter_id,
              tracking_team_id: rpc.tracking_team_id,
              event_id: rpc.event_id,
              event_title: rpc.event_title
            });
          });
        }
        
        console.log('[DEBUG] =============================================');
      }

      // DEBUG: Verificar se a equipe existe e quem são seus membros  
      const { data: allMembersInTeam, error: allMembersError } = await supabase
        .from('team_members')
        .select('user_id, role')
        .eq('team_id', teamId);
      
      console.log('[DEBUG] Todos os membros da equipa:', allMembersInTeam);

      // DEBUG: INVESTIGAÇÃO COMPLETA DOS DADOS
      console.log('[DEBUG] ========== INVESTIGAÇÃO COMPLETA ==========');
      console.log('[DEBUG] Evento completo:', eventData);
      
      // Verificar se existe algum event_promoter para este evento
      const { data: allEventPromoters, error: allEventPromotersError } = await supabase
        .from('event_promoters')
        .select('promoter_id, team_id, promoter_code')
        .eq('event_id', eventId);
      console.log('[DEBUG] Todos os promoters do evento:', allEventPromoters);
      
      // Verificar organization_teams para esta equipe
      const { data: orgTeamsForThisTeam, error: orgTeamsError } = await supabase
        .from('organization_teams')
        .select('organization_id, team_id')
        .eq('team_id', teamId);
      console.log('[DEBUG] Organizações desta equipa:', orgTeamsForThisTeam);
      
      // Verificar todos os eventos desta organização (se o evento tiver organization_id)
      if (eventData.organization_id) {
        const { data: allEventsInOrg, error: allEventsError } = await supabase
          .from('events')
          .select('id, title, organization_id')
          .eq('organization_id', eventData.organization_id)
          .eq('is_published', true);
        console.log('[DEBUG] Todos os eventos da organização:', allEventsInOrg);
      }
      console.log('[DEBUG] =======================================');

      // DEBUG: SUGERIR URLs VÁLIDAS
      console.log('[DEBUG] ========== SUGESTÕES DE URLs VÁLIDAS ==========');
      
      // Se existem event_promoters para este evento, sugerir esses
      if (allEventPromoters && allEventPromoters.length > 0) {
        console.log('[DEBUG] URLs válidas baseadas em event_promoters:');
        allEventPromoters.forEach((ep, index) => {
          const suggestedUrl = `/promo/${eventId}/${ep.promoter_id}/${ep.team_id}`;
          console.log(`[DEBUG] Sugestão ${index + 1}: ${suggestedUrl}`);
        });
      }
      
      // Se o promoter está em equipas, sugerir com suas equipas reais
      if (allTeamsForUser && allTeamsForUser.length > 0) {
        console.log('[DEBUG] URLs possíveis com equipas reais do promoter:');
        allTeamsForUser.forEach((team, index) => {
          const suggestedUrl = `/promo/${eventId}/${promoterId}/${team.team_id}`;
          console.log(`[DEBUG] Sugestão ${index + 1}: ${suggestedUrl} (promoter na equipa ${team.team_id})`);
        });
      }
      
      console.log('[DEBUG] =============================================');

      if (teamMember) {
        console.log('[DEBUG] Promotor é membro da equipa, verificando se equipa está associada ao evento...');
        
        // 2. Verificar se a equipa está associada ao evento via event_promoters
        // A estrutura correta é: teams -> event_promoters -> events
        const { data: teamEventAssociation, error: teamEventError } = await supabase
          .from('event_promoters')
          .select('id')
          .eq('event_id', eventId)
          .eq('team_id', teamId)
          .limit(1);

        if (teamEventError) {
          console.error('[ERROR] Erro ao verificar associação equipa-evento:', teamEventError);
        }

        if (teamEventAssociation && teamEventAssociation.length > 0) {
          hasAssociation = true;
          console.log('[DEBUG] Associação via equipa encontrada');
        } else {
          console.log('[DEBUG] Equipa não está associada ao evento, verificando via organização...');
          
          // 3. Verificar se a equipa está vinculada à organização do evento
          if (!eventData.organization_id) {
            console.log('[DEBUG] Evento não tem organization_id definido');
          } else {
            const { data: orgAssociation, error: orgError } = await supabase
              .from('organization_teams')
              .select('organization_id')
              .eq('team_id', teamId)
              .eq('organization_id', eventData.organization_id)
              .maybeSingle();

            if (orgError) {
              console.error('[ERROR] Erro ao verificar associação equipa-organização:', orgError);
            }

            if (orgAssociation) {
              hasAssociation = true;
              console.log('[DEBUG] Associação via organização encontrada');
            } else {
              console.log('[DEBUG] Equipa não está vinculada à organização do evento');
            }
          }
        }
      } else {
        console.log('[DEBUG] Promotor não é membro da equipa especificada');
      }

      // VERIFICAÇÃO INTELIGENTE: Se não encontrou associação, tentar alternativas
      if (!hasAssociation) {
        console.log('[DEBUG] ========== VERIFICAÇÃO INTELIGENTE ==========');
        
        // 1. Verificar se o promoter tem associação direta a ESTE evento (qualquer equipe)
        const { data: anyDirectAssociation, error: anyDirectError } = await supabase
          .from('event_promoters')
          .select('team_id, promoter_code')
          .eq('event_id', eventId)
          .eq('promoter_id', promoterId)
          .limit(1);
        
        if (anyDirectAssociation && anyDirectAssociation.length > 0) {
          hasAssociation = true;
          console.log('[DEBUG] ✅ ENCONTRADA associação direta com equipe diferente:', anyDirectAssociation[0].team_id);
          console.log('[DEBUG] ✅ URL correta seria:', `/promo/${eventId}/${promoterId}/${anyDirectAssociation[0].team_id}`);
        }
        
        // 2. Se o promoter está numa equipe, verificar se sua equipe pode promover este evento via organização
        if (!hasAssociation && allTeamsForUser && allTeamsForUser.length > 0) {
          for (const userTeam of allTeamsForUser) {
            // Verificar se a equipe do promoter está na mesma organização do evento
            if (eventData.organization_id && orgTeamsForThisTeam) {
              const teamInSameOrg = orgTeamsForThisTeam.find(ot => 
                ot.team_id === userTeam.team_id && ot.organization_id === eventData.organization_id
              );
              
              if (teamInSameOrg) {
                hasAssociation = true;
                console.log('[DEBUG] ✅ ENCONTRADA associação via organização!');
                console.log('[DEBUG] ✅ Promoter está na equipe:', userTeam.team_id);
                console.log('[DEBUG] ✅ Equipe pertence à organização:', teamInSameOrg.organization_id);
                console.log('[DEBUG] ✅ URL correta seria:', `/promo/${eventId}/${promoterId}/${userTeam.team_id}`);
                break;
              }
            }
          }
        }
        
        console.log('[DEBUG] =======================================');
      }
    }

    const result = {
      event: eventData,
      promoter: promoterData || null,
      hasAssociation
    };

    console.log('[DEBUG] processPromoParams - Resultado final:', { 
      eventTitle: result.event.title,
      promoterName: result.promoter ? `${result.promoter.first_name} ${result.promoter.last_name}` : 'null',
      hasAssociation: result.hasAssociation 
    });
    
    return result;

  } catch (error) {
    console.error('[ERROR] Erro não tratado em processPromoParams:', error);
    return null;
  }
} 