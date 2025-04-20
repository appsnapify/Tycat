'use client'

// Essencialmente a mesma página que a de eventos normais, mas com foco em guest list
// Reutilizamos o mesmo código com pequenas adaptações

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { CalendarIcon, Clock, MapPin, Share2, UserCheck, Users, ChevronDown, Info, Lock, Timer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/components/ui/use-toast'
import { supabase } from '@/lib/supabase'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Badge } from '@/components/ui/badge'
import { use } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { format, formatDistanceToNow } from 'date-fns'
import { pt } from 'date-fns/locale'

// Schema de validação para o formulário de registro
const guestFormSchema = z.object({
  name: z.string().min(2, {
    message: "O nome deve ter pelo menos 2 caracteres",
  }),
  phone: z.string().min(3, {
    message: "Digite um número de telefone válido",
  }),
})

type GuestFormValues = z.infer<typeof guestFormSchema>

// Interface do evento atualizada
interface Event {
  id: string
  title: string
  description: string
  date: string // YYYY-MM-DD
  time: string // HH:MM:SS
  end_date?: string | null
  end_time?: string | null
  location: string
  flyer_url?: string | null
  type?: string
  // is_active foi renomeado para is_published no DB (confirmado via SQL)
  is_published: boolean | null // Estado de publicação/atividade
  organization_id: string
  guest_list_settings?: { max_guests?: number } | null
  guest_list_open_datetime?: string | null // Timestamp completo
  guest_list_close_datetime?: string | null // Timestamp completo
}

// Tipos para o estado da lista
type GuestListStatus = 'LOADING' | 'INACTIVE' | 'NOT_YET_OPEN' | 'OPEN' | 'CLOSED' | 'ERROR' | 'NOT_FOUND';

// Lista de países
const countries = [
  { code: 'PT', name: 'Portugal', prefix: '+351', flag: '🇵🇹' },
  { code: 'BR', name: 'Brasil', prefix: '+55', flag: '🇧🇷' },
  { code: 'US', name: 'Estados Unidos', prefix: '+1', flag: '🇺🇸' },
  { code: 'ES', name: 'Espanha', prefix: '+34', flag: '🇪🇸' },
  { code: 'IT', name: 'Itália', prefix: '+39', flag: '🇮🇹' },
  { code: 'FR', name: 'França', prefix: '+33', flag: '🇫🇷' },
  { code: 'UK', name: 'Reino Unido', prefix: '+44', flag: '🇬🇧' },
  { code: 'DE', name: 'Alemanha', prefix: '+49', flag: '🇩🇪' },
  { code: 'CV', name: 'Cabo Verde', prefix: '+238', flag: '🇨🇻' },
  { code: 'AO', name: 'Angola', prefix: '+244', flag: '🇦🇴' },
  { code: 'MZ', name: 'Moçambique', prefix: '+258', flag: '🇲🇿' },
];

