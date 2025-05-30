-- Função corrigida para criar convidados com estrutura atual da tabela
CREATE OR REPLACE FUNCTION public.create_guest_safely(
  p_event_id UUID, 
  p_client_user_id UUID, 
  p_promoter_id UUID DEFAULT NULL, 
  p_team_id UUID DEFAULT NULL, 
  p_name TEXT DEFAULT 'Convidado', 
  p_phone TEXT DEFAULT ''
)
RETURNS TABLE (
  id UUID,
  qr_code_url TEXT
) 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_guest_id UUID;
  v_qr_code_url TEXT;
  v_qr_code_text TEXT;
  v_existing_guest_id UUID;
BEGIN
  -- Verificar se já existe um convidado com essas informações
  SELECT id INTO v_existing_guest_id
  FROM guests
  WHERE event_id = p_event_id
    AND client_user_id = p_client_user_id
  LIMIT 1;
  
  -- Se o convidado já existe, retornar suas informações
  IF v_existing_guest_id IS NOT NULL THEN
    RETURN QUERY
    SELECT g.id, g.qr_code_url
    FROM guests g
    WHERE g.id = v_existing_guest_id;
    RETURN;
  END IF;
  
  -- Gerar novo UUID e dados do QR code
  v_guest_id := gen_random_uuid();
  v_qr_code_text := v_guest_id::text;
  v_qr_code_url := 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=' || v_qr_code_text;
  
  -- Inserir o novo convidado com TODOS os campos necessários
  INSERT INTO guests (
    id, 
    event_id, 
    name, 
    phone, 
    qr_code,          -- Campo obrigatório
    qr_code_url,      -- Campo opcional mas útil
    checked_in,
    status,           -- Campo obrigatório com default
    promoter_id, 
    team_id, 
    client_user_id,
    created_at
  )
  VALUES (
    v_guest_id,
    p_event_id,
    p_name,
    p_phone,
    v_qr_code_text,   -- ✅ PREENCHENDO qr_code
    v_qr_code_url,    -- ✅ PREENCHENDO qr_code_url
    false,            -- ✅ checked_in default
    'pending',        -- ✅ status default
    p_promoter_id,
    p_team_id,
    p_client_user_id,
    NOW()
  );
  
  -- Retornar os dados do convidado criado
  RETURN QUERY
  SELECT v_guest_id, v_qr_code_url;
END;
$$ LANGUAGE plpgsql;

-- Conceder permissões de execução
GRANT EXECUTE ON FUNCTION public.create_guest_safely(UUID, UUID, UUID, UUID, TEXT, TEXT) TO authenticated, anon, service_role; 