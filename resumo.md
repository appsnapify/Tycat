# Análise Completa do Projeto Snap

Este documento detalha a análise do projeto Snap, cobrindo estrutura, código, segurança, base de dados e funcionalidades.

## 1. Estrutura de Ficheiros e Pastas

### 1.1. Raiz do Projeto

A estrutura raiz contém os elementos típicos de um projeto Next.js (App Router) com adições para componentes, estilos, Supabase, testes e documentação:

- **Core Next.js:** `app/`, `.next/`, `public/`, `middleware.ts`, `next.config.js` (e `.mjs`), `package.json`, `tsconfig.json`.
- **Componentes/UI:** `components/`, `styles/`, `tailwind.config.ts`, `components.json` (shadcn/ui).
- **Lógica/Utils:** `lib/`, `hooks/`, `contexts/`, `types/`.
- **Supabase:** `supabase/` (provavelmente migrações/config local).
- **Testes:** `Testes/`, `tests-examples/`, `playwright.config.ts`.
- **Scripts:** `scripts/`.
- **Outros:** Vários ficheiros `.md`, `.sql`, `.gitignore`, `.deepsource.toml`, `.assistantrules`, `mcp-server/` (?), `@/` (alias).

### 1.2. Pasta `app/` (Estrutura Aninhada!)

- **Observação Crítica:** A análise revelou uma **estrutura aninhada inesperada**. A lógica principal da aplicação (rotas, layouts, páginas) **não está diretamente em `app/`, mas sim em `app/app/`**. A pasta `app/` de nível superior contém principalmente ficheiros de configuração (`layout.tsx`, `page.tsx` da landing page, `globals.css`) e algumas pastas de rotas públicas (`g/`, `e/`) e `api/`, mas as áreas principais autenticadas (`organizador`, `promotor`, etc.) residem em `app/app/`.
- **Conteúdo de `app/` (Nível Superior):**
    - `layout.tsx`: Layout global (já analisado).
    - `page.tsx`: Landing page pública (já analisado).
    - `globals.css`, `loading.tsx`, `error.tsx`, `not-found.tsx`.
    - **Pastas de Rota (Nível Superior):**
        - `g/`: Rota pública para promotores (`/g/[id]/`) - **Implementação parece incorreta, trata ID como Evento.**
        - `e/`: Rota pública para eventos (`/e/[eventId]/`).
        - `api/`: Rotas de API.
        - `login/`, `register/`: Páginas de autenticação.
        - `actions/`, `components/`, `lib/`, `contexts/`, `public/`, `types.d.ts`: Diretórios de suporte.
- **Conteúdo de `app/app/` (Nível Aninhado - Rotas Principais):**
    - Contém as pastas das áreas autenticadas:
        - `organizador/`: Área para Organizadores (contém `layout.tsx`, `dashboard/page.tsx`, `eventos/`, `equipes/`, etc.).
        - (Provavelmente) `promotor/`, `chefe-equipe/` (a confirmar).
    - **Implicação:** As rotas reais para as áreas autenticadas são provavelmente `/app/organizador/dashboard`, `/app/promotor/dashboard`, etc., **mas os ficheiros estão fisicamente localizados em `app/app/organizador/dashboard/`, `app/app/promotor/dashboard/`, etc.** Esta discrepância é a causa provável dos problemas de acesso.

## 2. Configuração do Projeto

### 2.1. `package.json`

- **Framework:** Next.js 15.2.4 (App Router).
- **Supabase:** Forte integração com `@supabase/ssr`, `@supabase/auth-helpers-nextjs`, `@supabase/supabase-js`.
- **UI:** Radix UI + shadcn/ui (`class-variance-authority`, `clsx`, etc.), Tailwind CSS.
- **Formulários:** `react-hook-form` + `zod`.
- **Ícones:** `lucide-react`.
- **QR Code:** `qrcode`, `html5-qrcode`, `react-qr-scanner`.
- **Gráficos:** `recharts`.
- **Outros:** `date-fns`, `next-themes`, Vercel Analytics/Speed Insights.
- **Dev:** TypeScript, ESLint, Playwright para testes E2E.

### 2.2. `next.config.mjs`

- Ignora erros de ESLint/TypeScript no build (**Atenção: Pode ocultar problemas**).
- Otimização de imagens desativada (`unoptimized: true`).
- Carrega configuração adicional `v0-user-next.config`.
- Flags experimentais para builds paralelos ativadas.

### 2.3. `tsconfig.json`

- Configuração TypeScript padrão para Next.js, `strict: true`.
- Alias de path `@/*` configurado para a raiz do projeto.

### 2.4. `.gitignore`

- Exclui ficheiros e pastas padrão (`node_modules`, `.next`, `.env*`, etc.).
- Exclui outputs de build TS, Vercel, e Playwright.

## 3. Estrutura da Base de Dados (Supabase - Projeto `xejpwdpumzalewamttjv`)

### 3.1. Tabelas Principais (Schema `public`)

