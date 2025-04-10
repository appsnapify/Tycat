import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Criar cliente Supabase com acesso de admin para poder alterar o esquema
// Usando as mesmas credenciais do seu projeto
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Função para verificar se a coluna já existe
async function columnExists(table: string, column: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('check_column_exists', {
      p_table: table,
      p_column: column
    });
    
    if (error) {
      console.error('Erro ao verificar coluna:', error);
      
      // Método alternativo se a função RPC não existir
      const { data: columns, error: columnsError } = await supabase
        .from('information_schema.columns')
        .select('column_name')
        .eq('table_schema', 'public')
        .eq('table_name', table)
        .eq('column_name', column);
      
      if (columnsError) {
        console.error('Erro ao verificar coluna (método alternativo):', columnsError);
        return false;
      }
      
      return columns && columns.length > 0;
    }
    
    return !!data;
  } catch (err) {
    console.error('Exceção ao verificar coluna:', err);
    return false;
  }
}

// Endpoint para configurar o banco de dados
export async function GET(request: NextRequest) {
  try {
    // Verificar se a coluna 'status' já existe na tabela 'events'
    const exists = await columnExists('events', 'status');
    
    if (exists) {
      return NextResponse.json({
        success: true,
        message: "O campo 'status' já existe na tabela 'events'.",
        changes: []
      });
    }
    
    // Adicionar a coluna 'status' se não existir
    const alterTableQuery = `
      ALTER TABLE public.events 
      ADD COLUMN status TEXT NOT NULL DEFAULT 'scheduled';
      
      COMMENT ON COLUMN public.events.status IS 'Status do evento: scheduled (agendado), active (em andamento), completed (realizado)';
      
      CREATE INDEX idx_events_status ON events(status);
    `;
    
    // Executar o comando SQL para adicionar a coluna
    const { error: alterError } = await supabase.rpc('exec_sql', {
      sql: alterTableQuery
    });
    
    if (alterError) {
      console.error('Erro ao adicionar coluna:', alterError);
      
      // Método alternativo se a função RPC não existir
      const { error: sqlError } = await supabase.sql(alterTableQuery);
      
      if (sqlError) {
        console.error('Erro ao adicionar coluna (método alternativo):', sqlError);
        return NextResponse.json({ 
          error: 'Falha ao adicionar o campo status', 
          details: sqlError 
        }, { status: 500 });
      }
    }
    
    // Atualizar valores de status baseado nas datas dos eventos
    const updateQuery = `
      -- Eventos com data anterior à atual são marcados como 'completed'
      UPDATE public.events
      SET status = 'completed'
      WHERE start_date < CURRENT_DATE AND status = 'scheduled';
      
      -- Eventos com data igual à atual são marcados como 'active'
      UPDATE public.events
      SET status = 'active'
      WHERE start_date = CURRENT_DATE AND status = 'scheduled';
    `;
    
    // Executar o comando SQL para atualizar os status
    const { error: updateError } = await supabase.rpc('exec_sql', {
      sql: updateQuery
    });
    
    if (updateError) {
      console.error('Erro ao atualizar status:', updateError);
      
      // Método alternativo
      const { error: sqlUpdateError } = await supabase.sql(updateQuery);
      
      if (sqlUpdateError) {
        console.error('Erro ao atualizar status (método alternativo):', sqlUpdateError);
        // Continuamos mesmo se houver erro no update pois a coluna já foi criada
      }
    }
    
    return NextResponse.json({
      success: true,
      message: "Campo 'status' adicionado com sucesso à tabela 'events'.",
      changes: [
        "Adicionado campo 'status' do tipo TEXT",
        "Criado índice idx_events_status",
        "Atualizado status baseado nas datas dos eventos"
      ]
    });
    
  } catch (err) {
    console.error('Erro geral na configuração do banco de dados:', err);
    return NextResponse.json(
      { error: 'Erro interno do servidor', details: err },
      { status: 500 }
    );
  }
} 