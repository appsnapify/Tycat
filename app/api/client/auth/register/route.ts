import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-change-in-production';

// ✅ FUNÇÃO AUXILIAR: Criar resposta de erro (Complexidade: 1)
function createValidationError(message: string, code: string): NextResponse {
  return NextResponse.json(
    { success: false, error: message, code },
    { status: 400 }
  );
}

// ✅ FUNÇÃO: Validar campos obrigatórios (Complexidade: 5)
function validateRequiredFields(data: any): NextResponse | null {
  const validations = [
    { field: data.phone?.trim(), message: 'Número de telemóvel é obrigatório', code: 'MISSING_PHONE' },
    { field: data.first_name?.trim(), message: 'Nome é obrigatório', code: 'MISSING_FIRST_NAME' },
    { field: data.last_name?.trim(), message: 'Apelido é obrigatório', code: 'MISSING_LAST_NAME' },
    { field: data.city?.trim(), message: 'Cidade é obrigatória', code: 'MISSING_CITY' },
    { field: data.password?.trim(), message: 'Password é obrigatória', code: 'MISSING_PASSWORD' }
  ];

  for (const validation of validations) { // +1
    if (!validation.field) { // +1
      return createValidationError(validation.message, validation.code);
    }
  }

  if (data.password.length < 8) { // +1
    return createValidationError('Password deve ter pelo menos 8 caracteres', 'WEAK_PASSWORD');
  }

  return null;
}

// ✅ FUNÇÃO: Gerar tokens JWT (Complexidade: 1)
function generateTokens(user: any) {
  const accessToken = jwt.sign(
    { userId: user.id, phone: user.phone },
    JWT_SECRET,
    { expiresIn: '15m' }
  );
  
  const refreshToken = jwt.sign(
    { userId: user.id, phone: user.phone },
    JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
  
  const expiresAt = Math.floor(Date.now() / 1000) + (15 * 60); // 15 minutes
  
  return { accessToken, refreshToken, expiresAt };
}

// ✅ FUNÇÃO PRINCIPAL: POST register (Complexidade: 4)
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Validar entrada
    const validationError = validateRequiredFields(data);
    if (validationError) return validationError; // +1
    
    // Verificar se telefone já existe
    const { data: existingClient, error: checkError } = await supabase
      .from('client_users')
      .select('id')
      .eq('phone', data.phone)
      .maybeSingle();
    
    if (checkError) { // +1
      console.error('Database check error:', checkError);
      return NextResponse.json(
        { success: false, error: 'Erro interno do servidor', code: 'DATABASE_ERROR' },
        { status: 500 }
      );
    }
    
    if (existingClient) { // +1
      return NextResponse.json(
        { success: false, error: 'Este número já está registado', code: 'PHONE_EXISTS' },
        { status: 409 }
      );
    }
    
    // Hash da password
    const passwordHash = await bcrypt.hash(data.password, 12);
    
    // Criar cliente
    const { data: newClient, error: createError } = await supabase
      .from('client_users')
      .insert([{
        phone: data.phone,
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email || null,
        birth_date: data.birth_date || null,
        gender: data.gender || null,
        city: data.city,
        password_hash: passwordHash,
        registration_source: 'client_app',
        is_active: true,
        is_verified: false,
      }])
      .select('*')
      .single();
    
    if (createError) { // +1
      console.error('Client creation error:', createError);
      return NextResponse.json(
        { success: false, error: 'Erro ao criar conta', code: 'CREATION_ERROR' },
        { status: 500 }
      );
    }
    
    // Gerar tokens
    const { accessToken, refreshToken, expiresAt } = generateTokens(newClient);
    
    // Remover password_hash antes de retornar
    const { password_hash, ...userWithoutPassword } = newClient;
    
    return NextResponse.json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        user: userWithoutPassword,
        expiresAt
      }
    }, { status: 201 });
    
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

