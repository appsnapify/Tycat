-- Primeiro, remover a função existente
DROP FUNCTION IF EXISTS public.join_team_with_code(UUID, TEXT);

-- Agora, criar a nova versão da função
CREATE OR REPLACE FUNCTION public.join_team_with_code(
  user_id_param UUID,
  team_code_param TEXT
)
RETURNS JSON AS $$
DECLARE
  v_team_id UUID;
  v_team_name TEXT;
  v_result JSON;
  v_current_metadata JSONB;
BEGIN
  -- Log inicial
  RAISE NOTICE 'Iniciando join_team_with_code para usuário % e código %', user_id_param, team_code_param;

  -- Verificar se o código da equipe existe
  SELECT id, name INTO v_team_id, v_team_name
  FROM public.teams
  WHERE team_code = team_code_param;
  
  -- Log após busca da equipe
  RAISE NOTICE 'Resultado da busca da equipe: ID %, Nome %', v_team_id, v_team_name;
  
  IF v_team_id IS NULL THEN
    RAISE EXCEPTION 'Equipe não encontrada com o código fornecido --> %', team_code_param;
  END IF;
  
  -- Verificar se o usuário já é membro da equipe
  IF EXISTS (
    SELECT 1 FROM public.team_members
    WHERE user_id = user_id_param AND team_id = v_team_id
  ) THEN
    RAISE EXCEPTION 'Usuário já é membro desta equipe --> %', v_team_name;
  END IF;
  
  -- Registrar o usuário como membro da equipe
  INSERT INTO public.team_members (
    team_id,
    user_id,
    role,
    joined_at
  ) VALUES (
    v_team_id,
    user_id_param,
    'member',
    NOW()
  );

  -- Log após inserção do membro
  RAISE NOTICE 'Membro inserido com sucesso na equipe';

  -- Atualizar os metadados do usuário
  UPDATE auth.users
  SET raw_user_meta_data = 
    COALESCE(raw_user_meta_data, '{}'::jsonb) || 
    jsonb_build_object(
      'role', 'promotor',
      'team_id', v_team_id,
      'team_name', v_team_name
    )
  WHERE id = user_id_param;

  -- Log após atualização dos metadados
  RAISE NOTICE 'Metadados do usuário atualizados';

  -- Preparar o resultado
  v_result := json_build_object(
    'success', true,
    'team_id', v_team_id,
    'team_name', v_team_name,
    'message', 'Usuário adicionado à equipe com sucesso'
  );

  -- Log final
  RAISE NOTICE 'Operação concluída com sucesso';
  
  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    -- Log de erro
    RAISE NOTICE 'Erro na função: %', SQLERRM;
    
    v_result := json_build_object(
      'success', false,
      'error', SQLERRM,
      'message', 'Erro ao adicionar usuário à equipe'
    );
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remover permissões antigas se existirem
REVOKE ALL ON FUNCTION public.join_team_with_code FROM PUBLIC;
REVOKE ALL ON FUNCTION public.join_team_with_code FROM authenticated;
REVOKE ALL ON FUNCTION public.join_team_with_code FROM anon;

-- Conceder permissões específicas
GRANT EXECUTE ON FUNCTION public.join_team_with_code TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_team_with_code TO service_role;

-- Adicionar comentário à função
COMMENT ON FUNCTION public.join_team_with_code IS 
'Permite que um usuário ingresse em uma equipe usando o código da equipe. Requer o ID do usuário e o código da equipe.';

-- Garantir que as tabelas necessárias têm as políticas corretas
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Política para permitir inserção de membros
DROP POLICY IF EXISTS "Allow team member insertion" ON public.team_members;
CREATE POLICY "Allow team member insertion"
ON public.team_members
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Política para permitir leitura de membros
DROP POLICY IF EXISTS "Allow team member reading" ON public.team_members;
CREATE POLICY "Allow team member reading"
ON public.team_members
FOR SELECT
TO authenticated
USING (true); 