import './globals.css'
import { Inter, Oswald } from 'next/font/google'
// ✅ REMOVIDOS IMPORTS INEXISTENTES QUE ESTAVAM QUEBRANDO A APLICAÇÃO
// import { Toaster } from 'sonner' // Linha original comentada
// import { AuthProvider } from '@/hooks/use-auth' // REMOVIDO
// import { ClientAuthProvider } from '@/hooks/useClientAuth' // REMOVIDO
// import { ClientAuthProvider } from '@/app/app/_providers/auth-provider' // REMOVIDO - Movido apenas para /app/app/ layout
// import ClientOnlyToaster from '@/app/components/ClientOnlyToaster' // ❌ REMOVIDO - COMPONENTE NÃO EXISTE
// import ClientOnlyWebVitals from '@/app/components/ClientOnlyWebVitals' // ❌ REMOVIDO - COMPONENTE NÃO EXISTE
// import ClientOnlyPerformanceOptimizer from '@/app/components/ClientOnlyPerformanceOptimizer' // ❌ REMOVIDO - COMPONENTE NÃO EXISTE

// Temporariamente removidos para resolver erro crítico
// import { Analytics } from '@vercel/analytics/react'
// import { SpeedInsights } from '@vercel/speed-insights/next'

// ✅ FONTS OTIMIZADAS PARA MELHOR LCP
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  preload: false, // ✅ REMOVIDO PRELOAD PARA MELHORAR LCP
  fallback: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Arial', 'sans-serif'],
  adjustFontFallback: true,
  weight: ['400', '500', '600', '700'],
})

// Oswald só carrega quando necessário
const oswald = Oswald({
  subsets: ['latin'],
  weight: ['600', '700'],
  variable: '--font-oswald',
  display: 'swap',
  preload: false,
  fallback: ['Impact', 'Arial Black', 'Helvetica Neue', 'sans-serif'],
  adjustFontFallback: true,
})

export const metadata = {
  title: 'TYCAT - Gestão Completa de Eventos',
  description: 'Plataforma completa para gestão de eventos com guest lists inteligentes, venda de bilhetes e analytics em tempo real. Comece grátis hoje!',
  keywords: 'gestão eventos, guest list, bilhetes, promotores, equipas, analytics',
  authors: [{ name: 'TYCAT' }],
  creator: 'TYCAT',
  publisher: 'TYCAT',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  // Icons removidos do metadata pois estão sendo definidos no head diretamente
  openGraph: {
    title: 'TYCAT - Gestão Completa de Eventos',
    description: 'Plataforma intuitiva para gestão de eventos, guest lists e bilhetes',
    type: 'website',
    locale: 'pt_PT',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TYCAT - Gestão Completa de Eventos',
    description: 'Plataforma intuitiva para gestão de eventos, guest lists e bilhetes',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover'
}

// Executar migrações em segundo plano
const runMigrationsInBackground = async () => {
  // Importamos o módulo de migrações dinamicamente para evitar problemas durante a renderização
  const { runPendingMigrations } = await import('@/lib/supabase/runMigrations');
  
  try {
    await runPendingMigrations();
    console.log('Migrações executadas com sucesso em segundo plano');
  } catch (error) {
    console.error('Erro ao executar migrações em segundo plano:', error);
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Desativando execução automática de migrações para evitar erros
  // As migrações devem ser executadas por um endpoint API dedicado
  // com autenticação adequada
  
  /* 
  // Código desativado temporariamente
  if (typeof window === 'undefined') {
    // Ignoramos o resultado da promessa para evitar bloquear a renderização
    runMigrationsInBackground().catch(console.error);
  }
  */

  return (
    <html lang="pt" className={`${inter.variable} ${oswald.variable} font-sans`}>
      <head>
        {/* ✅ RESOURCE HINTS OTIMIZADOS - Removido preload desnecessário para melhorar LCP */}
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="dns-prefetch" href="//xejpwdpumzalewamttjv.supabase.co" />
        <link rel="dns-prefetch" href="//api.qrserver.com" />
        
        {/* ✅ FAVICON LINKS */}
        <link rel="icon" href="/favicon.ico" sizes="16x16" type="image/x-icon" />
        <link rel="icon" href="/favicon.svg" sizes="any" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/placeholder-logo.png" sizes="180x180" type="image/png" />
        
        {/* ✅ PERFORMANCE HINTS */}
        <meta name="format-detection" content="telephone=no, date=no, email=no, address=no" />
      </head>
      <body className="overscroll-none">
        {children}
        {/* ✅ COMPONENTES REMOVIDOS TEMPORARIAMENTE PARA RESOLVER ERRO */}
        {/* <Toaster /> - REMOVIDO: Componente não existe */}
        {/* <WebVitals /> - REMOVIDO: Componente não existe */}
        {/* <PerformanceOptimizer /> - REMOVIDO: Componente não existe */}
        {/* <Analytics /> - REMOVIDO TEMPORARIAMENTE: Pode estar causando erro */}
        {/* <SpeedInsights /> - REMOVIDO TEMPORARIAMENTE: Pode estar causando erro */}
        
        {/* ✅ SERVICE WORKER REGISTRATION OTIMIZADO */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Service Worker registration otimizado
              if ('serviceWorker' in navigator && location.protocol === 'https:') {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                    .then(function(registration) {
                      console.log('SW registered: ', registration.scope);
                    })
                    .catch(function(error) {
                      console.log('SW registration failed: ', error);
                    });
                });
              }
            `
          }}
        />
      </body>
    </html>
  )
}
