// app/api/client-auth-v3/guests/create-instant/route.ts
// API otimizada de criação de guests com resposta imediata
// ✅ Cache + Rate limiting + Background processing + Polling

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/adminClient';
import { getCachedGuestCheck, setCachedGuestCheck, invalidateGuestCache } from '@/lib/cache/guest-cache-v2';
import { checkRateLimit, RATE_LIMIT_CONFIGS, createRateLimitKey } from '@/lib/security/rate-limit-v2';

// ✅ HELPER PARA OBTER IP
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  
  if (forwarded) return forwarded.split(',')[0].trim();
  if (realIP) return realIP;
  return 'unknown';
}

// ✅ VALIDAÇÃO DOS DADOS
function validateGuestData(data: any): { valid: boolean; error?: string } {
  const { event_id, client_user_id, promoter_id, team_id, name, phone } = data;

  if (!event_id || typeof event_id !== 'string') {
    return { valid: false, error: 'ID do evento é obrigatório' };
  }

  if (!client_user_id || typeof client_user_id !== 'string') {
    return { valid: false, error: 'ID do utilizador é obrigatório' };
  }

  if (!promoter_id || typeof promoter_id !== 'string') {
    return { valid: false, error: 'ID do promotor é obrigatório' };
  }

  if (!team_id || typeof team_id !== 'string') {
    return { valid: false, error: 'ID da equipa é obrigatório' };
  }

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    return { valid: false, error: 'Nome é obrigatório (mínimo 2 caracteres)' };
  }

  if (!phone || typeof phone !== 'string' || phone.trim().length < 9) {
    return { valid: false, error: 'Telefone é obrigatório' };
  }

  return { valid: true };
}

// ✅ PROCESSO BACKGROUND SIMULADO (mantém tudo no Supabase)
async function processGuestCreationInBackground(guestData: any): Promise<string> {
  const supabase = createAdminClient();
  
  // Simular pequeno delay para background processing
  await new Promise(resolve => setTimeout(resolve, 100));
  
  const { data: result, error } = await supabase.rpc('create_guest_safely', {
    p_event_id: guestData.event_id,
    p_client_user_id: guestData.client_user_id,
    p_promoter_id: guestData.promoter_id,
    p_team_id: guestData.team_id,
    p_name: guestData.name,
    p_phone: guestData.phone,
    p_source: 'PROMOTER'
  });

  if (error) {
    throw new Error(`Erro na criação: ${error.message}`);
  }

  if (!result || result.length === 0) {
    throw new Error('Nenhum resultado retornado');
  }

  const guest = result[0];
  
  // ✅ INVALIDAR CACHE (agora existe)
  invalidateGuestCache(guestData.event_id, guestData.client_user_id);
  setCachedGuestCheck(guestData.event_id, guestData.client_user_id, true, guest);

  return guest.qr_code_url;
}

// ✅ MAPA DE PROCESSAMENTO EM MEMÓRIA
const processingMap = new Map<string, {
  status: 'processing' | 'completed' | 'failed';
  result?: any;
  error?: string;
  timestamp: number;
}>();

// ✅ LIMPEZA AUTOMÁTICA DO MAPA
setInterval(() => {
  const now = Date.now();
  const expiredKeys = [];
  
  for (const [key, entry] of processingMap.entries()) {
    // Remover entradas antigas (5 minutos)
    if (now - entry.timestamp > 5 * 60 * 1000) {
      expiredKeys.push(key);
    }
  }
  
  expiredKeys.forEach(key => processingMap.delete(key));
}, 60 * 1000); // Limpeza a cada minuto

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // ✅ RATE LIMITING
    const clientIP = getClientIP(request);
    const rateLimitKey = createRateLimitKey(clientIP);
    const rateCheck = checkRateLimit(rateLimitKey, RATE_LIMIT_CONFIGS.GUEST_CREATE);
    
    if (!rateCheck.allowed) {
      return NextResponse.json({
        success: false,
        error: 'Limite de criações atingido. Aguarde um momento.',
        retryAfter: Math.ceil((rateCheck.resetTime - Date.now()) / 1000)
      }, { status: 429 });
    }

    // ✅ VALIDAÇÃO DO BODY
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: 'Dados inválidos'
      }, { status: 400 });
    }

    // ✅ VALIDAÇÃO DOS DADOS
    const validation = validateGuestData(body);
    if (!validation.valid) {
      return NextResponse.json({
        success: false,
        error: validation.error
      }, { status: 400 });
    }

    const { event_id, client_user_id } = body;

    // ✅ CHECK DUPLICATA COM CACHE
    const cached = getCachedGuestCheck(event_id, client_user_id);
    if (cached?.exists) {
      return NextResponse.json({
        success: true,
        data: cached.guestData,
        message: 'Você já está na Guest List!',
        isExisting: true,
        source: 'cache'
      });
    }

    // ✅ VERIFICAR SE JÁ ESTÁ PROCESSANDO
    const processingKey = `${event_id}:${client_user_id}`;
    const existingProcess = processingMap.get(processingKey);
    
    if (existingProcess) {
      if (existingProcess.status === 'completed') {
        // Já foi processado com sucesso
        return NextResponse.json({
          success: true,
          data: existingProcess.result,
          message: 'QR Code criado com sucesso!',
          processingKey
        });
      } else if (existingProcess.status === 'failed') {
        // Falhou, tentar novamente
        processingMap.delete(processingKey);
      } else {
        // Ainda processando
        return NextResponse.json({
          success: true,
          processing: true,
          processingKey,
          message: 'Processando... Aguarde alguns segundos.',
          estimatedTime: '3-5 segundos'
        });
      }
    }

    // ✅ INICIAR PROCESSAMENTO BACKGROUND
    processingMap.set(processingKey, {
      status: 'processing',
      timestamp: Date.now()
    });

    // ✅ RESPOSTA IMEDIATA
    const responseTime = Date.now() - startTime;
    
    // ✅ PROCESSO BACKGROUND (não bloqueia resposta)
    processGuestCreationInBackground(body)
      .then((qrCodeUrl) => {
        processingMap.set(processingKey, {
          status: 'completed',
          result: {
            qr_code_url: qrCodeUrl,
            created_at: new Date().toISOString()
          },
          timestamp: Date.now()
        });
        console.log(`[GUEST-CREATE-V3] ✅ Sucesso para ${processingKey}: QR criado`);
      })
      .catch((error) => {
        processingMap.set(processingKey, {
          status: 'failed',
          error: error.message,
          timestamp: Date.now()
        });
        console.error(`[GUEST-CREATE-V3] ❌ Erro para ${processingKey}:`, error);
      });

    return NextResponse.json({
      success: true,
      processing: true,
      processingKey,
      message: 'Processando seu pedido... Você receberá o QR Code em instantes.',
      estimatedTime: '3-5 segundos',
      pollUrl: `/api/client-auth-v3/guests/status/${processingKey}`,
      responseTime
    });

  } catch (error) {
    console.error('[GUEST-CREATE-V3] Erro não tratado:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Erro interno no servidor'
    }, { status: 500 });
  }
} 