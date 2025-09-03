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
               
               {/* ✅ PRELOADS REMOVIDOS - Next.js 15 gere automaticamente */}
        
        
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
