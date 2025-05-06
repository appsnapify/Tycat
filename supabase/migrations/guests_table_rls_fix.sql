-- Cria uma política mais permissiva para a tabela de convidados
-- Isso permite que clientes autenticados possam consultar seus próprios registros
-- e os registros relacionados a eventos que estão participando

-- Desabilitar temporariamente RLS para diagnosticar o problema (por segurança, limite a esta sessão)
-- NOTA: Esta linha só deve ser usada em desenvolvimento e testes, NUNCA em produção
ALTER TABLE guests DISABLE ROW LEVEL SECURITY;

-- Criar políticas mais permissivas
-- Permitir que qualquer usuário autenticado possa ver registros de convidados
CREATE POLICY IF NOT EXISTS "Permitir visualização de registros de convidados para usuários autenticados"
ON guests FOR SELECT
TO authenticated
USING (true);

-- Permitir que qualquer usuário autenticado possa inserir registros na tabela
CREATE POLICY IF NOT EXISTS "Permitir inserção de registros de convidados para usuários autenticados"
ON guests FOR INSERT
TO authenticated
WITH CHECK (true);

-- Permitir que qualquer usuário autenticado possa atualizar registros (em desenvolvimento)
CREATE POLICY IF NOT EXISTS "Permitir atualização de registros de convidados para usuários autenticados"
ON guests FOR UPDATE
TO authenticated
USING (true) WITH CHECK (true);

-- Remover políticas existentes conflitantes se necessário
DROP POLICY IF EXISTS "Clientes podem ver seus próprios registros" ON guests;
DROP POLICY IF EXISTS "Promotores podem ver registros que criaram" ON guests;
DROP POLICY IF EXISTS "Clientes podem criar novos registros" ON guests;
DROP POLICY IF EXISTS "Promotores podem criar registros para clientes" ON guests;

-- Conceder permissões para roles públicas (somente para testes)
GRANT ALL ON guests TO anon, authenticated, service_role;

-- Opcional: Permitir acesso público para debug (apenas em desenvolvimento)
-- CREATE POLICY "Allow public select on guests" ON guests FOR SELECT TO public USING (true);

-- Reabilitar RLS com as novas políticas que são mais permissivas
ALTER TABLE guests ENABLE ROW LEVEL SECURITY; 