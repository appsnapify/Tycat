/*
====================================================================
CORREÇÕES DE POLÍTICAS RLS E FUNÇÕES DO SUPABASE PARA SNAP
====================================================================

Este arquivo contém correções para problemas de recursão infinita nas políticas RLS
e inconsistências nas funções de manipulação de equipes. O script tem como objetivos:

1. Simplificar as políticas RLS para evitar loops infinitos
2. Corrigir funções RPC para gerenciar equipes com segurança
3. Garantir a consistência dos metadados dos usuários
4. Padronizar terminologia (promotor, chefe-equipe)
5. Adicionar logs para facilitar a depuração

AUTOR: Claude AI
DATA: 08/04/2025
VERSÃO: 2.0
*/

-- =============================================
-- 1. VERIFICAR E CRIAR TABELAS NECESSÁRIAS
-- =============================================

-- Verificar se a tabela de equipes existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'teams') THEN
        RAISE LOG 'Criando tabela teams';
        
        CREATE TABLE teams (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            name TEXT NOT NULL,
            description TEXT,
            created_by UUID NOT NULL REFERENCES auth.users(id),
            team_code TEXT UNIQUE NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
        );
        
        -- Ativar RLS na tabela
        ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
    ELSE
        RAISE LOG 'Tabela teams já existe';
    END IF;
    
    -- Verificar se a tabela de membros existe
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'team_members') THEN
        RAISE LOG 'Criando tabela team_members';
        
        CREATE TABLE team_members (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            role TEXT NOT NULL DEFAULT 'promotor',
            joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            UNIQUE(team_id, user_id)
        );
        
        -- Ativar RLS na tabela
        ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
    ELSE
        RAISE LOG 'Tabela team_members já existe';
    END IF;
END
$$;

-- =============================================
-- 2. REMOVER POLÍTICAS EXISTENTES PROBLEMÁTICAS
-- =============================================

-- Remover políticas da tabela teams que podem causar loop infinito
DROP POLICY IF EXISTS "Equipes visíveis para seus membros" ON teams;
DROP POLICY IF EXISTS "Líderes podem atualizar suas equipes" ON teams;
DROP POLICY IF EXISTS "Usuários podem criar equipes" ON teams;
DROP POLICY IF EXISTS "Líderes podem excluir suas equipes" ON teams;
DROP POLICY IF EXISTS "Teams are viewable by authenticated users" ON teams;
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON teams;
DROP POLICY IF EXISTS "Team leaders can update their teams" ON teams;
DROP POLICY IF EXISTS "Team leaders can delete their teams" ON teams;
DROP POLICY IF EXISTS "Users can create teams" ON teams;

-- Remover políticas da tabela team_members que podem causar loop infinito
DROP POLICY IF EXISTS "Membros visíveis para membros da mesma equipe" ON team_members;
DROP POLICY IF EXISTS "Líderes podem adicionar membros" ON team_members;
DROP POLICY IF EXISTS "Líderes podem atualizar membros" ON team_members;
DROP POLICY IF EXISTS "Líderes podem remover membros" ON team_members;
DROP POLICY IF EXISTS "Usuário pode visualizar suas próprias associações" ON team_members;
DROP POLICY IF EXISTS "Criadores de equipe podem gerenciar membros" ON team_members;
DROP POLICY IF EXISTS "Usuários podem gerenciar suas próprias associações" ON team_members;
DROP POLICY IF EXISTS "Team members are viewable by team members" ON team_members;
DROP POLICY IF EXISTS "Team leaders can add members" ON team_members;
DROP POLICY IF EXISTS "Team leaders can update members" ON team_members;
DROP POLICY IF EXISTS "Team leaders can remove members" ON team_members;
DROP POLICY IF EXISTS "Users can view their own memberships" ON team_members;
DROP POLICY IF EXISTS "Team creators can manage members" ON team_members;
DROP POLICY IF EXISTS "Users can manage their own memberships" ON team_members;
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON team_members;
DROP POLICY IF EXISTS "Todos podem visualizar membros de equipe" ON team_members;

-- =============================================
-- 3. CRIAR POLÍTICAS RLS SIMPLIFICADAS
-- =============================================

-- Políticas para a tabela teams
-- Simplificando para duas políticas principais:
-- 1. Visualização para todos os usuários autenticados
-- 2. Gerenciamento pelo criador da equipe

CREATE POLICY "Todos podem visualizar equipes" 
ON teams 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Criador pode gerenciar sua equipe" 
ON teams 
FOR ALL 
TO authenticated 
USING (auth.uid() = created_by);

-- Políticas para a tabela team_members
-- Simplificando para três políticas principais:
-- 1. Visualização para todos os usuários autenticados
-- 2. Usuários podem adicionar-se a equipes (através da função RPC)
-- 3. Líderes podem gerenciar membros

CREATE POLICY "Todos podem visualizar membros de equipe"
ON team_members
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Usuários podem adicionar-se a equipes"
ON team_members
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Líderes podem gerenciar membros"
ON team_members
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM teams 
    WHERE teams.id = team_members.team_id 
    AND teams.created_by = auth.uid()
  )
);

-- =============================================
-- 4. REMOVER FUNÇÕES ANTIGAS PARA EVITAR CONFLITOS
-- =============================================

