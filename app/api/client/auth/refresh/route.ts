import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-change-in-production';

// ✅ FUNÇÃO: Gerar novos tokens JWT (Complexidade: 1)
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

// ✅ FUNÇÃO PRINCIPAL: POST refresh (Complexidade: 5)
export async function POST(request: NextRequest) {
  try {
    const { refreshToken } = await request.json();
    
    if (!refreshToken) { // +1
      return NextResponse.json(
        { success: false, error: 'Refresh token é obrigatório', code: 'MISSING_REFRESH_TOKEN' },
        { status: 400 }
      );
    }
    
    // Verificar e decodificar refresh token
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as any;
    } catch (error) { // +1
      return NextResponse.json(
        { success: false, error: 'Refresh token inválido', code: 'INVALID_REFRESH_TOKEN' },
        { status: 401 }
      );
    }
    
    // Buscar cliente
    const { data: client, error: clientError } = await supabase
      .from('client_users')
      .select('*')
      .eq('id', decoded.userId)
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
        { success: false, error: 'Cliente não encontrado', code: 'USER_NOT_FOUND' },
        { status: 404 }
      );
    }
    
    // Gerar novos tokens
    const tokens = generateTokens(client);
    
    // Remover password_hash antes de retornar
    const { password_hash, ...userWithoutPassword } = client;
    
    return NextResponse.json({
      success: true,
      data: {
        ...tokens,
        user: userWithoutPassword
      }
    });
    
  } catch (error) { // +1
    console.error('Refresh token error:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

