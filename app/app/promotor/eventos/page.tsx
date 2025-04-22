import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image'; // Added for event flyer
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; // Removed CardDescription import
import { ArrowLeftIcon, CalendarIcon, /* MapPinIcon, UsersIcon, */ Building, Download as DownloadIcon, ImageOff } from 'lucide-react'; // Added DownloadIcon, ImageOff, removed unused
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import EventCardPromotor from './EventCardPromotor'; // IMPORT THE NEW COMPONENT

// Updated Evento interface to include location
interface Evento {
  id: string;
  title: string;
  date: string; // Start date
  time?: string | null; // Start time
  end_date?: string | null; // End date
  end_time?: string | null; // End time
  flyer_url: string | null;
  is_published?: boolean;
  location?: string | null; // Added location
}

interface Organizacao {
  id: string;
  name: string | null;
  logo_url: string | null;
}

// Helper function to safely parse date and time strings into a Date object
function parseDateTime(dateStr: string | null | undefined, timeStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  const time = timeStr?.match(/^([0-1]?[0-9]|2[0-3]):([0-5][0-9])(:[0-5][0-9])?$/) ? timeStr : '00:00:00';
  try {
    const dateTime = new Date(`${dateStr}T${time}`);
    if (isNaN(dateTime.getTime())) {
       console.warn(`[parseDateTime] Invalid date/time combination: ${dateStr} T ${time}`);
       const dateOnly = new Date(dateStr);
       return isNaN(dateOnly.getTime()) ? null : dateOnly; // Fallback to date only if valid
    }
    return dateTime;
  } catch (e) {
    console.error("[parseDateTime] Error parsing date/time:", e);
    return null;
  }
}

// Helper function to determine if event is past
function isEventPast(event: Evento): boolean {
  const now = new Date();
  // Use end_date/end_time if available, otherwise fallback to date/time (assume end of day for date only)
  const relevantDateStr = event.end_date || event.date;
  const relevantTimeStr = event.end_date ? event.end_time : (event.time || '23:59:59'); // Use specific time if end_date isn't present but start time is, else end of day

  const endDateTime = parseDateTime(relevantDateStr, relevantTimeStr);

  if (!endDateTime) {
    console.warn(`[isEventPast] Could not parse end date/time for event ID ${event.id}. Treating as not past.`);
    return false; // Treat as not past if parsing fails
  }

  return endDateTime < now;
}

// Helper function to fetch organization details (no change needed here)
async function fetchOrganizationDetails(orgId: string, supabase: any): Promise<Organizacao | null> {
  console.log(`[EventosPromotor] Buscando detalhes para orgId: ${orgId}`);
  const { data, error } = await supabase
    .from('organizations')
    .select('id, name, logo_url')
    .eq('id', orgId)
    .single();

  if (error) {
    console.error(`[EventosPromotor] Erro ao buscar detalhes da organização ${orgId}:`, error);
    return null;
  }
  console.log(`[EventosPromotor] Detalhes da organização ${orgId} encontrados:`, !!data);
  return data;
}

// Updated fetchOrganizationEvents to include location
async function fetchOrganizationEvents(orgId: string, supabase: any): Promise<Evento[]> {
  console.log(`[EventosPromotor] Buscando eventos para orgId: ${orgId} (incl. location)`);
  const { data, error } = await supabase
    .from('events')
    // Select location field as well
    .select('id, title, date, time, end_date, end_time, flyer_url, is_published, location') 
    .eq('organization_id', orgId)
    .eq('is_published', true)
    .order('date', { ascending: true })
    .order('time', { ascending: true, nullsFirst: true }); 

  if (error) {
    console.error(`[EventosPromotor] Erro ao buscar eventos para org ${orgId}:`, error);
    return [];
  }
  console.log(`[EventosPromotor] Eventos encontrados para ${orgId}: ${data?.length ?? 0}`);
  return (data as Evento[]) || [];
}

