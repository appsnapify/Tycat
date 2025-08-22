'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/components/ui/use-toast'
import { Badge } from '@/components/ui/badge'
import { Users, Plus, Smartphone } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useOrganization } from '@/app/contexts/organization-context'
import { useGuestCount } from '@/hooks/useGuestCount'

// Inicializar o cliente Supabase
const supabase = createClient();

interface Event {
  id: string;
  title: string;
  date: string;
  is_active: boolean;
  organization_id: string;
}

interface Scanner {
  id: string
  scanner_name: string
  username: string
  is_active: boolean
  created_at: string
  last_activity: string | null
  stats: {
    active_sessions: number
    total_scans: number
    successful_scans: number
    last_activity: string | null
  }
}

export default function CheckInPage() {
  // Estados principais
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null)
  const [events, setEvents] = useState<Event[]>([])
  
  // Usar novo hook para guest count com fallback seguro
  const { data: guestCountData, loading: guestCountLoading, error: guestCountError } = useGuestCount(selectedEvent)
  
  // Manter estado local como fallback (compatibilidade)
  const [fallbackStats, setFallbackStats] = useState({
    total: 0,
    checkedIn: 0
  })
  
  // Combinar dados do hook com fallback
  const stats = guestCountData ? {
    total: guestCountData.count,
    checkedIn: guestCountData.checkedIn
  } : fallbackStats

  // Estados para scanners móveis
  const [scanners, setScanners] = useState<Scanner[]>([])
  const [scannersLoading, setScannersLoading] = useState(false)
  const [showCreateScanner, setShowCreateScanner] = useState(false)
  const [newScanner, setNewScanner] = useState({
    scanner_name: '',
    username: '',
    password: '',
    max_concurrent_sessions: 5
  })

  const { currentOrganization } = useOrganization()

  // Extrair evento da URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const eventId = params.get('event');
      
      if (eventId) {
        console.log("Evento encontrado na URL:", eventId);
        setSelectedEvent(eventId);
      }
    }
  }, []);

  // Buscar eventos - APENAS EVENTOS ATIVOS OU FUTUROS
  useEffect(() => {
    async function fetchEvents() {
      if (!currentOrganization?.id) return

      try {
        const today = new Date().toISOString().split('T')[0]; // Data atual em formato YYYY-MM-DD
        
        const { data, error } = await supabase
          .from('events')
          .select('*')
          .eq('organization_id', currentOrganization.id)
          .eq('is_active', true)
          .gte('date', today) // Apenas eventos de hoje em diante
          .order('date', { ascending: true }) // Próximos eventos primeiro
        
        if (error) {
          console.error('Erro ao buscar eventos:', error)
          toast({
            title: "Erro",
            description: "Não foi possível carregar os eventos",
            variant: "destructive"
          })
          return
        }
        
        setEvents(data || [])
      } catch (err) {
        console.error('Erro ao buscar eventos:', err)
      }
    }
    
    fetchEvents()
  }, [currentOrganization?.id]) // Otimizada: dependência específica

  // Fallback: Buscar estatísticas se hook falhar
  useEffect(() => {
    // Verificar se deve usar fallback
    const shouldUseFallback = (): boolean => {
      return Boolean(selectedEvent && !guestCountData && guestCountError);
    };
    
    // Buscar dados da API
    const fetchStatsFromApi = async () => {
      const response = await fetch(`/api/guest-count?eventId=${selectedEvent}`);
      
      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${await response.text()}`);
      }
      
      return await response.json();
    };
    
    // Processar dados da resposta
    const processStatsData = (data: any) => {
      if (data.success) {
        setFallbackStats({
          total: data.count || 0,
          checkedIn: data.checkedIn || 0
        });
      } else {
        console.error("Erro ao buscar estatísticas (fallback):", data.error);
      }
    };

    async function fetchFallbackStats() {
      if (!shouldUseFallback()) return;

      try {
        const data = await fetchStatsFromApi();
        processStatsData(data);
      } catch (err) {
        console.error('Erro ao buscar estatísticas (fallback):', err);
      }
    }
    
    fetchFallbackStats();
  }, [selectedEvent, guestCountData, guestCountError]); // Otimizada: dependências específicas

  // Buscar scanners quando evento selecionado
  useEffect(() => {
    if (selectedEvent) {
      fetchScanners();
    }
  }, [selectedEvent]);

  const fetchScanners = async () => {
    if (!selectedEvent) return;
    
    setScannersLoading(true);
    try {
      const response = await fetch(`/api/scanners/list?event_id=${selectedEvent}`);
      
      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${await response.text()}`);
      }
      
      const data = await response.json();
      setScanners(data.scanners || []);
    } catch (err) {
      console.error('Erro ao buscar scanners:', err);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os scanners",
        variant: "destructive"
      });
    } finally {
      setScannersLoading(false);
    }
  };

  const createScanner = async () => {
    if (!selectedEvent) return;
    
    try {
      const response = await fetch('/api/scanners/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event_id: selectedEvent,
          ...newScanner
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao criar scanner');
      }
      
      toast({
        title: "Sucesso",
        description: "Scanner criado com sucesso",
      });
      
      // Limpar formulário e fechar modal
      setNewScanner({
        scanner_name: '',
        username: '',
        password: '',
        max_concurrent_sessions: 1
      });
      setShowCreateScanner(false);
      
      // Recarregar lista de scanners
      fetchScanners();
    } catch (err: any) {
      console.error('Erro ao criar scanner:', err);
      
      toast({
        title: "Aviso",
        description: err.message || "Não foi possível criar o scanner",
        variant: "destructive"
      });
    }
  };

  const formatTime = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    
    try {
      const date = new Date(dateString)
      return date.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch (err) {
      return 'Horário inválido'
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Gestão de Scanners Móveis</h1>
      
      {/* Seleção de evento */}
      <Card className="mb-4 md:mb-6 shadow-sm">
        <CardHeader className="pb-3 md:pb-4">
          <CardTitle className="text-lg md:text-xl">Selecione o Evento</CardTitle>
          <CardDescription className="text-sm">
            Escolha o evento para gerir os scanners móveis da sua equipe
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2">
            <Label htmlFor="event" className="text-sm">Evento</Label>
            <select
              id="event"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={selectedEvent || ''}
              onChange={e => setSelectedEvent(e.target.value)}
            >
              <option value="">-- Selecione um evento --</option>
              {events.map(event => (
                <option key={event.id} value={event.id}>
                  {event.title} - {new Date(event.date).toLocaleDateString('pt-PT')}
                </option>
              ))}
            </select>
            {events.length === 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                Nenhum evento ativo ou futuro encontrado
              </p>
            )}
          </div>
        </CardContent>
      </Card>
      
      {selectedEvent && (
        <>
          {/* Estatísticas do evento */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Total de Convidados</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{stats.total}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Check-ins Realizados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <p className="text-3xl font-bold">{stats.checkedIn}</p>
                  <p className="text-lg">
                    {stats.total > 0 ? Math.round((stats.checkedIn / stats.total) * 100) : 0}%
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  Scanners Ativos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  {scanners.filter(s => s.is_active && s.stats.active_sessions > 0).length}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Estatísticas de scanners */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Total de Scans</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  {scanners.reduce((sum, s) => sum + s.stats.total_scans, 0)}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Scans Bem-sucedidos</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-blue-600">
                  {scanners.reduce((sum, s) => sum + s.stats.successful_scans, 0)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Cabeçalho lista scanners */}
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Scanners do Evento</h3>
            <Button 
              onClick={() => setShowCreateScanner(true)} 
              className="gap-2 bg-blue-600 hover:bg-blue-700 text-white transition-all duration-200"
            >
              <Plus className="h-4 w-4" />
              Criar Scanner
            </Button>
          </div>

          {/* Lista de scanners */}
          {scannersLoading ? (
            <Card>
              <CardContent className="py-8">
                <div className="text-center">
                  <p>Carregando scanners...</p>
                </div>
              </CardContent>
            </Card>
          ) : scanners.length === 0 ? (
            <Card>
              <CardContent className="py-8">
                <div className="text-center">
                  <Smartphone className="h-12 w-12 mx-auto text-blue-600 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhum scanner criado</h3>
                  <p className="text-gray-600 mb-4">
                    Crie scanners móveis para que sua equipe possa fazer check-in dos convidados
                  </p>
                  <Button 
                    onClick={() => setShowCreateScanner(true)} 
                    className="gap-2 bg-blue-600 hover:bg-blue-700 text-white transition-all duration-200"
                  >
                    <Plus className="h-4 w-4" />
                    Criar Primeiro Scanner
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {scanners.map((scanner) => (
                <Card key={scanner.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Smartphone className="h-5 w-5 text-blue-600" />
                          {scanner.scanner_name}
                        </CardTitle>
                        <CardDescription>
                          @{scanner.username} • Criado em {new Date(scanner.created_at).toLocaleDateString('pt-PT')}
                        </CardDescription>
                      </div>
                      <Badge variant={scanner.is_active ? "default" : "secondary"}>
                        {scanner.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <Label className="text-muted-foreground">Sessões Ativas</Label>
                        <p className="font-medium">{scanner.stats.active_sessions}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Total Scans</Label>
                        <p className="font-medium">{scanner.stats.total_scans}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Bem-sucedidos</Label>
                        <p className="font-medium text-blue-600">{scanner.stats.successful_scans}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Última Atividade</Label>
                        <p className="font-medium">
                          {scanner.stats.last_activity 
                            ? formatTime(scanner.stats.last_activity)
                            : 'Nunca'
                          }
                        </p>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <div className="flex gap-2">
                      <Badge variant={scanner.stats.active_sessions > 0 ? "default" : "outline"}>
                        {scanner.stats.active_sessions > 0 ? "Online" : "Offline"}
                      </Badge>
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}

          {/* Modal criar scanner */}
          {showCreateScanner && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
              <Card className="w-full max-w-md">
                <CardHeader>
                  <CardTitle>Criar Novo Scanner</CardTitle>
                  <CardDescription>
                    Crie credenciais para que sua equipe acesse o scanner móvel
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="scanner_name">Nome do Scanner</Label>
                    <Input
                      id="scanner_name"
                      placeholder="Ex: Scanner Entrada Principal"
                      value={newScanner.scanner_name}
                      onChange={e => setNewScanner(prev => ({ ...prev, scanner_name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      placeholder="Ex: scanner1"
                      value={newScanner.username}
                      onChange={e => setNewScanner(prev => ({ ...prev, username: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Mínimo 6 caracteres"
                      value={newScanner.password}
                      onChange={e => setNewScanner(prev => ({ ...prev, password: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="sessions">Sessões Simultâneas</Label>
                    <Input
                      id="sessions"
                      type="number"
                      min="5"
                      max="10"
                      value={newScanner.max_concurrent_sessions}
                      onChange={e => setNewScanner(prev => ({ ...prev, max_concurrent_sessions: parseInt(e.target.value) || 5 }))}
                    />
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowCreateScanner(false)}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    onClick={createScanner}
                    disabled={!newScanner.scanner_name || !newScanner.username || !newScanner.password}
                    className="bg-blue-600 hover:bg-blue-700 text-white transition-all duration-200"
                  >
                    Criar Scanner
                  </Button>
                </CardFooter>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  )
} 