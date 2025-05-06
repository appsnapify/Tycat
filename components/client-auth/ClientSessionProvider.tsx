'use client';

import { useClientAuth } from '@/hooks/useClientAuth';
import { ReactNode, useEffect, useState } from 'react';

export function ClientSessionProvider({ children }: { children: ReactNode }) {
  const { user, isLoading, checkAuth } = useClientAuth();
  const [isInitialized, setIsInitialized] = useState(false);

  // Verificar autenticação no carregamento inicial
  useEffect(() => {
    const init = async () => {
      await checkAuth();
      setIsInitialized(true);
    };
    
    init();
  }, [checkAuth]);

  // Aguardar carregamento inicial antes de renderizar o conteúdo
  if (!isInitialized && isLoading) {
    return null; // ou um componente de loading
  }

  return <>{children}</>;
} 