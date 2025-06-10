'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';

interface AutoLogoutProps {
  children: React.ReactNode;
}

export function AutoLogout({ children }: AutoLogoutProps) {
  const router = useRouter();
  const supabase = createClient();
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const handleLogout = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          console.log('[DEBUG] Usuário logado detectado na página de promo, realizando logout automático');
          setIsLoggedIn(true);
          
          // Pequeno delay antes do logout para garantir que o estado foi atualizado
          timeoutId = setTimeout(async () => {
            await supabase.auth.signOut();
            router.refresh();
            setIsLoggedIn(false);
            setIsLoading(false);
          }, 100);
        } else {
          console.log('[DEBUG] Nenhum usuário logado detectado na página de promo');
          setIsLoggedIn(false);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('[ERROR] Erro durante logout automático:', error);
        setIsLoading(false);
      }
    };

    handleLogout();

    // Cleanup
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [router, supabase.auth]);

  if (isLoading || isLoggedIn) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <div className="flex items-center gap-2 mb-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">
            {isLoggedIn ? 'A fazer logout...' : 'A verificar sessão...'}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          {isLoggedIn 
            ? 'Por favor, aguarde enquanto preparamos a página...'
            : 'Estamos verificando seu acesso...'}
        </p>
      </div>
    );
  }

  return <>{children}</>;
} 