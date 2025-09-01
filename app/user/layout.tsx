import { Metadata } from 'next';
import { ClientAuthProvider } from '@/contexts/client/ClientAuthContext';
import { ClientSessionProvider } from '@/contexts/client/ClientSessionContext';
import { Toaster } from '@/components/ui/sonner';
// CSS global já importado no root layout (app/layout.tsx)

export const metadata: Metadata = {
  title: 'TYCAT - Área do Cliente',
  description: 'Gerencie seus eventos e QR codes',
  robots: 'noindex, nofollow', // Privado - não indexar
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

// ✅ COMPLEXIDADE: 1 ponto (apenas JSX)
export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClientAuthProvider>
      <ClientSessionProvider>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30">
          {children}
        </div>
        <Toaster />
      </ClientSessionProvider>
    </ClientAuthProvider>
  );
}
