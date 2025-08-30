import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { Database } from '@/lib/database.types';

// LRU Cache para verificação de números (anti-spam)
const phoneCache = new Map<string, { exists: boolean; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos
const MAX_CACHE_SIZE = 1000;

// Rate limiting por IP
const rateLimits = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minuto
const MAX_REQUESTS_PER_MINUTE = 20;

// ✅ FUNÇÕES AUXILIARES (Complexidade: ≤3 pontos cada)
const cleanPhoneNumber = (phone: string): string => phone.replace(/[\s\-\(\)\.]/g, '');

const isValidInternationalFormat = (cleaned: string): boolean => 
  cleaned.startsWith('+') && /^\+[1-9][0-9]{1,3}[0-9]{4,14}$/.test(cleaned);

const isValidPortugueseFormat = (cleaned: string): boolean =>
  cleaned.startsWith('+351') && /^\+3519[1236][0-9]{7}$/.test(cleaned);

const isPortugueseNumber = (cleaned: string): boolean => {
  const portuguesePatterns = [
    /^(\+351|351|0)?9[1236][0-9]{7}$/, // Telemóveis: 91x, 92x, 93x, 96x
    /^(\+351|351|0)?2[1-9][0-9]{7}$/   // Fixos (opcional)
  ];
  return portuguesePatterns.some(pattern => pattern.test(cleaned));
};

const normalizePortugueseNumber = (cleaned: string): string => {
  let normalized = cleaned;
  if (normalized.startsWith('+351')) {
    normalized = normalized.substring(4);
  } else if (normalized.startsWith('351')) {
    normalized = normalized.substring(3);
  } else if (normalized.startsWith('0')) {
    normalized = normalized.substring(1);
  }
  return '+351' + normalized;
};

// ✅ FUNÇÃO PRINCIPAL SIMPLIFICADA (Complexidade: 5 pontos)
function validateInternationalPhone(phone: string): string {
  const cleaned = cleanPhoneNumber(phone);
  
  // Verificar formato internacional válido
  if (isValidInternationalFormat(cleaned)) {
    return cleaned;
  }
  
  // Verificar se já está normalizado como português
  if (isValidPortugueseFormat(cleaned)) {
    return cleaned;
  }
  
  // Verificar e normalizar número português
  if (isPortugueseNumber(cleaned)) {
    return normalizePortugueseNumber(cleaned);
  }
  
  console.log('❌ Invalid phone format');
  throw new Error("Número de telemóvel inválido");
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const limit = rateLimits.get(ip);
  
  if (!limit || now > limit.resetTime) {
    rateLimits.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }
  
  if (limit.count >= MAX_REQUESTS_PER_MINUTE) {
    return false;
  }
  
  limit.count++;
  return true;
}

function cleanCache() {
  const now = Date.now();
  for (const [key, value] of phoneCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      phoneCache.delete(key);
    }
  }
  
  // Limitar tamanho do cache
  if (phoneCache.size > MAX_CACHE_SIZE) {
    const entries = Array.from(phoneCache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    const toDelete = entries.slice(0, phoneCache.size - MAX_CACHE_SIZE);
    toDelete.forEach(([key]) => phoneCache.delete(key));
  }
}

export async function POST(request: Request) {
  try {
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Try again in 1 minute.' },
        { status: 429 }
      );
    }

    const { phone } = await request.json();

    if (!phone) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    // Validar e normalizar número
    let normalizedPhone: string;
    try {
      normalizedPhone = validateInternationalPhone(phone);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid phone number format' },
        { status: 400 }
      );
    }

    // Verificar cache primeiro
    cleanCache();
    const cached = phoneCache.get(normalizedPhone);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json({
        phone: normalizedPhone,
        exists: cached.exists,
        source: 'cache'
      });
    }

    // Consultar base de dados
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore });

    // 🛡️ USAR FUNÇÃO SEGURA (resolve erro 406)
    const { data: phoneCheckResult, error } = await supabase
      .rpc('check_phone_exists', { p_phone: normalizedPhone });

    if (error) {
      console.error('Phone check error:', error);
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      );
    }

    const result = phoneCheckResult as any;
    const exists = result?.exists || false;
    const clientData = exists ? result : null;

    // Verificação completa

    // Atualizar cache
    phoneCache.set(normalizedPhone, { exists, timestamp: Date.now() });

    const response = {
      phone: normalizedPhone,
      exists,
      user: exists ? {
        id: clientData.id,
        firstName: clientData.first_name,
        lastName: clientData.last_name,
        email: clientData.email
      } : null,
      source: 'database'
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Phone verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}