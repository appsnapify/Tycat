"use client"

import React, { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/lib/database.types' // Assuming you have this type definitions file
import { Loader2, AlertCircle, Calendar, Info, MapPin } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Image from 'next/image'
import { Button } from '@/components/ui/button'

// Adjust Event interface to include fields from the reference card
interface Event {
  id: string;
  name: string;
  description?: string | null;
  start_date: string; 
  end_date?: string | null;
  location?: string | null;
  organization_id: string; 
  flyer_url?: string | null; // Added for image
  status?: 'scheduled' | 'active' | 'completed' | null; // Added status
  // Add other relevant fields from your 'events' table if needed
  organizations?: { // Keep this if you still fetch org name separately
      name: string;
  } | null;
}

// Helper function to determine if event is past (similar to organizer page)
function isEventPast(event: Event): boolean {
  if (event.status === 'completed') {
    return true;
  }
  if (!event.start_date) return false; // Use start_date as the primary date
  
  let eventEndDate: Date;
  if (event.end_date) {
    eventEndDate = new Date(event.end_date);
    // Consider adding time parsing if relevant
    eventEndDate.setHours(23, 59, 59); // Assume end of day if no time
  } else {
    eventEndDate = new Date(event.start_date);
    eventEndDate.setHours(23, 59, 59); // Assume end of day if only start date
  }
  
  // Optional: Add margin for events ending after midnight
  // eventEndDate.setHours(eventEndDate.getHours() + 8); 
  
  const today = new Date();
  return eventEndDate < today;
}

// Define props for EventListContent
interface EventListContentProps {
  orgId: string | null;
}

// Internal component to handle the logic dependent on searchParams
function EventListContent({ orgId }: EventListContentProps) { 
  const supabase = createClientComponentClient<Database>()
  
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [organizationName, setOrganizationName] = useState<string | null>(null) 

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
        // 1. Fetch Organization Name (Restored .single())
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .select('name')
          .eq('id', orgId)
          .single() // Restored

        if (orgError) {
          console.warn("EventsPage: Erro ao buscar nome da organização:", orgError)
        } else if (orgData) {
          setOrganizationName(orgData.name) // Use name directly from single object
        } 

        // 2. Fetch Events for the specific organization (Removed .order() again)
        const { data, error: eventsError } = await supabase
          .from('events') 
          .select('*') // Fetch all columns for now, including flyer_url, status, etc.
          .eq('organization_id', orgId) 
          // .order('start_date', { ascending: true }) // Temporarily Removed Again

        if (eventsError) {
          console.error("EventsPage: Erro ao buscar eventos:", eventsError) 
          const errorMessage = eventsError.message || eventsError.details || eventsError.code || 'Erro desconhecido do Supabase';
          throw new Error(`Falha ao carregar eventos: ${errorMessage}`)
        }

        // Sort events client-side
        const sortedEvents = (data || []).sort((a, b) => {
          const now = new Date().getTime();
          const dateA = new Date(a.start_date).getTime();
          const dateB = new Date(b.start_date).getTime();

          const isAPast = a.status === 'completed' || isEventPast(a);
          const isBPast = b.status === 'completed' || isEventPast(b);

          // Both upcoming
          if (!isAPast && !isBPast) {
            return dateA - dateB; // Sort by closest date first
          }
          // A is upcoming, B is past
          if (!isAPast && isBPast) {
            return -1; // Upcoming events come first
          }
          // A is past, B is upcoming
          if (isAPast && !isBPast) {
            return 1; // Upcoming events come first
          }
          // Both past
          if (isAPast && isBPast) {
            return dateB - dateA; // Sort past events by most recent first
          }
          
          return 0; // Default case (shouldn't happen)
        });

        setEvents(sortedEvents)

      } catch (err: any) {
        setError(err.message || "Ocorreu um erro desconhecido.")
      } finally {
        setLoading(false)
      }
    }

    fetchEvents()
  }, [orgId, supabase]) 

  // --- Render Logic ---
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

  if (events.length === 0) {
    return (
       <Card className="border-dashed bg-muted/40 mt-6">
         <CardContent className="p-6 text-center flex flex-col items-center justify-center min-h-[150px]">
            <Calendar className="h-10 w-10 text-muted-foreground/60 mb-3" />
            <h3 className="font-medium mb-1 text-muted-foreground">Nenhum Evento Encontrado</h3>
            <p className="text-sm text-muted-foreground/80">
                Não há eventos registados para {organizationName || 'esta organização'} no momento.
            </p>
        </CardContent>
      </Card>
    )
  }

  // --- Display Events (NEW STRUCTURE) ---
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
      {events.map((event) => {
        // Log the event object being rendered - REMOVED
        // console.log('Rendering card for event:', event); 

        const isPast = event.status === 'completed' || isEventPast(event);
        const eventImg = event.flyer_url || '/placeholder-event.jpg'; // Default placeholder

        // Determine status badge (similar to organizer logic)
        const statusConfig = {
          scheduled: { label: "Próximo", color: "bg-blue-500" },
          active: { label: "Em Andamento", color: "bg-green-500" },
          completed: { label: "Realizado", color: "bg-gray-500" }
        };
        const currentStatus = event.status || (isPast ? 'completed' : new Date(event.start_date) <= new Date() ? 'active' : 'scheduled');
        const statusInfo = statusConfig[currentStatus as keyof typeof statusConfig] || statusConfig.scheduled;

        return (
          <Card key={event.id} className={`overflow-hidden ${isPast ? 'opacity-80 border-gray-300' : ''}`}>
            <CardHeader className="p-0">
              <div className="relative h-40"> {/* Aspect ratio can be adjusted */}
                <Image 
                  src={eventImg}
                  alt={event.name || 'Imagem do evento'}
                  fill
                  style={{ objectFit: 'cover' }}
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  onError={(e) => { e.currentTarget.src = '/placeholder-event.jpg' }} // Fallback on error
                />
                {isPast && (
                  <div className="absolute inset-0 bg-gray-200 bg-opacity-20"></div>
                )}
                <div className="absolute top-2 right-2">
                   {!isPast && currentStatus !== 'completed' && (
                      <Badge className={`${statusInfo.color} text-white text-xs backdrop-blur-sm shadow`}>
                        {statusInfo.label}
                      </Badge>
                  )}
                </div>
                 {isPast && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gray-800 bg-opacity-80 text-white text-center py-1.5 text-sm font-semibold">
                    EVENTO REALIZADO
                    </div>
                )}
              </div>
            </CardHeader>
            <CardContent className={`p-4 ${isPast ? 'bg-gray-50' : ''}`}> 
              {/* Restored truncate class */}
              <h3 className="font-semibold text-lg mb-2 truncate" title={event.name || 'Nome Indisponível'}>
                {event.name || 'Nome Indisponível'} 
              </h3>
              <div className="text-sm text-muted-foreground space-y-1.5 mt-1">
                 {event.start_date && (
                     <div className="flex items-center gap-2">
                         <Calendar className="w-4 h-4 flex-shrink-0"/>
                         <span>{new Date(event.start_date).toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                         {/* Optionally add time if available */}
                     </div>
                 )}
                 {event.location && (
                     <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 flex-shrink-0"/>
                        <span className="truncate" title={event.location}>{event.location}</span> 
                     </div>
                 )}
              </div>
              <div className="mt-4 pt-4 border-t border-muted/60">
                 <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full" 
                    onClick={() => alert(`Material para: ${event.name}`)}
                 >
                     Material Promocional
                 </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  )
}


// Main Page Component using Suspense for searchParams
export default function TeamLeaderEventsPage() {
  // Use Suspense to handle the case where searchParams are not yet available
  return (
    <Suspense fallback={<LoadingPlaceholder />}> 
      <EventsPageContent />
    </Suspense>
  );
}

// Component to render the main page content AFTER Suspense resolves
function EventsPageContent() {
  const searchParams = useSearchParams(); 
  const orgId = searchParams.get('orgId'); 
  const [orgName, setOrgName] = useState<string | null>(null);
  const supabase = createClientComponentClient<Database>();

  // Fetch org name separately for the title (Restored .single())
  useEffect(() => {
     const fetchOrgNameForTitle = async () => {
        if (orgId && !orgName) { 
            const { data, error } = await supabase
                .from('organizations')
                .select('name')
                .eq('id', orgId)
                .single(); // Restored
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
  }, [orgId, supabase, orgName]); 


  return (
    <div className="container pb-8 space-y-4">
      <h1 className="text-3xl font-bold tracking-tight">
          Eventos {orgName ? `da Organização: ${orgName}` : 'da Organização Selecionada'}
      </h1>
      <p className="text-muted-foreground">
        Veja os eventos associados à organização que selecionou no dashboard.
      </p>
      
      <EventListContent orgId={orgId} />
    </div>
  );
}

// Simple placeholder for Suspense fallback
function LoadingPlaceholder() {
   return (
      <div className="container py-10 flex flex-col items-center justify-center min-h-[70vh]">
        <Loader2 className="h-12 w-12 animate-spin text-muted-foreground mx-auto" />
        <p className="text-muted-foreground mt-4">A carregar página de eventos...</p>
    </div>
  )
} 