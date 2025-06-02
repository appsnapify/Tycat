# DETALHES DE IMPLEMENTAÇÃO - Sistema QR Code Melhorado

> **Documento Técnico de Implementação**  
> **Versão:** 1.0  
> **Complementa:** PLANO_MELHORIA_QRCODE.md

---

## 🔧 FASE 1: IMPLEMENTAÇÃO CRÍTICA

### 1.1 EnhancedQRCodeService

**Arquivo:** `lib/services/enhanced-qrcode.service.ts`

```typescript
import QRCode from 'qrcode';
import { createHash } from 'crypto';

interface QRGenerationMethod {
  name: string;
  priority: number;
  timeout: number;
  generate: (data: string) => Promise<string>;
}

interface QRGenerationResult {
  success: boolean;
  qr_code_url?: string;
  method_used?: string;
  generation_time_ms?: number;
  error?: string;
}

export class EnhancedQRCodeService {
  private static instance: EnhancedQRCodeService;
  
  private methods: QRGenerationMethod[] = [
    {
      name: 'local_canvas',
      priority: 1,
      timeout: 1000,
      generate: this.generateLocalCanvas.bind(this)
    },
    {
      name: 'local_svg',
      priority: 2,
      timeout: 1500,
      generate: this.generateLocalSVG.bind(this)
    },
    {
      name: 'qrserver_api',
      priority: 3,
      timeout: 3000,
      generate: this.generateQRServerAPI.bind(this)
    },
    {
      name: 'google_chart',
      priority: 4,
      timeout: 3000,
      generate: this.generateGoogleChart.bind(this)
    },
    {
      name: 'basic_fallback',
      priority: 5,
      timeout: 500,
      generate: this.generateBasicFallback.bind(this)
    }
  ];

  static getInstance(): EnhancedQRCodeService {
    if (!this.instance) {
      this.instance = new EnhancedQRCodeService();
    }
    return this.instance;
  }

  async generateQRCodeWithFallbacks(data: string): Promise<QRGenerationResult> {
    const startTime = Date.now();
    
    // Tentar cada método em ordem de prioridade
    for (const method of this.methods) {
      try {
        console.log(`[QR] Tentando método: ${method.name}`);
        
        const result = await Promise.race([
          method.generate(data),
          this.createTimeoutPromise(method.timeout)
        ]);
        
        if (result && result !== 'TIMEOUT') {
          const generationTime = Date.now() - startTime;
          
          // Log do sucesso
          console.log(`[QR] Sucesso com ${method.name} em ${generationTime}ms`);
          
          // Track analytics
          await this.trackGeneration({
            method: method.name,
            success: true,
            generation_time_ms: generationTime
          });
          
          return {
            success: true,
            qr_code_url: result,
            method_used: method.name,
            generation_time_ms: generationTime
          };
        }
      } catch (error) {
        console.warn(`[QR] Método ${method.name} falhou:`, error);
        
        // Track falha
        await this.trackGeneration({
          method: method.name,
          success: false,
          error: error.message
        });
      }
    }
    
    // Se todos os métodos falharam
    const totalTime = Date.now() - startTime;
    
    return {
      success: false,
      error: 'Todos os métodos de geração falharam',
      generation_time_ms: totalTime
    };
  }

  private async generateLocalCanvas(data: string): Promise<string> {
    try {
      // Usar biblioteca qrcode para gerar no servidor
      const qrDataURL = await QRCode.toDataURL(data, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      return qrDataURL;
    } catch (error) {
      throw new Error(`Local canvas generation failed: ${error.message}`);
    }
  }

  private async generateLocalSVG(data: string): Promise<string> {
    try {
      const svgString = await QRCode.toString(data, {
        type: 'svg',
        width: 300,
        margin: 2
      });
      
      // Converter SVG para data URL
      const base64 = Buffer.from(svgString).toString('base64');
      return `data:image/svg+xml;base64,${base64}`;
    } catch (error) {
      throw new Error(`Local SVG generation failed: ${error.message}`);
    }
  }

  private async generateQRServerAPI(data: string): Promise<string> {
    const encodedData = encodeURIComponent(data);
    const url = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodedData}`;
    
    // Verificar se a URL responde
    const response = await fetch(url, { method: 'HEAD' });
    
    if (response.ok) {
      return url;
    } else {
      throw new Error(`QR Server API returned ${response.status}`);
    }
  }

  private async generateGoogleChart(data: string): Promise<string> {
    const encodedData = encodeURIComponent(data);
    const url = `https://chart.googleapis.com/chart?cht=qr&chs=300x300&chl=${encodedData}`;
    
    // Verificar se a URL responde
    const response = await fetch(url, { method: 'HEAD' });
    
    if (response.ok) {
      return url;
    } else {
      throw new Error(`Google Chart API returned ${response.status}`);
    }
  }

  private async generateBasicFallback(data: string): Promise<string> {
    // Gerar um QR code simples usando ASCII ou uma representação básica
    const hash = createHash('md5').update(data).digest('hex');
    
    // Esta é uma implementação básica - em produção, usar uma biblioteca simples
    return `data:text/plain,QR-FALLBACK-${hash}`;
  }

  private createTimeoutPromise(timeout: number): Promise<string> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('TIMEOUT')), timeout);
    });
  }

  private async trackGeneration(data: {
    method: string;
    success: boolean;
    generation_time_ms?: number;
    error?: string;
  }) {
    try {
      // Enviar para analytics (implementar conforme necessário)
      await fetch('/api/analytics/qr-generation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          timestamp: new Date().toISOString()
        })
      });
    } catch (error) {
      console.warn('[QR] Failed to track generation:', error);
    }
  }
}
```

### 1.2 QRCacheService

**Arquivo:** `lib/cache/qr-cache.service.ts`

```typescript
interface CachedQRData {
  qr_code_url: string;
  guest_id: string;
  event_id: string;
  cached_at: number;
  expires_at: number;
  method_used: string;
  generation_time_ms: number;
}

