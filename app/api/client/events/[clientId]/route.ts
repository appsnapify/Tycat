import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ✅ FUNÇÃO: Validar parâmetros (Complexidade: 2)
function validateParams(clientId: string, type: string): NextResponse | null {
  if (!clientId) { // +1
    return NextResponse.json(
      { success: false, error: 'Client ID é obrigatório', code: 'MISSING_CLIENT_ID' },
      { status: 400 }
    );
  }
  
  if (type && !['upcoming', 'past'].includes(type)) { // +1
    return NextResponse.json(
      { success: false, error: 'Tipo deve ser "upcoming" ou "past"', code: 'INVALID_TYPE' },
      { status: 400 }
    );
  }
  
  return null;
}

// ✅ FUNÇÃO: Build query conditions (Complexidade: 2)
function buildDateCondition(type: string | null) {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  
  if (type === 'upcoming') { // +1
    return { operator: 'gte', value: today };
  } else if (type === 'past') { // +1
    return { operator: 'lt', value: today };
  }
  
  return null;
}

// ✅ FUNÇÃO AUXILIAR: Verificar cliente (Complexidade: 3)
async function checkClientExists(clientId: string) {
  const { data: client, error: clientError } = await supabase
    .from('client_users')
    .select('id')
    .eq('id', clientId)
    .eq('is_active', true)
    .maybeSingle();
  
  if (clientError) { // +1
    console.error('Client check error:', clientError);
    return { success: false, error: 'Erro interno do servidor', code: 'DATABASE_ERROR' };
  }
  
  if (!client) { // +1
    return { success: false, error: 'Cliente não encontrado', code: 'CLIENT_NOT_FOUND' };
  }
  
  return { success: true, data: client };
}

// ✅ FUNÇÃO AUXILIAR: Construir query de eventos (Complexidade: 3)
function buildEventsQuery(clientId: string, type: string | null) {
  let query = supabase
    .from('guests')
    .select(`
      id,
      qr_code,
      qr_code_url,
      checked_in,
      check_in_time,
      source,
      events:event_id (
        id,
        title,
        description,
        date,
        time,
        end_time,
        location,
        flyer_url,
        organizations:organization_id (
          id,
          name
        )
      )
    `)
    .eq('client_user_id', clientId);

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  
  if (type === 'upcoming') { // +1
    query = query.gte('events.date', todayStr);
  } else if (type === 'past') { // +1
    query = query.lt('events.date', todayStr);
  }

  return query.order('events(date)', { ascending: type !== 'past' });
}

// ✅ FUNÇÃO PRINCIPAL: GET client events (Complexidade: 4)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const { clientId } = await params;
    
    // Validar parâmetros
    const validationError = validateParams(clientId, type || '');
    if (validationError) return validationError; // +1
    
    // Verificar cliente
    const clientCheck = await checkClientExists(clientId);
    if (!clientCheck.success) { // +1
      const statusCode = clientCheck.code === 'CLIENT_NOT_FOUND' ? 404 : 500;
      return NextResponse.json(clientCheck, { status: statusCode });
    }
    
    // Construir e executar query
    const query = buildEventsQuery(clientId, type);
    const { data: guestEvents, error: eventsError } = await query;
    
    if (eventsError) {
      console.error('Events fetch error:', eventsError);
      return NextResponse.json(
        { success: false, error: 'Erro ao buscar eventos', code: 'FETCH_ERROR' },
        { status: 500 }
      );
    }
    
    // Filtrar guests que têm eventos válidos e transformar dados
    const transformedEvents = guestEvents
      ?.filter(guest => guest.events && guest.events.id) // Filtrar apenas guests com eventos válidos
      ?.map(guest => ({
        id: guest.events.id,
        title: guest.events.title,
        description: guest.events.description,
        event_date: guest.events.date,
        start_time: guest.events.time,
        end_time: guest.events.end_time || guest.events.time,
        location: guest.events.location,
        event_flyer_url: guest.events.flyer_url,
        guest_id: guest.id,
        qr_code: guest.qr_code,
        qr_code_url: guest.qr_code_url,
        checked_in: guest.checked_in,
        check_in_time: guest.check_in_time,
        source: guest.source || 'guest_system',
        organization_name: guest.events.organizations?.name || 'ORGANIZATION'
      })) || [];
    
    return NextResponse.json({
      success: true,
      data: transformedEvents,
      count: transformedEvents.length
    });
    
  } catch (error) {
    console.error('Get client events error:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
