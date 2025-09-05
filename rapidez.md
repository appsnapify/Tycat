# 🚀 **RAPIDEZ.MD - PLANO DEFINITIVO PARA SITE ULTRA-RÁPIDO**

## 📊 **ANÁLISE CRÍTICA DO LIGHTHOUSE REPORT**

### **🚨 SITUAÇÃO ATUAL (CRÍTICA):**
- 🔴 **Performance**: **13/100** - EXTREMAMENTE LENTO
- 🟡 **Accessibility**: **88/100** - Bom
- 🟢 **Best Practices**: **91/100** - Excelente
- 🟡 **SEO**: Não analisado completamente

### **⚡ MÉTRICAS CRÍTICAS IDENTIFICADAS:**

#### **🚨 PROBLEMAS MORTAIS:**
1. **Largest Contentful Paint (LCP)**: **23.5s** ❌ (Meta: <2.5s)
2. **Speed Index**: **15.6s** ❌ (Meta: <3.4s)  
3. **Total Blocking Time**: **15.7s** ❌ (Meta: <200ms)
4. **Time to Interactive**: **23.5s** ❌ (Meta: <3.8s)
5. **Max Potential FID**: **6.3s** ❌ (Meta: <100ms)
6. **Server Response Time**: **2.9s** ❌ (Meta: <600ms)
7. **Cumulative Layout Shift**: **0.48** ❌ (Meta: <0.1)

---

## 🎯 **PLANO ULTRA-AVANÇADO DE OTIMIZAÇÃO**

### **FASE 1: OTIMIZAÇÕES JAVASCRIPT CRÍTICAS (PRIORIDADE MÁXIMA)**

#### **1.1 Bundle Splitting Agressivo com Next.js 15**

```javascript
// next.config.js - CONFIGURAÇÃO ULTRA-OTIMIZADA
/** @type {import('next').NextConfig} */
const nextConfig = {
  // ✅ EXPERIMENTAL FEATURES AVANÇADAS
  experimental: {
    // Turbopack para desenvolvimento ultra-rápido
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
    
    // Otimização agressiva de pacotes
    optimizePackageImports: [
      'lucide-react',
      'framer-motion', 
      '@supabase/supabase-js',
      'react-hook-form',
      '@hookform/resolvers',
      'zod',
      'date-fns'
    ],
    
    // CSS chunking otimizado
    cssChunking: 'strict',
    
    // Webpack build worker para paralelização
    webpackBuildWorker: true,
    
    // Minificação do servidor
    serverMinification: true,
    
    // Otimizações de memória do webpack
    webpackMemoryOptimizations: true,
    
    // Desabilitar preload de entradas (reduz overhead inicial)
    preloadEntriesOnStart: false,
    
    // Otimização de CSS
    optimizeCss: true,
  },

  // ✅ WEBPACK CONFIGURATION AVANÇADA
  webpack: (config, { dev, isServer, webpack }) => {
    // Produção: Splitting agressivo
    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          minSize: 20000,
          maxSize: 244000,
          cacheGroups: {
            // Vendor chunk para bibliotecas estáveis
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              priority: 10,
              reuseExistingChunk: true,
            },
            // Common chunk para código compartilhado
            common: {
              name: 'common',
              minChunks: 2,
              priority: 5,
              reuseExistingChunk: true,
            },
            // Supabase chunk separado
            supabase: {
              test: /[\\/]node_modules[\\/]@supabase[\\/]/,
              name: 'supabase',
              priority: 20,
            },
            // UI components chunk
            ui: {
              test: /[\\/](components|ui)[\\/]/,
              name: 'ui',
              priority: 15,
            }
          },
        },
        
        // Tree shaking agressivo
        usedExports: true,
        sideEffects: false,
        
        // Minimização avançada
        minimize: true,
        minimizer: [
          new webpack.optimize.TerserPlugin({
            terserOptions: {
              compress: {
                drop_console: true,
                drop_debugger: true,
                pure_funcs: ['console.log', 'console.info'],
              },
              mangle: true,
              format: {
                comments: false,
              },
            },
            extractComments: false,
          }),
        ],
      };
    }

    // Module federation para micro-frontends (futuro)
    config.plugins.push(
      new webpack.DefinePlugin({
        __DEV__: dev,
        __BROWSER__: !isServer,
      })
    );

    return config;
  },

  // ✅ COMPILER OPTIMIZATIONS
  compiler: {
    // Remover console.log em produção
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
    
    // Styled-jsx otimizations
    styledComponents: true,
  },

  // ✅ IMAGES OPTIMIZATION AVANÇADA
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 31536000, // 1 ano
    dangerouslyAllowSVG: false,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    domains: ['xejpwdpumzalewamttjv.supabase.co'],
  },

  // ✅ HEADERS DE PERFORMANCE ULTRA-AGRESSIVOS
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        // Security headers
        { key: 'X-DNS-Prefetch-Control', value: 'on' },
        { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        
        // Performance headers
        { key: 'X-XSS-Protection', value: '1; mode=block' },
        
        // Resource hints
        { key: 'Link', value: '<https://fonts.gstatic.com>; rel=preconnect; crossorigin' },
        { key: 'Link', value: '<https://xejpwdpumzalewamttjv.supabase.co>; rel=preconnect' },
      ],
    },
    {
      source: '/static/(.*)',
      headers: [
        { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
      ],
    },
    {
      source: '/_next/static/(.*)',
      headers: [
        { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
      ],
    }
  ],

  // ✅ REDIRECTS OTIMIZADOS
  redirects: async () => [],

  // ✅ REWRITES PARA API OPTIMIZATION
  rewrites: async () => [],

  // ✅ OUTRAS OTIMIZAÇÕES
  poweredByHeader: false,
  compress: true,
  
  // Tracing para análise de performance
  trailingSlash: false,
  
  // Output standalone para Docker
  output: 'standalone',
};

module.exports = nextConfig;
```

