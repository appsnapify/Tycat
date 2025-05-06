import { NextResponse } from 'next/server';
import { serverLogout } from '@/app/actions/auth';

export async function POST(request: Request) {
  try {
    // Usar a server action para manipular cookies adequadamente
    const result = await serverLogout();
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Erro ao terminar sessão' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro na API de logout:', error);
    return NextResponse.json(
      { error: 'Erro ao processar logout' },
      { status: 500 }
    );
  }
} 