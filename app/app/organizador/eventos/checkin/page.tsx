'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/components/ui/use-toast'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Scan, UserCheck, RotateCcw, Camera, X } from 'lucide-react'
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

  // Carregar convidados
  useEffect(() => {
    if (selectedEvent) {
      setLoading(true)
      
      console.log("Buscando convidados para o evento:", selectedEvent)
      
      // Buscar dados do evento
      supabase
        .from('events')
        .select('*')
        .eq('id', selectedEvent)
        .single()
        .then(({ data, error }) => {
          if (error) {
            console.error("Erro ao buscar evento:", error)
            setError("Não foi possível carregar os detalhes do evento.")
          } else {
            setEvent(data)
          }
        })
      
      // Buscar convidados
      supabase
        .from('guests')
        .select('*')
        .eq('event_id', selectedEvent)
        .order('created_at', { ascending: false })
        .then(({ data, error }) => {
          if (error) {
            console.error("Erro ao buscar convidados:", error);
            setError('Não foi possível carregar a lista de convidados.');
            
            // Tentar abordagem alternativa, com logs detalhados
            console.log("Tentando abordagem alternativa para buscar convidados...");
            
            // Executar consulta SQL direta para garantir que os convidados são encontrados
            supabase.rpc('exec_sql', { 
              sql: `SELECT * FROM guests WHERE event_id = '${selectedEvent}' ORDER BY created_at DESC` 
            })
            .then(({ data: sqlData, error: sqlError }) => {
              if (sqlError) {
                console.error("Erro na consulta SQL:", sqlError);
              } else if (sqlData && Array.isArray(sqlData.result)) {
                console.log(`Encontrados ${sqlData.result.length} convidados via SQL direto`);
                setGuests(sqlData.result);
                
                // Atualizar estatísticas
                setStats({
                  total: sqlData.result.length,
                  checkedIn: sqlData.result.filter((g: any) => g.checked_in).length
                });
              }
            });
          } else {
            console.log(`Convidados encontrados: ${data?.length || 0}`, data);
            setGuests(data || []);
            
            // Atualizar estatísticas diretamente daqui
            setStats({
              total: data?.length || 0,
              checkedIn: data?.filter((g: any) => g.checked_in).length || 0
            });
            
            // Verificar se o evento já ocorreu
            const isPast = isEventPast(data);
            if (isPast) {
              toast({
                title: "Evento Realizado",
                description: "Este evento já ocorreu, o check-in não está mais disponível.",
                variant: "destructive"
              });
              router.push('/app/organizador/eventos');
              return;
            }
            
            setLoading(false);
          }
        })
    }
  }, [selectedEvent])

  const startScanning = async () => {
    console.log("Iniciando scanner de QR code...");
    setLastResult(null);
    setManualCode('');
    
    // Verificar suporte e permissões
    try {
      // Verificar se a API de mídia é suportada
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error("API MediaDevices não suportada neste navegador");
        toast({
          title: "Erro",
          description: "Seu navegador não suporta acesso à câmera. Use o modo manual.",
          variant: "destructive"
        });
        setScanMode('manual');
        return;
      }
      
      // Tentar acessar a câmera para verificar permissões antes de iniciar o scanner
      toast({
        title: "Aguarde",
        description: "Solicitando acesso à câmera...",
      });
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment' // Preferir câmera traseira
        } 
      });
      
      // Liberar a stream após verificar permissão
      stream.getTracks().forEach(track => track.stop());
      
      toast({
        title: "Sucesso",
        description: "Câmera ativada com sucesso!",
      });
      
      // Se chegou aqui, podemos iniciar o scanner
      setScanMode('camera');
      setScanning(true);
      
    } catch (error: any) {
      console.error("Erro ao acessar câmera:", error);
      
      // Fornecer mensagens específicas com base no tipo de erro
      if (error.name === "NotAllowedError") {
        toast({
          title: "Permissão negada",
          description: "Você precisa permitir o acesso à câmera para usar o scanner. Verifique as permissões do seu navegador.",
          variant: "destructive"
        });
      } else if (error.name === "NotFoundError") {
        toast({
          title: "Câmera não encontrada",
          description: "Não foi possível encontrar uma câmera no seu dispositivo.",
          variant: "destructive"
        });
      } else if (error.name === "NotReadableError") {
        toast({
          title: "Câmera indisponível",
          description: "A câmera pode estar sendo usada por outro aplicativo. Feche outros aplicativos que possam estar usando a câmera.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Erro na câmera",
          description: `Erro ao acessar câmera: ${error.message || 'Erro desconhecido'}`,
          variant: "destructive"
        });
      }
      
      // Mudar para modo manual se houver erro
      setScanMode('manual');
    }
  };

  const stopScanning = () => {
    console.log("Parando scanner");
    setScanning(false)
  }

  const handleScan = (qrCodeData: { text: string }) => {
    const text = qrCodeData?.text || '';
    console.log('QR Code escaneado com sucesso:', text);
    
    // Garantir que temos um texto limpo para processar
    const cleanedData = text?.trim();
    if (!cleanedData) {
      console.log('QR Code vazio ou inválido');
      toast({
        title: "QR Code inválido",
        description: "O QR code está vazio ou não pode ser lido",
        variant: "destructive"
      });
      // Não parar o scanner, permitir tentar novamente
      return;
    }
    
    // Parar o scanner temporariamente para evitar escaneamentos duplicados
    setScanning(false);
    
    // Mostrar feedback visual mais claro
    toast({
      title: "QR Code detectado!",
      description: "Processando código...",
      variant: "default"
    });
    
    // Processar o código lido
    processQrCode(cleanedData);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualCode) {
      toast({
        title: "Código vazio",
        description: "Por favor, insira um código para verificar",
        variant: "destructive"
      })
      return
    }
    
    processQrCode(manualCode)
  }

  const processQrCode = async (code: string) => {
    if (!selectedEvent) {
      toast({
        title: "Selecione um evento",
        description: "Por favor, selecione um evento antes de fazer check-in",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setScanning(false);
      
      console.log("Processando QR code:", { code, eventId: selectedEvent });
      
      // Preparar os dados para o check-in
      let guestId: string | null = null;
      let qrData: any = null;
      
      // Primeiro passo: tentar limpar o código (pode ter espaços, quebras de linha etc.)
      const cleanedCode = code.trim();
      console.log("Código limpo:", cleanedCode);
      
      try {
        // Tentar extrair os dados do QR code como JSON
        qrData = JSON.parse(cleanedCode);
        console.log("QR data parseado com sucesso:", qrData);
        
        // Estratégia 1: Extrair o ID do convidado do JSON usando campos conhecidos
        if (qrData.guestId) {
          guestId = qrData.guestId;
          console.log("ID extraído do campo guestId:", guestId);
        } else if (qrData.id) {
          // Alguns QR codes podem usar 'id' em vez de 'guestId'
          guestId = qrData.id;
          console.log("ID extraído do campo id:", guestId);
        } else if (qrData.guest_id) {
          guestId = qrData.guest_id;
          console.log("ID extraído do campo guest_id:", guestId);
        } else if (qrData.guestID) {
          guestId = qrData.guestID;
          console.log("ID extraído do campo guestID:", guestId);
        } else if (qrData.guest && qrData.guest.id) {
          // Formato aninhado { guest: { id: "..." } }
          guestId = qrData.guest.id;
          console.log("ID extraído do campo aninhado guest.id:", guestId);
        } 
        // NOVO: Detectar se próprio QR code é o guestId (em alguns registros mais antigos)
        else if (typeof qrData === 'string' && qrData.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
          guestId = qrData;
          console.log("QR code é diretamente o ID do convidado:", guestId);
        }
        // NOVO: Tratamento especial para o formato específico que vimos nos dados
        else if (qrData.userId && qrData.eventId && qrData.timestamp) {
          // Este é o formato encontrado em alguns registros recentes
          console.log("Formato detectado: userId + eventId + timestamp");
          
          // Verificar se temos o mesmo evento
          if (qrData.eventId === selectedEvent) {
            // Buscar pelo userId como guestId (pois o userId neste caso é o guestId)
            guestId = qrData.userId;
            console.log("Usando userId como guestId:", guestId);
          }
        }
        else if (qrData.eventId) {
          // Se temos um eventId, vamos verificar se corresponde ao evento selecionado
          console.log(`QR code contém eventId: ${qrData.eventId}, evento selecionado: ${selectedEvent}`);
          
          if (qrData.eventId === selectedEvent) {
            console.log("Event ID corresponde, procurando por qualquer campo de ID");
            
            // Estratégia 2: Procurar por qualquer propriedade que pareça um UUID
            for (const key in qrData) {
              if (typeof qrData[key] === 'string' && 
                  qrData[key].match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i) &&
                  !key.toLowerCase().includes('event')) {
                guestId = qrData[key];
                console.log(`ID encontrado no campo ${key}:`, guestId);
                break;
              }
            }
          } else {
            console.log("Event ID não corresponde ao evento selecionado, continuando a busca...");
          }
        }
        
        // Estratégia 3: Se ainda não encontramos, vamos buscar qualquer UUID em qualquer campo
        if (!guestId) {
          console.log("Buscando UUID em qualquer campo...");
          
          for (const key in qrData) {
            // Verificar se o valor é string e se parece um UUID
            if (typeof qrData[key] === 'string' && 
                qrData[key].match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
              // Ignorar se for o evento
              if (key.toLowerCase().includes('event') || 
                  key.toLowerCase() === 'id' && qrData[key] === selectedEvent) {
                console.log(`Campo ${key} parece ID de evento, ignorando:`, qrData[key]);
                continue;
              }
              
              guestId = qrData[key];
              console.log(`UUID encontrado no campo ${key}:`, guestId);
              break;
            }
            
            // Verificar campos aninhados
            if (typeof qrData[key] === 'object' && qrData[key] !== null) {
              for (const nestedKey in qrData[key]) {
                if (typeof qrData[key][nestedKey] === 'string' && 
                    qrData[key][nestedKey].match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
                  guestId = qrData[key][nestedKey];
                  console.log(`UUID encontrado em campo aninhado ${key}.${nestedKey}:`, guestId);
                  break;
                }
              }
            }
          }
        }
      } catch (e) {
        console.error("Erro ao parsear QR code como JSON:", e, "Texto original:", code);
        
        // Estratégia 4: Se não for JSON, verificar se o código em si parece um UUID
        if (cleanedCode.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
          console.log("O código parece ser um UUID válido, usando diretamente");
          guestId = cleanedCode;
        } else {
          console.log("Tentando extrair UUID do texto do QR code");
          
          // Estratégia 5: Verificar se o texto do QR contém um UUID em algum lugar
          const uuidMatch = cleanedCode.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
          if (uuidMatch) {
            guestId = uuidMatch[0];
            console.log("UUID encontrado no QR code:", guestId);
          } else {
            // Estratégia 6: verificar formatos numéricos (código de evento ou convidado)
            const numericMatch = cleanedCode.match(/\d+/);
            if (numericMatch) {
              console.log("Encontrado código numérico:", numericMatch[0]);
              
              // Verificar nossa lista de convidados por este código
              if (guests.length > 0) {
                const guestByNumericCode = guests.find(g => 
                  g.code === numericMatch[0] || 
                  g.guest_code === numericMatch[0] || 
                  g.ticket_number === Number(numericMatch[0])
                );
                
                if (guestByNumericCode) {
                  guestId = guestByNumericCode.id;
                  console.log("Encontrado convidado por código numérico:", guestId);
                }
              }
            }
            
            if (!guestId) {
              console.log("Conteúdo completo do QR code (não contém UUID):", cleanedCode);
            }
          }
        }
      }
      
      if (!guestId) {
        console.error("Não foi possível extrair um ID de convidado válido do QR code. Conteúdo:", code);
        toast({
          title: "QR Code inválido",
          description: "Não foi possível identificar um convidado com este QR code. Tente novamente ou use o código manual.",
          variant: "destructive"
        });
        
        // Reiniciar scanner após 3 segundos
        if (scanMode === 'camera') {
          setTimeout(() => {
            setScanning(true);
          }, 3000);
        }
        return;
      }
      
      console.log("Enviando solicitação de check-in para a API com ID:", guestId);
      
      // Fazer requisição à API para processar o check-in
      const response = await fetch('/api/guests', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: guestId,
          checked_in: true,
          event_id: selectedEvent
        })
      });
      
      const responseText = await response.text();
      console.log("Resposta bruta da API:", responseText);
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error("Erro ao parsear resposta JSON:", e);
        data = { success: false, error: "Erro ao processar resposta do servidor" };
      }
      
      if (!response.ok || !data.success) {
        console.error("Erro na resposta da API:", response.status, data);
        
        toast({
          title: "Erro no check-in",
          description: data.error || `Erro ${response.status}: Não foi possível realizar o check-in`,
          variant: "destructive"
        });
        
        setLastResult({
          success: false,
          message: data.error || `Erro ${response.status}: Falha ao processar check-in`,
          error: data.error || responseText
        });
        
        // Reiniciar scanner após 3 segundos
        if (scanMode === 'camera') {
          setTimeout(() => {
            setScanning(true);
          }, 3000);
        } else {
          setManualCode('');
        }
        
        return;
      }
      
      console.log("Resposta de sucesso da API:", data);
      
      setLastResult({
        success: true,
        message: data.message || "Check-in realizado com sucesso",
        guest: data.data
      });
      
      // Se é um novo check-in (não é um check-in repetido)
      if (!data.alreadyCheckedIn) {
        // Atualizar estatísticas locais
        setStats(prev => ({
          ...prev,
          checkedIn: prev.checkedIn + 1
        }));
        
        toast({
          title: "Check-in confirmado",
          description: `${data.data?.name || 'Convidado'} está na guest list!`
        });
      } else {
        toast({
          title: "Atenção",
          description: "Este convidado já fez check-in!",
          variant: "destructive"
        });
      }
      
      // Atualizar a lista de convidados
      if (selectedEvent) {
        // Buscar convidados novamente
        supabase
          .from('guests')
          .select('*')
          .eq('event_id', selectedEvent)
          .order('created_at', { ascending: false })
          .then(({ data, error }) => {
            if (!error && data) {
              setGuests(data || [])
            }
          });
      }
      
      // Reiniciar scanner após 3 segundos
      if (scanMode === 'camera') {
        setTimeout(() => {
          setScanning(true);
        }, 3000);
      } else {
        setManualCode('');
      }
      
    } catch (error) {
      console.error('Erro ao processar QR code:', error)
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao processar o check-in. Verifique o console para mais detalhes.",
        variant: "destructive"
      })
      
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
    }
  }

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
      
      <h1 className="text-2xl font-bold mb-6">Check-in de Convidados</h1>
      
      {/* Status de conectividade do scanner - novo */}
      {scanning && (
        <div className="bg-blue-50 p-3 rounded-lg mb-4 border border-blue-300">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-2 animate-pulse"></div>
            <p className="text-sm text-blue-800">
              Scanner ativo - aponte diretamente para o QR code, mantendo a uma distância de 10-20cm
            </p>
          </div>
        </div>
      )}
      
      {/* Seleção de evento */}
      <Card className="mb-4 md:mb-6 shadow-sm">
        <CardHeader className="pb-3 md:pb-4">
          <CardTitle className="text-lg md:text-xl">Selecione o Evento</CardTitle>
          <CardDescription className="text-sm">
            Escolha o evento para realizar o check-in
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
          {/* Estatísticas */}
          <div className="grid grid-cols-2 gap-4 mb-6">
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
          
          {/* Scanner */}
          <Card className="mb-6">
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
          
          {/* Último resultado */}
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
        </>
      )}
    </div>
  )
} 