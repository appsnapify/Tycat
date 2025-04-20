import type { Metadata } from 'next'
import { Inter, Oswald } from 'next/font/google'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/hooks/use-auth'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import './globals.css'

// Configure Inter (assuming it's the base font)
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
// Configure Oswald (for titles/specific sections)
const oswald = Oswald({ 
  subsets: ['latin'], 
  weight: ['400', '500', '600', '700'], // Include relevant weights
  variable: '--font-oswald' // Define CSS variable
})

export const metadata: Metadata = {
  title: 'Snap',
  description: 'Plataforma de gestão de eventos',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt" className={`${inter.variable} ${oswald.variable} font-sans`}>
      <body>
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
