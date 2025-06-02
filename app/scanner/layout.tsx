import type { Metadata, Viewport } from 'next'
import ScannerServiceWorker from './components/ScannerServiceWorker'

export const metadata: Metadata = {
  title: 'SNAP Scanner - Sistema de Entrada',
  description: 'Scanner móvel para funcionários - Sistema SNAP',
  manifest: '/scanner-manifest.json'
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#4f46e5'
}

export default function ScannerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50 font-sans antialiased">
      <ScannerServiceWorker />
      {children}
    </div>
  )
} 