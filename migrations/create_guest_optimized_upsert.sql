-- Função SQL otimizada com UPSERT para alta performance
-- SEGURA: Não substitui create_guest_safely, funciona em paralelo

CREATE OR REPLACE FUNCTION public.create_guest_optimized(
  p_event_id UUID, 
  p_client_user_id UUID, 
  p_promoter_id UUID DEFAULT NULL, 
  p_team_id UUID DEFAULT NULL, 
  p_name TEXT DEFAULT 'Convidado', 
  p_phone TEXT DEFAULT ''
)
RETURNS json
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_guest_id UUID;
  v_qr_code_url TEXT;
  v_qr_code_text TEXT;
BEGIN
  -- ✅ UPSERT - Inserir ou atualizar se já existe
  -- Muito mais eficiente que check + insert separados
  
  -- Gerar dados únicos
  v_guest_id := gen_random_uuid();
  v_qr_code_text := v_guest_id::text;
  v_qr_code_url := 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=' || v_qr_code_text;
  
  -- ✅ UPSERT com ON CONFLICT - Performance otimizada
  INSERT INTO guests (
    id, 
    event_id, 
    client_user_id, 
    promoter_id, 
    team_id, 
    name, 
    phone, 
    qr_code,
    qr_code_url,
    status,
    checked_in,
    created_at
  ) VALUES (
    v_guest_id,
    p_event_id,
    p_client_user_id,
    p_promoter_id,
    p_team_id,
    p_name,
    p_phone,
    v_qr_code_text,
    v_qr_code_url,
    'pending',
    false,
    NOW()
  )
  ON CONFLICT (event_id, client_user_id) 
  DO UPDATE SET 
    updated_at = NOW(),
    -- Preservar dados existentes, só atualizar timestamp
    name = COALESCE(guests.name, EXCLUDED.name),
    phone = COALESCE(guests.phone, EXCLUDED.phone)
  RETURNING id, qr_code_url;
  
  -- ✅ Retornar resultado no formato JSON esperado
  RETURN json_build_object(
    'id', v_guest_id,
    'qr_code_url', (SELECT qr_code_url FROM guests WHERE event_id = p_event_id AND client_user_id = p_client_user_id LIMIT 1),
    'created_at', NOW(),
    'method', 'optimized_upsert'
  );
  
EXCEPTION
  WHEN OTHERS THEN
    -- ✅ Em caso de erro, retornar erro estruturado
    RETURN json_build_object(
      'error', SQLERRM,
      'method', 'optimized_upsert_failed'
    );
END;
$$ LANGUAGE plpgsql;

-- ✅ Conceder permissões (mesmas da função original)
GRANT EXECUTE ON FUNCTION public.create_guest_optimized(UUID, UUID, UUID, UUID, TEXT, TEXT) TO authenticated, anon, service_role;

-- ✅ Índices para otimizar UPSERT (se não existem)
CREATE INDEX IF NOT EXISTS idx_guests_event_client_unique ON guests(event_id, client_user_id);
CREATE INDEX IF NOT EXISTS idx_guests_optimized_lookup ON guests(event_id, client_user_id, qr_code_url);

-- ✅ Comentário para documentação
COMMENT ON FUNCTION public.create_guest_optimized IS 'Função otimizada com UPSERT para alta performance. Usa ON CONFLICT para resolver duplicatas atomicamente.'; 