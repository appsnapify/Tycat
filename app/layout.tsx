import './globals.css'
import { Inter, Oswald } from 'next/font/google'
// import { Toaster } from 'sonner' // Linha original comentada
import { Toaster } from '@/components/ui/toaster' // Nova linha para shadcn/ui Toaster
// import { AuthProvider } from '@/hooks/use-auth' // REMOVIDO
// import { ClientAuthProvider } from '@/hooks/useClientAuth' // REMOVIDO
// import { ClientAuthProvider } from '@/app/app/_providers/auth-provider' // REMOVIDO - Movido apenas para /app/app/ layout
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'

// Configure Inter (assuming it's the base font)
const inter = Inter({ 
  subsets: ['latin'], 
  variable: '--font-inter',
  display: 'swap', // ✅ FONT SWAP para evitar CLS
  preload: true,
  fallback: ['system-ui', 'arial'] // ✅ FALLBACK FONTS
})
// Configure Oswald (for titles/specific sections) - OTIMIZADO
const oswald = Oswald({ 
  subsets: ['latin'], 
  weight: ['400', '500', '600', '700'], // Include relevant weights
  variable: '--font-oswald', // Define CSS variable
  display: 'swap', // ✅ FONT SWAP para evitar CLS
  preload: true,
  fallback: ['Impact', 'Arial Black', 'sans-serif'] // ✅ FALLBACK FONTS
})

export const metadata = {
  title: 'Tycat',
  description: 'Plataforma de gestão de eventos',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '16x16', type: 'image/x-icon' },
      { url: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' }
    ]
  }
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
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
                       {/* ✅ RESOURCE HINTS AGRESSIVOS PARA VERCEL */}
               <link rel="preconnect" href="https://xejpwdpumzalewamttjv.supabase.co" />
               <link rel="dns-prefetch" href="//xejpwdpumzalewamttjv.supabase.co" />
               <link rel="dns-prefetch" href="//api.qrserver.com" />
               <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
               
               {/* ✅ PRELOAD CRÍTICOS JAVASCRIPT */}
               <link rel="modulepreload" href="/_next/static/chunks/webpack.js" />
               <link rel="modulepreload" href="/_next/static/chunks/main.js" />
               <link rel="modulepreload" href="/_next/static/chunks/pages/_app.js" />
               
               {/* ✅ PREFETCH RECURSOS SECUNDÁRIOS */}
               <link rel="prefetch" href="/_next/static/chunks/framer-motion.js" />
               <link rel="prefetch" href="/_next/static/chunks/lucide-react.js" />
        
                       {/* ✅ CSS CRÍTICO INLINE EXPANDIDO PARA LCP */}
               <style dangerouslySetInnerHTML={{
                 __html: `
                   /* Loading & Layout críticos */
                   .loading-skeleton {
                     background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
                     background-size: 200% 100%;
                     animation: loading 1.5s infinite;
                   }
                   @keyframes loading {
                     0% { background-position: 200% 0; }
                     100% { background-position: -200% 0; }
                   }
                   
                   /* Layout essenciais */
                   .min-h-screen { min-height: 100vh; }
                   .flex { display: flex; }
                   .items-center { align-items: center; }
                   .justify-center { justify-content: center; }
                   .relative { position: relative; }
                   .absolute { position: absolute; }
                   .block { display: block; }
                   .inline-block { display: inline-block; }
                   
                   /* Typography crítico */
                   .text-4xl { font-size: 2.25rem; line-height: 2.5rem; }
                   .text-lg { font-size: 1.125rem; line-height: 1.75rem; }
                   .font-bold { font-weight: 700; }
                   .font-medium { font-weight: 500; }
                   .text-center { text-align: center; }
                   .leading-tight { line-height: 1.25; }
                   
                   /* Colors críticos */
                   .text-slate-800 { color: rgb(30 41 59); }
                   .text-slate-600 { color: rgb(71 85 105); }
                   .text-emerald-600 { color: rgb(5 150 105); }
                   .text-violet-600 { color: rgb(124 58 237); }
                   .text-white { color: rgb(255 255 255); }
                   
                   /* Backgrounds críticos */
                   .bg-gradient-to-br { background-image: linear-gradient(to bottom right, var(--tw-gradient-stops)); }
                   .bg-emerald-500 { background-color: rgb(16 185 129); }
                   .bg-white { background-color: rgb(255 255 255); }
                   
                   /* Spacing crítico */
                   .mb-6 { margin-bottom: 1.5rem; }
                   .mb-10 { margin-bottom: 2.5rem; }
                   .mt-2 { margin-top: 0.5rem; }
                   .px-8 { padding-left: 2rem; padding-right: 2rem; }
                   .py-3 { padding-top: 0.75rem; padding-bottom: 0.75rem; }
                   
                   /* Buttons críticos */
                   .rounded-md { border-radius: 0.375rem; }
                   .shadow-lg { box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1); }
                   .transition-all { transition-property: all; transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); transition-duration: 150ms; }
                   
                   /* Hide non-critical content initially */
                   .motion-safe\\:animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
                   @keyframes pulse {
                     0%, 100% { opacity: 1; }
                     50% { opacity: .5; }
                   }
                 `
               }} />
      </head>
      <body className="overscroll-none">
        {children}
        <Toaster />
        {process.env.NODE_ENV === 'production' && <Analytics />}
        {process.env.NODE_ENV === 'production' && <SpeedInsights />}
      </body>
    </html>
  )
}