DROP FUNCTION IF EXISTS create_promoter_team(UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS create_promoter_team_v2(UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS join_team_with_code(UUID, TEXT);
DROP FUNCTION IF EXISTS get_team_details(UUID);
DROP FUNCTION IF EXISTS get_team_members(UUID);
DROP FUNCTION IF EXISTS is_team_member(UUID, UUID);

-- =============================================
-- 5. CRIAR OU SUBSTITUIR FUNÇÕES RPC MELHORADAS
-- =============================================

-- Função para criar uma equipe de promotores
CREATE OR REPLACE FUNCTION create_promoter_team_v2(
  user_id UUID,
  team_name TEXT,
  team_description TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  team_id UUID;
  team_code TEXT;
  current_role TEXT;
  result JSONB;
BEGIN
  -- Verificar se o usuário existe
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = user_id) THEN
    RAISE EXCEPTION 'Usuário não encontrado';
  END IF;
  
  -- Obter papel atual do usuário para referência
  SELECT raw_user_meta_data->>'role' INTO current_role 
  FROM auth.users 
  WHERE id = user_id;
  
  RAISE LOG 'Criando equipe para usuário %, papel atual: %', user_id, current_role;
  
  -- Verificar se o usuário já é líder de equipe
  IF current_role = 'chefe-equipe' OR EXISTS (
    SELECT 1 FROM team_members 
    WHERE user_id = user_id AND role = 'chefe-equipe'
  ) THEN
    RAISE EXCEPTION 'Usuário já é líder de uma equipe';
  END IF;
  
  -- Gerar código da equipe
  SELECT 'TEAM-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 5)) INTO team_code;
  
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
  
  RAISE LOG 'Equipe criada com ID % e código %', team_id, team_code;
  
  -- Registrar o usuário como chefe da equipe (usando 'chefe-equipe' consistentemente)
  INSERT INTO team_members (team_id, user_id, role, joined_at) 
  VALUES (team_id, user_id, 'chefe-equipe', NOW());
  
  RAISE LOG 'Usuário % adicionado como chefe-equipe', user_id;
  
  -- Atualizar os metadados do usuário para refletir seu novo papel
  UPDATE auth.users 
  SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || 
    jsonb_build_object(
      'role', 'chefe-equipe',
      'previous_role', current_role,
      'is_team_leader', true,
      'team_id', team_id,
      'team_code', team_code,
      'team_name', team_name
    )
  WHERE id = user_id;
  
  RAISE LOG 'Metadados do usuário % atualizados com papel chefe-equipe', user_id;

  -- Construir objeto de resultado para ajudar na depuração
  result := jsonb_build_object(
    'id', team_id,
    'team_code', team_code,
    'team_name', team_name,
    'user_id', user_id,
    'previous_role', current_role,
    'new_role', 'chefe-equipe',
    'created_at', NOW()
  );

  RAISE LOG 'Equipe criada com sucesso: %', result;

  -- Retornar o resultado da função 
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Erro ao criar equipe: %', SQLERRM;
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'errorcode', SQLSTATE
    );
END;
$$;

-- Função para ingressar em uma equipe usando o código
CREATE OR REPLACE FUNCTION join_team_with_code(
  user_id_param UUID,
  team_code_param TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  team_id UUID;
  team_name TEXT;
  current_role TEXT;
  result JSONB;
BEGIN
  -- Verificar se o código da equipe existe
  SELECT id, name INTO team_id, team_name
  FROM teams
  WHERE team_code = team_code_param;
  
  IF team_id IS NULL THEN
    RAISE EXCEPTION 'Código de equipe inválido';
  END IF;
  
  RAISE LOG 'Verificando adesão do usuário % à equipe %', user_id_param, team_id;
  
  -- Verificar se o usuário já pertence a essa equipe
  IF EXISTS (
    SELECT 1 FROM team_members 
    WHERE team_id = team_id AND user_id = user_id_param
  ) THEN
    RAISE EXCEPTION 'Usuário já pertence a esta equipe';
  END IF;
  
  -- Verificar papel atual do usuário
  SELECT raw_user_meta_data->>'role' INTO current_role
  FROM auth.users
  WHERE id = user_id_param;
  
  RAISE LOG 'Usuário % tem papel atual: %', user_id_param, current_role;
  
  -- Adicionar usuário como membro da equipe (papel normalizado para 'promotor')
  INSERT INTO team_members (team_id, user_id, role)
  VALUES (team_id, user_id_param, 'promotor');
  
  RAISE LOG 'Usuário % adicionado à equipe % como promotor', user_id_param, team_id;
  
  -- Atualizar metadados do usuário
  UPDATE auth.users
  SET raw_user_meta_data = 
    COALESCE(raw_user_meta_data, '{}'::JSONB) || 
    jsonb_build_object(
      'role', 'promotor',            -- Normalizado para 'promotor'
      'team_id', team_id,
      'team_code', team_code_param,
      'team_name', team_name,
      'previous_role', current_role
    )
  WHERE id = user_id_param;
  
  RAISE LOG 'Metadados do usuário % atualizados para equipe %', user_id_param, team_id;
  
  -- Construir resultado
  result := jsonb_build_object(
    'success', true,
    'team_id', team_id,
    'team_name', team_name,
    'team_code', team_code_param,
    'user_id', user_id_param,
    'role', 'promotor',
    'timestamp', now()
  );
  
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Erro ao ingressar na equipe: %', SQLERRM;
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'errorcode', SQLSTATE
    );
END;
$$;

-- Função para obter detalhes completos da equipe
CREATE OR REPLACE FUNCTION get_team_details(
  team_id_param UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  team_record RECORD;
  member_count INTEGER;
  events_count INTEGER := 0;
  sales_count INTEGER := 0;
  sales_total NUMERIC := 0;
  tables_status JSONB;
  result JSONB;
BEGIN
  -- Verificar se a equipe existe
  SELECT * INTO team_record
  FROM teams
  WHERE id = team_id_param;
  
  IF team_record IS NULL THEN
    RAISE EXCEPTION 'Equipe não encontrada';
  END IF;
  
  -- Contar membros da equipe
  SELECT COUNT(*) INTO member_count
  FROM team_members
  WHERE team_id = team_id_param;
  
  -- Verificar se tabelas relacionadas existem
  tables_status := jsonb_build_object(
    'events_table_exists', EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'events'),
    'sales_table_exists', EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'sales')
  );
  
  -- Verificar contagem de eventos se a tabela existir
  IF (tables_status->>'events_table_exists')::BOOLEAN THEN
    BEGIN
      EXECUTE 'SELECT COUNT(*) FROM events WHERE team_id = $1' INTO events_count USING team_id_param;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE LOG 'Erro ao contar eventos: %', SQLERRM;
        events_count := 0;
    END;
  END IF;
  
  -- Verificar estatísticas de vendas se a tabela existir
  IF (tables_status->>'sales_table_exists')::BOOLEAN THEN
    BEGIN
      EXECUTE 'SELECT COUNT(*), COALESCE(SUM(amount), 0) FROM sales WHERE team_id = $1' 
      INTO sales_count, sales_total 
      USING team_id_param;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE LOG 'Erro ao contar vendas: %', SQLERRM;
        sales_count := 0;
        sales_total := 0;
    END;
  END IF;
  
  -- Construir resultado detalhado
  result := jsonb_build_object(
    'id', team_record.id,
    'name', team_record.name,
    'description', team_record.description,
    'team_code', team_record.team_code,
    'created_by', team_record.created_by,
    'created_at', team_record.created_at,
    'member_count', member_count,
    'events_count', events_count,
    'sales_count', sales_count,
    'sales_total', sales_total,
    'tables_status', tables_status
  );
  
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Erro ao obter detalhes da equipe: %', SQLERRM;
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'errorcode', SQLSTATE
    );
