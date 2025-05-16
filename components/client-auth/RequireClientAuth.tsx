'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useClientAuth } from '@/hooks/useClientAuth';
import { ClientSessionProvider } from './ClientSessionProvider';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ClientProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isLoading } = useClientAuth();
  const router = useRouter();

  useEffect(() => {
    // Se não estiver carregando e o usuário não existir, redirecionar para login
    if (!isLoading && !user) {
      router.push('/client/auth');
    }
  }, [user, isLoading, router]);

  // Mostrar nada enquanto verifica autenticação
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Se o usuário estiver autenticado, mostrar o conteúdo protegido
  if (user) {
    return <>{children}</>;
  }

  // Se não estiver autenticado, não mostrar nada (o efeito vai redirecionar)
  return null;
}

// Componente de wrapper com o provedor de sessão
export function ClientProtectedRouteWrapper({ 
  children, 
  redirectTo = '/client/auth' 
}: { 
  children: React.ReactNode;
  redirectTo?: string;
}) {
  return (
    <ClientSessionProvider>
      <ClientProtectedRoute>
        {children}
      </ClientProtectedRoute>
    </ClientSessionProvider>
  );
} 