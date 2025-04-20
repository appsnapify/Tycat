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
        // --- Construir Query Base ---
        let query = supabase
            .from('guests')
            .select(`
                id,
                name,
                phone,
                checked_in,
                check_in_time,
                created_at,
                promoter:profiles ( first_name, last_name ),
                team:teams ( name )
            `, { count: 'exact' }) // Pedir contagem total com os mesmos filtros
            .eq('event_id', eventId)

        // --- Aplicar Filtros ---
        if (searchTerm) {
            // Pesquisar por nome OU telefone (ajustar conforme necessário)
            query = query.or(`name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`);
        }
        if (filterCheckedIn !== null && filterCheckedIn !== undefined) {
            query = query.eq('checked_in', filterCheckedIn);
        }

        // --- Aplicar Ordenação (Ex: mais recentes primeiro) ---
        query = query.order('created_at', { ascending: false });

        // --- Aplicar Paginação ---
        const startIndex = (page - 1) * pageSize;
        const endIndex = startIndex + pageSize - 1;
        query = query.range(startIndex, endIndex);

        // --- Executar Query ---
        const { data, error, count } = await query;

        if (error) {
            console.error("Erro ao buscar convidados:", error);
            throw new Error(`Erro ao buscar convidados: ${error.message}`);
        }

        // --- Transformar Dados e Retornar ---
        const transformedGuests = data?.map(guest => ({
            id: guest.id,
            name: guest.name,
            phone: guest.phone, // Retorna, mas pode ser omitido no cliente
            checked_in: guest.checked_in,
            check_in_time: guest.check_in_time,
            created_at: guest.created_at,
            promoter_name: guest.promoter ? `${guest.promoter.first_name || ''} ${guest.promoter.last_name || ''}`.trim() : null,
            team_name: guest.team ? guest.team.name : null,
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