END;
$$;

-- Função para obter membros da equipe com perfis
CREATE OR REPLACE FUNCTION get_team_members(
  team_id_param UUID
)
RETURNS SETOF JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT jsonb_build_object(
    'id', tm.id,
    'user_id', tm.user_id,
    'team_id', tm.team_id,
    'role', tm.role,
    'joined_at', tm.joined_at,
    'profile', jsonb_build_object(
      'id', u.id,
      'email', u.email,
      'full_name', COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', u.email),
      'avatar_url', u.raw_user_meta_data->>'avatar_url'
    )
  )
  FROM team_members tm
  JOIN auth.users u ON tm.user_id = u.id
  WHERE tm.team_id = team_id_param
  ORDER BY 
    CASE WHEN tm.role = 'chefe-equipe' THEN 0
         WHEN tm.role = 'leader' THEN 0
         ELSE 1 END,
    tm.joined_at;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Erro ao listar membros da equipe: %', SQLERRM;
    RETURN;
END;
$$;

-- Função para verificar se um usuário é membro de uma equipe
CREATE OR REPLACE FUNCTION is_team_member(
  user_id_param UUID,
  team_id_param UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM team_members
    WHERE user_id = user_id_param AND team_id = team_id_param
  );
END;
$$;

-- Função para obter perfil do promotor completo
CREATE OR REPLACE FUNCTION get_promoter_profile(
  user_id_param UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_record RECORD;
  team_record JSONB;
  has_team BOOLEAN;
  is_team_leader BOOLEAN;
  result JSONB;
BEGIN
  -- Obter dados do usuário
  SELECT id, email, raw_user_meta_data INTO user_record
  FROM auth.users
  WHERE id = user_id_param;
  
  IF user_record IS NULL THEN
    RAISE EXCEPTION 'Usuário não encontrado';
  END IF;
  
  -- Verificar se é membro de uma equipe
  has_team := user_record.raw_user_meta_data ? 'team_id';
  
  -- Verificar se é líder de equipe
  is_team_leader := COALESCE(
    (user_record.raw_user_meta_data->>'is_team_leader')::BOOLEAN,
    COALESCE(user_record.raw_user_meta_data->>'role', '') = 'chefe-equipe',
    COALESCE(user_record.raw_user_meta_data->>'role', '') = 'team-leader',
    false
  );
  
  -- Tentar obter dados da equipe se o usuário tiver uma
  IF has_team THEN
    BEGIN
      -- Chamar a função get_team_details para obter detalhes da equipe
      SELECT get_team_details(user_record.raw_user_meta_data->>'team_id')::JSONB INTO team_record;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE LOG 'Erro ao obter equipe do usuário: %', SQLERRM;
        team_record := NULL;
    END;
  END IF;
  
  -- Construir objeto de resposta
  result := jsonb_build_object(
    'user', jsonb_build_object(
      'id', user_record.id,
      'email', user_record.email,
      'role', COALESCE(
        CASE 
          WHEN user_record.raw_user_meta_data->>'role' = 'team-leader' THEN 'chefe-equipe'
          WHEN user_record.raw_user_meta_data->>'role' = 'promoter' THEN 'promotor'
          ELSE user_record.raw_user_meta_data->>'role'
        END,
        'desconhecido'
      ),
      'full_name', COALESCE(
        user_record.raw_user_meta_data->>'full_name', 
        user_record.raw_user_meta_data->>'name',
        'Usuário'
      ),
      'avatar_url', user_record.raw_user_meta_data->>'avatar_url',
      'team_id', user_record.raw_user_meta_data->>'team_id',
      'team_code', user_record.raw_user_meta_data->>'team_code',
      'team_name', user_record.raw_user_meta_data->>'team_name'
    ),
    'team', team_record,
    'has_team', has_team,
    'is_team_leader', is_team_leader
  );
  
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Erro ao obter perfil do promotor: %', SQLERRM;
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'errorcode', SQLSTATE
    );
END;
$$;

