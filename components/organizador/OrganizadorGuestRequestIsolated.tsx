'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserCheck, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface OrganizadorGuestRequestIsolatedProps {
  eventId: string;
  className?: string;
}

/**
 * Componente ISOLADO para acesso à guest list da organização
 * Redireciona para sistema /login/cliente completamente isolado
 * Remove dependências de client-auth-v2/v3 que causam logs PHONE-CACHE-V2
 */
export function OrganizadorGuestRequestIsolated({
  eventId,
  className = ''
}: OrganizadorGuestRequestIsolatedProps) {
  const router = useRouter();

  const handleRequestAccess = () => {
    // Construir URL de redirecionamento para sistema isolado com contexto de organização
    const redirectUrl = `/login/cliente?redirect=/g/${eventId}&eventId=${eventId}&context=organizacao`;
    
    console.log('🔄 [ORGANIZADOR-ISOLATED] Redirecionando para sistema isolado:', redirectUrl);
    
    // Redirecionar para sistema completamente isolado
    router.push(redirectUrl);
  };

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader>
        <CardTitle className="text-xl text-center">
          Acesse a lista de convidados
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-center gap-2 text-green-600">
            <UserCheck className="h-6 w-6" />
            <span className="font-medium">Acesso da Organização</span>
          </div>
          
          <Button 
            onClick={handleRequestAccess}
            className="w-full group relative overflow-hidden text-white font-semibold transition-all duration-300 hover:scale-105"
            style={{
              background: '#6366f1',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 24px',
              fontSize: '14px',
              fontWeight: '600',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)',
              transition: 'all 0.2s ease'
            }}
          >
            <span>Solicitar QR Code</span>
            <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Button>
          
          <p className="text-sm text-center text-muted-foreground">
            Faça login para obter seu QR code de entrada
          </p>
        </div>
      </CardContent>
    </Card>
  );
} 