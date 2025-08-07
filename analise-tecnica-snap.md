# Análise Técnica Completa - Plataforma SNAP

## 1. Visão Geral da Plataforma

### 1.1 Arquitetura Técnica
- **Framework:** Next.js 13 (App Router)
- **Banco de Dados:** PostgreSQL via Supabase
- **Autenticação:** Supabase Auth
- **UI:** Tailwind CSS + shadcn/ui
- **Infraestrutura:** Vercel com integração Supabase

### 1.2 Estrutura de Projeto
O projeto está estruturado com base no App Router do Next.js, com uma combinação de Server e Client Components. A estrutura de diretórios apresenta algumas inconsistências, com funcionalidades similares organizadas em diferentes locais:

- `/app` - Componentes e páginas principais
- `/app/app` - Área restrita com dashboards de usuários
- `/components` - Componentes compartilhados
- `/hooks` - Hooks personalizados
- `/lib` - Utilitários e configurações
- `/api` - Rotas de API do Next.js

### 1.3 Perfis de Usuário
O sistema comporta múltiplos perfis de usuário, cada um com seu próprio dashboard e permissões:
1. **Organizador** - Gerencia eventos, organizações e equipes
2. **Chefe de Equipe** - Gerencia equipes de promotores 
3. **Promotor** - Participa de eventos vendendo ingressos

## 2. Componentes e Funcionalidades Analisadas

### 2.1 Sistema de Autenticação
**Arquivos principais:**
- `hooks/use-auth.tsx`
- `hooks/useClientAuth.tsx`
- `app/app/_providers/auth-provider.tsx`

**Análise:**
- Sistema de autenticação baseado em Supabase com múltiplos hooks
- Implementação de normalização de papéis para compatibilidade (`promoter`/`promotor`)
- Uso de metadados do usuário para armazenar informações adicionais
- Cache local com `localStorage` para persistência entre sessões

**Problemas Identificados:**
- **Duplicação:** `use-auth.tsx` e `useClientAuth.tsx` compartilham lógica similar
- **Inconsistência:** Múltiplas funções para normalização de papéis em diferentes arquivos
- **Segurança:** Confiança excessiva em metadados para controle de acesso
- **Desempenho:** Verificações repetitivas de permissões em cada renderização

### 2.2 Dashboard do Organizador
**Arquivos principais:**
- `app/app/organizador/dashboard/page.tsx`
- `app/app/organizador/eventos/page.tsx`
- `app/app/organizador/layout.tsx`
- `components/dashboard/metric-card.tsx`
- `components/dashboard/team-members-list.tsx`
- `components/dashboard/activity-feed.tsx`

**Análise:**
- Dashboard completo com KPIs, gerenciamento de eventos e equipes
- Implementação de verificações de permissão baseadas em RLS
- Funcionalidades para criar, editar e gerenciar eventos
- Sistema de check-in com scanner QR
- Componentes reutilizáveis para cards de métricas e feeds de atividade
- Implementação de verificações defensivas (`checkTableExists`, `checkColumnExists`) para lidar com evoluções de esquema
- Sistema de filtros para eventos (por status e busca textual)
- Funcionalidade para duplicar eventos com um clique

**Problemas Identificados:**
- **Desempenho:** Consultas de banco de dados não otimizadas (múltiplas chamadas sequenciais)
- **Robustez:** Tratamento de erros inconsistente, com algumas falhas silenciosas
- **Código:** Componentes excessivamente grandes (dashboard com 1287 linhas, página de eventos com 792 linhas)
- **UX:** Feedback limitado durante estados de carregamento
- **Arquitetura:** Duplicação de lógica entre dashboard e página de eventos
- **Performance:** Falta de paginação nas listagens de eventos e equipes
- **Estado:** Múltiplos `useState` que poderiam ser consolidados em um reducer
- **Verificações:** Código extenso com verificações defensivas que aumentam a complexidade
- **Segurança:** Alguns endpoints não verificam adequadamente permissões
- **Debounce:** Falta de debounce nas funções de busca em tempo real

### 2.3 Gestão de Eventos
**Arquivos principais:**
- `app/app/organizador/eventos/page.tsx`
- `app/app/organizador/eventos/[id]/page.tsx`
- `app/app/organizador/eventos/[id]/EventDetailsClient.tsx`
- `app/app/organizador/eventos/checkin/page.tsx`

**Análise:**
- Sistema completo de gestão de eventos
- Funcionalidade de check-in com scanner QR
- Gestão de convidados e estatísticas
- Integração com equipes e promotores

**Problemas Identificados:**
- **UX:** Interface de scanner QR com problemas de compatibilidade
- **Segurança:** Validação insuficiente de códigos QR
- **Desempenho:** Atualizações em tempo real não implementadas
- **Código:** Componentes com responsabilidades misturadas

### 2.4 Sistema de Equipes
**Arquivos principais:**
- `app/app/chefe-equipe/dashboard/page.tsx`
- `app/app/chefe-equipe/equipe/page.tsx`
- `app/app/promotor/equipes/page.tsx`

**Análise:**
- Gerenciamento de equipes com chefes e promotores
- Sistema de códigos de equipe para ingresso
- Relatórios de desempenho por equipe
- Integração com eventos e organizações

**Problemas Identificados:**
- **Escalabilidade:** Problemas com equipes grandes (sem paginação)
- **UX:** Fluxo de ingresso em equipe com problemas
- **Segurança:** Verificação insuficiente em algumas operações de equipe
- **Código:** Lógica duplicada entre diferentes perfis de usuário

### 2.5 Sistema Financeiro
**Arquivos principais:**
- `app/app/chefe-equipe/financeiro/page.tsx` (incompleto)
- `app/app/chefe-equipe/wallet/page.tsx`
- `supabase/migrations/teams_schema.sql`
- `app/api/admin/wallet/schema.ts`

**Tabelas principais:**
- `commissions` - Regras de comissões por evento/equipe
- `commission_payments` - Pagamentos agendados de comissões
- `commission_payment_items` - Itens individuais nos pagamentos
- `payment_confirmations` - Confirmações de pagamentos realizados
- `financial_transactions` - Registo de todas as transações financeiras

**Análise:**
- Sistema financeiro em desenvolvimento inicial com esquema de banco de dados bem definido
- Estrutura de comissões e pagamentos planejada com relações entre equipes e eventos
- Funções SQL criadas para cálculos de comissões e pagamentos
- Dashboard inicial para chefes de equipe visualizarem comissões
- Definição de regras para diferentes tipos de comissões (percentual, valor fixo)
- APIs para processamento de pagamentos e confirmações
- Tabelas de banco de dados com campos para auditoria (created_at, updated_at)

