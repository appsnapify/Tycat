// app/api/client-auth-v3/check-phone/route.ts
// API otimizada de verificação de telefone PARA PROMO2
// ✅ Cache em memória + Rate limiting + Timeout protection

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/adminClient';
import { phoneCacheV2 } from '@/lib/cache/phone-cache-v2';
import { checkRateLimit, RATE_LIMIT_CONFIGS } from '@/lib/security/advanced-rate-limit';

// ✅ VALIDAÇÃO DE TELEFONE ROBUSTA
function validatePhone(phone: any): { valid: boolean; error?: string } {
  if (!phone || typeof phone !== 'string') {
    return { valid: false, error: 'Telefone é obrigatório' };
  }
  
  const cleanPhone = phone.trim();
  if (cleanPhone.length < 9) {
    return { valid: false, error: 'Telefone deve ter pelo menos 9 dígitos' };
  }
  
  if (cleanPhone.length > 20) {
    return { valid: false, error: 'Telefone inválido' };
  }
  
  return { valid: true };
}

export async function POST(request: NextRequest) {
  try {
    // ✅ RATE LIMITING CONFORME PLANO
    const rateLimitResult = await checkRateLimit(request, RATE_LIMIT_CONFIGS.CHECK_PHONE);
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

    const body = await request.json();
    const { phone } = body;

    // ✅ VALIDAÇÃO ROBUSTA
    const validation = validatePhone(phone);
    if (!validation.valid) {
      return NextResponse.json({
        success: false,
        error: validation.error 
      }, { status: 400 });
    }

    // ✅ NORMALIZAÇÃO TELEFONE
    let normalizedPhone = phone.trim();
    if (!normalizedPhone.startsWith('+351')) {
      normalizedPhone = '+351' + normalizedPhone.replace(/^\\+?351/, '');
    }
    
    // ✅ CACHE HIT CHECK
    const cached = phoneCacheV2.get(normalizedPhone);
    if (cached) {
      console.log(`[CHECK-PHONE-V3] Cache HIT: ${normalizedPhone} = ${cached.exists}`);
      return NextResponse.json({
        success: true,
        exists: cached.exists,
        userId: cached.userId,
        cached: true
      });
    }
    
    // ✅ TIMEOUT PROTECTION
    const supabase = createAdminClient();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout')), 5000)
    );
    
    const queryPromise = supabase
      .from('client_users')
      .select('id')
      .eq('phone', normalizedPhone)
      .maybeSingle();

    const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as any;
    
    if (error) {
      console.error('[CHECK-PHONE-V3] Erro Supabase:', error);
      return NextResponse.json({
        success: false,
        error: 'Erro ao verificar telefone' 
      }, { status: 500 });
    }

    const result = {
      exists: !!data,
      userId: data?.id || null
    };
    
    // ✅ CACHE SET
    phoneCacheV2.set(normalizedPhone, result);
    console.log(`[CHECK-PHONE-V3] Cache SET: ${normalizedPhone} = ${result.exists}`);

    return NextResponse.json({
      success: true,
      ...result,
      cached: false
    });

  } catch (error) {
    console.error('[CHECK-PHONE-V3] Erro:', error);
    
    if (error.message === 'Timeout') {
      return NextResponse.json({ 
        success: false, 
        error: 'Sistema temporariamente ocupado. Tente novamente.' 
      }, { status: 503 });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Erro interno' 
    }, { status: 500 });
  }
} 