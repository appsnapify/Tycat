-- teams_schema.sql
-- Esquema para o Sistema de Gestão de Equipes, Promotores e Comissões

-- Extensão UUID (já deve estar habilitada no Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabela de Equipes
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  team_code TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabela de Membros da Equipe
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('leader', 'promoter')),
  commission_rate DECIMAL(5,2), -- Taxa personalizada para o membro (opcional)
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

-- 3. Tabela de Vinculação entre Organizações e Equipes
CREATE TABLE IF NOT EXISTS organization_teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  commission_type TEXT NOT NULL CHECK (commission_type IN ('percentage', 'fixed', 'tiered')),
  commission_settings JSONB NOT NULL DEFAULT '{"team_split": 30, "promoter_split": 70, "rate": 10}'::JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, team_id)
);

-- 4. Tabela de Comissões Geradas
CREATE TABLE IF NOT EXISTS commissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  promoter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  guest_id UUID, -- ID do convidado (pode ser nulo se for ingresso sem identificação)
  ticket_reference TEXT, -- Referência ao ingresso ou QR code
  amount DECIMAL(10,2) NOT NULL, -- Valor total da comissão
  team_amount DECIMAL(10,2) NOT NULL, -- Parte da equipe
  promoter_amount DECIMAL(10,2) NOT NULL, -- Parte do promotor
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  payment_id UUID, -- Referência ao pagamento (quando houver)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);

-- 5. Tabela de Pagamentos de Comissões
CREATE TABLE IF NOT EXISTS commission_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  receipt_code TEXT UNIQUE NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash', 'transfer', 'other')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  paid_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  confirmed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  payment_date TIMESTAMPTZ,
  confirmation_date TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Tabela de Itens de Pagamento (detalhes de cada pagamento)
CREATE TABLE IF NOT EXISTS commission_payment_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_id UUID NOT NULL REFERENCES commission_payments(id) ON DELETE CASCADE,
  commission_id UUID NOT NULL REFERENCES commissions(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(payment_id, commission_id)
);

-- Criar ou substituir função para gerar código de equipe
CREATE OR REPLACE FUNCTION generate_team_code()
RETURNS TRIGGER AS $$
BEGIN
  -- Formato: TEAM-XXXXX (onde X são letras maiúsculas ou números)
  NEW.team_code := 'TEAM-' || 
                  SUBSTRING(UPPER(
                    REPLACE(
                      ENCODE(DIGEST(NEW.id::TEXT || NOW()::TEXT, 'sha256'), 'hex'),
                      '0123456789', 'ABCDEFGHIJ'
                    )
                  ), 1, 5);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para gerar código de equipe automaticamente
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_team_code') THEN
    CREATE TRIGGER set_team_code
      BEFORE INSERT ON teams
      FOR EACH ROW
      WHEN (NEW.team_code IS NULL)
      EXECUTE FUNCTION generate_team_code();
  END IF;
END
$$;

-- Funções para atualização de timestamp
CREATE OR REPLACE FUNCTION update_team_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para atualização de timestamp
CREATE TRIGGER update_teams_timestamp
BEFORE UPDATE ON teams
FOR EACH ROW
EXECUTE FUNCTION update_team_timestamp();

CREATE TRIGGER update_organization_teams_timestamp
BEFORE UPDATE ON organization_teams
FOR EACH ROW
EXECUTE FUNCTION update_team_timestamp();

-- Função para gerar código de recibo de pagamento
CREATE OR REPLACE FUNCTION generate_receipt_code()
RETURNS TRIGGER AS $$
BEGIN
  -- Formato: REC-XXXXX-YYMMDD
  NEW.receipt_code := 'REC-' || 
                    SUBSTRING(UPPER(
                      ENCODE(DIGEST(NEW.id::TEXT || NOW()::TEXT, 'sha256'), 'hex')
                    ), 1, 5) || '-' ||
                    TO_CHAR(NOW(), 'YYMMDD');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para gerar código de recibo automaticamente
CREATE TRIGGER set_receipt_code
BEFORE INSERT ON commission_payments
FOR EACH ROW
WHEN (NEW.receipt_code IS NULL)
EXECUTE FUNCTION generate_receipt_code();

-- Configuração de RLS (Row-Level Security)

-- Habilitar RLS nas tabelas
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_payment_items ENABLE ROW LEVEL SECURITY;

-- Políticas para a tabela teams
CREATE POLICY "Equipes visíveis para seus membros" ON teams
FOR SELECT USING (
  auth.uid() = created_by OR 
  EXISTS (
    SELECT 1 FROM team_members 
    WHERE team_id = teams.id AND user_id = auth.uid()
  )
);

CREATE POLICY "Líderes podem atualizar suas equipes" ON teams
FOR UPDATE USING (
  auth.uid() = created_by OR 
  EXISTS (
    SELECT 1 FROM team_members 
    WHERE team_id = teams.id AND user_id = auth.uid() AND role = 'leader'
  )
);