- **`profiles`**: Dados adicionais utilizador (nome, `role`). Ligada a `auth.users`. RLS: ON. **Constraint `CHECK` atual em `role` não inclui 'customer'**.
- **`organizations`**: Dados das organizações. RLS: ON.
- **`user_organizations`**: Junção Utilizador-Organização (M-M), define `role` ('owner', 'admin', 'member'). RLS: ON.
- **`events`**: Detalhes dos eventos (título, data, local, flyer, `organization_id`, config guest list). RLS: ON.
- **`reports`**: Relatórios (?). RLS: OFF (ou não detetada).
- **`financial_transactions`**: Transações financeiras. RLS: OFF (ou não detetada).
- **`guest_list_events`**: Similar a `events`. **Potencial redundância/obsoleta**. RLS: ON.
- **`guests`**: Convidados registados (liga a `event_id`, `promoter_id`, `team_id`; contém nome, tel, `qr_code` único, `checked_in`). RLS: ON.
- **`teams`**: Equipas de promotores/staff (liga a `organization_id`; contém nome, `team_code` único). RLS: ON.
- **`team_members`**: Junção Equipa-Utilizador (M-M), define `role` ('leader', 'member'), `commission_rate`. RLS: ON.
- **`organization_teams`**: Junção Organização-Equipa (M-M), define regras de comissão para a equipa na organização. RLS: ON.
- **`event_teams`**: Junção Evento-Equipa (M-M), ativa equipas para eventos. RLS: ON.
- **`commissions`**: Comissões geradas (liga evento, org, equipa, promotor). RLS: ON.
- **`commission_payments`**: Pagamentos de comissões a equipas. RLS: ON.
- **`commission_payment_items`**: Detalhe de comissões num pagamento. RLS: ON.
- **`payment_confirmations`**: Confirmações de pagamento. RLS: ON.
- **`event_promoters`**: Associação Promotor-Equipa-Evento, gera `promoter_code`/`link`. RLS: ON.
- **`organization_members`**: Junção Utilizador-Organização. **Potencial sobreposição/conflito com `user_organizations`**. RLS: OFF (ou não detetada). Role textual livre.
- **`promotional_materials`**: URLs de imagens promocionais (liga a evento, org, uploader). RLS: ON.

### 3.2. Observações Iniciais da BD

- Estrutura relacional rica e RLS amplamente ativa (bom).
- **Pontos a investigar:**
    - RLS em `reports`, `financial_transactions`, `organization_members`.
    - Redundância/propósito de `guest_list_events`.
    - Sobreposição/conflito entre `organization_members` e `user_organizations`.
    - Necessidade de adicionar `role='customer'` à constraint check da tabela `profiles`.

## 4. Análise Funcional Detalhada (Em Progresso)

### 4.1. Raiz da Aplicação (`app/` - Nível Superior)

- **`app/layout.tsx`**:
    - **Função:** Estrutura HTML global.
    - **Detalhes:** Configura fontes (Inter, Oswald via CSS vars), metadata global, CSS global (`globals.css`), `lang="pt"`.
    - **Providers:** `AuthProvider` (gestão de auth cliente), `Toaster` (notificações Sonner), Vercel Analytics/Speed Insights.
    - **Segurança:** A segurança aqui depende primariamente do `AuthProvider` e do `middleware.ts` (a analisar).
- **`app/page.tsx` (`HomePage`)**:
    - **Função:** Landing page pública (`"use client"`).
    - **Conteúdo:** Header fixo (logo, botões Login/Registo ou Dashboard/Sair dependendo do auth), Secção Hero (título, descrição, botões), Secção Features (3 features com ícones), Secção CTA (chamada para registo). Usa `framer-motion` para animações.
    - **Lógica:** Usa `useAuth()` para estado do user e `signOut()`. Botões no header adaptam-se ao estado `user`. `handleLogout` chama `signOut`.
    - **Interação BD:** Nenhuma direta nesta página (depende do `useAuth`).
    - **Segurança:** Página pública. A lógica de apresentação condicional (botões header) depende do estado de autenticação fornecido por `useAuth`.
    - **Responsividade:** Usa classes Tailwind responsivas (ex: `sm:`, `lg:`, `md:`). Sugere consideração por mobile, mas requer teste visual.
    - **Observações:** Landing page standard. Link para `/about` pode estar quebrado ou ser futuro.

### 4.2. Middleware (`middleware.ts`)

- **Função Principal:** Interceta requisições (`/app/*`, `/login`, `/register`), verifica autenticação (Supabase SSR), refresca sessão, e controla acesso às rotas `/app/*` baseado no `role` do utilizador.
- **Matcher:** Aplica-se a `/app/:path*`, `/login`, `/register`.
- **Autenticação:**
    - Usa `createMiddlewareClient` para obter a sessão Supabase.
    - Redireciona para `/login` se não autenticado e a tentar aceder a `/app/*`.
