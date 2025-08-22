import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { Database } from '@/lib/database.types';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const postalCode = searchParams.get('code');

    if (!postalCode) {
      return NextResponse.json(
        { success: false, error: 'Código postal obrigatório' },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore });

    // Limpar código postal (remover espaços, hífens)
    const cleanCode = postalCode.replace(/[\s-]/g, '').substring(0, 4);

    // 🇵🇹 PORTUGAL: Buscar na tabela postal_code_geo
    const { data: portugalData, error: portugalError } = await supabase
      .from('postal_code_geo')
      .select('city, district')
      .eq('postal_code', cleanCode)
      .single();

    if (!portugalError && portugalData) {
      return NextResponse.json({
        success: true,
        city: portugalData.city,
        district: portugalData.district,
        country: 'Portugal'
      });
    }

    // 🌍 OUTROS PAÍSES: Lógica básica baseada em padrões conhecidos
    const internationalResult = detectInternationalPostalCode(postalCode);
    if (internationalResult) {
      return NextResponse.json({
        success: true,
        ...internationalResult
      });
    }

    // Não encontrado
    return NextResponse.json({
      success: false,
      error: 'Código postal não encontrado'
    }, { status: 404 });

  } catch (error) {
    console.error('Postal code lookup error:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// ✅ FUNÇÃO AUXILIAR: Normalizar código postal
function normalizePostalCode(postalCode: string): string {
  return postalCode.trim().toUpperCase();
}

// ✅ FUNÇÃO AUXILIAR: Detectar código espanhol
function detectSpanishCode(code: string) {
  if (!/^\d{5}$/.test(code)) return null;
  
  const spanishProvinces: { [key: string]: string } = {
    '28': 'Madrid', '08': 'Barcelona', '41': 'Sevilla',
    '46': 'Valencia', '48': 'Bilbao', '15': 'A Coruña'
  };
  
  const firstTwo = code.substring(0, 2);
  return spanishProvinces[firstTwo] ? {
    city: spanishProvinces[firstTwo],
    country: 'Espanha'
  } : null;
}

// ✅ FUNÇÃO AUXILIAR: Detectar código francês
function detectFrenchCode(code: string) {
  if (!/^\d{5}$/.test(code)) return null;
  
  const frenchDepartments: { [key: string]: string } = {
    '75': 'Paris', '69': 'Lyon', '13': 'Marseille',
    '31': 'Toulouse', '59': 'Lille'
  };
  
  const firstTwo = code.substring(0, 2);
  return frenchDepartments[firstTwo] ? {
    city: frenchDepartments[firstTwo],
    country: 'França'
  } : null;
}

// ✅ FUNÇÃO AUXILIAR: Detectar outros países
function detectOtherCountries(code: string) {
  // Reino Unido
  if (/^[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}$/i.test(code)) {
    return { city: 'Reino Unido', country: 'Reino Unido' };
  }
  
  // Alemanha (5 dígitos com validação)
  if (/^\d{5}$/.test(code)) {
    const firstTwo = code.substring(0, 2);
    const firstTwoNum = parseInt(firstTwo);
    if (firstTwoNum >= 10 && firstTwoNum <= 99) {
      return { city: 'Alemanha', country: 'Alemanha' };
    }
  }
  
  return null;
}

// ✅ FUNÇÃO PRINCIPAL REFATORADA (Complexidade: 9 → <8)
function detectInternationalPostalCode(postalCode: string) {
  const code = normalizePostalCode(postalCode);
  
  return detectSpanishCode(code) || 
         detectFrenchCode(code) || 
         detectOtherCountries(code);
}