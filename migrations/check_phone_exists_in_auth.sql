-- Função para verificar se um telefone existe na tabela auth.users
CREATE OR REPLACE FUNCTION public.check_phone_exists_in_auth(phone_to_check TEXT)
RETURNS TABLE (id UUID, phone TEXT) 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Registrar a chamada para debug
  RAISE NOTICE 'Verificando se o telefone % existe em auth.users', phone_to_check;
  
  RETURN QUERY
  SELECT au.id, phone_to_check as phone
  FROM auth.users au
  WHERE 
    -- Verificar phone diretamente
    au.phone = phone_to_check
    -- Ou verificar raw_user_meta_data que contém o telefone
    OR au.raw_user_meta_data->>'phone' = phone_to_check
    -- Verificar se o telefone está no e-mail (alguns sistemas usam o telefone como e-mail)
    OR au.email LIKE ('%' || phone_to_check || '%')
  LIMIT 1;
  
  -- Registrar a conclusão para debug
  RAISE NOTICE 'Verificação de telefone concluída para %', phone_to_check;
END;
$$ LANGUAGE plpgsql; 