- **Autorização (Utilizador Autenticado):**
    - Obtém `role` dos `user_metadata` da sessão.
    - **Normalização de Role:** Função `normalizeRole` mapeia variações ('promoter', 'Promoter', etc.) para valores padrão ('promotor', 'chefe-equipe', 'organizador'). **Não mapeia 'customer'**.
    - **Correção de Role:** Lógica para forçar `role` para 'chefe-equipe' se `user_metadata.is_team_leader` for `true` ou se `user_metadata.team_role` for 'leader'/'chefe', indicando possível inconsistência ou override via metadados.
    - **Controlo de Acesso:**
        - Define rotas permitidas por role (`organizadorRoutes`, `promotorRoutes`, `teamLeaderRoutes`).
        - 'chefe-equipe' herda acesso às rotas de 'promotor'.
        - Rotas de exceção (`/app/perfil`, `/app/dashboard`, etc.) permitidas para qualquer role autenticado.
        - Verifica se a rota acedida pertence às permitidas para o role ou às exceções.
    - **Redirecionamento (Acesso Negado):** Redireciona para o dashboard apropriado (via `getDashboardUrlByRole`) se o acesso não for permitido.
    - **Caso Especial Promotor:** Redireciona promotor sem `team_id` de `/app/promotor/dashboard` para `/app/promotor/equipes`.
- **Segurança:**
    - Protege rotas `/app/*` contra acesso anónimo.
    - Implementa autorização granular baseada em `role`.
    - **Dependência Crítica:** A segurança depende da correção e atualização fiável dos `user_metadata.role` e `user_metadata.team_id` na sessão Supabase (provavelmente via Triggers/Funções).
- **Observações:**
    - Robusto para roles definidos, mas sem tratamento para 'customer'.
    - Lógica de correção de role sugere atenção à gestão dos metadados do utilizador.
    - Rota `/app/dashboard1` publicamente acessível (**Verificar necessidade/segurança**).
    - Usa headers `x-user-*` para passar dados.
- **Lógica de Redirecionamento:** A função `getDashboardUrlByRole` determina para onde redirecionar em caso de acesso negado:
    - 'organizador' -> **`/app/organizador/dashboard`**
    - 'promotor' -> `/app/promotor/dashboard` (com team_id) ou `/app/promotor/equipes` (sem team_id)
    - 'chefe-equipe' -> `/app/chefe-equipe/dashboard`
    - Default -> `/app`
- **Rota `/app/dashboard` Genérica:** Permitida para qualquer user autenticado se acedida diretamente, mas **NÃO** é usada como alvo de redirecionamento padrão pelo middleware.

### 4.3. Gestão de Autenticação Cliente (`hooks/use-auth.tsx`)

- **Função:** Define o `AuthProvider` e o hook `useAuth` para gerir o estado de autenticação (user, loading, isTeamLeader) e fornecer funções (signUp, signIn, signOut, updateUserRole) aos componentes cliente.
- **Context API:** Usa `createContext` para partilhar o estado e funções.
- **Estado:**
    - `user`: Objeto `User` do Supabase ou `null`.
    - `isLoading`: Indica carregamento inicial da sessão.
    - `isTeamLeader`: Booleano derivado da função `checkIfTeamLeader`.
- **Ciclo de Vida:**
    - No `mount`, obtém a sessão Supabase.
    - Usa `onAuthStateChange` para reagir a logins, logouts, etc., atualizando o estado `user`.
- **Funções Principais:**
    - `signUp`: Chama `supabase.auth.signUp`, passando metadados (incluindo `role` inicial). Redireciona para dashboard se sucesso.
    - `signIn`: Chama `supabase.auth.signInWithPassword`. Se sucesso, atualiza `user`, chama `checkIfTeamLeader`, e redireciona para dashboard apropriado (via `getDashboardUrlByRole`).
    - `signOut`: Chama `supabase.auth.signOut`, limpa estado local (`user`, `isTeamLeader`), limpa `localStorage`, redireciona para `/`.
    - `updateUserRole`: Atualiza `role` nos metadados Supabase e `localStorage`.
- **Lógica de Roles e Permissões:**
    - **Normalização:** Funções `normalizeRole`, `normalizeForDB`, `normalizeForFrontend` para consistência de nomes de roles (similar ao middleware). **'customer' não é tratado.**
    - **Redirecionamento Pós-Login:** Usa `getDashboardUrlByRole` (não trata 'customer', default `/app`).
    - **`checkIfTeamLeader`:** Lógica complexa para determinar se é chefe de equipa:
        - Verifica `user_metadata` (`role` ou `is_team_leader`).
        - Se não, verifica se é `created_by` na tabela `teams`.
        - **Atualização Automática de Role:** Se criou equipa E `role` atual é 'promotor', tenta atualizar metadados para `role='chefe-equipe'`. **(Lógica de negócio significativa com potencial para problemas/elevação de privilégios se não for perfeita)**.
    - **`localStorage`:** Usado para guardar `role`, `team_id`, `isTeamLeader`, etc., para acesso rápido no cliente (**Não usar para decisões de segurança críticas**).
