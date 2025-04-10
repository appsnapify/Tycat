-- Script completo para criar o banco de dados do zero
-- Inclui todas as tabelas, funções, políticas, etc.

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "storage" SCHEMA "extensions";

-- Configuração das tabelas principais
-------------------------------------------------

-- Tabela profiles
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT,
  role TEXT NOT NULL CHECK (role IN ('organizador', 'promotor', 'team-leader')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela organizations
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  email TEXT,
  address TEXT,
  location TEXT DEFAULT '',
  contacts TEXT[] DEFAULT '{}',
  social_media JSONB DEFAULT '{}',
  logotipo TEXT,
  banner_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela user_organizations (relação N:N)
CREATE TABLE IF NOT EXISTS user_organizations (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, organization_id)
);

-- Função para gerar slug automaticamente
CREATE OR REPLACE FUNCTION generate_organization_slug()
RETURNS TRIGGER AS $$
BEGIN
  NEW.slug := LOWER(REGEXP_REPLACE(NEW.name, '[^a-zA-Z0-9]+', '-', 'g'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para gerar slug automaticamente
DROP TRIGGER IF EXISTS set_organization_slug ON organizations;
CREATE TRIGGER set_organization_slug
  BEFORE INSERT ON organizations
  FOR EACH ROW
  WHEN (NEW.slug IS NULL)
  EXECUTE FUNCTION generate_organization_slug();

-- Configuração do Storage
-------------------------------------------------

-- Garantir que as tabelas do storage existem
CREATE TABLE IF NOT EXISTS storage.buckets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  owner UUID REFERENCES auth.users,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  public BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS storage.objects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bucket_id TEXT NOT NULL REFERENCES storage.buckets(id),
  name TEXT NOT NULL,
  owner UUID REFERENCES auth.users,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::JSONB,
  path_tokens TEXT[] GENERATED ALWAYS AS (string_to_array(name, '/')) STORED
);

-- Habilitar RLS nas tabelas
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Criar bucket para logos e banners de organizações
INSERT INTO storage.buckets (id, name, public)
VALUES ('organization_logos', 'organization_logos', TRUE)
ON CONFLICT (id) DO UPDATE
SET public = TRUE, updated_at = NOW();

-- Configuração das políticas de acesso (RLS)
-------------------------------------------------

-- Remover políticas existentes
DROP POLICY IF EXISTS "Qualquer pessoa pode ler perfis" ON profiles;
DROP POLICY IF EXISTS "Usuários autenticados podem criar perfis" ON profiles;
DROP POLICY IF EXISTS "Usuários podem atualizar seus próprios perfis" ON profiles;

DROP POLICY IF EXISTS "Permitir leitura de organizações" ON organizations;
DROP POLICY IF EXISTS "Permitir criação de organizações" ON organizations;
DROP POLICY IF EXISTS "Permitir atualização de próprias organizações" ON organizations;

DROP POLICY IF EXISTS "Permitir leitura de relações" ON user_organizations;
DROP POLICY IF EXISTS "Permitir criação de relações" ON user_organizations;

-- Políticas de storage
DROP POLICY IF EXISTS "Permitir acesso de leitura" ON storage.objects;
DROP POLICY IF EXISTS "Permitir acesso de inserção" ON storage.objects;
DROP POLICY IF EXISTS "Permitir acesso de atualização" ON storage.objects;
DROP POLICY IF EXISTS "Permitir deleção sem restrições" ON storage.objects;
DROP POLICY IF EXISTS "Buckets públicos para leitura" ON storage.buckets;

-- Criar políticas para profiles
CREATE POLICY "Qualquer pessoa pode ler perfis" 
  ON profiles FOR SELECT USING (TRUE);

CREATE POLICY "Usuários autenticados podem criar perfis" 
  ON profiles FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'anon');

CREATE POLICY "Usuários podem atualizar seus próprios perfis" 
  ON profiles FOR UPDATE 
  USING (auth.uid() = id);

-- Criar políticas para organizations
CREATE POLICY "Permitir leitura de organizações" 
  ON organizations FOR SELECT USING (TRUE);

CREATE POLICY "Permitir criação de organizações" 
  ON organizations FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'anon');

CREATE POLICY "Permitir atualização de próprias organizações" 
  ON organizations FOR UPDATE 
  USING (EXISTS (
    SELECT 1 FROM user_organizations 
    WHERE user_id = auth.uid() 
    AND organization_id = id
    AND role IN ('owner', 'admin')
  ));

-- Criar políticas para user_organizations
CREATE POLICY "Permitir leitura de relações" 
  ON user_organizations FOR SELECT USING (TRUE);

CREATE POLICY "Permitir criação de relações" 
  ON user_organizations FOR INSERT 
  WITH CHECK (
    auth.role() = 'authenticated' OR 
    auth.role() = 'anon' OR
    user_id = auth.uid()
  );

-- Criar políticas para storage
CREATE POLICY "Permitir acesso de leitura" 
  ON storage.objects FOR SELECT
  USING (bucket_id = 'organization_logos');

CREATE POLICY "Permitir acesso de inserção" 
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'organization_logos');

CREATE POLICY "Permitir acesso de atualização" 
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'organization_logos');

CREATE POLICY "Permitir deleção sem restrições" 
  ON storage.objects FOR DELETE
  USING (bucket_id = 'organization_logos');

CREATE POLICY "Buckets públicos para leitura" 
  ON storage.buckets FOR SELECT
  USING (TRUE);

-- Funções auxiliares
-------------------------------------------------

-- Função para criar perfil automaticamente após registro
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', 'Usuário'),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'organizador')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para criar perfil automaticamente
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Função para inserir relações usuário-organização ignorando restrições
CREATE OR REPLACE FUNCTION insert_user_organization(
  p_user_id UUID,
  p_organization_id UUID,
  p_role TEXT
) RETURNS VOID AS $$
BEGIN
  INSERT INTO public.user_organizations (
    user_id,
    organization_id,
    role,
    created_at
  ) VALUES (
    p_user_id,
    p_organization_id,
    p_role,
    NOW()
  );
  
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Erro ao inserir relação usuário-organização: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Conceder permissões para execução das funções
GRANT EXECUTE ON FUNCTION insert_user_organization TO authenticated;
GRANT EXECUTE ON FUNCTION insert_user_organization TO anon;
GRANT EXECUTE ON FUNCTION insert_user_organization TO service_role;

-- Criar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_user_organizations_user_id ON user_organizations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_organizations_org_id ON user_organizations(organization_id);
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- Migrar perfis existentes que possam não ter sido criados
INSERT INTO profiles (id, first_name, last_name, role, created_at, updated_at)
SELECT 
  au.id, 
  COALESCE(au.raw_user_meta_data->>'first_name', 'Usuário') as first_name,
  COALESCE(au.raw_user_meta_data->>'last_name', '') as last_name,
  COALESCE(au.raw_user_meta_data->>'role', 'organizador') as role,
  au.created_at,
  au.created_at
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE p.id IS NULL;

-- Criar políticas para team_members (se existirem)

-- Remover políticas potencialmente problemáticas
DROP POLICY IF EXISTS "Membros visíveis para membros da mesma equipe" ON team_members;

-- Políticas simplificadas para team_members
CREATE POLICY "Todos podem visualizar membros de equipe" 
ON team_members FOR SELECT 
USING (true);

CREATE POLICY "Usuário pode visualizar suas próprias associações" 
ON team_members FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Criadores de equipe podem gerenciar membros" 
ON team_members FOR ALL 
USING (
  team_id IN (
    SELECT id FROM teams WHERE created_by = auth.uid()
  )
); 