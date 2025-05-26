'use server';

import { createClient } from '@/lib/supabase/server';
import { v4 as uuidv4 } from 'uuid';
import { qrCodeService } from '@/lib/services/qrcode.service';

/**
 * Verifica se um convidado já existe para um evento/usuário e retorna os dados
 */
export async function checkExistingGuest(eventId: string, clientUserId: string) {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('guests')
      .select('id, qr_code_url, qr_code')
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
    
    // Gerar QR Code usando o novo serviço
    const { qrCodeUrl, qrCodeData } = await qrCodeService.generateQRCode(
      data.clientUserId,
      data.eventId
    );
    
    // Criamos o objeto de inserção com todos os campos necessários
    const insertData = {
      event_id: data.eventId,
      name: data.name,
      phone: data.phone,
      client_user_id: data.clientUserId,
      promoter_id: data.promoterId,
      team_id: data.teamId,
      qr_code: qrCodeData,       // Dados assinados do QR code
      qr_code_url: qrCodeUrl     // URL ou data URL do QR code
    };
    
    console.log('Tentando inserir novo convidado com dados:', {
      ...insertData,
      qr_code: 'Dados assinados (truncado para log)'
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
export async function updateGuestQRCode(guestId: string, eventId: string) {
  try {
    const supabase = await createClient();
    
    // Gerar novo QR Code
    const { qrCodeUrl, qrCodeData } = await qrCodeService.generateQRCode(
      guestId,
      eventId
    );
    
    const { error } = await supabase
      .from('guests')
      .update({ 
        qr_code_url: qrCodeUrl,
        qr_code: qrCodeData
      })
      .eq('id', guestId);
    
    if (error) {
      console.error('Erro ao atualizar QR code (server action):', error);
      return { error: error.message };
    }
    
    return { success: true, qrCodeUrl, qrCodeData };
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

/**
 * Valida um QR code
 */
export async function validateGuestQRCode(qrCodeData: string) {
  try {
    const isValid = await qrCodeService.validateQRCode(qrCodeData);
    return { isValid };
  } catch (error) {
    console.error('Erro ao validar QR code:', error);
    return { error: 'Erro ao validar QR code' };
  }
} 