#### **1.2 Dynamic Imports e Lazy Loading Avançado**

```typescript
// components/LazyComponents.tsx - LAZY LOADING INTELIGENTE
import dynamic from 'next/dynamic';
import { Suspense } from 'react';

// ✅ LAZY LOADING COM LOADING STATES OTIMIZADOS
export const GuestRegistrationForm = dynamic(
  () => import('@/app/promotor/[userId]/[eventSlug]/GuestRegistrationForm'),
  {
    loading: () => (
      <div className="animate-pulse space-y-4">
        <div className="h-12 bg-gray-200 rounded-xl"></div>
        <div className="h-10 bg-gray-200 rounded-xl"></div>
        <div className="h-10 bg-gray-200 rounded-xl"></div>
      </div>
    ),
    ssr: false, // Desabilitar SSR para componentes pesados
  }
);

export const QRCodeDisplay = dynamic(
  () => import('@/app/promotor/[userId]/[eventSlug]/QRCodeDisplay'),
  {
    loading: () => <div className="w-64 h-64 bg-gray-200 animate-pulse rounded-lg"></div>,
    ssr: false,
  }
);

// ✅ COMPONENT PRELOADING STRATEGY
export const preloadComponents = () => {
  // Preload apenas quando necessário
  if (typeof window !== 'undefined') {
    import('@/app/promotor/[userId]/[eventSlug]/GuestRegistrationForm');
    import('@/app/promotor/[userId]/[eventSlug]/QRCodeDisplay');
  }
};
```

#### **1.3 React Performance com React-Scan**

