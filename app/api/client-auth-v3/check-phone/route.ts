// app/api/client-auth-v3/check-phone/route.ts
// API otimizada de verificação de telefone
// ✅ Cache em memória + Rate limiting + Validação aprimorada

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/adminClient';
import { getCachedPhoneVerification, setCachedPhoneVerification } from '@/lib/cache/phone-cache-v2';
import { checkRateLimit, RATE_LIMIT_CONFIGS, createRateLimitKey } from '@/lib/security/rate-limit-v2';

// ✅ HELPER PARA OBTER IP
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  return 'unknown';
}

// ✅ VALIDAÇÃO DE TELEFONE
function validatePhone(phone: string): { valid: boolean; error?: string } {
  if (!phone || typeof phone !== 'string') {
    return { valid: false, error: 'Telefone é obrigatório' };
  }
  
  const cleanPhone = phone.trim();
  
  if (cleanPhone.length < 9 || cleanPhone.length > 15) {
    return { valid: false, error: 'Formato de telefone inválido' };
  }
  
  // Verificar se contém apenas números e símbolos permitidos
  if (!/^[\d\s\+\-\(\)]+$/.test(cleanPhone)) {
    return { valid: false, error: 'Telefone contém caracteres inválidos' };
  }
  
  return { valid: true };
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // ✅ RATE LIMITING
    const clientIP = getClientIP(request);
    const rateLimitKey = createRateLimitKey(clientIP);
    const rateCheck = checkRateLimit(rateLimitKey, RATE_LIMIT_CONFIGS.PHONE_CHECK);
    
    if (!rateCheck.allowed) {
      return NextResponse.json({
        success: false,
        error: 'Muitas tentativas. Tente novamente em alguns minutos.',
        retryAfter: Math.ceil((rateCheck.resetTime - Date.now()) / 1000)
      }, { 
        status: 429,
        headers: {
          'X-RateLimit-Remaining': rateCheck.remaining.toString(),
          'X-RateLimit-Reset': rateCheck.resetTime.toString()
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

    const { phone } = body;

    // ✅ VALIDAÇÃO DO TELEFONE
    const phoneValidation = validatePhone(phone);
    if (!phoneValidation.valid) {
      return NextResponse.json({
        success: false,
        error: phoneValidation.error
      }, { status: 400 });
    }

    const cleanPhone = phone.trim();

    // ✅ CACHE HIT - RESPOSTA INSTANTÂNEA
    const cached = getCachedPhoneVerification(cleanPhone);
    if (cached) {
      console.log(`[PHONE-CHECK-V3] Cache hit para ${cleanPhone}`);
      
      const responseTime = Date.now() - startTime;
      
      return NextResponse.json({
        success: true,
        exists: cached.exists,
        userId: cached.userId,
        source: 'cache',
        responseTime
      }, {
        headers: {
          'X-Cache-Status': 'HIT',
          'X-Response-Time': responseTime.toString()
        }
      });
    }

    // ✅ CACHE MISS - CONSULTAR DATABASE
    console.log(`[PHONE-CHECK-V3] Cache miss para ${cleanPhone}, consultando BD`);
    
    const supabase = createAdminClient();
    
    const { data, error } = await supabase
      .from('client_users')
      .select('id, phone')
      .eq('phone', cleanPhone)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('[PHONE-CHECK-V3] Erro na consulta:', error);
      return NextResponse.json({
        success: false,
        error: 'Erro interno na verificação'
      }, { status: 500 });
    }

    const result = {
      exists: !!data,
      userId: data?.id || null
    };

    // ✅ CACHE PARA PRÓXIMAS VERIFICAÇÕES
    setCachedPhoneVerification(cleanPhone, result.exists, result.userId);
    
    const responseTime = Date.now() - startTime;
    
    console.log(`[PHONE-CHECK-V3] Verificação completa para ${cleanPhone}: ${result.exists ? 'EXISTE' : 'NÃO EXISTE'} (${responseTime}ms)`);

    return NextResponse.json({
      success: true,
      ...result,
      source: 'database',
      responseTime
    }, {
      headers: {
        'X-Cache-Status': 'MISS',
        'X-Response-Time': responseTime.toString(),
        'X-RateLimit-Remaining': rateCheck.remaining.toString()
      }
    });

  } catch (error) {
    console.error('[PHONE-CHECK-V3] Erro não tratado:', error);
    
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