- **Observações:**
    - Centraliza a lógica de auth cliente.
    - Gestão de roles complexa com normalização e atualização automática sugere potencial para simplificação/refatoração.
    - Confirma que a experiência pós-login para 'customer' não está definida nas áreas protegidas por `/app/*`.
- **Lógica de Redirecionamento:**
    - A função `getDashboardUrlByRole` é idêntica à do middleware.
    - `signIn`: **Não** redireciona explicitamente (confia na navegação/middleware subsequente).
    - `signUp`: Redireciona **explicitamente** via `router.push()` para:
        - **`/app/organizador/dashboard`** (se role='organizador').
        - `/app/promotor/equipes` (se role='promotor').

### 4.4. Página de Login (`app/login/page.tsx`)

- **Função:** Apresenta formulário para utilizadores existentes (organizadores, promotores, etc.) iniciarem sessão (`"use client"`).
- **UI:** Layout centrado com cartão, formulário com campos Email e Password (usando componentes shadcn/ui `Input`, `Label`, `Button`, `Alert`), links para Registo e Página Inicial.
- **Lógica:**
    - Usa `useState` para gerir `formData`, `isLoading`, `error` e `debugInfo`.
    - Usa `useAuth().signIn` para realizar a tentativa de login.
    - `handleSubmit`: Chama `signIn`, define `isLoading`, trata erros comuns de login (credenciais inválidas, rate limit) mostrando mensagens amigáveis no `Alert` de erro.
    - `testSupabaseConnection`: Botão de debug que tenta ligar-se diretamente ao Supabase (via chave anónima pública) e lista tokens no `localStorage` para diagnóstico.
- **Interação BD/Auth:** Delega a autenticação à função `signIn` do `useAuth`. A função de teste faz uma leitura direta mínima.
- **Segurança:** Depende da segurança do `signInWithPassword` do Supabase e do rate limiting. Exposição das chaves públicas Supabase é normal.
- **Responsividade:** Layout simples, provavelmente responsivo.
- **Observações:** Implementação padrão e clara de uma página de login cliente. Inclui funcionalidade de debug útil.

### 4.5. Página de Registo (`app/register/page.tsx`)

- **Função:** Permite a criação de novas contas para 'organizador' ou 'promotor' (`"use client"`).
- **UI:** Layout centrado, formulário com campos Nome, Sobrenome, Email, Tipo de Conta (Radio Group: Organizador/Promotor), Senha, Confirmar Senha. Usa `react-hook-form` com componentes `shadcn/ui` (`Form`, `FormField`, etc.).
- **Validação (Zod + React Hook Form):**
    - `first_name`, `last_name`: min 2 chars.
    - `email`: formato válido.
    - `role`: 'organizador' ou 'promotor'.
    - `password`: min 6 chars.
    - `confirm`: deve ser igual a `password`.
- **Lógica:**
    - `handleSubmit`: Chamado via `form.handleSubmit` após validação Zod.
    - Chama `useAuth().signUp`, passando email, password e `metadata` (first_name, last_name, role selecionado).
    - **Sucesso:** Mostra toast de sucesso. Redireciona (após 1.5s delay) para:
        - `/app/organizador/dashboard` (se role='organizador').
        - `/app/promotor/equipes` (se role='promotor').
    - **Erro:** Mostra toast de erro com a mensagem do erro do `signUp`.
- **Interação BD/Auth:** Delega a criação do utilizador ao `signUp` do `useAuth`, que passa os dados (incluindo `role`) como metadados para `supabase.auth.signUp`.
- **Segurança:** Depende da segurança do `supabase.auth.signUp` (confirmação de email, força da senha, rate limiting).
- **Observações:**
    - Formulário de registo bem implementado com validação.
    - Define explicitamente o `role` inicial ('organizador' ou 'promotor').
    - **Não permite registo como 'customer'** neste fluxo.
    - Redirecionamento para promotores é consistente com a necessidade de associar/criar equipa.

### 4.6. Área do Organizador (`app/app/organizador/`)

- **Localização:** Encontrada dentro da estrutura aninhada `app/app/`.
- **Estrutura:** Contém `layout.tsx` e subpastas como `dashboard/`, `eventos/`, `equipes/`, etc.
- **Dashboard:** **Existe** o ficheiro `app/app/organizador/dashboard/page.tsx` (grande: ~1300 linhas).
- **Problema de Roteamento:** Apesar da página existir em `app/app/organizador/dashboard/page.tsx`, o `middleware` e `useAuth` redirecionam para **`/app/organizador/dashboard`** (com um só `app/`). Esta **discrepância de paths** entre a lógica de redirecionamento e a localização física dos ficheiros é a causa mais provável dos erros 404 reportados.
- **Estado Funcional:** A completude e funcionalidade do dashboard (`page.tsx`) ainda precisam ser analisadas, mas o problema de roteamento impede o acesso.

### 4.7. Área do Promotor (`app/app/promotor/`?)

