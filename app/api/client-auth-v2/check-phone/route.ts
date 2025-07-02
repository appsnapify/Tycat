import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/adminClient';
import { phoneCacheV2 } from '@/lib/cache/phone-cache-v2';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { phone } = body;
    
    // Validação básica
    if (!phone) {
      return NextResponse.json({ 
        success: false, 
        error: 'Telefone é obrigatório'
      }, { status: 400 });
    }
    
    // Normalização simples
    let normalizedPhone = phone.trim();
    if (!normalizedPhone.startsWith('+351')) {
      normalizedPhone = '+351' + normalizedPhone.replace(/^\+?351/, '');
    }
    
    // ✅ VERIFICAR CACHE PRIMEIRO
    const cached = phoneCacheV2.get(normalizedPhone);
    if (cached) {
      console.log(`[CHECK-PHONE-V2] Cache HIT: ${normalizedPhone}`);
      return NextResponse.json({ 
        success: true, 
        exists: cached.exists,
        userId: cached.userId,
        cached: true
      });
    }
    
    // Query Supabase com timeout
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
      console.error('[CHECK-PHONE-V2] Erro Supabase:', error);
      return NextResponse.json({ 
        success: false, 
        error: 'Erro ao verificar telefone'
      }, { status: 500 });
    }
    
    const result = {
      exists: !!data,
      userId: data?.id || null
    };
    
    // ✅ SALVAR NO CACHE
    phoneCacheV2.set(normalizedPhone, result);
    console.log(`[CHECK-PHONE-V2] Cache SET: ${normalizedPhone} = ${result.exists}`);
    
    return NextResponse.json({ 
      success: true, 
      ...result,
      cached: false
    });
    
  } catch (error) {
    console.error('[CHECK-PHONE-V2] Erro:', error);
    
    if (error.message === 'Timeout') {
      return NextResponse.json({ 
        success: false, 
        error: 'Sistema temporariamente ocupado' 
      }, { status: 503 });
    }
    
    return NextResponse.json({ 
      success: false, 
      error: 'Erro no servidor'
    }, { status: 500 });
  }
} 