import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/adminClient';

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
    
    // Query Supabase
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('client_users')
      .select('id')
      .eq('phone', normalizedPhone)
      .maybeSingle();
    
    if (error) {
      return NextResponse.json({ 
        success: false, 
        error: 'Erro ao verificar telefone'
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true, 
      exists: !!data,
      userId: data?.id || null
    });
    
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: 'Erro no servidor'
    }, { status: 500 });
  }
} 