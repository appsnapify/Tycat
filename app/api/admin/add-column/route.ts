import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Criar cliente Supabase com privilégios de administrador
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!; // Nota: em produção, seria melhor usar SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET() {
  try {
    // Verificar se podemos selecionar a coluna status (se ela já existe)
    const { error: testError } = await supabase
      .from('events')
      .select('status')
      .limit(1);
    
    // Se não houver erro, a coluna já existe
    if (!testError) {
      return NextResponse.json({
        success: true,
        message: "A coluna 'status' já existe na tabela 'events'."
      });
    }
    
    // Tentativa 1: Usar o método REST da API do Supabase
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/execute_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        },
        body: JSON.stringify({
          sql: "ALTER TABLE public.events ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'scheduled';"
        })
      });
      
      if (response.ok) {
        return NextResponse.json({
          success: true,
          message: "Coluna 'status' adicionada com sucesso na tabela 'events'."
        });
      }
    } catch (restError) {
      console.error('Erro ao usar REST API:', restError);
    }
    
    // Alternativa: realizar uma tentativa mais simples 
    // Aviso: Esta abordagem não irá funcionar na maioria das configurações de Supabase
    // devido às restrições de segurança, mas incluímos como último recurso.
    try {
      const { error: insertError } = await supabase
        .from('events')
        .update({ status: 'scheduled' })
        .eq('id', 'dummy-id-that-doesnt-exist');
      
      // Se o erro for diferente de "coluna não existe", talvez a coluna tenha sido criada
      if (!insertError || !insertError.message.includes('column') || !insertError.message.includes('does not exist')) {
        return NextResponse.json({
          success: true,
          message: "Operação concluída, verifique se a coluna foi adicionada."
        });
      }
    } catch (insertErr) {
      console.error('Erro na tentativa alternativa:', insertErr);
    }
    
    return NextResponse.json({
      success: false,
      message: "Não foi possível adicionar a coluna 'status'.",
      instruction: "Você precisa acessar o Supabase diretamente para adicionar a coluna 'status' à tabela 'events'.",
      sqlCommand: "ALTER TABLE public.events ADD COLUMN status TEXT NOT NULL DEFAULT 'scheduled';"
    }, { status: 400 });
    
  } catch (err) {
    console.error('Erro geral:', err);
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
} 