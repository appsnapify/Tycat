'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ClientAuthFlow } from '@/components/client-auth/ClientAuthFlow';
import { useClientAuth } from '@/hooks/useClientAuth';
import { ClientSessionProvider } from '@/components/client-auth/ClientSessionProvider';

export default function ClientAuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading } = useClientAuth();
  const [initialPhone, setInitialPhone] = useState('');
  
  // Pegar parâmetros de query como redirect e phone
  useEffect(() => {
    const phone = searchParams.get('phone');
    if (phone) {
      setInitialPhone(phone);
    }
  }, [searchParams]);
  
  // Redirecionar se usuário já estiver autenticado
  useEffect(() => {
    if (user && !isLoading) {
      // Verificar se veio de uma página de promotor
      const redirectUrl = searchParams.get('redirect');
      
      // Se for da página do promotor, retornar para lá após login
      if (redirectUrl && redirectUrl.includes('/promo/')) {
        router.push(redirectUrl);
      } else {
        // Caso contrário, ir para o dashboard
        router.push('/user/dashboard');
      }
    }
  }, [user, isLoading, router, searchParams]);
  
  const handleAuthComplete = (userData: any) => {
    // Verificar se veio de uma página de promotor
    const redirectUrl = searchParams.get('redirect');
    
    // Se for da página do promotor, retornar para lá após login
    if (redirectUrl && redirectUrl.includes('/promo/')) {
      router.push(redirectUrl);
    } else {
      // Caso contrário, ir para o dashboard
      router.push('/user/dashboard');
    }
  };
  
  return (
    <ClientSessionProvider>
      <div className="min-h-screen w-full flex flex-col justify-center items-center p-4 bg-slate-50">
        <div className="w-full max-w-md rounded-lg border bg-white p-6 shadow-sm">
          <ClientAuthFlow 
            onComplete={handleAuthComplete} 
            initialPhone={initialPhone}
          />
        </div>
      </div>
    </ClientSessionProvider>
  );
} 