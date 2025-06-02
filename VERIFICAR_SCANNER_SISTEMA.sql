-- Script de Verificação: Sistema Scanner SNAP
-- Execute este script no SQL Editor do Supabase para verificar se tudo está funcionando

-- 1. Verificar se as tabelas existem
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('event_scanners', 'scanner_sessions', 'scan_logs', 'scanner_offline_cache')
ORDER BY table_name;

-- 2. Verificar colunas das tabelas principais
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name IN ('event_scanners', 'scanner_sessions')
ORDER BY table_name, ordinal_position;

-- 3. Verificar índices criados
SELECT 
  indexname,
  tablename,
  indexdef
FROM pg_indexes 
WHERE tablename IN ('event_scanners', 'scanner_sessions', 'scan_logs')
ORDER BY tablename, indexname;

-- 4. Verificar se existem scanners criados
SELECT 
  COUNT(*) as total_scanners,
  COUNT(CASE WHEN is_active THEN 1 END) as active_scanners
FROM event_scanners;

-- 5. Verificar eventos disponíveis para teste
SELECT 
  id,
  title,
  date,
  is_active
FROM events 
WHERE is_active = true 
ORDER BY date DESC 
LIMIT 5;

-- 6. Verificar convidados disponíveis para teste de scan
SELECT 
  e.title as evento,
  COUNT(g.id) as total_convidados,
  COUNT(CASE WHEN g.checked_in THEN 1 END) as ja_checkin
FROM events e
LEFT JOIN guests g ON e.id = g.event_id
WHERE e.is_active = true
GROUP BY e.id, e.title
ORDER BY e.date DESC;

-- 7. Teste de criação de scanner (substitua os IDs pelos reais)
-- DESCOMENTE e ajuste os IDs para testar:
/*
INSERT INTO event_scanners (
  event_id, 
  created_by, 
  scanner_name, 
  username, 
  password_hash, 
  access_token
) VALUES (
  'SEU_EVENT_ID_AQUI',  -- Substitua pelo ID real de um evento
  'SEU_USER_ID_AQUI',   -- Substitua pelo seu ID de usuário
  'Scanner Teste',
  'scanner.teste',
  '$2b$12$exemplo.hash.password',  -- Hash de uma senha real
  'token_teste_' || gen_random_uuid()::text
) RETURNING id, scanner_name, username;
*/

-- Resultado esperado:
-- ✅ 4 tabelas criadas (event_scanners, scanner_sessions, scan_logs, scanner_offline_cache)
-- ✅ Índices criados para performance
-- ✅ Eventos ativos disponíveis
-- ✅ Sistema pronto para uso 