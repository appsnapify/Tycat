-- Função segura para criar convidados contornando RLS
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
  v_existing_guest_id UUID;
BEGIN
  -- ✅ VERIFICAÇÃO DUPLA DE DUPLICATAS: Verificar ambas as condições
  
  -- 1. Verificar se já existe um convidado com mesmo client_user_id + event_id
  SELECT id INTO v_existing_guest_id
  FROM guests
  WHERE event_id = p_event_id
    AND client_user_id = p_client_user_id
  LIMIT 1;
  
  -- Se encontrou por client_user_id, retornar
  IF v_existing_guest_id IS NOT NULL THEN
    RETURN QUERY
    SELECT g.id, g.qr_code_url
    FROM guests g
    WHERE g.id = v_existing_guest_id;
    RETURN;
  END IF;
  
  -- 2. NOVA VERIFICAÇÃO: Verificar se já existe um convidado com mesmo phone + event_id
  IF p_phone IS NOT NULL AND p_phone != '' THEN
    SELECT id INTO v_existing_guest_id
    FROM guests
    WHERE event_id = p_event_id
      AND phone = p_phone
    LIMIT 1;
    
    -- Se encontrou por telefone, retornar o guest existente
    IF v_existing_guest_id IS NOT NULL THEN
      RETURN QUERY
      SELECT g.id, g.qr_code_url
      FROM guests g
      WHERE g.id = v_existing_guest_id;
      RETURN;
    END IF;
  END IF;
  
  -- Se chegou aqui, não há duplicatas - criar novo guest
  v_guest_id := gen_random_uuid();
  v_qr_code_url := 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=' || v_guest_id::text;
  
  -- Inserir o novo convidado
  INSERT INTO guests (
    id, 
    event_id, 
    client_user_id, 
    promoter_id, 
    team_id, 
    name, 
    phone, 
    qr_code_url, 
    created_at
  )
  VALUES (
    v_guest_id,
    p_event_id,
    p_client_user_id,
    p_promoter_id,
    p_team_id,
    p_name,
    p_phone,
    v_qr_code_url,
    NOW()
  );
  
  -- Retornar os dados do convidado criado
  RETURN QUERY
  SELECT v_guest_id, v_qr_code_url;
END;
$$ LANGUAGE plpgsql;

-- Conceder permissões de execução para funções que utilizarão esta função
GRANT EXECUTE ON FUNCTION public.create_guest_safely(UUID, UUID, UUID, UUID, TEXT, TEXT) TO authenticated, anon, service_role; 