-- Função para obter todas as equipes de um usuário
CREATE OR REPLACE FUNCTION get_user_teams(
  user_id_param UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  teams_data JSONB;
  metadata_teams JSONB;
  user_metadata JSONB;
  result JSONB;
BEGIN
  -- Obter metadados do usuário
  SELECT raw_user_meta_data INTO user_metadata
  FROM auth.users
  WHERE id = user_id_param;
  
  -- Obter equipes do banco de dados
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', t.id,
        'name', t.name,
        'description', t.description,
        'team_code', t.team_code,
        'role', tm.role,
        'joined_at', tm.joined_at
      )
    ),
    '[]'::jsonb
  ) INTO teams_data
  FROM team_members tm
  JOIN teams t ON tm.team_id = t.id
  WHERE tm.user_id = user_id_param;
  
  -- Construir informações da equipe a partir dos metadados
  metadata_teams := jsonb_build_object(
    'team_id', user_metadata->>'team_id',
    'team_code', user_metadata->>'team_code',
    'team_name', user_metadata->>'team_name',
    'team_role', user_metadata->>'team_role',
    'role', user_metadata->>'role'
  );
  
  -- Construir o resultado completo
  result := jsonb_build_object(
    'user_id', user_id_param,
    'metadata', user_metadata,
    'teams_from_db', teams_data,
    'teams_from_metadata', metadata_teams,
    'timestamp', now(),
    'has_inconsistency', (teams_data->0->>'id') IS DISTINCT FROM (user_metadata->>'team_id')
  );
  
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Erro ao obter equipes do usuário: %', SQLERRM;
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'errorcode', SQLSTATE
    );
END;
$$;

-- =============================================
-- 6. CONCEDER PERMISSÕES PARA FUNÇÕES
-- =============================================

-- Conceder execução para usuários autenticados e função service_role
GRANT EXECUTE ON FUNCTION create_promoter_team_v2 TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION join_team_with_code TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_team_details TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_team_members TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION is_team_member TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_promoter_profile TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_user_teams TO authenticated, service_role;

-- =============================================
-- 7. ATUALIZAR METADADOS EXISTENTES PARA CONSISTÊNCIA
-- =============================================

DO $$
DECLARE
    user_record RECORD;
BEGIN
    -- Atualizar usuários com papel 'team-leader' para 'chefe-equipe'
    FOR user_record IN 
        SELECT id, raw_user_meta_data 
        FROM auth.users 
        WHERE 
            raw_user_meta_data->>'role' = 'team-leader'
    LOOP
        UPDATE auth.users
        SET raw_user_meta_data = raw_user_meta_data || '{"role": "chefe-equipe"}'::jsonb
        WHERE id = user_record.id;
        
        RAISE LOG 'Atualizado usuário % de team-leader para chefe-equipe', user_record.id;
    END LOOP;
    
    -- Atualizar usuários com papel 'promoter' para 'promotor'
    FOR user_record IN 
        SELECT id, raw_user_meta_data 
        FROM auth.users 
        WHERE 
            raw_user_meta_data->>'role' = 'promoter'
    LOOP
        UPDATE auth.users
        SET raw_user_meta_data = raw_user_meta_data || '{"role": "promotor"}'::jsonb
        WHERE id = user_record.id;
        
        RAISE LOG 'Atualizado usuário % de promoter para promotor', user_record.id;
    END LOOP;
    
    -- Atualizar membros de equipe na tabela team_members
    UPDATE team_members
    SET role = 'chefe-equipe'
    WHERE role IN ('team-leader', 'leader');
    
    UPDATE team_members
    SET role = 'promotor'
    WHERE role = 'promoter';
    
    RAISE LOG 'Atualização de terminologia concluída';
END
$$;

-- =============================================
-- 8. FUNÇÃO PARA SINCRONIZAR METADADOS DE USUÁRIO
-- =============================================

-- Função para sincronizar todos os metadados de equipe de um usuário
CREATE OR REPLACE FUNCTION sync_user_team_metadata(
  user_id_param UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  team_record RECORD;
  is_team_leader BOOLEAN;
  current_role TEXT;
  team_metadata JSONB;
  result JSONB;
BEGIN
  -- Inicializar
  RAISE LOG 'Sincronizando metadados de equipe para usuário %', user_id_param;
  
  -- Verificar se o usuário é membro de alguma equipe
  SELECT t.id, t.name, t.team_code, t.created_by, tm.role
  INTO team_record
  FROM team_members tm
  JOIN teams t ON tm.team_id = t.id
  WHERE tm.user_id = user_id_param
  ORDER BY 
    CASE WHEN tm.role = 'chefe-equipe' THEN 0 ELSE 1 END,
    tm.joined_at
  LIMIT 1;
  
  -- Se não for membro de equipe, limpar metadados relacionados
  IF team_record IS NULL THEN
    RAISE LOG 'Usuário % não é membro de nenhuma equipe, limpando metadados', user_id_param;
    
    UPDATE auth.users
    SET raw_user_meta_data = raw_user_meta_data - 'team_id' - 'team_code' - 'team_name' - 'team_role' - 'is_team_leader'
    WHERE id = user_id_param;
    
    -- Verificar se devemos manter o papel como promotor
    SELECT raw_user_meta_data->>'role' INTO current_role
    FROM auth.users
    WHERE id = user_id_param;
    
    IF current_role IN ('chefe-equipe', 'team-leader') THEN
      -- Se não tem equipe, não pode ser chefe de equipe
      UPDATE auth.users
      SET raw_user_meta_data = jsonb_set(
        raw_user_meta_data,
        '{role}',
        '"promotor"'
      )
      WHERE id = user_id_param;
      
      RAISE LOG 'Papel redefinido de % para promotor', current_role;
    END IF;
    
    RETURN jsonb_build_object(
      'success', true,
      'user_id', user_id_param,
      'message', 'Metadados de equipe removidos',
      'has_team', false
    );
  END IF;
  
  -- Determinar se é líder da equipe
  is_team_leader := team_record.created_by = user_id_param OR team_record.role = 'chefe-equipe';
  
  -- Normalizar papel
  current_role := CASE 
    WHEN is_team_leader THEN 'chefe-equipe'
    ELSE 'promotor'
  END;
  
  -- Construir metadados de equipe
  team_metadata := jsonb_build_object(
    'team_id', team_record.id,
    'team_code', team_record.team_code,
    'team_name', team_record.name,
    'role', current_role,
    'is_team_leader', is_team_leader
  );
  
  -- Atualizar metadados do usuário
  UPDATE auth.users
  SET raw_user_meta_data = raw_user_meta_data || team_metadata
  WHERE id = user_id_param;
  
  RAISE LOG 'Metadados atualizados para usuário %: %', user_id_param, team_metadata;
  
  -- Construir resultado
  result := jsonb_build_object(
    'success', true,
    'user_id', user_id_param,
    'team_id', team_record.id,
    'team_name', team_record.name,
    'team_code', team_record.team_code,
    'role', current_role,
    'is_team_leader', is_team_leader,
    'message', 'Metadados de equipe sincronizados com sucesso'
  );
  
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Erro ao sincronizar metadados: %', SQLERRM;
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'errorcode', SQLSTATE
    );
