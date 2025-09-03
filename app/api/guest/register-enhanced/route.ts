// ✅ ENHANCED: Structured error handling + business metrics
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { Database } from '@/lib/database.types';

// ✅ ENHANCED ERROR HANDLING (mesmo sistema do login)
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
  if (error.message?.includes('duplicate') || error.message?.includes('registrado')) return ERROR_TYPES.VALIDATION;
  if (error.code?.startsWith('PG')) return ERROR_TYPES.DATABASE;
  return ERROR_TYPES.NETWORK;
}

function getUserFriendlyMessage(errorType: string): string {
  const messages = {
    [ERROR_TYPES.VALIDATION]: 'Dados inválidos. Verifica os campos.',
    [ERROR_TYPES.AUTH]: 'Erro de autenticação.',
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

// Rate limiting enhanced
const rateLimits = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000;
const MAX_REQUESTS_PER_MINUTE = 60;

export async function POST(request: Request) {
  const startTime = performance.now();
  
  try {
    // Enhanced rate limiting
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
      console.warn('🚨 RATE LIMIT EXCEEDED:', { ip, userAgent, count: ipRateLimit.count });
      
      return NextResponse.json({ 
        success: false, 
        error: getUserFriendlyMessage(ERROR_TYPES.RATE_LIMIT),
        error_type: ERROR_TYPES.RATE_LIMIT
      }, { status: 429 });
    }

    const { 
      phone, firstName, lastName, email, password, 
      eventId, promoterId, teamId, birthDate, gender, city 
    } = await request.json();

    // Basic validation
    if (!phone || !firstName || !lastName || !email || !password || !eventId) {
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

    // ✅ ENHANCED RPC CALL: register + QR generation + audit
    const { data: result, error } = await supabase
      .rpc('register_with_uuid_qr_enhanced', {
        p_phone: phone,
        p_first_name: firstName,
        p_last_name: lastName,
        p_email: email,
        p_password: password,
        p_event_id: eventId,
        p_promoter_id: promoterId,
        p_team_id: teamId,
        p_birth_date: birthDate,
        p_gender: gender,
        p_city: city,
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
        { status: 500 }
      );
    }

    const registerResult = result as any;
    
    if (!registerResult.success) {
      const errorType = registerResult.error_type || ERROR_TYPES.VALIDATION;
      const userMessage = registerResult.error || getUserFriendlyMessage(errorType);
      
      return NextResponse.json(
        { 
          success: false, 
          error: userMessage,
          error_type: errorType
        },
        { status: errorType === ERROR_TYPES.VALIDATION ? 400 : 500 }
      );
    }

    // ✅ ENHANCED LOGGING: Success metrics
    console.log('✅ REGISTER SUCCESS METRICS:', {
      timestamp: new Date().toISOString(),
      api_duration_ms: Math.round(apiDuration * 100) / 100,
      db_duration_ms: registerResult.duration_ms,
      total_duration_ms: Math.round((apiDuration + registerResult.duration_ms) * 100) / 100,
      ip, userAgent, eventId,
      client_id: registerResult.client_id,
      guest_id: registerResult.guest_id,
      has_email: !!email,
      has_birth_date: !!birthDate
    });

    return NextResponse.json({
      success: true,
      client_id: registerResult.client_id,
      guest_id: registerResult.guest_id,
      qr_code: registerResult.qr_code,
      qr_url: registerResult.qr_url,
      message: `Registo concluído! Bem-vindo ${firstName} à guest list.`,
      performance: {
        api_duration_ms: Math.round(apiDuration * 100) / 100,
        db_duration_ms: registerResult.duration_ms,
        total_duration_ms: Math.round((apiDuration + registerResult.duration_ms) * 100) / 100
      }
    });

  } catch (error) {
    const errorType = classifyError(error);
    const userMessage = getUserFriendlyMessage(errorType);
    logStructuredError(error, { 
      endpoint: 'register-enhanced', 
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
