"use client"

import React, { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/app/app/_providers/auth-provider'
import { Database } from '@/lib/database.types' // Assuming you have this type definitions file
import { Loader2, AlertCircle, Calendar, Info, MapPin, Clock, Download, ImageOff } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import EventCardChefe from './EventCardChefe'


// ✅ FUNÇÃO DE VALIDAÇÃO DE FORMATO DE TEMPO (seguindo regrascodacy.md)
function validateTimeFormat(timeStr: string | null | undefined): string {
  const isValidTime = timeStr?.match(/^([0-1]?[0-9]|2[0-3]):([0-5][0-9])(:[0-5][0-9])?$/);
  return isValidTime ? timeStr : '00:00:00';
}

// ✅ FUNÇÃO DE CRIAÇÃO DE OBJETO DATE
function createDateTimeObject(dateStr: string, time: string): Date {
  return new Date(`${dateStr}T${time}`);
}

// ✅ FUNÇÃO DE FALLBACK PARA DATA INVÁLIDA
function handleInvalidDateTime(dateStr: string, time: string): Date | null {
  console.warn(`Invalid date/time combination: ${dateStr} T ${time}`);
  
  // Fallback: try parsing date only
  const dateOnly = new Date(dateStr);
  return isNaN(dateOnly.getTime()) ? null : dateOnly;
}

// ✅ FUNÇÃO PRINCIPAL REFATORADA (Complexidade reduzida de 25 para <8)
function parseDateTime(dateStr: string | null | undefined, timeStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  
  try {
    // 1. Validar e normalizar formato de tempo
    const time = validateTimeFormat(timeStr);
    
    // 2. Criar objeto Date
    const dateTime = createDateTimeObject(dateStr, time);
    
    // 3. Verificar validade e aplicar fallback se necessário
    if (isNaN(dateTime.getTime())) {
      return handleInvalidDateTime(dateStr, time);
    }
    
    return dateTime;
  } catch (e) {
    console.error("Error parsing date/time:", e);
    return null;
  }
}

// Updated Event interface to match actual DB columns
interface Event {
  id: string;
  title: string; // Changed from name
  description?: string | null;
  date: string; // Primary date (start date)
  time?: string | null; // Start time
  end_date?: string | null; // End date
  end_time?: string | null; // End time
  location?: string | null;
  organization_id: string;
  flyer_url?: string | null;
  is_active?: boolean | null; // Added from DB
  is_published?: boolean | null; // Added from DB
}


// Helper function to determine if event is past based on end_date/end_time or date/time
function isEventPast(event: Event): boolean {
  const now = new Date();

  // Use end_date and end_time if available, otherwise fallback to date and assume end of day for time
  const relevantDateStr = event.end_date || event.date;
  // If end_time exists with end_date, use it. Otherwise, assume end of day for the relevant date.
  const relevantTimeStr = event.end_date ? event.end_time : '23:59:59';

  const endDateTime = parseDateTime(relevantDateStr, relevantTimeStr);

  if (!endDateTime) {
    console.warn(`Could not parse end date/time for event ID ${event.id}. Treating as not past.`);
    return false;
  }

  return endDateTime < now;
}

// Define props for EventListContent
interface EventListContentProps {
  orgId: string | null;
}

// Internal component to handle the logic dependent on searchParams
function EventListContent({ orgId }: EventListContentProps) {
  const { user } = useAuth();

  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [organizationName, setOrganizationName] = useState<string | null>(null)
  const [teamId, setTeamId] = useState<string | null>(null)



  useEffect(() => {
    const fetchEvents = async () => {
      if (!orgId) {
        setError("ID da organização não fornecido na URL.")
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)
      setEvents([])
      setOrganizationName(null)

      try {
        const supabase = createClient();
        // 1. Fetch Organization Name (Remains the same)
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .select('name')
          .eq('id', orgId)
          .single()

        if (orgError) {
          console.warn("EventsPage: Erro ao buscar nome da organização:", orgError)
        } else if (orgData) {
          setOrganizationName(orgData.name)
        }

        // 1.5. Fetch Team ID for the current user in this organization
        if (user?.id) {
          console.log('[CHEFE EQUIPE] Buscando team_id para userId:', user.id, 'orgId:', orgId);
          
          // Query CORRIGIDA: buscar team via team_members -> organization_teams
          const { data: teamData, error: teamError } = await supabase
            .from('team_members')
            .select(`
              team_id,
              teams!inner(
                id,
                name,
                organization_teams!inner(
                  organization_id
                )
              )
            `)
            .eq('user_id', user.id)
            .eq('teams.organization_teams.organization_id', orgId)
            .limit(1)
            .single();

          if (teamError) {
            console.warn("[CHEFE EQUIPE] Erro ao buscar team_id:", teamError);
            // Tentativa alternativa: buscar direto via event_promoters
            const { data: eventPromoterData, error: epError } = await supabase
              .from('event_promoters')
              .select('team_id')
              .eq('promoter_id', user.id)
              .limit(1)
              .single();
              
            if (!epError && eventPromoterData) {
              console.log("[CHEFE EQUIPE] Team ID encontrado via event_promoters:", eventPromoterData.team_id);
              setTeamId(eventPromoterData.team_id);
            } else {
              console.warn("[CHEFE EQUIPE] Fallback também falhou:", epError);
            }
          } else if (teamData) {
            console.log("[CHEFE EQUIPE] Team ID encontrado via team_members:", teamData.team_id);
            setTeamId(teamData.team_id);
          }
        }

        // 2. Fetch Events
        const { data, error: eventsError } = await supabase
          .from('events')
          .select<string, Event>('*')
          .eq('organization_id', orgId)
          .eq('is_published', true);

        if (eventsError) {
          console.error("EventsPage: Erro ao buscar eventos:", eventsError)
          const errorMessage = eventsError.message || eventsError.details || eventsError.code || 'Erro desconhecido do Supabase';
          throw new Error(`Falha ao carregar eventos: ${errorMessage}`)
        }

        // Ensure data is treated as Event[]
        const fetchedEvents: Event[] = data || [];

        // ✅ FUNÇÃO AUXILIAR: Obter dados de ordenação (Complexidade: 2)
        const getEventSortData = (event: Event) => ({
          isPast: isEventPast(event),
          startTime: parseDateTime(event.date, event.time)?.getTime() ?? 0,
          endTime: parseDateTime(event.end_date || event.date, event.end_time || '23:59:59')?.getTime() ?? 0
        });

        // ✅ MAPA DE ESTRATÉGIAS DE ORDENAÇÃO (Complexidade: 1)
        const SORT_STRATEGIES = {
          'upcoming-upcoming': (a: any, b: any) => a.startTime - b.startTime,
          'upcoming-past': () => -1,
          'past-upcoming': () => 1,
          'past-past': (a: any, b: any) => b.endTime - a.endTime
        };

        // ✅ FUNÇÃO DE ORDENAÇÃO REFATORADA (Complexidade: 3)
        const sortEvents = (a: Event, b: Event): number => {
          const dataA = getEventSortData(a);
          const dataB = getEventSortData(b);
          
          const strategyKey = `${dataA.isPast ? 'past' : 'upcoming'}-${dataB.isPast ? 'past' : 'upcoming'}`;
          const strategy = SORT_STRATEGIES[strategyKey as keyof typeof SORT_STRATEGIES];
          
          return strategy ? strategy(dataA, dataB) : 0;
        };

        // Sort events client-side using the refactored strategy
        const sortedEvents = fetchedEvents.sort(sortEvents);

        setEvents(sortedEvents)

      } catch (err: any) {
        setError(err.message || "Ocorreu um erro desconhecido.")
      } finally {
        setLoading(false)
      }
    }

    fetchEvents()
  }, [orgId, user?.id])

  // --- Filter events into active and past right before rendering ---
  const activeEvents = events.filter(event => !isEventPast(event));
  const pastEvents = events.filter(event => isEventPast(event));

  // --- Render Logic (including Modal for multiple images) ---
  if (loading) {
  return (
      <div className="flex flex-col items-center justify-center min-h-[40vh]">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
        <p className="text-muted-foreground mt-3">A carregar eventos...</p>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-destructive bg-destructive/10 mt-6">
        <CardHeader className="flex flex-row items-center space-x-3">
           <AlertCircle className="h-6 w-6 text-destructive flex-shrink-0"/>
           <div>
              <CardTitle className="text-destructive text-lg">Erro</CardTitle>
              <CardDescription className="text-destructive/90">{error}</CardDescription>
           </div>
        </CardHeader>
      </Card>
    )
  }

  if (!orgId) {
      return (
          <Card className="border-yellow-500 bg-yellow-500/10 mt-6">
             <CardHeader className="flex flex-row items-center space-x-3">
               <Info className="h-6 w-6 text-yellow-700 flex-shrink-0"/>
               <div>
                  <CardTitle className="text-yellow-800 text-lg">Organização não especificada</CardTitle>
                  <CardDescription className="text-yellow-700/90">
                      Volte ao dashboard e selecione 'Ver eventos' numa organização.
                  </CardDescription>
               </div>
             </CardHeader>
          </Card>
      )
  }

  // --- Display Events (NEW STRUCTURE with Sections) ---
  return (
    <div className="mt-6 space-y-8"> {/* Add space between sections */}

      {/* Section for Active Events */}
      {activeEvents.length > 0 && (
        <section>
          <h2 className="text-2xl font-semibold tracking-tight mb-4">Eventos Ativos</h2>
          <div className="flex flex-wrap gap-6 justify-start">
            {activeEvents.map((event) => (
              <EventCardChefe 
                key={event.id}
                event={event}
                isPastEvent={false}
                teamId={teamId || ''}
              />
            ))}
          </div>
        </section>
      )}

      {/* Section for Past Events */}
      {pastEvents.length > 0 && (
        <section>
          <h2 className="text-2xl font-semibold tracking-tight mb-4">Eventos Terminados</h2>
          <div className="flex flex-wrap gap-6 justify-start">
            {pastEvents.map((event) => (
              <EventCardChefe 
                key={event.id}
                event={event}
                isPastEvent={true}
                teamId={teamId || ''}
              />
            ))}
          </div>
        </section>
      )}

      {/* Message if no events found AT ALL (remains the same) */}
      {activeEvents.length === 0 && pastEvents.length === 0 && !loading && orgId && (
         <Card className="border-dashed bg-muted/40 mt-6">
             <CardContent className="p-6 text-center flex flex-col items-center justify-center min-h-[150px]">
                <Calendar className="h-10 w-10 text-muted-foreground/60 mb-3" />
                <h3 className="font-medium mb-1 text-muted-foreground">Nenhum Evento Encontrado</h3>
                <p className="text-sm text-muted-foreground/80">
                    Não há eventos registados para {organizationName || 'esta organização'} no momento.
                </p>
        </CardContent>
      </Card>
      )}

    </div>
  )
}

// Main Page Component using Suspense for searchParams (remains the same)
export default function TeamLeaderEventsPage() {
  // Use Suspense to handle the case where searchParams are not yet available
  return (
    <Suspense fallback={<LoadingPlaceholder />}>
      <EventsPageContent />
    </Suspense>
  );
}

// Component to render the main page content AFTER Suspense resolves (remains mostly the same)
function EventsPageContent() {
  const searchParams = useSearchParams();
  const orgId = searchParams.get('orgId');
  const [orgName, setOrgName] = useState<string | null>(null);

  // Fetch org name separately for the title (remains the same)
  useEffect(() => {
     const fetchOrgNameForTitle = async () => {
        if (orgId && !orgName) {
            const supabase = createClient();
            const { data, error } = await supabase
                .from('organizations')
                .select('name')
                .eq('id', orgId)
                .single();
            if (data && !error) {
                setOrgName(data.name);
            } else if (!error) {
                 console.warn("EventsPage Title: Could not fetch org name for title (no data or RLS issue).");
            } else {
                 console.error("EventsPage Title: Error fetching org name:", error);
            }
        }
     };
     fetchOrgNameForTitle();
  }, [orgId, orgName]);


  return (
    <div className="container pb-8 space-y-4">
      <h1 className="text-3xl font-bold tracking-tight">
          Eventos {orgName ? `da Organização: ${orgName}` : 'da Organização Selecionada'}
      </h1>
      <p className="text-muted-foreground">
        Veja os eventos associados à organização que selecionou no dashboard.
      </p>

      {/* Pass orgId down */}
      <EventListContent orgId={orgId} />
    </div>
  );
}

// Simple placeholder for Suspense fallback (remains the same)
function LoadingPlaceholder() {
   return (
      <div className="container py-10 flex flex-col items-center justify-center min-h-[70vh]">
        <Loader2 className="h-12 w-12 animate-spin text-muted-foreground mx-auto" />
        <p className="text-muted-foreground mt-4">A carregar página de eventos...</p>
    </div>
  )
} 