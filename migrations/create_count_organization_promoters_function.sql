-- Função para contar promotores nas equipas de uma organização
-- Esta função é chamada pelo dashboard do organizador

CREATE OR REPLACE FUNCTION count_organization_promoters(org_id uuid)
RETURNS integer
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    promoter_count integer;
BEGIN
    -- Validar input
    IF org_id IS NULL THEN
        RETURN 0;
    END IF;
    
    -- Contar promotores que são membros de equipas da organização
    SELECT COUNT(DISTINCT tm.user_id)
    INTO promoter_count
    FROM teams t
    JOIN team_members tm ON t.id = tm.team_id
    JOIN profiles p ON tm.user_id = p.id
    WHERE t.organization_id = org_id
      AND p.role = 'promotor';
    
    RETURN COALESCE(promoter_count, 0);
    
EXCEPTION
    WHEN OTHERS THEN
        -- Log error e retornar 0 em caso de erro
        RETURN 0;
END;
$$;

-- Dar permissões para authenticated users
GRANT EXECUTE ON FUNCTION count_organization_promoters(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION count_organization_promoters(uuid) TO service_role;

-- Comentário da função
COMMENT ON FUNCTION count_organization_promoters(uuid) IS 
'Conta o número de promotores que são membros de equipas numa organização específica';