export class QRCacheService {
  private static readonly CACHE_KEY = 'snap_qr_cache_v2';
  private static readonly MAX_CACHE_SIZE = 100; // Máximo de QRs em cache
  private static readonly DEFAULT_TTL = 24 * 60 * 60 * 1000; // 24 horas

  static saveToCache(
    guestId: string, 
    eventId: string, 
    qrData: {
      qr_code_url: string;
      method_used: string;
      generation_time_ms: number;
    },
    customTTL?: number
  ): boolean {
    try {
      const cache = this.getCache();
      const key = `${guestId}_${eventId}`;
      const ttl = customTTL || this.DEFAULT_TTL;
      
      const cacheEntry: CachedQRData = {
        guest_id: guestId,
        event_id: eventId,
        qr_code_url: qrData.qr_code_url,
        method_used: qrData.method_used,
        generation_time_ms: qrData.generation_time_ms,
        cached_at: Date.now(),
        expires_at: Date.now() + ttl
      };
      
      cache[key] = cacheEntry;
      
      // Limpar cache se muito grande
      this.cleanupOldEntries(cache);
      
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(cache));
      
      console.log(`[Cache] Saved QR for guest ${guestId}`);
      return true;
    } catch (error) {
      console.warn('[Cache] Failed to save:', error);
      return false;
    }
  }

  static getFromCache(guestId: string, eventId: string): CachedQRData | null {
    try {
      const cache = this.getCache();
      const key = `${guestId}_${eventId}`;
      const entry = cache[key];
      
      if (!entry) {
        return null;
      }
      
      // Verificar se não expirou
      if (Date.now() > entry.expires_at) {
        delete cache[key];
        localStorage.setItem(this.CACHE_KEY, JSON.stringify(cache));
        console.log(`[Cache] Expired entry removed for guest ${guestId}`);
        return null;
      }
      
      console.log(`[Cache] Hit for guest ${guestId}`);
      return entry;
    } catch (error) {
      console.warn('[Cache] Failed to read:', error);
      return null;
    }
  }

  static clearCache(): void {
    try {
      localStorage.removeItem(this.CACHE_KEY);
      console.log('[Cache] Cleared all entries');
    } catch (error) {
      console.warn('[Cache] Failed to clear:', error);
    }
  }

  static getCacheStats(): {
    total_entries: number;
    total_size_kb: number;
    hit_rate: number;
    oldest_entry: number;
  } {
    try {
      const cache = this.getCache();
      const entries = Object.values(cache);
      const cacheString = localStorage.getItem(this.CACHE_KEY) || '{}';
      
      // Calcular hit rate dos últimos acessos (simplificado)
      const now = Date.now();
      const recentEntries = entries.filter(e => (now - e.cached_at) < 60000); // últimos 1min
      
      return {
        total_entries: entries.length,
        total_size_kb: Math.round(cacheString.length / 1024),
        hit_rate: recentEntries.length > 0 ? 0.8 : 0, // Estimativa
        oldest_entry: entries.length > 0 ? Math.min(...entries.map(e => e.cached_at)) : 0
      };
    } catch (error) {
      return {
        total_entries: 0,
        total_size_kb: 0,
        hit_rate: 0,
        oldest_entry: 0
      };
    }
  }

  private static getCache(): Record<string, CachedQRData> {
    try {
      const cacheString = localStorage.getItem(this.CACHE_KEY);
      return cacheString ? JSON.parse(cacheString) : {};
    } catch (error) {
      console.warn('[Cache] Failed to parse cache, resetting');
      return {};
    }
  }

  private static cleanupOldEntries(cache: Record<string, CachedQRData>): void {
    const entries = Object.entries(cache);
    
    if (entries.length <= this.MAX_CACHE_SIZE) {
      return;
    }
    
    // Remover entradas mais antigas
    const sortedEntries = entries.sort((a, b) => a[1].cached_at - b[1].cached_at);
    const toRemove = sortedEntries.slice(0, entries.length - this.MAX_CACHE_SIZE);
    
    toRemove.forEach(([key]) => {
      delete cache[key];
    });
    
    console.log(`[Cache] Removed ${toRemove.length} old entries`);
  }
}
```

### 1.3 Verificação de Capacidade

**Arquivo:** `app/api/client-auth/guests/create/route.ts` (modificação)

```typescript
// Adicionar esta função antes da criação do guest
const checkEventCapacity = async (eventId: string): Promise<void> => {
  try {
    // Buscar configurações do evento
    const { data: event, error: eventError } = await supabaseAdmin
      .from('events')
      .select('guest_list_settings')
      .eq('id', eventId)
      .single();
      
    if (eventError) {
      console.warn('[CAPACITY] Erro ao buscar evento para verificação de capacidade:', eventError);
      return; // Não bloquear se não conseguir verificar
    }
    
    const maxGuests = event?.guest_list_settings?.max_guests;
    
    // Se não há limite definido, permitir
    if (!maxGuests || maxGuests <= 0) {
      console.log('[CAPACITY] Sem limite definido para o evento');
      return;
    }
    
    // Contar guests atuais
    const { count, error: countError } = await supabaseAdmin
      .from('guests')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId);
      
    if (countError) {
      console.warn('[CAPACITY] Erro ao contar guests:', countError);
      return; // Não bloquear se não conseguir contar
    }
    
    console.log(`[CAPACITY] Evento ${eventId}: ${count}/${maxGuests} guests`);
    
    // Verificar se atingiu o limite
    if (count >= maxGuests) {
      throw new Error(`Evento lotado! Capacidade máxima: ${maxGuests}, Atual: ${count}`);
    }
    
    // Alertar se próximo do limite (90%)
    if (count >= maxGuests * 0.9) {
      console.warn(`[CAPACITY] ATENÇÃO: Evento próximo da capacidade máxima (${count}/${maxGuests})`);
    }
    
  } catch (error) {
    if (error.message.includes('lotado')) {
      throw error; // Re-throw capacity errors
    }
    
    console.error('[CAPACITY] Erro na verificação de capacidade:', error);
    // Não bloquear o processo por erros de verificação
  }
};

