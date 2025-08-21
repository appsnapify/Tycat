import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { Database } from '@/lib/database.types';

export async function POST(request: Request) {
  try {
    const { phone, password, eventId, promoterId, teamId } = await request.json();

    // 🔍 DEBUG: Log dos dados recebidos
    // console.log('=== GUEST LOGIN DEBUG ===');
    // console.log('phone:', phone);
    // console.log('password length:', password?.length);
    // console.log('eventId:', eventId);
    // console.log('promoterId:', promoterId);
    // console.log('teamId:', teamId);
    // console.log('==========================');

    // Validação de inputs (promoterId é opcional para organizações)
    if (!phone || !password || !eventId) {
      console.error('❌ Dados obrigatórios em falta');
      return NextResponse.json(
        { success: false, error: 'Dados obrigatórios em falta' },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore });

    // 🚨 SISTEMA GUEST ISOLADO - Usar função authenticate_client (NOVA ESTRUTURA SEGURA)
    // console.log('🔍 Calling authenticate_client...');
    const { data: authResult, error: authError } = await supabase
      .rpc('authenticate_client', {
        p_phone: phone,
        p_password: password
      });

    if (authError) {
      console.error('❌ Authentication error:', authError);
      console.error('❌ Auth error details:', JSON.stringify(authError, null, 2));
      return NextResponse.json(
        { success: false, error: 'Erro interno no login' },
        { status: 500 }
      );
    }

    // console.log('✅ authenticate_client OK:', authResult);

    const authResultData = authResult as any;
    
    if (!authResultData.success) {
      return NextResponse.json(
        { success: false, error: authResultData.error || 'Credenciais incorretas' },
        { status: 401 }
      );
    }

    const client = authResultData.client;

    // 🛡️ VERIFICAR SE GUEST JÁ EXISTE NESTE EVENTO (PREVENIR DUPLICADOS)
    // ✅ CORREÇÃO: Usar função SECURITY DEFINER em vez de acesso direto
    // console.log('🔍 Checking if guest already exists...');
    const { data: checkResult, error: checkError } = await supabase
      .rpc('check_existing_guest', {
        p_client_id: client.id,
        p_event_id: eventId
      });

    if (checkError) {
      console.error('❌ Guest check error:', checkError);
      return NextResponse.json(
        { success: false, error: 'Erro interno na verificação' },
        { status: 500 }
      );
    }

    let finalGuestResult;
    const checkData = checkResult as any;

    if (checkData.exists) {
      // ✅ GUEST JÁ EXISTS - RETORNAR QR CODE EXISTENTE
      const existingGuest = checkData.guest;
      // console.log('✅ Guest already exists, returning existing QR:', existingGuest);
      finalGuestResult = {
        success: true,
        guest_id: existingGuest.id,
        client_id: client.id,
        qr_code: existingGuest.qr_code,
        message: 'QR code existente recuperado'
      };
    } else {
      // 🚨 GUEST NÃO EXISTS - CRIAR NOVO
      console.log('🔍 Guest does not exist, creating new...');
      const { data: guestResult, error: guestError } = await supabase
        .rpc('create_guest_ultra_fast', {
          client_data: {
            phone: client.phone,
            first_name: client.first_name,
            last_name: client.last_name
          },
          p_event_id: eventId,
          p_promoter_id: promoterId,
          p_team_id: teamId
        });

      if (guestError) {
        console.error('❌ Guest creation error:', guestError);
        console.error('❌ Guest error details:', JSON.stringify(guestError, null, 2));
        return NextResponse.json(
          { success: false, error: 'Erro interno no registo' },
          { status: 500 }
        );
      }

      console.log('✅ create_guest_ultra_fast OK:', guestResult);
      finalGuestResult = guestResult;
    }

    const guestResultData = finalGuestResult as any;
    
    if (!guestResultData.success) {
      return NextResponse.json(
        { success: false, error: guestResultData.error || 'Erro no registo' },
        { status: 500 }
      );
    }

    // 🚨 SISTEMA GUEST ISOLADO - Criar sessão guest temporária (NÃO Supabase Auth)
    const sessionId = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutos

    const { error: sessionError } = await supabase
      .from('guest_sessions')
      .insert({
        session_id: sessionId,
        client_user_id: client.id,
        event_id: eventId,
        is_active: true,
        expires_at: expiresAt.toISOString()
      });

    if (sessionError) {
      console.error('Session creation error:', sessionError);
      // Continuar mesmo se sessão falhar - QR code é o importante
    }

    // Resposta de sucesso
    return NextResponse.json({
      success: true,
      guest_id: guestResultData.guest_id,
      client_id: guestResultData.client_id,
      qr_code: guestResultData.qr_code,
      message: guestResultData.message || `Bem-vindo ${client.first_name}! QR Code gerado com sucesso.`
    });

  } catch (error) {
    console.error('Guest login error:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
      // console.log('✅ Guest already exists, returning existing QR:', existingGuest);

      finalGuestResult = {

        success: true,

        guest_id: existingGuest.id,

        client_id: client.id,

        qr_code: existingGuest.qr_code,

        message: 'QR code existente recuperado'

      };

    } else {

      // 🚨 GUEST NÃO EXISTS - CRIAR NOVO

      console.log('🔍 Guest does not exist, creating new...');

      const { data: guestResult, error: guestError } = await supabase

        .rpc('create_guest_ultra_fast', {

          client_data: {

            phone: client.phone,

            first_name: client.first_name,

            last_name: client.last_name

          },

          p_event_id: eventId,

          p_promoter_id: promoterId,

          p_team_id: teamId

        });



      if (guestError) {

        console.error('❌ Guest creation error:', guestError);

        console.error('❌ Guest error details:', JSON.stringify(guestError, null, 2));

        return NextResponse.json(

          { success: false, error: 'Erro interno no registo' },

          { status: 500 }

        );

      }



      console.log('✅ create_guest_ultra_fast OK:', guestResult);

      finalGuestResult = guestResult;

    }



    const guestResultData = finalGuestResult as any;

    

    if (!guestResultData.success) {

      return NextResponse.json(

        { success: false, error: guestResultData.error || 'Erro no registo' },

        { status: 500 }

      );

    }



    // 🚨 SISTEMA GUEST ISOLADO - Criar sessão guest temporária (NÃO Supabase Auth)

    const sessionId = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutos



    const { error: sessionError } = await supabase

      .from('guest_sessions')

      .insert({

        session_id: sessionId,

        client_user_id: client.id,

        event_id: eventId,

        is_active: true,

        expires_at: expiresAt.toISOString()

      });



    if (sessionError) {

      console.error('Session creation error:', sessionError);

      // Continuar mesmo se sessão falhar - QR code é o importante

    }



    // Resposta de sucesso

    return NextResponse.json({

      success: true,

      guest_id: guestResultData.guest_id,

      client_id: guestResultData.client_id,

      qr_code: guestResultData.qr_code,

      message: guestResultData.message || `Bem-vindo ${client.first_name}! QR Code gerado com sucesso.`

    });



  } catch (error) {

    console.error('Guest login error:', error);

    return NextResponse.json(

      { success: false, error: 'Erro interno do servidor' },

      { status: 500 }

    );

  }

}
