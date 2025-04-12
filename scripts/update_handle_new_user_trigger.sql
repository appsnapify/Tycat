-- Atualiza a função que cria um perfil automaticamente para novos usuários.
-- Tenta incluir team_id como NULL para compatibilidade com possíveis alterações na tabela profiles.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Tenta inserir incluindo team_id como NULL
  INSERT INTO public.profiles (id, first_name, last_name, role, team_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', 'Usuário'),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'organizador'),
    NULL -- Define team_id como NULL por padrão
  );
  RETURN NEW;
EXCEPTION
  -- Se a coluna team_id não existir, tenta inserir sem ela (mantém compatibilidade)
  WHEN undefined_column THEN
    INSERT INTO public.profiles (id, first_name, last_name, role)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'first_name', 'Usuário'),
      COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
      COALESCE(NEW.raw_user_meta_data->>'role', 'organizador')
    );
    RETURN NEW;
  -- Se ocorrer outro erro, relança a exceção
  WHEN OTHERS THEN
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remove o trigger antigo se existir
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Cria o novo trigger para executar a função atualizada
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Comentário da função
COMMENT ON FUNCTION public.handle_new_user IS 
'Cria uma linha na tabela public.profiles para cada novo usuário registrado. Inclui tratamento para a coluna team_id (opcional).'; 