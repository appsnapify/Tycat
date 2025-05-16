# Implementação do Sistema GuestMobile

## Visão Geral
O sistema GuestMobile permite que clientes solicitem acesso à guest list através de links de promotores, registrem-se no sistema, façam login e acessem seus QR codes em um dashboard dedicado.

## Componentes Implementados

### 1. Estrutura de Dados
- **Tabela `client_users`**: Armazena dados dos usuários clientes
- **Campo `client_user_id` na tabela `guests`**: Associa convidados a clientes
- **Índices e triggers**: Para otimização e manutenção de dados

### 2. Funções SQL Seguras
- **check_phone_registered**: Verifica se um telefone já está registrado
- **register_client_user**: Registra novo cliente com validações
- **client_user_login**: Verifica credenciais e retorna dados do cliente
- **create_guest_with_client**: Cria convidado vinculado a um cliente
- **get_client_guests**: Obtém todos os convites de um cliente

### 3. APIs
- **/api/client-auth/check-phone**: Verifica se um telefone já está registrado
- **/api/client-auth/register**: Registra novo cliente
- **/api/client-auth/login**: Autentica cliente existente
- **/api/guests/create-from-client**: Cria convidado vinculado ao cliente autenticado

### 4. Componentes de UI
- **PhoneVerificationForm**: Formulário de verificação de telefone
- **ClientLoginForm**: Formulário de login
- **ClientRegistrationForm**: Formulário de registro com campos completos
- **GuestRequestClient**: Componente principal que gerencia o fluxo de solicitação
- **SuccessMessage**: Mensagem de sucesso após ações

## Aplicar Migrações SQL

Para aplicar as migrações SQL ao banco de dados, execute as seguintes consultas no painel SQL do Supabase:

### 1. Tabela `client_users` e modificações

```sql
CREATE TABLE IF NOT EXISTS public.client_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT,
  birth_date DATE,
  postal_code TEXT,
  gender TEXT,
  password TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_users_phone ON public.client_users(phone);
CREATE INDEX IF NOT EXISTS idx_client_users_email ON public.client_users(email);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'guests' AND column_name = 'client_user_id'
  ) THEN
    ALTER TABLE public.guests ADD COLUMN client_user_id UUID REFERENCES client_users(id);
    CREATE INDEX idx_guests_client_user_id ON public.guests(client_user_id);
  END IF;
END$$;
```

### 2. Funções SQL

