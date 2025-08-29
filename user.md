# 🎯 **PLANO ULTRA COMPLETO - ESPAÇO DO CLIENTE (USER)**
## **SISTEMA ISOLADO COM AUTENTICAÇÃO POR TELEMÓVEL - ZERO CONFLITOS**

---

## 📋 **ÍNDICE COMPLETO**
1. [🎯 VISÃO GERAL](#visão-geral)
2. [🏗️ ARQUITETURA ISOLADA](#arquitetura-isolada)
3. [🔐 SISTEMA DE AUTENTICAÇÃO](#sistema-de-autenticação)
4. [📱 DESIGN MOBILE-FIRST](#design-mobile-first)
5. [🗂️ ESTRUTURA DE ARQUIVOS](#estrutura-de-arquivos)
6. [💾 MODELO DE DADOS](#modelo-de-dados)
7. [🎨 COMPONENTES UI](#componentes-ui)
8. [🔒 SEGURANÇA & VALIDAÇÃO](#segurança--validação)
9. [📊 REGRAS @REGRASCODACY.MD](#regras-regrascodacymd)
10. [🚀 ROADMAP DE IMPLEMENTAÇÃO](#roadmap-de-implementação)
11. [✅ CHECKLIST DE QUALIDADE](#checklist-de-qualidade)

---

## 🎯 **VISÃO GERAL** <a name="visão-geral"></a>

### **🎪 CONCEITO PRINCIPAL:**
- **URL**: `user.nomedosite.com` (subdomínio dedicado)
- **Público-Alvo**: Clientes que participaram em eventos via promotores
- **Funcionalidade Core**: Dashboard pessoal com histórico de eventos e QR codes
- **Autenticação**: Número de telemóvel + password (100% isolado)
- **Design**: Mobile-first inspirado no promotor + componentes 21st.dev

### **🎯 OBJETIVOS ESPECÍFICOS:**
1. ✅ **Zero Conflitos**: Não afeta `/login`, `/app/*`, `/promotor/*`
2. ✅ **Autenticação Isolada**: Sistema próprio com `client_users`
3. ✅ **Mobile-First**: Otimizado para smartphone (principal uso)
4. ✅ **Histórico Completo**: Eventos passados + próximos + QR codes
5. ✅ **UX Consistente**: Visual alinhado com promotor mas único

---

## 🏗️ **ARQUITETURA ISOLADA** <a name="arquitetura-isolada"></a>

### **🔗 ROTAS COMPLETAMENTE ISOLADAS:**

#### **Autenticação (Isolada):**
```
/user/login              - Login com telemóvel + password
/user/register           - Registo completo do cliente
/user/forgot-password    - Recuperação de password
/user/reset-password     - Reset de password com token
```

#### **Dashboard Principal:**
```
/user/dashboard          - Página principal do cliente
/user/profile           - Perfil e dados pessoais
```

#### **Gestão de Eventos:**
```
/user/events            - Lista todos os eventos
/user/events/upcoming   - Próximos eventos detalhados  
/user/events/past       - Histórico completo
/user/events/[id]       - Detalhes do evento + QR code ativo
/user/events/[id]/qr    - QR code em tela cheia
```

#### **Definições:**
```
/user/settings          - Configurações gerais
/user/settings/profile  - Editar perfil
/user/settings/password - Alterar password
/user/settings/privacy  - Preferências de privacidade
```

### **🛡️ ISOLAMENTO TÉCNICO:**

#### **Middleware Dedicado:**
```typescript
// middleware/clientAuth.ts
export function clientAuthMiddleware(req: NextRequest) {
  // APENAS para rotas /user/*
  // Usa cookies com prefixo 'client_'
  // Valida sessions contra 'client_users'
  // ZERO interferência com outras auths
}
```

#### **Contextos Separados:**
```typescript
// contexts/ClientAuthContext.tsx - ISOLADO
// contexts/ClientSessionContext.tsx - ISOLADO
// NÃO usa AuthProvider principal
```

#### **APIs Dedicadas:**
```
/api/client/auth/*      - Autenticação de clientes
/api/client/profile/*   - Gestão de perfil  
/api/client/events/*    - Dados de eventos do cliente
/api/client/qr/*        - Geração/validação QR codes
```

---

## 🔐 **SISTEMA DE AUTENTICAÇÃO** <a name="sistema-de-autenticação"></a>

### **📱 FLUXO DE LOGIN (TELEMÓVEL):**

#### **Passo 1: Verificação do Número**
```typescript
// ✅ COMPLEXIDADE: 3 pontos
async function checkPhoneExists(phone: string): Promise<ClientCheckResult> {
  if (!phone) return { exists: false, error: 'Número obrigatório' };
  
  const { data } = await supabase
    .from('client_users')
    .select('id, first_name')
    .eq('phone', phone)
    .maybeSingle();
    
  return data ? 
    { exists: true, name: data.first_name } : 
    { exists: false };
}
```

#### **Passo 2A: Login (Cliente Existente)**
```typescript
// ✅ COMPLEXIDADE: 4 pontos  
async function loginClient(phone: string, password: string): Promise<LoginResult> {
  const validationError = validateLoginInput(phone, password);
  if (validationError) return validationError;
  
  const { data } = await supabase.rpc('authenticate_client', {
    p_phone: phone,
    p_password: password
  });
  
  return data?.success ? 
    { success: true, user: data.user } : 
    { success: false, error: 'Credenciais inválidas' };
}
```

#### **Passo 2B: Registo (Cliente Novo)**
```typescript
// ✅ COMPLEXIDADE: 2 pontos
async function registerClient(formData: ClientRegistrationData): Promise<RegisterResult> {
  const validationErrors = validateClientRegistration(formData);
  if (validationErrors.length > 0) return { success: false, errors: validationErrors };
  
  const { data } = await supabase.rpc('register_client_secure', formData);
  return data;
}
```

### **🗃️ DADOS DE REGISTO (MESMOS QUE PROMOTORES):**

#### **Campos Obrigatórios:**
```typescript
interface ClientRegistrationData {
  // ✅ Campos básicos
  phone: string;           // +351XXXXXXXXX (validado)
  first_name: string;      // Nome próprio
  last_name: string;       // Apelido
  email?: string;          // Email (opcional)
  
  // ✅ Dados pessoais
  birth_date?: Date;       // Data nascimento
  gender: 'M' | 'F' | 'O'; // Género
  
  // ✅ Localização (cidade obrigatória)
  city: string;           // Cidade (com autocomplete)
  postal_code?: string;   // Código postal (removido)
  
  // ✅ Segurança
  password: string;       // Password forte (bcrypt)
}
```

#### **Validação Robusta:**
```typescript
// ✅ COMPLEXIDADE: 1 ponto (usando mapa)
const VALIDATION_RULES = {
  phone: (val: string) => /^\+[0-9]{6,15}$/.test(val),
  first_name: (val: string) => val.length >= 2 && val.length <= 50,
  last_name: (val: string) => val.length >= 2 && val.length <= 50,
  email: (val?: string) => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
  city: (val: string) => val.length >= 2 && val.length <= 100,
  password: (val: string) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{12,}$/.test(val)
};

function validateClientRegistration(data: ClientRegistrationData): string[] {
  return Object.entries(VALIDATION_RULES)
    .filter(([field, validator]) => !validator(data[field as keyof ClientRegistrationData]))
    .map(([field]) => `${field} inválido`);
}
```

### **🍪 SESSÕES ISOLADAS:**

#### **Cookies Dedicados:**
```typescript
const CLIENT_COOKIE_CONFIG = {
  name: 'client_session',        // Prefixo único
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60,     // 7 dias
  path: '/user'                  // APENAS rotas /user/*
};
```

#### **JWT Tokens Separados:**
```typescript
// ✅ COMPLEXIDADE: 2 pontos
function generateClientTokens(clientData: ClientUser): TokenPair {
  const payload = {
    id: clientData.id,
    phone: clientData.phone,
    type: 'client',
    iat: Math.floor(Date.now() / 1000)
  };
  
  return {
    accessToken: jwt.sign(payload, process.env.CLIENT_JWT_SECRET!, { expiresIn: '15m' }),
    refreshToken: jwt.sign(payload, process.env.CLIENT_REFRESH_SECRET!, { expiresIn: '7d' })
  };
}
```

---

## 📱 **DESIGN MOBILE-FIRST** <a name="design-mobile-first"></a>

### **🎨 PALETA DE CORES (INSPIRADA NO PROMOTOR):**

#### **Gradientes Principais:**
```css
/* Background principal */
.client-bg {
  background: linear-gradient(135deg, 
    #f1f5f9 0%,     /* slate-50 */
    #ffffff 50%,    /* white */
    #ecfdf5 100%    /* emerald-50 */
  );
}

/* Cards e componentes */
.client-card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(148, 163, 184, 0.1); /* slate-400/10 */
}

/* Elementos decorativos */
.client-blob-1 { background: rgba(16, 185, 129, 0.2); } /* emerald-500/20 */
.client-blob-2 { background: rgba(139, 92, 246, 0.2); } /* violet-500/20 */
.client-blob-3 { background: rgba(245, 158, 11, 0.15); } /* amber-500/15 */
```

#### **Cores Funcionais:**
```css
/* Estados e feedback */
.client-primary { color: #059669; }     /* emerald-600 */
.client-secondary { color: #64748b; }   /* slate-500 */
.client-success { color: #10b981; }     /* emerald-500 */
.client-warning { color: #f59e0b; }     /* amber-500 */
.client-error { color: #ef4444; }       /* red-500 */
```

### **📐 LAYOUT RESPONSIVO:**

#### **Breakpoints Otimizados:**
```typescript
const BREAKPOINTS = {
  mobile: '320px - 639px',    // Principal (80% dos acessos)
  tablet: '640px - 1023px',   // Secundário
  desktop: '1024px+',         // Opcional
} as const;
```

#### **Grid System Mobile-First:**
```css
/* Mobile (padrão) */
.client-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
  padding: 1rem;
}

/* Tablet */
@media (min-width: 640px) {
  .client-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 1.5rem;
    padding: 1.5rem;
  }
}

/* Desktop */
@media (min-width: 1024px) {
  .client-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 2rem;
    padding: 2rem;
    max-width: 1200px;
    margin: 0 auto;
  }
}
```

### **🎭 COMPONENTES INSPIRADOS NO 21ST.DEV:**

#### **Dashboard Cards (Mobile-Optimized):**
```typescript
// ✅ COMPLEXIDADE: 2 pontos
interface ClientStatsCard {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  color: 'emerald' | 'violet' | 'amber' | 'slate';
}

const DASHBOARD_CARDS: ClientStatsCard[] = [
  {
    title: 'Próximos Eventos',
    value: 2,
    icon: <Calendar className="w-6 h-6" />,
    color: 'emerald'
  },
  {
    title: 'Eventos Participados', 
    value: 8,
    icon: <Trophy className="w-6 h-6" />,
    color: 'violet'
  },
  {
    title: 'QR Codes Ativos',
    value: 2,
    icon: <QrCode className="w-6 h-6" />,
    color: 'amber'
  }
];
```

#### **Event Cards (Touch-Friendly):**
```typescript
// ✅ COMPLEXIDADE: 3 pontos
interface EventCardProps {
  event: ClientEvent;
  type: 'upcoming' | 'past';
  onViewQR?: () => void;
}

function EventCard({ event, type, onViewQR }: EventCardProps) {
  const cardStyles = EVENT_CARD_STYLES[type];
  const actionButton = type === 'upcoming' ? 
    <QRButton onClick={onViewQR} /> : 
    <HistoryBadge status={event.attendance_status} />;
    
  return (
    <TouchCard className={cardStyles}>
      <EventImage src={event.flyer_url} />
      <EventDetails event={event} />
      {actionButton}
    </TouchCard>
  );
}
```

---

## 🗂️ **ESTRUTURA DE ARQUIVOS** <a name="estrutura-de-arquivos"></a>

### **📁 ORGANIZAÇÃO COMPLETA:**

```
app/
├── user/                          # 🎯 NAMESPACE ISOLADO
│   ├── layout.tsx                 # Layout base do cliente
│   ├── page.tsx                   # Redirect para /user/dashboard
│   │
│   ├── login/                     # 🔐 AUTENTICAÇÃO
│   │   ├── page.tsx              # Página de login
│   │   └── components/
│   │       ├── PhoneInput.tsx    # Input telemóvel + país
│   │       ├── PasswordInput.tsx # Input password com toggle
│   │       └── LoginForm.tsx     # Form completo
│   │
│   ├── register/                  # 📝 REGISTO
│   │   ├── page.tsx              # Página de registo
│   │   └── components/
│   │       ├── RegistrationForm.tsx  # Form multi-step
│   │       ├── PersonalInfo.tsx      # Step 1: Dados pessoais
│   │       ├── ContactInfo.tsx       # Step 2: Contacto
│   │       └── SecurityInfo.tsx      # Step 3: Password
│   │
│   ├── dashboard/                 # 🏠 DASHBOARD PRINCIPAL
│   │   ├── page.tsx              # Dashboard overview
│   │   └── components/
│   │       ├── StatsCards.tsx    # Cards estatísticas
│   │       ├── UpcomingEvents.tsx # Próximos eventos
│   │       ├── RecentActivity.tsx # Atividade recente
│   │       └── QuickActions.tsx   # Ações rápidas
│   │
│   ├── events/                    # 🎪 GESTÃO EVENTOS
│   │   ├── page.tsx              # Lista todos eventos
│   │   ├── upcoming/
│   │   │   └── page.tsx          # Próximos eventos
│   │   ├── past/
│   │   │   └── page.tsx          # Histórico eventos
│   │   ├── [id]/
│   │   │   ├── page.tsx          # Detalhes evento
│   │   │   └── qr/
│   │   │       └── page.tsx      # QR code tela cheia
│   │   └── components/
│   │       ├── EventCard.tsx     # Card evento
│   │       ├── EventDetails.tsx  # Detalhes completos
│   │       ├── QRCodeDisplay.tsx # Display QR
│   │       └── EventFilters.tsx  # Filtros/pesquisa
│   │
│   ├── settings/                  # ⚙️ CONFIGURAÇÕES
│   │   ├── page.tsx              # Configurações gerais
│   │   ├── profile/
│   │   │   └── page.tsx          # Editar perfil
│   │   ├── password/
│   │   │   └── page.tsx          # Alterar password
│   │   └── components/
│   │       ├── ProfileForm.tsx   # Form edição perfil
│   │       ├── PasswordForm.tsx  # Form nova password
│   │       └── PrivacySettings.tsx # Configurações privacidade
│   │
│   └── components/                # 🧩 COMPONENTES COMPARTILHADOS
│       ├── ClientHeader.tsx      # Header do cliente
│       ├── ClientNavigation.tsx  # Navegação mobile
│       ├── ClientLayout.tsx      # Layout wrapper
│       ├── LoadingStates.tsx     # Estados loading
│       └── ErrorBoundary.tsx     # Error handling
│
├── api/client/                    # 🔌 APIS ISOLADAS
│   ├── auth/
│   │   ├── login/route.ts        # POST /api/client/auth/login
│   │   ├── register/route.ts     # POST /api/client/auth/register
│   │   ├── refresh/route.ts      # POST /api/client/auth/refresh
│   │   └── logout/route.ts       # POST /api/client/auth/logout
│   │
│   ├── profile/
│   │   ├── route.ts              # GET/PUT /api/client/profile
│   │   └── password/route.ts     # PUT /api/client/profile/password
│   │
│   ├── events/
│   │   ├── route.ts              # GET /api/client/events
│   │   ├── upcoming/route.ts     # GET /api/client/events/upcoming
│   │   ├── past/route.ts         # GET /api/client/events/past
│   │   └── [id]/route.ts         # GET /api/client/events/[id]
│   │
│   └── qr/
│       ├── generate/route.ts     # POST /api/client/qr/generate
│       └── validate/route.ts     # POST /api/client/qr/validate
│
├── lib/client/                    # 🛠️ UTILITIES CLIENTE
│   ├── auth.ts                   # Funções autenticação
│   ├── api.ts                    # Client API wrapper
│   ├── validation.ts             # Schemas validação
│   ├── utils.ts                  # Utilities gerais
│   └── constants.ts              # Constantes cliente
│
├── hooks/client/                  # 🪝 HOOKS DEDICADOS
│   ├── useClientAuth.ts          # Hook autenticação
│   ├── useClientEvents.ts        # Hook eventos
│   ├── useClientProfile.ts       # Hook perfil
│   └── useClientQR.ts            # Hook QR codes
│
├── contexts/client/               # 🌍 CONTEXTOS ISOLADOS
│   ├── ClientAuthContext.tsx     # Contexto autenticação
│   ├── ClientSessionContext.tsx  # Contexto sessão
│   └── ClientDataContext.tsx     # Contexto dados
│
├── middleware/
│   └── clientAuth.ts             # Middleware autenticação cliente
│
└── types/
    └── client.ts                 # Types específicos cliente
```

---

## 💾 **MODELO DE DADOS** <a name="modelo-de-dados"></a>

### **🗄️ TABELAS EXISTENTES (REUTILIZADAS):**

#### **client_users (Principal):**
```sql
-- ✅ JÁ EXISTE - Tabela principal dos clientes
CREATE TABLE client_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text UNIQUE NOT NULL,           -- +351XXXXXXXXX
  first_name text NOT NULL,             -- Nome próprio  
  last_name text NOT NULL,              -- Apelido
  email text,                           -- Email (opcional)
  birth_date date,                      -- Data nascimento
  gender text DEFAULT 'M',              -- M/F/O
  postal_code text,                     -- Código postal (legacy)
  city text,                           -- Cidade (obrigatória)
  password_hash text NOT NULL,          -- bcrypt hash
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true,
  is_verified boolean DEFAULT false,
  registration_source text DEFAULT 'user_portal'
);
```

#### **guests (Eventos do Cliente):**
```sql
-- ✅ JÁ EXISTE - Liga clientes aos eventos
CREATE TABLE guests (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id uuid REFERENCES events(id),
  client_user_id uuid REFERENCES client_users(id), -- ✅ Link cliente
  name text NOT NULL,
  phone text NOT NULL,
  qr_code text NOT NULL,
  qr_code_url text,
  checked_in boolean DEFAULT false,
  check_in_time timestamptz,
  created_at timestamptz DEFAULT now(),
  promoter_id uuid,                     -- Promotor responsável
  team_id uuid,                         -- Equipa associada
  gender text DEFAULT 'M',
  source text DEFAULT 'PROMOTER'
);
```

#### **events (Detalhes dos Eventos):**
```sql
-- ✅ JÁ EXISTE - Informações dos eventos
CREATE TABLE events (
  id uuid PRIMARY KEY,
  title text NOT NULL,
  description text,
  event_date timestamptz NOT NULL,
  location text,
  event_flyer_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  -- ... outros campos existentes
);
```

### **🔗 QUERIES OTIMIZADAS:**

#### **Dashboard Stats:**
```sql
-- ✅ FUNÇÃO: Estatísticas do cliente (Complexidade: 2)
CREATE OR REPLACE FUNCTION get_client_dashboard_stats(p_client_id uuid)
RETURNS jsonb
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  stats_result jsonb;
BEGIN
  -- Validar autenticação
  IF p_client_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Cliente ID obrigatório');
  END IF;
  
  -- Calcular estatísticas
  SELECT jsonb_build_object(
    'total_events', COUNT(*),
    'upcoming_events', COUNT(*) FILTER (WHERE e.event_date >= NOW()),
    'past_events', COUNT(*) FILTER (WHERE e.event_date < NOW()),
    'active_qr_codes', COUNT(*) FILTER (WHERE e.event_date >= NOW() AND g.qr_code IS NOT NULL)
  ) INTO stats_result
  FROM guests g
  JOIN events e ON g.event_id = e.id
  WHERE g.client_user_id = p_client_id;
  
  RETURN jsonb_build_object('success', true, 'data', stats_result);
END;
$$;
```

#### **Próximos Eventos:**
```sql
-- ✅ FUNÇÃO: Próximos eventos do cliente (Complexidade: 3)
CREATE OR REPLACE FUNCTION get_client_upcoming_events(
  p_client_id uuid,
  p_limit integer DEFAULT 10
)
RETURNS jsonb
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  events_result jsonb;
BEGIN
  -- Validações
  IF p_client_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Cliente ID obrigatório');
  END IF;
  
  IF p_limit <= 0 OR p_limit > 50 THEN
    p_limit := 10;
  END IF;
  
  -- Buscar eventos futuros
  SELECT jsonb_agg(
    jsonb_build_object(
      'event_id', e.id,
      'title', e.title,
      'description', e.description,
      'event_date', e.event_date,
      'location', e.location,
      'flyer_url', e.event_flyer_url,
      'qr_code', g.qr_code,
      'qr_code_url', g.qr_code_url,
      'guest_name', g.name,
      'checked_in', g.checked_in
    )
    ORDER BY e.event_date ASC
  ) INTO events_result
  FROM guests g
  JOIN events e ON g.event_id = e.id
  WHERE g.client_user_id = p_client_id
    AND e.event_date >= NOW()
  LIMIT p_limit;
  
  RETURN jsonb_build_object(
    'success', true, 
    'data', COALESCE(events_result, '[]'::jsonb)
  );
END;
$$;
```

#### **Histórico de Eventos:**
```sql
-- ✅ FUNÇÃO: Histórico eventos do cliente (Complexidade: 4)
CREATE OR REPLACE FUNCTION get_client_past_events(
  p_client_id uuid,
  p_page integer DEFAULT 1,
  p_limit integer DEFAULT 20
)
RETURNS jsonb
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  events_result jsonb;
  total_count integer;
  offset_value integer;
BEGIN
  -- Validações com early returns
  IF p_client_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Cliente ID obrigatório');
  END IF;
  
  IF p_page <= 0 THEN p_page := 1; END IF;
  IF p_limit <= 0 OR p_limit > 100 THEN p_limit := 20; END IF;
  
  offset_value := (p_page - 1) * p_limit;
  
  -- Contar total
  SELECT COUNT(*) INTO total_count
  FROM guests g
  JOIN events e ON g.event_id = e.id
  WHERE g.client_user_id = p_client_id
    AND e.event_date < NOW();
  
  -- Buscar eventos paginados
  SELECT jsonb_agg(
    jsonb_build_object(
      'event_id', e.id,
      'title', e.title,
      'event_date', e.event_date,
      'location', e.location,
      'flyer_url', e.event_flyer_url,
      'checked_in', g.checked_in,
      'check_in_time', g.check_in_time,
      'attendance_status', CASE 
        WHEN g.checked_in THEN 'attended'
        ELSE 'registered'
      END
    )
    ORDER BY e.event_date DESC
  ) INTO events_result
  FROM guests g
  JOIN events e ON g.event_id = e.id
  WHERE g.client_user_id = p_client_id
    AND e.event_date < NOW()
  OFFSET offset_value
  LIMIT p_limit;
  
  RETURN jsonb_build_object(
    'success', true,
    'data', COALESCE(events_result, '[]'::jsonb),
    'pagination', jsonb_build_object(
      'page', p_page,
      'limit', p_limit,
      'total', total_count,
      'pages', CEIL(total_count::float / p_limit)
    )
  );
END;
$$;
```

### **🔐 RLS POLICIES (SEGURANÇA):**

#### **client_users Policies:**
```sql
-- ✅ RLS para client_users
ALTER TABLE client_users ENABLE ROW LEVEL SECURITY;

-- Clientes só veem seus próprios dados
CREATE POLICY "client_users_own_data" ON client_users
FOR ALL TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Admins podem ver todos (se necessário)
CREATE POLICY "admin_read_client_users" ON client_users
FOR SELECT TO service_role
USING (true);
```

#### **guests Policies (Atualizada):**
```sql
-- ✅ RLS para guests - permitir acesso por client_user_id
CREATE POLICY "guests_client_access" ON guests
FOR SELECT TO authenticated
USING (client_user_id = auth.uid());

-- Inserção via sistema (promotores, etc.)
CREATE POLICY "guests_system_insert" ON guests
FOR INSERT TO authenticated
WITH CHECK (true); -- Controlado por funções RPC
```

---

## 🎨 **COMPONENTES UI** <a name="componentes-ui"></a>

### **🏠 HEADER CLIENTE (Mobile-Optimized):**

```typescript
// ✅ COMPLEXIDADE: 4 pontos
interface ClientHeaderProps {
  user: ClientUser;
  currentPath: string;
}

function ClientHeader({ user, currentPath }: ClientHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const headerTitle = PATH_TITLES[currentPath] || 'TYCAT';
  const showBackButton = currentPath !== '/user/dashboard';
  const avatarInitials = getInitials(user.first_name, user.last_name);
  
  return (
    <header className="bg-white/95 backdrop-blur-lg border-b border-slate-200/50 sticky top-0 z-50">
      <div className="px-4 py-3 flex items-center justify-between">
        {/* Left: Back Button ou Logo */}
        {showBackButton ? (
          <BackButton onClick={() => router.back()} />
        ) : (
          <TycatLogo />
        )}
        
        {/* Center: Title */}
        <h1 className="text-lg font-semibold text-slate-900 truncate">
          {headerTitle}
        </h1>
        
        {/* Right: Avatar + Menu */}
        <AvatarMenu 
          initials={avatarInitials}
          isOpen={isMenuOpen}
          onToggle={() => setIsMenuOpen(!isMenuOpen)}
        />
      </div>
    </header>
  );
}
```

### **📊 DASHBOARD STATS CARDS:**

```typescript
// ✅ COMPLEXIDADE: 2 pontos
interface StatsCardProps {
  stat: ClientStat;
  index: number;
}

function StatsCard({ stat, index }: StatsCardProps) {
  const cardColors = STAT_CARD_COLORS[stat.color];
  const animationDelay = `${index * 100}ms`;
  
  return (
    <div 
      className={`${cardColors.bg} ${cardColors.border} rounded-xl p-4 shadow-sm animate-fade-in`}
      style={{ animationDelay }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className={`${cardColors.icon} p-2 rounded-lg`}>
          {stat.icon}
        </div>
        {stat.trend && <TrendIndicator trend={stat.trend} />}
      </div>
      
      <div className="space-y-1">
        <p className="text-2xl font-bold text-slate-900">
          {stat.value}
        </p>
        <p className="text-sm text-slate-600 font-medium">
          {stat.title}
        </p>
      </div>
    </div>
  );
}
```

### **🎪 EVENT CARD (Touch-Friendly):**

```typescript
// ✅ COMPLEXIDADE: 5 pontos
interface EventCardProps {
  event: ClientEvent;
  type: 'upcoming' | 'past';
  onViewDetails: (id: string) => void;
  onViewQR?: (id: string) => void;
}

function EventCard({ event, type, onViewDetails, onViewQR }: EventCardProps) {
  const isUpcoming = type === 'upcoming';
  const cardStyles = isUpcoming ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200 bg-white';
  const dateFormatted = formatEventDate(event.event_date);
  const timeFormatted = formatEventTime(event.event_date);
  
  const handleCardClick = () => onViewDetails(event.event_id);
  const handleQRClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onViewQR?.(event.event_id);
  };
  
  return (
    <div 
      className={`${cardStyles} rounded-xl p-4 border-2 transition-all duration-200 active:scale-95 cursor-pointer`}
      onClick={handleCardClick}
    >
      <div className="flex gap-3">
        {/* Event Image */}
        <EventImage 
          src={event.flyer_url} 
          alt={event.title}
          className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
        />
        
        {/* Event Details */}
        <div className="flex-grow min-w-0">
          <h3 className="font-semibold text-slate-900 text-sm leading-tight mb-1 truncate">
            {event.title}
          </h3>
          
          <div className="flex items-center gap-1 mb-2">
            <Calendar className="w-3 h-3 text-slate-500" />
            <span className="text-xs text-slate-600">
              {dateFormatted} • {timeFormatted}
            </span>
          </div>
          
          {event.location && (
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3 text-slate-500" />
              <span className="text-xs text-slate-600 truncate">
                {event.location}
              </span>
            </div>
          )}
        </div>
        
        {/* Action Button */}
        <div className="flex-shrink-0 flex flex-col justify-center">
          {isUpcoming && onViewQR ? (
            <QRButton onClick={handleQRClick} />
          ) : (
            <AttendanceStatus status={event.attendance_status} />
          )}
        </div>
      </div>
    </div>
  );
}
```

### **📱 BOTTOM NAVIGATION (Mobile):**

```typescript
// ✅ COMPLEXIDADE: 3 pontos
const NAV_ITEMS = [
  { path: '/user/dashboard', icon: Home, label: 'Início' },
  { path: '/user/events', icon: Calendar, label: 'Eventos' },
  { path: '/user/settings', icon: Settings, label: 'Definições' }
] as const;

function ClientBottomNav({ currentPath }: { currentPath: string }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-slate-200/50 px-4 py-2 z-40">
      <div className="flex justify-around items-center max-w-md mx-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = currentPath.startsWith(item.path);
          const iconColor = isActive ? 'text-emerald-600' : 'text-slate-500';
          const labelColor = isActive ? 'text-emerald-600' : 'text-slate-600';
          
          return (
            <Link
              key={item.path}
              href={item.path}
              className="flex flex-col items-center py-2 px-3 min-w-0 transition-colors duration-200"
            >
              <item.icon className={`w-5 h-5 ${iconColor} mb-1`} />
              <span className={`text-xs font-medium ${labelColor} truncate`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
```

### **🔐 LOGIN/REGISTER FORMS:**

#### **Phone Input Component:**
```typescript
// ✅ COMPLEXIDADE: 4 pontos
interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
}

function PhoneInput({ value, onChange, error, placeholder }: PhoneInputProps) {
  const [country, setCountry] = useState<Country>('PT');
  
  const countryPrefix = COUNTRY_PREFIXES[country];
  const inputPlaceholder = placeholder || PHONE_PLACEHOLDERS[country];
  const hasError = Boolean(error);
  const inputClasses = hasError ? 
    'border-red-300 focus:border-red-500 focus:ring-red-200' :
    'border-slate-300 focus:border-emerald-500 focus:ring-emerald-200';
  
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-700">
        Número de Telemóvel
      </label>
      
      <div className="flex gap-2">
        {/* Country Selector */}
        <CountrySelect 
          value={country}
          onChange={setCountry}
          className="flex-shrink-0"
        />
        
        {/* Phone Input */}
        <div className="flex-grow relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-mono">
            {countryPrefix}
          </div>
          <input
            type="tel"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={inputPlaceholder}
            className={`w-full pl-12 pr-4 py-3 rounded-lg border ${inputClasses} focus:ring-2 focus:ring-opacity-50 transition-colors`}
          />
        </div>
      </div>
      
      {hasError && (
        <p className="text-sm text-red-600 flex items-center gap-1">
          <AlertCircle className="w-4 h-4" />
          {error}
        </p>
      )}
    </div>
  );
}
```

#### **Registration Form (Multi-Step):**
```typescript
// ✅ COMPLEXIDADE: 6 pontos
interface RegistrationFormProps {
  onSubmit: (data: ClientRegistrationData) => Promise<void>;
  isLoading?: boolean;
}

function RegistrationForm({ onSubmit, isLoading }: RegistrationFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<Partial<ClientRegistrationData>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const totalSteps = REGISTRATION_STEPS.length;
  const isFirstStep = currentStep === 1;
  const isLastStep = currentStep === totalSteps;
  const canProceed = validateCurrentStep(currentStep, formData);
  
  const handleNext = () => {
    if (canProceed && !isLastStep) {
      setCurrentStep(prev => prev + 1);
    }
  };
  
  const handleBack = () => {
    if (!isFirstStep) {
      setCurrentStep(prev => prev - 1);
    }
  };
  
  const handleSubmit = async () => {
    if (canProceed && isLastStep) {
      await onSubmit(formData as ClientRegistrationData);
    }
  };
  
  return (
    <div className="max-w-md mx-auto">
      {/* Progress Indicator */}
      <StepProgress current={currentStep} total={totalSteps} />
      
      {/* Step Content */}
      <div className="mt-6">
        {currentStep === 1 && (
          <PersonalInfoStep 
            data={formData} 
            onChange={setFormData}
            errors={errors}
          />
        )}
        {currentStep === 2 && (
          <ContactInfoStep 
            data={formData} 
            onChange={setFormData}
            errors={errors}
          />
        )}
        {currentStep === 3 && (
          <SecurityInfoStep 
            data={formData} 
            onChange={setFormData}
            errors={errors}
          />
        )}
      </div>
      
      {/* Navigation Buttons */}
      <div className="flex justify-between mt-8">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={isFirstStep}
        >
          Voltar
        </Button>
        
        <Button
          onClick={isLastStep ? handleSubmit : handleNext}
          disabled={!canProceed || isLoading}
          loading={isLoading}
        >
          {isLastStep ? 'Criar Conta' : 'Continuar'}
        </Button>
      </div>
    </div>
  );
}
```

---

## 🔒 **SEGURANÇA & VALIDAÇÃO** <a name="segurança--validação"></a>

### **🛡️ VALIDAÇÃO DE INPUT (FRONTEND):**

#### **Schema ZOD Completo:**
```typescript
import { z } from 'zod';

// ✅ COMPLEXIDADE: 1 ponto (usando esquemas)
const ClientRegistrationSchema = z.object({
  // Telemóvel obrigatório
  phone: z.string()
    .min(1, 'Número de telemóvel obrigatório')
    .regex(/^\+[0-9]{6,15}$/, 'Formato de telemóvel inválido'),
  
  // Dados pessoais
  first_name: z.string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(50, 'Nome não pode exceder 50 caracteres')
    .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, 'Nome contém caracteres inválidos'),
    
  last_name: z.string()
    .min(2, 'Apelido deve ter pelo menos 2 caracteres') 
    .max(50, 'Apelido não pode exceder 50 caracteres')
    .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, 'Apelido contém caracteres inválidos'),
    
  email: z.string()
    .email('Email inválido')
    .optional()
    .or(z.literal('')),
    
  birth_date: z.date()
    .max(new Date(), 'Data de nascimento não pode ser futura')
    .refine(date => {
      const age = new Date().getFullYear() - date.getFullYear();
      return age >= 16;
    }, 'Deve ter pelo menos 16 anos')
    .optional(),
    
  gender: z.enum(['M', 'F', 'O'], {
    errorMap: () => ({ message: 'Género inválido' })
  }),
  
  // Localização
  city: z.string()
    .min(2, 'Cidade obrigatória')
    .max(100, 'Nome da cidade muito longo'),
    
  // Segurança
  password: z.string()
    .min(12, 'Password deve ter pelo menos 12 caracteres')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{}|;:,.<>?])/, 
           'Password deve conter: minúscula, MAIÚSCULA, número e símbolo'),
           
  confirm_password: z.string()
}).refine(data => data.password === data.confirm_password, {
  message: 'Passwords não coincidem',
  path: ['confirm_password']
});

export type ClientRegistrationData = z.infer<typeof ClientRegistrationSchema>;
```

#### **Validação em Tempo Real:**
```typescript
// ✅ COMPLEXIDADE: 3 pontos
function useFormValidation<T>(schema: z.ZodSchema<T>) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const validateField = (field: keyof T, value: any) => {
    try {
      const fieldSchema = schema.shape[field];
      fieldSchema.parse(value);
      setErrors(prev => ({ ...prev, [field]: '' }));
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        setErrors(prev => ({ 
          ...prev, 
          [field]: error.errors[0]?.message || 'Valor inválido' 
        }));
      }
      return false;
    }
  };
  
  const validateAll = (data: T) => {
    try {
      schema.parse(data);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach(err => {
          if (err.path.length > 0) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };
  
  return { errors, validateField, validateAll, setErrors };
}
```

### **🔐 BACKEND SECURITY (API ROUTES):**

#### **Middleware de Autenticação:**
```typescript
// ✅ COMPLEXIDADE: 5 pontos
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

interface ClientJWTPayload {
  id: string;
  phone: string;
  type: 'client';
  iat: number;
  exp: number;
}

export async function clientAuthMiddleware(
  request: NextRequest,
  handler: (req: NextRequest, user: ClientJWTPayload) => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    // Extrair token
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? 
      authHeader.substring(7) : 
      request.cookies.get('client_session')?.value;
    
    if (!token) {
      return NextResponse.json(
        { error: 'Token de autenticação obrigatório', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }
    
    // Verificar token
    const payload = jwt.verify(token, process.env.CLIENT_JWT_SECRET!) as ClientJWTPayload;
    
    // Validar payload
    if (payload.type !== 'client') {
      throw new Error('Tipo de token inválido');
    }
    
    // Verificar se cliente ainda existe e está ativo
    const { data: client } = await supabase
      .from('client_users')
      .select('id, is_active')
      .eq('id', payload.id)
      .single();
    
    if (!client || !client.is_active) {
      return NextResponse.json(
        { error: 'Conta inativa ou inexistente', code: 'ACCOUNT_INACTIVE' },
        { status: 403 }
      );
    }
    
    // Executar handler com user autenticado
    return await handler(request, payload);
    
  } catch (error) {
    console.error('Client auth middleware error:', error);
    
    if (error instanceof jwt.TokenExpiredError) {
      return NextResponse.json(
        { error: 'Token expirado', code: 'TOKEN_EXPIRED' },
        { status: 401 }
      );
    }
    
    if (error instanceof jwt.JsonWebTokenError) {
      return NextResponse.json(
        { error: 'Token inválido', code: 'INVALID_TOKEN' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: 'Erro de autenticação', code: 'AUTH_ERROR' },
      { status: 401 }
    );
  }
}
```

#### **Rate Limiting por Cliente:**
```typescript
// ✅ COMPLEXIDADE: 4 pontos
import { LRUCache } from 'lru-cache';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitCache = new LRUCache<string, RateLimitEntry>({
  max: 10000,
  ttl: 15 * 60 * 1000 // 15 minutos
});

const RATE_LIMITS = {
  login: { requests: 5, window: 15 * 60 * 1000 },      // 5 por 15min
  register: { requests: 3, window: 60 * 60 * 1000 },   // 3 por hora
  profile: { requests: 20, window: 60 * 1000 },        // 20 por minuto
  events: { requests: 100, window: 60 * 1000 }         // 100 por minuto
} as const;

export function checkRateLimit(
  identifier: string, 
  action: keyof typeof RATE_LIMITS
): { allowed: boolean; remaining: number; resetTime: number } {
  const limit = RATE_LIMITS[action];
  const key = `${action}:${identifier}`;
  const now = Date.now();
  
  const entry = rateLimitCache.get(key);
  
  if (!entry || now >= entry.resetTime) {
    // Primeira request ou janela expirou
    const newEntry: RateLimitEntry = {
      count: 1,
      resetTime: now + limit.window
    };
    rateLimitCache.set(key, newEntry);
    
    return {
      allowed: true,
      remaining: limit.requests - 1,
      resetTime: newEntry.resetTime
    };
  }
  
  if (entry.count >= limit.requests) {
    // Limite excedido
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime
    };
  }
  
  // Incrementar contador
  entry.count++;
  rateLimitCache.set(key, entry);
  
  return {
    allowed: true,
    remaining: limit.requests - entry.count,
    resetTime: entry.resetTime
  };
}
```

### **🔍 SQL INJECTION PREVENTION:**

#### **Funções RPC Seguras:**
```sql
-- ✅ FUNÇÃO: Login seguro do cliente (Complexidade: 6)
CREATE OR REPLACE FUNCTION authenticate_client(
  p_phone text,
  p_password text
)
RETURNS jsonb
SECURITY DEFINER
SET search_path = public, extensions
LANGUAGE plpgsql
AS $$
DECLARE
  client_record client_users%ROWTYPE;
  password_valid boolean;
  result jsonb;
BEGIN
  -- ✅ 1. SEMPRE validar inputs
  IF p_phone IS NULL OR p_phone = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Número de telemóvel obrigatório',
      'code', 'PHONE_REQUIRED'
    );
  END IF;
  
  IF p_password IS NULL OR p_password = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Password obrigatória',
      'code', 'PASSWORD_REQUIRED'
    );
  END IF;
  
  -- ✅ 2. Validar formato do telemóvel
  IF NOT p_phone ~ '^\+[0-9]{6,15}$' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Formato de telemóvel inválido',
      'code', 'INVALID_PHONE_FORMAT'
    );
  END IF;
  
  -- ✅ 3. Buscar cliente (com rate limiting implícito)
  BEGIN
    SELECT * INTO client_record
    FROM client_users
    WHERE phone = p_phone
      AND is_active = true;
      
    IF NOT FOUND THEN
      -- Log tentativa de login com número inexistente
      INSERT INTO security_logs (event_type, details, ip_address, created_at)
      VALUES (
        'CLIENT_LOGIN_ATTEMPT_UNKNOWN_PHONE',
        jsonb_build_object('phone', p_phone),
        inet_client_addr(),
        NOW()
      );
      
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Credenciais inválidas',
        'code', 'INVALID_CREDENTIALS'
      );
    END IF;
    
  EXCEPTION
    WHEN OTHERS THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Erro interno do servidor',
        'code', 'INTERNAL_ERROR'
      );
  END;
  
  -- ✅ 4. Verificar password com bcrypt
  BEGIN
    SELECT crypt(p_password, client_record.password_hash) = client_record.password_hash
    INTO password_valid;
    
    IF NOT password_valid THEN
      -- Log tentativa de login falhada
      INSERT INTO security_logs (event_type, details, user_id, created_at)
      VALUES (
        'CLIENT_LOGIN_FAILED',
        jsonb_build_object('phone', p_phone, 'reason', 'wrong_password'),
        client_record.id,
        NOW()
      );
      
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Credenciais inválidas',
        'code', 'INVALID_CREDENTIALS'
      );
    END IF;
    
  EXCEPTION
    WHEN OTHERS THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Erro na verificação da password',
        'code', 'PASSWORD_VERIFICATION_ERROR'
      );
  END;
  
  -- ✅ 5. Login bem-sucedido - atualizar último login
  BEGIN
    UPDATE client_users 
    SET updated_at = NOW()
    WHERE id = client_record.id;
    
    -- Log login bem-sucedido
    INSERT INTO security_logs (event_type, user_id, created_at)
    VALUES ('CLIENT_LOGIN_SUCCESS', client_record.id, NOW());
    
  EXCEPTION
    WHEN OTHERS THEN
      -- Não falhar o login por erro de logging
      NULL;
  END;
  
  -- ✅ 6. Retornar dados do cliente (sem password_hash)
  SELECT jsonb_build_object(
    'success', true,
    'user', jsonb_build_object(
      'id', client_record.id,
      'phone', client_record.phone,
      'first_name', client_record.first_name,
      'last_name', client_record.last_name,
      'email', client_record.email,
      'city', client_record.city,
      'is_verified', client_record.is_verified
    )
  ) INTO result;
  
  RETURN result;
  
EXCEPTION
  -- ✅ 7. SEMPRE capturar erros gerais
  WHEN OTHERS THEN
    INSERT INTO error_logs (function_name, error_message, error_detail, created_at)
    VALUES ('authenticate_client', SQLERRM, SQLSTATE, NOW());
    
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Erro interno do servidor',
      'code', 'INTERNAL_ERROR'
    );
END;
$$;

-- ✅ SEMPRE: Revogar acesso público
REVOKE ALL ON FUNCTION authenticate_client FROM PUBLIC;
GRANT EXECUTE ON FUNCTION authenticate_client TO authenticated;
```

---

## 📊 **REGRAS @REGRASCODACY.MD** <a name="regras-regrascodacymd"></a>

### **🚨 APLICAÇÃO OBRIGATÓRIA DAS REGRAS:**

#### **✅ COMPLEXIDADE CICLOMÁTICA - ZERO TOLERÂNCIA:**

**ANTES DE CADA FUNÇÃO:**
```typescript
// ✅ TEMPLATE OBRIGATÓRIO para análise de complexidade
/*
ANÁLISE DE COMPLEXIDADE: [nome_da_função]

CONTAGEM MANUAL:
- Base: 1
- if statements: X
- else if statements: Y  
- && operators: Z
- || operators: W
- ?: ternary: V
- try/catch: U
TOTAL: 1 + X + Y + Z + W + V + U = FINAL

ESTRATÉGIA APLICADA:
- [x] Mapa de configuração
- [ ] Early returns  
- [ ] Função utilitária
- [ ] Divisão por responsabilidade

VERIFICAÇÃO:
✅ TOTAL ≤ 8 pontos
✅ Função tem responsabilidade única
✅ Nomes descritivos
*/
```

#### **📊 EXEMPLOS DE FUNÇÕES CONFORMES:**

**Login Form Handler (Complexidade: 4):**
```typescript
// ✅ COMPLEXIDADE: 4 pontos (1 base + 1 if + 1 try + 1 ||)
async function handleLoginSubmit(formData: LoginFormData): Promise<LoginResult> {
  // Validação prévia (early return)
  if (!formData.phone || !formData.password) {
    return { success: false, error: 'Campos obrigatórios em falta' };
  }
  
  try {
    const response = await clientApi.login(formData);
    return response.success ? 
      { success: true, user: response.user } :
      { success: false, error: response.error || 'Login falhado' };
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: 'Erro de conexão' };
  }
}
```

**Event Card Renderer (Complexidade: 3):**
```typescript
// ✅ COMPLEXIDADE: 3 pontos (1 base + 1 ?: + 1 &&)
function renderEventCard(event: ClientEvent, type: EventType): JSX.Element {
  const cardStyle = type === 'upcoming' ? 'border-emerald-200' : 'border-slate-200';
  const actionButton = type === 'upcoming' ? <QRButton /> : <AttendanceStatus />;
  
  return (
    <div className={cardStyle}>
      <EventDetails event={event} />
      {event.flyer_url && <EventImage src={event.flyer_url} />}
      {actionButton}
    </div>
  );
}
```

#### **🛡️ ESTRATÉGIAS ANTI-COMPLEXIDADE APLICADAS:**

**Estratégia 1: Mapa de Validadores:**
```typescript
// ✅ COMPLEXIDADE: 2 pontos (em vez de 8+ com múltiplos if)
const FIELD_VALIDATORS = {
  phone: (val: string) => /^\+[0-9]{6,15}$/.test(val),
  email: (val: string) => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
  name: (val: string) => val.length >= 2 && val.length <= 50,
  password: (val: string) => val.length >= 12 && /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(val)
} as const;

function validateClientData(data: ClientRegistrationData): ValidationResult {
  const errors = Object.entries(FIELD_VALIDATORS)
    .filter(([field, validator]) => !validator(data[field as keyof ClientRegistrationData]))
    .map(([field]) => `${field} inválido`);
    
  return { isValid: errors.length === 0, errors };
}
```

**Estratégia 2: Configuration-Driven UI:**
```typescript
// ✅ COMPLEXIDADE: 1 ponto (em vez de 10+ com múltiplos if/else)
const DASHBOARD_SECTIONS = {
  stats: { component: StatsCards, props: { stats: 'dashboard_stats' } },
  upcoming: { component: UpcomingEvents, props: { limit: 3 } },
  recent: { component: RecentActivity, props: { limit: 5 } },
  actions: { component: QuickActions, props: { actions: 'client_actions' } }
} as const;

function DashboardLayout({ sections }: { sections: (keyof typeof DASHBOARD_SECTIONS)[] }) {
  return (
    <div className="space-y-6">
      {sections.map(sectionKey => {
        const section = DASHBOARD_SECTIONS[sectionKey];
        return <section.component key={sectionKey} {...section.props} />;
      })}
    </div>
  );
}
```

### **🔐 SECURITY COMPLIANCE:**

#### **✅ SQL Injection Prevention:**
- **SEMPRE** usar queries parametrizadas
- **SEMPRE** validar inputs antes de queries
- **NUNCA** concatenar strings SQL
- **SEMPRE** usar funções RPC com SECURITY DEFINER

#### **✅ Authentication & Authorization:**
- **SEMPRE** verificar JWT tokens
- **SEMPRE** validar permissões por request
- **SEMPRE** usar middleware de auth
- **NUNCA** confiar em dados do frontend

#### **✅ Input Validation:**
- **SEMPRE** validar no frontend E backend
- **SEMPRE** usar schemas ZOD
- **SEMPRE** sanitizar inputs
- **NUNCA** confiar em validação apenas frontend

#### **✅ Error Handling:**
- **SEMPRE** usar try/catch em async functions
- **SEMPRE** log errors para monitoring
- **NUNCA** expor detalhes internos nos errors
- **SEMPRE** retornar responses consistentes

---

## 🚀 **ROADMAP DE IMPLEMENTAÇÃO** <a name="roadmap-de-implementação"></a>

### **📅 FASE 1: FUNDAÇÃO (Semana 1)**

#### **Dia 1-2: Estrutura Base**
```bash
# ✅ TASKS:
□ Criar estrutura de arquivos /user/*
□ Configurar middleware clientAuth
□ Criar contextos isolados (ClientAuthContext, etc.)
□ Configurar rotas API /api/client/*
□ Setup de tipos TypeScript
```

#### **Dia 3-4: Autenticação**
```bash
# ✅ TASKS:
□ Implementar /user/login (phone + password)
□ Implementar /user/register (multi-step form)
□ Criar funções RPC SQL (authenticate_client, register_client_secure)
□ Configurar JWT tokens isolados
□ Implementar rate limiting
```

#### **Dia 5-7: Dashboard Base**
```bash
# ✅ TASKS:
□ Criar /user/dashboard layout
□ Implementar ClientHeader component
□ Criar StatsCards component
□ Implementar ClientBottomNav
□ Criar queries de dashboard stats
```

### **📅 FASE 2: EVENTOS (Semana 2)**

#### **Dia 8-10: Lista de Eventos**
```bash
# ✅ TASKS:
□ Implementar /user/events página principal
□ Criar EventCard component (touch-friendly)
□ Implementar filtros e pesquisa
□ Criar queries upcoming/past events
□ Implementar paginação
```

#### **Dia 11-12: Detalhes & QR Codes**
```bash
# ✅ TASKS:
□ Implementar /user/events/[id] detalhes
□ Criar QRCodeDisplay component
□ Implementar /user/events/[id]/qr tela cheia
□ Criar sistema de QR code ativo/inativo
□ Implementar share functionality
```

#### **Dia 13-14: Histórico**
```bash
# ✅ TASKS:
□ Implementar /user/events/past página
□ Criar AttendanceStatus component
□ Implementar estatísticas de participação
□ Criar filtros por data/local
□ Otimizar queries para performance
```

### **📅 FASE 3: PERFIL & SETTINGS (Semana 3)**

#### **Dia 15-17: Gestão de Perfil**
```bash
# ✅ TASKS:
□ Implementar /user/settings página principal
□ Criar ProfileForm component
□ Implementar /user/settings/profile edição
□ Criar validação de dados em tempo real
□ Implementar upload de avatar (opcional)
```

#### **Dia 18-19: Segurança**
```bash
# ✅ TASKS:
□ Implementar /user/settings/password
□ Criar PasswordForm com validação forte
□ Implementar forgot/reset password flow
□ Criar sistema de sessions ativas
□ Implementar logout de todos devices
```

#### **Dia 20-21: Privacidade**
```bash
# ✅ TASKS:
□ Implementar /user/settings/privacy
□ Criar configurações de notificações
□ Implementar GDPR compliance básico
□ Criar export de dados pessoais
□ Implementar delete account
```

### **📅 FASE 4: OTIMIZAÇÃO (Semana 4)**

#### **Dia 22-24: Performance**
```bash
# ✅ TASKS:
□ Implementar lazy loading de componentes
□ Otimizar queries SQL para mobile
□ Implementar caching de dados
□ Criar service worker para offline
□ Otimizar imagens e assets
```

#### **Dia 25-26: UX/UI Polish**
```bash
# ✅ TASKS:
□ Implementar animações e transições
□ Criar loading states consistentes
□ Implementar error boundaries
□ Otimizar para diferentes screen sizes
□ Criar feedback visual (toasts, etc.)
```

#### **Dia 27-28: Testing & Deploy**
```bash
# ✅ TASKS:
□ Criar testes unitários críticos
□ Implementar testes e2e com Playwright
□ Configurar CI/CD pipeline
□ Setup monitoring e analytics
□ Deploy para staging/production
```

### **🎯 MILESTONES CRÍTICOS:**

#### **✅ Milestone 1 (Dia 7): Autenticação Funcional**
- Login/register funcionando
- JWT tokens isolados
- Dashboard básico acessível

#### **✅ Milestone 2 (Dia 14): Eventos Completos**
- Lista de eventos responsive
- QR codes funcionando
- Histórico com paginação

#### **✅ Milestone 3 (Dia 21): Perfil Completo**
- Edição de perfil
- Alteração de password
- Configurações de privacidade

#### **✅ Milestone 4 (Dia 28): Production Ready**
- Performance otimizada
- Testes passando
- Deploy em produção

---

## ✅ **CHECKLIST DE QUALIDADE** <a name="checklist-de-qualidade"></a>

### **🔍 ANTES DE CADA COMMIT:**

#### **📊 Complexidade Ciclomática:**
```bash
# ✅ OBRIGATÓRIO:
□ Contei manualmente cada if/else/&&/||/?:/case/catch
□ Apliquei fórmula: 1 + operadores = total
□ Confirmei que CADA função ≤ 8 pontos
□ Se > 8: apliquei estratégias anti-complexidade
□ Verifiquei que soma total < original (se refatoração)
```

#### **🛡️ Segurança:**
```bash
# ✅ OBRIGATÓRIO:
□ Todas queries são parametrizadas (zero concatenação SQL)
□ Todos inputs são validados (frontend E backend)
□ JWT tokens verificados em todas rotas protegidas
□ Rate limiting implementado em APIs sensíveis
□ Passwords hasheadas com bcrypt (saltRounds ≥ 12)
□ Error messages não expõem detalhes internos
```

#### **📱 Mobile-First:**
```bash
# ✅ OBRIGATÓRIO:
□ Testado em viewport 320px (mobile pequeno)
□ Touch targets ≥ 44px (accessibility)
□ Navegação funciona com dedos
□ Loading states para conexões lentas
□ Offline graceful degradation
```

#### **🧪 Testing:**
```bash
# ✅ OBRIGATÓRIO:
□ npm run build (sem erros)
□ npm run lint (zero warnings)
□ Testes unitários críticos passando
□ Testado em Chrome mobile + Safari iOS
□ Performance Lighthouse ≥ 90 (mobile)
```

### **🚀 ANTES DE DEPLOY:**

#### **🔒 Security Checklist:**
```bash
# ✅ CRÍTICO:
□ Todas variáveis de ambiente configuradas
□ JWT secrets únicos e seguros (≥ 32 chars)
□ HTTPS obrigatório em produção
□ CORS configurado corretamente
□ Rate limiting ativo
□ Logs de segurança funcionando
```

#### **📊 Performance Checklist:**
```bash
# ✅ CRÍTICO:
□ Queries SQL otimizadas (< 100ms)
□ Imagens otimizadas e lazy loading
□ Bundle size < 500KB (gzipped)
□ First Contentful Paint < 1.5s
□ Time to Interactive < 3.5s (mobile)
□ Caching headers configurados
```

#### **🎯 Functional Checklist:**
```bash
# ✅ CRÍTICO:
□ Login/logout funcionando
□ Registo completo funcionando
□ Dashboard carrega dados corretos
□ Eventos listam corretamente
□ QR codes geram e validam
□ Edição de perfil funciona
□ Alteração de password funciona
□ Navegação mobile smooth
```

### **📈 MONITORING & ANALYTICS:**

#### **🔍 Métricas Obrigatórias:**
```typescript
// ✅ IMPLEMENTAR:
const CLIENT_METRICS = {
  // Performance
  page_load_time: 'Tempo carregamento páginas',
  api_response_time: 'Tempo resposta APIs',
  error_rate: 'Taxa de erros por endpoint',
  
  // Engagement  
  daily_active_users: 'Utilizadores ativos diários',
  session_duration: 'Duração média sessões',
  pages_per_session: 'Páginas por sessão',
  
  // Business
  registration_conversion: 'Taxa conversão registo',
  login_success_rate: 'Taxa sucesso login',
  qr_code_usage: 'Utilização QR codes',
  
  // Technical
  mobile_vs_desktop: 'Distribuição dispositivos',
  browser_compatibility: 'Compatibilidade browsers',
  offline_usage: 'Utilização offline'
} as const;
```

#### **🚨 Alertas Críticos:**
```bash
# ✅ CONFIGURAR:
□ Error rate > 5% (últimos 5min)
□ API response time > 2s (últimos 5min)  
□ Login success rate < 95% (última hora)
□ Registration errors > 10% (última hora)
□ Database connection failures
□ JWT token validation failures
```

### **📋 ACCEPTANCE CRITERIA:**

#### **✅ Critérios de Aceitação Final:**
```bash
# ✅ DEVE PASSAR TUDO:

FUNCIONALIDADE:
□ Cliente consegue registar-se com telemóvel
□ Cliente consegue fazer login com credenciais
□ Dashboard mostra estatísticas corretas
□ Lista de eventos carrega corretamente
□ QR codes geram e são escaneáveis
□ Perfil pode ser editado sem erros
□ Password pode ser alterada com segurança

PERFORMANCE:
□ Página carrega em < 3s (3G lento)
□ Navegação é smooth em dispositivos low-end
□ Offline funciona para páginas já visitadas
□ Bundle size otimizado para mobile

SEGURANÇA:
□ Autenticação isolada (zero conflitos)
□ Dados pessoais protegidos (GDPR)
□ Sessions seguras e expiram corretamente
□ Rate limiting previne abuso

UX/UI:
□ Design consistente com promotor
□ Touch-friendly em todos dispositivos
□ Feedback visual claro para todas ações
□ Acessibilidade básica (contrast, font size)

QUALIDADE CÓDIGO:
□ Complexidade ciclomática ≤ 8 (todas funções)
□ Zero vulnerabilidades críticas
□ Cobertura testes ≥ 80% (funções críticas)
□ Documentação completa para manutenção
```

---

## 🎉 **CONCLUSÃO**

Este plano garante:

### **✅ ZERO CONFLITOS:**
- Sistema 100% isolado do resto da aplicação
- Autenticação independente com `client_users`
- Rotas, APIs e contextos dedicados

### **✅ MOBILE-FIRST:**
- Design otimizado para smartphone
- Touch-friendly navigation
- Performance otimizada para 3G

### **✅ QUALIDADE GARANTIDA:**
- Complexidade ciclomática ≤ 8 (todas funções)
- Segurança bulletproof (SQL injection, XSS, etc.)
- Testes abrangentes e CI/CD

### **✅ UX CONSISTENTE:**
- Visual alinhado com promotor
- Componentes inspirados no 21st.dev
- Feedback e loading states polidos

### **🚀 READY TO IMPLEMENT:**
- Roadmap detalhado de 4 semanas
- Milestones claros e mensuráveis
- Checklists de qualidade obrigatórios

**PRÓXIMO PASSO:** Começar implementação seguindo este plano à risca! 🎯

