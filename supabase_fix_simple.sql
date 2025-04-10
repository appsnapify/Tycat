/*
SCRIPT DE CORREÇÃO DAS POLÍTICAS RLS DAS TABELAS TEAMS E TEAM_MEMBERS
Este script remove políticas redundantes e conflitantes e cria um conjunto simplificado de políticas.
*/

-- Remover todas as políticas existentes
DROP POLICY IF EXISTS "Teams are viewable by all authenticated users" ON teams;
DROP POLICY IF EXISTS "Teams are viewable by authenticated users" ON teams;
DROP POLICY IF EXISTS "Teams can be created by authenticated users" ON teams;
DROP POLICY IF EXISTS "Teams can be inserted by authenticated users" ON teams;
DROP POLICY IF EXISTS "Teams can be updated by team creator" ON teams;
DROP POLICY IF EXISTS "Teams can be updated by team leader" ON teams;
DROP POLICY IF EXISTS "Teams can be deleted by team creator" ON teams;
DROP POLICY IF EXISTS "Teams can be deleted by team leader" ON teams;
DROP POLICY IF EXISTS "access_teams" ON teams;

DROP POLICY IF EXISTS "Team members are viewable by all authenticated users" ON team_members;
DROP POLICY IF EXISTS "Team members are viewable by authenticated users" ON team_members;
DROP POLICY IF EXISTS "Team members can be added by anyone" ON team_members;
DROP POLICY IF EXISTS "Team members can be inserted by any authenticated user" ON team_members;
DROP POLICY IF EXISTS "Team members can be updated by team leader" ON team_members;
DROP POLICY IF EXISTS "Team members can be deleted by team leader or self" ON team_members;
DROP POLICY IF EXISTS "team_members_access_all" ON team_members;

-- Criar políticas simplificadas para a tabela teams
CREATE POLICY "teams_select_for_authenticated" 
ON teams 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "teams_insert_for_authenticated" 
ON teams 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "teams_update_for_creator" 
ON teams 
FOR UPDATE 
TO authenticated 
USING (auth.uid() = created_by) 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "teams_delete_for_creator" 
ON teams 
FOR DELETE 
TO authenticated 
USING (auth.uid() = created_by);

-- Criar políticas simplificadas para a tabela team_members
CREATE POLICY "team_members_select_for_authenticated" 
ON team_members 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "team_members_insert_for_authenticated" 
ON team_members 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "team_members_update_for_owner" 
ON team_members 
FOR UPDATE 
TO authenticated 
USING (
  auth.uid() IN (
    SELECT created_by FROM teams WHERE id = team_members.team_id
  )
);

CREATE POLICY "team_members_delete_for_owner_or_self" 
ON team_members 
FOR DELETE 
TO authenticated 
USING (
  user_id = auth.uid() OR
  auth.uid() IN (
    SELECT created_by FROM teams WHERE id = team_members.team_id
  )
); 