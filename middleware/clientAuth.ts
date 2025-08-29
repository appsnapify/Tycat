import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { ClientJWTPayload, ClientRateLimitResult } from '@/types/client';

// ✅ COMPLEXIDADE: 7 pontos (1 base + 2 if + 1 try + 1 && + 1 || + 1 instanceof)
export async function clientAuthMiddleware(
  request: NextRequest,
  handler: (req: NextRequest, user: ClientJWTPayload) => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    // 1. Extrair token do header ou cookie
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? 
      authHeader.substring(7) : 
      request.cookies.get('client_session')?.value;

    if (!token) {
      return createAuthErrorResponse('Token de autenticação obrigatório', 'AUTH_REQUIRED', 401);
    }

    // 2. Verificar e decodificar token
    const payload = jwt.verify(token, process.env.CLIENT_JWT_SECRET!) as ClientJWTPayload;

    // 3. Validar tipo de token
    if (payload.type !== 'client') {
      return createAuthErrorResponse('Tipo de token inválido', 'INVALID_TOKEN_TYPE', 403);
    }

    // 4. Executar handler com user autenticado
    return await handler(request, payload);

  } catch (error) {
    console.error('Client auth middleware error:', error);

    if (error instanceof jwt.TokenExpiredError) {
      return createAuthErrorResponse('Token expirado', 'TOKEN_EXPIRED', 401);
    }

    if (error instanceof jwt.JsonWebTokenError) {
      return createAuthErrorResponse('Token inválido', 'INVALID_TOKEN', 401);
    }

    return createAuthErrorResponse('Erro de autenticação', 'AUTH_ERROR', 500);
  }
}

// ✅ COMPLEXIDADE: 1 ponto (apenas construção de objeto)
function createAuthErrorResponse(
  message: string, 
  code: string, 
  status: number
): NextResponse {
  return NextResponse.json(
    { 
      success: false,
      error: message, 
      code 
    },
    { status }
  );
}

// Rate limiting para APIs do cliente
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// ✅ COMPLEXIDADE: 6 pontos (1 base + 2 if + 1 || + 1 && + 1 >=)
export function checkClientRateLimit(
  identifier: string,
  maxRequests: number,
  windowMs: number
): ClientRateLimitResult {
  const now = Date.now();
  const key = `client:${identifier}`;
  const entry = rateLimitStore.get(key);

  // Se não existe entrada ou janela expirou
  if (!entry || now >= entry.resetTime) {
    const newEntry = {
      count: 1,
      resetTime: now + windowMs
    };
    rateLimitStore.set(key, newEntry);

    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetTime: newEntry.resetTime
    };
  }

  // Se limite excedido
  if (entry.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime
    };
  }

  // Incrementar contador
  entry.count++;
  rateLimitStore.set(key, entry);

  return {
    allowed: true,
    remaining: maxRequests - entry.count,
    resetTime: entry.resetTime
  };
}

// Limpar entradas expiradas periodicamente (executar em background)
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now >= entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 60 * 1000); // Limpar a cada minuto

