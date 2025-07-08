'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface GuestRequestClientIsolatedProps {
  eventId: string;
  promoterId: string;
  teamId: string;
  className?: string;
  buttonStyle?: React.CSSProperties;
}

/**
 * Componente ISOLADO para solicitar acesso a guest list
 * Redireciona para sistema /login/cliente completamente isolado
 * Remove dependências de client-auth-v2/v3 que causam logs PHONE-CACHE-V2
 */
export function GuestRequestClientIsolated({
  eventId,
  promoterId,
  teamId,
  className = '',
  buttonStyle
}: GuestRequestClientIsolatedProps) {
  const router = useRouter();

  const handleRequestAccess = () => {
    // Construir URL de redirecionamento para sistema isolado
    const redirectUrl = `/login/cliente?redirect=/promo/${eventId}/${promoterId}/${teamId}&eventId=${eventId}&promoterId=${promoterId}&teamId=${teamId}`;
    
    console.log('🔄 [GUEST-REQUEST-ISOLATED] Redirecionando para sistema isolado:', redirectUrl);
    
    // Redirecionar para sistema completamente isolado
    router.push(redirectUrl);
  };

  return (
    <Button
      onClick={handleRequestAccess}
      className={`group relative overflow-hidden text-white font-semibold transition-all duration-300 hover:scale-105 ${className}`}
      style={buttonStyle || {
        background: '#6366f1',
        color: 'white',
        border: 'none',
        borderRadius: '25px',
        padding: '12px 24px',
        fontSize: '14px',
        fontWeight: '600',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)',
        transition: 'all 0.2s ease',
        textTransform: 'none',
        letterSpacing: 'normal',
        width: 'auto',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        cursor: 'pointer'
      }}
    >
      <span>Solicitar Acesso</span>
      <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
    </Button>
  );
} 