- **Localização:** Assumindo que segue o padrão aninhado, a pasta deveria ser `app/app/promotor/`.
- **Páginas:** Assumindo a estrutura aninhada, as páginas `/app/promotor/dashboard/page.tsx` e `/app/promotor/equipes/page.tsx` deveriam existir em `app/app/promotor/...`.
- **Problema de Roteamento:** Similar ao Organizador, o `middleware` e `useAuth` redirecionam para `/app/promotor/...` (um só `app/`), enquanto os ficheiros estariam em `app/app/promotor/...`.
- **Estado Funcional:** A existência e funcionalidade destas páginas precisam ser confirmadas verificando `app/app/promotor/`. O problema de roteamento também afeta esta área.

### 4.8. Rota Pública do Promotor (`app/g/[id]/`)

- **Estrutura:** Contém `page.tsx` (Server Component) e `GuestListPageClient.tsx` (Client Component).
- **`page.tsx`:**
    - **Função:** Wrapper que extrai `[id]` da URL e o trata como `eventId`.
    - **Problema:** Renderiza `GuestListPageClient` passando `eventId=params.id` mas **`promoterId={null}` e `teamId={null}`**. Ignora a semântica da rota `/g/` (promotor).
    - **Conclusão:** Rota provavelmente **mal configurada ou refatorada incorretamente**. Não cumpre a função esperada de um link de promotor.
- **`GuestListPageClient.tsx`:**
    - **Função:** UI e lógica para a página pública de registo numa guest list de evento (`type='guest-list'`, `is_published=true`).
    - **Busca Dados (Cliente):** Busca detalhes do evento e contagem de convidados via cliente Supabase.
    - **Estado da Lista:** Calcula se a lista está `LOADING`, `OPEN`, `CLOSED`, `NOT_YET_OPEN`, etc., baseado nas datas do evento.
    - **Formulário:** Registo simplificado pedindo apenas **Nome e Telefone** (com seletor de país).
    - **Submissão:** Envia dados (incluindo `promoterId=null`, `teamId=null` vindos desta rota) via `POST` para a **API interna `/api/guests`**.
    - **UI Condicional:** Mostra formulário, mensagem de lista cheia, mensagem de sucesso com QR Code (recebido da API), ou mensagens de estado da lista (fechada, inativa, etc.).
    - **Observações:** Componente funcional para registo simplificado, mas o rastreio de promotor está quebrado quando acedido via `/g/[id]`.

*(Análise precisa confirmar a estrutura de `app/app/promotor/` e analisar a API /api/guests e a rota /e/[eventId])*

### 4.9. API de Convidados (`app/api/guests/route.ts`)

- **Cliente Admin:** Usa `supabaseAdmin` com `SERVICE_ROLE_KEY` (bypass RLS) para validações e algumas escritas. **Alerta:** Fallback para chave anónima se `SERVICE_ROLE_KEY` ausente é **inseguro**.
- **POST Handler (Registo):**
    - **Input:** `event_id`, `name`, `phone`, `promoter_id?`, `team_id?`.
    - **Validação Backend:** Verifica existência do evento, `type='guest-list'`, `is_published`, janela temporal (abertura/fecho), limite de convidados (contando em `guests`).
    - **Geração QR Code:** Cria `guestId`, gera JSON com detalhes, converte para Data URL.
    - **Inserção BD (Problemática):**
        1. Tenta SQL direto via `rpc('exec_sql', ...)`.
        2. Fallback: `supabaseAdmin.from('guests').insert(...)`.
        3. Fallback: `supabaseAdmin.from('guest_list_guests').insert(...)` **(Indica duplicação de tabelas)**.
        4. Fallback: **CRIA TABELA DINÂMICA `guests_[event_id]`, DESATIVA RLS (! RISCO ELEVADO !)**.
        5. Fallback final: Retorna `200 OK` com QR Code mas sem salvar dados.
    - **Rastreio:** Guarda `promoter_id`/`team_id` se recebidos.
- **PUT Handler (Check-in):**
    - **Input:** `id` (guestId), `event_id`.
    - **Busca:** Procura `id` em `guests`, depois em `guest_list_guests`.
    - **Validação:** Confirma se `event_id` corresponde.
    - **Atualização:** Define `checked_in=true`, `is_checked_in=true` na tabela onde encontrado. Usa cliente normal.
- **GET Handler (Listar):**
    - **Input:** `eventId` (query param).
    - **Busca:** Seleciona de `guests` para o `eventId`. **Não consulta `guest_list_guests`**. Usa cliente normal.
    - **Estatísticas:** Calcula `total`, `checkedIn`, `approved`, `pending` (lógica de aprovação não visível no POST).
- **Conclusões API:**
    - Implementa CRUD básico para guest list simplificada.
    - **Problemas Graves:** Duplicação de tabelas (`guests` vs `guest_list_guests`), **risco extremo** com criação dinâmica de tabelas e desativação de RLS no POST, gestão insegura da chave de serviço (fallback).
    - Funcionalidade de aprovação parece incompleta.

