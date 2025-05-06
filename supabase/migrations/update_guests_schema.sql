-- Atualização da tabela de convidados para suportar QR code e integração com promotores
ALTER TABLE guests
  -- Adicionar coluna para armazenar URL do QR code gerado
  ADD COLUMN IF NOT EXISTS qr_code_url TEXT,
  -- Adicionar coluna para status de aprovação (pending, approved, rejected)
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending',
  -- Adicionar colunas para associar com promotores e clientes
  ADD COLUMN IF NOT EXISTS promoter_id UUID,
  ADD COLUMN IF NOT EXISTS team_id UUID,
  ADD COLUMN IF NOT EXISTS client_user_id UUID REFERENCES auth.users(id);

-- Renomear a coluna de referência para event_id se necessário
DO $$
BEGIN
    -- Se a coluna event_id ainda referencia guest_list_events, atualize para referenciar events
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_name = 'guests'
        AND ccu.table_name = 'guest_list_events'
    ) THEN
        -- Drop a constraint existente
        ALTER TABLE guests DROP CONSTRAINT IF EXISTS guests_event_id_fkey;
        
        -- Adicionar nova constraint para a tabela events
        ALTER TABLE guests 
        ADD CONSTRAINT guests_event_id_fkey 
        FOREIGN KEY (event_id) 
        REFERENCES events(id) ON DELETE CASCADE;
    END IF;
END
$$;

-- Adicionar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_guests_client_user_id ON guests(client_user_id);
CREATE INDEX IF NOT EXISTS idx_guests_promoter_id ON guests(promoter_id);
CREATE INDEX IF NOT EXISTS idx_guests_status ON guests(status);

-- Adicionar novas políticas de segurança para acesso de clientes
CREATE POLICY IF NOT EXISTS "Clientes podem ver seus próprios registros"
ON guests FOR SELECT
TO authenticated
USING (client_user_id = auth.uid());

-- Promotores podem ver registros relacionados aos seus convites
CREATE POLICY IF NOT EXISTS "Promotores podem ver registros que criaram"
ON guests FOR SELECT
TO authenticated
USING (promoter_id IN (
  SELECT id FROM users WHERE auth.uid() = id
));

-- Clientes podem inserir novos registros
CREATE POLICY IF NOT EXISTS "Clientes podem criar novos registros"
ON guests FOR INSERT
TO authenticated
WITH CHECK (client_user_id = auth.uid());

-- Promotores podem criar registros para seus clientes
CREATE POLICY IF NOT EXISTS "Promotores podem criar registros para clientes"
ON guests FOR INSERT
TO authenticated
WITH CHECK (promoter_id = auth.uid()); 