CREATE POLICY "Usuários podem criar equipes" ON teams
FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Líderes podem excluir suas equipes" ON teams
FOR DELETE USING (auth.uid() = created_by);

-- Corrigir políticas para evitar recursão infinita
DROP POLICY IF EXISTS "Membros visíveis para membros da mesma equipe" ON "public"."team_members";
DROP POLICY IF EXISTS "Líderes podem adicionar membros" ON "public"."team_members";
DROP POLICY IF EXISTS "Líderes podem atualizar membros" ON "public"."team_members";
DROP POLICY IF EXISTS "Líderes podem remover membros" ON "public"."team_members";

-- Novas políticas mais simples e diretas
CREATE POLICY "Todos podem visualizar membros de equipe"
  ON "public"."team_members"
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuário pode visualizar suas próprias associações"
  ON "public"."team_members"
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Criadores de equipe podem gerenciar membros"
  ON "public"."team_members"
  FOR ALL
  TO authenticated
  USING (
    exists (
      SELECT 1 FROM teams 
      WHERE teams.id = team_members.team_id 
      AND teams.created_by = auth.uid()
    )
  );

CREATE POLICY "Usuários podem gerenciar suas próprias associações"
  ON "public"."team_members"
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- Políticas para a tabela organization_teams
CREATE POLICY "Vinculações visíveis para membros da organização e equipe" ON organization_teams
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_organizations
    WHERE organization_id = organization_teams.organization_id AND user_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM team_members
    WHERE team_id = organization_teams.team_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Organizadores podem vincular equipes" ON organization_teams
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_organizations
    WHERE organization_id = NEW.organization_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Organizadores podem atualizar vinculações" ON organization_teams
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM user_organizations
    WHERE organization_id = organization_teams.organization_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Organizadores podem remover vinculações" ON organization_teams
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM user_organizations
    WHERE organization_id = organization_teams.organization_id AND user_id = auth.uid()
  )
);

-- Políticas para a tabela commissions
CREATE POLICY "Comissões visíveis para organizadores e membros da equipe" ON commissions
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_organizations
    WHERE organization_id = commissions.organization_id AND user_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM team_members
    WHERE team_id = commissions.team_id AND user_id = auth.uid()
  ) OR
  commissions.promoter_id = auth.uid()
);

CREATE POLICY "Organizadores podem criar comissões" ON commissions
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_organizations
    WHERE organization_id = NEW.organization_id AND user_id = auth.uid()
  )
);

-- Políticas para a tabela commission_payments
CREATE POLICY "Pagamentos visíveis para organizadores e líderes de equipe" ON commission_payments
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_organizations
    WHERE organization_id = commission_payments.organization_id AND user_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM team_members
    WHERE team_id = commission_payments.team_id AND user_id = auth.uid() AND role = 'leader'
  )
);

CREATE POLICY "Organizadores podem criar pagamentos" ON commission_payments
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_organizations
    WHERE organization_id = NEW.organization_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Líderes podem confirmar pagamentos" ON commission_payments
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM team_members
    WHERE team_id = commission_payments.team_id AND user_id = auth.uid() AND role = 'leader'
  )
);

-- Políticas para a tabela commission_payment_items
CREATE POLICY "Itens de pagamento visíveis para organizadores e líderes de equipe" ON commission_payment_items
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM commission_payments cp
    JOIN user_organizations uo ON cp.organization_id = uo.organization_id
    WHERE cp.id = commission_payment_items.payment_id AND uo.user_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM commission_payments cp
    JOIN team_members tm ON cp.team_id = tm.team_id
    WHERE cp.id = commission_payment_items.payment_id AND tm.user_id = auth.uid() AND tm.role = 'leader'
  )
);

-- Função para calcular comissão baseada no tipo configurado
CREATE OR REPLACE FUNCTION calculate_commission(
  p_organization_id UUID,
  p_team_id UUID,
  p_promoter_id UUID,
  p_amount DECIMAL
) RETURNS JSONB AS $$
DECLARE
  v_commission_type TEXT;
  v_settings JSONB;
  v_rate DECIMAL;
  v_team_split DECIMAL;
  v_promoter_split DECIMAL;
  v_total_commission DECIMAL;
  v_team_amount DECIMAL;
  v_promoter_amount DECIMAL;
  v_result JSONB;
  v_promoter_custom_rate DECIMAL;
