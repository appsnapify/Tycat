# Plano de Implementação: Sistema GuestMobile

## Visão Geral
Sistema para permitir que clientes solicitem acesso à guest list através de links de promotores, registrem-se no sistema, façam login e acessem seus QR codes em um dashboard dedicado.

## Requisitos Principais
- Sistema de autenticação separado para clientes
- Verificação inicial apenas com número de telefone
- Registro de novos usuários com dados completos (nome, data de nascimento, código postal, sexo, email, senha)
- Login para usuários existentes
- Dashboard de cliente para visualização de QR codes
- Manter associação com promotores para rastreamento/comissões

## Arquitetura Técnica
- Tabelas separadas para dados de usuários clientes
- APIs dedicadas para autenticação de clientes e solicitação de guest list
- Componentes de UI para fluxo em etapas e dashboard

## Etapas de Implementação

### Fase 1: Estrutura de Dados (Semana 1)
1. **Criar tabela de usuários clientes no Supabase**
   - `client_users`: id, phone (unique), email (unique), first_name, last_name, birth_date, postal_code, gender, created_at, updated_at
   - Configurar RLS (Row Level Security) apropriada

2. **Modificar tabela de guests para suportar novo relacionamento**
   - Adicionar `client_user_id` (referência para `client_users.id`)
   - Manter campos existentes: event_id, promoter_id, team_id

3. **Configurar políticas de acesso e segurança**
   - Definir políticas para que clientes vejam apenas seus próprios dados
   - Manter políticas existentes para administradores/organizadores

### Fase 2: Sistema de Autenticação (Semana 2)
1. **Desenvolver APIs de autenticação para clientes**
   - `/api/client-auth/check-phone`: Verificar se telefone já está registrado
   - `/api/client-auth/register`: Registrar novo usuário cliente
   - `/api/client-auth/login`: Autenticar usuário existente
   - `/api/client-auth/logout`: Encerrar sessão

2. **Implementar gerenciamento de sessões**
   - Utilizar JWT tokens armazenados em cookies seguros
   - Implementar middleware para verificação de autenticação

3. **Criar provedores de contexto para autenticação de cliente**
   - `ClientAuthProvider.tsx`: Gerenciar estado de autenticação do cliente
   - Hooks: `useClientAuth` para acessar funções e estado de autenticação

### Fase 3: Interface de Solicitação de Guest List (Semana 3)
1. **Novo componente GuestRequestClient**
   - Substituir atual GuestListPageClient na rota `/promo/[...params]`
   - Implementar fluxo em etapas: Telefone → Login/Registro → Confirmação

2. **Componentes de formulário**
   - `PhoneVerificationForm`: Apenas telefone com validação
   - `ClientLoginForm`: Telefone + senha
   - `ClientRegistrationForm`: Todos os campos para novo usuário

3. **API para solicitação de guest list**
   - `/api/guest-request`: Registrar solicitação e gerar QR code
   - Vincular ao usuário cliente, evento, promotor e equipe

### Fase 4: Dashboard do Cliente (Semana 4)
1. **Criar estrutura básica do dashboard**
   - Rota protegida: `/cliente/dashboard`
   - Layout com navegação e áreas para diferentes seções

2. **Implementar visualização de QR codes**
   - Componente para listar todos os QR codes do cliente
   - Filtros por evento, data, etc.

3. **Desenvolver visualização de eventos**
   - Lista de eventos para os quais o cliente tem acesso
   - Detalhes como data, hora, localização

### Fase 5: Testes e Refinamentos (Semana 5)
1. **Testes de integração**
   - Fluxo completo desde link do promotor até dashboard
   - Verificação de funcionamento em diferentes dispositivos

2. **Testes de segurança**
   - Verificar isolamento entre dados de diferentes clientes
   - Testar proteção contra ataques comuns (injection, XSS, CSRF)

3. **Refinamentos de UX/UI**
   - Melhorias visuais e de usabilidade com base em feedback
   - Otimização para dispositivos móveis

### Fase 6: Deploy e Monitoramento (Semana 6)
1. **Lançamento em ambiente de produção**
   - Migração cuidadosa sem afetar sistema existente
   - Estratégia de rollback em caso de problemas

