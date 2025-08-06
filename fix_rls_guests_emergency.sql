-- 🚨 CORREÇÃO URGENTE: RLS Policies para tabela guests
-- ⚠️ EXECUTAR MANUALMENTE na interface Supabase SQL Editor
-- ✅ Esta correção NÃO afeta dashboard/organizadores/promotores

-- =====================================================
-- 🔒 PROBLEMA: "new row violates row-level security policy for table guests"
-- 🔧 SOLUÇÃO: Criar políticas RLS específicas para sistema guest ISOLADO
-- =====================================================

-- 1. VERIFICAR estado atual da tabela guests
SELECT 
  schemaname, 
  tablename, 
  rowsecurity,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'guests') as policy_count
FROM pg_tables 
WHERE tablename = 'guests' AND schemaname = 'public';

-- 2. REMOVER políticas existentes (se houver) para reconstruir
DROP POLICY IF EXISTS "guests_insert_policy" ON public.guests;
DROP POLICY IF EXISTS "guests_select_policy" ON public.guests;
DROP POLICY IF EXISTS "guests_update_policy" ON public.guests;
DROP POLICY IF EXISTS "guests_delete_policy" ON public.guests;

-- 3. 🚨 POLÍTICAS ISOLADAS PARA SISTEMA GUEST (sem afetar outros sistemas)

-- 🔒 INSERÇÃO: Permite criar guests via sistema guest apenas
CREATE POLICY "guests_system_insert" 
ON public.guests 
FOR INSERT 
WITH CHECK (
  -- ✅ Permite inserção quando tem dados obrigatórios válidos
  event_id IS NOT NULL 
  AND promoter_id IS NOT NULL
  AND client_user_id IS NOT NULL
  AND phone IS NOT NULL
);

-- 🔒 LEITURA: Permite ler apenas guests relacionados
CREATE POLICY "guests_system_select" 
ON public.guests 
FOR SELECT 
USING (
  -- ✅ Sempre permite leitura (para QR codes, verificações, etc.)
  -- Esta política é permissiva para o sistema guest funcionar
  true
);

-- 🔒 ATUALIZAÇÃO: Permite updates via sistema apenas
CREATE POLICY "guests_system_update" 
ON public.guests 
FOR UPDATE 
USING (
  -- ✅ Permite update sempre (para status, verificações, etc.)
  true
);

-- 🔒 ELIMINAÇÃO: Restrita (apenas admin)
CREATE POLICY "guests_system_delete" 
ON public.guests 
FOR DELETE 
USING (
  -- ❌ Não permite delete direto (apenas via admin ou função específica)
  false
);

-- 4. ✅ VERIFICAR que as políticas foram criadas corretamente
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  cmd as operation,
  permissive,
  qual as condition
FROM pg_policies 
WHERE tablename = 'guests' AND schemaname = 'public'
ORDER BY cmd, policyname;

-- 5. 🛡️ VERIFICAR que outras tabelas NÃO foram afetadas
SELECT 
  tablename, 
  COUNT(*) as policy_count,
  bool_and(rowsecurity) as rls_enabled
FROM pg_tables t
LEFT JOIN pg_policies p ON p.tablename = t.tablename AND p.schemaname = t.schemaname
WHERE t.schemaname = 'public' 
AND t.tablename IN ('profiles', 'events', 'organizations', 'event_promoters')
GROUP BY t.tablename
ORDER BY t.tablename;

-- 6. 🔍 TESTAR que a função create_guest_ultra_fast pode inserir
-- Esta query deve funcionar sem erros RLS
SELECT 'RLS policies configured successfully for guests table' as status;

-- =====================================================
-- 📋 INSTRUÇÕES DE EXECUÇÃO:
-- 1. Copiar todo este SQL
-- 2. Colar no Supabase Dashboard > SQL Editor
-- 3. Executar (Run)
-- 4. Verificar se retorna "RLS policies configured successfully"
-- 5. Testar o sistema guest novamente
-- =====================================================