END;
$$;

-- Conceder permissões
GRANT EXECUTE ON FUNCTION sync_user_team_metadata TO authenticated, service_role;

-- Atualizar metadados de todos os usuários para teste
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN 
    SELECT DISTINCT user_id 
    FROM team_members
  LOOP
    PERFORM sync_user_team_metadata(user_record.user_id);
  END LOOP;
  
  RAISE LOG 'Sincronização de metadados concluída para todos os usuários com equipes';
END
$$;

-- =============================================
-- 9. FERRAMENTAS DE DIAGNÓSTICO PARA EQUIPES
-- =============================================

-- Função para listar todas as equipes com informações completas
CREATE OR REPLACE FUNCTION list_all_teams()
RETURNS SETOF JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT jsonb_build_object(
    'id', t.id,
    'name', t.name,
    'description', t.description,
    'team_code', t.team_code,
    'created_by', t.created_by,
    'created_at', t.created_at,
    'member_count', (SELECT COUNT(*) FROM team_members WHERE team_id = t.id),
    'creator', (
      SELECT jsonb_build_object(
        'id', u.id,
        'email', u.email,
        'role', COALESCE(u.raw_user_meta_data->>'role', 'desconhecido'),
        'name', COALESCE(u.raw_user_meta_data->>'name', u.email)
      )
      FROM auth.users u
      WHERE u.id = t.created_by
    )
  )
  FROM teams t
  ORDER BY t.created_at DESC;
END;
$$;

-- Função para listar todos os usuários com seus papéis e equipes
CREATE OR REPLACE FUNCTION list_all_users_with_teams()
RETURNS SETOF JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT jsonb_build_object(
    'id', u.id,
    'email', u.email,
    'created_at', u.created_at,
    'last_sign_in', u.last_sign_in_at,
    'metadata', u.raw_user_meta_data,
    'role', COALESCE(u.raw_user_meta_data->>'role', 'desconhecido'),
    'teams', (
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'team_id', t.id,
            'team_name', t.name,
            'team_code', t.team_code,
            'role', tm.role,
            'is_creator', t.created_by = u.id,
            'joined_at', tm.joined_at
          )
        ),
        '[]'::jsonb
      )
      FROM team_members tm
      JOIN teams t ON tm.team_id = t.id
      WHERE tm.user_id = u.id
    ),
    'team_metadata', jsonb_build_object(
      'team_id', u.raw_user_meta_data->>'team_id',
      'team_name', u.raw_user_meta_data->>'team_name',
      'team_code', u.raw_user_meta_data->>'team_code',
      'role', u.raw_user_meta_data->>'role'
    ),
    'has_inconsistency', (
      CASE 
        WHEN NOT EXISTS (SELECT 1 FROM team_members WHERE user_id = u.id) AND 
             u.raw_user_meta_data->>'team_id' IS NOT NULL 
          THEN true
        WHEN EXISTS (SELECT 1 FROM team_members WHERE user_id = u.id) AND 
             u.raw_user_meta_data->>'team_id' IS NULL 
          THEN true
        WHEN EXISTS (
          SELECT 1 
          FROM team_members tm 
          JOIN teams t ON tm.team_id = t.id 
          WHERE tm.user_id = u.id AND 
                (u.raw_user_meta_data->>'team_id')::UUID IS DISTINCT FROM tm.team_id
        ) THEN true
        ELSE false
      END
    )
  )
  FROM auth.users u
  ORDER BY u.created_at DESC;
END;
$$;

-- Função para verificar e listar todas as inconsistências nas equipes
CREATE OR REPLACE FUNCTION diagnose_team_inconsistencies()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inconsistent_users JSONB;
  orphaned_memberships JSONB;
  invalid_team_references JSONB;
  role_inconsistencies JSONB;
  result JSONB;
