'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { CalendarIcon, Clock, MapPin, Share2, UserCheck, Users, ChevronDown, Info, Lock, Timer, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/components/ui/use-toast'
import { supabase } from '@/lib/supabase' // Usar cliente normal no cliente
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

// Interface do evento (pode ser movida para um ficheiro partilhado de tipos depois)
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
  is_published: boolean | null
  organization_id: string
  guest_list_settings?: { max_guests?: number } | null
  guest_list_open_datetime?: string | null
  guest_list_close_datetime?: string | null
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

// Props esperadas do Server Component
interface GuestListPageClientProps {
  eventId: string;
  promoterId: string | null;
  teamId: string | null;
}

// O nome da função agora reflete que é o Client Component
export default function GuestListPageClient({ eventId, promoterId, teamId }: GuestListPageClientProps) {
  // LOG 1: Verificar props iniciais
  console.log('[GuestListPageClient] Props recebidas:', { eventId, promoterId, teamId });

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

  // Buscar dados do evento e contagem de convidados no cliente
  useEffect(() => {
    // LOG 2: Entrou no useEffect
    console.log('[GuestListPageClient] useEffect executado para eventId:', eventId);
    let isMounted = true;

    async function loadEvent() {
      try {
        if (!isMounted) return;
        // LOG 3: Iniciando busca
        console.log('[GuestListPageClient] Iniciando busca de dados do evento...');
        setLoading(true);
        setError(null);

        // Buscar evento usando o eventId recebido
        console.log("[GuestListPageClient] Chamando supabase.from('events').select..."); // LOG 3.1
        const { data: eventData, error: eventError } = await supabase
            .from('events')
            .select(
              `id, title, description, date, time, end_date, end_time, location, flyer_url,
              type, is_published, organization_id, guest_list_settings,
              guest_list_open_datetime, guest_list_close_datetime`
            )
            .eq('id', eventId)
            .eq('type', 'guest-list')
            .eq('is_published', true)
            .single();
        
        // LOG 4: Resultado da busca do evento
        console.log('[GuestListPageClient] Resultado da busca (evento):', { eventData, eventError });

        if (eventError || !eventData) {
           throw new Error(eventError?.message || 'Guest list não encontrada ou não publicada.');
        }

        if (!isMounted) return;
        setEvent(eventData as Event);
        console.log('[GuestListPageClient] Estado \'event\' definido.'); // Usar \ para escapar aqui está ok

        // Buscar contagem de convidados
        console.log("[GuestListPageClient] Chamando supabase.from('guests').select(count)..."); // LOG 4.2
        const { count, error: countError } = await supabase
            .from('guests')
            .select('*', { count: 'exact', head: true })
            .eq('event_id', eventId);
        
        // LOG 4.3: Resultado da contagem
        console.log('[GuestListPageClient] Resultado da contagem:', { count, countError });

        if (!isMounted) return;
        if (countError) {
          console.warn("[GuestListPageClient] Erro ao buscar contagem de convidados:", countError);
          setGuestCount(0);
        } else {
          setGuestCount(count || 0);
        }
        console.log('[GuestListPageClient] Estado \'guestCount\' definido.'); // Usar \ para escapar aqui está ok

      } catch (err) {
        if (!isMounted) return;
        // LOG 5: Erro capturado no catch
        console.error("[GuestListPageClient] Erro capturado no catch do loadEvent:", err);
        setError(err instanceof Error ? err.message : 'Erro ao carregar guest list');
      } finally {
        if (isMounted) {
          // LOG 6: Bloco finally executado
          console.log('[GuestListPageClient] Executando finally: setLoading(false)');
          setLoading(false);
        }
      }
    }

    loadEvent();

    return () => { 
      console.log('[GuestListPageClient] Limpeza do useEffect'); // LOG 7
      isMounted = false; 
    };
  }, [eventId]);

  // Calcular o estado atual da guest list
  const guestListStatus: GuestListStatus = useMemo(() => {
    // LOG DENTRO useMemo: Início
    console.log('[GuestListPageClient] Recalculando guestListStatus...', { loading, error, eventExists: !!event });

    if (loading) {
        console.log('[GuestListPageClient] useMemo -> Retornando: LOADING');
        return 'LOADING';
    }
    if (error) {
        console.log('[GuestListPageClient] useMemo -> Retornando: ERROR (state)');
        return 'ERROR';
    }
    if (!event) {
        console.log('[GuestListPageClient] useMemo -> Retornando: NOT_FOUND (!event)');
        return 'NOT_FOUND';
    }

    // Event existe, loading é false, error é null
    console.log('[GuestListPageClient] useMemo: Verificando is_published:', event.is_published);
    if (event.is_published !== true) {
      console.log('[GuestListPageClient] useMemo -> Retornando: INACTIVE');
      return 'INACTIVE';
    }

    const openTimeString = event.guest_list_open_datetime;
    const closeTimeString = event.guest_list_close_datetime;
    console.log('[GuestListPageClient] useMemo: Datas do evento (strings):', { openTimeString, closeTimeString });

    if (!openTimeString || !closeTimeString) {
         console.error("[GuestListPageClient] useMemo: Datas de abertura/fecho ausentes!");
         console.log('[GuestListPageClient] useMemo -> Retornando: ERROR (datas ausentes)');
         return 'ERROR';
    }

    const openTime = new Date(openTimeString);
    const closeTime = new Date(closeTimeString);
    console.log('[GuestListPageClient] useMemo: Datas convertidas:', { openTime, closeTime });

    if (isNaN(openTime.getTime()) || isNaN(closeTime.getTime())) {
        console.error("[GuestListPageClient] useMemo: Datas inválidas após conversão!", { openTimeValid: !isNaN(openTime.getTime()), closeTimeValid: !isNaN(closeTime.getTime()) });
        console.log('[GuestListPageClient] useMemo -> Retornando: ERROR (datas inválidas)');
        return 'ERROR';
    }

    const now = new Date();
    console.log('[GuestListPageClient] useMemo: Comparando datas:', { now: now.toISOString(), openTime: openTime.toISOString(), closeTime: closeTime.toISOString(), isBeforeOpen: now < openTime, isAfterClose: now >= closeTime });

    if (now < openTime) {
      console.log('[GuestListPageClient] useMemo -> Retornando: NOT_YET_OPEN');
      return 'NOT_YET_OPEN';
    }
    if (now >= closeTime) {
      console.log('[GuestListPageClient] useMemo -> Retornando: CLOSED');
      return 'CLOSED';
    }

    console.log('[GuestListPageClient] useMemo -> Retornando: OPEN');
    return 'OPEN';

  }, [event, loading, error]);

  // Funções de formatação
  const formatDate = (dateString: string | null | undefined) => {
    // ... (lógica permanece a mesma) ...
  };
  const formatTime = (timeString: string | null | undefined) => {
    // ... (lógica permanece a mesma) ...
  };
  const formatFullDateTime = (dateTimeString: string | null | undefined) => {
    // ... (lógica permanece a mesma) ...
  };
  const formatRelativeTime = (dateTimeString: string | null | undefined) => {
    // ... (lógica permanece a mesma) ...
  };

  // Função para registrar convidado
  const onSubmit = async (data: GuestFormValues) => {
    if (guestListStatus !== 'OPEN') {
      toast({ title: "Erro", description: "A lista não está aberta.", variant: "destructive"});
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
        promoter_id: promoterId, // Usa as props recebidas
        team_id: teamId,         // Usa as props recebidas
      };

      console.log("Enviando dados para /api/guests:", guestData);
      const response = await fetch('/api/guests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(guestData),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || `Erro ${response.status}`);
      }

      console.log("Resposta da API /api/guests:", result);
      if (result.qrCodeUrl) {
        setQrCodeUrl(result.qrCodeUrl);
      }

      setRegistrationSuccess(true);
      setGuestCount(prevCount => prevCount + 1);
      toast({ title: result.message || "Registro confirmado!" });

    } catch (err) {
      console.error("Erro ao registrar convidado:", err);
      toast({ title: "Erro no Registro", description: err instanceof Error ? err.message : "Erro desconhecido", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  const shareViaWhatsApp = () => {
    // ... (lógica permanece a mesma) ...
  };
  const copyLink = () => {
    // ... (lógica permanece a mesma) ...
  };

  // Cálculo de limite de convidados
  const maxGuests = event?.guest_list_settings?.max_guests ?? Infinity;
  const spotsLeft = maxGuests === Infinity ? Infinity : Math.max(0, maxGuests - guestCount);
  const isListFull = spotsLeft === 0;

  // --- LOGS --- 
  console.log('[GuestListPageClient] Estado calculado da lista (guestListStatus):', guestListStatus);
  console.log('[GuestListPageClient] Estado antes da renderização:', { loading, error, event: !!event });

  // --- Renderização --- //

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
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

  return (
    event && (
      <div className="container mx-auto p-4 md:p-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Coluna Esquerda (Detalhes do Evento) */}
          <div className="md:col-span-2 space-y-6">
            {/* Imagem do Flyer */}
            <div className="relative w-full h-64 md:h-96 overflow-hidden rounded-lg shadow-lg bg-muted">
              {event.flyer_url ? (
                <Image
                  src={event.flyer_url}
                  alt={`Flyer do evento ${event.title}`}
                  fill
                  style={{ objectFit: 'cover' }}
                  priority
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
              <div className="flex flex-wrap items-center space-x-2 text-muted-foreground">
                <span className="flex items-center mr-4 mb-1 sm:mb-0"><CalendarIcon className="h-5 w-5 mr-1" /> {formatDate(event.date)}</span>
                <span className="flex items-center mr-4 mb-1 sm:mb-0"><Clock className="h-5 w-5 mr-1" /> {formatTime(event.time)}</span>
                {event.end_time && (
                    <span className="flex items-center mr-4 mb-1 sm:mb-0">(Termina às {formatTime(event.end_time)})</span>
                )}
              </div>
              <div className="flex items-center space-x-2 text-muted-foreground">
                <MapPin className="h-5 w-5" />
                <span>{event.location}</span>
              </div>
            </div>
        
            {/* Descrição */}
            {event.description && (
               <div className="prose prose-sm md:prose-base max-w-none dark:prose-invert">
                  <p>{event.description}</p>
               </div>
            )}
                  
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
                  
          {/* Coluna Direita (Card da Guest List) */}
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
                         {/* ... Formulário ... */}
                         <FormField control={form.control} name="name" render={({ field }) => ( <FormItem> <FormLabel>Nome Completo</FormLabel> <FormControl><Input placeholder="Seu nome como no documento" {...field} disabled={submitting} /></FormControl> <FormMessage /> </FormItem> )} />
                         <FormField control={form.control} name="phone" render={({ field }) => ( <FormItem> <FormLabel>Telefone</FormLabel> <div className="flex items-center space-x-2"> <DropdownMenu> <DropdownMenuTrigger asChild><Button variant="outline" className="flex-shrink-0 px-3">{selectedCountry.flag} <span className="hidden sm:inline ml-1">{selectedCountry.prefix}</span><ChevronDown className="ml-1 h-4 w-4 opacity-50" /></Button></DropdownMenuTrigger> <DropdownMenuContent align="start" className="max-h-60 overflow-y-auto"> {countries.map((country) => (<DropdownMenuItem key={country.code} onSelect={() => setSelectedCountry(country)}>{country.flag} {country.name} ({country.prefix})</DropdownMenuItem> ))} </DropdownMenuContent> </DropdownMenu> <FormControl><Input type="tel" placeholder="Seu número" {...field} disabled={submitting} /></FormControl> </div> <FormMessage /> </FormItem> )} />
                         <Button type="submit" className="w-full" disabled={submitting}>{submitting ? 'Registrando...' : 'Entrar na Lista'}</Button>
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
    )
  );
} 