BEGIN
  -- Obter configurações de comissão
  SELECT commission_type, commission_settings
  INTO v_commission_type, v_settings
  FROM organization_teams
  WHERE organization_id = p_organization_id AND team_id = p_team_id AND is_active = TRUE;
  
  -- Verificar se existe vinculação
  IF v_commission_type IS NULL THEN
    RETURN jsonb_build_object('error', 'Vinculação não encontrada ou inativa');
  END IF;
  
  -- Obter taxa personalizada do promotor, se existir
  SELECT commission_rate INTO v_promoter_custom_rate
  FROM team_members
  WHERE team_id = p_team_id AND user_id = p_promoter_id AND role = 'promoter';
  
  -- Extrair configurações básicas
  v_team_split := (v_settings->>'team_split')::DECIMAL;
  v_promoter_split := (v_settings->>'promoter_split')::DECIMAL;
  
  -- Calcular comissão com base no tipo
  CASE v_commission_type
    WHEN 'percentage' THEN
      -- Comissão percentual
      v_rate := (v_settings->>'rate')::DECIMAL;
      v_total_commission := (p_amount * v_rate / 100);
    
    WHEN 'fixed' THEN
      -- Valor fixo por venda
      v_total_commission := (v_settings->>'fixed_amount')::DECIMAL;
    
    WHEN 'tiered' THEN
      -- Sistema de patamares (implementação básica)
      v_rate := (v_settings->>'rate')::DECIMAL;
      v_total_commission := (p_amount * v_rate / 100);
      -- Aqui poderia ter lógica mais complexa para patamares
  END CASE;
  
  -- Aplicar taxa personalizada do promotor, se existir
  IF v_promoter_custom_rate IS NOT NULL THEN
    -- Ajustar o split do promotor se ele tem uma taxa especial
    v_promoter_split := v_promoter_custom_rate;
    v_team_split := 100 - v_promoter_split;
  END IF;
  
  -- Calcular valores para equipe e promotor
  v_team_amount := (v_total_commission * v_team_split / 100);
  v_promoter_amount := (v_total_commission * v_promoter_split / 100);
  
  -- Retornar resultado
  RETURN jsonb_build_object(
    'total_commission', v_total_commission,
    'team_amount', v_team_amount,
    'promoter_amount', v_promoter_amount,
    'commission_type', v_commission_type,
    'rate', v_rate
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('error', SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- Conceder permissões para funções
GRANT EXECUTE ON FUNCTION calculate_commission TO anon;
GRANT EXECUTE ON FUNCTION calculate_commission TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_commission TO service_role;

-- Função para criar uma equipe e configurar o promotor como líder
CREATE OR REPLACE FUNCTION create_promoter_team_v2(
  user_id UUID,
  team_name TEXT,
  team_description TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  team_id UUID;
  team_code TEXT;
  current_role TEXT;
  v_result JSONB;
BEGIN
  -- Verificar se o usuário existe
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = user_id) THEN
    RAISE EXCEPTION 'Usuário não encontrado';
  END IF;
  
  -- Obter papel atual do usuário para referência
  SELECT raw_user_meta_data->>'role' INTO current_role FROM auth.users WHERE id = user_id;
  RAISE NOTICE 'Papel atual do usuário: %', current_role;
  
  -- Gerar código da equipe
  SELECT 'TEAM-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8)) INTO team_code;
  
  -- Criar a equipe
  INSERT INTO teams (
    name, 
    description, 
    created_by, 
    team_code
  ) 
  VALUES (
    team_name, 
    team_description, 
    user_id, 
    team_code
  )
  RETURNING id INTO team_id;
  
  -- Registrar o usuário como líder da equipe
  INSERT INTO team_members (team_id, user_id, role, joined_at) 
  VALUES (team_id, user_id, 'leader', NOW());
  
  -- Atualizar os metadados do usuário para refletir seu novo papel
  UPDATE auth.users 
  SET raw_user_meta_data = raw_user_meta_data || 
    jsonb_build_object(
      'role', 'chefe-equipe',
      'previous_role', COALESCE(raw_user_meta_data->>'role', 'promotor'),
      'is_team_leader', true,
      'team_id', team_id,
      'team_role', 'chefe'
    )
  WHERE id = user_id;

  -- Construir objeto de resultado para ajudar na depuração
  v_result := jsonb_build_object(
    'id', team_id,
    'team_code', team_code,
    'team_name', team_name,
    'user_id', user_id,
    'previous_role', current_role,
    'new_role', 'chefe-equipe',
    'created_at', NOW()
  );

  -- Retornar o ID da equipe como resultado da função 
  RETURN v_result;
END;
$$;

-- Conceder permissão para usuários autenticados e o service role executar a função
GRANT EXECUTE ON FUNCTION create_promoter_team_v2 TO authenticated;
GRANT EXECUTE ON FUNCTION create_promoter_team_v2 TO service_role;

-- Primeiro removemos a função existente
DROP FUNCTION IF EXISTS get_team_details(uuid);

-- Agora criamos a nova versão
CREATE OR REPLACE FUNCTION get_team_details(team_id_param uuid)
RETURNS TABLE (
    id uuid,
    name text,
    description text,
    team_code text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    member_count bigint,
    is_leader boolean
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id,
        t.name,
        t.description,
        t.team_code,
        t.created_at,
        t.updated_at,
        (SELECT COUNT(*) FROM team_members WHERE team_id = t.id) as member_count,
        (SELECT EXISTS (
            SELECT 1 FROM team_members 
            WHERE team_id = t.id 
            AND user_id = auth.uid()
            AND is_leader = true
        )) as is_leader
    FROM teams t
    WHERE t.id = team_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 