BEGIN
  -- Usuários com metadados inconsistentes com sua participação real em equipes
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', u.id,
        'email', u.email,
        'metadata_team_id', u.raw_user_meta_data->>'team_id',
        'metadata_role', u.raw_user_meta_data->>'role',
        'actual_teams', (
          SELECT COALESCE(
            jsonb_agg(
              jsonb_build_object(
                'team_id', t.id,
                'team_name', t.name,
                'role', tm.role
              )
            ),
            '[]'::jsonb
          )
          FROM team_members tm
          JOIN teams t ON tm.team_id = t.id
          WHERE tm.user_id = u.id
        ),
        'issue', (
          CASE
            WHEN (u.raw_user_meta_data->>'role' = 'chefe-equipe' OR u.raw_user_meta_data->>'role' = 'team-leader') AND
                 NOT EXISTS (
                   SELECT 1 FROM team_members tm
                   WHERE tm.user_id = u.id AND (tm.role = 'chefe-equipe' OR tm.role = 'leader')
                 )
              THEN 'Usuário marcado como chefe-equipe nos metadados, mas não em team_members'
            WHEN (u.raw_user_meta_data->>'role' = 'promotor' OR u.raw_user_meta_data->>'role' = 'promoter') AND
                 NOT EXISTS (
                   SELECT 1 FROM team_members tm
                   WHERE tm.user_id = u.id AND (tm.role = 'promotor' OR tm.role = 'promoter')
                 )
              THEN 'Usuário marcado como promotor nos metadados, mas não em team_members'
            WHEN (u.raw_user_meta_data->>'team_id') IS NOT NULL AND
                 NOT EXISTS (
                   SELECT 1 FROM team_members tm
                   WHERE tm.user_id = u.id AND tm.team_id = (u.raw_user_meta_data->>'team_id')::UUID
                 )
              THEN 'Equipe nos metadados não corresponde a nenhuma equipe real do usuário'
            WHEN (u.raw_user_meta_data->>'team_id') IS NULL AND
                 EXISTS (SELECT 1 FROM team_members WHERE user_id = u.id)
              THEN 'Usuário é membro de equipe, mas sem equipe nos metadados'
            ELSE 'Outra inconsistência'
          END
        )
      )
    ),
    '[]'::jsonb
  )
  INTO inconsistent_users
  FROM auth.users u
  WHERE (
    -- Usuário marcado como chefe mas não é chefe em nenhuma equipe
    ((u.raw_user_meta_data->>'role' = 'chefe-equipe' OR u.raw_user_meta_data->>'role' = 'team-leader') AND
     NOT EXISTS (
       SELECT 1 FROM team_members tm
       WHERE tm.user_id = u.id AND (tm.role = 'chefe-equipe' OR tm.role = 'leader')
     )
    ) OR
    -- Usuário tem ID de equipe mas não é membro desta equipe
    ((u.raw_user_meta_data->>'team_id') IS NOT NULL AND
     NOT EXISTS (
       SELECT 1 FROM team_members tm
       WHERE tm.user_id = u.id AND tm.team_id = (u.raw_user_meta_data->>'team_id')::UUID
     )
    ) OR
    -- Usuário é membro de equipe mas não tem equipe nos metadados
    ((u.raw_user_meta_data->>'team_id') IS NULL AND
     EXISTS (SELECT 1 FROM team_members WHERE user_id = u.id))
  );

  -- Associações de membros para equipes que não existem
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', tm.id,
        'user_id', tm.user_id,
        'team_id', tm.team_id,
        'role', tm.role,
        'joined_at', tm.joined_at,
        'issue', 'Referência a equipe inexistente'
      )
    ),
    '[]'::jsonb
  )
  INTO orphaned_memberships
  FROM team_members tm
  WHERE NOT EXISTS (SELECT 1 FROM teams t WHERE t.id = tm.team_id);

  -- Construir resultado final
  result := jsonb_build_object(
    'inconsistent_users', inconsistent_users,
    'orphaned_memberships', orphaned_memberships,
    'timestamp', now(),
    'total_issues', jsonb_array_length(inconsistent_users) + jsonb_array_length(orphaned_memberships)
  );
  
  RETURN result;
END;
$$;

-- Conceder permissões
GRANT EXECUTE ON FUNCTION list_all_teams TO service_role;
GRANT EXECUTE ON FUNCTION list_all_users_with_teams TO service_role;
GRANT EXECUTE ON FUNCTION diagnose_team_inconsistencies TO service_role;

-- Executar diagnóstico para verificar estado atual
DO $$
BEGIN
  RAISE LOG 'Diagnóstico de inconsistências em equipes:';
  PERFORM diagnose_team_inconsistencies();
END
$$;

