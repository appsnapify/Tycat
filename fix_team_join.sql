-- Verificar se o código da equipe existe na tabela teams
SELECT id, name, team_code, created_by 
FROM teams 
WHERE team_code = 'TEAM-AEB04';

-- Ver todos os códigos de equipe disponíveis
SELECT id, name, team_code, created_by 
FROM teams 
LIMIT 10;

-- Verificar a implementação atual da função
SELECT pg_get_functiondef('join_team_with_code(uuid, text)'::regprocedure);

-- Verificar se o usuário já está na equipe
SELECT * FROM team_members 
WHERE user_id = '7fab0974-5708-458a-940c-a517e765a2c5' 
LIMIT 10;

-- Verificar todas as equipes
SELECT * FROM teams LIMIT 10;

-- Corrigir a função join_team_with_code
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
  -- Debug logs
  RAISE LOG 'Iniciando função join_team_with_code para usuário % e código %', user_id_param, team_code_param;
  
  -- Verificar se o código da equipe existe
  SELECT id, name INTO team_id, team_name
  FROM teams
  WHERE team_code = team_code_param;
  
  RAISE LOG 'Resultado da busca: team_id = %, team_name = %', team_id, team_name;
  
  IF team_id IS NULL THEN
    RAISE LOG 'Código de equipe inválido: %', team_code_param;
    RAISE EXCEPTION 'Código de equipe inválido: %', team_code_param;
  END IF;
  
  -- Verificar se o usuário já pertence a essa equipe
  IF EXISTS (
    SELECT 1 FROM team_members 
    WHERE team_id = team_id AND user_id = user_id_param
  ) THEN
    RAISE LOG 'Usuário % já pertence à equipe %', user_id_param, team_id;
    RAISE EXCEPTION 'Usuário já pertence a esta equipe';
  END IF;
  
  -- Verificar papel atual do usuário
  SELECT raw_user_meta_data->>'role' INTO current_role
  FROM auth.users
  WHERE id = user_id_param;
  
  RAISE LOG 'Papel atual do usuário: %', current_role;
  
  -- Adicionar usuário como membro da equipe
  INSERT INTO team_members (team_id, user_id, role)
  VALUES (team_id, user_id_param, 'promoter');
  
  RAISE LOG 'Usuário adicionado como membro da equipe';
  
  -- Atualizar metadados do usuário
  UPDATE auth.users
  SET raw_user_meta_data = 
    COALESCE(raw_user_meta_data, '{}'::JSONB) || 
    jsonb_build_object(
      'role', 'promotor',
      'team_id', team_id,
      'team_code', team_code_param,
      'team_name', team_name,
      'team_role', 'promoter',
      'previous_role', COALESCE(current_role, 'desconhecido')
    )
  WHERE id = user_id_param;
  
  RAISE LOG 'Metadados do usuário atualizados';
  
  -- Construir resultado
  result := jsonb_build_object(
    'success', true,
    'team_id', team_id,
    'team_name', team_name,
    'team_code', team_code_param,
    'user_id', user_id_param,
    'role', 'promoter',
    'timestamp', now()
  );
  
  RAISE LOG 'Função concluída com sucesso: %', result;
  
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Erro na função join_team_with_code: % - %', SQLSTATE, SQLERRM;
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'errorcode', SQLSTATE
    );
END;
$$;

-- Conceder permissões
GRANT EXECUTE ON FUNCTION join_team_with_code(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION join_team_with_code(UUID, TEXT) TO service_role; 