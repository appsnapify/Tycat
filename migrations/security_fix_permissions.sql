-- 🔒 CORREÇÃO CRÍTICA DE SEGURANÇA: Restringir permissões SQL
-- Remove acesso anônimo de funções sensíveis

-- 1. Remover permissões ANON de create_guest_safely
REVOKE EXECUTE ON FUNCTION public.create_guest_safely FROM anon;

-- 2. Manter apenas authenticated e service_role para funções críticas
GRANT EXECUTE ON FUNCTION public.create_guest_safely TO authenticated, service_role;

-- 3. Remover permissões ANON de outras funções client-auth críticas
REVOKE EXECUTE ON FUNCTION register_client_user FROM anon;
REVOKE EXECUTE ON FUNCTION client_user_login FROM anon;
REVOKE EXECUTE ON FUNCTION create_guest_with_client FROM anon;

-- 4. Manter apenas authenticated para estas funções
GRANT EXECUTE ON FUNCTION register_client_user TO authenticated;
GRANT EXECUTE ON FUNCTION client_user_login TO authenticated;
GRANT EXECUTE ON FUNCTION create_guest_with_client TO authenticated;

-- 5. Funções de verificação podem manter anon (read-only)
-- check_phone_registered e get_public_promoter_page_data mantêm anon

-- 6. Log da correção
-- Esta migração remove permissões anônimas de funções que podem criar/modificar dados
-- mantendo apenas acesso para usuários autenticados e service_role

COMMENT ON FUNCTION public.create_guest_safely IS 
'🔒 SECURITY: Função protegida - apenas authenticated e service_role podem executar'; 