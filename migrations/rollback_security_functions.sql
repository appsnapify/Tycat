-- ============================================================================
-- SCRIPT DE ROLLBACK - FUNÇÕES DE SEGURANÇA
-- Data: $(date)
-- Objetivo: Reverter funções SECURITY DEFINER criadas
-- ============================================================================

-- Remover funções criadas
DROP FUNCTION IF EXISTS get_event_guest_count_secure(UUID);
DROP FUNCTION IF EXISTS get_multiple_events_guest_count_secure(UUID[]);
DROP FUNCTION IF EXISTS associate_team_to_organization_secure(TEXT, UUID);
DROP FUNCTION IF EXISTS create_team_secure(TEXT, TEXT, UUID);
DROP FUNCTION IF EXISTS get_available_teams_secure(UUID);

-- Remover log de migração
DELETE FROM migration_log WHERE migration_name = 'security_functions_v1';

-- Log do rollback
INSERT INTO migration_log (
  migration_name,
  description,
  applied_at
) VALUES (
  'rollback_security_functions_v1',
  'Rollback das funções SECURITY DEFINER',
  NOW()
);

-- Mensagem de confirmação
DO $$
BEGIN
  RAISE NOTICE 'Rollback das funções de segurança concluído com sucesso';
END
$$;