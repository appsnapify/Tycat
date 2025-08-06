import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { Database } from '@/lib/database.types';
import bcrypt from 'bcryptjs';

// Circuit breaker pattern para proteger contra falhas
class CircuitBreaker {
  private failures = 0;
  private maxFailures = 5;
  private timeout = 30000; // 30 segundos
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private nextAttempt = Date.now();

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Service temporarily unavailable');
      }
      this.state = 'HALF_OPEN';
    }

    try {
      const result = await operation();
      this.reset();
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  private reset() {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  private recordFailure() {
    this.failures++;
    if (this.failures >= this.maxFailures) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.timeout;
    }
  }
}

const circuitBreaker = new CircuitBreaker();

// Queue para processamento assíncrono (simulado)
const processingQueue = new Map<string, {
  status: 'processing' | 'completed' | 'failed';
  result?: any;
  error?: string;
  timestamp: number;
}>();

function generateProcessingKey(): string {
  return 'proc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function validateGuestData(data: any) {
  const errors: string[] = [];

  if (!data.phone || typeof data.phone !== 'string') {
    errors.push('Phone number is required');
  }

  if (!data.firstName || typeof data.firstName !== 'string' || data.firstName.trim().length < 2) {
    errors.push('First name must be at least 2 characters');
  }

  if (!data.lastName || typeof data.lastName !== 'string' || data.lastName.trim().length < 2) {
    errors.push('Last name must be at least 2 characters');
  }

  if (data.email && (typeof data.email !== 'string' || !data.email.includes('@'))) {
    errors.push('Invalid email format');
  }

  if (!data.password || typeof data.password !== 'string' || data.password.length < 6) {
    errors.push('Password must be at least 6 characters');
  }

  if (!data.eventId || typeof data.eventId !== 'string') {
    errors.push('Event ID is required');
  }

  if (!data.promoterId || typeof data.promoterId !== 'string') {
    errors.push('Promoter ID is required');
  }

  return errors;
}

async function processGuestCreation(data: any, processingKey: string) {
  try {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore });

    // Hash da password
    const hashedPassword = await bcrypt.hash(data.password, 12);

    // Usar função ultra-rápida da base de dados
    const { data: result, error } = await supabase
      .rpc('create_guest_ultra_fast' as any, {
        client_data: {
          phone: data.phone,
          first_name: data.firstName.trim(),
          last_name: data.lastName.trim(),
          email: data.email?.trim() || null,
          birth_date: data.birthDate || null,
          gender: data.gender || 'M',
          password: hashedPassword
        },
        event_id: data.eventId,
        promoter_id: data.promoterId
      });

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    const resultData = result as any;

    if (!resultData.success) {
      throw new Error(resultData.error || 'Unknown database error');
    }

    // Atualizar status na queue
    processingQueue.set(processingKey, {
      status: 'completed',
      result: {
        success: true,
        guest_id: resultData.guest_id,
        client_id: resultData.client_id,
        qr_code: resultData.qr_code,
        message: 'Guest registration completed successfully'
      },
      timestamp: Date.now()
    });

    return resultData;

  } catch (error) {
    console.error('Guest creation error:', error);
    
    processingQueue.set(processingKey, {
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: Date.now()
    });

    throw error;
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();

    // Validar dados de entrada
    const validationErrors = validateGuestData(data);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationErrors },
        { status: 400 }
      );
    }

    // Verificar carga atual do sistema
    const currentLoad = processingQueue.size;
    
    // Se sistema com alta carga, usar processamento assíncrono
    if (currentLoad > 50) {
      const processingKey = generateProcessingKey();
      
      processingQueue.set(processingKey, {
        status: 'processing',
        timestamp: Date.now()
      });

      // Processar em background
      setImmediate(() => processGuestCreation(data, processingKey));

      return NextResponse.json({
        status: 'queued',
        processingKey,
        estimatedTime: Math.ceil(currentLoad / 10) * 1000, // Estimativa em ms
        message: 'High load detected. Processing in background.',
        pollUrl: `/api/guest/status/${processingKey}`
      });
    }

    // Processamento direto com circuit breaker
    const result = await circuitBreaker.execute(async () => {
      const processingKey = generateProcessingKey();
      return await processGuestCreation(data, processingKey);
    });

    return NextResponse.json({
      status: 'completed',
      data: result
    });

  } catch (error) {
    console.error('Guest creation API error:', error);

    // Graceful degradation
    if (error instanceof Error && error.message.includes('Service temporarily unavailable')) {
      return NextResponse.json(
        { 
          error: 'Service temporarily overloaded. Please try again in a few moments.',
          retryAfter: 30
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create guest registration' },
      { status: 500 }
    );
  }
}

// Cleanup da queue (executar periodicamente)
setInterval(() => {
  const now = Date.now();
  const maxAge = 10 * 60 * 1000; // 10 minutos

  for (const [key, value] of processingQueue.entries()) {
    if (now - value.timestamp > maxAge) {
      processingQueue.delete(key);
    }
  }
}, 60000); // Limpar a cada minuto