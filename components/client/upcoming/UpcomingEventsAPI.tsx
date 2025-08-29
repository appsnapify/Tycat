interface ClientEvent {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  start_time: string;
  end_time: string;
  location: string | null;
  event_flyer_url: string | null;
  guest_id: string;
  qr_code: string;
  qr_code_url: string;
  checked_in: boolean;
  check_in_time: string | null;
  source: string;
  organization_name: string;
}

export interface FetchResult {
  events: ClientEvent[];
  error: string | null;
}

// ✅ FUNÇÃO: Fetch upcoming events (Complexidade: 4)
export async function fetchUpcomingEvents(clientUserId: string): Promise<FetchResult> {
  if (!clientUserId) { // +1
    return { events: [], error: 'ID do cliente é obrigatório' };
  }
  
  try {
    const response = await fetch(`/api/client/events/${clientUserId}?type=upcoming`);
    
    if (!response.ok) { // +1
      return { events: [], error: `Erro HTTP: ${response.status}` };
    }

    const data = await response.json();
    
    if (!data.success) { // +1
      return { events: [], error: data.error || 'Erro ao carregar eventos' };
    }

    return { events: data.data || [], error: null };
  } catch (error) {
    console.error('Error fetching upcoming events:', error);
    return { events: [], error: 'Erro de conexão. Tente novamente.' };
  }
}

// ✅ FUNÇÃO: Check if event is valid (Complexidade: 2)
export function isEventValid(event: ClientEvent): boolean {
  const eventDate = new Date(event.event_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return eventDate >= today; // +1
}
