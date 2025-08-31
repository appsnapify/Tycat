'use server';

import { createClient } from '@/lib/supabase-server';
import { unstable_noStore as noStore } from 'next/cache';
import { cookies } from 'next/headers';

// Nota: A estrutura exata da tabela organizer_business_details (especialmente a FK para users)
// precisa ser confirmada. Assumindo uma coluna 'user_id' ou 'organizer_id' por agora.

// ✅ FUNÇÃO AUXILIAR: Inicializar action
async function initializeAction() {
  console.log("[Action:getOrganizerBusinessDetails] Iniciando action.");
  noStore();
  
  // Logar cookies
  try {
    const cookieStore = cookies();
    const allCookies = cookieStore.getAll();
    console.log("[Action:getOrganizerBusinessDetails] Cookies recebidos:", JSON.stringify(allCookies));
  } catch (e) {
    console.error("[Action:getOrganizerBusinessDetails] Erro ao tentar ler cookies:", e);
  }
}

// ✅ FUNÇÃO AUXILIAR: Criar cliente Supabase
async function createSupabaseClient() {
  const supabase = await createClient();
  console.log("[Action:getOrganizerBusinessDetails] Cliente Supabase criado:", supabase ? 'Objeto Cliente OK' : 'Cliente UNDEFINED');
  
  if (!supabase) {
    throw new Error('Falha ao criar cliente Supabase na action.');
  }
  
  return supabase;
}

// ✅ FUNÇÃO AUXILIAR: Obter usuário autenticado
async function getAuthenticatedUser(supabase: any) {
  console.log("[Action:getOrganizerBusinessDetails] Tentando obter usuário...");
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError) {
    throw new Error(`Erro ao obter usuário: ${userError.message}`);
  }
  
  if (!user) {
    throw new Error('Nenhum usuário autenticado.');
  }
  
  console.log("[Action:getOrganizerBusinessDetails] Usuário obtido:", user.id.substring(0, 8) + '...');
  return user;
}

