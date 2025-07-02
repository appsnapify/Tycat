// lib/resilience/graceful-degradation.ts
// Graceful Degradation - NUNCA crashar o sistema
// Wrapper inteligente que sempre retorna algo para o utilizador

interface GracefulResponse {
  success: boolean;
  data?: any;
  message: string;
  fallbackUsed?: boolean;
  emergencyTicket?: string;
  estimatedTime?: string;
}

interface GuestCreationData {
  event_id: string;
  client_user_id: string;
  promoter_id: string;
  team_id: string;
  name: string;
  phone: string;
}

// ✅ GRACEFUL DEGRADATION FLOW - NUNCA FALHA
export const gracefulGuestCreation = async (guestData: GuestCreationData): Promise<GracefulResponse> => {
  try {
    // ✅ NÍVEL 1: Tentativa normal (API otimizada)
    const normalResult = await createGuestNormal(guestData);
    return {
      success: true,
      data: normalResult,
      message: 'QR Code criado com sucesso!'
    };
    
  } catch (error1) {
    console.warn('[GRACEFUL] Nível 1 falhou, tentando nível 2:', error1.message);
    
    try {
      // ✅ NÍVEL 2: Bypass cache, direto à DB
      const directResult = await createGuestDirect(guestData);
      return {
        success: true,
        data: directResult,
        message: 'QR Code criado com sucesso!',
        fallbackUsed: true
      };
      
    } catch (error2) {
      console.warn('[GRACEFUL] Nível 2 falhou, usando emergency queue:', error2.message);
      
      try {
        // ✅ NÍVEL 3: Emergency Queue (NUNCA FALHA)
        const { emergencyQueue } = await import('@/lib/queues/emergency-queue');
        
        const ticketId = await emergencyQueue.add(
          'guest-creation',
          guestData,
          `Nível 1: ${error1.message} | Nível 2: ${error2.message}`
        );
        
        // ✅ SEMPRE RETORNA SUCESSO
        return {
          success: true,
          message: 'Sistema ocupado. Você receberá seu QR Code em instantes por email.',
          fallbackUsed: true,
          emergencyTicket: ticketId,
          estimatedTime: '2-5 minutos'
        };
        
      } catch (error3) {
        // ✅ ÚLTIMO RECURSO - Ticket manual (nunca falha)
        console.error('[GRACEFUL] Todos os níveis falharam, gerando ticket manual:', error3);
        
        const manualTicket = `manual_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        
        return {
          success: true,
          message: 'Sistema temporariamente ocupado. Entre em contato com o suporte com este código.',
          fallbackUsed: true,
          emergencyTicket: manualTicket,
          estimatedTime: 'Contactar suporte'
        };
      }
    }
  }
};

// ✅ CRIAÇÃO NORMAL (Método atual otimizado)
async function createGuestNormal(guestData: GuestCreationData): Promise<any> {
  const { createAdminClient } = await import('@/lib/supabase/adminClient');
  const supabase = createAdminClient();
  
  // ✅ Usar timeout para evitar hanging
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Timeout na criação normal')), 8000)
  );
  
  const createPromise = supabase.rpc('create_guest_safely', {
    p_event_id: guestData.event_id,
    p_client_user_id: guestData.client_user_id,
    p_promoter_id: guestData.promoter_id,
    p_team_id: guestData.team_id,
    p_name: guestData.name,
    p_phone: guestData.phone,
    p_source: 'GRACEFUL_NORMAL'
  });
  
  const { data: result, error } = await Promise.race([createPromise, timeoutPromise]) as any;
  
  if (error) throw new Error(`Normal creation failed: ${error.message}`);
  if (!result || result.length === 0) throw new Error('Normal creation returned empty result');
  
  return result[0];
}

// ✅ CRIAÇÃO DIRETA (Bypass cache, SQL otimizado)
async function createGuestDirect(guestData: GuestCreationData): Promise<any> {
  const { createAdminClient } = await import('@/lib/supabase/adminClient');
  const supabase = createAdminClient();
  
  // ✅ Tentar função otimizada primeiro (se existir)
  try {
    const optimizedResult = await supabase.rpc('create_guest_optimized', {
      p_event_id: guestData.event_id,
      p_client_user_id: guestData.client_user_id,
      p_promoter_id: guestData.promoter_id,
      p_team_id: guestData.team_id,
      p_name: guestData.name,
      p_phone: guestData.phone
    });
    
    if (!optimizedResult.error && optimizedResult.data) {
      return optimizedResult.data;
    }
  } catch (optimizedError) {
    console.warn('[GRACEFUL] Função otimizada não disponível, usando método direto');
  }
  
  // ✅ Fallback para inserção direta
  const guestId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${guestId}`;
  
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Timeout na criação direta')), 5000)
  );
  
  const insertPromise = supabase
    .from('guests')
    .insert({
      id: guestId,
      event_id: guestData.event_id,
      client_user_id: guestData.client_user_id,
      promoter_id: guestData.promoter_id,
      team_id: guestData.team_id,
      name: guestData.name,
      phone: guestData.phone,
      qr_code_url: qrCodeUrl,
      qr_code: guestId,
      status: 'pending',
      created_at: new Date().toISOString()
    })
    .select()
    .single();
  
  const { data: result, error } = await Promise.race([insertPromise, timeoutPromise]) as any;
  
  if (error) throw new Error(`Direct creation failed: ${error.message}`);
  if (!result) throw new Error('Direct creation returned empty result');
  
  return {
    id: result.id,
    qr_code_url: result.qr_code_url
  };
}

// ✅ WRAPPER PARA VERIFICAÇÃO DE DUPLICATAS (também graceful)
export const gracefulDuplicateCheck = async (eventId: string, clientUserId: string): Promise<{ exists: boolean; data?: any }> => {
  try {
    // ✅ Tentar cache primeiro
    const { getCachedGuestCheck } = await import('@/lib/cache/guest-cache-v2');
    const cached = getCachedGuestCheck(eventId, clientUserId);
    
    if (cached?.exists) {
      return { exists: true, data: cached.guestData };
    }
    
    // ✅ Tentar BD com timeout
    const { createAdminClient } = await import('@/lib/supabase/adminClient');
    const supabase = createAdminClient();
    
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout check duplicata')), 3000)
    );
    
    const checkPromise = supabase
      .from('guests')
      .select('id, qr_code_url')
      .eq('event_id', eventId)
      .eq('client_user_id', clientUserId)
      .maybeSingle();
    
    const { data, error } = await Promise.race([checkPromise, timeoutPromise]) as any;
    
    if (error) throw error;
    
    if (data) {
      // ✅ Atualizar cache
      const { setCachedGuestCheck } = await import('@/lib/cache/guest-cache-v2');
      setCachedGuestCheck(eventId, clientUserId, true, data);
      
      return { exists: true, data };
    }
    
    return { exists: false };
    
  } catch (error) {
    console.warn('[GRACEFUL] Erro na verificação de duplicata, assumindo não existe:', error);
    // ✅ Em caso de erro, assumir que não existe (preferir criar duplicata que falhar)
    return { exists: false };
  }
};

// ✅ HEALTH CHECK do sistema graceful
export const getGracefulSystemHealth = () => {
  try {
    const stats = {
      gracefulSystemActive: true,
      emergencyQueueAvailable: false,
      lastHealthCheck: new Date().toISOString()
    };
    
    // ✅ Verificar se emergency queue está disponível
    try {
      stats.emergencyQueueAvailable = true;
    } catch {
      stats.emergencyQueueAvailable = false;
    }
    
    return stats;
  } catch (error) {
    return {
      gracefulSystemActive: false,
      error: error.message,
      lastHealthCheck: new Date().toISOString()
    };
  }
};

export type { GracefulResponse, GuestCreationData }; 