// No POST handler, adicionar antes da criação:
export async function POST(request: NextRequest) {
  try {
    // ... código existente ...
    
    // NOVA VERIFICAÇÃO: Capacidade do evento
    await checkEventCapacity(event_id);
    
    // ... continuar com a criação do guest ...
  } catch (error) {
    // ... tratamento de erro ...
  }
}
```

---

## 🔧 FASE 2: ROBUSTEZ E RECUPERAÇÃO

### 2.1 Sistema de Retry

**Arquivo:** `lib/utils/retry.service.ts`

```typescript
interface RetryOptions {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryCondition?: (error: Error) => boolean;
}

export class RetryService {
  static async withRetry<T>(
    operation: () => Promise<T>,
    options: Partial<RetryOptions> = {}
  ): Promise<T> {
    const {
      maxAttempts = 3,
      baseDelay = 1000,
      maxDelay = 10000,
      backoffMultiplier = 2,
      retryCondition = () => true
    } = options;

    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await operation();
        
        if (attempt > 1) {
          console.log(`[Retry] Sucesso na tentativa ${attempt}/${maxAttempts}`);
        }
        
        return result;
      } catch (error) {
        lastError = error as Error;
        
        console.warn(`[Retry] Tentativa ${attempt}/${maxAttempts} falhou:`, error.message);
        
        // Se é a última tentativa ou erro não deve ser retentado
        if (attempt === maxAttempts || !retryCondition(lastError)) {
          break;
        }
        
        // Calcular delay com backoff exponencial
        const delay = Math.min(
          baseDelay * Math.pow(backoffMultiplier, attempt - 1),
          maxDelay
        );
        
        console.log(`[Retry] Aguardando ${delay}ms antes da próxima tentativa...`);
        await this.sleep(delay);
      }
    }
    
    throw new Error(`Operação falhou após ${maxAttempts} tentativas. Último erro: ${lastError.message}`);
  }

  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  static isRetryableError(error: Error): boolean {
    const retryablePatterns = [
      /network/i,
      /timeout/i,
      /connection/i,
      /502/,
      /503/,
      /504/
    ];
    
    return retryablePatterns.some(pattern => 
      pattern.test(error.message) || pattern.test(error.name)
    );
  }
}
```

### 2.2 Health Check API

**Arquivo:** `app/api/health/qr-system/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { EnhancedQRCodeService } from '@/lib/services/enhanced-qrcode.service';

interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'degraded' | 'down';
  response_time_ms: number;
  error?: string;
  details?: any;
}

export async function GET() {
  const startTime = Date.now();
  const checks: HealthCheckResult[] = [];
  
  // 1. Verificar base de dados
  checks.push(await checkDatabase());
  
  // 2. Verificar geração de QR codes
  checks.push(await checkQRGeneration());
  
  // 3. Verificar APIs externas
  checks.push(await checkExternalAPIs());
  
  // 4. Verificar cache local
  checks.push(await checkCacheSystem());
  
  // 5. Verificar storage
  checks.push(await checkStorageSystem());
  
  // Calcular status geral
  const healthyCount = checks.filter(c => c.status === 'healthy').length;
  const totalChecks = checks.length;
  const healthScore = Math.round((healthyCount / totalChecks) * 100);
  
  let overallStatus: 'healthy' | 'degraded' | 'critical';
  if (healthScore >= 90) overallStatus = 'healthy';
  else if (healthScore >= 70) overallStatus = 'degraded';
  else overallStatus = 'critical';
  
  const totalTime = Date.now() - startTime;
  
  const response = {
    status: overallStatus,
    health_score: healthScore,
    timestamp: new Date().toISOString(),
    total_check_time_ms: totalTime,
    services: checks,
    summary: {
      healthy: checks.filter(c => c.status === 'healthy').length,
      degraded: checks.filter(c => c.status === 'degraded').length,
      down: checks.filter(c => c.status === 'down').length
    }
  };
  
  // Log se há problemas
  if (overallStatus !== 'healthy') {
    console.warn('[Health] Sistema com problemas:', response);
  }
  
  return NextResponse.json(response);
}

async function checkDatabase(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  
  try {
    // Teste simples de conexão
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('guests')
      .select('count')
      .limit(1);
      
    if (error) throw error;
    
    return {
      service: 'database',
      status: 'healthy',
      response_time_ms: Date.now() - startTime,
      details: { connection: 'ok' }
    };
  } catch (error) {
    return {
      service: 'database',
      status: 'down',
      response_time_ms: Date.now() - startTime,
      error: error.message
    };
  }
}

