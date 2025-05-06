# Resolução Detalhada: Sistema de Autenticação e Página do Promotor

## 1. Análise dos Problemas Encontrados

### 1.1. Problemas de Autenticação

#### 1.1.1. Múltiplas Instâncias do GoTrueClient
- **Diagnóstico**: O console exibia avisos de múltiplas instâncias de GoTrueClient, causando comportamento imprevisível.
- **Causa Raiz**: A aplicação estava criando novas instâncias do cliente Supabase em diversos componentes em vez de reutilizar uma única instância.
- **Impacto**: Sessões sobrescritas, perdas de estado de autenticação e comportamento inconsistente da interface.

#### 1.1.2. Gerenciamento de Cookies
- **Diagnóstico**: Erros do tipo "Cookies can only be modified in a Server Action or Route Handler"
- **Causa Raiz**: Manipulação de cookies tentando acontecer no lado do cliente quando deveria ser restrita ao servidor.
- **Impacto**: Falhas na persistência de sessão e erros durante a navegação entre páginas.

#### 1.1.3. Verificação de Telefone
- **Diagnóstico**: Falhas ao verificar se um número de telefone já existia no sistema.
- **Causa Raiz**: 
  - Normalização inadequada dos formatos de telefone (com/sem prefixo internacional)
  - Consultas incorretas nas tabelas (`profiles` vs `client_users`)
  - Ausência de cache para resultados de verificação
- **Impacto**: Usuários existentes sendo direcionados para tela de registro em vez de login.

#### 1.1.4. Processo de Login
- **Diagnóstico**: Erro "Telefone ou senha incorretos" mesmo com credenciais válidas.
- **Causa Raiz**: 
  - Formato do telefone armazenado diferente do fornecido
  - Comparação inadequada de senhas no Supabase
  - Não utilizar o userId obtido na verificação de telefone
- **Impacto**: Usuários legítimos incapazes de fazer login no sistema.

### 1.2. Problemas Estruturais de Dados

#### 1.2.1. Função SQL Ausente
- **Diagnóstico**: Página do promotor não exibia eventos devido à ausência da função `get_public_promoter_page_data`.
- **Causa Raiz**: A função SQL não havia sido incluída nos arquivos de migração.
- **Impacto**: Falha na exibição de eventos na dashboard do promotor.

#### 1.2.2. Inconsistência nas Tabelas de Usuários
- **Diagnóstico**: Consultas ora apontavam para `profiles`, ora para `client_users`.
- **Causa Raiz**: Evolução do esquema ao longo do tempo sem adequação consistente do código.
- **Impacto**: Comportamentos inconsistentes durante autenticação e busca de usuários.

### 1.3. Problemas de UI/UX

#### 1.3.1. Confusão de Fluxos
- **Diagnóstico**: Usuários confusos entre interfaces de promotor e cliente.
- **Causa Raiz**: Persistência de sessão sem clara separação de contextos.
- **Impacto**: Potencial uso incorreto da plataforma e experiência confusa.

#### 1.3.2. Feedback Inadequado
- **Diagnóstico**: Mensagens de erro genéricas não esclareciam o problema real.
- **Causa Raiz**: Tratamento de erros superficial sem detalhamento adequado.
- **Impacto**: Frustração dos usuários e dificuldade em resolver problemas.

## 2. Soluções Implementadas

### 2.1. Melhorias no Sistema de Autenticação

#### 2.1.1. Singleton para Cliente Supabase
```typescript
// lib/supabase/client.ts
let clientInstance: SupabaseClient | null = null;

export const createBrowserClient = () => {
  if (clientInstance) return clientInstance;

  clientInstance = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        storageKey: 'supabase.client.auth',
      },
      global: {
        fetch: (...args) => {
          return fetch(...args);
        }
      }
    }
  );

  return clientInstance;
};
```

#### 2.1.2. Normalização de Telefone Aprimorada
```typescript
// lib/utils/phoneUtils.ts
export const normalizePhone = (phone: string): string => {
  // Remover todos os caracteres não numéricos
  let normalized = phone.replace(/\D/g, '');
  
  // Verificar se já tem o prefixo internacional de Portugal
  if (normalized.startsWith('351')) {
    return `+${normalized}`;
  }
  
  // Se começar com 9, assumir número português sem prefixo
  if (normalized.length === 9 && normalized.startsWith('9')) {
    return `+351${normalized}`;
  }
  
  // Se já tiver outro prefixo internacional (começando com +)
  if (phone.startsWith('+')) {
    return phone;
  }
  
  // Padrão: adicionar +351 se não tiver outro prefixo
  return normalized.length > 9 ? `+${normalized}` : `+351${normalized}`;
};
```

