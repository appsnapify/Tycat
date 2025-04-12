-- Função RPC para buscar equipes de uma organização com contagem de membros
CREATE OR REPLACE FUNCTION public.get_organization_teams_with_counts(
  org_id UUID
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  team_code TEXT,
  member_count BIGINT -- Usar BIGINT para contagem
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.name,
    t.team_code,
    -- Subquery para contar membros. Executa com permissões do definidor (SECURITY DEFINER)
    (SELECT count(*) FROM public.team_members tm WHERE tm.team_id = t.id)::BIGINT AS member_count
  FROM
    public.teams t
  WHERE
    t.id IN (
      -- Seleciona apenas IDs de equipes vinculadas à organização especificada
      SELECT ot.team_id FROM public.organization_teams ot WHERE ot.organization_id = org_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Conceder permissão de execução para usuários autenticados
GRANT EXECUTE ON FUNCTION public.get_organization_teams_with_counts(UUID) TO authenticated;

-- Comentário da função
COMMENT ON FUNCTION public.get_organization_teams_with_counts(UUID) IS 
'Retorna todas as equipes vinculadas a uma organização (pelo org_id) incluindo a contagem de membros de cada equipe. Usa SECURITY DEFINER para contar membros corretamente, ignorando RLS do chamador.'; 