**Problemas Identificados:**
- **Segurança crítica:** RLS configurado mas não habilitado nas tabelas `financial_transactions` e `reports`
- **Arquitetura:** Algumas funções SQL usam lógica complexa que seria mais adequada na camada de aplicação
- **Código:** Funções de cálculo de comissões com hardcoded values e falta de parametrização
- **UX:** Interface incompleta com placeholders em vez de funcionalidade real
- **Escalabilidade:** Falta de índices adequados para consultas financeiras frequentes
- **Segurança:** Uso excessivo de service_role em operações financeiras que contornam o RLS
- **Validação:** Verificações insuficientes em transações financeiras (valores negativos, etc.)
- **Auditoria:** Sistema de logs para transações financeiras não implementado
- **Arquitetura:** Falta de definição clara de fluxos financeiros entre organizadores, equipes e promotores

### 2.6 APIs e Backend
**Arquivos principais:**
- `app/api/guest-count/route.ts`
- `app/api/guests/route.ts`
- `app/api/organizations/route.ts`
- `app/api/teams/route.ts`
- `app/api/check-in/route.ts`
- `app/api/events/route.ts`
- `app/actions/`

**Padrões identificados:**
- APIs REST seguindo convenções do Next.js App Router
- Uso de Server Actions para operações seguras
- Funções SQL para operações complexas

**Análise:**
- APIs REST bem estruturadas com separação clara de responsabilidades
- Uso de service role para operações privilegiadas (com problemas de segurança)
- Verificações de autenticação em rotas protegidas via middleware
- Funções SQL para operações complexas (joins, agregações)
- Implementação de rate limiting em alguns endpoints
- Tratamento de erros com status codes apropriados
- Respostas JSON estruturadas consistentemente
- Cache-Control headers aplicados em endpoints adequados
- Middlewares para validação e sanitização de entradas

**Problemas Identificados:**
- **Segurança crítica:** Uso de service role sem verificações adequadas de permissão
- **Performance:** Consultas SQL não otimizadas em endpoints de alto volume
- **Arquitetura:** Uso inconsistente entre Server Actions e Route Handlers
- **Robustez:** Tratamento de erros incompleto em alguns endpoints
- **Padrões:** Inconsistência nos formatos de resposta entre diferentes APIs
- **Validação:** Sanitização de entradas insuficiente em alguns endpoints
- **Logs:** Falta de logging estruturado para facilitar debugging
- **Paginação:** Implementação inconsistente ou ausente em endpoints que retornam listas
- **Rate Limiting:** Proteção insuficiente contra abusos em endpoints críticos
- **Documentação:** Falta de documentação em formato OpenAPI/Swagger
- **Testes:** Cobertura de testes automatizados insuficiente para as APIs
- **Headers:** Falta de CORS configurado corretamente para alguns endpoints

### 2.7 Banco de Dados e Supabase
**Tabelas principais:**
- `organizations` - Organizações que gerenciam eventos
- `events` - Eventos criados pelos organizadores
- `teams` - Equipes de promotores
- `team_members` - Relação entre usuários e equipes
- `guests` - Lista de convidados para eventos
- `commissions` - Regras de comissões para equipes
- `users` - Autenticação e perfis via Supabase Auth
- `financial_transactions` - Transações financeiras
- `reports` - Relatórios gerados pelo sistema

**Estrutura e Configuração:**
- PostgreSQL via Supabase com políticas RLS
- Triggers para automatizar processos (auditoria, atualizações)
- Funções SQL para operações complexas (`get_team_details`, `create_organization`)
- Buckets de Storage para arquivos (flyers, logos, banners)
- Índices em chaves primárias e estrangeiras
- Esquema relacional bem definido com chaves estrangeiras
- Migrations controladas via arquivos SQL versionados

**Análise:**
- Modelo de dados bem estruturado com relações claras
- Uso de RLS para controle de acesso granular por linha
- Funções SQL para encapsular lógica de negócio complexa
- Triggers para manter integridade dos dados
- Bucket de storage com permissões configuradas
- Sistema de migrations para controle de versão do schema
- Tipos enumerados para campos com valores fixos
- Valor padrão para campos críticos
- Restrições de integridade (unique, not null, check)

**Problemas Identificados:**
- **Segurança crítica:** ~~RLS não habilitado em tabelas financeiras~~ (RESOLVIDO: tabelas não implementadas removidas)
- **Desempenho:** Índices ausentes em colunas frequentemente consultadas (ex: `created_at`, `status`)
- **Arquitetura:** Funções SQL com lógica de negócio que deveria estar na aplicação
- **Segurança:** Políticas RLS com condições muito permissivas (`USING (true)`)
- **Manutenção:** Funções complexas com mais de 100 linhas difíceis de manter
- **Qualidade:** Inconsistência na nomenclatura de tabelas e colunas
- **Design:** Falta de schema específico para separar tabelas por domínio
- **Documentação:** Falta de comentários em tabelas e colunas
- **Escalabilidade:** Ausência de particionamento em tabelas que crescerão muito (guests, events)
- **Validações:** Constraints insuficientes para garantir integridade dos dados
- **Segurança:** Triggers que podem executar em contexto elevado sem verificação adequada
- **Manutenção:** Dependências circulares entre funções e triggers
- **Arquitetura:** Duplicação de dados em algumas tabelas para facilitar consultas

### 2.8 Sistema de Guest List
**Arquivos principais:**
- `app/app/organizador/eventos/[id]/GuestListTable.tsx`
- `app/guest-list/page.tsx`
- `app/api/guests/route.ts`

**Análise:**
- Sistema de lista de convidados integrado a eventos
- Interface para usuários registrarem presença
- Geração de códigos QR individuais
- Sistema de checkin com validação

**Problemas Identificados:**
- **Escalabilidade:** Carregamento de todos os convidados sem paginação
- **Performance:** Renderização ineficiente de listas grandes
- **UX:** Mensagens de confirmação inconsistentes
- **Segurança:** Verificações insuficientes em alguns endpoints

### 2.9 Contextos e Estado Global
**Arquivos principais:**
- `app/contexts/organization-context.tsx`
- `app/app/contexts/organization-context.tsx` (duplicado)
- `app/app/_providers/auth-provider.tsx`

**Análise:**
- Uso de React Context para estado global
- Múltiplos contextos para diferentes funcionalidades
- Implementação de providers para acesso a dados

**Problemas Identificados:**
- **Duplicação:** Contextos repetidos em diferentes locais
- **Arquitetura:** Falta de uma estratégia consistente de gerenciamento de estado
- **Performance:** Possível re-renderização desnecessária devido a contextos mal otimizados
- **Manutenibilidade:** Difícil rastrear o fluxo de dados entre contextos

## 3. Problemas Críticos Identificados

