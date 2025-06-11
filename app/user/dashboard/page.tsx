'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useClientAuth } from '@/hooks/useClientAuth';
import { Search, Heart, QrCode, Calendar, MapPin, Settings } from 'lucide-react';
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
      <div className="px-6 pt-12 pb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
              <span className="text-xl font-bold text-black">
                {user?.firstName?.charAt(0) || 'U'}
              </span>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Bem-vindo de volta</p>
              <h1 className="text-xl font-bold">
                {user?.firstName || 'Cliente'} {user?.lastName || ''}
              </h1>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="icon"
              className="text-gray-400 hover:text-white"
            >
              <Settings className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="text-gray-400 hover:text-red-400"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </Button>
          </div>
        </div>

        {/* Barra de Pesquisa */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Discover"
            className="w-full bg-gray-800/50 backdrop-blur border border-gray-700 rounded-2xl py-3 pl-12 pr-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500"
          />
        </div>

        {/* Categorias */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-4">Categorias</h2>
          <div className="flex space-x-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedCategory('guest')}
              className={`flex items-center space-x-3 px-6 py-3 rounded-2xl transition-all ${
                selectedCategory === 'guest'
                  ? 'bg-yellow-500 text-black'
                  : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50'
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                <QrCode className="h-5 w-5" />
              </div>
              <span className="font-medium">Guest</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedCategory('bilhetes')}
              className={`flex items-center space-x-3 px-6 py-3 rounded-2xl transition-all ${
                selectedCategory === 'bilhetes'
                  ? 'bg-yellow-500 text-black'
                  : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50'
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                <Calendar className="h-5 w-5" />
              </div>
              <span className="font-medium">Bilhetes</span>
            </motion.button>
          </div>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="px-6 pb-24">
        {selectedCategory === 'guest' ? (
          <>
            {/* Header de Eventos */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Os Seus Eventos</h2>
              <span className="text-gray-400 text-sm">Ver todos</span>
            </div>

            {/* Grid de Eventos */}
            {loadingEvents ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="bg-gray-800/50 rounded-2xl h-48 animate-pulse" />
                ))}
              </div>
            ) : events.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {events.map((event, index) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="bg-gradient-to-br from-teal-600 to-green-600 border-0 overflow-hidden rounded-2xl cursor-pointer hover:scale-[1.02] transition-transform">
                      <CardContent className="p-0 relative">
                        {/* Background Image */}
                        <div className="relative h-48 overflow-hidden">
                          {event.flyer_url && (
                            <Image
                              src={event.flyer_url}
                              alt={event.title}
                              fill
                              className="object-cover"
                            />
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                          
                          {/* Like Button */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-4 right-4 text-white hover:text-red-400"
                          >
                            <Heart className="h-5 w-5" />
                          </Button>

                          {/* Data */}
                          <div className="absolute top-4 left-4">
                            <div className="bg-white/20 backdrop-blur rounded-xl px-3 py-2">
                              <div className="text-center">
                                <div className="text-xs text-gray-200 uppercase">
                                  {formatDate(event.date).split(' ')[1]}
                                </div>
                                <div className="text-lg font-bold text-white">
                                  {formatDate(event.date).split(' ')[0]}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Conteúdo */}
                          <div className="absolute bottom-0 left-0 right-0 p-4">
                            <h3 className="font-bold text-white text-lg mb-2 line-clamp-2">
                              {event.title}
                            </h3>
                            
                            <div className="flex items-center text-gray-200 text-sm mb-4">
                              <MapPin className="h-4 w-4 mr-1" />
                              <span>{event.location}</span>
                            </div>

                            {/* Botão QR Code */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <div className="flex -space-x-2">
                                  <div className="w-6 h-6 rounded-full bg-blue-500 border-2 border-white flex items-center justify-center">
                                    <span className="text-xs text-white font-bold">1</span>
                                  </div>
                                  <div className="w-6 h-6 rounded-full bg-green-500 border-2 border-white flex items-center justify-center">
                                    <span className="text-xs text-white font-bold">2</span>
                                  </div>
                                </div>
                                <span className="text-xs text-gray-200">+2</span>
                              </div>
                              
                              <Button
                                onClick={() => openQrModal(event)}
                                className="bg-yellow-500 hover:bg-yellow-400 text-black font-semibold px-6 py-2 rounded-xl text-sm"
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
            ) : (
              <div className="text-center py-12">
                <QrCode className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-400 mb-2">
                  Nenhum evento encontrado
                </h3>
                <p className="text-gray-500">
                  Quando estiver numa guest list, os eventos aparecerão aqui.
                </p>
              </div>
            )}
          </>
        ) : (
          /* Bilhetes Section */
          <div className="text-center py-12">
            <Calendar className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-400 mb-2">
              Bilhetes em breve
            </h3>
            <p className="text-gray-500">
              Esta funcionalidade estará disponível em breve.
            </p>
          </div>
        )}
      </div>

      {/* Modal QR Code */}
      <Dialog open={qrModalOpen} onOpenChange={setQrModalOpen}>
        <DialogContent className="sm:max-w-md bg-gray-900 border-gray-700 text-white">
          <DialogTitle className="text-center text-xl font-bold mb-4">
            QR Code de Entrada
          </DialogTitle>
          
          {selectedEvent && (
            <div className="text-center space-y-4">
              <div className="bg-white p-4 rounded-2xl inline-block">
                <Image
                  src={selectedEvent.qr_code_url}
                  alt="QR Code"
                  width={200}
                  height={200}
                  className="rounded-lg"
                />
              </div>
              
              <div>
                <h3 className="font-bold text-lg">{selectedEvent.title}</h3>
                <p className="text-gray-400 flex items-center justify-center mt-2">
                  <MapPin className="h-4 w-4 mr-1" />
                  {selectedEvent.location}
                </p>
                <p className="text-gray-400 flex items-center justify-center mt-1">
                  <Calendar className="h-4 w-4 mr-1" />
                  {formatDate(selectedEvent.date)}
                </p>
              </div>
              
              <p className="text-sm text-gray-500">
                Apresente este QR code na entrada do evento
              </p>
              
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700"
                  onClick={() => setQrModalOpen(false)}
                >
                  Fechar
                </Button>
                <Button 
                  className="flex-1 bg-yellow-500 hover:bg-yellow-400 text-black"
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