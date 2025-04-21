import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Criar cliente Supabase usando as variáveis de ambiente já configuradas
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET() {
  try {
    // Buscar todos os eventos
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('id, title, start_date')
      .order('created_at', { ascending: false });
    
    if (eventsError) {
      console.error('Erro ao buscar eventos:', eventsError);
      return NextResponse.json({ 
        success: false, 
        message: "Erro ao buscar eventos", 
        error: eventsError 
      }, { status: 500 });
    }
    
    if (!events || events.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Nenhum evento encontrado para atualizar"
      });
    }
    
    // Contadores para o relatório
    const updates = {
      scheduled: 0,
      active: 0,
      completed: 0,
      errors: 0
    };
    
    // Processar cada evento
    for (const event of events) {
      try {
        // Determinar status baseado na data
        const today = new Date();
        const eventDate = new Date(event.start_date);
        
        // Definir status com base na data
        let status;
        if (eventDate < today) {
          status = 'completed';
          updates.completed++;
        } else if (eventDate.toDateString() === today.toDateString()) {
          status = 'active';
          updates.active++;
        } else {
          status = 'scheduled';
          updates.scheduled++;
        }
        
        // Atualizar status do evento
        const { error: updateError } = await supabase
          .from('events')
          .update({ status })
          .eq('id', event.id);
        
        if (updateError) {
          console.error(`Erro ao atualizar evento ${event.id}:`, updateError);
          
          // Se o erro for sobre coluna não existente, informar ao usuário
          if (updateError.message.includes("column") && 
              updateError.message.includes("status") && 
              updateError.message.includes("does not exist")) {
            return NextResponse.json({
              success: false,
              message: "O campo 'status' não existe na tabela 'events'.",
              details: "Você precisa adicionar a coluna 'status' na tabela 'events' do Supabase primeiro."
            }, { status: 400 });
          }
          
          updates.errors++;
        }
      } catch (err) {
        console.error(`Erro ao processar evento ${event.id}:`, err);
        updates.errors++;
      }
    }
    
    return NextResponse.json({
      success: true,
      message: "Status dos eventos atualizado com sucesso",
      updates
    });
    
  } catch (err) {
    console.error('Erro geral:', err);
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor', error: err },
      { status: 500 }
    );
  }
} 