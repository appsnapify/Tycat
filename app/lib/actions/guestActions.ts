'use server'

import { createClient } from '@/lib/supabase/server'

// Interface para os dados retornados de cada convidado
// Adaptar conforme necessário
export interface GuestResult {
    id: string;
    name: string | null;
    phone: string | null; // Incluir se necessário, mas cuidado com privacidade
    checked_in: boolean | null;
    check_in_time: string | null;
    created_at: string | null;
    promoter_name: string | null; // Nome combinado
    team_name: string | null;
}

// Interface para o resultado da Server Action
interface GetGuestsResult {
    guests: GuestResult[];
    totalCount: number;
    error?: string;
}

// Constante para itens por página
const DEFAULT_PAGE_SIZE = 20;

export async function getGuestsForEvent(
    eventId: string,
    page: number = 1,
    pageSize: number = DEFAULT_PAGE_SIZE,
    searchTerm?: string,
    filterCheckedIn?: boolean | null
): Promise<GetGuestsResult> {
    const supabase = await createClient();

    try {
        // Construir consulta com filtros
        let query = supabase
            .from('guests')
            .select(`
                id,
                name,
                phone,
                checked_in,
                check_in_time,
                created_at,
                team_id,
                promoter_id
            `)
            .eq('event_id', eventId);
        
        // Aplicar filtros de pesquisa
        if (searchTerm) {
            query = query.or(`name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`);
        }
        if (filterCheckedIn !== null && filterCheckedIn !== undefined) {
            query = query.eq('checked_in', filterCheckedIn);
        }
        
        // Aplicar ordenação e paginação
        query = query.order('created_at', { ascending: false });
        query = query.range((page - 1) * pageSize, page * pageSize - 1);
        
        const { data: guestsData, error: guestsError } = await query;
        
        // Buscar contagem total respeitando os filtros
        let countQuery = supabase
            .from('guests')
            .select('*', { count: 'exact', head: true })
            .eq('event_id', eventId);
        
        // Aplicar os mesmos filtros na contagem
        if (searchTerm) {
            countQuery = countQuery.or(`name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`);
        }
        if (filterCheckedIn !== null && filterCheckedIn !== undefined) {
            countQuery = countQuery.eq('checked_in', filterCheckedIn);
        }
        
        const { count } = await countQuery;
        
        if (guestsError) {
            console.error("Erro ao buscar convidados:", guestsError);
            throw new Error(`Erro ao buscar convidados: ${guestsError.message}`);
        }

        // Buscar dados dos promotores se existirem
        const promoterIds = guestsData
            ?.filter(guest => guest.promoter_id)
            .map(guest => guest.promoter_id) || [];
        
        const promoterNames: Record<string, string> = {};
        
        if (promoterIds.length > 0) {
            const { data: promotersData } = await supabase
                .from('profiles')
                .select('id, first_name, last_name')
                .in('id', promoterIds);
                
            if (promotersData) {
                promotersData.forEach(promoter => {
                    promoterNames[promoter.id] = `${promoter.first_name || ''} ${promoter.last_name || ''}`.trim();
                });
            }
        }
        
        // Extrair IDs de equipes para busca posterior
        const teamIds = guestsData
            ?.filter(guest => guest.team_id)
            .map(guest => guest.team_id) || [];
        
        // Mapa para armazenar nomes de equipes por ID
        const teamNames: Record<string, string> = {};
        
        // Se temos IDs de equipes, buscar nomes diretamente da tabela teams
        if (teamIds.length > 0) {
            const { data: teamsData } = await supabase
                .from('teams')
                .select('id, name')
                .in('id', teamIds);
                
            if (teamsData) {
                teamsData.forEach(team => {
                    teamNames[team.id] = team.name;
                });
            }
        }
        
        // Transformar e combinar dados
        const transformedGuests = guestsData?.map(guest => ({
            id: guest.id,
            name: guest.name,
            phone: guest.phone,
            checked_in: guest.checked_in,
            check_in_time: guest.check_in_time,
            created_at: guest.created_at,
            promoter_name: guest.promoter_id ? promoterNames[guest.promoter_id] || null : null,
            team_name: guest.team_id ? teamNames[guest.team_id] || '-' : null,
        })) || [];
        
        return {
            guests: transformedGuests,
            totalCount: count ?? 0,
        };

    } catch (error: any) {
        console.error("Erro inesperado em getGuestsForEvent:", error);
        return {
            guests: [],
            totalCount: 0,
            error: error.message || "Erro inesperado ao buscar convidados.",
        };
    }
} 