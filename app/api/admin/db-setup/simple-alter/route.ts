import { NextRequest, NextResponse } from 'next/server';
// Usar o caminho relativo exato para evitar problemas com alias no build
import { createAdminClient } from '../../../../lib/supabase/adminClient';

// Endpoint para adicionar coluna status de maneira simples e direta
export async function GET(request: NextRequest) {
  const supabase = createAdminClient();
  try {
    // SQL simples e direto para adicionar a coluna status
    const { error } = await supabase.sql(`
      -- Adicionar coluna se não existir
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'events'
          AND column_name = 'status'
        ) THEN
          -- Adicionar o campo status
          ALTER TABLE public.events 
          ADD COLUMN status TEXT NOT NULL DEFAULT 'scheduled';
          
          -- Criar índice
          CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
          
          -- Atualizar eventos passados
          UPDATE public.events
          SET status = 'completed'
          WHERE start_date < CURRENT_DATE;
          
          -- Atualizar eventos atuais
          UPDATE public.events
          SET status = 'active'
          WHERE start_date = CURRENT_DATE;
          
          RAISE NOTICE 'Coluna status adicionada com sucesso';
        ELSE
          RAISE NOTICE 'Coluna status já existe';
        END IF;
      END
      $$;
    `);
    
    if (error) {
      console.error('Erro ao executar SQL:', error);
      return NextResponse.json({ 
        success: false, 
        message: "Erro ao adicionar campo status", 
        error 
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      message: "O SQL para adicionar o campo status foi executado com sucesso."
    });
    
  } catch (err) {
    console.error('Erro geral:', err);
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor', error: err },
      { status: 500 }
    );
  }
} 