*(Análise continuará com a rota pública /e/[eventId])*

### 4.10. Rota Pública de Evento (`app/e/[id]/page.tsx`)

- **Componente Cliente (!):** Marcado com `'use client'`, com lógica principal e busca de dados no componente interno `EventPageContent`. Busca de dados no cliente é menos performante.
- **Função:** Exibe detalhes de eventos públicos **que NÃO são do tipo 'guest-list'** (`type != 'guest-list'`).
- **Busca Dados (Cliente):** `useEffect` busca da tabela `events` filtrando por `id`, `is_published=true`, `is_active=true`, `type != 'guest-list'`.
- **UI:** Apresenta flyer, título, data/hora, local, descrição. Coluna lateral focada em **Ingressos**:
    - Mostra botão "Comprar Ingresso" (link externo) se `event.ticket_url` existir.
    - Mostra info genérica se não houver link de bilhete.
- **Guest List:** **NÃO** contém formulário de registo na guest list.
- **Rastreio Promotor:** **NÃO** implementa leitura ou uso de query params para rastreio.
- **Conclusões:** Página para eventos standard com bilhética externa. Confirma que o fluxo ideal de registo via promotor não está implementado corretamente nesta rota.

*(Análise Funcional concluída. Próximo passo: Análise Global e Síntese)*

## 5. Análise Global e Síntese

### 5.1. Código Morto / Ficheiros/Pastas Não Usados (Potenciais)

Com base na análise funcional e na estrutura de ficheiros, os seguintes elementos são candidatos a código morto, incompleto ou não utilizado no fluxo principal:

- **`app/app/organizador/evento/[id]/components/`**: Como a página `/app/organizador/evento/[id]/page.tsx` está em falta, os componentes dentro desta pasta são provavelmente órfãos ou parte de uma funcionalidade inacabada. **(Ação: Verificar se são usados noutras áreas ou remover/completar funcionalidade)**.
- **`app/evento/` (Nível Superior):** A pasta `app/evento/` foi listada mas não analisada em detalhe. Se não contiver rotas ativas ou componentes utilizados, pode ser redundante. **(Ação: Investigar conteúdo)**.
- **`app/guest-list/` (Nível Superior):** Similar a `app/evento/`. **(Ação: Investigar conteúdo)**.
- **`app/organizacao/` (Nível Superior):** Similar a `app/evento/`. **(Ação: Investigar conteúdo)**.
- **`app/app/organizador/organizacao/`, `.../equipes/`, `.../eventos/`, `.../comissoes/`, `.../evento/`, `.../organizacoes/` (Nível Aninhado):** Como o acesso principal à área do organizador está quebrado devido ao problema de roteamento `app/` vs `app/app/`, estas subpastas, embora existam, podem não estar a ser efetivamente utilizadas ou testadas. Se contiverem `page.tsx` ou `layout.tsx`, precisam ser analisadas individualmente após correção do roteamento. **(Ação: Analisar após correção do path)**.
- **`app/app/promotor/` e `app/app/chefe-equipe/` (Nível Aninhado):** Assumindo que existem (precisa confirmação via `list_dir`), o mesmo problema de roteamento as afeta. **(Ação: Confirmar existência e analisar após correção do path)**.
- **Tabela `guest_list_events`:** Parece ser uma versão antiga/duplicada da tabela `events`. A API `/api/guests` tenta interagir com ela como fallback, mas o GET não a consulta. **(Ação: Confirmar propósito e potencialmente migrar dados e remover)**.
- **Tabela `organization_members`:** Parece sobrepor-se funcionalmente a `user_organizations`, mas com `role` textual livre e sem RLS aparente. **(Ação: Clarificar propósito, escolher uma fonte da verdade, e potencialmente migrar/remover)**.
- **Página `/about`:** Mencionada no link "Saiba Mais" da `HomePage` (`app/page.tsx`), mas não existe na estrutura de ficheiros. **(Ação: Criar página ou remover link)**.
- **Ficheiros `.md` e `.sql` na Raiz:** `changelog_...`, `todo.md`, `teste1.md`, `porresolver.md`, `miguel*.md`, `sql_tables.sql`, `sql_columns.sql`. Verificar se são notas temporárias, documentação obsoleta ou ficheiros de desenvolvimento que podem ser removidos ou movidos para uma pasta `docs/`. **(Ação: Rever e limpar)**.
- **`app/dashboard1`:** Rota mencionada como exceção pública no `middleware.ts` (`/app/dashboard1`). Se esta pasta/página existe (a tentativa de listar `app/app/dashboard` falhou), verificar o seu propósito e se ainda é necessária/segura como pública. **(Ação: Investigar existência e propósito)**.

### 5.2. Potenciais Erros / Qualidade de Código / Más Práticas

