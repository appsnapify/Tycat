'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useClientAuth } from '@/hooks/useClientAuth';
import { ClientProtectedRoute } from '@/components/client-auth/RequireClientAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';

interface Event {
  id: string;
  title: string;
  date: string;
  location: string;
  image_url?: string;
}

export default function GuestListPage() {
  const router = useRouter();
  const { user } = useClientAuth();
  const searchParams = useSearchParams();
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const supabase = createClientComponentClient();
  
  // Obter o ID do evento da URL, se presente
  useEffect(() => {
    const eventId = searchParams.get('event_id');
    if (eventId) {
      setSelectedEvent(eventId);
    }
  }, [searchParams]);
  
  // Carregar eventos disponíveis
  useEffect(() => {
    const fetchEvents = async () => {
      if (!user) return;
      
      setIsLoading(true);
      try {
        // Buscar eventos ativos e publicados
        const { data, error } = await supabase
          .from('events')
          .select('id, title, date, location, image_url')
          .eq('is_published', true)
          .eq('is_active', true)
          .gte('date', new Date().toISOString().split('T')[0])
          .order('date', { ascending: true });
        
        if (error) throw error;
        
        // Formatar os dados
        const formattedEvents = data.map(event => ({
          id: event.id,
          title: event.title,
          date: new Date(event.date).toLocaleDateString('pt-PT'),
          location: event.location,
          image_url: event.image_url
        }));
        
        setEvents(formattedEvents);
      } catch (error) {
        console.error('Erro ao carregar eventos:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchEvents();
  }, [user]);
  
  const handleRequestAccess = async (eventId: string) => {
    if (!user) return;
    
    setIsSubmitting(true);
    try {
      // Verificar se já existe um pedido para este evento e usuário
      const { data: existingRequest, error: checkError } = await supabase
        .from('guests')
        .select('id')
        .eq('event_id', eventId)
        .eq('client_user_id', user.id)
        .maybeSingle();
      
      if (checkError) throw checkError;
      
      if (existingRequest) {
        // Já existe um pedido, redirecionar para o dashboard
        router.push('/cliente/dashboard');
        return;
      }
      
      // Criar nova solicitação
      const { error: createError } = await supabase
        .from('guests')
        .insert({
          event_id: eventId,
          name: `${user.firstName} ${user.lastName}`,
          phone: user.phone,
          client_user_id: user.id,
          status: 'pending'
        });
      
      if (createError) throw createError;
      
      // Redirecionar para o dashboard após o sucesso
      router.push('/cliente/dashboard');
      
    } catch (error) {
      console.error('Erro ao solicitar acesso:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <ClientProtectedRoute>
      <div className="min-h-screen bg-slate-50 p-4">
        <div className="container mx-auto max-w-4xl">
          <header className="mb-8">
            <div className="flex justify-between items-center">
              <h1 className="text-3xl font-bold">Solicitar Ingresso</h1>
              <Link href="/user/dashboard">
                <Button variant="outline">Voltar ao Painel</Button>
              </Link>
            </div>
            <p className="text-muted-foreground mt-2">
              Selecione um evento para solicitar o seu ingresso.
            </p>
          </header>
          
          {isLoading ? (
            <div className="text-center p-8">A carregar eventos...</div>
          ) : events.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {events.map((event) => (
                <Card key={event.id} className={`overflow-hidden ${selectedEvent === event.id ? 'ring-2 ring-primary' : ''}`}>
                  {event.image_url && (
                    <div className="aspect-video w-full overflow-hidden">
                      <img 
                        src={event.image_url} 
                        alt={event.title} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <CardContent className="p-4">
                    <h3 className="text-xl font-semibold">{event.title}</h3>
                    <div className="text-sm text-muted-foreground mt-1">
                      <p>Data: {event.date}</p>
                      <p>Local: {event.location}</p>
                    </div>
                    <Button 
                      className="w-full mt-4" 
                      onClick={() => handleRequestAccess(event.id)}
                      disabled={isSubmitting}
                    >
                      {isSubmitting && selectedEvent === event.id 
                        ? 'A processar...' 
                        : 'Solicitar Acesso'}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center p-8 bg-white rounded-lg border">
              <p>Não existem eventos disponíveis no momento.</p>
            </div>
          )}
        </div>
      </div>
    </ClientProtectedRoute>
  );
} 