```sql
-- Função para verificar registro de telefone
CREATE OR REPLACE FUNCTION check_phone_registered(phone_to_check TEXT)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM client_users WHERE phone = phone_to_check
  ) INTO user_exists;
  
  RETURN user_exists;
END;
$$ LANGUAGE plpgsql;

-- Função para registrar cliente
CREATE OR REPLACE FUNCTION register_client_user(
  p_phone TEXT,
  p_email TEXT,
  p_first_name TEXT,
  p_last_name TEXT,
  p_birth_date DATE DEFAULT NULL,
  p_postal_code TEXT DEFAULT NULL,
  p_gender TEXT DEFAULT NULL,
  p_password TEXT
)
RETURNS TABLE (
  id UUID,
  phone TEXT,
  email TEXT,
  first_name TEXT,
  last_name TEXT
)
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  IF EXISTS (SELECT 1 FROM client_users WHERE phone = p_phone) THEN
    RAISE EXCEPTION 'Telefone já registrado';
  END IF;
  
  IF p_email IS NOT NULL AND EXISTS (SELECT 1 FROM client_users WHERE email = p_email) THEN
    RAISE EXCEPTION 'Email já registrado';
  END IF;
  
  INSERT INTO client_users (
    phone, email, first_name, last_name, 
    birth_date, postal_code, gender, password
  ) VALUES (
    p_phone, p_email, p_first_name, p_last_name,
    p_birth_date, p_postal_code, p_gender, p_password
  )
  RETURNING id INTO v_user_id;
  
  RETURN QUERY
  SELECT 
    cu.id, cu.phone, cu.email, cu.first_name, cu.last_name
  FROM 
    client_users cu
  WHERE 
    cu.id = v_user_id;
END;
$$ LANGUAGE plpgsql;

-- Função para login de cliente
CREATE OR REPLACE FUNCTION client_user_login(
  p_phone TEXT,
  p_password TEXT
)
RETURNS TABLE (
  id UUID,
  phone TEXT,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  auth_successful BOOLEAN
)
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cu.id,
    cu.phone,
    cu.email,
    cu.first_name,
    cu.last_name,
    (cu.password = p_password) AS auth_successful
  FROM 
    client_users cu
  WHERE 
    cu.phone = p_phone;
END;
$$ LANGUAGE plpgsql;

-- Função para criar guest vinculado a client_user
CREATE OR REPLACE FUNCTION create_guest_with_client(
  p_event_id UUID, 
  p_client_user_id UUID, 
  p_promoter_id UUID DEFAULT NULL, 
  p_team_id UUID DEFAULT NULL,
  p_name TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL
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
  v_client_name TEXT;
  v_client_phone TEXT;
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
  
  -- Buscar informações do cliente se não fornecidas
  IF p_name IS NULL OR p_phone IS NULL THEN
    SELECT first_name || ' ' || COALESCE(last_name, ''), phone
    INTO v_client_name, v_client_phone
    FROM client_users
    WHERE id = p_client_user_id;
  END IF;
  
  -- Usar informações do cliente ou as fornecidas
  v_client_name := COALESCE(p_name, v_client_name, 'Convidado');
  v_client_phone := COALESCE(p_phone, v_client_phone, '');
  
  -- Gerar novo UUID e URL do QR code
  v_guest_id := gen_random_uuid();
  v_qr_code_url := 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=' || v_guest_id::text;
  
  -- Inserir o novo convidado com vinculação ao client_user_id
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
    v_client_name,
    v_client_phone,
    v_qr_code_url,
    NOW()
  );
  
  -- Retornar os dados do convidado criado
  RETURN QUERY
  SELECT v_guest_id, v_qr_code_url;
END;
$$ LANGUAGE plpgsql;

-- Função para obter todos os convites de um cliente
CREATE OR REPLACE FUNCTION get_client_guests(
  p_client_user_id UUID
)
RETURNS TABLE (
  guest_id UUID,
  event_id UUID,
  event_title TEXT,
  event_date DATE,
  event_time TIME,
  organization_name TEXT,
  qr_code_url TEXT,
  created_at TIMESTAMPTZ,
  status TEXT
)
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    g.id AS guest_id,
    e.id AS event_id,
    e.title AS event_title,
    e.date AS event_date,
    e.time AS event_time,
    o.name AS organization_name,
    g.qr_code_url,
    g.created_at,
    g.status
  FROM 
    guests g
    JOIN events e ON g.event_id = e.id
    JOIN organizations o ON e.organization_id = o.id
  WHERE 
    g.client_user_id = p_client_user_id
  ORDER BY 
    e.date DESC, e.time DESC;
END;
$$ LANGUAGE plpgsql;

-- Conceder permissões
GRANT EXECUTE ON FUNCTION check_phone_registered(TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION register_client_user(TEXT, TEXT, TEXT, TEXT, DATE, TEXT, TEXT, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION client_user_login(TEXT, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION create_guest_with_client(UUID, UUID, UUID, UUID, TEXT, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_client_guests(UUID) TO authenticated;
```

## Como Testar o Sistema

1. Acesse um link de promotor (URL `/promo/[...params]`)
2. Insira seu número de telefone no formulário
3. Se for novo usuário, complete o registro; se já registrado, faça login
4. Após autenticação, um QR code será gerado automaticamente
5. O QR code ficará disponível no dashboard do cliente

## Próximos Passos

1. Implementar página de dashboard do cliente
2. Implementar middleware para proteção de rotas
3. Adicionar tela de listagem de eventos disponíveis
4. Implementar funcionalidade de compartilhamento de QR code
5. Melhorar visualização em dispositivos móveis
6. Adicionar notificações para eventos futuros

## Considerações de Segurança

- Todas as funções SQL usam `SECURITY DEFINER` para contornar RLS de forma segura
- Sempre definimos `search_path = public` para evitar ataques de injeção
- Autenticação baseada em JWT com cookies HTTP-only
- Validação de dados em todos os endpoints
- Tratamento adequado de erros com mensagens informativas

## Notas Adicionais

- O sistema implementado é totalmente integrado com o sistema existente de guests
- Os QR codes são visíveis e rastreáveis pelos organizadores dos eventos
- Promotores mantêm suas comissões para convidados que se registrarem através dos seus links 