- **Estrutura Aninhada `app/app/`:** Causa principal dos problemas de acesso às áreas autenticadas devido à discrepância com os paths `/app/...` usados no código (middleware, `useAuth`). **(Recomendação Urgente: Mover conteúdo de `app/app/*` para `app/*` ou corrigir *todos* os paths no código)**.
- **API `/api/guests` - Criação Dinâmica de Tabelas:** A lógica de fallback que cria tabelas `guests_[event_id]` dinamicamente, desativa RLS e dá `GRANT ALL` é **extremamente perigosa e insustentável**. **(Recomendação Urgente: Remover esta lógica e diagnosticar/corrigir as falhas de inserção nas tabelas principais)**.
- **API `/api/guests` - Duplicação de Tabelas:** A tentativa de escrita/leitura em `guests` e `guest_list_guests` indica inconsistência. **(Recomendação: Definir `guests` como tabela única, migrar dados de `guest_list_guests` se necessário, e remover a tabela/lógica duplicada)**.
- **API `/api/guests` - Uso de `rpc('exec_sql')`:** Dependência de uma função RPC customizada para SQL direto. A segurança e necessidade disto devem ser avaliadas. Usar os métodos padrão do Supabase (`.insert()`, `.update()`) é geralmente mais seguro e manutenível. **(Recomendação: Avaliar necessidade; preferir métodos padrão do Supabase se possível)**.
- **API `/api/guests` - Fallback da Chave de Serviço:** Usar a chave anónima pública como fallback para a chave de serviço é **inseguro**. **(Recomendação Urgente: Garantir que `SUPABASE_SERVICE_ROLE_KEY` está sempre definida no ambiente de produção/servidor e remover o fallback)**.
- **`hooks/useAuth` - Atualização Automática de Role:** A função `checkIfTeamLeader` que atualiza automaticamente o `role` de 'promotor' para 'chefe-equipe' nos metadados se o utilizador for `created_by` de uma equipa é uma lógica complexa com potencial para elevação de privilégios não intencional se houver falhas. **(Recomendação: Rever cuidadosamente esta lógica, talvez substituí-la por um processo manual/administrativo ou gatilhos de BD mais controlados)**.
- **`next.config.mjs` - Ignorar Erros:** Ignorar erros de TypeScript e ESLint no build (`ignoreBuildErrors: true`, `ignoreDuringBuilds: true`) pode ocultar problemas reais de qualidade e potenciais bugs. **(Recomendação: Remover estas flags e corrigir os erros reportados)**.
- **Busca de Dados no Cliente (`app/e/[id]/page.tsx`):** Usar `useEffect` para buscar dados essenciais numa página marcada como `'use client'` é menos performante do que usar Server Components para a busca inicial. **(Recomendação: Refatorar para usar Server Component para busca inicial, passando dados para componentes cliente se necessário)**.
- **Falta de Tratamento `role='customer'`:** A lógica de autenticação/autorização (middleware, `useAuth`) e a constraint da BD (`profiles`) não consideram o role `customer`, apesar da discussão sobre o fluxo de registo de convidados. **(Recomendação: Implementar formalmente o role 'customer' se for necessário que eles acedam a áreas protegidas ou tenham permissões específicas, ou garantir que o fluxo de registo simplificado (`/api/guests`) não tente atribuir este role)**.
- **Consistência `checked_in` vs `is_checked_in`:** A API PUT parece tentar ler/escrever em ambos os campos, sugerindo uma possível mudança de nome de coluna no passado. **(Recomendação: Padronizar para um único nome (`checked_in` parece mais comum) e limpar/migrar dados da coluna antiga)**.

### 5.3. Segurança

- **RLS (Row Level Security):**
    - Amplamente ativa na maioria das tabelas (bom).
    - **Pontos Críticos:** Verificar e ativar RLS (se aplicável e seguro) nas tabelas `reports`, `financial_transactions`, e **especialmente `organization_members`** (devido à sobreposição com `user_organizations` que tem RLS).
    - **Dependência:** A eficácia da RLS depende das políticas implementadas, que não foram analisadas diretamente. A lógica da aplicação deve estar alinhada com estas políticas.
- **Chave de Serviço Supabase (`SUPABASE_SERVICE_ROLE_KEY`):**
    - Usada na API `/api/guests` para bypassar RLS e realizar validações/escritas.
    - **Risco Grave:** O fallback para a chave anónima pública se a chave de serviço não estiver definida (`process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!`) é uma **vulnerabilidade crítica** e deve ser removido imediatamente. A chave de serviço NUNCA deve ser exposta no lado cliente ou usada como fallback da chave anónima.
    - **Gestão:** A chave de serviço deve ser configurada apenas como variável de ambiente no servidor/Vercel e gerida com segurança.
- **API `/api/guests` - Criação Dinâmica de Tabelas:**
    - **Risco Extremo:** A criação de tabelas `guests_[event_id]`, desativação de RLS, e `GRANT ALL` via RPC `exec_sql` é uma **falha de segurança gravíssima**. Permite a criação de tabelas não geridas com permissões abertas. Deve ser removida.
