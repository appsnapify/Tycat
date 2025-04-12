-- Atualiza a função que cria um perfil automaticamente para novos usuários.
-- Garante compatibilidade com a estrutura atual da tabela profiles,
-- especialmente com a coluna last_name NOT NULL.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insere o novo perfil, fornecendo valores padrão para colunas NOT NULL
  INSERT INTO public.profiles (id, first_name, last_name, role)
  VALUES (
    NEW.id,
    -- Usa o first_name dos metadados ou 'Usuário' como padrão
    COALESCE(NEW.raw_user_meta_data->>'first_name', 'Usuário'),
    -- Usa o last_name dos metadados ou '?' como padrão (evita string vazia)
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'last_name', ''), '?'),
    -- Usa o role dos metadados ou 'organizador' como padrão
    COALESCE(NEW.raw_user_meta_data->>'role', 'organizador')
  );
  RETURN NEW;
EXCEPTION
  -- Captura qualquer erro durante a inserção e loga (opcional, mas útil para debug)
  WHEN OTHERS THEN
    RAISE WARNING 'Erro ao criar perfil para usuário %: % ', NEW.id, SQLERRM;
    -- Mesmo com erro, permite que a criação do usuário em auth.users continue
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Garante que o trigger mais recente está associado à função
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Comentário da função
COMMENT ON FUNCTION public.handle_new_user IS 
'Cria uma linha na tabela public.profiles para cada novo usuário registrado, compatível com last_name NOT NULL.'; 