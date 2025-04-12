-- Função para criar uma equipe e vinculá-la a uma organização em uma única transação
CREATE OR REPLACE FUNCTION public.create_team_with_organization(
  p_team_id UUID,
  p_team_name TEXT,
  p_team_code TEXT,
  p_organization_id UUID
) RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  -- Iniciar transação
  BEGIN
    -- Inserir na tabela teams
    INSERT INTO public.teams (
      id, 
      name, 
      team_code, 
      created_at, 
      updated_at
    ) VALUES (
      p_team_id,
      p_team_name,
      p_team_code,
      NOW(),
      NOW()
    );
    
    -- Vincular à organização
    INSERT INTO public.organization_teams (
      organization_id,
      team_id,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      p_organization_id,
      p_team_id,
      TRUE,
      NOW(),
      NOW()
    );
    
    -- Transação concluída com sucesso
    v_result := json_build_object(
      'success', TRUE,
      'team_id', p_team_id,
      'team_code', p_team_code
    );
    
    RETURN v_result;
  EXCEPTION
    WHEN OTHERS THEN
      -- Em caso de erro, retornar informações sobre o erro
      v_result := json_build_object(
        'success', FALSE,
        'error_code', SQLSTATE,
        'error_message', SQLERRM
      );
      
      RETURN v_result;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Conceder permissão para executar a função a usuários autenticados
GRANT EXECUTE ON FUNCTION public.create_team_with_organization TO authenticated;

-- Comentário da função
COMMENT ON FUNCTION public.create_team_with_organization IS 
'Cria uma equipe e a vincula a uma organização em uma única transação com SECURITY DEFINER para evitar problemas de RLS.'; 