### 3.1 Segurança
1. **RLS não habilitado em tabelas críticas:** Tabelas `financial_transactions` e `reports` têm políticas RLS definidas, mas RLS não está habilitado, permitindo acesso não autorizado
2. **Uso inadequado de service role:** Várias APIs usam service role sem verificações adequadas de permissão
3. **Validação insuficiente:** Múltiplos endpoints aceitam dados sem validação adequada
4. **Confiança em metadados:** Controle de acesso baseado em metadados de usuário que podem ser manipulados
5. **Política RLS permissivas:** Algumas tabelas têm políticas como `USING (true)` que permitem acesso muito amplo
6. **Exposição de erros:** Detalhes de erros expostos nos logs e às vezes para o cliente
7. **Proteção contra ataques comum insuficiente:** Falta de proteção contra CSRF, XSS e SQL Injection em alguns pontos

### 3.2 Arquitetura
1. **Duplicação de código:** Múltiplas implementações das mesmas funcionalidades (hooks de autenticação, contextos)
2. **Componentes monolíticos:** Arquivos com mais de 1000 linhas que contêm muita responsabilidade
3. **Estrutura de projeto inconsistente:** Mesmos tipos de componentes em diretórios diferentes
4. **Gerenciamento de estado ineficiente:** Uso excessivo de useState sem consolidação via useReducer
5. **Falta de separação de responsabilidades:** Componentes que misturam UI, lógica de negócio e chamadas API
6. **Padrões inconsistentes:** Diferentes abordagens para resolver problemas similares
7. **Cacheamento ausente:** Falta de estratégia para cacheamento de dados frequentemente acessados

### 3.3 Performance
1. **Consultas de banco de dados ineficientes:** Múltiplas chamadas sequenciais onde uma única mais complexa seria adequada
2. **Falta de paginação:** Carregamento de listas completas sem paginação, causando problemas com conjuntos grandes
3. **Renderização desnecessária:** Dependências mal definidas em hooks de efeito causando re-renderizações
4. **Assets não otimizados:** Imagens e mídia sem otimização adequada
5. **Falta de lazy loading:** Componentes grandes carregados de uma vez
6. **Webhooks e handlers síncronos:** Operações que poderiam ser assíncronas bloqueando o fluxo principal

### 3.4 UX/Design
1. **Inconsistência visual:** Diferentes padrões de UI para funções similares
2. **Feedback limitado:** Estados de loading e erro com feedback insuficiente
3. **Acessibilidade:** Problemas de contraste, falta de atributos ARIA
4. **Formulários mal otimizados:** Validações inconsistentes e mensagens de erro confusas
5. **Fluxos de usuário quebrados:** Interrupções em fluxos críticos como check-in e financeiro

## 4. Recomendações e Plano de Implementação

### 4.1 Correções de Segurança Prioritárias

1. **Habilitar RLS em todas as tabelas críticas:**

```sql
-- REMOVIDO: Tabelas financial_transactions e reports não existem na implementação atual
-- O sistema financeiro real usa: commissions, commission_payments, commission_payment_items
-- Estas tabelas já possuem RLS adequado implementado
```

2. **Remover uso de service role e substituir por RLS adequado:**

```typescript
// ANTES (inseguro)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// DEPOIS (seguro)
export async function checkGuestCount(req: Request) {
  const supabase = createServerComponentClient({ cookies });
  const { eventId } = await req.json();
  
  // Verificar permissão explicitamente
  const { data: userOrg } = await supabase
    .from('user_organizations')
    .select('organization_id')
    .eq('user_id', session.user.id)
    .single();
    
  const { data: event } = await supabase
    .from('events')
    .select('organization_id')
    .eq('id', eventId)
    .single();
    
  if (event?.organization_id !== userOrg?.organization_id) {
    return new Response(JSON.stringify({ error: "Não autorizado" }), { 
      status: 403 
    });
  }
  
  // Continuar com a operação autorizada
  const { data, error } = await supabase
    .from('guests')
    .select('id', { count: 'exact' })
    .eq('event_id', eventId);
    
  // Resto do código...
}
```

### 4.2 Melhorias de Arquitetura

1. **Consolidar hooks de autenticação:**

```typescript
// hooks/useAuth.tsx (versão consolidada)
export function useAuth() {
  // Implementação única que serve para todos os casos
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Funções normalizadas de papel
  const normalizeRole = (role: string | null): string => {
    if (!role) return 'desconhecido';
    const roleLower = role.toLowerCase();
    
    const roleMap: Record<string, string> = {
      'promoter': 'promotor',
      'promotor': 'promotor',
      'team-leader': 'chefe-equipe',
      'chefe-equipe': 'chefe-equipe', 
      'organizer': 'organizador',
      'organizador': 'organizador'
    };
    
    return roleMap[roleLower] || role;
  };
  
  // Resto da implementação...
}

// Remover useClientAuth.tsx (deprecated)
```

2. **Implementação de uma arquitetura mais modular:**

```typescript
// Exemplo de arquitetura de pasta proposta
/app
  /core
    /auth        // Autenticação centralizada
    /api         // Funções de API reutilizáveis
    /hooks       // Hooks compartilhados
    /contexts    // Contextos globais
    /utils       // Utilitários
  /features
    /eventos     // Componentes e lógica de eventos
    /financeiro  // Componentes e lógica financeira
    /equipes     // Componentes e lógica de equipes
    /guest-list  // Componentes e lógica de lista de convidados
  /ui
    /components  // Componentes de UI reutilizáveis
    /layouts     // Layouts de páginas
    /templates   // Templates de páginas
```

### 4.3 Melhorias de Performance

1. **Implementar paginação nas listas:**

```typescript
// components/dashboard/TeamList.tsx (com paginação)
export function TeamList({ organizationId }) {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [teams, setTeams] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  
  useEffect(() => {
    async function loadTeams() {
      const { data, count, error } = await supabase
        .from('teams')
        .select('*', { count: 'exact' })
        .eq('organization_id', organizationId)
        .range((page - 1) * limit, page * limit - 1);
        
      if (data) {
        setTeams(data);
        setTotalCount(count || 0);
      }
    }
    
    loadTeams();
  }, [organizationId, page, limit]);
  
  return (
    <div>
      {/* Renderizar tabela de times */}
      <Pagination 
        currentPage={page} 
        totalPages={Math.ceil(totalCount / limit)}
        onPageChange={setPage}
      />
    </div>
  );
}
```

2. **Otimizar consultas de banco de dados:**

