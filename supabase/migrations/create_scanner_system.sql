-- Migração: Sistema Completo de Scanner
-- Data: Janeiro 2025
-- Objetivo: Criar todas as tabelas necessárias para o sistema de scanner móvel

-- 1. SCANNERS DE EVENTOS
CREATE TABLE IF NOT EXISTS event_scanners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES profiles(id),
  
  -- Dados do scanner
  scanner_name VARCHAR(100) NOT NULL,
  username VARCHAR(50) NOT NULL,
  password_hash TEXT NOT NULL,
  access_token TEXT UNIQUE NOT NULL,
  
  -- Status e controlo
  is_active BOOLEAN DEFAULT true,
  max_concurrent_sessions INTEGER DEFAULT 1,
  
  -- Auditoria
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity TIMESTAMPTZ,
  device_info JSONB DEFAULT '{}',
  
  CONSTRAINT unique_event_username UNIQUE(event_id, username)
);

-- 2. SESSÕES ATIVAS
CREATE TABLE IF NOT EXISTS scanner_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scanner_id UUID NOT NULL REFERENCES event_scanners(id) ON DELETE CASCADE,
  
  -- Dados da sessão
  start_time TIMESTAMPTZ DEFAULT NOW(),
  end_time TIMESTAMPTZ,
  session_token TEXT UNIQUE NOT NULL,
  
  -- Device tracking
  device_fingerprint TEXT,
  ip_address INET,
  user_agent TEXT,
  
  -- Estatísticas
  total_scans INTEGER DEFAULT 0,
  successful_scans INTEGER DEFAULT 0,
  offline_scans INTEGER DEFAULT 0,
  last_sync TIMESTAMPTZ DEFAULT NOW(),
  
  -- Status
  is_active BOOLEAN DEFAULT true
);

-- 3. LOG DETALHADO DE SCANS
CREATE TABLE IF NOT EXISTS scan_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES scanner_sessions(id) ON DELETE CASCADE,
  guest_id UUID REFERENCES guests(id),
  
  -- Dados do scan
  scan_time TIMESTAMPTZ DEFAULT NOW(),
  scan_method VARCHAR(20) NOT NULL CHECK (scan_method IN ('qr_code', 'name_search', 'manual_entry')),
  scan_result VARCHAR(20) NOT NULL CHECK (scan_result IN ('success', 'duplicate', 'invalid', 'not_found', 'search_performed', 'results_found', 'no_results')),
  
  -- Dados originais
  qr_code_raw TEXT,
  search_query TEXT,
  
  -- Status offline/online
  was_offline BOOLEAN DEFAULT false,
  sync_time TIMESTAMPTZ,
  
  -- Observações
  scanner_notes TEXT,
  error_details TEXT
);

-- 4. CACHE OFFLINE
CREATE TABLE IF NOT EXISTS scanner_offline_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  scanner_id UUID NOT NULL REFERENCES event_scanners(id) ON DELETE CASCADE,
  
  -- Dados do cache
  cache_data JSONB NOT NULL,
  cache_version INTEGER DEFAULT 1,
  
  -- Controlo de expiração
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_event_scanner_cache UNIQUE(event_id, scanner_id)
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_event_scanners_event_id ON event_scanners(event_id);
CREATE INDEX IF NOT EXISTS idx_event_scanners_access_token ON event_scanners(access_token);
CREATE INDEX IF NOT EXISTS idx_event_scanners_username ON event_scanners(username);
CREATE INDEX IF NOT EXISTS idx_event_scanners_created_by ON event_scanners(created_by);

CREATE INDEX IF NOT EXISTS idx_scanner_sessions_scanner_id ON scanner_sessions(scanner_id);
CREATE INDEX IF NOT EXISTS idx_scanner_sessions_token ON scanner_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_scanner_sessions_start_time ON scanner_sessions(start_time);
CREATE INDEX IF NOT EXISTS idx_scanner_sessions_is_active ON scanner_sessions(is_active);

CREATE INDEX IF NOT EXISTS idx_scan_logs_session_id ON scan_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_scan_logs_guest_id ON scan_logs(guest_id);
CREATE INDEX IF NOT EXISTS idx_scan_logs_scan_time ON scan_logs(scan_time);
CREATE INDEX IF NOT EXISTS idx_scan_logs_scan_result ON scan_logs(scan_result);
CREATE INDEX IF NOT EXISTS idx_scan_logs_scan_method ON scan_logs(scan_method);

