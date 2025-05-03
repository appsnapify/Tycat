import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
// Removed social icons import
import { Database } from '@/lib/database.types';
import Link from 'next/link'; // Re-added Link import
import Image from 'next/image';
// Import a reusable EventCard component (adjust path as needed)
import { EventCard } from '@/components/ui/event-card';

// Define the expected return type from our RPC
// Ensure this matches the RETURNS TABLE definition in the SQL function
type PromoterPageDataEntry = {
  promoter_first_name: string | null;
  promoter_last_name: string | null;
  promoter_avatar_url: string | null;
  event_id: string; // UUID as string
  event_title: string | null;
  event_flyer_url: string | null;
  event_type: string | null;
  event_date: string | null; // date as string
  event_time: string | null; // time as string
  org_id: string | null; // UUID as string
  org_name: string | null;
  org_logo_url: string | null;
  tracking_promoter_id: string; // UUID as string
  tracking_team_id: string; // UUID as string
};

// Helper function to get initials
const getInitials = (firstName?: string | null, lastName?: string | null): string => {
  const firstInitial = firstName?.charAt(0)?.toUpperCase() || '';
  const lastInitial = lastName?.charAt(0)?.toUpperCase() || '';
  return `${firstInitial}${lastInitial}`;
};

// Removed renderSocialLink function
// Removed ProfileSocialMedia type