```typescript
// ANTES (múltiplas consultas)
const { data: events } = await supabase
  .from('events')
  .select('*')
  .eq('organization_id', organizationId);
  
const { data: teamStats } = await supabase
  .from('teams')
  .select('*')
  .eq('organization_id', organizationId);
  
// DEPOIS (consulta única mais eficiente)
const { data } = await supabase.rpc('get_organization_dashboard_data', {
  org_id: organizationId
});

// Função SQL correspondente:
CREATE OR REPLACE FUNCTION get_organization_dashboard_data(org_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'events', (
      SELECT json_agg(e) FROM (
        SELECT * FROM events WHERE organization_id = org_id
      ) e
    ),
    'teamStats', (
      SELECT json_agg(t) FROM (
        SELECT * FROM teams WHERE organization_id = org_id
      ) t
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 4.4 Plano de Implementação Faseado

**Fase 1: Segurança (Urgente)**
- Habilitar RLS em todas as tabelas
- Remover uso inseguro de service role
- Implementar validação adequada em endpoints
- Corrigir políticas RLS permissivas

**Fase 2: Estabilidade e Performance**
- Implementar paginação em todas as listas
- Otimizar consultas de banco de dados
- Adicionar índices apropriados
- Consolidar hooks e contextos duplicados

**Fase 3: UX e Interface**
- Melhorar feedback durante estados de loading
- Padronizar componentes de UI
- Implementar tratamento de erros consistente
- Melhorar acessibilidade

**Fase 4: Refatoração Arquitetural**
- Reorganizar estrutura de pastas
- Dividir componentes monolíticos
- Implementar testes automatizados
- Documentar API e componentes

### 4.5 Métricas de Sucesso
- **Segurança:** Todas as tabelas com RLS habilitado e políticas adequadas
- **Performance:** Tempo de carregamento do dashboard < 2 segundos
- **Código:** Nenhum componente com mais de 300 linhas
- **UX:** Fluxos de usuário sem interrupções ou estados inconsistentes

## 5. Análise Detalhada por Componente

### 5.1 Análise Detalhada da Estrutura de Banco de Dados

#### 5.1.1 Tabelas Principais
- **organizations**: Armazena dados de organizações
- **events**: Eventos criados pelas organizações
- **teams**: Equipes de promotores
- **team_members**: Associação entre usuários e equipes
- **guests**: Convidados para eventos


#### 5.1.2 Relações Principais
- Organizações têm múltiplos eventos (1:N)
- Equipes podem pertencer a organizações (N:1)
- Usuários podem ser membros de equipes (N:N via team_members)
- Eventos têm múltiplos convidados (1:N)
- Equipes participam de eventos (N:N)

#### 5.1.3 Problemas Específicos
- Algumas tabelas têm colunas redundantes (is_active e active em teams)
- Falta de restrições de integridade referencial em algumas relações
- Índices ausentes em colunas frequentemente usadas em WHERE
- Coluna organization_id presente em múltiplas tabelas com diferentes regras de validação

### 5.2 Análise Detalhada das Políticas de RLS

#### 5.2.1 Políticas Existentes
- Políticas para guests, teams, ~~financial_transactions e reports~~ (tabelas removidas)
- Maioria baseada em associação de usuário com organização

#### 5.2.2 Problemas Específicos
- ~~RLS não habilitado em tabelas com políticas definidas~~ (RESOLVIDO: tabelas fantasma removidas)
- Algumas políticas com expressões complexas difíceis de manter
- Ausência de políticas para operações DELETE em algumas tabelas
- Políticas inconsistentes entre tabelas relacionadas

### 5.3 Análise Detalhada das Funções SQL

#### 5.3.1 Funções Principais
- get_team_details: Obtém detalhes de uma equipe
- get_leader_dashboard_data: Dados do dashboard para chefes de equipe
- create_organization: Cria uma nova organização
- check_phone_exists: Verifica se um telefone já está cadastrado

#### 5.3.2 Problemas Específicos
- Algumas funções com dados mockados (get_commission_data)
- Funções complexas com múltiplas responsabilidades
- Inconsistência no uso de SECURITY DEFINER vs. INVOKER
- Tratamento de erro inconsistente entre funções

### 5.4 Análise Detalhada dos Dashboards

#### 5.4.1 Dashboard do Organizador
- Interface completa com KPIs, lista de eventos e equipes
- Funcionalidades para criar e gerenciar eventos
- Acesso a relatórios e estatísticas

#### 5.4.2 Dashboard do Chefe de Equipe
- Gerenciamento de equipe e promotores
- Relatórios de desempenho
- Funcionalidades financeiras (parcialmente implementadas)

#### 5.4.3 Dashboard do Promotor
- Visualização de eventos associados
- Informações sobre comissões
- Acesso a materiais promocionais

#### 5.4.4 Problemas Comuns
- Inconsistência visual entre dashboards
- Duplicação de componentes com comportamentos similares
- Estados de loading inconsistentes
- Tratamento de erro variável

### 5.5 Análise Detalhada das APIs

#### 5.5.1 APIs Principais
- /api/guests: Gerenciamento de convidados
- /api/guest-count: Contagem de convidados por evento
- /api/organizations: Gerenciamento de organizações
- /api/teams: Gerenciamento de equipes

#### 5.5.2 Problemas Específicos
- Uso excessivo de service role em algumas rotas
- Validação inconsistente de dados de entrada
- Tratamento de erro variável entre endpoints
- Ausência de documentação clara sobre parâmetros e retornos

## 6. Roadmap de Implementação

### Fase 1: Correções Críticas (Imediato)
- Habilitar RLS em todas as tabelas
- Corrigir problemas de segurança em APIs
- Resolver bugs críticos em fluxos principais

### Fase 2: Refatoração de Arquitetura (1-2 meses)
- Consolidar estrutura de diretórios
- Refatorar sistema de autenticação
- Extrair componentes compartilhados
- Normalizar contextos

### Fase 3: Otimização (2-3 meses)
- Implementar paginação
- Otimizar consultas SQL
- Adicionar índices de banco de dados
- Melhorar performance do frontend

### Fase 4: Melhorias de UX (3-4 meses)
- Padronizar componentes visuais
- Melhorar sistema de feedback
- Otimizar fluxos de usuário
- Implementar melhorias de acessibilidade

### Fase 5: Expansão e Novos Recursos (4+ meses)
- Completar sistema financeiro
- Implementar relatórios avançados
- Desenvolver funcionalidades de integração
- Melhorar recursos de analytics

## 7. Recomendações Técnicas Específicas

### 7.1 Recomendações para o Sistema de Autenticação
- Consolidar hooks `use-auth.tsx` e `useClientAuth.tsx` em um único hook
- Implementar um sistema de controle de acesso baseado em papéis (RBAC)
- Migrar de metadados para um sistema mais robusto de permissões
- Implementar refresh token automático para melhor UX

### 7.2 Recomendações para o Banco de Dados
- Adicionar índices em: `events(organization_id)`, `guests(event_id, checked_in)`, `team_members(user_id)`
- Consolidar colunas redundantes (remover duplicação em `is_active`/`active`)
- Revisar e atualizar todas as restrições de integridade referencial
- Migrar dados mockados para implementações reais em funções SQL

### 7.3 Recomendações para a Estrutura de Código
- Adotar um padrão consistente para a estrutura de diretórios
- Implementar um sistema de componentes com Storybook ou similar
- Adotar TypeScript de forma mais rigorosa em toda a aplicação
- Padronizar nomenclatura de funções e variáveis em todo o código

### 7.4 Recomendações para a Experiência do Usuário
- Implementar um sistema de feedback com toast consistente
- Criar componentes de loading padronizados para todos os dashboards
- Revisar e otimizar fluxos de usuário críticos (check-in, ingresso em equipe)
- Implementar um tema visual consistente em toda a aplicação

## 8. Conclusão

A plataforma SNAP possui uma base sólida com funcionalidades abrangentes para gestão de eventos, equipes e ingressos. No entanto, existem problemas significativos que precisam ser abordados, especialmente em termos de segurança, arquitetura e desempenho.

Os principais pontos de atenção são:
1. A segurança do banco de dados com RLS incompleto
2. A arquitetura fragmentada com duplicação de código
3. O desempenho com consultas não otimizadas
4. A experiência do usuário inconsistente

Com a implementação do plano de melhorias proposto, a plataforma poderá se tornar mais robusta, segura e escalável, fornecendo uma melhor experiência para todos os usuários e facilitando a manutenção e evolução futura do sistema.

Este documento representa uma análise técnica abrangente do estado atual da plataforma SNAP e deve servir como guia para futuras melhorias e otimizações. As recomendações aqui apresentadas devem ser priorizadas de acordo com as necessidades do negócio e os recursos disponíveis.

## 9. Análise de Riscos e Mitigação

### 9.1 Riscos de Segurança
1. **Exposição de Dados** - O RLS não habilitado em tabelas críticas pode levar à exposição de dados sensíveis
   - **Mitigação:** Habilitar imediatamente RLS e revisar todas as políticas existentes
   - **Impacto:** Alto
   - **Probabilidade:** Alta

2. **Injeção SQL** - Uso de service role sem validação adequada de entrada pode permitir injeção SQL
   - **Mitigação:** Implementar prepared statements e validação robusta de entrada
   - **Impacto:** Crítico
   - **Probabilidade:** Média

3. **Elevação de Privilégios** - Dependência de metadados para controle de acesso permite falsificação
   - **Mitigação:** Migrar para sistema RBAC baseado em tabelas dedicadas
   - **Impacto:** Alto
   - **Probabilidade:** Média

4. **Cross-Site Scripting (XSS)** - Validação insuficiente em campos renderizados na UI
   - **Mitigação:** Implementar sanitização consistente de dados e CSP
   - **Impacto:** Médio
   - **Probabilidade:** Média

### 9.2 Riscos de Desempenho
1. **Degradação em Produção** - Falta de paginação e consultas não otimizadas podem causar timeout
   - **Mitigação:** Implementar paginação e otimizar consultas críticas
   - **Impacto:** Alto
   - **Probabilidade:** Alta com crescimento

2. **Gargalos em Banco de Dados** - Índices ausentes causam varreduras completas de tabela
   - **Mitigação:** Adicionar índices em colunas frequentemente consultadas
   - **Impacto:** Médio
   - **Probabilidade:** Alta com crescimento

3. **Re-renderizações Excessivas** - Estados globais não otimizados causam re-renderizações em cascata
   - **Mitigação:** Implementar memoização e fragmentação de estado
   - **Impacto:** Médio
   - **Probabilidade:** Média

### 9.3 Riscos de Manutenibilidade
1. **Dificuldade em Expandir** - Duplicação de código e falta de padrões dificulta novos recursos
   - **Mitigação:** Refatorar para remover duplicação e padronizar interfaces
   - **Impacto:** Médio
   - **Probabilidade:** Alta

2. **Complexidade Crescente** - Funções monolíticas dificultam entendimento e modificação
   - **Mitigação:** Dividir em funções menores com responsabilidade única
   - **Impacto:** Médio
   - **Probabilidade:** Alta com tempo

3. **Perda de Conhecimento** - Falta de documentação dificulta onboarding de novos desenvolvedores
   - **Mitigação:** Criar documentação técnica e comentários de código
   - **Impacto:** Médio
   - **Probabilidade:** Alta com rotatividade

## 10. Ações Imediatas Recomendadas

Para resolver os problemas mais críticos identificados, recomendamos as seguintes ações imediatas:

### 10.1 Correções de Segurança (Prioridade 1)
```sql
-- Habilitar RLS para tabelas críticas
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Revisar e corrigir políticas existentes
CREATE POLICY financial_transactions_insert_policy ON public.financial_transactions
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);
```

### 10.2 Correções de Estrutura (Prioridade 1)
1. Consolidar os hooks de autenticação em um único hook `useAuth` em `hooks/useAuth.tsx`
2. Normalizar funções de validação de papéis em um módulo compartilhado
3. Implementar validação consistente em todos os endpoints de API

### 10.3 Correções de Desempenho (Prioridade 2)
```sql
-- Adicionar índices em colunas frequentemente consultadas
CREATE INDEX IF NOT EXISTS idx_guests_event_id_checked_in ON public.guests(event_id, checked_in);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON public.team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_events_organization_id_date ON public.events(organization_id, date);
```

### 10.4 Correções de UX (Prioridade 2)
1. Implementar componentes de feedback consistentes (toast, loading, error)
2. Unificar estilos entre os diferentes dashboards
3. Padronizar mensagens de erro e validação

## 11. Métricas e Monitoramento

Para avaliar o sucesso das melhorias implementadas, recomendamos acompanhar as seguintes métricas:

### 11.1 Métricas de Desempenho
- Tempo médio de resposta de APIs críticas
- Tempo de carregamento inicial das páginas do dashboard
- Uso de recursos do banco de dados (CPU, memória)
- Número de timeout em consultas

### 11.2 Métricas de Experiência do Usuário
- Taxa de conclusão de fluxos críticos (check-in, criação de evento)
- Taxa de erro em formulários
- Tempo médio para completar tarefas comuns
- Net Promoter Score (NPS) para diferentes tipos de usuário

### 11.3 Métricas de Desenvolvimento
- Tempo médio para implementar novos recursos
- Taxa de bugs relatados por linha de código
- Cobertura de testes
- Tempo médio para resolver tickets de suporte

Estas métricas devem ser coletadas antes e depois das melhorias para quantificar o impacto das mudanças implementadas.

## 12. Estimativa de Esforço

Para implementar todas as melhorias recomendadas, estimamos o seguinte esforço:

| Fase | Descrição | Estimativa (horas) | Complexidade |
|------|-----------|-------------------|--------------|
| 1 | Correções Críticas de Segurança | 40-60 | Alta |
| 2 | Refatoração de Arquitetura | 120-160 | Alta |
| 3 | Otimizações de Desempenho | 80-100 | Média |
| 4 | Melhorias de UX | 100-140 | Média |
| 5 | Documentação e Testes | 60-80 | Baixa |
| **Total** | | **400-540** | |

Este esforço pode ser distribuído ao longo de 3-6 meses dependendo dos recursos disponíveis e das prioridades do negócio.

## 13. Exemplos de Implementação

Esta seção fornece exemplos de código para implementar algumas das principais melhorias recomendadas.

### 13.1 Refatoração do Sistema de Autenticação

#### Módulo de Normalização de Papéis
```typescript
// lib/auth/roles.ts
export type UserRole = 'organizador' | 'chefe-equipe' | 'promotor';

