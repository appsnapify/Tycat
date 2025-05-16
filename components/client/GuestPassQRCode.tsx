'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useClientAuth } from '@/hooks/useClientAuth';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, MapPin } from 'lucide-react';

interface GuestPass {
  id: string;
  event_id: string;
  status: string;
  qr_code_url: string;
  created_at: string;
  event: {
    name: string;
    start_date: string;
    location: string;
    flyer_url?: string;
  };
}

export function GuestPassQRCode() {
  const { user } = useClientAuth();
  const [passes, setPasses] = useState<GuestPass[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClientComponentClient();

  useEffect(() => {
    const fetchPasses = async () => {
      if (!user) return;
      
      try {
        // Buscar os passes do usuário com detalhes do evento
        const { data, error } = await supabase
          .from('guests')
          .select(`
            id,
            event_id,
            status,
            qr_code_url,
            created_at,
            event:events(
              name,
              start_date,
              location,
              flyer_url
            )
          `)
          .eq('client_user_id', user.id)
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        if (data) {
          setPasses(data as GuestPass[]);
        }
      } catch (error) {
        console.error('Erro ao buscar passes:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchPasses();
  }, [user]);
  
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-3/4" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }
  
  if (passes.length === 0) {
    return (
      <Card className="text-center py-8">
        <CardContent>
          <p className="mb-4">Você ainda não tem ingressos.</p>
          <p className="text-sm text-muted-foreground">
            Peça acesso a eventos através dos links dos promotores.
          </p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Meus Ingressos</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {passes.map((pass) => (
          <Card key={pass.id} className="overflow-hidden">
            {pass.event.flyer_url && (
              <div className="h-40 overflow-hidden">
                <img 
                  src={pass.event.flyer_url} 
                  alt={`Flyer do evento ${pass.event.name}`}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            
            <CardHeader>
              <CardTitle>{pass.event.name}</CardTitle>
              <div className="flex items-center text-sm text-muted-foreground gap-1 mt-1">
                <Calendar className="h-4 w-4" />
                <span>
                  {new Date(pass.event.start_date).toLocaleDateString('pt-PT')}
                </span>
              </div>
              <div className="flex items-center text-sm text-muted-foreground gap-1">
                <MapPin className="h-4 w-4" />
                <span>{pass.event.location}</span>
              </div>
            </CardHeader>
            
            <CardContent className="flex justify-center">
              {pass.qr_code_url ? (
                <div className="bg-white p-4 rounded-lg shadow-md max-w-[200px]">
                  <img 
                    src={pass.qr_code_url} 
                    alt="QR Code de Acesso" 
                    className="w-full h-auto"
                  />
                  <p className="text-xs mt-2 text-center text-muted-foreground">
                    Apresente este QR code na entrada
                  </p>
                </div>
              ) : (
                <div className="bg-gray-100 p-4 rounded-lg text-center">
                  <p className="text-muted-foreground">
                    {pass.status === 'pending' ? 'Aguardando aprovação' : 'QR Code não disponível'}
                  </p>
                </div>
              )}
            </CardContent>
            
            <CardFooter className="flex justify-between bg-muted/50 px-6 py-3">
              <div className="text-xs font-medium">
                Status: 
                <span className={`ml-1 ${
                  pass.status === 'approved' ? 'text-green-600' : 
                  pass.status === 'pending' ? 'text-amber-600' : 
                  'text-red-600'
                }`}>
                  {pass.status === 'approved' ? 'Aprovado' : 
                   pass.status === 'pending' ? 'Pendente' : 
                   'Rejeitado'}
                </span>
              </div>
              <Button variant="outline" size="sm" className="text-xs px-2">
                Detalhes
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
} 