```typescript
// lib/performance.ts - MONITORING AVANÇADO
import { scan } from 'react-scan';

if (process.env.NODE_ENV === 'development') {
  scan({
    enabled: true,
    log: false, // Não log para evitar overhead
    showToolbar: true,
    animationSpeed: 'fast',
    trackUnnecessaryRenders: true,
    
    // Callbacks para monitoring
    onRender: (fiber, renders) => {
      // Log apenas renders problemáticos
      if (renders.length > 5) {
        console.warn(`Component ${fiber.type?.name} re-rendered ${renders.length} times`);
      }
    },
    
    onCommitFinish: () => {
      // Análise de performance pós-commit
      if (performance.now() > 16.67) { // > 60fps
        console.warn('Frame drop detected');
      }
    }
  });
}
```

### **FASE 2: OTIMIZAÇÕES DE SERVIDOR E API**

#### **2.1 API Routes Otimizadas com Edge Runtime**

```typescript
// app/api/guest/login-enhanced/route.ts - EDGE OPTIMIZED
export const runtime = 'edge';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ✅ CONNECTION POOLING E CACHING
const supabaseCache = new Map();
const getSupabaseClient = () => {
  const key = 'supabase-client';
  if (!supabaseCache.has(key)) {
    supabaseCache.set(key, createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: { persistSession: false },
        db: { 
          schema: 'public',
        },
        global: {
          fetch: (...args) => fetch(...args),
        },
      }
    ));
  }
  return supabaseCache.get(key);
};

export async function POST(request: NextRequest) {
  const startTime = performance.now();
  
  try {
    // ✅ STREAMING RESPONSE para reduzir TTFB
    const data = await request.json();
    
    // ✅ PARALLEL PROCESSING
    const supabase = getSupabaseClient();
    
    // ✅ QUERY OTIMIZADA COM PREPARED STATEMENTS
    const { data: result, error } = await supabase.rpc(
      'login_with_uuid_qr_enhanced_v2', 
      {
        phone_input: data.phone,
        password_input: data.password,
        event_id_input: data.eventId,
        promoter_id_input: data.promoterId,
        team_id_input: data.teamId
      }
    );

    const duration = performance.now() - startTime;
    
    // ✅ STRUCTURED RESPONSE COM METRICS
    return NextResponse.json({
      success: true,
      data: result,
      _meta: {
        duration_ms: Math.round(duration * 100) / 100,
        timestamp: new Date().toISOString(),
      }
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Content-Type': 'application/json',
      }
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      _meta: {
        duration_ms: Math.round((performance.now() - startTime) * 100) / 100,
      }
    }, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-store',
      }
    });
  }
}
```

#### **2.2 Database Optimization com Supabase Pro**

