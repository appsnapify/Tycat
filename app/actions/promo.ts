'use server';

import { createClient } from '@/lib/supabase/server';
import { v4 as uuidv4 } from 'uuid';

/**
 * Verifica se um convidado já existe para um evento/usuário e retorna os dados
 */
export async function checkExistingGuest(eventId: string, clientUserId: string) {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('guests')
      .select('id, qr_code_url')
      .eq('event_id', eventId)
      .eq('client_user_id', clientUserId)
      .maybeSingle();
    
    if (error) {
      console.error('Erro ao verificar convidado existente (server action):', error);
      return { error: error.message };
    }
    
    return { data };
  } catch (error) {
    console.error('Exceção ao verificar convidado (server action):', error);
    return { error: 'Erro interno ao verificar convidado' };
  }
}

/**
 * Cria um novo registro de convidado no banco de dados
 */
export async function createGuestRecord(data: {
  eventId: string;
  clientUserId: string;
  name: string;
  phone: string;
  promoterId: string;
  teamId: string;
}) {
  try {
    const supabase = await createClient();
    
    // Garantir que temos um qr_code válido para satisfazer a restrição NOT NULL
    // Criamos primeiro os dados que serão codificados no QR code
    const qrCodeData = {
      userId: data.clientUserId,
      eventId: data.eventId,
      timestamp: new Date().toISOString()
    };
    
    // Convertemos para string JSON
    const qrCodeString = JSON.stringify(qrCodeData);
    
    // Geramos a URL do QR code
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrCodeString)}`;
    
    // Criamos o objeto de inserção com todos os campos necessários
    const insertData = {
      event_id: data.eventId,
      name: data.name,
      phone: data.phone,
      client_user_id: data.clientUserId,
      promoter_id: data.promoterId,
      team_id: data.teamId,
      qr_code: qrCodeString,       // JSON válido para satisfazer a restrição NOT NULL
      qr_code_url: qrCodeUrl       // URL do QR code
    };
    
    console.log('Tentando inserir novo convidado com dados:', {
      ...insertData,
      qr_code: 'JSON string (truncado para log)'
    });
    
    // Tentamos a inserção com todos os campos necessários
    const { data: result, error } = await supabase
      .from('guests')
      .insert(insertData)
      .select('id')
      .single();
    
    if (error) {
      console.error('Erro detalhado ao criar convidado (server action):', error);
      return { error: error.message };
    }
    
    return { data: result };
  } catch (error) {
    console.error('Exceção detalhada ao criar convidado (server action):', error);
    return { error: error instanceof Error ? error.message : 'Erro interno ao criar convidado' };
  }
}

/**
 * Atualiza o QR code na tabela de convidados
 */
export async function updateGuestQRCode(guestId: string, qrCodeUrl: string) {
  try {
    const supabase = await createClient();
    
    const { error } = await supabase
      .from('guests')
      .update({ qr_code_url: qrCodeUrl })
      .eq('id', guestId);
    
    if (error) {
      console.error('Erro ao atualizar QR code (server action):', error);
      return { error: error.message };
    }
    
    return { success: true };
  } catch (error) {
    console.error('Exceção ao atualizar QR code (server action):', error);
    return { error: 'Erro interno ao atualizar QR code' };
  }
}

/**
 * Gera um ID de emergência para uso quando a criação do registro falha
 */
export async function generateEmergencyId() {
  const id = uuidv4();
  return { id };
} 