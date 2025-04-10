import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/hooks/use-auth'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Snap',
  description: 'Plataforma de gestão de eventos',
}

// Adicionar logs para depurar problemas de carregamento
if (typeof window !== 'undefined') {
  // Só executar no cliente
  console.log('[RootLayout] Inicializando app no navegador');
  
  // Verificar se temos tokens no localStorage
  try {
    const hasSupabaseSession = Object.keys(localStorage).some(key => 
      key.startsWith('sb-') || key.startsWith('supabase.')
    );
    
    console.log('[RootLayout] Tokens Supabase detectados:', hasSupabaseSession);
  } catch (e) {
    console.warn('[RootLayout] Erro ao verificar localStorage:', e);
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Registrar quando o layout é montado
  if (typeof window !== 'undefined') {
    console.log('[RootLayout] Renderizando componente');
  }
  
  return (
    <html lang="pt">
      <body className={inter.className}>
        <AuthProvider>
          {children}
          <Toaster />
          <Analytics />
          <SpeedInsights />
        </AuthProvider>
      </body>
    </html>
  )
}
