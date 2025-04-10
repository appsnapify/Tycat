// Schema SQL para as tabelas do sistema de comissões e equipes

export const createTeamsSchema = `
-- Primeiro, verificar se as tabelas necessárias existem
DO $$
DECLARE
  organizations_exists BOOLEAN;
  events_exists BOOLEAN;
  tickets_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'organizations'
  ) INTO organizations_exists;
  
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'events'
  ) INTO events_exists;
  
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'tickets'
  ) INTO tickets_exists;
  
  -- Registrar informações
  RAISE NOTICE 'Tabelas existentes: organizations=%', organizations_exists;
  RAISE NOTICE 'Tabelas existentes: events=%', events_exists;
  RAISE NOTICE 'Tabelas existentes: tickets=%', tickets_exists;
END $$;

-- Tabela para equipes/times
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  team_code TEXT UNIQUE NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_active BOOLEAN DEFAULT true
);

-- Tabela para membros da equipe
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('leader', 'member')),
  commission_rate NUMERIC(5,2),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(team_id, user_id)
);

-- As referências condicionais serão criadas separadamente para organization_teams e event_teams
-- Tabela de vinculação entre organizações e equipes (sem referências iniciais)
CREATE TABLE IF NOT EXISTS organization_teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  commission_type TEXT NOT NULL CHECK (commission_type IN ('percentage', 'fixed', 'tiered')),
  commission_rate NUMERIC(5,2),
  commission_fixed_amount NUMERIC(10,2),
  commission_tiers JSONB,
  team_promoter_split NUMERIC(5,2) DEFAULT 30.0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(organization_id, team_id)
);

-- Tabela de vinculação entre eventos e equipes (sem referências iniciais)
CREATE TABLE IF NOT EXISTS event_teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(event_id, team_id)
);

-- Tabela para registros de comissões (sem referências iniciais)
CREATE TABLE IF NOT EXISTS commissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID,
  event_id UUID NOT NULL,
  organization_id UUID NOT NULL,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  promoter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  amount NUMERIC(10,2) NOT NULL,
  team_amount NUMERIC(10,2) NOT NULL,
  promoter_amount NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'paid', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela para pagamentos de comissões (sem referências iniciais)
CREATE TABLE IF NOT EXISTS commission_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'transfer', 'other')),
  amount NUMERIC(10,2) NOT NULL,
  receipt_code TEXT UNIQUE NOT NULL,
  payment_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela para itens de pagamento (comissões individuais incluídas em um pagamento)
CREATE TABLE IF NOT EXISTS commission_payment_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_id UUID REFERENCES commission_payments(id) ON DELETE CASCADE NOT NULL,
  commission_id UUID REFERENCES commissions(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(payment_id, commission_id)
);

-- Tabela para o histórico de recebimentos (confirmações)
CREATE TABLE IF NOT EXISTS payment_confirmations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_id UUID REFERENCES commission_payments(id) ON DELETE CASCADE NOT NULL,
  confirmed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  confirmation_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela para QR codes e links de promotores para eventos específicos (sem referências iniciais)
CREATE TABLE IF NOT EXISTS event_promoters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL,
  promoter_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  promoter_code TEXT UNIQUE NOT NULL,
  promoter_link TEXT NOT NULL,
  qr_code_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(event_id, promoter_id)
);

-- Adicionando referências condicionais se as tabelas existirem
DO $$
DECLARE
  organizations_exists BOOLEAN;
  events_exists BOOLEAN;
  tickets_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'organizations'
  ) INTO organizations_exists;
  
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'events'
  ) INTO events_exists;
  
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'tickets'
  ) INTO tickets_exists;

  -- Adicionar referências para organization_teams se a tabela organizations existir
  IF organizations_exists THEN
    EXECUTE 'ALTER TABLE organization_teams 
             ADD CONSTRAINT organization_teams_organization_id_fkey 
             FOREIGN KEY (organization_id) 
             REFERENCES organizations(id) ON DELETE CASCADE';
    
    EXECUTE 'ALTER TABLE commission_payments 
             ADD CONSTRAINT commission_payments_organization_id_fkey 
             FOREIGN KEY (organization_id) 
             REFERENCES organizations(id) ON DELETE CASCADE';
             
    EXECUTE 'ALTER TABLE commissions 
             ADD CONSTRAINT commissions_organization_id_fkey 
             FOREIGN KEY (organization_id) 
             REFERENCES organizations(id) ON DELETE CASCADE';
  END IF;
  
  -- Adicionar referências para event_teams se a tabela events existir
  IF events_exists THEN
    EXECUTE 'ALTER TABLE event_teams 
             ADD CONSTRAINT event_teams_event_id_fkey 
             FOREIGN KEY (event_id) 
             REFERENCES events(id) ON DELETE CASCADE';
             
    EXECUTE 'ALTER TABLE commissions 
             ADD CONSTRAINT commissions_event_id_fkey 
             FOREIGN KEY (event_id) 
             REFERENCES events(id) ON DELETE CASCADE';
             
    EXECUTE 'ALTER TABLE event_promoters 
             ADD CONSTRAINT event_promoters_event_id_fkey 
             FOREIGN KEY (event_id) 
             REFERENCES events(id) ON DELETE CASCADE';
  END IF;
  
  -- Adicionar referências para commissions se a tabela tickets existir
  IF tickets_exists THEN
    EXECUTE 'ALTER TABLE commissions 
             ADD CONSTRAINT commissions_ticket_id_fkey 
             FOREIGN KEY (ticket_id) 
             REFERENCES tickets(id) ON DELETE SET NULL';
  END IF;
END $$;

-- Função para atualizar o campo updated_at
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar triggers para atualizar o timestamp updated_at
CREATE TRIGGER set_timestamp_teams
BEFORE UPDATE ON teams
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_organization_teams
BEFORE UPDATE ON organization_teams
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_commissions
BEFORE UPDATE ON commissions
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_commission_payments
BEFORE UPDATE ON commission_payments
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- Função para gerar código único para equipe
CREATE OR REPLACE FUNCTION generate_team_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.team_code IS NULL OR NEW.team_code = '' THEN
    NEW.team_code = 'TEAM-' || UPPER(SUBSTRING(MD5(NEW.id::text || RANDOM()::text) FOR 6));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para gerar código de equipe automaticamente
CREATE TRIGGER set_team_code
BEFORE INSERT ON teams
FOR EACH ROW
EXECUTE FUNCTION generate_team_code();

-- Adicionar políticas RLS (Row Level Security) simplificadas

-- Habilitar RLS
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_payment_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_promoters ENABLE ROW LEVEL SECURITY;

-- Políticas simplificadas para teams
DROP POLICY IF EXISTS "Team leaders can select their teams" ON teams;
DROP POLICY IF EXISTS "Team members can select teams they belong to" ON teams;
DROP POLICY IF EXISTS "Organization admins can select teams linked to their organization" ON teams;
DROP POLICY IF EXISTS "Team leaders can insert teams" ON teams;
DROP POLICY IF EXISTS "Team leaders can update their teams" ON teams;

-- Nova política simplificada para teams (visualização)
CREATE POLICY "Authenticated users can view teams"
ON teams FOR SELECT
TO authenticated
USING (true);

-- Nova política simplificada para teams (inserção)
CREATE POLICY "Authenticated users can create teams"
ON teams FOR INSERT
TO authenticated
WITH CHECK (true);

-- Nova política simplificada para teams (atualização)
CREATE POLICY "Team creators can update their teams"
ON teams FOR UPDATE
TO authenticated
USING (created_by = auth.uid());

-- Políticas simplificadas para team_members
DROP POLICY IF EXISTS "Team leaders can manage team members" ON team_members;
DROP POLICY IF EXISTS "Users can view teams they are members of" ON team_members;
DROP POLICY IF EXISTS "Users can join teams" ON team_members;

-- Nova política simplificada para team_members (visualização)
CREATE POLICY "Authenticated users can view team members"
ON team_members FOR SELECT
TO authenticated
USING (true);

-- Nova política simplificada para team_members (inserção)
CREATE POLICY "Authenticated users can join teams"
ON team_members FOR INSERT
TO authenticated
WITH CHECK (true);

-- Nova política simplificada para team_members (atualização)
CREATE POLICY "Team members can update their own membership"
ON team_members FOR UPDATE
TO authenticated
USING (user_id = auth.uid() OR 
       team_id IN (
         SELECT tm.team_id 
         FROM team_members tm 
         WHERE tm.user_id = auth.uid() AND tm.role = 'leader'
       )
);

-- Criar usuários seleção para a função de criação de equipe v2
CREATE OR REPLACE FUNCTION create_promoter_team_v2(
  p_team_name TEXT,
  p_team_description TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  team_id UUID;
  team_code TEXT;
  current_role TEXT;
  user_id UUID;
BEGIN
  -- Obter ID do usuário autenticado
  user_id := auth.uid();
  
  -- Verificar papel atual nos metadados
  SELECT (auth.jwt() ->> 'role')::TEXT INTO current_role;
  
  -- Gerar código único para a equipe
  team_code := 'TEAM-' || UPPER(SUBSTRING(MD5(user_id::text || now()::text || RANDOM()::text) FOR 6));
  
  -- Registrar diagnóstico
  RAISE NOTICE 'Criando equipe para usuário % com papel atual %', user_id, current_role;
  
  -- Inserir nova equipe
  INSERT INTO teams (
    name, 
    description, 
    team_code, 
    created_by, 
    is_active
  ) VALUES (
    p_team_name,
    p_team_description,
    team_code,
    user_id,
    true
  )
  RETURNING id INTO team_id;
  
  -- Registrar diagnóstico
  RAISE NOTICE 'Equipe criada com ID: %', team_id;
  
  -- Adicionar usuário como líder da equipe
  INSERT INTO team_members (
    team_id,
    user_id,
    role,
    joined_at
  ) VALUES (
    team_id,
    user_id,
    'leader',
    NOW()
  );
  
  -- Atualizar metadados do usuário para chefe-equipe
  UPDATE auth.users
  SET raw_user_meta_data = 
    COALESCE(raw_user_meta_data, '{}'::jsonb) || 
    jsonb_build_object(
      'role', 'chefe-equipe',
      'team_id', team_id,
      'team_code', team_code,
      'team_name', p_team_name,
      'team_description', p_team_description
    )
  WHERE id = user_id;
  
  -- Retornar resultado como JSONB para mais informações e debugging
  RETURN jsonb_build_object(
    'team_id', team_id,
    'team_code', team_code,
    'user_id', user_id,
    'previous_role', current_role,
    'new_role', 'chefe-equipe'
  );
END;
$$;

-- Conceder permissão para usuários autenticados e anônimos
GRANT EXECUTE ON FUNCTION create_promoter_team_v2(TEXT, TEXT) TO authenticated, anon, service_role;
`;

// Função para criar as tabelas no Supabase
export async function createTeamsTables(supabase: any) {
  try {
    const { error } = await supabase.rpc('exec_sql', {
      sql_query: createTeamsSchema
    });
    
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Erro ao criar tabelas:', error);
    return { success: false, error };
  }
}

// Função para verificar se as tabelas existem
export async function checkTeamsTables(supabase: any) {
  try {
    const { data, error } = await supabase.from('teams').select('id').limit(1);
    
    if (error && error.code === '42P01') {
      // Tabela não existe
      return { exists: false };
    }
    
    // Se chegou aqui, a tabela existe
    return { exists: true };
  } catch (error) {
    console.error('Erro ao verificar tabelas:', error);
    return { exists: false, error };
  }
}

// Função para criar a função de promoção
export async function createPromotionFunction(supabase: any) {
  try {
    // A função já está incluída no createTeamsSchema
    return { success: true };
  } catch (error) {
    console.error('Erro ao criar função de promoção:', error);
    return { success: false, error };
  }
} 