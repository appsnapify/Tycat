import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Define a função para verificar se uma data/hora está entre o início e o fim com margem de segurança
function isBetweenDates(date: Date, startDate: string, endDate?: string, endTime?: string): 'scheduled' | 'active' | 'completed' {
  const currentTime = date.getTime();
  
  // Criar data inicial
  const eventStartDate = new Date(startDate);
  
  // Criar data final (com margem de segurança)
  let eventEndDate: Date;
  
  if (endDate) {
    // Se tiver data final específica, usar ela
    eventEndDate = new Date(endDate);
    
    // Se também tiver horário final, ajustar
    if (endTime) {
      const [hours, minutes] = endTime.split(':').map(Number);
      eventEndDate.setHours(hours, minutes);
    } else {
      // Sem horário final, assumir final do dia
      eventEndDate.setHours(23, 59, 59);
    }
  } else {
    // Sem data final, assumir mesmo dia do evento às 23:59
    eventEndDate = new Date(startDate);
    eventEndDate.setHours(23, 59, 59);
  }
  
  // Adicionar 8 horas de margem após o término oficial
  const safeEndDate = new Date(eventEndDate);
  safeEndDate.setHours(safeEndDate.getHours() + 8);
  
  // Determinar status com base nas comparações
  if (currentTime < eventStartDate.getTime()) {
    return 'scheduled'; // Evento ainda não começou
  } else if (currentTime < safeEndDate.getTime()) {
    return 'active'; // Evento em andamento (incluindo margem de 8h)
  } else {
    return 'completed'; // Evento já terminou
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verificar token de autorização de cron ou API (opcional para mais segurança)
    // const authHeader = request.headers.get('authorization');
    // if (!authHeader || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    //   return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    // }
    
    // Obter todos os eventos que não estão concluídos
    const { data: events, error } = await supabase
      .from('events')
      .select('id, title, date, time, end_date, end_time, status')
      .or('status.neq.completed,status.is.null');
    
    if (error) {
      console.error('Erro ao buscar eventos:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // Data atual para comparações
    const now = new Date();
    
    // Array para contar atualizações
    const updates = {
      scheduled: 0,
      active: 0,
      completed: 0,
      errors: 0
    };
    
    // Processar cada evento para verificar e atualizar seu status
    for (const event of events || []) {
      try {
        // Determinar o status correto com base nas datas
        const correctStatus = isBetweenDates(now, event.date, event.end_date, event.end_time);
        
        // Se o status estiver diferente, atualizar
        if (event.status !== correctStatus) {
          const { error: updateError } = await supabase
            .from('events')
            .update({ status: correctStatus })
            .eq('id', event.id);
          
          if (updateError) {
            console.error(`Erro ao atualizar evento ${event.id}:`, updateError);
            updates.errors++;
          } else {
            updates[correctStatus]++;
            console.log(`Evento "${event.title}" (${event.id}) atualizado para status: ${correctStatus}`);
          }
        }
      } catch (eventError) {
        console.error(`Erro ao processar evento ${event.id}:`, eventError);
        updates.errors++;
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Atualização de status de eventos concluída`,
      updates,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Erro geral na atualização de status de eventos:', err);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
} 