// Componente que lida com a lógica de dados
function GuestListPageContent({ eventId }: { eventId: string }) {
  const router = useRouter()
  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [registrationSuccess, setRegistrationSuccess] = useState(false)
  const [guestCount, setGuestCount] = useState<number>(0)
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null)
  const [selectedCountry, setSelectedCountry] = useState(countries[0]);
  
  const form = useForm<GuestFormValues>({
    resolver: zodResolver(guestFormSchema),
    defaultValues: { name: "", phone: "" },
  })
  
  // Buscar dados do evento e contagem de convidados
  useEffect(() => {
    let isMounted = true;
    
    async function loadEvent() {
      try {
        if (!isMounted) return;
        setLoading(true);
        setError(null); // Limpar erro anterior

        // Buscar evento - Selecionar campos necessários
        const { data: eventData, error: eventError } = await supabase
            .from('events')
          .select(`
            id,
            title,
            description,
            date,
            time,
            end_date,
            end_time,
            location,
            flyer_url,
            type,
            is_published,
            organization_id,
            guest_list_settings,
            guest_list_open_datetime,
            guest_list_close_datetime
          `)
            .eq('id', eventId)
          .eq('type', 'guest-list') // Garantir que é guest list
          .eq('is_published', true) // <<< Adicionar filtro
          .single();

        // Tratar erro de busca ou evento não encontrado/publicado
        if (eventError) {
           if (eventError.code === 'PGRST116') { // code for 'Not found'
               throw new Error('Guest list não encontrada.');
           } else {
              throw new Error(eventError.message || 'Erro ao buscar dados da guest list.');
           }
        }
         if (!eventData) {
             throw new Error('Guest list não encontrada.');
         }

        if (!isMounted) return; // Verificar montagem após chamadas async

        console.log("Dados da guest list carregados:", eventData);
        setEvent(eventData as Event); // Tipar como Event

        // Buscar contagem de convidados (pode ser feito em paralelo se preferir)
         const { count, error: countError } = await supabase
            .from('guests')
            .select('*', { count: 'exact', head: true })
            .eq('event_id', eventId);
        
        if (!isMounted) return;
        
        if (countError) {
          console.warn("Erro ao buscar contagem de convidados:", countError);
          setGuestCount(0); // Assumir 0 em caso de erro na contagem
        } else {
          setGuestCount(count || 0);
        }

      } catch (err) {
        if (!isMounted) return;
        console.error("Erro ao carregar guest list:", err);
        setError(err instanceof Error ? err.message : 'Erro ao carregar guest list');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }
    
    loadEvent();
    
    return () => { isMounted = false; };
  }, [eventId]);
  
  // Calcular o estado atual da guest list
  const guestListStatus: GuestListStatus = useMemo(() => {
    if (loading) return 'LOADING';
    if (error) return 'ERROR'; // Usar o estado de erro geral
    if (!event) return 'NOT_FOUND'; // Se não houver evento após carregar

    if (event.is_published === false || event.is_published === null) {
      return 'INACTIVE';
    }

    const now = new Date();
    const openTime = event.guest_list_open_datetime ? new Date(event.guest_list_open_datetime) : null;
    const closeTime = event.guest_list_close_datetime ? new Date(event.guest_list_close_datetime) : null;

    // Verificar se as datas são válidas
    if (!openTime || !closeTime || isNaN(openTime.getTime()) || isNaN(closeTime.getTime())) {
        console.error("Datas de abertura/fecho inválidas no evento:", event);
        return 'ERROR'; // Considerar erro se as datas estiverem inválidas/ausentes
    }

    if (now < openTime) {
      return 'NOT_YET_OPEN';
    }
    if (now >= closeTime) {
      return 'CLOSED';
    }
    return 'OPEN'; // Se passou pelas verificações anteriores, está aberta

  }, [event, loading, error]);


  // Funções de formatação (ajustadas ligeiramente)
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'Data Indisponível';
    try {
      return format(new Date(dateString), "EEEE, d 'de' MMMM 'de' yyyy", { locale: pt });
    } catch { return "Data Inválida"; }
  };

  const formatTime = (timeString: string | null | undefined) => {
    if (!timeString) return 'Hora Indisponível';
    // Assume formato HH:MM:SS ou um timestamp completo
    try {
       if (timeString.includes(':') && !timeString.includes('T')) {
            const [hours, minutes] = timeString.split(':');
            return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
       } else {
           return format(new Date(`1970-01-01T${timeString}`), 'HH:mm'); // Tentar formatar como hora
       }
    } catch {
        try {
            // Tentar formatar como timestamp completo se falhar como hora
            return format(new Date(timeString), 'HH:mm');
        } catch { return "Hora Inválida"; }
    }
  };

  const formatFullDateTime = (dateTimeString: string | null | undefined) => {
    if (!dateTimeString) return 'Data/Hora Indisponível';
    try {
      return format(new Date(dateTimeString), "dd/MM/yyyy 'às' HH:mm", { locale: pt });
    } catch { return "Data/Hora Inválida"; }
  };

  const formatRelativeTime = (dateTimeString: string | null | undefined) => {
    if (!dateTimeString) return '';
    try {
        const date = new Date(dateTimeString);
        if (isNaN(date.getTime())) return "";
        return formatDistanceToNow(date, { addSuffix: true, locale: pt });
    } catch { return ""; }
  };

  
  // Função para registrar convidado
  const onSubmit = async (data: GuestFormValues) => {
    // Validação extra no frontend (embora a API deva ser a principal)
    if (guestListStatus !== 'OPEN') {
        toast({ title: "Erro", description: "A lista não está aberta para registos neste momento.", variant: "destructive"});
        return;
    }
    if (!event) return;
    
    setSubmitting(true);
    try {
      const sanitizedPhone = data.phone.replace(/D/g, '');
      const fullPhone = `${selectedCountry.prefix}${sanitizedPhone}`;
      
      const guestData = {
        event_id: event.id,
        name: data.name,
        phone: fullPhone,
        // created_at é definido pela API ou DB
      };
      
      console.log("Enviando dados para /api/guests:", guestData);

      const response = await fetch('/api/guests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(guestData),
      });

      const result = await response.json(); // Ler JSON mesmo se não for ok
      
      if (!response.ok) {
          console.error("Erro da API /api/guests:", result);
        // Usar a mensagem de erro da API se disponível
        throw new Error(result.error || `Erro ${response.status}: ${response.statusText}`);
      }
      
      console.log("Resposta da API /api/guests:", result);
      
      if (result.qrCodeUrl) {
        setQrCodeUrl(result.qrCodeUrl);
      }
      
      // Lógica de LocalStorage (simplificada, assumindo que API retorna se foi local)
      if (result.source === "local_storage" && result.data) {
        try {
          const storageKey = `guests_${event.id}`;
          const existingGuests = localStorage.getItem(storageKey);
          const guestsList = existingGuests ? JSON.parse(existingGuests) : [];
          guestsList.push(result.data);
          localStorage.setItem(storageKey, JSON.stringify(guestsList));
        } catch (storageError) {
          console.error("Erro ao salvar no localStorage:", storageError);
          // Não bloquear o fluxo por erro de localStorage
        }
      }
      
      setRegistrationSuccess(true);
      setGuestCount(prevCount => prevCount + 1);
      
      toast({
        title: result.message || "Registro confirmado!",
        description: "Você foi adicionado à guest list com sucesso.",
      });
      
    } catch (err) {
      console.error("Erro ao registrar convidado:", err);
      toast({
        title: "Erro no Registro",
        description: err instanceof Error ? err.message : "Não foi possível adicionar à lista.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }
  
  const shareViaWhatsApp = () => {
    if (!event) return;
    const message = `Olá! Veja este evento: ${event.title}. Detalhes: ${window.location.href}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };
  
  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href)
      .then(() => toast({ title: "Link Copiado!", description: "Link do evento copiado para a área de transferência." }))
      .catch(err => toast({ title: "Erro", description: "Não foi possível copiar o link.", variant: "destructive" }));
  };

  // --- Renderização --- //

  if (loading) {
    return (
      <div className="container mx-auto p-4 md:p-8 animate-pulse">
         <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
             <div className="md:col-span-2 space-y-6">
                 <div className="relative w-full h-64 md:h-96 bg-muted rounded-lg"></div>
                 <div className="space-y-2">
                    <div className="h-8 w-3/4 bg-muted rounded"></div>
                    <div className="h-6 w-1/2 bg-muted rounded"></div>
                 </div>
                 <div className="h-24 bg-muted rounded"></div>
                 <div className="h-10 w-full bg-muted rounded"></div>
             </div>
             <div className="space-y-6">
                 <div className="h-48 bg-muted rounded-lg"></div>
                 <div className="h-40 bg-muted rounded-lg"></div>
             </div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="container mx-auto p-4 md:p-8 text-center">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erro ao Carregar</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button variant="outline" onClick={() => router.back()} className="mt-4">Voltar</Button>
      </div>
    );
  }

  if (!event) {
    // Este estado não deveria ser alcançado se o tratamento de erro funcionar,
    // mas serve como fallback.
    return (
      <div className="container mx-auto p-4 md:p-8 text-center">
        <p>Guest list não encontrada.</p>
        <Button variant="outline" onClick={() => router.back()} className="mt-4">Voltar</Button>
      </div>
    );
  }

  // Cálculo de limite de convidados
  const maxGuests = event.guest_list_settings?.max_guests ?? Infinity; // Default para infinito se não definido
  const spotsLeft = maxGuests === Infinity ? Infinity : Math.max(0, maxGuests - guestCount);
  const isListFull = spotsLeft === 0;
  
  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

        {/* Coluna Principal (Esquerda) */}
        <div className="md:col-span-2 space-y-6">
          {/* Imagem do Flyer */}
          <div className="relative w-full h-64 md:h-96 overflow-hidden rounded-lg shadow-lg bg-muted">
        {event.flyer_url ? (
          <Image
            src={event.flyer_url}
                alt={`Flyer do evento ${event.title}`}
                layout="fill"
                objectFit="cover"
                priority // Carregar imagem principal mais rápido
          />
        ) : (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                Sem flyer disponível
              </div>
            )}
          </div>

          {/* Título e Data */}
          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{event.title}</h1>
            <div className="flex items-center space-x-2 text-muted-foreground">
              <CalendarIcon className="h-5 w-5" />
              <span>{formatDate(event.date)}</span>
              <Clock className="h-5 w-5 ml-2" />
              <span>{formatTime(event.time)}</span>
              {event.end_date && event.end_time && (
                  <span className="hidden sm:inline"> - {formatTime(event.end_time)}</span>
              )}
            </div>
            <div className="flex items-center space-x-2 text-muted-foreground">
              <MapPin className="h-5 w-5" />
              <span>{event.location}</span>
        </div>
      </div>
      
          {/* Descrição */}
          <div className="prose prose-sm md:prose-base max-w-none dark:prose-invert">
            <p>{event.description}</p>
                </div>
                
          {/* Ações (Compartilhar) */}
          <div className="flex space-x-2">
            <Button variant="outline" onClick={shareViaWhatsApp}>
              <Share2 className="mr-2 h-4 w-4" /> Compartilhar WhatsApp
            </Button>
            <Button variant="outline" onClick={copyLink}>
              Copiar Link
            </Button>
                  </div>
                </div>
                
        {/* Coluna Lateral (Direita) - Formulário / Info Lista */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl flex items-center"><Users className="mr-2 h-5 w-5"/> Guest List</CardTitle>
              {maxGuests !== Infinity && (
                <CardDescription>
                     {guestCount} de {maxGuests} lugares preenchidos. ({spotsLeft} restantes)
                </CardDescription>
              )}
              </CardHeader>
              
             {/* --- Lógica Condicional para Formulário/Mensagens --- */} 

             {guestListStatus === 'OPEN' && !isListFull && !registrationSuccess && (
                 <CardContent>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome Completo</FormLabel>
                            <FormControl>
                                <Input placeholder="Seu nome como no documento" {...field} disabled={submitting} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Telefone</FormLabel>
                              <div className="flex items-center space-x-2">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className="flex-shrink-0 px-3">
                                      {selectedCountry.flag} <span className="hidden sm:inline ml-1">{selectedCountry.prefix}</span>
                                      <ChevronDown className="ml-1 h-4 w-4 opacity-50" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="start" className="max-h-60 overflow-y-auto">
                                    {countries.map((country) => (
                                      <DropdownMenuItem
                                        key={country.code}
                                        onSelect={() => setSelectedCountry(country)}
                                      >
                                        {country.flag} {country.name} ({country.prefix})
                                      </DropdownMenuItem>
                                    ))}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                                <FormControl>
                                  <Input type="tel" placeholder="Seu número" {...field} disabled={submitting} />
                                </FormControl>
                              </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                         <Button type="submit" className="w-full" disabled={submitting}>
                           {submitting ? 'Registrando...' : 'Entrar na Lista'}
                      </Button>
                    </form>
                  </Form>
                 </CardContent>
             )}

             {guestListStatus === 'OPEN' && isListFull && !registrationSuccess && (
                 <CardContent>
                     <Alert variant="destructive">
                       <Users className="h-4 w-4" />
                       <AlertTitle>Lista Cheia!</AlertTitle>
                       <AlertDescription>A guest list atingiu o limite máximo de convidados.</AlertDescription>
                     </Alert>
                 </CardContent>
             )}

             {guestListStatus === 'OPEN' && registrationSuccess && (
                 <CardContent className="text-center space-y-4">
                     <UserCheck className="h-16 w-16 mx-auto text-green-500"/>
                     <h3 className="text-lg font-semibold text-green-600">Registro Confirmado!</h3>
                     <p className="text-muted-foreground text-sm">Você foi adicionado com sucesso. Apresente o QR Code na entrada.</p>
                     {qrCodeUrl && (
                         <div className="flex justify-center p-4 bg-white rounded-md shadow-inner">
                            <Image src={qrCodeUrl} alt="QR Code de entrada" width={200} height={200} />
                         </div>
                     )}
                     <Button variant="outline" size="sm" onClick={copyLink} className="w-full">Copiar Link do Evento</Button>
                 </CardContent>
             )}

             {guestListStatus === 'NOT_YET_OPEN' && (
                 <CardContent>
                    <Alert variant="default" className="border-blue-200 bg-blue-50 text-blue-700">
                       <Timer className="h-4 w-4" />
                       <AlertTitle>Lista Abre Em Breve</AlertTitle>
                       <AlertDescription>
                         A guest list abrirá em {formatFullDateTime(event?.guest_list_open_datetime)} ({formatRelativeTime(event?.guest_list_open_datetime)}).
                       </AlertDescription>
                    </Alert>
                 </CardContent>
             )}

             {guestListStatus === 'CLOSED' && (
                 <CardContent>
                    <Alert variant="destructive">
                       <Lock className="h-4 w-4" />
                       <AlertTitle>Lista Fechada</AlertTitle>
                       <AlertDescription>
                         O período para entrar na guest list já terminou.
                       </AlertDescription>
                    </Alert>
                 </CardContent>
             )}

             {guestListStatus === 'INACTIVE' && (
                 <CardContent>
                    <Alert variant="outline">
                       <Info className="h-4 w-4" />
                       <AlertTitle>Evento Inativo</AlertTitle>
                       <AlertDescription>
                         Este evento não está ativo no momento. Contacte o organizador para mais informações.
                       </AlertDescription>
                    </Alert>
                 </CardContent>
             )}
             {guestListStatus === 'ERROR' && (
                <CardContent>
                    <Alert variant="destructive">
                       <AlertCircle className="h-4 w-4" />
                       <AlertTitle>Erro</AlertTitle>
                       <AlertDescription>
                         Não foi possível determinar o estado da lista. Tente novamente mais tarde.
                       </AlertDescription>
                    </Alert>
              </CardContent>
             )}

            </Card>
        </div>

      </div>
    </div>
  );
}

// Componente da Página que recebe os parâmetros
// Usamos use() para lidar com a Promise dos parâmetros
export default function GuestListPage({ params }: { params: Promise<{ id: string }> }) {
  // use() só pode ser chamado dentro do corpo do componente ou hooks
  const resolvedParams = use(params);
  const eventId = resolvedParams?.id;

  // Se não houver ID, mostrar erro ou redirecionar
  if (!eventId) {
    return (
      <div className="container mx-auto p-4 md:p-8 text-center">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription>ID do evento não encontrado na URL.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return <GuestListPageContent eventId={eventId} />;
} 