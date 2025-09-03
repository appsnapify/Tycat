// ✅ ENHANCED: Structured error handling + business metrics
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { Database } from '@/lib/database.types';

// ✅ ENHANCED ERROR HANDLING
const ERROR_TYPES = {
  VALIDATION: 'validation_error',
  AUTH: 'authentication_error',
  RATE_LIMIT: 'rate_limit_error',
  DATABASE: 'database_error',
  NETWORK: 'network_error'
} as const;

function classifyError(error: any): string {
  if (error.message?.includes('Invalid') || error.message?.includes('format')) return ERROR_TYPES.VALIDATION;
  if (error.message?.includes('Rate limit')) return ERROR_TYPES.RATE_LIMIT;
  if (error.message?.includes('Credenciais')) return ERROR_TYPES.AUTH;
  if (error.code?.startsWith('PG')) return ERROR_TYPES.DATABASE;
  return ERROR_TYPES.NETWORK;
}

function getUserFriendlyMessage(errorType: string): string {
  const messages = {
    [ERROR_TYPES.VALIDATION]: 'Dados inválidos. Verifica os campos.',
    [ERROR_TYPES.AUTH]: 'Credenciais incorretas.',
    [ERROR_TYPES.RATE_LIMIT]: 'Muitas tentativas. Aguarda 1 minuto.',
    [ERROR_TYPES.DATABASE]: 'Erro temporário. Tenta novamente.',
    [ERROR_TYPES.NETWORK]: 'Erro de conexão. Verifica internet.'
  };
  return messages[errorType] || 'Erro interno. Contacta suporte.';
}

function logStructuredError(error: any, context: any) {
  console.error('🚨 STRUCTURED ERROR LOG:', {
    timestamp: new Date().toISOString(),
    errorType: classifyError(error),
    message: error.message,
    stack: error.stack,
    context,
    severity: 'error'
  });
}

// Rate limiting enhanced para Supabase Pro
const rateLimits = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minuto
const MAX_REQUESTS_PER_MINUTE = 60; // Supabase Pro limit

export async function POST(request: Request) {
  const startTime = performance.now();
  
  try {
    // Enhanced rate limiting com IP tracking
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const now = Date.now();
    
    const ipRateLimit = rateLimits.get(ip) || { count: 0, resetTime: now + RATE_LIMIT_WINDOW };

    if (now > ipRateLimit.resetTime) {
      ipRateLimit.count = 1;
      ipRateLimit.resetTime = now + RATE_LIMIT_WINDOW;
    } else {
      ipRateLimit.count++;
    }
    rateLimits.set(ip, ipRateLimit);

    if (ipRateLimit.count > MAX_REQUESTS_PER_MINUTE) {
      // Log rate limit violation
      console.warn('🚨 RATE LIMIT EXCEEDED:', { ip, userAgent, count: ipRateLimit.count });
      
      return NextResponse.json({ 
        success: false, 
        error: getUserFriendlyMessage(ERROR_TYPES.RATE_LIMIT),
        error_type: ERROR_TYPES.RATE_LIMIT
      }, { status: 429 });
    }

    const { phone, password, eventId, promoterId, teamId } = await request.json();

    // Basic validation
    if (!phone || !password || !eventId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Dados obrigatórios em falta',
          error_type: ERROR_TYPES.VALIDATION
        },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore });

    // ✅ ENHANCED RPC CALL: login + QR generation + audit
    const { data: result, error } = await supabase
      .rpc('login_with_uuid_qr_enhanced', {
        p_phone: phone,
        p_password: password,
        p_event_id: eventId,
        p_promoter_id: promoterId,
        p_team_id: teamId,
        p_ip_address: ip,
        p_user_agent: userAgent
      });

    const endTime = performance.now();
    const apiDuration = endTime - startTime;

    if (error) {
      const errorType = classifyError(error);
      const userMessage = getUserFriendlyMessage(errorType);
      logStructuredError(error, { phone, eventId, ip, userAgent });
      
      return NextResponse.json(
        { 
          success: false, 
          error: userMessage,
          error_type: errorType
        },
        { status: errorType === ERROR_TYPES.AUTH ? 401 : 500 }
      );
    }

    const loginResult = result as any;
    
    if (!loginResult.success) {
      const errorType = loginResult.error_type || ERROR_TYPES.AUTH;
      const userMessage = getUserFriendlyMessage(errorType);
      
      return NextResponse.json(
        { 
          success: false, 
          error: userMessage,
          error_type: errorType
        },
        { status: errorType === ERROR_TYPES.AUTH ? 401 : 400 }
      );
    }

    // ✅ ENHANCED LOGGING: Success metrics
    console.log('✅ LOGIN SUCCESS METRICS:', {
      timestamp: new Date().toISOString(),
      api_duration_ms: Math.round(apiDuration * 100) / 100,
      db_duration_ms: loginResult.duration_ms,
      total_duration_ms: Math.round((apiDuration + loginResult.duration_ms) * 100) / 100,
      ip, userAgent, eventId,
      guest_id: loginResult.guest_id,
      source: loginResult.source
    });

    return NextResponse.json({
      success: true,
      guest_id: loginResult.guest_id,
      client_id: loginResult.client_id,
      qr_code: loginResult.qr_code,
      qr_url: loginResult.qr_url,
      message: loginResult.message,
      performance: {
        api_duration_ms: Math.round(apiDuration * 100) / 100,
        db_duration_ms: loginResult.duration_ms,
        total_duration_ms: Math.round((apiDuration + loginResult.duration_ms) * 100) / 100
      }
    });

  } catch (error) {
    const errorType = classifyError(error);
    const userMessage = getUserFriendlyMessage(errorType);
    logStructuredError(error, { 
      endpoint: 'login-enhanced', 
      ip: request.headers.get('x-forwarded-for') 
    });
    
    return NextResponse.json(
      { 
        success: false, 
        error: userMessage,
        error_type: errorType
      },
      { status: 500 }
    );
  }
}
