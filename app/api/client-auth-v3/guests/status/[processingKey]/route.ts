// app/api/client-auth-v3/guests/status/[processingKey]/route.ts
// API de polling para verificar status do processamento
// ✅ Resposta rápida sobre estado do processamento background

import { NextRequest, NextResponse } from 'next/server';

// ✅ REFERÊNCIA AO MAPA DE PROCESSAMENTO
// (Idealmente seria compartilhado, mas para simplicidade, recriaremos)
// Em produção, usaria Redis ou similar para estado compartilhado

// Simulação do mapa para demonstração
// (Em implementação real, seria importado do arquivo principal)
const mockProcessingMap = new Map<string, {
  status: 'processing' | 'completed' | 'failed';
  result?: any;
  error?: string;
  timestamp: number;
}>();

export async function GET(
  request: NextRequest,
  { params }: { params: { processingKey: string } }
) {
  try {
    const { processingKey } = params;

    if (!processingKey || typeof processingKey !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'Chave de processamento inválida'
      }, { status: 400 });
    }

    // ✅ VERIFICAR STATUS NO MAPA
    const processStatus = mockProcessingMap.get(processingKey);

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
      mockProcessingMap.delete(processingKey);
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
        // ✅ SUCESSO - REMOVER DO MAPA
        mockProcessingMap.delete(processingKey);
        return NextResponse.json({
          success: true,
          processing: false,
          status: 'completed',
          data: processStatus.result,
          message: 'QR Code criado com sucesso!'
        });

      case 'failed':
        // ✅ ERRO - REMOVER DO MAPA
        mockProcessingMap.delete(processingKey);
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