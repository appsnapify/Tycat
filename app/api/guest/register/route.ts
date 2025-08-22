import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { Database } from '@/lib/database.types';

// ✅ FUNÇÃO AUXILIAR: Log de dados recebidos (Complexidade: 1)
function logReceivedData(data: any): void {
    console.log('=== GUEST REGISTER DEBUG ===');
  console.log('phone:', data.phone);
  console.log('firstName:', data.firstName);
  console.log('lastName:', data.lastName);
  console.log('email:', data.email);
  console.log('password length:', data.password?.length);
  console.log('eventId:', data.eventId);
  console.log('promoterId:', data.promoterId);
  console.log('teamId:', data.teamId);
    console.log('===========================');
}

// ✅ FUNÇÃO AUXILIAR: Validar campos obrigatórios (Complexidade: 2)
function validateRequiredFields(data: any): NextResponse | null {
  const required = ['phone', 'firstName', 'lastName', 'email', 'password', 'eventId'];
  const missing = required.filter(field => !data[field]);
  
  if (missing.length > 0) {
      console.error('❌ Campos em falta:', missing);
      return NextResponse.json(
        { success: false, error: `Dados obrigatórios em falta: ${missing.join(', ')}` },
        { status: 400 }
      );
    }

  return null;
}

// ✅ FUNÇÃO AUXILIAR: Validar formato de email (Complexidade: 2)
function validateEmailFormat(email: string): NextResponse | null {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
    if (!emailRegex.test(email)) {
      console.error('❌ Email inválido:', email);
      return NextResponse.json(
        { success: false, error: 'Email inválido' },
        { status: 400 }
      );
    }

  return null;
}

// ✅ FUNÇÃO AUXILIAR: Validar complexidade da password (Complexidade: 4)
function validatePasswordComplexity(password: string): NextResponse | null {
    if (password.length < 8) {
      console.error('❌ Password muito curta:', password.length);
      return NextResponse.json(
        { success: false, error: 'Password deve ter pelo menos 8 caracteres' },
        { status: 400 }
      );
    }

    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    
    if (!hasLower || !hasUpper || !hasNumber) {
      const missing = [];
      if (!hasLower) missing.push('minúscula');
      if (!hasUpper) missing.push('MAIÚSCULA');
      if (!hasNumber) missing.push('número');
      
      console.error('❌ Password falta:', missing, 'password:', password);
      return NextResponse.json(
        { success: false, error: `Password deve ter: ${missing.join(', ')}` },
        { status: 400 }
      );
    }
    
  return null;
}

export async function POST(request: Request) {
  try {
    const requestData = await request.json();
    const { 
      phone, firstName, lastName, email, birthDate, gender, 
      postalCode, city, password, eventId, promoterId, teamId
    } = requestData;

    // 1. Log dos dados recebidos
    logReceivedData(requestData);

    // 2. Validação de campos obrigatórios (Early Return)
    const requiredFieldsError = validateRequiredFields(requestData);
    if (requiredFieldsError) return requiredFieldsError;

    // 3. Validação de formato de email (Early Return)
    const emailError = validateEmailFormat(email);
    if (emailError) return emailError;

    // 4. Validação de complexidade da password (Early Return)
    const passwordError = validatePasswordComplexity(password);
    if (passwordError) return passwordError;
    
    console.log('✅ All validations passed');

    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore });

    // 🚨 SISTEMA GUEST ISOLADO - Usar função register_client_secure (NOVA ESTRUTURA SEGURA)
    console.log('🔍 Calling register_client_secure...');
    const { data: registerResult, error: registerError } = await supabase
      .rpc('register_client_secure', {
        p_phone: phone,
        p_first_name: firstName,
        p_last_name: lastName,
        p_password: password,
        p_email: email || null,
        p_birth_date: birthDate || null,
        p_gender: gender || 'M',
        p_postal_code: postalCode || null,
        p_city: city || null
      });

    if (registerError) {
      console.error('❌ Client registration error:', registerError);
      console.error('❌ Error details:', JSON.stringify(registerError, null, 2));
      return NextResponse.json(
        { success: false, error: 'Erro interno no registo' },
        { status: 500 }
      );
    }

    console.log('✅ register_client_secure OK:', registerResult);

    const clientResult = registerResult as any;
    
    if (!clientResult.success) {
      return NextResponse.json(
        { success: false, error: clientResult.error || 'Erro no registo' },
        { status: 400 }
      );
    }

    // Agora criar o guest usando create_guest_ultra_fast
    console.log('🔍 Calling create_guest_ultra_fast...');
    const { data: guestResult, error: guestError } = await supabase
      .rpc('create_guest_ultra_fast', {
        client_data: {
          phone: clientResult.phone,
          first_name: firstName,
          last_name: lastName,
          password: password // A função create_guest_ultra_fast já faz o hash internamente
        },
        p_event_id: eventId,
        p_promoter_id: promoterId,
        p_team_id: teamId
      });

    if (guestError) {
      console.error('❌ Guest creation error:', guestError);
      console.error('❌ Guest error details:', JSON.stringify(guestError, null, 2));
      
      // Verificar se é erro de duplicação
      if (guestError.message?.includes('duplicate') || guestError.message?.includes('unique')) {
        return NextResponse.json(
          { success: false, error: 'Este número já está registado neste evento' },
          { status: 409 }
        );
      }
      
      return NextResponse.json(
        { success: false, error: 'Erro interno no registo' },
        { status: 500 }
      );
    }

    console.log('✅ create_guest_ultra_fast OK:', guestResult);

    const result = guestResult as any;
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Erro no registo' },
        { status: 500 }
      );
    }

    // 🚨 SISTEMA GUEST ISOLADO - Criar sessão guest temporária (NÃO Supabase Auth)
    const sessionId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutos

    const { error: sessionError } = await supabase
      .from('guest_sessions')
      .insert({
        session_id: sessionId,
        client_user_id: result.client_id,
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
      guest_id: result.guest_id,
      client_id: result.client_id,
      qr_code: result.qr_code,
      message: `Registo concluído! Bem-vindo ${firstName} à guest list.`
    });

  } catch (error) {
    console.error('Guest register error:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}