// app/api/client-auth/guests/check-existing/route.ts
// API de fallback para verificar guests existentes
// Usado quando o polling falha por problemas de sincronização

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/adminClient';

export async function POST(request: NextRequest) {
  try {
    const { event_id, client_user_id } = await request.json();

    if (!event_id || !client_user_id) {
      return NextResponse.json({
        success: false,
        error: 'event_id e client_user_id são obrigatórios'
      }, { status: 400 });
    }

    const supabase = createAdminClient();

    // ✅ VERIFICAR SE GUEST JÁ EXISTE
    const { data: guest, error } = await supabase
      .from('guests')
      .select('id, qr_code_url, created_at')
      .eq('event_id', event_id)
      .eq('client_user_id', client_user_id)
      .maybeSingle();

    if (error) {
      console.error('[CHECK-EXISTING] Erro na query:', error);
      return NextResponse.json({
        success: false,
        error: 'Erro ao verificar guest existente'
      }, { status: 500 });
    }

    if (guest) {
      console.log(`[CHECK-EXISTING] Guest encontrado: ${guest.id}`);
      return NextResponse.json({
        success: true,
        found: true,
        data: {
          id: guest.id,
          qr_code_url: guest.qr_code_url,
          created_at: guest.created_at
        }
      });
    }

    console.log(`[CHECK-EXISTING] Guest não encontrado para event:${event_id} user:${client_user_id}`);
    return NextResponse.json({
      success: true,
      found: false,
      data: null
    });

  } catch (error) {
    console.error('[CHECK-EXISTING] Erro não tratado:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno no servidor'
    }, { status: 500 });
  }
} 