// Update function signature to access params properly in Next.js 14
export default async function PromoterPublicPage({ params }: { params: { userId: string } }) {
  // Access userId safely
  const userId = params.userId;

  // Basic UUID validation
  const isValidUUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(userId);
  if (!isValidUUID) {
    notFound();
  }

  try {
    // Use the function designed for Server Components
    const cookieStore = cookies();
    const supabase = createServerComponentClient({ cookies: () => cookieStore });

    // Call the RPC to get all data in one go
    const { data: pageData, error: rpcError } = await supabase.rpc(
      'get_public_promoter_page_data',
      { promoter_user_id: userId }
    );

    // Improved Error and Data Handling
    if (rpcError) {
      console.error(`RPC Error fetching data for promoter ${userId}:`, rpcError);
      notFound(); // Or throw new Error("Failed to load promoter data");
    }

    // Check if data is an array and not empty
    if (!Array.isArray(pageData) || pageData.length === 0) {
      console.warn(`No data returned or data is not an array for promoter ${userId}. RPC Result:`, pageData);
      notFound();
    }

    // Type assertion now that we know it's a non-empty array
    const validPageData = pageData as PromoterPageDataEntry[];

    // Extract promoter info (using the correct field names)
    const promoterInfo = validPageData[0];
    const promoterName = `${promoterInfo.promoter_first_name || ''} ${promoterInfo.promoter_last_name || ''}`.trim() || 'Promotor';
    const initials = getInitials(promoterInfo.promoter_first_name, promoterInfo.promoter_last_name);
    const avatarUrl = promoterInfo.promoter_avatar_url;

    // Debug log to verify data
    console.log("Promoter data loaded successfully:", {
      name: promoterName,
      hasAvatar: !!avatarUrl,
      eventCount: validPageData.length
    });

    // Get current date for filtering - MODIFICAÇÃO AQUI
    const now = new Date();
    // Para permitir eventos até o dia seguinte, subtraia 1 dia da data atual
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Mostrar todos os eventos que ainda não passaram ou ocorreram ontem
    const visibleEvents = validPageData.filter((event: PromoterPageDataEntry) => {
      if (!event.event_date) return false;
      const eventDate = new Date(event.event_date);
      return eventDate >= yesterday; // Incluir eventos do dia anterior
    }).sort((a, b) => {
      if (!a.event_date || !b.event_date) return 0;
      return new Date(a.event_date).getTime() - new Date(b.event_date).getTime();
    });

    return (
      // Match overall background/font from organization page if desired
      <div className="min-h-screen bg-white font-sans">

        {/* Section 1: Promoter Info Header (Replaces Banner/Overlay) */}
        {/* Use similar padding/margins as the top content area of the organization page */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-8"> {/* Added top padding */}
          {/* Center the content */}
          <div className="flex flex-col items-center text-center">
            {/* Avatar (Styled like Organization Logo) */}
            {/* Maintaining size, border, shadow from previous attempts */}
            <div className="w-28 h-28 rounded-full bg-gray-200 overflow-hidden border-8 border-white shadow-md mb-4"> {/* Added bottom margin */}
               <Avatar className="h-full w-full">
                  {avatarUrl ? (
                    <AvatarImage src={avatarUrl} alt={promoterName} className="object-cover" />
                  ) : null } {/* Render nothing if no image, fallback will show */}
                  <AvatarFallback className="text-3xl">
                    {initials || 'P'}
                  </AvatarFallback>
               </Avatar>
            </div>

            {/* Promoter Name (Styled like Organization Name) */}
            {/* Maintaining font, size, weight from previous attempts */}
            <h1 className="text-2xl font-bold text-gray-900 font-oswald">{promoterName}</h1>

            {/* Placeholder for potential future elements like bio or location */}

          </div>
        </div>

        {/* Section 2: Eventos - MODIFICAÇÃO DO TÍTULO AQUI */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-10 font-oswald">Eventos</h2>
          {visibleEvents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-12">
              {visibleEvents.map((event: PromoterPageDataEntry) => {
                // Determine correct link based on event type
                let linkHref: string;
                if (event.event_type === 'guest-list') {
                  linkHref = `/promo/${event.event_id}/${event.tracking_promoter_id}/${event.tracking_team_id}`;
                } else {
                  linkHref = `/e/${event.event_id}`;
                }
                
                // Parse date for display
                const eventDate = event.event_date ? new Date(event.event_date) : null;
                
                return (
                  <Link href={linkHref} key={event.event_id} className="block no-underline group">
                    <div className="relative flex w-full flex-col rounded-xl bg-white bg-clip-border text-gray-700 shadow-md shadow-black/20 h-full">
                      {/* Imagem/Flyer área */}
                      <div className="relative mx-4 -mt-6 h-40 overflow-hidden rounded-xl bg-clip-border text-white shadow-lg bg-gray-200">
                        {event.event_flyer_url ? (
                          <Image
                            src={event.event_flyer_url}
                            alt={event.event_title || 'Evento'}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <p className="text-gray-400">Sem imagem</p>
                          </div>
                        )}
                      </div>
                      
                      {/* Conteúdo do card */}
                      <div className="p-6 flex flex-col flex-grow relative">
                        {/* Badge de data */}
                        <div className="absolute top-16 right-4 bg-blue-50 p-2 rounded-md shadow-sm text-center">
                          <span className="block text-xs font-bold uppercase text-blue-600 tracking-wide">
                            {eventDate ? eventDate.toLocaleDateString('pt-PT', { month: 'short' }).toUpperCase().replace('.', '') : ''}
                          </span>
                          <span className="block text-xl font-bold text-blue-600 leading-tight">
                            {eventDate ? eventDate.getDate() : ''}
                          </span>
                        </div>

                        {/* Título do evento */}
                        <h5 className="mb-4 block font-oswald text-xl font-semibold leading-snug tracking-normal text-blue-gray-900 antialiased">
                          {event.event_title || 'Evento sem título'}
                        </h5>

                        {/* >>> ADICIONAR TIPO DE EVENTO <<< */}
                        {event.event_type && (
                          <p className="mb-4 block font-sans text-sm font-normal leading-relaxed text-gray-700 antialiased">
                            Tipo: <span className="font-semibold capitalize">{event.event_type.replace('-', ' ')}</span>
                          </p>
                        )}
                        {/* >>> FIM DA ADIÇÃO <<< */}

                      </div>
                      
                      {/* Botão Ver Evento */}
                      <div className="p-6 pt-0 flex justify-center">
                        <span className="select-none rounded-lg bg-blue-500 py-2 px-4 text-center align-middle font-sans text-xs font-bold uppercase text-white shadow-md shadow-blue-500/20">
                          Ver Evento
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="text-muted-foreground">Nenhum evento encontrado para este promotor.</p>
          )}
        </div>

        {/* SEÇÃO DE EVENTOS PASSADOS REMOVIDA */}
      </div>
    );
  } catch (error) {
    // Catch any unexpected errors
    console.error("Unexpected error in promoter page:", error);
    notFound();
  }
} 