-- Função para corrigir automaticamente inconsistências nos metadados de equipe
CREATE OR REPLACE FUNCTION fix_team_metadata_inconsistencies(
  specific_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_record RECORD;
  fixes_count INTEGER := 0;
  fixed_users JSONB := '[]'::JSONB;
  primary_team_id UUID;
  primary_team_record RECORD;
  current_metadata JSONB;
  new_metadata JSONB;
  user_filter TEXT;
BEGIN
  -- Configurar filtro de usuário
  IF specific_user_id IS NOT NULL THEN
    user_filter := ' AND id = ' || quote_literal(specific_user_id);
  ELSE
    user_filter := '';
  END IF;
  
  -- Procurar usuários com inconsistências
  FOR user_record IN EXECUTE 
    'SELECT 
       id, 
       email, 
       raw_user_meta_data 
     FROM auth.users 
     WHERE 
       raw_user_meta_data IS NOT NULL' || user_filter
  LOOP
    current_metadata := user_record.raw_user_meta_data;
    new_metadata := current_metadata;
    
    -- Verificar se tem inconsistências que precisam ser corrigidas
    IF (
      -- O usuário tem um papel inconsistente com as equipes
      (current_metadata->>'role' IN ('chefe-equipe', 'team-leader') AND
       NOT EXISTS (
         SELECT 1 FROM team_members tm
         WHERE tm.user_id = user_record.id AND tm.role IN ('chefe-equipe', 'leader')
       )
      ) OR
      -- O usuário tem um ID de equipe que não corresponde à realidade
      (current_metadata->>'team_id' IS NOT NULL AND
       NOT EXISTS (
         SELECT 1 FROM team_members tm
         WHERE tm.user_id = user_record.id AND tm.team_id = (current_metadata->>'team_id')::UUID
       )
      ) OR
      -- O usuário não tem ID de equipe nos metadados mas faz parte de equipes
      (current_metadata->>'team_id' IS NULL AND
       EXISTS (SELECT 1 FROM team_members WHERE user_id = user_record.id))
    ) THEN
      -- Tentar obter a equipe principal do usuário
      SELECT tm.team_id, tm.role
      INTO primary_team_record
      FROM team_members tm
      JOIN teams t ON tm.team_id = t.id
      WHERE tm.user_id = user_record.id
      ORDER BY 
        CASE WHEN tm.role IN ('chefe-equipe', 'leader') THEN 0 ELSE 1 END, -- Priorizar papel de líder
        CASE WHEN t.created_by = user_record.id THEN 0 ELSE 1 END, -- Priorizar equipes criadas pelo usuário
        tm.joined_at -- Mais antigo primeiro
      LIMIT 1;
      
      -- Se encontrou uma equipe, atualizar metadados
      IF primary_team_record IS NOT NULL THEN
        -- Obter detalhes da equipe
        SELECT 
          t.id, 
          t.name, 
          t.team_code,
          primary_team_record.role AS user_role,
          (t.created_by = user_record.id) AS is_creator
        INTO primary_team_record
        FROM teams t
        WHERE t.id = primary_team_record.team_id;
        
        -- Normalizar papel
        IF primary_team_record.user_role = 'leader' OR 
           (primary_team_record.is_creator AND primary_team_record.user_role IS NOT NULL) THEN
          primary_team_record.user_role := 'chefe-equipe';
        ELSIF primary_team_record.user_role = 'promoter' THEN
          primary_team_record.user_role := 'promotor';
        END IF;
        
        -- Construir novos metadados
        new_metadata := jsonb_set(
          jsonb_set(
            jsonb_set(
              jsonb_set(
                jsonb_set(
                  jsonb_set(
                    COALESCE(current_metadata, '{}'::jsonb),
                    '{team_id}',
                    to_jsonb(primary_team_record.id)
                  ),
                  '{team_name}',
                  to_jsonb(primary_team_record.name)
                ),
                '{team_code}',
                to_jsonb(primary_team_record.team_code)
              ),
              '{role}',
              to_jsonb(primary_team_record.user_role)
            ),
            '{is_team_leader}',
            to_jsonb(primary_team_record.user_role = 'chefe-equipe' OR primary_team_record.is_creator)
          ),
          '{updated_at}',
          to_jsonb(NOW())
        );
        
        -- Atualizar metadados do usuário
        UPDATE auth.users
        SET 
          raw_user_meta_data = new_metadata,
          updated_at = NOW()
        WHERE id = user_record.id;
        
        -- Adicionar aos usuários corrigidos
        fixed_users := fixed_users || jsonb_build_object(
          'id', user_record.id,
          'email', user_record.email,
          'previous_metadata', current_metadata,
          'updated_metadata', new_metadata,
          'team_id', primary_team_record.id,
          'team_name', primary_team_record.name,
          'role', primary_team_record.user_role
        );
        
        fixes_count := fixes_count + 1;
      ELSE
        -- Se não encontrou equipe, remover metadados de equipe
        IF current_metadata ? 'team_id' OR 
           current_metadata ? 'team_name' OR 
           current_metadata ? 'team_code' OR
           current_metadata->>'role' IN ('chefe-equipe', 'team-leader') THEN
          
          -- Remover referências a equipes
          new_metadata := current_metadata - 'team_id' - 'team_name' - 'team_code' - 'is_team_leader';
          
          -- Se o papel era chefe de equipe, mudar para promotor
          IF current_metadata->>'role' IN ('chefe-equipe', 'team-leader') THEN
            new_metadata := jsonb_set(new_metadata, '{role}', '"promotor"');
          END IF;
          
          -- Atualizar metadados do usuário
          UPDATE auth.users
          SET 
            raw_user_meta_data = new_metadata,
            updated_at = NOW()
          WHERE id = user_record.id;
          
          -- Adicionar aos usuários corrigidos
          fixed_users := fixed_users || jsonb_build_object(
            'id', user_record.id,
            'email', user_record.email,
            'previous_metadata', current_metadata,
            'updated_metadata', new_metadata,
            'action', 'Removidas referências a equipes inexistentes'
          );
          
          fixes_count := fixes_count + 1;
        END IF;
      END IF;
    END IF;
  END LOOP;
  
  -- Retornar resultados da correção
  RETURN jsonb_build_object(
    'success', true,
    'fixes_count', fixes_count,
    'fixed_users', fixed_users,
    'timestamp', now()
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'fixed_count_before_error', fixes_count
    );
END;
$$;

-- Conceder permissões
GRANT EXECUTE ON FUNCTION fix_team_metadata_inconsistencies() TO service_role;
GRANT EXECUTE ON FUNCTION fix_team_metadata_inconsistencies(UUID) TO service_role;

-- =============================================
-- 10. TRIGGER PARA MANTER METADADOS CONSISTENTES
-- =============================================

-- Função para atualizar automaticamente os metadados quando uma associação de equipe muda
CREATE OR REPLACE FUNCTION update_user_metadata_on_team_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_team_name TEXT;
  v_team_code TEXT;
  v_created_by UUID;
  v_metadata JSONB;
  v_is_team_leader BOOLEAN;
BEGIN
  -- Determinar qual operação está ocorrendo (INSERT, UPDATE, DELETE)
  IF (TG_OP = 'DELETE') THEN
    -- Quando um usuário é removido de uma equipe
    -- Verificar se o usuário ainda pertence a alguma equipe
    IF NOT EXISTS (
      SELECT 1 FROM team_members 
      WHERE user_id = OLD.user_id AND id != OLD.id
    ) THEN
      -- Usuário não pertence mais a nenhuma equipe, limpar metadados
      UPDATE auth.users
      SET raw_user_meta_data = raw_user_meta_data - 'team_id' - 'team_name' - 'team_code' - 'is_team_leader',
          updated_at = NOW()
      WHERE id = OLD.user_id;
      
      -- Se o papel do usuário era líder de equipe, mudar para promotor
      UPDATE auth.users
      SET raw_user_meta_data = 
        CASE 
          WHEN raw_user_meta_data->>'role' IN ('chefe-equipe', 'team-leader') 
          THEN jsonb_set(raw_user_meta_data, '{role}', '"promotor"')
          ELSE raw_user_meta_data
        END,
        updated_at = NOW()
      WHERE id = OLD.user_id AND raw_user_meta_data->>'role' IN ('chefe-equipe', 'team-leader');
    ELSE
      -- Usuário ainda pertence a outras equipes, atualizar com base na principal
      PERFORM fix_team_metadata_inconsistencies(OLD.user_id);
    END IF;
    
    RETURN OLD;
  ELSE
    -- Para INSERT ou UPDATE
    -- Obter dados da equipe
    SELECT name, team_code, created_by
    INTO v_team_name, v_team_code, v_created_by
    FROM teams
    WHERE id = NEW.team_id;
    
    -- Determinar se é líder da equipe
    v_is_team_leader := (NEW.role IN ('chefe-equipe', 'leader')) OR (v_created_by = NEW.user_id);
    
    -- Normalizar papel
    IF v_is_team_leader THEN
      NEW.role := 'chefe-equipe';
    ELSIF NEW.role = 'promoter' THEN
      NEW.role := 'promotor';
    END IF;
    
    -- Obter metadados atuais
    SELECT raw_user_meta_data INTO v_metadata
    FROM auth.users
    WHERE id = NEW.user_id;
    
    -- Atualizar metadados do usuário
    UPDATE auth.users
    SET raw_user_meta_data = 
          jsonb_set(
            jsonb_set(
              jsonb_set(
                jsonb_set(
                  jsonb_set(
                    COALESCE(v_metadata, '{}'::jsonb),
                    '{team_id}',
                    to_jsonb(NEW.team_id)
                  ),
                  '{team_name}',
                  to_jsonb(v_team_name)
                ),
                '{team_code}',
                to_jsonb(v_team_code)
              ),
              '{role}',
              to_jsonb(NEW.role)
            ),
            '{is_team_leader}',
            to_jsonb(v_is_team_leader)
          ),
        updated_at = NOW()
    WHERE id = NEW.user_id;
    
    RETURN NEW;
  END IF;
END;
$$;

-- Criar ou substituir trigger para manter metadados consistentes
DROP TRIGGER IF EXISTS trigger_update_user_metadata_team_members ON team_members;

CREATE TRIGGER trigger_update_user_metadata_team_members
AFTER INSERT OR UPDATE OR DELETE ON team_members
FOR EACH ROW
EXECUTE FUNCTION update_user_metadata_on_team_change();

-- =============================================
-- EXECUTAR VERIFICAÇÃO GERAL DE INCONSISTÊNCIAS
-- =============================================

-- Verificar e corrigir inconsistências existentes durante a aplicação deste script
DO $$
BEGIN
  RAISE LOG 'Verificando e corrigindo inconsistências existentes...';
  PERFORM fix_team_metadata_inconsistencies();
  RAISE LOG 'Verificação e correção concluídas.';
END
$$;

-- Função para sincronizar nomes de equipes nos metadados dos usuários
CREATE OR REPLACE FUNCTION sync_team_names_in_metadata()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_record RECORD;
  team_record RECORD;
  current_metadata JSONB;
  updated_metadata JSONB;
  team_id UUID;
  fixes_count INTEGER := 0;
  fixed_users JSONB := '[]'::JSONB;
BEGIN
  -- Procurar usuários que têm equipes nos metadados
  FOR user_record IN 
    SELECT id, email, raw_user_meta_data
    FROM auth.users
    WHERE raw_user_meta_data ? 'team_id'
  LOOP
    current_metadata := user_record.raw_user_meta_data;
    team_id := (current_metadata->>'team_id')::UUID;
    
    -- Verificar se o ID da equipe é válido
    IF team_id IS NOT NULL THEN
      -- Obter nome atual da equipe
      SELECT name, team_code INTO team_record
      FROM teams
      WHERE id = team_id;
      
      -- Se encontrou a equipe e os dados não coincidem, atualizar
      IF team_record IS NOT NULL AND (
        current_metadata->>'team_name' IS DISTINCT FROM team_record.name OR
        current_metadata->>'team_code' IS DISTINCT FROM team_record.team_code
      ) THEN
        -- Atualizar metadados com o nome correto da equipe
        updated_metadata := jsonb_set(
          jsonb_set(
            current_metadata,
            '{team_name}',
            to_jsonb(team_record.name)
          ),
          '{team_code}',
          to_jsonb(team_record.team_code)
        );
        
        -- Atualizar metadados do usuário
        UPDATE auth.users
        SET raw_user_meta_data = updated_metadata,
            updated_at = NOW()
        WHERE id = user_record.id;
        
        -- Adicionar aos usuários atualizados
        fixed_users := fixed_users || jsonb_build_object(
          'id', user_record.id,
          'email', user_record.email,
          'team_id', team_id,
          'old_team_name', current_metadata->>'team_name',
          'new_team_name', team_record.name,
          'old_team_code', current_metadata->>'team_code',
          'new_team_code', team_record.team_code
        );
        
        fixes_count := fixes_count + 1;
      END IF;
    END IF;
  END LOOP;
  
  -- Retornar resultados da sincronização
  RETURN jsonb_build_object(
    'success', true,
    'fixes_count', fixes_count,
    'fixed_users', fixed_users,
    'timestamp', now()
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'fixed_count_before_error', fixes_count
    );
END;
$$;

-- Conceder permissões
GRANT EXECUTE ON FUNCTION sync_team_names_in_metadata TO service_role;

-- Executar sincronização de nomes
DO $$
BEGIN
  RAISE LOG 'Sincronizando nomes de equipes em metadados de usuários...';
  PERFORM sync_team_names_in_metadata();
  RAISE LOG 'Sincronização de nomes concluída.';
END
$$;

-- =============================================
-- EXECUTAR VERIFICAÇÃO GERAL DE INCONSISTÊNCIAS
-- =============================================

-- Verificar e corrigir inconsistências existentes durante a aplicação deste script
DO $$
BEGIN
  RAISE LOG 'Verificando e corrigindo inconsistências existentes...';
  PERFORM fix_team_metadata_inconsistencies();
  RAISE LOG 'Verificação e correção concluídas.';
END
$$; 