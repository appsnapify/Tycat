-- ============================================================================
-- FUNÇÕES SECURITY DEFINER PARA SUBSTITUIR SERVICE_ROLE_KEY
-- Data: $(date)
-- Objetivo: Implementar segurança adequada com RLS e autenticação
-- ============================================================================

-- 1. FUNÇÃO PARA CONTAGEM SEGURA DE GUESTS
-- ============================================================================
CREATE OR REPLACE FUNCTION get_event_guest_count_secure(p_event_id UUID)
RETURNS TABLE (
  count INTEGER,
  checked_in INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_user_id UUID;
BEGIN
  -- Obter usuário autenticado
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;
  
  -- Verificar se o evento existe e obter organização
  SELECT e.organization_id INTO v_org_id
  FROM events e
  WHERE e.id = p_event_id;
  
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Evento não encontrado';
  END IF;
  
  -- Verificar se o usuário tem acesso ao evento
  -- Pode ser organizador, membro de equipe associada, ou scanner
  IF NOT EXISTS (
    -- Organizador direto
    SELECT 1 FROM user_organizations uo 
    WHERE uo.user_id = v_user_id 
    AND uo.organization_id = v_org_id
    AND uo.role IN ('owner', 'organizador')
    
    UNION
    
    -- Membro de equipe associada à organização
    SELECT 1 FROM team_members tm
    JOIN organization_teams ot ON tm.team_id = ot.team_id
    WHERE tm.user_id = v_user_id 
    AND ot.organization_id = v_org_id
    AND ot.is_active = true
    
    UNION
    
    -- Scanner ativo para o evento
    SELECT 1 FROM event_scanners es
    WHERE es.user_id = v_user_id 
    AND es.event_id = p_event_id
    AND es.is_active = true
  ) THEN
    RAISE EXCEPTION 'Acesso negado ao evento';
  END IF;
  
  -- Retornar contagens
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*)::INTEGER FROM guests WHERE event_id = p_event_id) as count,
    (SELECT COUNT(*)::INTEGER FROM guests WHERE event_id = p_event_id AND checked_in = true) as checked_in;
END;
$$;

-- Conceder permissões
GRANT EXECUTE ON FUNCTION get_event_guest_count_secure TO authenticated;

