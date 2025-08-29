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

// ✅ FUNÇÃO: Validar entrada (Complexidade: 3)
function validateInput(phone: string, password: string): NextResponse | null {
  if (!phone?.trim()) { // +1
    return NextResponse.json(
      { success: false, error: 'Número de telemóvel é obrigatório', code: 'MISSING_PHONE' },
      { status: 400 }
    );
  }
  
  if (!password?.trim()) { // +1
    return NextResponse.json(
      { success: false, error: 'Password é obrigatória', code: 'MISSING_PASSWORD' },
      { status: 400 }
    );
  }
  
  if (phone.length < 9) { // +1
    return NextResponse.json(
      { success: false, error: 'Número de telemóvel inválido', code: 'INVALID_PHONE' },
      { status: 400 }
    );
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

// ✅ FUNÇÃO PRINCIPAL: POST login (Complexidade: 4)
export async function POST(request: NextRequest) {
  try {
    const { phone, password } = await request.json();
    
    // Validar entrada
    const validationError = validateInput(phone, password);
    if (validationError) return validationError; // +1
    
    // Buscar cliente por telefone
    const { data: client, error: clientError } = await supabase
      .from('client_users')
      .select('*')
      .eq('phone', phone)
      .eq('is_active', true)
      .maybeSingle();
    
    if (clientError) { // +1
      console.error('Database error:', clientError);
      return NextResponse.json(
        { success: false, error: 'Erro interno do servidor', code: 'DATABASE_ERROR' },
        { status: 500 }
      );
    }
    
    if (!client) { // +1
      return NextResponse.json(
        { success: false, error: 'Credenciais inválidas', code: 'INVALID_CREDENTIALS' },
        { status: 401 }
      );
    }
    
    // Verificar password
    const isPasswordValid = await bcrypt.compare(password, client.password_hash);
    if (!isPasswordValid) { // +1
      return NextResponse.json(
        { success: false, error: 'Credenciais inválidas', code: 'INVALID_CREDENTIALS' },
        { status: 401 }
      );
    }
    
    // Gerar tokens
    const { accessToken, refreshToken, expiresAt } = generateTokens(client);
    
    // Remover password_hash antes de retornar
    const { password_hash, ...userWithoutPassword } = client;
    
    return NextResponse.json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        user: userWithoutPassword,
        expiresAt
      }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
