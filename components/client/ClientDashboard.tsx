'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, MapPin, QrCode, Settings, User, LogOut } from 'lucide-react';
import { useClientAuth } from '@/contexts/client/ClientAuthContext';
import { ClientEvent } from '@/types/client';
import { toast } from 'sonner';

// ✅ COMPLEXIDADE: 3 pontos (1 base + 2 condições)
export default function ClientDashboard() {
  const { clientUser, logout } = useClientAuth();
  const [upcomingEvents, setUpcomingEvents] = useState<ClientEvent[]>([]);
  const [pastEvents, setPastEvents] = useState<ClientEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // ✅ FUNÇÃO: Carregar eventos (Complexidade: 3)
  const loadEvents = async () => {
    if (!clientUser) return; // +1
    
    setIsLoading(true);
    try {
      // Carregar eventos próximos e passados em paralelo
      const [upcomingResponse, pastResponse] = await Promise.all([
        fetch(`/api/client/events/${clientUser.id}?type=upcoming`),
        fetch(`/api/client/events/${clientUser.id}?type=past`)
      ]);

      if (upcomingResponse.ok) { // +1
        const upcomingData = await upcomingResponse.json();
        if (upcomingData.success) {
          setUpcomingEvents(upcomingData.data || []);
        }
      }

      if (pastResponse.ok) { // +1
        const pastData = await pastResponse.json();
        if (pastData.success) {
          setPastEvents(pastData.data || []);
        }
      }
    } catch (error) {
      console.error('Error loading events:', error);
      toast.error('Erro ao carregar eventos');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [clientUser]);

  // ✅ FUNÇÃO: Handle logout (Complexidade: 1)
  const handleLogout = () => {
    logout();
    toast.success('Sessão terminada');
  };

  if (!clientUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-slate-600">A carregar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">T</span>
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">
                Olá, {clientUser.first_name}!
              </h1>
              <p className="text-slate-600">Bem-vindo à TYCAT</p>
            </div>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Settings className="h-4 w-4" />
            Definições
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2 text-red-600 border-red-200 hover:bg-red-50"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <Calendar className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{upcomingEvents.length}</p>
                <p className="text-sm text-slate-600">Próximos Eventos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-violet-100 rounded-lg">
                <QrCode className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{pastEvents.length}</p>
                <p className="text-sm text-slate-600">Eventos Passados</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <User className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">Ativo</p>
                <p className="text-sm text-slate-600">Status da Conta</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Próximos Eventos */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-slate-800 mb-4">Próximos Eventos</h2>
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600 mx-auto mb-4"></div>
            <p className="text-slate-600">A carregar eventos...</p>
          </div>
        ) : upcomingEvents.length > 0 ? (
          <div className="grid gap-4">
            {upcomingEvents.map((event) => (
              <Card key={event.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row gap-4">
                    {event.event_flyer_url && (
                      <div className="w-full sm:w-20 h-20 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0">
                        <img 
                          src={event.event_flyer_url} 
                          alt={event.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex flex-col sm:flex-row justify-between items-start gap-2 mb-2">
                        <h3 className="font-semibold text-slate-800">{event.title}</h3>
                        <Badge variant={event.checked_in ? "default" : "secondary"}>
                          {event.checked_in ? "Check-in feito" : "Pendente"}
                        </Badge>
                      </div>
                      
                      <div className="space-y-1 text-sm text-slate-600">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>{new Date(event.event_date).toLocaleDateString('pt-PT')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <span>{event.start_time} - {event.end_time}</span>
                        </div>
                        {event.location && (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            <span>{event.location}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex gap-2 mt-3">
                        <Button size="sm" variant="outline" className="gap-2">
                          <QrCode className="h-4 w-4" />
                          Ver QR Code
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <Calendar className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-800 mb-2">Nenhum evento próximo</h3>
              <p className="text-slate-600">Quando se registar em eventos, eles aparecerão aqui.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Eventos Passados */}
      <div>
        <h2 className="text-xl font-bold text-slate-800 mb-4">Eventos Passados</h2>
        {pastEvents.length > 0 ? (
          <div className="grid gap-4">
            {pastEvents.slice(0, 3).map((event) => (
              <Card key={event.id} className="opacity-75">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-slate-700">{event.title}</h3>
                      <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                        <span>{new Date(event.event_date).toLocaleDateString('pt-PT')}</span>
                        {event.checked_in && (
                          <Badge variant="outline" className="text-green-600 border-green-200">
                            Participou
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <Clock className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-800 mb-2">Nenhum evento passado</h3>
              <p className="text-slate-600">O histórico dos seus eventos aparecerá aqui.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