// ✅ FUNÇÃO AUXILIAR: Buscar detalhes do negócio
async function fetchBusinessDetails(supabase: any, userId: string) {
  console.log(`[Action:getOrganizerBusinessDetails] Buscando detalhes para o usuário: ${userId}`);
  const { data, error } = await supabase
    .from('organizer_business_details')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Erro ao buscar detalhes: ${error.message}`);
  }

  if (!data) {
    console.log("[Action:getOrganizerBusinessDetails] Nenhum detalhe da empresa encontrado (normal).");
    return null;
  }

  console.log("[Action:getOrganizerBusinessDetails] Detalhes da empresa encontrados:", data);
  return data;
}

// ✅ FUNÇÃO PRINCIPAL REFATORADA (Complexidade: 10 → <8)
export async function getOrganizerBusinessDetails() {
  try {
    await initializeAction();
    const supabase = await createSupabaseClient();
    const user = await getAuthenticatedUser(supabase);
    const data = await fetchBusinessDetails(supabase, user.id);
    
    return { success: true, data };
  } catch (error: any) {
    console.error("[Action:getOrganizerBusinessDetails] Erro:", error);
    return { success: false, error: error.message, data: null };
  }
}

// A action upsertOrganizerBusinessDetails será adicionada abaixo nesta mesma Fase 3. 

// Nota: O schema Zod para validação dos dados do formulário está definido em
// /app/organizador/configuracao/page.tsx. Idealmente, para Server Actions,
// a validação também ocorreria aqui no backend antes de interagir com o DB.
// Por simplicidade neste passo, assumiremos que os dados chegam já validados pelo frontend.
// Numa implementação de produção, adicionaríamos validação Zod aqui também.

interface BusinessDetailsData {
  business_name: string;
  vat_number: string;
  admin_contact_email: string;
  admin_contact_phone?: string | null;
  billing_address_line1: string;
  billing_address_line2?: string | null;
  billing_postal_code: string;
  billing_city: string;
  billing_country: string;
  iban: string;
  iban_proof_url?: string | null; 
}

// ✅ FUNÇÕES AUXILIARES (Complexidade: ≤3 pontos cada)
const logCookies = () => {
  try {
    const cookieStore = cookies();
    const allCookies = cookieStore.getAll();
    console.log("[Action:upsertOrganizerBusinessDetails] Cookies recebidos:", JSON.stringify(allCookies));
  } catch (e) {
    console.error("[Action:upsertOrganizerBusinessDetails] Erro ao tentar ler cookies:", e);
  }
};

const createSupabaseClient = async () => {
  try {
    const supabase = await createClient();
    console.log("[Action:upsertOrganizerBusinessDetails] Cliente Supabase criado:", supabase ? 'Objeto Cliente OK' : 'Cliente UNDEFINED');
    if (!supabase) {
      return { success: false, error: 'Falha ao criar cliente Supabase na action upsert.', data: null };
    }
    return { success: true, client: supabase };
  } catch (error: any) {
    console.error("[Action:upsertOrganizerBusinessDetails] Erro ao criar cliente Supabase:", error);
    return { success: false, error: `Falha ao criar cliente Supabase na action upsert: ${error.message}`, data: null };
  }
};

const getAuthenticatedUser = async (supabase: any) => {
  console.log("[Action:upsertOrganizerBusinessDetails] Tentando obter usuário...");
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError) {
    console.error("[Action:upsertOrganizerBusinessDetails] Erro ao obter usuário:", userError);
    return { success: false, error: `Erro ao obter usuário no upsert: ${userError.message}`, data: null };
  }
  if (!user) {
    console.log("[Action:upsertOrganizerBusinessDetails] Nenhum usuário autenticado encontrado para upsert.");
    return { success: false, error: 'Nenhum usuário autenticado para upsert.', data: null };
  }
  console.log("[Action:upsertOrganizerBusinessDetails] Usuário obtido para upsert:", user.id.substring(0, 8) + '...');
  return { success: true, user };
};

const executeUpsert = async (supabase: any, details: BusinessDetailsData, userId: string) => {
  const dataToUpsert = {
    ...details,
    user_id: userId,
    admin_contact_phone: details.admin_contact_phone || null,
    billing_address_line2: details.billing_address_line2 || null,
    iban_proof_url: details.iban_proof_url || null,
  };
  console.log("[Action:upsertOrganizerBusinessDetails] Dados para upsert:", dataToUpsert);

  const { data, error } = await supabase
    .from('organizer_business_details')
    .upsert(dataToUpsert, { onConflict: 'user_id', ignoreDuplicates: false })
    .select()
    .single();

  if (error) {
    console.error("[Action:upsertOrganizerBusinessDetails] Erro no upsert dos detalhes da empresa:", error);
    return { success: false, error: `Erro no upsert: ${error.message}`, data: null };
  }

  console.log("[Action:upsertOrganizerBusinessDetails] Detalhes da empresa atualizados/inseridos:", data);
  return { success: true, data };
};

// ✅ FUNÇÃO PRINCIPAL SIMPLIFICADA (Complexidade: 6 pontos)
export async function upsertOrganizerBusinessDetails(details: BusinessDetailsData) {
  console.log("[Action:upsertOrganizerBusinessDetails] Iniciando action com detalhes:", details);
  noStore();
  
  logCookies();

  const clientResult = await createSupabaseClient();
  if (!clientResult.success) return clientResult;

  try {
    const userResult = await getAuthenticatedUser(clientResult.client);
    if (!userResult.success) return userResult;

    return await executeUpsert(clientResult.client, details, userResult.user.id);
  } catch (e: any) {
    console.error("[Action:upsertOrganizerBusinessDetails] Erro inesperado na action de upsert:", e);
    return { success: false, error: `Erro inesperado na action de upsert: ${e.message}`, data: null };
  }
} 