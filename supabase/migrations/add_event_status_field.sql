-- Migração para adicionar o campo status na tabela de eventos
-- Permite controlar o ciclo de vida dos eventos (agendado, em andamento, realizado)

-- Verificar e adicionar o campo status apenas se não existir
DO $$
BEGIN
  -- Adicionar campo status à tabela events se não existir
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'events'
    AND column_name = 'status'
  ) THEN
    -- Adicionar o campo status com valor padrão 'scheduled'
    ALTER TABLE public.events 
    ADD COLUMN status TEXT NOT NULL DEFAULT 'scheduled';
    
    -- Adicionar um comentário explicativo para o campo
    COMMENT ON COLUMN public.events.status IS 'Status do evento: scheduled (agendado), active (em andamento), completed (realizado)';
    
    -- Criar um índice para consultas por status
    CREATE INDEX idx_events_status ON events(status);
    
    -- Atualizar eventos antigos
    -- Eventos com data anterior à atual são marcados como 'completed'
    UPDATE public.events
    SET status = 'completed'
    WHERE date < CURRENT_DATE;
    
    -- Eventos com data igual à atual são marcados como 'active'
    UPDATE public.events
    SET status = 'active'
    WHERE date = CURRENT_DATE;
  END IF;
END
$$; 