const ROLE_MAPPING: Record<string, UserRole> = {
  // Mapeamentos para normalização
  'promoter': 'promotor',
  'team-leader': 'chefe-equipe',
  'organizer': 'organizador',
  
  // Valores já normalizados
  'promotor': 'promotor',
  'chefe-equipe': 'chefe-equipe',
  'organizador': 'organizador'
};

/**
 * Normaliza um papel de usuário para o formato padrão do sistema
 */
export function normalizeRole(role: string | null | undefined): UserRole {
  if (!role) return 'promotor'; // Valor padrão
  
  const normalizedRole = ROLE_MAPPING[role.toLowerCase()];
  if (!normalizedRole) {
    console.warn(`Papel não reconhecido: ${role}, usando 'promotor' como padrão`);
    return 'promotor';
  }
  
  return normalizedRole;
}

/**
 * Obtém o URL do dashboard para um papel específico
 */
export function getDashboardUrl(role: string | null | undefined): string {
  const normalizedRole = normalizeRole(role);
  
  return `/app/${normalizedRole}/dashboard`;
}

/**
 * Verifica se um usuário tem permissão para um papel específico
 */
export function hasRolePermission(userRole: string | null | undefined, requiredRole: UserRole): boolean {
  const normalizedUserRole = normalizeRole(userRole);
  
  // Definir hierarquia de permissões
  // Organizador > Chefe de Equipe > Promotor
  if (normalizedUserRole === 'organizador') return true;
  if (normalizedUserRole === 'chefe-equipe' && requiredRole !== 'organizador') return true;
  if (normalizedUserRole === 'promotor' && requiredRole === 'promotor') return true;
  
  return false;
}
```

#### Hook de Autenticação Unificado
```typescript
// hooks/useAuth.tsx
import { createContext, useContext, useState, useEffect } from 'react';
import { User, createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import { normalizeRole, getDashboardUrl, UserRole } from '@/lib/auth/roles';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  userRole: UserRole;
  signIn: (email: string, password: string) => Promise<User | null>;
  signOut: () => Promise<void>;
  hasPermission: (requiredRole: UserRole) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const supabase = createClientComponentClient();
  
  // Obter role normalizado do usuário
  const userRole = user ? normalizeRole(user.user_metadata?.role) : 'promotor';
  
  // Verificar se um usuário tem permissão para um papel
  const hasPermission = (requiredRole: UserRole): boolean => {
    if (!user) return false;
    return hasRolePermission(userRole, requiredRole);
  };
  
  // Carregar usuário ao inicializar
  useEffect(() => {
    const loadUser = async () => {
      try {
        setIsLoading(true);
        const { data } = await supabase.auth.getUser();
        setUser(data.user);
      } catch (error) {
        console.error('Erro ao carregar usuário:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadUser();
    
    // Configurar listener para mudanças de autenticação
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user || null);
      }
    );
    
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [supabase.auth]);
  
  // Login
  const signIn = async (email: string, password: string): Promise<User | null> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) throw error;
      
      // Redirecionar para dashboard apropriado
      if (data.user) {
        const role = normalizeRole(data.user.user_metadata?.role);
        router.push(getDashboardUrl(role));
        return data.user;
      }
      
      return null;
    } catch (error) {
      console.error('Erro ao fazer login:', error);
      throw error;
    }
  };
  
  // Logout
  const signOut = async (): Promise<void> => {
    try {
      await supabase.auth.signOut();
      router.push('/login');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      throw error;
    }
  };
  
  // Prover contexto
  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        isLoading, 
        userRole, 
        signIn, 
        signOut, 
        hasPermission 
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Hook para usar autenticação
export function useAuth() {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  
  return context;
}
```

### 13.2 Componentes Reutilizáveis

#### Componente de Loading
```typescript
// components/ui/loading.tsx
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingProps {
  size?: 'sm' | 'md' | 'lg';
  fullScreen?: boolean;
  text?: string;
  className?: string;
}

