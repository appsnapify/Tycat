import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createRouteHandlerClient } from '@/lib/supabase/server';

// 🛡️ SEGURANÇA: Cliente admin apenas para fallback temporário (será removido na Fase 4)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

interface GuestCountResult {
  eventId: string;
  count: number;
  checkedIn: number;
  success: boolean;
  error?: string;
}

// Interface para dados retornados pela função RPC get_multiple_events_guest_count_secure
interface RPCGuestCountData {
  event_id: string;
  count: number;
  checked_in: number;
}

export async function GET(request: NextRequest) {
  try {
    // Obter IDs dos eventos da URL (separados por vírgula)
    const { searchParams } = new URL(request.url);
    const eventIdsParam = searchParams.get('eventIds');
    
    if (!eventIdsParam) {
      return NextResponse.json({ 
        success: false,
        error: 'eventIds é obrigatório (separados por vírgula)' 
      }, { status: 400 });
    }
    
    const eventIds = eventIdsParam.split(',').filter(id => id.trim());
    
    if (eventIds.length === 0) {
      return NextResponse.json({ 
        success: false,
        error: 'Pelo menos um eventId deve ser fornecido' 
      }, { status: 400 });
    }

    // Limitar a 10 eventos por chamada para evitar sobrecarga
    if (eventIds.length > 10) {
      return NextResponse.json({ 
        success: false,
        error: 'Máximo de 10 eventos por chamada' 
      }, { status: 400 });
    }
    
    // Log apenas em desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      console.log(`API GuestCounts (Batch) - Buscando contagem para ${eventIds.length} eventos`);
    }

    // 🛡️ SEGURANÇA: Tentar função segura primeiro (usando cookies de sessão)
    try {
      const supabaseAuth = await createRouteHandlerClient();
      
      const { data: secureData, error: secureError } = await supabaseAuth
        .rpc('get_multiple_events_guest_count_secure', { p_event_ids: eventIds });
      
      if (!secureError && secureData && secureData.length > 0) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`API GuestCounts (Batch) - Função segura OK: ${secureData.length} eventos processados`);
        }
        
        const secureResults: GuestCountResult[] = secureData.map((item: RPCGuestCountData) => ({
          eventId: item.event_id,
          count: item.count,
          checkedIn: item.checked_in,
          success: true
        }));
        
        return NextResponse.json(
          {
            success: true,
            results: secureResults,
            timestamp: new Date().toISOString(),
            totalEvents: eventIds.length,
            successfulEvents: secureResults.length,
            secure: true
          },
          {
            status: 200,
            headers: {
              'Cache-Control': 'public, max-age=300, s-maxage=300',
              'Pragma': 'cache',
              'Expires': new Date(Date.now() + 5 * 60 * 1000).toUTCString(),
            }
          }
        );
      }
      
      console.warn('Função segura falhou, usando fallback:', secureError?.message);
    } catch (authError) {
      console.warn('Erro na autenticação, usando fallback:', authError);
    }
    
    // 🚨 FALLBACK TEMPORÁRIO: SERVICE_ROLE (será removido na Fase 4)
    console.warn('Usando fallback SERVICE_ROLE para guest-counts:', eventIds.length, 'eventos');
    
    const results: GuestCountResult[] = [];
    
    // Processar cada evento
    for (const eventId of eventIds) {
      try {
        // 1. Buscar total de convidados
        const { data: guestsData, error: guestsError, count: totalCount } = await supabaseAdmin
          .from('guests')
          .select('*', { count: 'exact', head: false })
          .eq('event_id', eventId);
        
        if (guestsError) {
          results.push({
            eventId,
            count: 0,
            checkedIn: 0,
            success: false,
            error: guestsError.message
          });
          continue;
        }
        
        // 2. Buscar convidados com check-in
        const { data: checkedInData, error: checkedInError, count: checkedInCount } = await supabaseAdmin
          .from('guests')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', eventId)
          .eq('checked_in', true);
        
        if (checkedInError) {
          results.push({
            eventId,
            count: totalCount ?? (guestsData?.length || 0),
            checkedIn: 0,
            success: false,
            error: checkedInError.message
          });
          continue;
        }
        
        // Calcular contagens
        const total = totalCount ?? (guestsData?.length || 0);
        const checkedIn = checkedInCount ?? 0;
        
        results.push({
          eventId,
          count: total,
          checkedIn: checkedIn,
          success: true
        });
        
        // Log apenas em desenvolvimento
        if (process.env.NODE_ENV === 'development') {
          console.log(`API GuestCounts (Batch) - Evento ${eventId}: ${total} convidados, ${checkedIn} check-ins`);
        }
        
      } catch (error) {
        results.push({
          eventId,
          count: 0,
          checkedIn: 0,
          success: false,
          error: error instanceof Error ? error.message : 'Erro desconhecido'
        });
      }
    }
    
    // Retornar resultados com cache de 5 minutos
    return NextResponse.json(
      {
        success: true,
        results: results,
        timestamp: new Date().toISOString(),
        totalEvents: eventIds.length,
        successfulEvents: results.filter(r => r.success).length,
        fallback: true
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, max-age=300, s-maxage=300', // 5 minutos de cache
          'Pragma': 'cache',
          'Expires': new Date(Date.now() + 5 * 60 * 1000).toUTCString(), // 5 minutos
        }
      }
    );
    
  } catch (error) {
    console.error('API GuestCounts (Batch) - Erro:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Erro interno no servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}

// Método POST para casos onde a URL ficaria muito longa
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventIds } = body;
    
    if (!Array.isArray(eventIds) || eventIds.length === 0) {
      return NextResponse.json({ 
        success: false,
        error: 'eventIds deve ser um array não vazio' 
      }, { status: 400 });
    }
    
    // Limitar a 20 eventos por chamada POST
    if (eventIds.length > 20) {
      return NextResponse.json({ 
        success: false,
        error: 'Máximo de 20 eventos por chamada' 
      }, { status: 400 });
    }
    
    // Redirecionar para lógica GET
    const eventIdsParam = eventIds.join(',');
    const url = new URL(request.url);
    url.searchParams.set('eventIds', eventIdsParam);
    
    // Criar nova request simulada para reutilizar lógica GET
    const getRequest = new NextRequest(url.toString(), {
      method: 'GET',
      headers: request.headers
    });
    
    return GET(getRequest);
    
  } catch (error) {
    console.error('API GuestCounts (Batch POST) - Erro:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Erro interno no servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
} 