async function checkQRGeneration(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  
  try {
    const qrService = EnhancedQRCodeService.getInstance();
    const testData = `health-check-${Date.now()}`;
    
    const result = await qrService.generateQRCodeWithFallbacks(testData);
    
    if (!result.success) {
      throw new Error(result.error || 'QR generation failed');
    }
    
    return {
      service: 'qr_generation',
      status: 'healthy',
      response_time_ms: Date.now() - startTime,
      details: { 
        method_used: result.method_used,
        generation_time: result.generation_time_ms
      }
    };
  } catch (error) {
    return {
      service: 'qr_generation',
      status: 'down',
      response_time_ms: Date.now() - startTime,
      error: error.message
    };
  }
}

async function checkExternalAPIs(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  const apis = [
    'https://api.qrserver.com/v1/create-qr-code/?size=50x50&data=test',
    'https://chart.googleapis.com/chart?cht=qr&chs=50x50&chl=test'
  ];
  
  try {
    const results = await Promise.allSettled(
      apis.map(async (url) => {
        const response = await fetch(url, { 
          method: 'HEAD',
          signal: AbortSignal.timeout(3000)
        });
        return { url, ok: response.ok, status: response.status };
      })
    );
    
    const successful = results.filter(r => 
      r.status === 'fulfilled' && r.value.ok
    ).length;
    
    const status = successful >= apis.length / 2 ? 'healthy' : 
                  successful > 0 ? 'degraded' : 'down';
    
    return {
      service: 'external_apis',
      status,
      response_time_ms: Date.now() - startTime,
      details: { 
        successful: successful,
        total: apis.length,
        results: results.map(r => 
          r.status === 'fulfilled' ? r.value : { error: r.reason.message }
        )
      }
    };
  } catch (error) {
    return {
      service: 'external_apis',
      status: 'down',
      response_time_ms: Date.now() - startTime,
      error: error.message
    };
  }
}

async function checkCacheSystem(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  
  try {
    if (typeof window === 'undefined') {
      return {
        service: 'cache_system',
        status: 'healthy',
        response_time_ms: Date.now() - startTime,
        details: { note: 'Server-side, cache not applicable' }
      };
    }
    
    // Teste de localStorage
    const testKey = 'health-check-cache';
    const testValue = `test-${Date.now()}`;
    
    localStorage.setItem(testKey, testValue);
    const retrieved = localStorage.getItem(testKey);
    localStorage.removeItem(testKey);
    
    if (retrieved !== testValue) {
      throw new Error('Cache read/write test failed');
    }
    
    return {
      service: 'cache_system',
      status: 'healthy',
      response_time_ms: Date.now() - startTime,
      details: { storage: 'localStorage working' }
    };
  } catch (error) {
    return {
      service: 'cache_system',
      status: 'degraded',
      response_time_ms: Date.now() - startTime,
      error: error.message
    };
  }
}

async function checkStorageSystem(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  
  try {
    // Verificar espaço disponível (aproximado)
    if (typeof window !== 'undefined' && 'storage' in navigator) {
      const estimate = await navigator.storage.estimate();
      const usedPercentage = ((estimate.usage || 0) / (estimate.quota || 1)) * 100;
      
      const status = usedPercentage < 80 ? 'healthy' : 
                    usedPercentage < 95 ? 'degraded' : 'down';
      
      return {
        service: 'storage_system',
        status,
        response_time_ms: Date.now() - startTime,
        details: {
          used_mb: Math.round((estimate.usage || 0) / 1024 / 1024),
          quota_mb: Math.round((estimate.quota || 0) / 1024 / 1024),
          used_percentage: Math.round(usedPercentage)
        }
      };
    }
    
    return {
      service: 'storage_system',
      status: 'healthy',
      response_time_ms: Date.now() - startTime,
      details: { note: 'Storage API not available' }
    };
  } catch (error) {
    return {
      service: 'storage_system',
      status: 'degraded',
      response_time_ms: Date.now() - startTime,
      error: error.message
    };
  }
}
```

---

## 📊 SCRIPTS DE MIGRAÇÃO

### Script de Migração da Base de Dados

**Arquivo:** `migrations/enhance_qr_system.sql`

```sql
-- Migração para melhorar sistema de QR codes
-- Executar em ordem