2. **Configurar monitoramento**
   - Rastrear erros e problemas
   - Monitorar performance e uso

3. **Documentação final**
   - Atualizar documentação técnica
   - Criar guias de usuário para clientes

## Detalhamento Técnico

### Modelo de Dados

```sql
-- Tabela de usuários clientes
CREATE TABLE public.client_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT,
  birth_date DATE,
  postal_code TEXT,
  gender TEXT,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Adicionar coluna à tabela guests
ALTER TABLE public.guests ADD COLUMN client_user_id UUID REFERENCES client_users(id);
```

### API de Autenticação (Exemplos de Endpoints)

1. **Check Phone**
```typescript
// Verificar se telefone existe
POST /api/client-auth/check-phone
Body: { phone: "+351912345678" }
Response: { exists: boolean }
```

2. **Register**
```typescript
// Registrar novo cliente
POST /api/client-auth/register
Body: {
  phone: "+351912345678",
  email: "cliente@exemplo.com",
  first_name: "João",
  last_name: "Silva",
  birth_date: "1990-01-01",
  postal_code: "1000-001",
  gender: "M",
  password: "senha_segura"
}
Response: { success: boolean, user: {...}, token: "jwt_token" }
```

3. **Login**
```typescript
// Login de cliente existente
POST /api/client-auth/login
Body: { phone: "+351912345678", password: "senha_segura" }
Response: { success: boolean, user: {...}, token: "jwt_token" }
```

### Componente de Solicitação de Guest (Exemplo)

```tsx
// app/promo/[...params]/GuestRequestClient.tsx
export default function GuestRequestClient({ eventId, promoterId, teamId }) {
  const [step, setStep] = useState<'PHONE' | 'LOGIN' | 'REGISTER' | 'SUCCESS'>('PHONE');
  const [phone, setPhone] = useState('');
  const [userExists, setUserExists] = useState(false);
  
  // Verificação de telefone
  const checkPhone = async () => {
    const res = await fetch('/api/client-auth/check-phone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone })
    });
    const data = await res.json();
    setUserExists(data.exists);
    setStep(data.exists ? 'LOGIN' : 'REGISTER');
  };
  
  // Componente renderizado baseado na etapa atual
  const renderStepComponent = () => {
    switch(step) {
      case 'PHONE':
        return <PhoneVerificationForm onSubmit={checkPhone} />;
      case 'LOGIN':
        return <ClientLoginForm phone={phone} onSuccess={handleLoginSuccess} />;
      case 'REGISTER':
        return <ClientRegistrationForm 
                 phone={phone} 
                 eventId={eventId}
                 promoterId={promoterId}
                 teamId={teamId}
                 onSuccess={handleRegisterSuccess} 
               />;
      case 'SUCCESS':
        return <SuccessMessage redirectTo="/cliente/dashboard" />;
    }
  };
  
  return (
    <div className="guest-request-container">
      <EventDetails eventId={eventId} />
      {renderStepComponent()}
    </div>
  );
}
```

## Dependências

1. **Bibliotecas Necessárias**
   - @supabase/supabase-js: Para interação com o Supabase
   - next-auth: Para gestão de autenticação (opcional)
   - zod: Para validação de formulários
   - react-hook-form: Para gestão de formulários
   - qrcode: Para geração de QR codes

2. **Integrações**
   - Supabase Auth (para armazenamento seguro de senhas)
   - Supabase Database (para armazenamento de dados)
   - Storage para QR codes (opcional)

## Considerações Adicionais

1. **Segurança**
   - Implementar rate limiting para prevenir ataques de força bruta
   - Armazenar senhas com hash seguro (bcrypt ou similar)
   - Usar tokens JWT com expiração apropriada

2. **Performance**
   - Otimizar consultas ao banco de dados
   - Implementar caching onde apropriado
   - Lazy loading para componentes pesados

3. **UX/UI**
   - Design mobile-first para formulários
   - Feedback claro durante todas as etapas
   - Tratamento adequado de erros com mensagens amigáveis

4. **Escalabilidade**
   - Estruturar código para permitir adições futuras
   - Preparar para futuras integrações (e.g., envio de email) 