-- ============================================================================
-- 2. FUNÇÃO PARA CONTAGEM MÚLTIPLA DE GUESTS
-- ============================================================================
CREATE OR REPLACE FUNCTION get_multiple_events_guest_count_secure(p_event_ids UUID[])
RETURNS TABLE (
  event_id UUID,
  count INTEGER,
  checked_in INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_event_id UUID;
  v_org_id UUID;
BEGIN
  -- Obter usuário autenticado
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;
  
  -- Verificar acesso para cada evento
  FOREACH v_event_id IN ARRAY p_event_ids
  LOOP
    -- Verificar se o evento existe e obter organização
    SELECT e.organization_id INTO v_org_id
    FROM events e
    WHERE e.id = v_event_id;
    
    -- Se evento não existe, pular
    IF v_org_id IS NULL THEN
      CONTINUE;
    END IF;
    
    -- Verificar se o usuário tem acesso
    IF EXISTS (
      -- Organizador direto
      SELECT 1 FROM user_organizations uo 
      WHERE uo.user_id = v_user_id 
      AND uo.organization_id = v_org_id
      AND uo.role IN ('owner', 'organizador')
      
      UNION
      
      -- Membro de equipe associada à organização
      SELECT 1 FROM team_members tm
      JOIN organization_teams ot ON tm.team_id = ot.team_id
      WHERE tm.user_id = v_user_id 
      AND ot.organization_id = v_org_id
      AND ot.is_active = true
      
      UNION
      
      -- Scanner ativo para o evento
      SELECT 1 FROM event_scanners es
      WHERE es.user_id = v_user_id 
      AND es.event_id = v_event_id
      AND es.is_active = true
    ) THEN
      -- Retornar contagens para este evento
      RETURN QUERY
      SELECT 
        v_event_id as event_id,
        (SELECT COUNT(*)::INTEGER FROM guests WHERE event_id = v_event_id) as count,
        (SELECT COUNT(*)::INTEGER FROM guests WHERE event_id = v_event_id AND checked_in = true) as checked_in;
    END IF;
  END LOOP;
END;
$$;

-- Conceder permissões
GRANT EXECUTE ON FUNCTION get_multiple_events_guest_count_secure TO authenticated;

-- ============================================================================
-- 3. FUNÇÃO PARA ASSOCIAR EQUIPE À ORGANIZAÇÃO
-- ============================================================================
CREATE OR REPLACE FUNCTION associate_team_to_organization_secure(
  p_team_code TEXT,
  p_organization_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_team_id UUID;
  v_team_name TEXT;
  v_result JSONB;
BEGIN
  -- Obter usuário autenticado
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;
  
  -- Verificar se o usuário é organizador
  IF NOT EXISTS (
    SELECT 1 FROM user_organizations uo 
    WHERE uo.user_id = v_user_id 
    AND uo.organization_id = p_organization_id
    AND uo.role IN ('owner', 'organizador')
  ) THEN
    RAISE EXCEPTION 'Acesso negado - apenas organizadores podem associar equipas';
  END IF;
  
  -- Buscar equipa pelo código
  SELECT id, name INTO v_team_id, v_team_name
  FROM teams
  WHERE team_code = p_team_code
  AND is_active = true;
  
  IF v_team_id IS NULL THEN
    RAISE EXCEPTION 'Equipa não encontrada ou inativa com o código fornecido';
  END IF;
  
  -- Verificar se já está associada
  IF EXISTS (
    SELECT 1 FROM organization_teams 
    WHERE organization_id = p_organization_id 
    AND team_id = v_team_id
  ) THEN
    RAISE EXCEPTION 'Equipa já está associada a esta organização';
  END IF;
  
  -- Associar equipa à organização
  INSERT INTO organization_teams (
    organization_id,
    team_id,
    commission_type,
    commission_rate,
    is_active,
    created_at,
    updated_at
  ) VALUES (
    p_organization_id,
    v_team_id,
    'percentage',
    10.0,
    true,
    NOW(),
    NOW()
  );
  
  -- Registrar atividade
  INSERT INTO activity_logs (
    user_id,
    organization_id,
    action_type,
    description,
    metadata,
    created_at
  ) VALUES (
    v_user_id,
    p_organization_id,
    'team_associated',
    'Equipa associada à organização',
    jsonb_build_object(
      'team_id', v_team_id,
      'team_name', v_team_name,
      'team_code', p_team_code
    ),
    NOW()
  );
  
  -- Retornar resultado
  v_result := jsonb_build_object(
    'success', true,
    'team_id', v_team_id,
    'team_name', v_team_name,
    'message', 'Equipa associada com sucesso'
  );
  
  RETURN v_result;
END;
$$;

-- Conceder permissões
GRANT EXECUTE ON FUNCTION associate_team_to_organization_secure TO authenticated;

-- ============================================================================
-- 4. FUNÇÃO PARA CRIAR EQUIPE SEGURA
-- ============================================================================
CREATE OR REPLACE FUNCTION create_team_secure(
  p_team_name TEXT,
  p_team_description TEXT DEFAULT NULL,
  p_organization_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_team_id UUID;
  v_team_code TEXT;
  v_result JSONB;
  v_counter INTEGER := 0;
BEGIN
  -- Obter usuário autenticado
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;
  
  -- Validar nome da equipe
  IF p_team_name IS NULL OR LENGTH(TRIM(p_team_name)) = 0 THEN
    RAISE EXCEPTION 'Nome da equipa é obrigatório';
  END IF;
  
  -- Se organização fornecida, verificar permissões
  IF p_organization_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM user_organizations uo 
      WHERE uo.user_id = v_user_id 
      AND uo.organization_id = p_organization_id
      AND uo.role IN ('owner', 'organizador')
    ) THEN
      RAISE EXCEPTION 'Acesso negado - sem permissão na organização';
    END IF;
  END IF;
  
  -- Gerar código único (tentar até 10 vezes)
  LOOP
    v_team_code := 'TEAM-' || UPPER(SUBSTRING(MD5(v_user_id::text || now()::text || RANDOM()::text) FOR 8));
    
    -- Verificar se o código já existe
    IF NOT EXISTS (SELECT 1 FROM teams WHERE team_code = v_team_code) THEN
      EXIT; -- Código único encontrado
    END IF;
    
    v_counter := v_counter + 1;
    IF v_counter >= 10 THEN
      RAISE EXCEPTION 'Erro ao gerar código único para a equipa';
    END IF;
  END LOOP;
  
  -- Criar equipa
  INSERT INTO teams (
    name,
    description,
    team_code,
    created_by,
    is_active,
    created_at,
    updated_at
  ) VALUES (
    TRIM(p_team_name),
    TRIM(p_team_description),
    v_team_code,
    v_user_id,
    true,
    NOW(),
    NOW()
  ) RETURNING id INTO v_team_id;
  
  -- Adicionar criador como líder
  INSERT INTO team_members (
    team_id,
    user_id,
    role,
    joined_at
  ) VALUES (
    v_team_id,
    v_user_id,
    'leader',
    NOW()
  );
  
  -- Se organização fornecida, associar automaticamente
  IF p_organization_id IS NOT NULL THEN
    INSERT INTO organization_teams (
      organization_id,
      team_id,
      commission_type,
      commission_rate,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      p_organization_id,
      v_team_id,
      'percentage',
      10.0,
      true,
      NOW(),
      NOW()
    );
    
    -- Registrar atividade
    INSERT INTO activity_logs (
      user_id,
      organization_id,
      action_type,
      description,
      metadata,
      created_at
    ) VALUES (
      v_user_id,
      p_organization_id,
      'team_created_and_associated',
      'Equipa criada e associada à organização',
      jsonb_build_object(
        'team_id', v_team_id,
        'team_name', p_team_name,
        'team_code', v_team_code
      ),
      NOW()
    );
  ELSE
    -- Registrar atividade sem organização
    INSERT INTO activity_logs (
      user_id,
      action_type,
      description,
      metadata,
      created_at
    ) VALUES (
      v_user_id,
      'team_created',
      'Equipa criada',
      jsonb_build_object(
        'team_id', v_team_id,
        'team_name', p_team_name,
        'team_code', v_team_code
      ),
      NOW()
    );
  END IF;
  
  -- Retornar resultado
  v_result := jsonb_build_object(
    'success', true,
    'team_id', v_team_id,
    'team_code', v_team_code,
    'team_name', p_team_name,
    'message', 'Equipa criada com sucesso'
  );
  
  RETURN v_result;
END;
$$;

-- Conceder permissões
GRANT EXECUTE ON FUNCTION create_team_secure TO authenticated;

-- ============================================================================
-- 5. FUNÇÃO PARA LISTAR EQUIPAS DISPONÍVEIS
-- ============================================================================
CREATE OR REPLACE FUNCTION get_available_teams_secure(p_organization_id UUID)
RETURNS TABLE (
  team_id UUID,
  team_name TEXT,
  team_code TEXT,
  team_description TEXT,
  created_by UUID,
  member_count INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Obter usuário autenticado
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;
  
  -- Verificar se o usuário tem acesso à organização
  IF NOT EXISTS (
    SELECT 1 FROM user_organizations uo 
    WHERE uo.user_id = v_user_id 
    AND uo.organization_id = p_organization_id
    AND uo.role IN ('owner', 'organizador')
  ) THEN
    RAISE EXCEPTION 'Acesso negado à organização';
  END IF;
  
  -- Retornar equipas disponíveis (não associadas à organização)
  RETURN QUERY
  SELECT 
    t.id as team_id,
    t.name as team_name,
    t.team_code,
    COALESCE(t.description, '') as team_description,
    t.created_by,
    (SELECT COUNT(*)::INTEGER FROM team_members tm WHERE tm.team_id = t.id) as member_count
  FROM teams t
  WHERE t.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM organization_teams ot 
    WHERE ot.team_id = t.id 
    AND ot.organization_id = p_organization_id
  )
  ORDER BY t.created_at DESC;
END;
$$;

-- Conceder permissões
GRANT EXECUTE ON FUNCTION get_available_teams_secure TO authenticated;

-- ============================================================================
-- COMENTÁRIOS E LOGS
-- ============================================================================

-- Log da criação
INSERT INTO migration_log (
  migration_name,
  description,
  applied_at
) VALUES (
  'security_functions_v1',
  'Criação de funções SECURITY DEFINER para substituir SERVICE_ROLE_KEY',
  NOW()
) ON CONFLICT (migration_name) DO NOTHING;

-- Comentários finais
COMMENT ON FUNCTION get_event_guest_count_secure IS 'Função segura para contagem de guests com verificação de permissões';
COMMENT ON FUNCTION get_multiple_events_guest_count_secure IS 'Função segura para contagem múltipla de guests';
COMMENT ON FUNCTION associate_team_to_organization_secure IS 'Função segura para associar equipe à organização';
COMMENT ON FUNCTION create_team_secure IS 'Função segura para criar equipas';
COMMENT ON FUNCTION get_available_teams_secure IS 'Função segura para listar equipas disponíveis';