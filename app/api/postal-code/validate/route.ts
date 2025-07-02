import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/adminClient';

export async function POST(request: NextRequest) {
  try {
    const { postal_code } = await request.json();

    if (!postal_code) {
      return NextResponse.json({
        success: false,
        error: 'Código postal é obrigatório'
      }, { status: 400 });
    }

    // ✅ USAR FUNÇÃO SQL DE VALIDAÇÃO
    const supabase = createAdminClient();
    
    const { data, error } = await supabase
      .rpc('validate_portuguese_postal_code', {
        p_postal_code: postal_code
      });

    if (error) {
      console.error('Erro na validação do código postal:', error);
      return NextResponse.json({
        success: false,
        error: 'Erro interno na validação'
      }, { status: 500 });
    }

    const validationResult = data;

    return NextResponse.json({
      success: true,
      data: validationResult
    });

  } catch (error) {
    console.error('Erro na API de validação de código postal:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
}

// ✅ ENDPOINT GET PARA BUSCAR CIDADE POR CÓDIGO POSTAL
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const postal_code = searchParams.get('code');

    if (!postal_code) {
      return NextResponse.json({
        success: false,
        error: 'Parâmetro code é obrigatório'
      }, { status: 400 });
    }

    const supabase = createAdminClient();
    
    const { data, error } = await supabase
      .rpc('get_city_from_postal_code', {
        p_postal_code: postal_code
      });

    if (error) {
      console.error('Erro ao buscar cidade:', error);
      return NextResponse.json({
        success: false,
        error: 'Erro interno na busca'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      city: data || 'Outras'
    });

  } catch (error) {
    console.error('Erro na API de busca de cidade:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
} 