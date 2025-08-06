import { NextResponse } from 'next/server';

// Referência para a queue de processamento (compartilhada com /api/guest/create)
// Em produção, isto seria num Redis ou base de dados
declare global {
  var guestProcessingQueue: Map<string, {
    status: 'processing' | 'completed' | 'failed';
    result?: any;
    error?: string;
    timestamp: number;
  }>;
}

// Inicializar se não existir
if (!global.guestProcessingQueue) {
  global.guestProcessingQueue = new Map();
}

const processingQueue = global.guestProcessingQueue;

interface StatusParams {
  key: string;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<StatusParams> }
) {
  try {
    const resolvedParams = await params;
    const { key } = resolvedParams;

    if (!key || !key.startsWith('proc_')) {
      return NextResponse.json(
        { error: 'Invalid processing key' },
        { status: 400 }
      );
    }

    const jobStatus = processingQueue.get(key);

    if (!jobStatus) {
      return NextResponse.json(
        { error: 'Processing key not found or expired' },
        { status: 404 }
      );
    }

    // Verificar se expirou (mais de 10 minutos)
    const maxAge = 10 * 60 * 1000; // 10 minutos
    if (Date.now() - jobStatus.timestamp > maxAge) {
      processingQueue.delete(key);
      return NextResponse.json(
        { error: 'Processing key expired' },
        { status: 410 }
      );
    }

    const response = {
      status: jobStatus.status,
      processingKey: key,
      timestamp: jobStatus.timestamp,
      age: Date.now() - jobStatus.timestamp
    };

    if (jobStatus.status === 'completed' && jobStatus.result) {
      return NextResponse.json({
        ...response,
        data: jobStatus.result
      });
    }

    if (jobStatus.status === 'failed' && jobStatus.error) {
      return NextResponse.json({
        ...response,
        error: jobStatus.error
      }, { status: 500 });
    }

    if (jobStatus.status === 'processing') {
      // Estimar tempo restante baseado na idade
      const estimatedTimeRemaining = Math.max(0, 5000 - response.age);
      
      return NextResponse.json({
        ...response,
        estimatedTimeRemaining,
        message: 'Still processing...'
      });
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Endpoint para cancelar processamento (opcional)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<StatusParams> }
) {
  try {
    const resolvedParams = await params;
    const { key } = resolvedParams;

    if (!key || !key.startsWith('proc_')) {
      return NextResponse.json(
        { error: 'Invalid processing key' },
        { status: 400 }
      );
    }

    const jobStatus = processingQueue.get(key);

    if (!jobStatus) {
      return NextResponse.json(
        { error: 'Processing key not found' },
        { status: 404 }
      );
    }

    if (jobStatus.status === 'processing') {
      // Marcar como cancelado
      processingQueue.set(key, {
        ...jobStatus,
        status: 'failed',
        error: 'Cancelled by user',
        timestamp: Date.now()
      });

      return NextResponse.json({
        message: 'Processing cancelled successfully'
      });
    }

    return NextResponse.json({
      message: 'Cannot cancel - processing already completed or failed',
      status: jobStatus.status
    });

  } catch (error) {
    console.error('Cancel processing error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}