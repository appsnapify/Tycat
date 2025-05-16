-- Schema para sistema GuestMobile
-- Tabela de usuários clientes
CREATE TABLE IF NOT EXISTS public.client_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT,
  birth_date DATE,
  postal_code TEXT,
  gender TEXT,
  password TEXT NOT NULL, -- Será armazenado com hash
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para otimização
CREATE INDEX IF NOT EXISTS idx_client_users_phone ON public.client_users(phone);
CREATE INDEX IF NOT EXISTS idx_client_users_email ON public.client_users(email);

-- Adicionar campo client_user_id na tabela guests (se não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'guests' AND column_name = 'client_user_id'
  ) THEN
    ALTER TABLE public.guests ADD COLUMN client_user_id UUID REFERENCES client_users(id);
    CREATE INDEX idx_guests_client_user_id ON public.guests(client_user_id);
  END IF;
END$$;

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_client_user_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_update_client_user_timestamp'
  ) THEN
    CREATE TRIGGER trigger_update_client_user_timestamp
    BEFORE UPDATE ON client_users
    FOR EACH ROW EXECUTE FUNCTION update_client_user_timestamp();
  END IF;
END$$;

-- Conceder permissões básicas
ALTER TABLE public.client_users ENABLE ROW LEVEL SECURITY;

-- Políticas RLS: usuários podem ver/modificar apenas seus próprios dados
CREATE POLICY "Usuários podem ver seus próprios dados" 
ON public.client_users FOR SELECT
USING (auth.uid() = id::text);

CREATE POLICY "Usuários podem modificar seus próprios dados" 
ON public.client_users FOR UPDATE
USING (auth.uid() = id::text);

-- Permitir que usuários anônimos criem contas
CREATE POLICY "Permitir criação de conta" 
ON public.client_users FOR INSERT
WITH CHECK (true);

-- Adicionar função para verificar se um telefone já está registrado
CREATE OR REPLACE FUNCTION check_phone_registered(phone_to_check TEXT)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM client_users WHERE phone = phone_to_check
  ) INTO user_exists;
  
  RETURN user_exists;
END;
$$ LANGUAGE plpgsql;

-- Conceder permissões para função de verificação
GRANT EXECUTE ON FUNCTION check_phone_registered(TEXT) TO authenticated, anon; 