#### 2.1.3. Função RPC para Verificação de Login
```sql
-- Migração para função de verificação de login
CREATE OR REPLACE FUNCTION public.verify_user_login(
  user_id text,
  user_password text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_record record;
  user_json json;
BEGIN
  -- Primeiro, tentar buscar na tabela client_users
  SELECT c.* INTO user_record
  FROM public.client_users c
  WHERE c.id::text = user_id
  AND c.password = user_password;
  
  IF FOUND THEN
    -- Construir JSON com dados do usuário
    user_json := json_build_object(
      'id', user_record.id,
      'first_name', user_record.first_name,
      'last_name', user_record.last_name,
      'email', user_record.email,
      'phone', user_record.phone,
      'success', true
    );
    
    RETURN user_json;
  END IF;
  
  -- Retornar falha se não encontrar
  RETURN json_build_object('success', false, 'message', 'Telefone ou senha incorretos');
END;
$$;
```

#### 2.1.4. Passagem de UserId entre Componentes
```typescript
// components/client-auth/PhoneVerificationForm.tsx
interface PhoneVerificationFormProps {
  onVerified: (phone: string, exists: boolean, userId?: string | null) => void
}

// Utilização em GuestRequestClientButton.tsx
const handlePhoneVerified = (phone: string, exists: boolean, userId: string | null = null) => {
  console.log(`Telefone verificado: ${phone}, Usuário existe: ${exists ? 'Sim' : 'Não'}, UserId: ${userId || 'não fornecido'}`);
  
  // Armazenar o telefone e userId para uso posterior
  setPhone(phone);
  // Também armazenar o userId quando disponível
  if (userId) {
    setUserId(userId);
  }
  
  // ... resto do código
};
```

### 2.2. Melhorias na API

#### 2.2.1. Endpoint de Verificação de Telefone Otimizado
```typescript
// app/api/client-auth/check-phone/route.ts
export async function POST(request: Request) {
  console.log('Iniciando verificação de telefone...');
  try {
    // Criar cliente Supabase
    const supabase = await createClient();
    console.log('Cliente Supabase criado com sucesso');
    
    // ... validação e normalização ...

    // Verificar no cache se o telefone já foi verificado recentemente
    const now = Date.now();
    const cachedResult = phoneCache.get(normalizedPhone);
    if (cachedResult && (now - cachedResult.timestamp < CACHE_EXPIRY)) {
      console.log('Resultado encontrado no cache:', cachedResult);
      return NextResponse.json({
        exists: cachedResult.exists,
        userId: cachedResult.userId
      });
    }

    // Múltiplos métodos de busca implementados aqui...
    
    // MÉTODO 1: Query OR em client_users
    // MÉTODO 2: Query IN com array de variações
    // MÉTODO 3: Consultas individuais para cada variação
    // MÉTODO 4: Verificação em auth.users via RPC
    
    // Exemplo de retorno bem-sucedido:
    if (encontrouUsuario) {
      return NextResponse.json({
        exists: true,
        userId: idEncontrado
      });
    }
  } catch (error) {
    // Tratamento de erro melhorado
  }
}
```

#### 2.2.2. Endpoint de Login com Autenticação Direta
```typescript
// app/api/client-auth/login/route.ts
if (body.userId) {
  console.log('ID de usuário fornecido diretamente:', body.userId);
  userId = body.userId;
  
  try {
    console.log('Tentando autenticação direta para o usuário com ID:', userId);
    
    // Usar a função verify_user_login que criamos
    const { data: authResult, error: authError } = await supabase.rpc('verify_user_login', {
      user_id: userId,
      user_password: password
    });
    
    console.log('Resultado da verificação de login:', {
      sucesso: authResult?.success,
      erro: authError ? authError.message : null
    });
    
    if (authResult && authResult.success === true) {
      console.log('Login verificado com sucesso via RPC');
      return handleSuccessfulLogin(authResult, cookieStore);
    }
  } catch (authError) {
    console.error('Erro ao executar verificação de login:', authError);
  }
}
```

### 2.3. Função para Exibição de Eventos do Promotor

