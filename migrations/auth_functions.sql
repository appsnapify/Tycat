-- Função para verificar se um usuário cliente existe
CREATE OR REPLACE FUNCTION public.check_client_user_exists(
  user_id UUID
)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM client_users WHERE id = user_id
  ) INTO user_exists;
  
  RETURN user_exists;
END;
$$ LANGUAGE plpgsql;

-- Função para verificar credenciais de usuário cliente de forma segura
CREATE OR REPLACE FUNCTION public.verify_client_user_credentials(
  user_id UUID,
  user_password TEXT
)
RETURNS TABLE (
  id UUID,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  email TEXT,
  is_valid_password BOOLEAN
)
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cu.id,
    cu.first_name,
    cu.last_name,
    cu.phone,
    cu.email,
    -- Verificar se a senha fornecida corresponde à senha armazenada
    -- Substitua essa comparação pelo método de hash usado no sistema
    (cu.password = user_password) AS is_valid_password
  FROM 
    client_users cu
  WHERE 
    cu.id = user_id;
END;
$$ LANGUAGE plpgsql;

-- Conceder permissões para usuários autenticados e anônimos
GRANT EXECUTE ON FUNCTION public.check_client_user_exists(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.verify_client_user_credentials(UUID, TEXT) TO authenticated, anon; 