'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useClientAuth } from '@/hooks/useClientAuth';
import { Heart, QrCode, Calendar, MapPin, Settings, Users, Ticket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import Image from 'next/image';
import { motion } from 'framer-motion';

interface EventGuest {
  id: string;
  event_id: string;
  qr_code_url: string;
  title: string;
  date: string;
  location: string;
  flyer_url: string;
}

export default function ClientDashboardPage() {
  const router = useRouter();
  const { user, logout, isLoading } = useClientAuth();
  const [events, setEvents] = useState<EventGuest[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<'guest' | 'bilhetes'>('guest');
  const [selectedEvent, setSelectedEvent] = useState<EventGuest | null>(null);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [loadingEvents, setLoadingEvents] = useState(true);

  // Verificação de autenticação simples
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login/cliente');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (user?.id) {
      fetchUserEvents();
    }
  }, [user]);

  const fetchUserEvents = async () => {
    if (!user?.id) return;
    
    setLoadingEvents(true);
    try {
      console.log('Buscando eventos para utilizador:', user.id);
      const response = await fetch(`/api/client-auth/user-events?userId=${user.id}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Eventos recebidos:', data.events);
        setEvents(data.events || []);
      } else {
        console.error('Erro na resposta da API:', response.status);
        setEvents([]);
      }
    } catch (error) {
      console.error('Erro ao buscar eventos:', error);
      setEvents([]);
    } finally {
      setLoadingEvents(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login/cliente');
  };

  const openQrModal = (event: EventGuest) => {
    setSelectedEvent(event);
    setQrModalOpen(true);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-PT', { 
      day: 'numeric', 
      month: 'short' 
    });
  };

  // Categorizar eventos por data
  const categorizeEvents = (events: EventGuest[]) => {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));
    
    const upcoming: EventGuest[] = [];
    const recent: EventGuest[] = []; // Eventos passados há menos de 24h
    const past: EventGuest[] = [];   // Eventos passados há mais de 24h
    
    events.forEach(event => {
      const eventDate = new Date(event.date);
      
      if (eventDate > now) {
        // Evento no futuro
        upcoming.push(event);
      } else if (eventDate > twentyFourHoursAgo) {
        // Evento passou há menos de 24h (ainda visível)
        recent.push(event);
      } else {
        // Evento passou há mais de 24h
        past.push(event);
      }
    });
    
    // Ordenar por data
    upcoming.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    recent.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    past.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    return { upcoming, recent, past };
  };

  const { upcoming, recent, past } = categorizeEvents(events);

  // Loading screen para autenticação
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500 mx-auto mb-4"></div>
          <p className="text-white">A carregar...</p>
        </div>
      </div>
    );
  }

  // Se não há usuário, não mostrar nada (será redirecionado)
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      {/* Header Moderno */}
      <div className="px-4 sm:px-6 pt-8 sm:pt-12 pb-4 sm:pb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
              <span className="text-lg sm:text-xl font-bold text-black">
                {user?.firstName?.charAt(0) || 'U'}
              </span>
            </div>
            <div>
              <p className="text-gray-400 text-xs sm:text-sm">Bem-vindo de volta</p>
              <h1 className="text-lg sm:text-xl font-bold">
                {user?.firstName || 'Cliente'} {user?.lastName || ''}
              </h1>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="icon"
              className="text-gray-400 hover:text-white w-8 h-8 sm:w-10 sm:h-10"
            >
              <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="text-gray-400 hover:text-red-400 w-8 h-8 sm:w-10 sm:h-10"
            >
              <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </Button>
          </div>
        </div>

        {/* Wallet */}
        <div className="mb-4 sm:mb-6">
          <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Wallet</h2>
          <div className="flex space-x-2 sm:space-x-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedCategory('guest')}
              className={`flex-1 flex items-center justify-center space-x-1 sm:space-x-3 px-2 sm:px-6 py-2 sm:py-3 rounded-xl sm:rounded-2xl transition-all ${
                selectedCategory === 'guest'
                  ? 'bg-yellow-400/80 sm:bg-yellow-500 text-black shadow-md sm:shadow-lg'
                  : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50'
              }`}
            >
              <div className={`w-6 h-6 sm:w-10 sm:h-10 rounded-full flex items-center justify-center ${
                selectedCategory === 'guest' ? 'bg-black/20' : 'bg-yellow-500/20'
              }`}>
                <Users className="h-3 w-3 sm:h-5 sm:w-5" />
              </div>
              <span className="font-medium text-xs sm:text-base">Guest List</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedCategory('bilhetes')}
              className={`flex-1 flex items-center justify-center space-x-1 sm:space-x-3 px-2 sm:px-6 py-2 sm:py-3 rounded-xl sm:rounded-2xl transition-all ${
                selectedCategory === 'bilhetes'
                  ? 'bg-yellow-400/80 sm:bg-yellow-500 text-black shadow-md sm:shadow-lg'
                  : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50'
              }`}
            >
              <div className={`w-6 h-6 sm:w-10 sm:h-10 rounded-full flex items-center justify-center ${
                selectedCategory === 'bilhetes' ? 'bg-black/20' : 'bg-blue-500/20'
              }`}>
                <Ticket className="h-3 w-3 sm:h-5 sm:w-5" />
              </div>
              <span className="font-medium text-xs sm:text-base">Bilhetes</span>
            </motion.button>
          </div>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="px-4 sm:px-6 pb-20 sm:pb-24">
        {selectedCategory === 'guest' ? (
          <>
            {loadingEvents ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="bg-gray-800/50 rounded-2xl h-48 sm:h-56 animate-pulse" />
                ))}
              </div>
            ) : events.length > 0 ? (
              <div className="space-y-6 sm:space-y-8">
                
                {/* Próximos Eventos */}
                {upcoming.length > 0 && (
                  <div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6">
                      <h2 className="text-lg sm:text-xl font-bold text-yellow-400 mb-2 sm:mb-0">Próximos Eventos</h2>
                      <span className="text-gray-400 text-sm">{upcoming.length} evento{upcoming.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {upcoming.map((event, index) => (
                        <motion.div
                          key={event.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                        >
                          <Card className="bg-gradient-to-br from-blue-600 to-purple-600 border-0 overflow-hidden rounded-2xl cursor-pointer hover:scale-[1.02] transition-transform">
                            <CardContent className="p-0 relative">
                              {/* Background Image */}
                              <div className="relative h-48 sm:h-56 overflow-hidden">
                                {event.flyer_url && (
                                  <Image
                                    src={event.flyer_url}
                                    alt={event.title}
                                    fill
                                    className="object-cover"
                                    priority={index === 0}
                                  />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                                
                                {/* Like Button */}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="absolute top-3 sm:top-4 right-3 sm:right-4 text-white hover:text-red-400 w-8 h-8 sm:w-10 sm:h-10"
                                >
                                  <Heart className="h-4 w-4 sm:h-5 sm:w-5" />
                                </Button>

                                {/* Data */}
                                <div className="absolute top-3 sm:top-4 left-3 sm:left-4">
                                  <div className="bg-yellow-500/90 backdrop-blur rounded-xl px-2 sm:px-3 py-1.5 sm:py-2">
                                    <div className="text-center">
                                      <div className="text-xs text-black uppercase font-medium">
                                        {formatDate(event.date).split(' ')[1]}
                                      </div>
                                      <div className="text-sm sm:text-lg font-bold text-black">
                                        {formatDate(event.date).split(' ')[0]}
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Conteúdo */}
                                <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4">
                                  <h3 className="font-bold text-white text-base sm:text-lg mb-2 line-clamp-2">
                                    {event.title}
                                  </h3>
                                  
                                  <div className="flex items-center text-gray-200 text-xs sm:text-sm mb-3 sm:mb-4">
                                    <MapPin className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                                    <span className="truncate">{event.location}</span>
                                  </div>

                                  {/* Botão QR Code */}
                                  <div className="flex items-center justify-end">
                                    <Button
                                      onClick={() => openQrModal(event)}
                                      className="bg-yellow-500 hover:bg-yellow-400 text-black font-semibold px-4 sm:px-6 py-2 rounded-xl text-xs sm:text-sm"
                                    >
                                      Ver QR
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Eventos Recentes (< 24h) */}
                {recent.length > 0 && (
                  <div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6">
                      <h2 className="text-lg sm:text-xl font-bold text-orange-400 mb-2 sm:mb-0">Eventos Recentes</h2>
                      <span className="text-gray-400 text-sm">{recent.length} evento{recent.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {recent.map((event, index) => (
                        <motion.div
                          key={event.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                        >
                          <Card className="bg-gradient-to-br from-orange-600 to-red-600 border-0 overflow-hidden rounded-2xl cursor-pointer hover:scale-[1.02] transition-transform">
                            <CardContent className="p-0 relative">
                              {/* Background Image */}
                              <div className="relative h-48 sm:h-56 overflow-hidden">
                                {event.flyer_url && (
                                  <Image
                                    src={event.flyer_url}
                                    alt={event.title}
                                    fill
                                    className="object-cover"
                                  />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                                
                                {/* Badge "Recente" */}
                                <div className="absolute top-3 sm:top-4 right-3 sm:right-4">
                                  <div className="bg-orange-500/90 backdrop-blur rounded-lg px-2 py-1">
                                    <span className="text-xs text-white font-medium">RECENTE</span>
                                  </div>
                                </div>

                                {/* Data */}
                                <div className="absolute top-3 sm:top-4 left-3 sm:left-4">
                                  <div className="bg-white/20 backdrop-blur rounded-xl px-2 sm:px-3 py-1.5 sm:py-2">
                                    <div className="text-center">
                                      <div className="text-xs text-gray-200 uppercase">
                                        {formatDate(event.date).split(' ')[1]}
                                      </div>
                                      <div className="text-sm sm:text-lg font-bold text-white">
                                        {formatDate(event.date).split(' ')[0]}
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Conteúdo */}
                                <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4">
                                  <h3 className="font-bold text-white text-base sm:text-lg mb-2 line-clamp-2">
                                    {event.title}
                                  </h3>
                                  
                                  <div className="flex items-center text-gray-200 text-xs sm:text-sm mb-3 sm:mb-4">
                                    <MapPin className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                                    <span className="truncate">{event.location}</span>
                                  </div>

                                  {/* Botão QR Code */}
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs text-gray-300">Evento concluído</span>
                                    <Button
                                      onClick={() => openQrModal(event)}
                                      className="bg-gray-600 hover:bg-gray-500 text-white font-semibold px-4 sm:px-6 py-2 rounded-xl text-xs sm:text-sm"
                                    >
                                      Ver QR
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Eventos Passados (> 24h) */}
                {past.length > 0 && (
                  <div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6">
                      <h2 className="text-lg sm:text-xl font-bold text-gray-400 mb-2 sm:mb-0">Eventos Passados</h2>
                      <span className="text-gray-500 text-sm">{past.length} evento{past.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {past.slice(0, 4).map((event, index) => (
                        <motion.div
                          key={event.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                        >
                          <Card className="bg-gradient-to-br from-gray-700 to-gray-800 border-0 overflow-hidden rounded-2xl cursor-pointer hover:scale-[1.02] transition-transform opacity-75">
                            <CardContent className="p-0 relative">
                              {/* Background Image */}
                              <div className="relative h-48 sm:h-56 overflow-hidden">
                                {event.flyer_url && (
                                  <Image
                                    src={event.flyer_url}
                                    alt={event.title}
                                    fill
                                    className="object-cover grayscale"
                                  />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                                
                                {/* Badge "Passado" */}
                                <div className="absolute top-3 sm:top-4 right-3 sm:right-4">
                                  <div className="bg-gray-600/90 backdrop-blur rounded-lg px-2 py-1">
                                    <span className="text-xs text-gray-300 font-medium">PASSADO</span>
                                  </div>
                                </div>

                                {/* Data */}
                                <div className="absolute top-3 sm:top-4 left-3 sm:left-4">
                                  <div className="bg-white/10 backdrop-blur rounded-xl px-2 sm:px-3 py-1.5 sm:py-2">
                                    <div className="text-center">
                                      <div className="text-xs text-gray-300 uppercase">
                                        {formatDate(event.date).split(' ')[1]}
                                      </div>
                                      <div className="text-sm sm:text-lg font-bold text-gray-200">
                                        {formatDate(event.date).split(' ')[0]}
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Conteúdo */}
                                <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4">
                                  <h3 className="font-bold text-gray-200 text-base sm:text-lg mb-2 line-clamp-2">
                                    {event.title}
                                  </h3>
                                  
                                  <div className="flex items-center text-gray-300 text-xs sm:text-sm mb-3 sm:mb-4">
                                    <MapPin className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                                    <span className="truncate">{event.location}</span>
                                  </div>

                                  {/* Info */}
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs text-gray-400">Evento concluído</span>
                                    <Button
                                      onClick={() => openQrModal(event)}
                                      variant="outline"
                                      className="border-gray-600 text-gray-300 hover:bg-gray-700 font-semibold px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm"
                                    >
                                      Histórico
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                    {past.length > 4 && (
                      <div className="text-center mt-4">
                        <Button variant="outline" className="border-gray-600 text-gray-400 hover:bg-gray-800">
                          Ver mais {past.length - 4} eventos passados
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* Se não há eventos */}
                {upcoming.length === 0 && recent.length === 0 && past.length === 0 && (
                  <div className="text-center py-12">
                    <QrCode className="h-12 w-12 sm:h-16 sm:w-16 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-base sm:text-lg font-medium text-gray-400 mb-2">
                      Nenhum evento encontrado
                    </h3>
                    <p className="text-sm sm:text-base text-gray-500">
                      Quando estiver numa guest list, os eventos aparecerão aqui.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <QrCode className="h-12 w-12 sm:h-16 sm:w-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-base sm:text-lg font-medium text-gray-400 mb-2">
                  Nenhum evento encontrado
                </h3>
                <p className="text-sm sm:text-base text-gray-500">
                  Quando estiver numa guest list, os eventos aparecerão aqui.
                </p>
              </div>
            )}
          </>
        ) : (
          /* Bilhetes Section */
          <div className="text-center py-12">
            <Ticket className="h-12 w-12 sm:h-16 sm:w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-base sm:text-lg font-medium text-gray-400 mb-2">
              Bilhetes em breve
            </h3>
            <p className="text-sm sm:text-base text-gray-500">
              Esta funcionalidade estará disponível em breve.
            </p>
          </div>
        )}
      </div>

      {/* Modal QR Code */}
      <Dialog open={qrModalOpen} onOpenChange={setQrModalOpen}>
        <DialogContent className="sm:max-w-md bg-gray-900 border-gray-700 text-white mx-4">
          <DialogTitle className="text-center text-lg sm:text-xl font-bold mb-4">
            QR Code de Entrada
          </DialogTitle>
          
          {selectedEvent && (
            <div className="text-center space-y-4">
              <div className="bg-white p-3 sm:p-4 rounded-2xl inline-block">
                <Image
                  src={selectedEvent.qr_code_url}
                  alt="QR Code"
                  width={180}
                  height={180}
                  className="rounded-lg sm:w-[200px] sm:h-[200px]"
                />
              </div>
              
              <div>
                <h3 className="font-bold text-base sm:text-lg">{selectedEvent.title}</h3>
                <p className="text-gray-400 flex items-center justify-center mt-2 text-sm">
                  <MapPin className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  {selectedEvent.location}
                </p>
                <p className="text-gray-400 flex items-center justify-center mt-1 text-sm">
                  <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  {formatDate(selectedEvent.date)}
                </p>
              </div>
              
              <p className="text-xs sm:text-sm text-gray-500">
                Apresente este QR code na entrada do evento
              </p>
              
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700 text-sm"
                  onClick={() => setQrModalOpen(false)}
                >
                  Fechar
                </Button>
                <Button 
                  className="flex-1 bg-yellow-500 hover:bg-yellow-400 text-black text-sm"
                >
                  Partilhar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
} 