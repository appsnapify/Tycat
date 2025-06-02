'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/components/ui/use-toast'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Scan, UserCheck, RotateCcw, Camera, X, Users, Plus, Smartphone, Settings } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { useOrganization } from '@/app/contexts/organization-context'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'

// Componente HTML5 QR Code Scanner que será carregado apenas no cliente
const Html5QrcodeScanner = dynamic(() => import('./Html5QrScanner').catch(err => {
  console.error("Erro ao importar HTML5QrcodeScanner:", err);
  toast.error("Não foi possível carregar o scanner de QR code. Tente novamente ou use o modo manual.");
  return () => (
    <div className="bg-red-50 p-4 rounded-lg">
      <p className="text-red-500 font-medium">Erro ao carregar o scanner. Use o modo manual.</p>
      <p className="text-sm mt-2">Erro técnico: {err?.message || 'Erro desconhecido'}</p>
    </div>
  );
}), { ssr: false });

// Inicializar o cliente Supabase aqui para estar disponível no escopo do componente e seus hooks/efeitos
const supabase = createClient();

interface ScanResult {
  success: boolean
  message: string
  guest?: {
    id: string
    name: string
    phone: string
    event_id: string
    checked_in: boolean
    check_in_time: string | null
  }
}

// Interface para eventos
interface Event {
  id: string;
  title: string; // nome do evento
  date: string;  // data de início
  is_active: boolean;
  organization_id: string;
}

// Interface para scanners
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

// Media query para telas pequenas
const responsiveStyle = `
@media (max-width: 640px) {
  .aspect-video {
    aspect-ratio: auto !important;
    height: 90vh !important;
    max-height: calc(100vh - 300px) !important;
    margin-left: -1rem;
    margin-right: -1rem;
    width: calc(100% + 2rem);
    border-radius: 0;
  }
}
`;

// Verificar se um evento já ocorreu
function isEventPast(event: any): boolean {
  if (!event) return false;
  
  // Se o evento tiver status, usar ele como primeira verificação
  if (event.status === 'completed') {
    return true;
  }
  
  // Se não tiver status ou data, não é possível verificar
  if (!event.date) return false;
  
  // Criar data do evento com horário 23:59:59 para considerar o evento como passado no dia seguinte
  const eventDate = new Date(event.date);
  eventDate.setHours(23, 59, 59);
  
  // Se tiver end_date, usar em vez da date
  if (event.end_date) {
    const endDate = new Date(event.end_date);
    endDate.setHours(23, 59, 59);
    
    // Adicionar 8 horas de margem para eventos noturnos
    endDate.setHours(endDate.getHours() + 8);
    
    return new Date() > endDate;
  }
  
  // Adicionar 8 horas de margem para eventos noturnos
  eventDate.setHours(eventDate.getHours() + 8);
  
  const today = new Date();
  return eventDate < today;
}

