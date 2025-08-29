import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ✅ FUNÇÃO: Validar dados do perfil (Complexidade: 4)
function validateProfileData(data: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.clientId) { // +1
    errors.push('ID do cliente é obrigatório');
  }

  if (!data.first_name || data.first_name.trim().length < 2) { // +1
    errors.push('Primeiro nome deve ter pelo menos 2 caracteres');
  }

  if (!data.last_name || data.last_name.trim().length < 2) { // +1
    errors.push('Último nome deve ter pelo menos 2 caracteres');
  }

  if (!data.phone || data.phone.trim().length < 9) { // +1
    errors.push('Telefone deve ter pelo menos 9 dígitos');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// ✅ FUNÇÃO AUXILIAR: Verificar cliente existente (Complexidade: 3)
async function checkExistingClient(clientId: string) {
  const { data: existingClient, error: clientError } = await supabase
    .from('client_users')
    .select('id, first_name, last_name, phone, email, birth_date, gender, city, postal_code')
    .eq('id', clientId)
    .eq('is_active', true)
    .maybeSingle();

  if (clientError) { // +1
    console.error('[UPDATE-PROFILE] Client check error:', clientError);
    return { success: false, message: 'Erro interno do servidor', code: 'DATABASE_ERROR' };
  }

  if (!existingClient) { // +1
    return { success: false, message: 'Cliente não encontrado', code: 'CLIENT_NOT_FOUND' };
  }

  return { success: true, data: existingClient };
}

// ✅ FUNÇÃO AUXILIAR: Verificar telefone duplicado (Complexidade: 3)
async function checkPhoneDuplicate(phone: string, clientId: string, existingPhone: string) {
  if (phone === existingPhone) return { success: true }; // +1

  const { data: phoneCheck, error: phoneError } = await supabase
    .from('client_users')
    .select('id')
    .eq('phone', phone)
    .eq('is_active', true)
    .neq('id', clientId)
    .maybeSingle();

  if (phoneError && phoneError.code !== 'PGRST116') { // +1
    console.error('[UPDATE-PROFILE] Phone check error:', phoneError);
    return { success: false, message: 'Erro interno do servidor', code: 'DATABASE_ERROR' };
  }

  if (phoneCheck) { // +1
    return { success: false, message: 'Este número de telefone já está registado', code: 'PHONE_EXISTS' };
  }

  return { success: true };
}

// ✅ FUNÇÃO AUXILIAR: Atualizar dados do cliente (Complexidade: 2)
async function updateClientData(clientId: string, updateData: any) {
  const { data: updatedClient, error: updateError } = await supabase
    .from('client_users')
    .update({
      ...updateData,
      updated_at: new Date().toISOString()
    })
    .eq('id', clientId)
    .select('id, first_name, last_name, phone, email, birth_date, gender, city, postal_code, created_at, updated_at')
    .single();

  if (updateError) { // +1
    console.error('[UPDATE-PROFILE] Update error:', updateError);
    return { success: false, message: 'Erro ao atualizar perfil', code: 'UPDATE_ERROR' };
  }

  return { success: true, data: updatedClient };
}

// ✅ FUNÇÃO PRINCIPAL: PUT update client profile (Complexidade: 5)
export async function PUT(request: NextRequest) {
  try { // +1 (try/catch)
    const body = await request.json();
    console.log('[UPDATE-PROFILE] Request data:', { ...body, clientId: body.clientId?.substring(0, 8) + '...' });

    // Validar dados
    const validation = validateProfileData(body);
    if (!validation.isValid) { // +1
      return NextResponse.json(
        { success: false, message: validation.errors.join(', '), code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const { clientId, first_name, last_name, phone, email, birth_date, gender, city, postal_code } = body;

    // Verificar cliente existente
    const clientCheck = await checkExistingClient(clientId);
    if (!clientCheck.success) { // +1
      return NextResponse.json(clientCheck, { status: clientCheck.code === 'CLIENT_NOT_FOUND' ? 404 : 500 });
    }

    // Verificar telefone duplicado
    const phoneCheck = await checkPhoneDuplicate(phone, clientId, clientCheck.data.phone);
    if (!phoneCheck.success) { // +1
      return NextResponse.json(phoneCheck, { status: phoneCheck.code === 'PHONE_EXISTS' ? 400 : 500 });
    }

    // Atualizar dados
    const updateData = {
      first_name: first_name.trim(),
      last_name: last_name.trim(),
      phone: phone.trim(),
      email: email?.trim() || null,
      birth_date: birth_date || null,
      gender: gender || null,
      city: city?.trim() || null,
      postal_code: postal_code?.trim() || null
    };

    const updateResult = await updateClientData(clientId, updateData);
    if (!updateResult.success) { // +1
      return NextResponse.json(updateResult, { status: 500 });
    }

    console.log('[UPDATE-PROFILE] Profile updated successfully:', updateResult.data.id);

    return NextResponse.json({
      success: true,
      message: 'Perfil atualizado com sucesso',
      data: updateResult.data
    });

  } catch (error) { // +1 (catch)
    console.error('[UPDATE-PROFILE] Unexpected error:', error);
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