- **API `/api/guests` - Função RPC `exec_sql`:**
    - A existência de uma função que executa SQL arbitrário (`exec_sql`) é um potencial vetor de ataque se não for **extremamente bem protegida** na base de dados (ex: limitando quem a pode chamar e sanitizando inputs rigorosamente). A sua necessidade deve ser reavaliada face aos métodos padrão do Supabase.
- **Validação de Backend (`/api/guests`):** A API realiza validações importantes (estado da lista, limites) no backend antes de escrever na BD, o que é uma boa prática.
- **Gestão de Metadados (`user_metadata`):**
    - O middleware e `useAuth` dependem de `user_metadata.role`, `team_id`, `is_team_leader`, etc., para autorização e redirecionamento.
    - A lógica de atualização automática de `role` em `checkIfTeamLeader` (`useAuth`) pode levar a elevação de privilégios se for explorável.
    - **Recomendação:** Garantir que os metadados são atualizados de forma segura e consistente, idealmente através de Triggers de Base de Dados ou funções seguras no backend, em vez de depender apenas de lógica no cliente ou atualizações potencialmente inseguras. Usar a tabela `profiles` como fonte primária da verdade para o `role` (após adicionar 'customer' e garantir RLS) pode ser mais robusto do que depender apenas de `user_metadata`.
- **Proteção de Rotas (`middleware.ts`):** Implementa corretamente a proteção de rotas `/app/*` contra acesso anónimo e aplica autorização básica por role.

### 5.4. Compatibilidade Móvel (Análise Estática)

- O projeto utiliza **Tailwind CSS**.
- Vários componentes e páginas (`app/page.tsx`, `app/login/page.tsx`, `app/register/page.tsx`, `app/g/[id]/GuestListPageClient.tsx`, `app/e/[id]/page.tsx`) usam **classes responsivas** do Tailwind (prefixos `sm:`, `md:`, `lg:`, `grid`, `flex-col`, `sm:flex-row`, etc.).
- Isto **sugere fortemente** que houve uma preocupação com a adaptação a diferentes tamanhos de ecrã.
- **Conclusão:** Há evidência no código de que a responsividade foi considerada. No entanto, uma **avaliação visual e testes em dispositivos reais** são necessários para confirmar a qualidade da experiência móvel e identificar possíveis problemas de layout ou usabilidade.

### 5.5. Estrutura Funcional (Visão Geral)

- **Funcionalidades Principais Implementadas (Com Problemas):**
    - **Autenticação:** Login e Registo (para Organizador/Promotor) via `supabase.auth`. Gestão de sessão via `middleware` e `useAuth`.
    - **Landing Page:** Página inicial pública com informações e CTAs.
    - **Guest List Pública Simplificada:** Página (`/g/[id]`) permite registo (nome/telefone) em eventos `type='guest-list'`, com controlo de datas/limites (via API `/api/guests`) e geração de QR Code.
    - **Visualização Pública de Eventos Standard:** Página (`/e/[id]`) mostra detalhes de eventos `type!='guest-list'`, com link para bilhética externa.
    - **Check-in via API:** Endpoint PUT em `/api/guests` permite marcar convidados como `checked_in`.
    - **Listagem de Convidados via API:** Endpoint GET em `/api/guests` permite obter a lista de convidados de um evento.
- **Funcionalidades Quebradas/Ausentes/Incompletas:**
    - **Acesso às Áreas Autenticadas:** Principal problema é o **roteamento quebrado** devido à estrutura `app/app/` vs. paths `/app/`. Impede acesso a:
        - Dashboard do Organizador (`/app/organizador/dashboard`).
        - Gestão de Eventos do Organizador (`/app/organizador/evento/...`).
        - Dashboard do Promotor (`/app/promotor/dashboard`).
        - Gestão de Equipas do Promotor (`/app/promotor/equipes`).
        - (Provavelmente) Área do Chefe de Equipa.
    - **Rastreio de Promotor:** A rota `/g/[id]` não passa o `promoterId`, quebrando o rastreio no registo da guest list. A rota `/e/[id]` também não implementa rastreio.
    - **Registo de 'Customer':** O fluxo de registo completo para convidados ('customer') com telefone/password/etc. não está implementado nas rotas analisadas. O registo atual (`/g/`) é simplificado e não cria conta `auth.users`.
    - **Funcionalidades do Organizador/Promotor:** Embora os ficheiros existam em `app/app/...`, a sua funcionalidade real não pôde ser avaliada devido ao problema de roteamento. Assumindo que existem dashboards, gestão de eventos, equipas, comissões, etc.
    - **Funcionalidade de Aprovação de Convidados:** Campos existem na BD e são usados em stats no GET da API, mas a lógica de aprovação não é visível no fluxo de registo POST.
    - **Tabelas Duplicadas/Sobrepostas:** `guests`/`guest_list_guests` e `organization_members`/`user_organizations` indicam funcionalidades incompletas ou problemas de migração.

*(Continua com Resumo Final e Recomendações)*