```sql
-- migrations/ultra_performance_optimization.sql
-- ✅ ÍNDICES COMPOSTOS ULTRA-OTIMIZADOS

-- Índice para login rápido
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_phone_active 
ON clients(phone) 
WHERE active = true;

-- Índice para guests por evento + promoter
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_guests_event_promoter_team 
ON guests(event_id, promoter_id, team_id) 
INCLUDE (qr_code, created_at);

-- Índice para QR codes únicos
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_guests_qr_unique 
ON guests(qr_code) 
WHERE qr_code IS NOT NULL;

-- ✅ FUNÇÃO SQL ULTRA-OTIMIZADA
CREATE OR REPLACE FUNCTION login_with_uuid_qr_enhanced_v2(
  phone_input text,
  password_input text,
  event_id_input uuid,
  promoter_id_input uuid DEFAULT NULL,
  team_id_input uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  client_record clients%ROWTYPE;
  guest_record guests%ROWTYPE;
  new_qr_code uuid;
  start_time timestamptz;
  db_duration numeric;
BEGIN
  start_time := clock_timestamp();
  
  -- ✅ SINGLE QUERY PARA VALIDAÇÃO E FETCH
  SELECT * INTO client_record 
  FROM clients 
  WHERE phone = phone_input 
    AND active = true
  LIMIT 1;
  
  -- ✅ EARLY RETURN PATTERN
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Cliente não encontrado',
      'code', 'CLIENT_NOT_FOUND'
    );
  END IF;
  
  -- ✅ PASSWORD VERIFICATION COM TIMEOUT
  IF NOT crypt(password_input, client_record.password_hash) = client_record.password_hash THEN
    -- Log failed attempt (async)
    INSERT INTO audit_logs (user_id, action, details) 
    VALUES (client_record.id, 'LOGIN_FAILED', jsonb_build_object('reason', 'invalid_password'));
    
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Credenciais inválidas',
      'code', 'INVALID_CREDENTIALS'
    );
  END IF;
  
  -- ✅ UPSERT OTIMIZADO COM CONFLICT RESOLUTION
  new_qr_code := gen_random_uuid();
  
  INSERT INTO guests (
    id, client_id, event_id, promoter_id, team_id, qr_code, 
    name, phone, email, source, created_at
  ) 
  VALUES (
    gen_random_uuid(),
    client_record.id,
    event_id_input,
    promoter_id_input,
    team_id_input,
    new_qr_code,
    client_record.first_name || ' ' || client_record.last_name,
    client_record.phone,
    client_record.email,
    'PROMOTER',
    NOW()
  )
  ON CONFLICT (client_id, event_id) 
  DO UPDATE SET
    promoter_id = EXCLUDED.promoter_id,
    team_id = EXCLUDED.team_id,
    updated_at = NOW()
  RETURNING * INTO guest_record;
  
  db_duration := EXTRACT(EPOCH FROM (clock_timestamp() - start_time)) * 1000;
  
  -- ✅ STRUCTURED RETURN COM METRICS
  RETURN jsonb_build_object(
    'success', true,
    'guest_id', guest_record.id,
    'qr_code', guest_record.qr_code,
    'client_id', client_record.id,
    '_meta', jsonb_build_object(
      'db_duration_ms', round(db_duration::numeric, 3),
      'source', 'existing_client'
    )
  );
  
EXCEPTION
  WHEN OTHERS THEN
    -- ✅ ERROR LOGGING SEM EXPOR DETALHES
    INSERT INTO error_logs (function_name, error_message, error_detail)
    VALUES ('login_with_uuid_qr_enhanced_v2', SQLERRM, SQLSTATE);
    
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Erro interno do servidor',
      'code', 'INTERNAL_ERROR'
    );
END;
$$;
```

### **FASE 3: FRONTEND OPTIMIZATION AVANÇADA**

#### **3.1 Component Optimization com React 19**

```typescript
// components/OptimizedGuestForm.tsx
import React, { memo, useMemo, useCallback, startTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// ✅ SCHEMA VALIDATION OTIMIZADO
const formSchema = z.object({
  phone: z.string().min(8, 'Telefone inválido'),
  password: z.string().min(8, 'Password deve ter 8+ caracteres'),
}).strict();

interface OptimizedGuestFormProps {
  eventId: string;
  promoterId: string | null;
  teamId?: string | null;
  onSuccess: (data: any) => void;
}

// ✅ COMPONENT MEMOIZADO COM SHALLOW COMPARISON
const OptimizedGuestForm = memo<OptimizedGuestFormProps>(({
  eventId,
  promoterId,
  teamId,
  onSuccess
}) => {
  // ✅ FORM COM PERFORMANCE OPTIMIZATIONS
  const form = useForm({
    resolver: zodResolver(formSchema),
    mode: 'onBlur', // Reduzir re-renders
    defaultValues: useMemo(() => ({
      phone: '',
      password: '',
    }), []),
  });

  // ✅ MEMOIZED SUBMIT HANDLER
  const handleSubmit = useCallback(async (data: z.infer<typeof formSchema>) => {
    startTransition(() => {
      // Use transition para non-urgent updates
      fetch('/api/guest/login-enhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          eventId,
          promoterId,
          teamId
        }),
      })
      .then(res => res.json())
      .then(result => {
        if (result.success) {
          onSuccess(result.data);
        }
      });
    });
  }, [eventId, promoterId, teamId, onSuccess]);

  // ✅ MEMOIZED RENDER
  return useMemo(() => (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
      {/* Form fields optimized */}
      <input
        {...form.register('phone')}
        placeholder="Telefone"
        className="w-full p-3 border rounded-xl"
        autoComplete="tel"
        inputMode="tel"
      />
      <input
        {...form.register('password')}
        type="password"
        placeholder="Password"
        className="w-full p-3 border rounded-xl"
        autoComplete="current-password"
      />
      <button 
        type="submit"
        disabled={form.formState.isSubmitting}
        className="w-full bg-emerald-500 text-white p-3 rounded-xl disabled:opacity-50"
      >
        {form.formState.isSubmitting ? 'Entrando...' : 'Entrar'}
      </button>
    </form>
  ), [form, handleSubmit]);
}, (prevProps, nextProps) => {
  // ✅ CUSTOM COMPARISON FUNCTION
  return (
    prevProps.eventId === nextProps.eventId &&
    prevProps.promoterId === nextProps.promoterId &&
    prevProps.teamId === nextProps.teamId
  );
});

OptimizedGuestForm.displayName = 'OptimizedGuestForm';

export default OptimizedGuestForm;
```

