'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useClientAuth } from '@/hooks/useClientAuth';
import { ClientProtectedRoute } from '@/components/client-auth/RequireClientAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { GuestPassQRCode } from '@/components/client/GuestPassQRCode';

interface GuestListRequest {
  id: string;
  event_id: string;
  event_title: string;
  event_date: string;
  status: 'pending' | 'approved' | 'rejected';
  qr_code_url?: string;
}

export default function ClientDashboardPage() {
  const router = useRouter();
  const { user, logout } = useClientAuth();
  const [requests, setRequests] = useState<GuestListRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClientComponentClient();
  
  // Carregar as solicitações do cliente
  useEffect(() => {
    const fetchRequests = async () => {
      if (!user) return;
      
      setIsLoading(true);
      try {
        // Buscar guest list requests do usuário
        const { data, error } = await supabase
          .from('guests')
          .select(`
            id,
            status,
            qr_code_url,
            event:events(id, title, date)
          `)
          .eq('client_user_id', user.id)
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        // Transformar os dados para o formato necessário
        const formattedRequests = data.map((item: any) => ({
          id: item.id,
          event_id: item.event.id,
          event_title: item.event.title,
          event_date: new Date(item.event.date).toLocaleDateString('pt-PT'),
          status: item.status || 'pending',
          qr_code_url: item.qr_code_url
        }));
        
        setRequests(formattedRequests);
      } catch (error) {
        console.error('Erro ao carregar solicitações:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchRequests();
  }, [user]);
  
  const handleLogout = async () => {
    try {
      await logout();
      router.push('/');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };
  
  return (
    <ClientProtectedRoute>
      <div className="container py-8 max-w-5xl">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Dashboard do Cliente</h1>
          <Button variant="outline" onClick={handleLogout}>Sair</Button>
        </div>

        {user && (
          <div className="mb-8">
            <Card>
              <CardHeader>
                <CardTitle>Bem-vindo, {user.firstName}!</CardTitle>
                <CardDescription>
                  Aqui você pode gerenciar seus acessos a eventos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium">Nome</p>
                    <p className="text-sm text-muted-foreground">
                      {user.firstName} {user.lastName}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Email</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Telefone</p>
                    <p className="text-sm text-muted-foreground">{user.phone}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div>
          <GuestPassQRCode />
        </div>
      </div>
    </ClientProtectedRoute>
  );
} 