```sql
-- Função SQL que faltava nas migrações
CREATE OR REPLACE FUNCTION public.get_public_promoter_page_data(promoter_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  venue TEXT,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  image_url TEXT,
  ticket_url TEXT,
  description TEXT,
  status TEXT,
  team_id UUID,
  team_name TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.name,
    e.venue,
    e.start_date,
    e.end_date,
    e.image_url,
    e.ticket_url,
    e.description,
    e.status,
    t.id as team_id,
    t.name as team_name
  FROM events e
  JOIN teams t ON e.team_id = t.id
  JOIN team_members tm ON tm.team_id = t.id
  WHERE tm.user_id = promoter_id
  AND e.status = 'active'
  AND e.start_date > NOW() - INTERVAL '6 hours'
  ORDER BY e.start_date ASC;
END;
$$;
```

## 3. Problemas Pendentes e Próximos Passos

### 3.1. Erro de Manipulação de Cookies
```
Error: Cookies can only be modified in a Server Action or Route Handler
```

Este erro ocorre porque o código tenta manipular cookies do lado do cliente, o que não é permitido no Next.js 13+. A solução recomendada é:

1. Separar a lógica cliente/servidor:
```typescript
// lib/supabase/server.ts (para uso exclusivo no servidor)
export const createServerClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => cookies().get(name)?.value,
        set: (name, value, options) => cookies().set(name, value, options),
        remove: (name, options) => cookies().delete(name, options)
      }
    }
  );
};

// lib/supabase/client.ts (para uso no cliente)
export const createBrowserClient = () => {
  // Sem manipulação de cookies
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false
      }
    }
  );
};
```

2. Implementar gerenciamento de sessão exclusivamente via server actions:
```typescript
// app/actions/auth.ts
'use server'

import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

export async function signOut() {
  const cookieStore = cookies();
  const supabase = createClient();
  
  await supabase.auth.signOut();
  
  return { success: true };
}
```

### 3.2. Revisão de Estratégia de Autenticação

A recomendação principal é repensar a estratégia de autenticação:

1. **Não persistir sessões**:
   - Simplifica o gerenciamento de estado
   - Evita conflitos entre diferentes tipos de usuários
   - Resolve vários problemas de cookies e auth

2. **Implementação proposta**:
   - Remover persistência de sessão do cliente Supabase
   - Solicitar telefone e senha a cada acesso
   - Manter apenas o último telefone usado para conveniência
   - Separar claramente interfaces de promotor e cliente

3. **Modificações necessárias**:
```typescript
// hooks/useClientAuth.tsx
const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Remover checagem inicial de sessão:
  useEffect(() => {
    // Apenas definir isLoading como false
    setIsLoading(false);
  }, []);
  
  return (
    <AuthContext.Provider value={{ user, setUser, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};
```

### 3.3. Melhorias na UX de Autenticação

Para tornar a experiência de autenticação frequente mais agradável:

1. **Simplificar o fluxo**:
   - Reduzir para apenas duas etapas (verificação + login/registro)
   - Manter o processo todo em uma única tela modal

2. **Armazenar apenas o telefone**:
   - Utilizar localStorage apenas para o último telefone usado
   - Não persistir outros dados de sessão

3. **Feedback claro**:
   - Adicionar mensagens explícitas sobre qual tipo de usuário deve usar a interface
   - "Esta página é destinada a promotores. Se você é um cliente buscando ingressos, use a página X"

## 4. Conclusão e Recomendações Finais

A refatoração do sistema de autenticação resolveu vários problemas críticos, mas uma abordagem mais fundamental é recomendada para maior robustez:

1. **Princípio de Privilégio Mínimo**:
   - Utilizar funções RPC com SECURITY DEFINER para operações críticas
   - Manter a separação rígida entre operações cliente/servidor

2. **Simplicidade Sobre Conveniência**:
   - Autenticação frequente é preferível à persistência problemática
   - Fluxos claros e separados para diferentes tipos de usuários

3. **Logging e Monitoramento**:
   - Manter logs detalhados para diagnóstico de problemas
   - Implementar telemetria para identificar problemas antes que os usuários reportem

4. **Testes Automatizados**:
   - Implementar testes para fluxos de autenticação
   - Cobrir especialmente casos de borda como formatos de telefone variados

A implementação dessas recomendações resultará em um sistema muito mais robusto, previsível e fácil de manter a longo prazo. 