#### **3.2 Image Optimization Avançada**

```typescript
// components/OptimizedImage.tsx
import Image from 'next/image';
import { useState, memo } from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  priority?: boolean;
  className?: string;
}

// ✅ COMPONENT DE IMAGEM ULTRA-OTIMIZADO
const OptimizedImage = memo<OptimizedImageProps>(({
  src,
  alt,
  width,
  height,
  priority = false,
  className = ''
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {isLoading && (
        <div 
          className="absolute inset-0 bg-gray-200 animate-pulse"
          style={{ width, height }}
        />
      )}
      
      {!hasError && (
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          priority={priority}
          quality={85}
          placeholder="blur"
          blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          style={{
            objectFit: 'cover',
            transition: 'opacity 0.3s ease',
            opacity: isLoading ? 0 : 1
          }}
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            setHasError(true);
          }}
        />
      )}
      
      {hasError && (
        <div 
          className="flex items-center justify-center bg-gray-100 text-gray-500"
          style={{ width, height }}
        >
          Imagem não disponível
        </div>
      )}
    </div>
  );
});

OptimizedImage.displayName = 'OptimizedImage';

export default OptimizedImage;
```

### **FASE 4: CACHING E CDN STRATEGY**

#### **4.1 Service Worker para Caching Avançado**

```typescript
// public/sw.js - SERVICE WORKER ULTRA-OTIMIZADO
const CACHE_NAME = 'snapify-v1.0.0';
const STATIC_CACHE = 'snapify-static-v1.0.0';
const API_CACHE = 'snapify-api-v1.0.0';

// ✅ RECURSOS PARA CACHE AGRESSIVO
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/_next/static/css/',
  '/_next/static/chunks/',
  '/images/logo.png',
];

// ✅ INSTALL EVENT
self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then((cache) => {
        return cache.addAll(STATIC_ASSETS);
      }),
      self.skipWaiting(),
    ])
  );
});

// ✅ FETCH EVENT COM STRATEGIES AVANÇADAS
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // ✅ STATIC ASSETS - Cache First
  if (request.destination === 'image' || 
      request.destination === 'style' || 
      request.destination === 'script') {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        return cachedResponse || fetch(request).then((response) => {
          const responseClone = response.clone();
          caches.open(STATIC_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        });
      })
    );
    return;
  }

  // ✅ API CALLS - Network First com Fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).then((response) => {
        // Cache apenas responses 200
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(API_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      }).catch(() => {
        // Fallback para cache em caso de erro de rede
        return caches.match(request);
      })
    );
    return;
  }

  // ✅ HTML PAGES - Stale While Revalidate
  if (request.destination === 'document') {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          const fetchPromise = fetch(request).then((networkResponse) => {
            cache.put(request, networkResponse.clone());
            return networkResponse;
          });
          
          return cachedResponse || fetchPromise;
        });
      })
    );
  }
});
```