export default function CheckInPage() {
  // Estados existentes para check-in
  const [scanning, setScanning] = useState(false)
  const [scanMode, setScanMode] = useState<'camera' | 'manual'>('camera')
  const [manualCode, setManualCode] = useState('')
  const [lastResult, setLastResult] = useState<ScanResult | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null)
  const [events, setEvents] = useState<Event[]>([])
  const [stats, setStats] = useState({
    total: 0,
    checkedIn: 0
  })
  const { currentOrganization } = useOrganization()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [event, setEvent] = useState<Event | null>(null)
  const [guests, setGuests] = useState<{ id: string; name: string; phone: string; checked_in: boolean; check_in_time: string | null }[]>([])
  const [usingScan, setUsingScan] = useState(false)

  // Estados novos para scanners móveis
  const [activeTab, setActiveTab] = useState<'checkin' | 'scanners'>('checkin')
  const [scanners, setScanners] = useState<Scanner[]>([])
  const [scannersLoading, setScannersLoading] = useState(false)
  const [showCreateScanner, setShowCreateScanner] = useState(false)
  const [newScanner, setNewScanner] = useState({
    scanner_name: '',
    username: '',
    password: '',
    max_concurrent_sessions: 1
  })
  
  // Extrair o evento da URL, se houver
  useEffect(() => {
    // Verificar se estamos no browser
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const eventId = params.get('event');
      
      if (eventId) {
        console.log("Evento encontrado na URL:", eventId);
        setSelectedEvent(eventId);
      }
    }
  }, []);

  // Buscar eventos do organizador atual
  useEffect(() => {
    async function fetchEvents() {
      if (!currentOrganization) return

      try {
        const { data, error } = await supabase
          .from('events')
          .select('*')
          .eq('organization_id', currentOrganization.id)
          .eq('is_active', true)
          .order('date', { ascending: false })
        
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
  }, [currentOrganization])

  // useEffect para buscar estatísticas quando um evento é selecionado
  useEffect(() => {
    async function fetchStats() {
      if (!selectedEvent) return;

      try {
        console.log("Buscando estatísticas para o evento:", selectedEvent);
        
        // Usar a API dedicada que já está funcionando
        const response = await fetch(`/api/guest-count?eventId=${selectedEvent}`);
        
        if (!response.ok) {
          throw new Error(`Erro ${response.status}: ${await response.text()}`);
        }
        
        const data = await response.json();
        console.log("Estatísticas recebidas:", data);
        
        if (data.success) {
          setStats({
            total: data.count || 0,
            checkedIn: data.checkedIn || 0
          });
        } else {
          console.error("Erro ao buscar estatísticas:", data.error);
        }
      } catch (err) {
        console.error('Erro ao buscar estatísticas:', err);
      }
    }
    
    fetchStats();
  }, [selectedEvent]);

  // Novo useEffect para buscar scanners quando aba scanners for ativa
  useEffect(() => {
    if (activeTab === 'scanners' && selectedEvent) {
      fetchScanners();
    }
  }, [activeTab, selectedEvent]);

  // Nova função para buscar scanners
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

  // Nova função para criar scanner
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
      
      const data = await response.json();
      
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
        title: "Erro",
        description: err.message || "Não foi possível criar o scanner",
          variant: "destructive"
        });
    }
  };

  const startScanning = async () => {
    try {
      setScanning(true);
      setLastResult(null);
      console.log("Scanner iniciado");
    } catch (error) {
      console.error("Erro ao iniciar scanner:", error);
        toast({
        title: "Erro",
        description: "Não foi possível iniciar o scanner",
          variant: "destructive"
        });
      setScanning(false);
    }
  };

  const stopScanning = () => {
    setScanning(false);
    console.log("Scanner parado");
  };

  const handleScan = (qrCodeData: { text: string }) => {
    if (!scanning) return;
    
    console.log("QR Code escaneado:", qrCodeData.text);
    
    // Parar o scanner para processar resultado
    setScanning(false);
    
    // Processar o QR code
    processQrCode(qrCodeData.text);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    
    console.log("Código manual inserido:", manualCode);
    processQrCode(manualCode);
  };

  const processQrCode = async (code: string) => {
    if (!selectedEvent) {
      toast({
        title: "Erro",
        description: "Nenhum evento selecionado",
        variant: "destructive"
      });
      return;
    }
    
    setLoading(true);
    
    try {
      console.log("Processando QR code:", code);
      
      // Tentar parsing JSON primeiro
      let qrData;
      try {
        qrData = JSON.parse(code);
      } catch {
        // Se falhar, tentar como URL query string
        const params = new URLSearchParams(code);
        qrData = {
          event_id: params.get('event'),
          guest_id: params.get('guest'),
          phone: params.get('phone'),
          timestamp: params.get('timestamp')
        };
      }

      if (!qrData.event_id || !qrData.guest_id) {
        setLastResult({
          success: false,
          message: "QR Code inválido - dados obrigatórios em falta"
        });
        return;
      }

      // Verificar se o QR code é do evento correto
      if (qrData.event_id !== selectedEvent) {
        setLastResult({
          success: false,
          message: "Este QR Code não pertence ao evento selecionado"
        });
        return;
      }

      // Buscar convidado
      const { data: guest, error: guestError } = await supabase
        .from('guests')
        .select('*')
        .eq('id', qrData.guest_id)
        .eq('event_id', selectedEvent)
        .single();

      if (guestError || !guest) {
        setLastResult({
          success: false,
          message: "Convidado não encontrado na lista do evento"
        });
        return;
      }

      // Verificar se já fez check-in
      if (guest.checked_in) {
        setLastResult({
          success: true,
          message: `${guest.name} já fez check-in anteriormente em ${formatTime(guest.check_in_time)}`,
          guest: {
            ...guest,
            event_id: selectedEvent,
            checked_in: true
          }
        });
        return;
      }
      
      // Realizar check-in
      const { error: updateError } = await supabase
        .from('guests')
        .update({
          checked_in: true,
          check_in_time: new Date().toISOString()
        })
        .eq('id', guest.id);

      if (updateError) {
        console.error("Erro ao fazer check-in:", updateError);
        setLastResult({
          success: false,
          message: "Erro interno - não foi possível completar o check-in"
        });
        return;
      }
      
      // Check-in realizado com sucesso
      setLastResult({
        success: true,
        message: `Check-in realizado com sucesso para ${guest.name}!`,
        guest: {
          ...guest,
          event_id: selectedEvent,
          checked_in: true,
          check_in_time: new Date().toISOString()
        }
      });

      // Atualizar estatísticas
        setStats(prev => ({
          ...prev,
          checkedIn: prev.checkedIn + 1
        }));
        
      // Limpar código manual
        setManualCode('');
      
    } catch (error) {
      console.error("Erro ao processar QR code:", error);
      
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao processar o check-in. Verifique o console para mais detalhes.",
        variant: "destructive"
      });
      
      setLastResult({
        success: false,
        message: `Erro: ${String(error)}`,
        error: String(error)
      });
      
      if (scanMode === 'camera') {
        setTimeout(() => {
          setScanning(true);
        }, 3000);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleScanError = (error: any) => {
    console.error("Erro no scanner:", error);
    
    // Feedback específico baseado no tipo de erro
    if (error.name === "NotAllowedError") {
      toast({
        title: "Erro",
        description: "Permissão para acessar a câmera foi negada",
        variant: "destructive"
      });
    } else if (error.name === "NotFoundError") {
      toast({
        title: "Erro", 
        description: "Nenhuma câmera encontrada",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Erro",
        description: `Erro no scanner: ${error.message || 'Erro desconhecido'}`,
        variant: "destructive"
      });
    }
    
    // Mudar para modo manual em caso de falha no scanner
    setScanMode('manual');
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

  useEffect(() => {
    // Cleanup para melhorar performance ao sair da página
    return () => {
      // Limpar timeout ou intervalos pendentes
      if (typeof window !== 'undefined') {
        const highestId = window.setTimeout(() => {}, 0);
        for (let i = highestId; i >= 0; i--) {
          window.clearTimeout(i);
        }
      }
    };
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-4">
      <style jsx global>{responsiveStyle}</style>
      
      <h1 className="text-2xl font-bold mb-6">Check-in e Gestão de Scanners</h1>
      
      {/* Seleção de evento - mantido igual */}
      <Card className="mb-4 md:mb-6 shadow-sm">
        <CardHeader className="pb-3 md:pb-4">
          <CardTitle className="text-lg md:text-xl">Selecione o Evento</CardTitle>
          <CardDescription className="text-sm">
            Escolha o evento para realizar o check-in ou gerir scanners
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
                  {event.title}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>
      
      {selectedEvent && (
        <>
          {/* Tabs principais para dividir funcionalidades */}
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'checkin' | 'scanners')} className="mb-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="checkin" className="flex items-center gap-2">
                <Scan className="h-4 w-4" />
                Check-in Direto
              </TabsTrigger>
              <TabsTrigger value="scanners" className="flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                Scanners Móveis
              </TabsTrigger>
            </TabsList>

            {/* Aba Check-in - mantém toda funcionalidade existente */}
            <TabsContent value="checkin" className="space-y-6">
          {/* Estatísticas */}
              <div className="grid grid-cols-2 gap-4">
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
          </div>
          
              {/* Status de conectividade do scanner - mantido */}
              {scanning && (
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-300">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                    <p className="text-sm text-blue-800">
                      Scanner ativo - aponte diretamente para o QR code, mantendo a uma distância de 10-20cm
                    </p>
                  </div>
                </div>
              )}
              
              {/* Scanner - mantém toda funcionalidade existente */}
              <Card>
            <CardHeader>
              <CardTitle>Scanner de QR Code</CardTitle>
              <CardDescription>
                Escaneie o QR code do convidado ou insira o código manualmente
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="camera" onValueChange={(value) => {
                setScanMode(value as 'camera' | 'manual');
                // Parar scanner quando trocar para modo manual
                if (value === 'manual' && scanning) {
                  stopScanning();
                }
              }}>
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="camera">Câmera</TabsTrigger>
                  <TabsTrigger value="manual">Código Manual</TabsTrigger>
                </TabsList>
                
                <TabsContent value="camera">
                  <div className="space-y-4">
                    {scanning ? (
                      <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden relative md:aspect-video sm:aspect-auto sm:min-h-[80vh] max-w-full">
                        {/* Scanner real de QR code */}
                        <div className="w-full h-full">
                          <div className="absolute top-3 right-3 z-10">
                            <Button 
                              variant="secondary" 
                              size="sm" 
                              onClick={stopScanning}
                              className="rounded-full w-8 h-8 p-0 shadow-md bg-white/80 hover:bg-white"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          <div className="relative w-full h-full">
                            <Html5QrcodeScanner
                              onScan={handleScan}
                              onError={handleScanError}
                            />
                            
                            {/* Overlay simplificado */}
                            <div className="absolute bottom-5 left-0 right-0 mx-auto text-center px-4 py-2 bg-black/75 text-white text-sm rounded-full max-w-60 shadow-lg backdrop-blur-sm">
                              <div className="flex items-center justify-center">
                                <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                                Aponte para o QR code
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                        <div className="text-center">
                          <Button 
                            size="lg" 
                            onClick={startScanning}
                            className="gap-2"
                          >
                            <Camera className="h-5 w-5" />
                            Iniciar Scanner
                          </Button>
                          <p className="mt-4 text-sm text-muted-foreground">
                            Aponte a câmera para o QR code exibido pelo convidado
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {scanning && (
                      <div className="flex justify-center">
                        <Button 
                          variant="outline" 
                          onClick={stopScanning}
                        >
                          Parar Scanner
                        </Button>
                      </div>
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="manual">
                  <form onSubmit={handleManualSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="manual-code">Código do QR</Label>
                      <div className="flex space-x-2">
                        <Input
                          id="manual-code"
                          value={manualCode}
                          onChange={e => setManualCode(e.target.value)}
                          placeholder="event=123&guest=JohnDoe&phone=5551234567&timestamp=1234567890"
                        />
                        <Button type="submit">Verificar</Button>
                      </div>
                    </div>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
          
              {/* Último resultado - mantém igual */}
          {lastResult && (
            <Card className={lastResult.success ? "border-green-500" : "border-red-500"}>
              <CardHeader className={lastResult.success ? "bg-green-50" : "bg-red-50"}>
                <div className="flex justify-between items-center">
                  <CardTitle>
                    {lastResult.success 
                      ? (lastResult.guest?.checked_in ? "Check-in Confirmado" : "Convidado na Lista") 
                      : "Check-in Falhou"}
                  </CardTitle>
                  <Badge variant={lastResult.success ? (lastResult.guest?.checked_in ? "default" : "outline") : "destructive"}>
                    {lastResult.success 
                      ? (lastResult.guest?.checked_in 
                          ? (lastResult.message?.includes("já fez check-in") ? "Repetido" : "Sucesso") 
                          : "Na Lista") 
                      : "Erro"}
                  </Badge>
                </div>
                <CardDescription>{lastResult.message}</CardDescription>
              </CardHeader>
              
              {lastResult.guest && (
                <CardContent className="space-y-4 pt-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm text-muted-foreground">Nome</Label>
                      <p className="font-medium">{lastResult.guest.name}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">Telefone</Label>
                      <p className="font-medium">{lastResult.guest.phone}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm text-muted-foreground">Status</Label>
                      <div className="flex items-center mt-1">
                        <UserCheck className="h-4 w-4 mr-1 text-green-500" />
                        <span>Check-in realizado</span>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">Horário</Label>
                      <p className="font-medium">{formatTime(lastResult.guest.check_in_time)}</p>
                    </div>
                  </div>
                </CardContent>
              )}
              
              <CardFooter className="bg-gray-50">
                <Button 
                  variant="ghost" 
                  className="gap-2 ml-auto"
                  onClick={() => {
                    setLastResult(null)
                    if (scanMode === 'camera') {
                      startScanning()
                    }
                  }}
                >
                  <RotateCcw className="h-4 w-4" />
                  Limpar
                </Button>
              </CardFooter>
            </Card>
              )}
            </TabsContent>

            {/* Nova aba Scanners Móveis */}
            <TabsContent value="scanners" className="space-y-6">
              {/* Cabeçalho com estatísticas de scanners */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Scanners Ativos
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">
                      {scanners.filter(s => s.is_active && s.stats.active_sessions > 0).length}
                    </p>
                  </CardContent>
                </Card>
                
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
                    <p className="text-3xl font-bold text-green-600">
                      {scanners.reduce((sum, s) => sum + s.stats.successful_scans, 0)}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Botão criar scanner */}
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Scanners do Evento</h3>
                <Button onClick={() => setShowCreateScanner(true)} className="gap-2">
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
                      <Smartphone className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Nenhum scanner criado</h3>
                      <p className="text-gray-600 mb-4">
                        Crie scanners móveis para que sua equipe possa fazer check-in dos convidados
                      </p>
                      <Button onClick={() => setShowCreateScanner(true)} className="gap-2">
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
                              <Smartphone className="h-5 w-5" />
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
                            <p className="font-medium text-green-600">{scanner.stats.successful_scans}</p>
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
                      <CardFooter className="flex justify-between">
                        <div className="flex gap-2">
                          <Badge variant={scanner.stats.active_sessions > 0 ? "default" : "outline"}>
                            {scanner.stats.active_sessions > 0 ? "Online" : "Offline"}
                          </Badge>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="gap-2">
                            <Settings className="h-4 w-4" />
                            Configurar
                          </Button>
                        </div>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>

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
                      min="1"
                      max="5"
                      value={newScanner.max_concurrent_sessions}
                      onChange={e => setNewScanner(prev => ({ ...prev, max_concurrent_sessions: parseInt(e.target.value) || 1 }))}
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