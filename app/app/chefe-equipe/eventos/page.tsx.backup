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


// Helper function to safely parse date and time strings into a Date object
function parseDateTime(dateStr: string | null | undefined, timeStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  // Default time if timeStr is missing or invalid
  const time = timeStr?.match(/^([0-1]?[0-9]|2[0-3]):([0-5][0-9])(:[0-5][0-9])?$/) ? timeStr : '00:00:00';
  try {
    // Attempt to create Date object from ISO-like string
    const dateTime = new Date(`${dateStr}T${time}`);
    // Check if the date is valid (Date object constructor returns 'Invalid Date' on failure)
    if (isNaN(dateTime.getTime())) {
       console.warn(`Invalid date/time combination: ${dateStr} T ${time}`);
       // Fallback: try parsing date only
       const dateOnly = new Date(dateStr);
       return isNaN(dateOnly.getTime()) ? null : dateOnly;
    }
    return dateTime;
  } catch (e) {
    console.error("Error parsing date/time:", e);
    return null; // Return null on parsing errors
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

        // Sort events client-side using the updated isEventPast
        const sortedEvents = fetchedEvents.sort((a, b) => {
          const isAPast = isEventPast(a);
          const isBPast = isEventPast(b);

          const dateA = parseDateTime(a.date, a.time)?.getTime() ?? 0; // Use start date for sorting active
          const dateB = parseDateTime(b.date, b.time)?.getTime() ?? 0; // Use start date for sorting active
          const endDateA = parseDateTime(a.end_date || a.date, a.end_time || '23:59:59')?.getTime() ?? 0; // Use end date for sorting past
          const endDateB = parseDateTime(b.end_date || b.date, b.end_time || '23:59:59')?.getTime() ?? 0; // Use end date for sorting past


          // Both upcoming/active
          if (!isAPast && !isBPast) {
            return dateA - dateB; // Sort upcoming by start date (closest first)
          }
          // A is upcoming/active, B is past
          if (!isAPast && isBPast) {
            return -1; // Upcoming/active events come first
          }
          // A is past, B is upcoming/active
          if (isAPast && !isBPast) {
            return 1; // Upcoming/active events come first
          }
          // Both past
          if (isAPast && isBPast) {
            // Sort past events by end date (most recent end date first)
            return endDateB - endDateA;
          }

          return 0; // Default case
        });

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