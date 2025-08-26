import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID é obrigatório' }, { status: 400 });
    }

    const supabase = await createClient();
    
    // Buscar slug do promotor
    const { data, error } = await supabase
      .from('profile_slugs')
      .select('slug')
      .eq('profile_id', userId)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      return NextResponse.json({ slug: userId }); // Fallback para UUID
    }

    return NextResponse.json({ slug: data.slug });
    
  } catch (error) {
    console.error('Erro ao buscar slug:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