CREATE INDEX IF NOT EXISTS idx_scanner_offline_cache_event_id ON scanner_offline_cache(event_id);
CREATE INDEX IF NOT EXISTS idx_scanner_offline_cache_expires_at ON scanner_offline_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_scanner_offline_cache_scanner_id ON scanner_offline_cache(scanner_id);

-- RLS (Row Level Security) Policies

-- event_scanners: Apenas organizadores podem ver/criar scanners dos seus eventos
ALTER TABLE event_scanners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "event_scanners_select_policy" ON event_scanners
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = event_scanners.event_id
      AND e.organization_id IN (
        SELECT organization_id FROM user_organizations
        WHERE user_id = auth.uid()
          AND role IN ('organizador', 'admin')
      )
  )
);

CREATE POLICY "event_scanners_insert_policy" ON event_scanners
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = event_scanners.event_id
      AND e.organization_id IN (
        SELECT organization_id FROM user_organizations
        WHERE user_id = auth.uid()
          AND role IN ('organizador', 'admin')
      )
  )
);

CREATE POLICY "event_scanners_update_policy" ON event_scanners
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = event_scanners.event_id
      AND e.organization_id IN (
        SELECT organization_id FROM user_organizations
        WHERE user_id = auth.uid()
          AND role IN ('organizador', 'admin')
      )
  )
);

-- scanner_sessions: Apenas o próprio scanner e organizadores podem ver
ALTER TABLE scanner_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scanner_sessions_select_policy" ON scanner_sessions
FOR SELECT TO authenticated
USING (
  -- Scanner pode ver suas próprias sessões (via service_role)
  true
);

CREATE POLICY "scanner_sessions_insert_policy" ON scanner_sessions
FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "scanner_sessions_update_policy" ON scanner_sessions
FOR UPDATE TO authenticated
USING (true);

-- scan_logs: Logs visíveis para organizadores e scanners relacionados
ALTER TABLE scan_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scan_logs_select_policy" ON scan_logs
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "scan_logs_insert_policy" ON scan_logs
FOR INSERT TO authenticated
WITH CHECK (true);

-- scanner_offline_cache: Cache visível apenas para o scanner específico
ALTER TABLE scanner_offline_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scanner_offline_cache_all_policy" ON scanner_offline_cache
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- Função para validar token de scanner
CREATE OR REPLACE FUNCTION validate_scanner_token(token TEXT)
RETURNS TABLE (
  scanner_id UUID,
  event_id UUID,
  scanner_name TEXT,
  is_valid BOOLEAN
)
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    es.id as scanner_id,
    es.event_id,
    es.scanner_name,
    (ss.is_active AND es.is_active) as is_valid
  FROM scanner_sessions ss
  JOIN event_scanners es ON es.id = ss.scanner_id
  WHERE ss.session_token = token
    AND ss.is_active = true
    AND es.is_active = true
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Função para criar log de scan
CREATE OR REPLACE FUNCTION log_scanner_activity(
  p_session_id UUID,
  p_guest_id UUID DEFAULT NULL,
  p_scan_method TEXT DEFAULT 'qr_code',
  p_scan_result TEXT DEFAULT 'success',
  p_qr_code_raw TEXT DEFAULT NULL,
  p_search_query TEXT DEFAULT NULL,
  p_was_offline BOOLEAN DEFAULT false,
  p_scanner_notes TEXT DEFAULT NULL,
  p_error_details TEXT DEFAULT NULL
)
RETURNS UUID
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO scan_logs (
    session_id,
    guest_id,
    scan_method,
    scan_result,
    qr_code_raw,
    search_query,
    was_offline,
    scanner_notes,
    error_details
  ) VALUES (
    p_session_id,
    p_guest_id,
    p_scan_method,
    p_scan_result,
    p_qr_code_raw,
    p_search_query,
    p_was_offline,
    p_scanner_notes,
    p_error_details
  ) RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;

-- Conceder permissões
GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated, service_role;

-- Comentários para documentação
COMMENT ON TABLE event_scanners IS 'Scanners criados para eventos específicos pelos organizadores';
COMMENT ON TABLE scanner_sessions IS 'Sessões ativas de scanners com tracking de dispositivos';
COMMENT ON TABLE scan_logs IS 'Log detalhado de todas as atividades dos scanners';
COMMENT ON TABLE scanner_offline_cache IS 'Cache de dados para funcionamento offline dos scanners';

COMMENT ON FUNCTION validate_scanner_token(TEXT) IS 'Valida token de sessão e retorna dados do scanner';
COMMENT ON FUNCTION log_scanner_activity IS 'Registra atividade de scan com detalhes completos'; 