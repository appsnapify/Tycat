// app/api/client-auth-v3/guests/status/[processingKey]/route.ts
// API de polling para verificar status do processamento
// ✅ Resposta rápida sobre estado do processamento background

import { NextRequest, NextResponse } from 'next/server';
import { processingManager } from '@/lib/processing/processing-manager';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ processingKey: string }> }
) {
  try {
    const { processingKey } = await params;

    if (!processingKey || typeof processingKey !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'Chave de processamento inválida'
      }, { status: 400 });
    }

    // ✅ VERIFICAR STATUS NO MAPA REAL
    const processStatus = processingManager.get(processingKey);

    if (!processStatus) {
      return NextResponse.json({
        success: false,
        error: 'Processamento não encontrado ou expirou',
        expired: true
      }, { status: 404 });
    }

    // ✅ VERIFICAR SE EXPIROU (5 minutos)
    const now = Date.now();
    if (now - processStatus.timestamp > 5 * 60 * 1000) {
      processingManager.delete(processingKey);
      return NextResponse.json({
        success: false,
        error: 'Processamento expirou',
        expired: true
      }, { status: 408 });
    }

    // ✅ RETORNAR STATUS ATUAL
    switch (processStatus.status) {
      case 'processing':
        return NextResponse.json({
          success: true,
          processing: true,
          status: 'processing',
          message: 'Ainda processando... Aguarde mais alguns segundos.',
          elapsedTime: now - processStatus.timestamp
        });

      case 'completed':
        // ✅ SUCESSO - MANTER NO MAPA (será removido pelo cleanup automático)
        return NextResponse.json({
          success: true,
          processing: false,
          status: 'completed',
          data: processStatus.result,
          message: 'QR Code criado com sucesso!'
        });

      case 'failed':
        // ✅ ERRO - MANTER NO MAPA (será removido pelo cleanup automático)
        return NextResponse.json({
          success: false,
          processing: false,
          status: 'failed',
          error: processStatus.error || 'Erro desconhecido no processamento'
        }, { status: 500 });

      default:
        return NextResponse.json({
          success: false,
          error: 'Status inválido'
        }, { status: 500 });
    }

  } catch (error) {
    console.error('[GUEST-STATUS-V3] Erro:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Erro interno no servidor'
    }, { status: 500 });
  }
}

// ✅ MÉTODO PARA HEALTH CHECK
export async function HEAD(request: NextRequest) {
  return new NextResponse(null, { status: 200 });
} 