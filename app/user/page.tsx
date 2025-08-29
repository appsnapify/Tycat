'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useClientAuth } from '@/contexts/client/ClientAuthContext';

// ✅ COMPLEXIDADE: 2 pontos (1 base + 1 if)
export default function UserRootPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useClientAuth();

  useEffect(() => {
    if (!isLoading) { // +1
      if (isAuthenticated) {
        // Se autenticado, redirecionar para dashboard
        router.push('/user/dashboard');
      } else {
        // Se não autenticado, redirecionar para login
        router.push('/user/login');
      }
    }
  }, [isAuthenticated, isLoading, router]);

  // Mostrar loading enquanto verifica autenticação
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-emerald-50/30">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
        <p className="mt-4 text-sm text-slate-600">A carregar...</p>
      </div>
    </div>
  );
}

