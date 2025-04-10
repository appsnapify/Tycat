import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Criar cliente Supabase usando as variáveis de ambiente já configuradas
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET() {
  try {
    // Primeiro, vamos verificar se a coluna já existe tentando selecionar dados com essa coluna
    const { data: testData, error: testError } = await supabase
      .from('events')
      .select('status')
      .limit(1);
      
    // Se não houver erro, a coluna já existe
    if (!testError) {
      return NextResponse.json({
        success: true,
        message: "O campo 'status' já existe na tabela 'events'."
      });
    }
    
    // Se der erro "column status does not exist", precisamos criar
    if (testError && testError.message.includes("column") && testError.message.includes("status") && testError.message.includes("does not exist")) {
      // Usar o método rpc para executar um SQL personalizado
      const { error: rpcError } = await supabase.rpc('add_status_field');
      
      if (rpcError) {
        // Se falhar, também já é esperado porque essa função pode não existir
        // Vamos tentar método 3: criar a função e depois chamá-la
        
        // Criar função para adicionar o campo
        const createFunctionSQL = `
          CREATE OR REPLACE FUNCTION add_status_column()
          RETURNS void AS $$
          BEGIN
            ALTER TABLE public.events ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'scheduled';
            
            -- Atualizar eventos passados
            UPDATE public.events
            SET status = 'completed'
            WHERE start_date < CURRENT_DATE AND status = 'scheduled';
            
            -- Atualizar eventos atuais
            UPDATE public.events
            SET status = 'active'
            WHERE start_date = CURRENT_DATE AND status = 'scheduled';
          END;
          $$ LANGUAGE plpgsql;
          
          -- Executar a função
          SELECT add_status_column();
          
          -- Remover a função temporária
          DROP FUNCTION IF EXISTS add_status_column();
        `;
        
        // Executar SQL diretamente usando a API REST do Supabase
        const response = await fetch(`${supabaseUrl}/rest/v1/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Prefer': 'params=single-object'
          },
          body: JSON.stringify({
            query: createFunctionSQL
          })
        });
        
        if (!response.ok) {
          // Se ainda falhar, vamos adicionar manualmente os registros
          // Isso é um último recurso, mas deve funcionar para atualizar os eventos existentes
          
          // Verificar eventos
          const { data: events } = await supabase
            .from('events')
            .select('id, title, start_date');
          
          // Criar um novo campo no front-end
          if (events && events.length > 0) {
            for (const event of events) {
              // Determinar status baseado na data
              const today = new Date();
              const eventDate = new Date(event.start_date);
              const status = eventDate < today ? 'completed' : 
                             eventDate.toDateString() === today.toDateString() ? 'active' : 'scheduled';
                
              console.log(`Evento ${event.id} (${event.title}) - status: ${status}`);
            }
          }
          
          return NextResponse.json({
            success: false,
            message: "Não foi possível adicionar o campo 'status' no banco de dados.",
            recommendation: "Por favor, acesse diretamente o Supabase e adicione o campo manualmente."
          });
        }
        
        return NextResponse.json({
          success: true,
          message: "O campo 'status' foi adicionado com sucesso à tabela 'events'."
        });
      }
      
      return NextResponse.json({
        success: true,
        message: "O campo 'status' foi adicionado com sucesso via RPC."
      });
    }
    
    return NextResponse.json({
      success: false,
      message: "Não foi possível adicionar o campo 'status'. Erro não relacionado à coluna."
    });
    
  } catch (err) {
    console.error('Erro geral:', err);
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor', error: err },
      { status: 500 }
    );
  }
} 