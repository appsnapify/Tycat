-- Política RLS para permitir que membros da organização (owner/admin) leiam os vínculos organization_teams
-- Substitui ou complementa políticas existentes para SELECT

-- 1. (Opcional mas recomendado) Remover políticas SELECT existentes se não forem mais necessárias ou conflitantes
-- CUIDADO: Verifique se a política "Team leaders can view org links" ainda é necessária para outra funcionalidade.
-- Se for, mantenha-a e apenas adicione a nova. Se não, remova-a.
-- DROP POLICY IF EXISTS "Team leaders can view org links" ON public.organization_teams;

-- 2. Criar a nova política para permitir que owners/admins leiam vínculos da sua organização
CREATE POLICY "Allow org owners/admins to read own organization_teams" 
ON public.organization_teams
FOR SELECT
USING (
  -- Verifica se o ID do usuário autenticado existe na tabela user_organizations
  -- para a organization_id da linha atual, e se o papel é owner ou admin.
  EXISTS (
    SELECT 1
    FROM public.user_organizations uo
    WHERE uo.organization_id = organization_teams.organization_id -- Compara com a coluna da tabela organization_teams
      AND uo.user_id = auth.uid()
      AND uo.role IN ('owner', 'admin')
  )
);

-- Nota: Se a política "Team leaders can view org links" ainda for necessária,
-- certifique-se de que ambas as políticas SELECT estejam ativas. O usuário
-- só precisa satisfazer UMA das políticas SELECT para ter acesso de leitura. 