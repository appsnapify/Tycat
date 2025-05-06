'use server'

import { createServerActionClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from '@/types/supabase' // Assume que você tem tipos gerados

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
    const supabase = createServerActionClient<Database>({ cookies });

    try {
        // Consulta para buscar convidados com informações básicas
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
                promoter:profiles ( first_name, last_name )
            `, { count: 'exact' })
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
        const startIndex = (page - 1) * pageSize;
        const endIndex = startIndex + pageSize - 1;
        query = query.range(startIndex, endIndex);
        
        // Executar consulta principal
        const { data: guestsData, error: guestsError, count } = await query;
        
        if (guestsError) {
            console.error("Erro ao buscar convidados:", guestsError);
            throw new Error(`Erro ao buscar convidados: ${guestsError.message}`);
        }
        
        // Extrair IDs de equipes para busca posterior
        const teamIds = guestsData
            ?.filter(guest => guest.team_id)
            .map(guest => guest.team_id) || [];
        
        // Mapa para armazenar nomes de equipes por ID
        const teamNames: Record<string, string> = {};
        
        // Se temos IDs de equipes, buscar nomes usando a função RPC personalizada
        if (teamIds.length > 0) {
            const { data: teamsData, error: teamsError } = await supabase
                .rpc('get_team_names_for_guests', { 
                    guest_team_ids: teamIds 
                });
                
            if (!teamsError && teamsData) {
                // Preencher o mapa de IDs para nomes
                teamsData.forEach((team: { id: string, name: string }) => {
                    teamNames[team.id] = team.name;
                });
            } else if (teamsError) {
                console.warn("Aviso: Não foi possível buscar nomes de equipes:", teamsError);
                // Mostrar detalhes do erro para debug
                console.debug("Detalhes do erro de equipes:", {
                    message: teamsError.message,
                    details: teamsError.details,
                    hint: teamsError.hint
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
            promoter_name: guest.promoter ? `${guest.promoter.first_name || ''} ${guest.promoter.last_name || ''}`.trim() : null,
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