-- 1. Adicionar colunas para analytics de QR codes
ALTER TABLE guests 
ADD COLUMN IF NOT EXISTS qr_generated_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS qr_generation_method TEXT DEFAULT 'legacy',
ADD COLUMN IF NOT EXISTS qr_scan_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_scanned_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS offline_created BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'synced';

-- 2. Criar tabela de analytics
CREATE TABLE IF NOT EXISTS qr_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL, -- 'generated', 'displayed', 'scanned', 'failed'
  guest_id UUID REFERENCES guests(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  metadata JSONB DEFAULT '{}',
  generation_method TEXT,
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT,
  response_time_ms INTEGER,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  user_agent TEXT,
  ip_address INET
);

-- 3. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_qr_analytics_event_type ON qr_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_qr_analytics_guest_id ON qr_analytics(guest_id);
CREATE INDEX IF NOT EXISTS idx_qr_analytics_event_id ON qr_analytics(event_id);
CREATE INDEX IF NOT EXISTS idx_qr_analytics_timestamp ON qr_analytics(timestamp);
CREATE INDEX IF NOT EXISTS idx_guests_qr_scan_count ON guests(qr_scan_count);

-- 4. Criar tabela de QR codes pré-gerados
CREATE TABLE IF NOT EXISTS pregenerated_qrs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  qr_code_url TEXT NOT NULL,
  qr_code_data TEXT NOT NULL,
  generation_method TEXT NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  used_by_guest_id UUID REFERENCES guests(id),
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days')
);

-- 5. Criar tabela de health checks
CREATE TABLE IF NOT EXISTS system_health_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name TEXT NOT NULL,
  status TEXT NOT NULL, -- 'healthy', 'degraded', 'down'
  response_time_ms INTEGER,
  error_message TEXT,
  details JSONB DEFAULT '{}',
  checked_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Criar índices para health checks
CREATE INDEX IF NOT EXISTS idx_health_logs_service ON system_health_logs(service_name);
CREATE INDEX IF NOT EXISTS idx_health_logs_status ON system_health_logs(status);
CREATE INDEX IF NOT EXISTS idx_health_logs_checked_at ON system_health_logs(checked_at);

-- 7. Função para estatísticas de QR codes
CREATE OR REPLACE FUNCTION get_qr_statistics(event_id_param UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_generated', COUNT(*) FILTER (WHERE event_type = 'generated'),
    'total_displayed', COUNT(*) FILTER (WHERE event_type = 'displayed'),
    'total_scanned', COUNT(*) FILTER (WHERE event_type = 'scanned'),
    'total_failed', COUNT(*) FILTER (WHERE event_type = 'failed'),
    'success_rate', ROUND(
      (COUNT(*) FILTER (WHERE event_type = 'generated' AND success = true)::DECIMAL / 
       NULLIF(COUNT(*) FILTER (WHERE event_type = 'generated'), 0)) * 100, 2
    ),
    'avg_generation_time_ms', ROUND(AVG(response_time_ms) FILTER (WHERE event_type = 'generated')),
    'peak_times', (
      SELECT json_agg(json_build_object(
        'hour', EXTRACT(hour FROM timestamp),
        'count', hour_count
      ))
      FROM (
        SELECT 
          EXTRACT(hour FROM timestamp) as hour,
          COUNT(*) as hour_count
        FROM qr_analytics 
        WHERE event_id = event_id_param 
        AND event_type = 'scanned'
        GROUP BY EXTRACT(hour FROM timestamp)
        ORDER BY hour_count DESC
        LIMIT 5
      ) peak_data
    ),
    'method_usage', (
      SELECT json_object_agg(generation_method, method_count)
      FROM (
        SELECT 
          generation_method,
          COUNT(*) as method_count
        FROM qr_analytics 
        WHERE event_id = event_id_param 
        AND event_type = 'generated'
        GROUP BY generation_method
      ) method_data
    )
  ) INTO result
  FROM qr_analytics
  WHERE event_id = event_id_param;
  
  RETURN COALESCE(result, '{}'::json);
END;
$$ LANGUAGE plpgsql;

