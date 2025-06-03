// Este ficheiro representa a página pública de registo para uma guest list de evento da organização.
// O [id] na URL é tratado como o eventId.

import { notFound } from 'next/navigation';
import { createReadOnlyClient } from '@/lib/supabase/server';
import OrganizadorGuestListContent from './OrganizadorGuestListContent';
import { ClientAuthProvider } from '@/hooks/useClientAuth';

// Interface para props da página
interface PageProps {
  params: Promise<{ id: string }>;
}

// Server Component que busca dados do evento e renderiza com ClientAuthProvider
export default async function GuestListPage({ params }: PageProps) {
  // Await params before using its properties (Next.js 15 requirement)
  const resolvedParams = await params;
  const eventId = resolvedParams.id;

  // Validação básica do ID
  if (!eventId) {
    notFound();
  }

  // Debug apenas em development
  if (process.env.NODE_ENV === 'development') {
    console.log('[DEBUG] OrganizadorGuestListPage - EventId recebido:', eventId);
  }

  try {
    // Criar cliente Supabase no servidor (READ-ONLY para Server Components)
    const supabase = await createReadOnlyClient();

    // Buscar dados do evento
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select(`
        id, title, description, date, time, end_date, end_time, location, flyer_url,
        type, is_published, organization_id
      `)
      .eq('id', eventId)
      .eq('type', 'guest-list')
      .eq('is_published', true)
      .single();

    if (eventError || !event) {
      console.error('[ERROR] Evento não encontrado:', eventError);
      notFound();
    }

    // Debug apenas em development
    if (process.env.NODE_ENV === 'development') {
      console.log('[DEBUG] Dados do evento processados com sucesso:', {
        hasEvent: !!event,
        title: event.title,
        isPublished: event.is_published
      });
    }

    return (
      <ClientAuthProvider>
        <OrganizadorGuestListContent 
          event={{
            title: event.title,
            description: event.description || undefined,
            date: event.date,
            time: event.time,
            location: event.location,
            flyer_url: event.flyer_url
          }}
          eventId={eventId}
        />
      </ClientAuthProvider>
    );
  } catch (error) {
    console.error('[ERROR] Erro ao processar página da organização:', error);
    notFound();
  }
} 