#### **4.2 Edge Functions para Global Performance**

```typescript
// middleware.ts - EDGE MIDDLEWARE OTIMIZADO
import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  // ✅ HEADERS DE PERFORMANCE GLOBAIS
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  
  // ✅ CACHE HEADERS INTELIGENTES
  if (request.nextUrl.pathname.startsWith('/_next/static/')) {
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  }
  
  // ✅ PRELOAD HEADERS PARA RECURSOS CRÍTICOS
  if (request.nextUrl.pathname === '/') {
    response.headers.set(
      'Link', 
      '</api/guest/health>; rel=prefetch, <https://fonts.gstatic.com>; rel=preconnect; crossorigin'
    );
  }
  
  return response;
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
```

### **FASE 5: MONITORING E ANALYTICS AVANÇADOS**

#### **5.1 Performance Monitoring Real-Time**

```typescript
// lib/performance-monitor.ts
interface PerformanceMetrics {
  fcp: number;
  lcp: number;
  cls: number;
  fid: number;
  ttfb: number;
}

class PerformanceMonitor {
  private metrics: Partial<PerformanceMetrics> = {};
  
  constructor() {
    this.initializeObservers();
  }
  
  private initializeObservers() {
    // ✅ LARGEST CONTENTFUL PAINT
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      this.metrics.lcp = lastEntry.startTime;
      this.sendMetrics();
    }).observe({ entryTypes: ['largest-contentful-paint'] });
    
    // ✅ FIRST INPUT DELAY
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry: any) => {
        this.metrics.fid = entry.processingStart - entry.startTime;
        this.sendMetrics();
      });
    }).observe({ entryTypes: ['first-input'] });
    
    // ✅ CUMULATIVE LAYOUT SHIFT
    let clsValue = 0;
    new PerformanceObserver((list) => {
      list.getEntries().forEach((entry: any) => {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      });
      this.metrics.cls = clsValue;
      this.sendMetrics();
    }).observe({ entryTypes: ['layout-shift'] });
  }
  
  private sendMetrics() {
    // ✅ ENVIAR METRICS APENAS QUANDO COMPLETAS
    const requiredMetrics = ['lcp', 'fid', 'cls'] as const;
    const hasAllMetrics = requiredMetrics.every(metric => 
      this.metrics[metric] !== undefined
    );
    
    if (hasAllMetrics) {
      fetch('/api/analytics/performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metrics: this.metrics,
          url: window.location.href,
          timestamp: Date.now(),
        }),
      }).catch(console.error);
    }
  }
}

// ✅ INITIALIZE APENAS NO CLIENT
if (typeof window !== 'undefined') {
  new PerformanceMonitor();
}
```

### **FASE 6: DEPLOYMENT E INFRAESTRUTURA**

#### **6.1 Vercel Deployment Otimizado**

```json
// vercel.json - CONFIGURAÇÃO ULTRA-OTIMIZADA
{
  "version": 2,
  "regions": ["lhr1", "fra1"],
  "framework": "nextjs",
  "buildCommand": "next build",
  "outputDirectory": ".next",
  "installCommand": "npm ci",
  "functions": {
    "app/api/**/*.ts": {
      "runtime": "nodejs18.x",
      "maxDuration": 10
    }
  },
  "headers": [
    {
      "source": "/_next/static/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    },
    {
      "source": "/images/(.*)",
      "headers": [
        {
          "key": "Cache-Control", 
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ],
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/api/$1"
    }
  ]
}
```

---

## 📈 **METAS DE PERFORMANCE APÓS IMPLEMENTAÇÃO**