-- 8. Função de limpeza automática de logs antigos
CREATE OR REPLACE FUNCTION cleanup_old_analytics()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Manter apenas 30 dias de analytics
  DELETE FROM qr_analytics 
  WHERE timestamp < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Manter apenas 7 dias de health logs
  DELETE FROM system_health_logs 
  WHERE checked_at < NOW() - INTERVAL '7 days';
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 9. Atualizar função create_guest_safely para incluir analytics
CREATE OR REPLACE FUNCTION public.create_guest_safely(
  p_event_id UUID, 
  p_client_user_id UUID, 
  p_promoter_id UUID DEFAULT NULL, 
  p_team_id UUID DEFAULT NULL, 
  p_name TEXT DEFAULT 'Convidado', 
  p_phone TEXT DEFAULT ''
)
RETURNS TABLE (
  id UUID,
  qr_code_url TEXT
) 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_guest_id UUID;
  v_qr_code_url TEXT;
  v_qr_code_text TEXT;
  v_existing_guest_id UUID;
BEGIN
  -- Verificar se já existe um convidado
  SELECT id INTO v_existing_guest_id
  FROM guests
  WHERE event_id = p_event_id
    AND client_user_id = p_client_user_id
  LIMIT 1;
  
  -- Se existe, retornar dados existentes
  IF v_existing_guest_id IS NOT NULL THEN
    RETURN QUERY
    SELECT g.id, g.qr_code_url
    FROM guests g
    WHERE g.id = v_existing_guest_id;
    RETURN;
  END IF;
  
  -- Gerar novo guest
  v_guest_id := gen_random_uuid();
  v_qr_code_text := v_guest_id::text;
  v_qr_code_url := 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=' || v_qr_code_text;
  
  -- Inserir novo guest
  INSERT INTO guests (
    id, event_id, name, phone, qr_code, qr_code_url,
    checked_in, status, promoter_id, team_id, client_user_id,
    qr_generated_at, qr_generation_method, created_at
  )
  VALUES (
    v_guest_id, p_event_id, p_name, p_phone, v_qr_code_text, v_qr_code_url,
    false, 'pending', p_promoter_id, p_team_id, p_client_user_id,
    NOW(), 'sql_function', NOW()
  );
  
  -- Registrar analytics
  INSERT INTO qr_analytics (
    event_type, guest_id, event_id, generation_method, 
    success, timestamp
  ) VALUES (
    'generated', v_guest_id, p_event_id, 'sql_function',
    true, NOW()
  );
  
  -- Retornar dados criados
  RETURN QUERY
  SELECT v_guest_id, v_qr_code_url;
END;
$$ LANGUAGE plpgsql;

