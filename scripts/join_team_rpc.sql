-- Função para aderir a uma equipe usando o código
CREATE OR REPLACE FUNCTION public.join_team_with_code(
  user_id_param UUID,
  team_code_param TEXT
)
RETURNS JSON AS $$
DECLARE
  v_team_id UUID;
  v_team_name TEXT;
  v_result JSON;
BEGIN
  -- Verificar se o código da equipe existe
  SELECT id, name INTO v_team_id, v_team_name
  FROM public.teams
  WHERE team_code = team_code_param;
  
  IF v_team_id IS NULL THEN
    RAISE EXCEPTION 'Equipe não encontrada com o código fornecido';
  END IF;
  
  -- Verificar se o usuário já é membro da equipe
  IF EXISTS (
    SELECT 1 FROM public.team_members
    WHERE user_id = user_id_param AND team_id = v_team_id
  ) THEN
    RAISE EXCEPTION 'Usuário já é membro desta equipe';
  END IF;
  
  -- Registrar o usuário como membro da equipe
  INSERT INTO public.team_members (
    user_id,
    team_id,
    role,
    joined_at,
    is_active
  ) VALUES (
    user_id_param,
    v_team_id,
    'member',
    NOW(),
    TRUE
  );
  
  -- Atualizar o perfil do usuário para refletir a associação à equipe
  UPDATE public.profiles
  SET 
    role = 'promotor',
    team_id = v_team_id,
    updated_at = NOW()
  WHERE id = user_id_param;
  
  -- Preparar resultado
  v_result := json_build_object(
    'success', TRUE,
    'team_id', v_team_id,
    'team_name', v_team_name,
    'message', 'Adesão à equipe realizada com sucesso'
  );
  
  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', FALSE,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Conceder permissões para executar a função
GRANT EXECUTE ON FUNCTION public.join_team_with_code TO authenticated;

-- Adicionar comentário à função
COMMENT ON FUNCTION public.join_team_with_code IS 
'Permite que um usuário ingressse em uma equipe usando o código da equipe. Requer o ID do usuário e o código da equipe.'; 