### **🎯 OBJETIVOS ESPECÍFICOS:**
- 🟢 **LCP**: <2.5s (atual: 23.5s) - **Melhoria: 90%**
- 🟢 **Speed Index**: <3.4s (atual: 15.6s) - **Melhoria: 78%**  
- 🟢 **TBT**: <200ms (atual: 15.7s) - **Melhoria: 99%**
- 🟢 **TTI**: <3.8s (atual: 23.5s) - **Melhoria: 84%**
- 🟢 **FID**: <100ms (atual: 6.3s) - **Melhoria: 98%**
- 🟢 **TTFB**: <600ms (atual: 2.9s) - **Melhoria: 79%**
- 🟢 **CLS**: <0.1 (atual: 0.48) - **Melhoria: 79%**

### **🚀 LIGHTHOUSE SCORE ESPERADO:**
- 🟢 **Performance**: **95+/100** (atual: 13/100)
- 🟢 **Accessibility**: **95+/100** (atual: 88/100)
- 🟢 **Best Practices**: **100/100** (atual: 91/100)
- 🟢 **SEO**: **100/100**

---

## 🛠️ **CHECKLIST DE IMPLEMENTAÇÃO**

### **✅ FASE 1 - JAVASCRIPT OPTIMIZATION:**
- [ ] Configurar next.config.js otimizado
- [ ] Implementar dynamic imports
- [ ] Configurar React-Scan para monitoring
- [ ] Implementar bundle analyzer
- [ ] Otimizar component re-renders

### **✅ FASE 2 - SERVER OPTIMIZATION:**
- [ ] Migrar APIs para Edge Runtime
- [ ] Otimizar queries SQL com índices
- [ ] Implementar connection pooling
- [ ] Configurar structured responses
- [ ] Implementar error handling avançado

### **✅ FASE 3 - FRONTEND OPTIMIZATION:**
- [ ] Memoizar componentes críticos
- [ ] Implementar image optimization
- [ ] Configurar lazy loading inteligente
- [ ] Otimizar forms com React Hook Form
- [ ] Implementar skeleton loading

### **✅ FASE 4 - CACHING STRATEGY:**
- [ ] Configurar Service Worker
- [ ] Implementar Edge Functions
- [ ] Configurar headers de cache
- [ ] Implementar CDN strategy
- [ ] Configurar resource hints

### **✅ FASE 5 - MONITORING:**
- [ ] Implementar performance monitoring
- [ ] Configurar error tracking
- [ ] Implementar analytics avançados
- [ ] Configurar alertas de performance
- [ ] Implementar A/B testing framework

### **✅ FASE 6 - DEPLOYMENT:**
- [ ] Configurar Vercel otimizado
- [ ] Implementar CI/CD pipeline
- [ ] Configurar environment variables
- [ ] Implementar health checks
- [ ] Configurar monitoring de produção

---

## 📊 **COMANDOS DE EXECUÇÃO**

```bash
# 1. ANÁLISE ATUAL
npm install @next/bundle-analyzer react-scan
ANALYZE=true npm run build

# 2. IMPLEMENTAR OTIMIZAÇÕES
npm run dev --turbopack

# 3. TESTE DE PERFORMANCE
npx lighthouse http://localhost:3000 --output html
npx react-scan@latest http://localhost:3000

# 4. BUILD OTIMIZADO
npm run build
npm run start

# 5. ANÁLISE FINAL
lighthouse http://localhost:3000 --output json --output-path final-report.json
```

---

## 🎯 **RESULTADO ESPERADO**

Com todas as otimizações implementadas, o site deverá alcançar:

- ⚡ **Carregamento inicial**: <2s
- 🚀 **Time to Interactive**: <3s  
- 📱 **Mobile performance**: 95+ score
- 🖥️ **Desktop performance**: 98+ score
- 🌍 **Global CDN**: <100ms TTFB
- 💾 **Bundle size**: <500KB inicial
- 🔄 **Re-renders**: <5 por interação

**IMPLEMENTAÇÃO IMEDIATA RECOMENDADA PARA TRANSFORMAR SITE DE 13/100 PARA 95+/100! 🚀⚡**
