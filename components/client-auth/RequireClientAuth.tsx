'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useClientAuth } from '@/hooks/useClientAuth';
import { ClientSessionProvider } from './ClientSessionProvider';

export default function RequireClientAuth({ 
  children, 
  redirectTo = '/client/auth' 
}: { 
  children: React.ReactNode;
  redirectTo?: string;
}) {
  const router = useRouter();
  const { user, isLoading } = useClientAuth();
  
  useEffect(() => {
    // Redirecionar apenas após o carregamento inicial e se não houver usuário
    if (!isLoading && !user) {
      const queryParam = new URLSearchParams({ redirect: window.location.pathname }).toString();
      router.push(`${redirectTo}?${queryParam}`);
    }
  }, [user, isLoading, redirectTo, router]);
  
  // Não mostrar nada enquanto está carregando ou se não há usuário
  if (isLoading || !user) {
    return null; // ou um componente de loading
  }
  
  // Mostrar o conteúdo protegido quando autenticado
  return <>{children}</>;
}

// Componente de wrapper com o provedor de sessão
export function ClientProtectedRoute({ 
  children, 
  redirectTo = '/client/auth' 
}: { 
  children: React.ReactNode;
  redirectTo?: string;
}) {
  return (
    <ClientSessionProvider>
      <RequireClientAuth redirectTo={redirectTo}>
        {children}
      </RequireClientAuth>
    </ClientSessionProvider>
  );
} 