export function Loading({ 
  size = 'md', 
  fullScreen = false, 
  text, 
  className 
}: LoadingProps) {
  // Mapear tamanhos para classes
  const sizeClass = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  }[size];
  
  const Wrapper = ({ children }: { children: React.ReactNode }) => {
    if (fullScreen) {
      return (
        <div className="fixed inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-50">
          {children}
        </div>
      );
    }
    
    return <>{children}</>;
  };
  
  return (
    <Wrapper>
      <div className={cn(
        "flex flex-col items-center justify-center",
        fullScreen ? "h-full w-full" : "py-4",
        className
      )}>
        <Loader2 className={cn("animate-spin text-primary", sizeClass)} />
        {text && (
          <p className="mt-2 text-muted-foreground">{text}</p>
        )}
      </div>
    </Wrapper>
  );
}
```

#### Componente de Card para KPIs
```typescript
// components/ui/kpi-card.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Loading } from "@/components/ui/loading";

interface KpiCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  description?: string;
  loading?: boolean;
  trend?: {
    value: number;
    label: string;
    positive?: boolean;
  };
  className?: string;
}

export function KpiCard({
  title,
  value,
  icon,
  description,
  loading = false,
  trend,
  className,
}: KpiCardProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon && <div className="h-4 w-4 text-muted-foreground">{icon}</div>}
      </CardHeader>
      <CardContent>
        {loading ? (
          <Loading size="sm" />
        ) : (
          <>
            <div className="text-2xl font-bold">{value}</div>
            {description && (
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            )}
            {trend && (
              <div className="flex items-center mt-2">
                <span className={cn(
                  "text-xs",
                  trend.positive ? "text-green-500" : "text-red-500"
                )}>
                  {trend.positive ? "↑" : "↓"} {trend.value}%
                </span>
                <span className="text-xs text-muted-foreground ml-1">
                  {trend.label}
                </span>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
```

### 13.3 Otimização de Consultas

#### Função SQL Otimizada
```sql
-- Função otimizada para obter dados do dashboard de promotor
CREATE OR REPLACE FUNCTION public.get_promoter_dashboard_data(user_id_param UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
BEGIN
    -- Otimizada para usar JOINs em vez de múltiplas queries
    WITH user_team AS (
        -- Obter equipe do promotor (limite 1)
        SELECT 
            tm.team_id,
            t.name AS team_name,
            t.organization_id
        FROM 
            team_members tm
            JOIN teams t ON tm.team_id = t.id
        WHERE 
            tm.user_id = user_id_param
        LIMIT 1
    ),
    team_stats AS (
        -- Estatísticas da equipe (apenas se o usuário tiver uma equipe)
        SELECT
            COUNT(g.id) AS total_guests,
            COUNT(CASE WHEN g.checked_in THEN 1 END) AS total_checkins,
            COUNT(DISTINCT g.event_id) AS events_count
        FROM
            guests g
            JOIN user_team ut ON g.team_id = ut.team_id
        WHERE
            g.created_at >= (CURRENT_DATE - INTERVAL '30 days')
    ),
    organization_info AS (
        -- Informações da organização (apenas se o time tiver uma organização)
        SELECT
            o.id,
            o.name,
            o.logo_url
        FROM
            organizations o
            JOIN user_team ut ON o.id = ut.organization_id
        LIMIT 1
    )
    -- Construir resultado consolidado
    SELECT json_build_object(
        'user', json_build_object(
            'id', user_id_param
        ),
        'team', CASE 
            WHEN ut.team_id IS NULL THEN NULL
            ELSE json_build_object(
                'id', ut.team_id,
                'name', ut.team_name,
                'stats', json_build_object(
                    'total_guests', COALESCE(ts.total_guests, 0),
                    'total_checkins', COALESCE(ts.total_checkins, 0),
                    'events_count', COALESCE(ts.events_count, 0)
                )
            )
        END,
        'organization', CASE
            WHEN oi.id IS NULL THEN NULL
            ELSE json_build_object(
                'id', oi.id,
                'name', oi.name,
                'logo_url', oi.logo_url
            )
        END
    ) INTO result
    FROM 
        user_team ut
        LEFT JOIN team_stats ts ON true
        LEFT JOIN organization_info oi ON true;
    
    RETURN result;
END;
$$;
```

#### Componente com Paginação
```typescript
// components/guests/GuestList.tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Table, TableBody, TableCell, TableHead, 
  TableHeader, TableRow 
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { 
  ChevronFirst, ChevronLast, ChevronLeft, 
  ChevronRight, Search 
} from 'lucide-react';
import { Loading } from '@/components/ui/loading';

interface Guest {
  id: string;
  name: string;
  email: string;
  phone?: string;
  checked_in: boolean;
  created_at: string;
}

interface GuestListProps {
  eventId: string;
}

export function GuestList({ eventId }: GuestListProps) {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalGuests, setTotalGuests] = useState(0);
  const pageSize = 20;
  
  // Carregar dados paginados
  const loadGuests = async (page: number, query: string = '') => {
    try {
      setLoading(true);
      
      const response = await fetch(
        `/api/guests?eventId=${eventId}&page=${page}&pageSize=${pageSize}&search=${query}`
      );
      
      if (!response.ok) throw new Error('Erro ao carregar convidados');
      
      const data = await response.json();
      
      setGuests(data.guests);
      setTotalPages(Math.ceil(data.total / pageSize));
      setTotalGuests(data.total);
    } catch (error) {
      console.error('Erro ao carregar convidados:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Buscar ao montar e quando mudar página ou busca
  useEffect(() => {
    loadGuests(currentPage, searchQuery);
  }, [currentPage, eventId]);
  
  // Lidar com busca
  const handleSearch = () => {
    setCurrentPage(1); // Voltar para primeira página
    loadGuests(1, searchQuery);
  };
  
  // Renderização condicional de loading
  if (loading && currentPage === 1) {
    return <Loading text="Carregando convidados..." />;
  }
  
  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar convidado..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>
        <Button onClick={handleSearch}>Buscar</Button>
      </div>
      
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Check-in</TableHead>
              <TableHead>Data</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {guests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-4">
                  {loading ? (
                    <Loading size="sm" text="Carregando..." />
                  ) : (
                    'Nenhum convidado encontrado'
                  )}
                </TableCell>
              </TableRow>
            ) : (
              guests.map((guest) => (
                <TableRow key={guest.id}>
                  <TableCell>{guest.name}</TableCell>
                  <TableCell>{guest.email}</TableCell>
                  <TableCell>{guest.phone || '-'}</TableCell>
                  <TableCell>
                    {guest.checked_in ? (
                      <span className="text-green-500">Confirmado</span>
                    ) : (
                      <span className="text-gray-500">Pendente</span>
                    )}
                  </TableCell>
                  <TableCell>{new Date(guest.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      
      {/* Paginação */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Mostrando {Math.min(pageSize, guests.length)} de {totalGuests} convidados
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
          >
            <ChevronFirst className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <span className="text-sm">
            Página {currentPage} de {totalPages}
          </span>
          
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
          >
            <ChevronLast className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
```

### 13.4 Validação de Dados em APIs

#### Exemplo de API com Validação Robusta
```typescript
// app/api/events/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { z } from 'zod';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// Schema de validação para criação de evento
const CreateEventSchema = z.object({
  title: z.string().min(3, 'Título deve ter pelo menos 3 caracteres'),
  description: z.string().optional(),
  date: z.string().refine(val => !isNaN(Date.parse(val)), 'Data inválida'),
  time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:MM)'),
  location: z.string().min(3, 'Local deve ter pelo menos 3 caracteres'),
  organization_id: z.string().uuid('ID de organização inválido'),
  type: z.enum(['public', 'private', 'guest-list']).optional(),
  guest_list_settings: z.object({
    max_guests: z.number().int().positive().optional(),
    require_approval: z.boolean().optional(),
    allow_plus_one: z.boolean().optional(),
  }).optional(),
});

// Schema para atualização de evento (todos os campos opcionais)
const UpdateEventSchema = CreateEventSchema.partial();

export async function POST(req: NextRequest) {
  try {
    // Obter cliente Supabase com cookies
    const supabase = createRouteHandlerClient({ cookies });
    
    // Verificar autenticação
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }
    
    // Obter e validar dados
    const body = await req.json();
    
    try {
      // Tentar validar com Zod
      const validatedData = CreateEventSchema.parse(body);
      
      // Verificar se o usuário tem acesso à organização
      const { data: userOrg, error: orgError } = await supabase
        .from('user_organizations')
        .select('role')
        .eq('user_id', session.user.id)
        .eq('organization_id', validatedData.organization_id)
        .single();
      
      if (orgError || !userOrg) {
        return NextResponse.json(
          { error: 'Você não tem permissão para criar eventos nesta organização' },
          { status: 403 }
        );
      }
      
      // Inserir evento
      const { data: event, error } = await supabase
        .from('events')
        .insert({
          ...validatedData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_active: true,
          is_published: body.is_published || false,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      return NextResponse.json(
        { success: true, event },
        { status: 201 }
      );
    } catch (validationError) {
      // Erro de validação do Zod
      if (validationError instanceof z.ZodError) {
        return NextResponse.json(
          { 
            error: 'Dados inválidos', 
            details: validationError.errors 
          },
          { status: 400 }
        );
      }
      
      throw validationError;
    }
  } catch (error) {
    console.error('Erro ao criar evento:', error);
    
    return NextResponse.json(
      { error: 'Erro ao processar solicitação' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    // Obter cliente Supabase com cookies
    const supabase = createRouteHandlerClient({ cookies });
    
    // Verificar autenticação
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }
    
    // Obter parâmetros da URL
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID do evento é obrigatório' },
        { status: 400 }
      );
    }
    
    // Obter e validar dados
    const body = await req.json();
    
    try {
      // Tentar validar com Zod
      const validatedData = UpdateEventSchema.parse(body);
      
      // Verificar se o evento existe e pertence a uma organização do usuário
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('organization_id')
        .eq('id', id)
        .single();
      
      if (eventError || !event) {
        return NextResponse.json(
          { error: 'Evento não encontrado' },
          { status: 404 }
        );
      }
      
      // Verificar permissão na organização
      const { data: userOrg, error: orgError } = await supabase
        .from('user_organizations')
        .select('role')
        .eq('user_id', session.user.id)
        .eq('organization_id', event.organization_id)
        .single();
      
      if (orgError || !userOrg) {
        return NextResponse.json(
          { error: 'Você não tem permissão para editar este evento' },
          { status: 403 }
        );
      }
      
      // Atualizar evento
      const { data: updatedEvent, error } = await supabase
        .from('events')
        .update({
          ...validatedData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      
      return NextResponse.json(
        { success: true, event: updatedEvent },
        { status: 200 }
      );
    } catch (validationError) {
      // Erro de validação do Zod
      if (validationError instanceof z.ZodError) {
        return NextResponse.json(
          { 
            error: 'Dados inválidos', 
            details: validationError.errors 
          },
          { status: 400 }
        );
      }
      
      throw validationError;
    }
  } catch (error) {
    console.error('Erro ao atualizar evento:', error);
    
    return NextResponse.json(
      { error: 'Erro ao processar solicitação' },
      { status: 500 }
    );
  }
}
```

Estes exemplos demonstram como implementar algumas das principais melhorias recomendadas neste documento, seguindo boas práticas de desenvolvimento e padrões modernos de React e TypeScript. 

## 14. Conclusão Final e Status da Análise

Após uma análise sistemática e abrangente de toda a plataforma SNAP, identificamos a arquitetura completa do sistema, seus pontos fortes e áreas que precisam de melhorias. A análise incluiu:

### 14.1 Componentes Analisados

✅ **Middleware de Autorização**: Sistema completo de controle de acesso baseado em papéis implementado no middleware.ts
✅ **Sistema de Autenticação**: Múltiplos hooks de autenticação (`use-auth` e `useClientAuth`) com funcionalidades duplicadas
✅ **APIs**: Endpoints para gerenciamento de organizações, equipes, convidados e contagem de convidados
✅ **Dashboards**: Implementação de dashboards para diferentes tipos de usuários
✅ **Scanner QR**: Implementação funcional do sistema de check-in com scanner QR 
✅ **UI Components**: Componentes de UI como forms, cards e elementos interativos
✅ **Políticas de RLS**: Configurações e problemas de RLS no Supabase
✅ **Fluxo de Usuário**: Fluxos de navegação e redirecionamentos baseados em papéis

### 14.2 Problemas Confirmados

1. **Segurança**: RLS não habilitado em tabelas críticas (`financial_transactions` e `reports`)
2. **Arquitetura**: Duplicação significativa em hooks de autenticação com lógica similar
3. **Consistência**: Múltiplas implementações de normalização de papéis de usuário
4. **Desempenho**: Implementação do scanner QR com problemas de compatibilidade e manipulação DOM direta
5. **UX**: Feedback inconsistente durante carregamentos e tratamentos de erro
6. **Estrutura**: Layout organizacional inconsistente entre `/app/app/[perfil]` e `/app/[perfil]`

### 14.3 Pontos Fortes Identificados

1. **Middleware Robusto**: O sistema de middleware implementa controle de acesso sofisticado por perfil
2. **Normalização de Papéis**: Existem funções dedicadas para normalização de papéis em todo o sistema
3. **Design Consistente**: Interface de usuário moderna e atraente com tema coerente
4. **APIs Organizadas**: Endpoints estruturados por funcionalidade
5. **Escopo Completo**: Plataforma abrange todo o ciclo de vida de eventos, equipes e ingressos

### 14.4 Limitações da Análise

Alguns componentes não puderam ser totalmente analisados devido a problemas técnicos de timeout, incluindo:

- Conteúdo completo dos componentes UI no diretório `/components/ui`
- Algumas APIs específicas com implementação detalhada
- Arquivos em `/lib` com utilitários e configurações
- Implementação completa de alguns dashboards

### 14.5 Recomendações Imediatas

Com base na análise atualizada, recomendamos estas ações prioritárias:

1. **Consolidar Sistema de Autenticação**: Unificar a lógica duplicada entre `use-auth.tsx` e `useClientAuth.tsx`
2. **Refatorar Normalização de Papéis**: Criar um único módulo com funções de normalização
3. **Melhorar Scanner QR**: Refatorar o componente `Html5QrScanner.tsx` para eliminar manipulação direta do DOM e melhorar a compatibilidade
4. **Implementar RLS em Tabelas Financeiras**: Ativar imediatamente RLS nas tabelas desprotegidas
5. **Padronizar Feedback de Loading**: Criar um componente único de loading e feedback para toda a aplicação

### 14.6 Consideração Final

A plataforma SNAP é um sistema complexo e bem estruturado para gestão de eventos, com uma base sólida e uma arquitetura extensível. Com as melhorias recomendadas, especialmente nas áreas de segurança e consistência de código, o sistema pode se tornar mais robusto, escalável e fácil de manter.

O plano de implementação detalhado neste documento, incluindo exemplos de código, fornece um roteiro claro para elevar a qualidade e a segurança da plataforma. 