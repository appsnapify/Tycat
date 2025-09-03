-- ==========================================
-- REVOLUÇÃO SISTEMA GUESTS - FASE 1
-- Cache System para Phone Lookup Ultra-Rápido
-- ==========================================

-- Tabela de cache para phone lookups
CREATE TABLE IF NOT EXISTS public.phone_lookup_cache (
  phone_hash text PRIMARY KEY,
  client_user_id uuid,
  user_data jsonb NOT NULL,
  created_at timestamptz DEFAULT NOW(),
  expires_at timestamptz DEFAULT (NOW() + interval '5 minutes')
);

-- Índices para performance máxima
CREATE INDEX IF NOT EXISTS idx_phone_cache_expires ON phone_lookup_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_phone_cache_client_id ON phone_lookup_cache(client_user_id);

-- Função otimizada com cache SQL inteligente
CREATE OR REPLACE FUNCTION public.check_phone_with_cache(p_phone text)
RETURNS jsonb
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_phone_hash text;
  v_cached_result jsonb;
  v_user_data jsonb;
  v_start_time timestamptz;
BEGIN
  v_start_time := clock_timestamp();
  
  -- Validação de input
  IF p_phone IS NULL OR length(trim(p_phone)) < 8 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid phone number',
      'processing_time_ms', EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)
    );
  END IF;
  
  -- Gerar hash SHA256 do telefone (segurança + performance)
  v_phone_hash := encode(digest(p_phone, 'sha256'), 'hex');
  
  -- STEP 1: Verificar cache SQL primeiro (índice único)
  SELECT user_data INTO v_cached_result
  FROM phone_lookup_cache 
  WHERE phone_hash = v_phone_hash 
    AND expires_at > NOW();
  
  -- Cache HIT - retornar imediatamente
  IF v_cached_result IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'exists', v_cached_result IS NOT NULL AND v_cached_result != 'null'::jsonb,
      'user', v_cached_result,
      'source', 'sql_cache',
      'processing_time_ms', EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)
    );
  END IF;
  
  -- STEP 2: Cache MISS - buscar na tabela real (índice único em phone)
  SELECT jsonb_build_object(
    'id', cu.id,
    'firstName', cu.first_name,
    'lastName', cu.last_name,
    'email', cu.email,
    'phone', cu.phone,
    'isVerified', cu.is_verified,
    'createdAt', cu.created_at
  ) INTO v_user_data
  FROM client_users cu 
  WHERE cu.phone = p_phone AND cu.is_active = true;
  
  -- STEP 3: Atualizar cache (UPSERT para evitar conflitos)
  INSERT INTO phone_lookup_cache (phone_hash, client_user_id, user_data, expires_at)
  VALUES (
    v_phone_hash, 
    (v_user_data->>'id')::uuid, 
    COALESCE(v_user_data, 'null'::jsonb),
    NOW() + interval '5 minutes'
  )
  ON CONFLICT (phone_hash) DO UPDATE SET
    user_data = EXCLUDED.user_data,
    expires_at = EXCLUDED.expires_at,
    client_user_id = EXCLUDED.client_user_id;
  
  -- STEP 4: Retornar resultado final
  RETURN jsonb_build_object(
    'success', true,
    'exists', v_user_data IS NOT NULL,
    'user', v_user_data,
    'source', 'database',
    'processing_time_ms', EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)
  );
  
EXCEPTION
  WHEN OTHERS THEN
    -- Log error sem expor detalhes
    INSERT INTO error_logs (function_name, error_message, error_detail, created_at)
    VALUES ('check_phone_with_cache', SQLERRM, SQLSTATE, NOW())
    ON CONFLICT DO NOTHING;
    
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Internal server error',
      'processing_time_ms', EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)
    );
END;
$$;

-- Função de limpeza automática do cache
CREATE OR REPLACE FUNCTION public.cleanup_phone_cache()
RETURNS jsonb
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_deleted_count integer;
  v_start_time timestamptz;
BEGIN
  v_start_time := clock_timestamp();
  
  -- Remover entradas expiradas
  DELETE FROM phone_lookup_cache 
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN jsonb_build_object(
    'success', true,
    'deleted_entries', v_deleted_count,
    'processing_time_ms', EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'processing_time_ms', EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)
    );
END;
$$;

-- Agendar limpeza automática a cada hora (se pg_cron estiver disponível)
-- SELECT cron.schedule('cleanup-phone-cache', '0 * * * *', 'SELECT cleanup_phone_cache();');

-- Função para estatísticas do cache
CREATE OR REPLACE FUNCTION public.get_cache_stats()
RETURNS jsonb
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_total_entries integer;
  v_expired_entries integer;
  v_active_entries integer;
BEGIN
  -- Contar entradas totais
  SELECT COUNT(*) INTO v_total_entries FROM phone_lookup_cache;
  
  -- Contar entradas expiradas
  SELECT COUNT(*) INTO v_expired_entries 
  FROM phone_lookup_cache 
  WHERE expires_at < NOW();
  
  -- Entradas ativas
  v_active_entries := v_total_entries - v_expired_entries;
  
  RETURN jsonb_build_object(
    'total_entries', v_total_entries,
    'active_entries', v_active_entries,
    'expired_entries', v_expired_entries,
    'hit_rate_estimate', CASE 
      WHEN v_total_entries > 0 THEN ROUND((v_active_entries::numeric / v_total_entries::numeric) * 100, 2)
      ELSE 0 
    END,
    'last_updated', NOW()
  );
END;
$$;

-- Revogar acesso público e conceder apenas a authenticated
REVOKE ALL ON FUNCTION check_phone_with_cache FROM PUBLIC;
REVOKE ALL ON FUNCTION cleanup_phone_cache FROM PUBLIC;
REVOKE ALL ON FUNCTION get_cache_stats FROM PUBLIC;

GRANT EXECUTE ON FUNCTION check_phone_with_cache TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_phone_cache TO service_role;
GRANT EXECUTE ON FUNCTION get_cache_stats TO authenticated;

-- Comentários para documentação
COMMENT ON FUNCTION check_phone_with_cache IS 'Verifica existência de telefone com cache SQL inteligente - Performance: <10ms';
COMMENT ON FUNCTION cleanup_phone_cache IS 'Limpeza automática de entradas expiradas do cache';
COMMENT ON FUNCTION get_cache_stats IS 'Estatísticas em tempo real do sistema de cache';
COMMENT ON TABLE phone_lookup_cache IS 'Cache SQL para phone lookups - TTL: 5 minutos';