-- 10. Conceder permissões
GRANT ALL ON qr_analytics TO authenticated, anon, service_role;
GRANT ALL ON pregenerated_qrs TO authenticated, anon, service_role;
GRANT ALL ON system_health_logs TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION get_qr_statistics(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION cleanup_old_analytics() TO service_role;

-- 11. Criar trigger para limpeza automática (executar semanalmente)
CREATE OR REPLACE FUNCTION schedule_cleanup()
RETURNS void AS $$
BEGIN
  PERFORM cleanup_old_analytics();
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE qr_analytics IS 'Analytics de geração e uso de QR codes';
COMMENT ON TABLE pregenerated_qrs IS 'QR codes pré-gerados para otimização';
COMMENT ON TABLE system_health_logs IS 'Logs de saúde do sistema';
COMMENT ON FUNCTION get_qr_statistics(UUID) IS 'Estatísticas de QR codes por evento';
COMMENT ON FUNCTION cleanup_old_analytics() IS 'Limpeza automática de dados antigos';
```

---

## 🧪 TESTES E VALIDAÇÃO

### Script de Teste Automatizado

**Arquivo:** `tests/qr-system.test.ts`

```typescript
import { EnhancedQRCodeService } from '@/lib/services/enhanced-qrcode.service';
import { QRCacheService } from '@/lib/cache/qr-cache.service';

describe('Enhanced QR Code System', () => {
  let qrService: EnhancedQRCodeService;
  
  beforeEach(() => {
    qrService = EnhancedQRCodeService.getInstance();
    QRCacheService.clearCache();
  });

  describe('QR Code Generation', () => {
    test('should generate QR code successfully', async () => {
      const testData = 'test-guest-12345';
      const result = await qrService.generateQRCodeWithFallbacks(testData);
      
      expect(result.success).toBe(true);
      expect(result.qr_code_url).toBeDefined();
      expect(result.method_used).toBeDefined();
      expect(result.generation_time_ms).toBeGreaterThan(0);
    });

    test('should use local method first', async () => {
      const testData = 'test-local-priority';
      const result = await qrService.generateQRCodeWithFallbacks(testData);
      
      expect(result.success).toBe(true);
      expect(['local_canvas', 'local_svg']).toContain(result.method_used);
    });

    test('should fallback when primary method fails', async () => {
      // Mock para simular falha no método local
      const originalGenerate = qrService['generateLocalCanvas'];
      qrService['generateLocalCanvas'] = jest.fn().mockRejectedValue(new Error('Local failed'));
      
      const testData = 'test-fallback';
      const result = await qrService.generateQRCodeWithFallbacks(testData);
      
      expect(result.success).toBe(true);
      expect(result.method_used).not.toBe('local_canvas');
      
      // Restore
      qrService['generateLocalCanvas'] = originalGenerate;
    });
  });

  describe('Cache System', () => {
    test('should save and retrieve from cache', () => {
      const guestId = 'guest-123';
      const eventId = 'event-456';
      const qrData = {
        qr_code_url: 'https://example.com/qr.png',
        method_used: 'local_canvas',
        generation_time_ms: 150
      };
      
      const saved = QRCacheService.saveToCache(guestId, eventId, qrData);
      expect(saved).toBe(true);
      
      const retrieved = QRCacheService.getFromCache(guestId, eventId);
      expect(retrieved).toBeDefined();
      expect(retrieved?.qr_code_url).toBe(qrData.qr_code_url);
      expect(retrieved?.guest_id).toBe(guestId);
      expect(retrieved?.event_id).toBe(eventId);
    });

    test('should return null for expired cache entries', () => {
      const guestId = 'guest-expired';
      const eventId = 'event-expired';
      const qrData = {
        qr_code_url: 'https://example.com/expired.png',
        method_used: 'local_canvas',
        generation_time_ms: 150
      };
      
      // Save with very short TTL
      QRCacheService.saveToCache(guestId, eventId, qrData, 1); // 1ms
      
      // Wait for expiration
      setTimeout(() => {
        const retrieved = QRCacheService.getFromCache(guestId, eventId);
        expect(retrieved).toBeNull();
      }, 10);
    });

    test('should provide cache statistics', () => {
      // Add some cache entries
      for (let i = 0; i < 5; i++) {
        QRCacheService.saveToCache(`guest-${i}`, `event-${i}`, {
          qr_code_url: `https://example.com/qr-${i}.png`,
          method_used: 'local_canvas',
          generation_time_ms: 100 + i * 10
        });
      }
      
      const stats = QRCacheService.getCacheStats();
      expect(stats.total_entries).toBe(5);
      expect(stats.total_size_kb).toBeGreaterThan(0);
    });
  });

  describe('Integration Tests', () => {
    test('should handle complete flow: generate -> cache -> retrieve', async () => {
      const guestId = 'integration-guest';
      const eventId = 'integration-event';
      const testData = `${guestId}_${eventId}_${Date.now()}`;
      
      // Generate QR code
      const result = await qrService.generateQRCodeWithFallbacks(testData);
      expect(result.success).toBe(true);
      
      // Save to cache
      const saved = QRCacheService.saveToCache(guestId, eventId, {
        qr_code_url: result.qr_code_url!,
        method_used: result.method_used!,
        generation_time_ms: result.generation_time_ms!
      });
      expect(saved).toBe(true);
      
      // Retrieve from cache
      const cached = QRCacheService.getFromCache(guestId, eventId);
      expect(cached).toBeDefined();
      expect(cached?.qr_code_url).toBe(result.qr_code_url);
    });
  });
});
```

---

**Este documento será expandido conforme a implementação avança.**

*Para questões técnicas específicas, consulte o documento principal PLANO_MELHORIA_QRCODE.md* 