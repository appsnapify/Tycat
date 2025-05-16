'use server';

import { createServerSupabaseClient } from '@/lib/supabase-server';
import { unstable_noStore as noStore } from 'next/cache';

// Nota: A estrutura exata da tabela organizer_business_details (especialmente a FK para users)
// precisa ser confirmada. Assumindo uma coluna 'user_id' ou 'organizer_id' por agora.

export async function getOrganizerBusinessDetails() {
  noStore(); // Garante que os dados não sejam cacheados estaticamente
  const supabase = await createServerSupabaseClient();
  console.log('[SA:getDetails] Iniciando busca de detalhes da empresa...'); // DEBUG INÍCIO

  try {
    console.log('[SA:getDetails] Tentando obter usuário autenticado...'); // DEBUG
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    console.log('[SA:getDetails] Resultado supabase.auth.getUser() - User:', user ? user.id : null, 'UserError:', userError); // DEBUG

    if (userError || !user) {
      console.error('[SA:getDetails] Erro ao buscar usuário ou usuário não autenticado:', userError?.message);
      return { success: false, error: 'Utilizador não autenticado.', data: null };
    }

    console.log('[SA:getDetails] Usuário autenticado:', user.id, '- Buscando detalhes na tabela organizer_business_details...'); // DEBUG
    const { data, error } = await supabase
      .from('organizer_business_details')
      .select('*')
      .eq('user_id', user.id) // ATENÇÃO: Confirmar se 'user_id' é o nome correto da coluna de FK para users
      .single();
    
    console.log('[SA:getDetails] Resultado da query Supabase - Data:', data, 'Error:', error); // DEBUG

    if (error && error.code !== 'PGRST116') { // PGRST116 significa "single row not found", o que é esperado para um novo organizador sem detalhes.
      console.error('[SA:getDetails] Erro na query ao buscar detalhes da empresa:', error.message);
      return { success: false, error: 'Erro ao buscar detalhes da empresa.', data: null };
    }
    
    // Se data for null (devido a PGRST116), isso significa que não há registo, o que é um cenário válido (novo utilizador).
    // A página de formulário deverá lidar com 'data' como null e apresentar campos vazios.
    console.log('[SA:getDetails] Busca concluída. Retornando sucesso.', data ? 'Com dados.' : 'Sem dados (novo registo).'); // DEBUG FIM
    return { success: true, error: null, data: data };

  } catch (e: any) {
    console.error('[SA:getDetails] Exceção capturada na action getOrganizerBusinessDetails:', e.message, e.stack);
    return { success: false, error: e.message || 'Erro interno do servidor ao buscar detalhes.', data: null };
  }
}

// ... (restante do ficheiro, incluindo upsertOrganizerBusinessDetails) ...

interface BusinessDetailsData {
  business_name: string;
  vat_number: string;
  admin_contact_email: string;
  admin_contact_phone?: string | null; // Permitir null
  billing_address_line1: string;
  billing_address_line2?: string | null; // Permitir null
  billing_postal_code: string;
  billing_city: string;
  billing_country: string;
  iban: string;
  // iban_proof_url será adicionado na Fase 4
}

export async function upsertOrganizerBusinessDetails(details: BusinessDetailsData) {
  noStore();
  const supabase = await createServerSupabaseClient();
  console.log('[SA:upsertDetails] Iniciando upsert de detalhes da empresa...', details); // DEBUG INÍCIO

  try {
    console.log('[SA:upsertDetails] Tentando obter usuário autenticado...'); // DEBUG
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    console.log('[SA:upsertDetails] Resultado supabase.auth.getUser() - User:', user ? user.id : null, 'UserError:', userError); // DEBUG

    if (userError || !user) {
      console.error('[SA:upsertDetails] Erro ao buscar usuário ou usuário não autenticado para salvar:', userError?.message);
      return { success: false, error: 'Utilizador não autenticado para salvar dados.' };
    }

    const dataToUpsert = {
      ...details,
      user_id: user.id, // ATENÇÃO: Confirmar se 'user_id' é o nome correto da coluna
      admin_contact_phone: details.admin_contact_phone || null, // Garante que undefined vira null
      billing_address_line2: details.billing_address_line2 || null, // Garante que undefined vira null
      // A coluna updated_at é atualizada automaticamente pelo trigger 'handle_updated_at'
    };
    
    console.log('[SA:upsertDetails] Dados a serem inseridos/atualizados para user_id', user.id, ':', dataToUpsert); // DEBUG

    const { data, error } = await supabase
      .from('organizer_business_details')
      .upsert(dataToUpsert, { onConflict: 'user_id' }) // ATENÇÃO: Confirmar se 'user_id' é a constraint de conflito correta
      .select()
      .single(); // Retorna o registo inserido/atualizado

    console.log('[SA:upsertDetails] Resultado do upsert Supabase - Data:', data, 'Error:', error); // DEBUG

    if (error) {
      console.error('[SA:upsertDetails] Erro no upsert dos detalhes da empresa:', error.message);
      return { success: false, error: 'Erro ao salvar detalhes da empresa.' };
    }
    
    console.log('[SA:upsertDetails] Upsert concluído com sucesso.'); // DEBUG FIM
    return { success: true, error: null, data: data };

  } catch (e: any) {
    console.error('[SA:upsertDetails] Exceção capturada na action upsertOrganizerBusinessDetails:', e.message, e.stack);
    return { success: false, error: e.message || 'Erro interno do servidor ao salvar detalhes.' };
  }
} 