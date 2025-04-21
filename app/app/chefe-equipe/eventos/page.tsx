"use client"

import React, { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/lib/database.types' // Assuming you have this type definitions file
import { Loader2, AlertCircle, Calendar, Info, MapPin, Clock, Download, ImageOff } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog"

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
  const supabase = createClientComponentClient<Database>()

  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [organizationName, setOrganizationName] = useState<string | null>(null)

  // State for the promotional material modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  // Changed to store multiple URLs
  const [selectedImageUrls, setSelectedImageUrls] = useState<string[]>([]);
  const [selectedImageTitle, setSelectedImageTitle] = useState<string | null>(null);
  // Added loading state for modal images
  const [isLoadingImages, setIsLoadingImages] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null); // Error specific to modal

  // New function to fetch promotional images for a specific event
  const fetchPromotionalImages = async (eventId: string) => {
    setIsLoadingImages(true);
    setModalError(null);
    setSelectedImageUrls([]); // Clear previous images

    console.log("[Debug] Fetching images for event ID:", eventId); // Adicionado log

    try {
      const { data, error: imagesError } = await supabase
        .from('promotional_materials')
        .select('image_url')
        .eq('event_id', eventId);

      if (imagesError) {
        console.error("Modal Error: Erro ao buscar imagens promocionais:", imagesError);
        throw new Error(`Falha ao carregar imagens promocionais: ${imagesError.message}`);
      }

      console.log("[Debug] Fetched data from Supabase:", data); // Adicionado log

      // Extrai as URLs, garantindo que tratamos null/undefined
      const urls = data?.map(item => item.image_url).filter(Boolean) as string[] || [];
      console.log("[Debug] Extracted URLs:", urls); // Adicionado log

      setSelectedImageUrls(urls);

    } catch (err: any) {
      setModalError(err.message || "Ocorreu um erro ao buscar as imagens.");
    } finally {
      setIsLoadingImages(false);
    }
  };

  // Updated handler to fetch images based on event ID
  const handleShowMaterial = (eventId: string, eventTitle: string | null | undefined) => {
      console.log("[Debug] handleShowMaterial called with eventId:", eventId); // Adicionado log
      setSelectedImageTitle(eventTitle || 'evento'); // Set title immediately
      setIsModalOpen(true); // Open modal
      fetchPromotionalImages(eventId); // Start fetching images
  };

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
  }, [orgId, supabase])

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeEvents.map((event) => {
              // --- Card Rendering Logic (Adapted) ---
              const eventImg = event.flyer_url || '/placeholder-event.jpg';

              // --- Determine Status Badge based on Dates ---
              const now = new Date();
              const startDateTime = parseDateTime(event.date, event.time);
              const endDateTime = parseDateTime(event.end_date || event.date, event.end_date ? event.end_time : '23:59:59');

              let statusLabel = "Próximo";
              let statusColor = "bg-blue-500";

              if (startDateTime && endDateTime && now >= startDateTime && now <= endDateTime) {
                  statusLabel = "Em Andamento";
                  statusColor = "bg-green-500";
              } else if (startDateTime && startDateTime > now) {
                   statusLabel = "Próximo";
                   statusColor = "bg-blue-500";
              }
              // Fallback for ongoing if start is past but event isn't filtered as past (should not happen with correct isEventPast)
              else if (startDateTime && now >= startDateTime) {
                 statusLabel = "Em Andamento";
                 statusColor = "bg-green-500";
              }

              return (
                <Card key={event.id} className="overflow-hidden">
                  <CardHeader className="p-0">
                    <div className="relative h-40">
                      <Image
                        src={eventImg}
                        alt={event.title || 'Imagem do evento'} // Use title
                        fill
                        style={{ objectFit: 'cover' }}
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        onError={(e) => { e.currentTarget.src = '/placeholder-event.jpg' }}
                      />
                       <div className="absolute top-2 right-2">
                           <Badge className={`${statusColor} text-white text-xs backdrop-blur-sm shadow`}>
                             {statusLabel}
                           </Badge>
                       </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-lg mb-2 truncate" title={event.title || 'Nome Indisponível'}>
                      {event.title || 'Nome Indisponível'} {/* Use title */}
                    </h3>
                    <div className="text-sm text-muted-foreground space-y-1.5 mt-1">
                       {event.date && (
                           <div className="flex items-center gap-2">
                               <Calendar className="w-4 h-4 flex-shrink-0"/>
                               <span>
                                   {new Date(event.date + 'T00:00:00').toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' })}
                                   {event.time && ` às ${event.time.substring(0, 5)}`}
                               </span>
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
                          onClick={() => handleShowMaterial(event.id, event.title)}
                       >
                           <Download className="mr-2 h-4 w-4" />
                           Material Promocional
                       </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/* Section for Past Events */}
      {pastEvents.length > 0 && (
        <section>
          <h2 className="text-2xl font-semibold tracking-tight mb-4">Eventos Terminados</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pastEvents.map((event) => {
               const eventImg = event.flyer_url || '/placeholder-event.jpg';

              return (
                <Card key={event.id} className="overflow-hidden opacity-80 border-gray-300">
                  <CardHeader className="p-0">
                    <div className="relative h-40">
                      <Image
                        src={eventImg}
                        alt={event.title || 'Imagem do evento'} // Use title
                        fill
                        style={{ objectFit: 'cover' }}
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        onError={(e) => { e.currentTarget.src = '/placeholder-event.jpg' }}
                      />
                      <div className="absolute inset-0 bg-gray-200 bg-opacity-20"></div>
                      <div className="absolute bottom-0 left-0 right-0 bg-gray-800 bg-opacity-80 text-white text-center py-1.5 text-sm font-semibold">
                          EVENTO REALIZADO
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 bg-gray-50">
                    <h3 className="font-semibold text-lg mb-2 truncate" title={event.title || 'Nome Indisponível'}>
                      {event.title || 'Nome Indisponível'} {/* Use title */}
                    </h3>
                    <div className="text-sm text-muted-foreground space-y-1.5 mt-1">
                       {event.date && (
                           <div className="flex items-center gap-2">
                               <Calendar className="w-4 h-4 flex-shrink-0"/>
                               <span>{new Date(event.date + 'T00:00:00').toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
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
                          onClick={() => handleShowMaterial(event.id, event.title)}
                       >
                           <Download className="mr-2 h-4 w-4" />
                           Material Promocional
                       </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
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

      {/* --- Promotional Material Modal (Updated for Multiple Images) --- */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] flex flex-col"> {/* Wider modal, flex column */}
          <DialogHeader>
            <DialogTitle>Material Promocional: {selectedImageTitle || 'Evento'}</DialogTitle>
            <DialogDescription>
              Clique numa imagem para fazer o download.
            </DialogDescription>
          </DialogHeader>

          {/* Content Area with Loading/Error/Images */}
          <div className="flex-grow overflow-y-auto p-1"> {/* Scrollable area */}
            {isLoadingImages ? (
              <div className="flex justify-center items-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="ml-3 text-muted-foreground">A carregar imagens...</p>
              </div>
            ) : modalError ? (
              <div className="flex flex-col justify-center items-center h-40 text-destructive">
                <AlertCircle className="h-8 w-8 mb-2"/>
                <p className="font-semibold">Erro ao carregar</p>
                <p className="text-sm text-center">{modalError}</p>
              </div>
            ) : selectedImageUrls.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4"> {/* Grid layout for images */}
                {selectedImageUrls.map((imageUrl, index) => (
                  <a
                    key={index}
                    href={imageUrl}
                    // Create filename based on title and index
                    download={`material_${selectedImageTitle?.replace(/\s+/g, '_').toLowerCase() || 'evento'}_${index + 1}.jpg`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Clique para fazer download"
                    className="block relative aspect-square overflow-hidden rounded-md border hover:opacity-80 transition-opacity"
                  >
                    <Image
                      src={imageUrl}
                      alt={`Material ${index + 1} para ${selectedImageTitle || 'evento'}`}
                      fill
                      style={{ objectFit: 'cover', cursor: 'pointer' }}
                      sizes="(max-width: 640px) 50vw, 33vw"
                      onError={(e) => {
                        // More robust error handling inside map if needed
                        e.currentTarget.src = '/placeholder-error.png';
                        e.currentTarget.alt = 'Erro ao carregar imagem';
                      }}
                    />
                  </a>
                ))}
              </div>
            ) : (
              <div className="flex flex-col justify-center items-center h-40 text-muted-foreground">
                 <ImageOff className="h-10 w-10 mb-3" />
                 <p>Nenhum material promocional encontrado para este evento.</p>
              </div>
            )}
          </div>

          <DialogFooter className="mt-auto pt-4 border-t"> {/* Footer sticks to bottom */}
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                Fechar
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
  const supabase = createClientComponentClient<Database>();

  // Fetch org name separately for the title (remains the same)
  useEffect(() => {
     const fetchOrgNameForTitle = async () => {
        if (orgId && !orgName) {
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
  }, [orgId, supabase, orgName]);


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