// app/api/client-auth-v3/guests/create-instant/route.ts
// API otimizada para criação instantânea de guests COM RATE LIMITING

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/adminClient';
import { getCachedGuestCheck, setCachedGuestCheck, invalidateGuestCache } from '@/lib/cache/guest-cache-v2';
import { processingManager } from '@/lib/processing/processing-manager';
import { checkRateLimit, RATE_LIMIT_CONFIGS } from '@/lib/security/advanced-rate-limit';

// ✅ USANDO PROCESSING MANAGER COMPARTILHADO

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

// ✅ PROCESSO BACKGROUND REAL
async function processGuestCreationInBackground(guestData: any, processingKey: string): Promise<void> {
  try {
    const supabase = createAdminClient();
    
    // ✅ ATUALIZAR STATUS PARA PROCESSANDO
    processingManager.set(processingKey, {
      status: 'processing',
      timestamp: Date.now()
    });
    
    // ✅ USAR GRACEFUL SYSTEM EM VEZ DE CHAMADA DIRETA
    const { gracefulGuestCreation } = await import('@/lib/resilience/graceful-degradation');
    
    const gracefulResult = await gracefulGuestCreation({
      event_id: guestData.event_id,
      client_user_id: guestData.client_user_id,
      promoter_id: guestData.promoter_id,
      team_id: guestData.team_id,
      name: guestData.name,
      phone: guestData.phone
    });

    if (!gracefulResult.success) {
      throw new Error(`Graceful system falhou: ${gracefulResult.message}`);
    }

    // ✅ GRACEFUL SEMPRE RETORNA ALGO (nunca falha)
    const guest = gracefulResult.data || { id: 'processing', qr_code_url: null };
    
    // ✅ SUCESSO - ATUALIZAR STATUS
    processingManager.set(processingKey, {
      status: 'completed',
      result: gracefulResult.fallbackUsed ? {
        id: gracefulResult.emergencyTicket || 'emergency',
        qr_code_url: null,
        message: gracefulResult.message,
        emergency_ticket: gracefulResult.emergencyTicket
      } : {
        id: guest.id,
        qr_code_url: guest.qr_code_url
      },
      timestamp: Date.now()
    });
    
    // ✅ INVALIDAR CACHE
    invalidateGuestCache(guestData.event_id, guestData.client_user_id);
    setCachedGuestCheck(guestData.event_id, guestData.client_user_id, true, guest);

    console.log(`[GUEST-CREATE-V3] Processamento completo: ${processingKey}`);

  } catch (error) {
    console.error(`[GUEST-CREATE-V3] Erro no processamento ${processingKey}:`, error);
    
    // ✅ ERRO - ATUALIZAR STATUS
    processingManager.set(processingKey, {
      status: 'failed',
      error: error.message || 'Erro desconhecido',
      timestamp: Date.now()
    });
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // ✅ RATE LIMITING CONFORME PLANO DE OTIMIZAÇÃO
    const rateLimitResult = await checkRateLimit(request, RATE_LIMIT_CONFIGS.GUEST_CREATE);
    if (!rateLimitResult.success) {
      return NextResponse.json({
        success: false,
        error: 'Muitas tentativas. Tente novamente em alguns minutos.',
        retryAfter: rateLimitResult.retryAfter
      }, { 
        status: 429,
        headers: {
          'X-RateLimit-Limit': rateLimitResult.limit.toString(),
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
        }
      });
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
    const existingProcess = processingManager.get(processingKey);
    
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
        processingManager.delete(processingKey);
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

    // ✅ RESPOSTA IMEDIATA
    const responseTime = Date.now() - startTime;
    
    // ✅ PROCESSO BACKGROUND (não bloqueia resposta)
    setImmediate(() => {
      processGuestCreationInBackground(body, processingKey);
    });

    return NextResponse.json({
      success: true,
      processing: true,
      processingKey,
      message: 'Processando sua solicitação... Você receberá o QR Code em instantes.',
      estimatedTime: '3-5 segundos',
      responseTime
    }, {
      headers: {
        'X-Response-Time': responseTime.toString(),
        'X-Processing-Key': processingKey
      }
    });

  } catch (error) {
    console.error('[GUEST-CREATE-V3] Erro não tratado:', error);
    
    const responseTime = Date.now() - startTime;
    
    return NextResponse.json({
      success: false,
      error: 'Erro interno no servidor',
      responseTime
    }, { 
      status: 500,
      headers: {
        'X-Response-Time': responseTime.toString()
      }
    });
  }
} 