export default async function EventosPromotorPage({
  searchParams,
}: {
  searchParams: { orgId?: string };
}) {
  const orgId = searchParams.orgId;

  if (!orgId) {
    console.warn("[EventosPromotor] orgId não encontrado nos searchParams. Redirecionando para dashboard.");
    redirect('/app/promotor/dashboard');
  }

  const cookieStore = cookies();
  const supabase = createServerComponentClient({ cookies: () => cookieStore });

  let organization: Organizacao | null = null;
  let allEvents: Evento[] = []; // Rename to allEvents
  try {
    console.log(`[EventosPromotor] Iniciando busca paralela para orgId: ${orgId}`);
    // Fetch org details and all published events
    [organization, allEvents] = await Promise.all([
      fetchOrganizationDetails(orgId, supabase),
      fetchOrganizationEvents(orgId, supabase),
    ]);
    console.log(`[EventosPromotor] Busca paralela concluída para orgId: ${orgId}`);
  } catch (error) {
    console.error(`[EventosPromotor] Erro durante Promise.all para orgId ${orgId}:`, error);
    return (
        <div className="container mx-auto p-4 md:p-8">
            <p className="text-red-500">Ocorreu um erro ao carregar os dados. Tente novamente mais tarde.</p>
            <Link href="/app/promotor/dashboard">
                <Button variant="outline" className="mt-4">
                    <ArrowLeftIcon className="mr-2 h-4 w-4" /> Voltar ao Dashboard
                </Button>
            </Link>
        </div>
    );
  }

  if (!organization) {
    console.warn(`[EventosPromotor] Organização com ID ${orgId} não encontrada.`);
    notFound();
  }

  // Filter events into active and past using the helper function
  const activeEvents = allEvents.filter(event => !isEventPast(event));
  const pastEvents = allEvents.filter(event => isEventPast(event));
  
  // Sort past events descending by end date/time (most recent first)
  // Note: Sorting here might be slightly different than chefe's client-side if parseDateTime differs subtly
  pastEvents.sort((a, b) => {
       const endA = parseDateTime(a.end_date || a.date, a.end_time || '23:59:59')?.getTime() ?? 0;
       const endB = parseDateTime(b.end_date || b.date, b.end_time || '23:59:59')?.getTime() ?? 0;
       return endB - endA; // Descending order
  });

  // --- Renderização Atualizada com Secções Separadas ---
  return (
    <div className="container mx-auto p-4 md:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4">
        <div>
           <h1 className="text-2xl md:text-3xl font-bold">
             Eventos da Organização: {organization.name || 'Sem Nome'}
           </h1>
           <p className="text-muted-foreground mt-1">
                Veja os eventos associados à organização que selecionou no dashboard.
            </p>
        </div>
        <Link href="/app/promotor/dashboard" className="flex-shrink-0">
          <Button variant="outline" size="sm">
            <ArrowLeftIcon className="mr-2 h-4 w-4" /> Voltar
          </Button>
        </Link>
      </div>

      {/* Secção Eventos Ativos */}
      <div>
         <h2 className="text-xl font-semibold tracking-tight mb-4">Eventos Ativos</h2>
         {activeEvents.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
               {activeEvents.map((evento) => (
                  <EventCardPromotor key={`active-${evento.id}`} event={evento} />
               ))}
            </div>
         ) : (
            <div className="text-center py-6 bg-muted/50 rounded-md border border-dashed">
               <p className="text-muted-foreground">Nenhum evento ativo encontrado para esta organização.</p>
            </div>
         )}
      </div>

       {/* Separator */}
       {pastEvents.length > 0 && activeEvents.length > 0 && <hr className="my-6" />} 

      {/* Secção Eventos Terminados */}
      {pastEvents.length > 0 && (
          <div>
             <h2 className="text-xl font-semibold tracking-tight mb-4">Eventos Terminados</h2>
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                 {pastEvents.map((evento) => (
                    <EventCardPromotor key={`past-${evento.id}`} event={evento} isPastEvent={true} />
                 ))}
              </div>
          </div>
       )}

       {/* Message if no events at all */}
       {activeEvents.length === 0 && pastEvents.length === 0 && (
            <div className="text-center py-10 bg-muted/50 rounded-md border border-dashed">
                 <p className="text-muted-foreground">Nenhum evento publicado encontrado para esta organização.</p>
             </div>
       )}

    </div>
  );
} 