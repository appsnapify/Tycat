# Análise Técnica do Projeto - Organizador de Eventos

## Visão Geral do Projeto

Este documento detalha a análise técnica da aplicação web de gestão de eventos, com foco particular na área destinada aos organizadores. A análise cobre a estrutura do código, tecnologias utilizadas, pontos fortes e áreas para melhoria.

## Estrutura Geral e Configuração Raiz (`app/`) [✓ Visto]

### 1. Layout Raiz (`app/layout.tsx`)

*   **Funcionalidade:** Define a estrutura HTML (`<html>`, `<body>`) base para toda a aplicação. Configura fontes globais (`Inter`, `Oswald` via `next/font`), metadados (`title`, `description`), e importa estilos globais (`globals.css`).
*   **Providers Globais:** Envolve toda a aplicação com o `AuthProvider` (de `@/hooks/use-auth`) para gestão de autenticação, e inclui o `Toaster` (sonner) para notificações e componentes de análise/performance da Vercel (`Analytics`, `SpeedInsights`).
*   **Tecnologias:** Next.js (App Router - Root Layout), React, `next/font`, `sonner`, `@vercel/analytics`, `@vercel/speed-insights`.
*   **Pontos Fortes:**
    *   Configuração essencial completa (HTML, fontes, metadados, estilos).
    *   Provider de autenticação centralizado na raiz.
    *   Integração com ferramentas Vercel.
*   **Áreas para Melhoria / Observações:**
    *   Localização do `AuthProvider` (importado de `hooks/`) é invulgar.
    *   Potencial duplicação do `Toaster` (também presente em `app/app/layout.tsx`).

### 2. Página Inicial (`app/page.tsx`)

*   **Funcionalidade:** Landing page pública da aplicação (rota `/`). Apresenta a plataforma (Hero, Features, CTA) e direciona para login/registo. É um Client Component para usar `useAuth`.
*   **Header Dinâmico:** Mostra botões de "Login"/"Criar Conta" para visitantes anónimos, ou "Dashboard" e "Sair" para utilizadores logados.
*   **Tecnologias:** React (Client Component), Next.js (`Link`), `@/hooks/use-auth`, `shadcn/ui`, `framer-motion`, `lucide-react`, Tailwind CSS.
*   **Pontos Fortes:**
    *   Estrutura de landing page clara e eficaz.
    *   Header adapta-se ao estado de autenticação.
    *   Visualmente apelativa com animações.
*   **Áreas para Melhoria / Observações:**
    *   Link do botão "Dashboard" no header é fixo (`/app/organizador/dashboard`), deveria ser dinâmico baseado na `role` do utilizador.
    *   Ícones SVG inline na secção de features poderiam ser substituídos por biblioteca para consistência.

### 3. Estilos Globais (`app/globals.css`)

*   **Funcionalidade:** Define os estilos CSS globais da aplicação.
*   **Conteúdo:** Inclui as diretivas base do Tailwind CSS (`@tailwind base`, `components`, `utilities`). Define variáveis CSS para theming (light/dark mode) na camada `@layer base`, compatíveis com `shadcn/ui`. Aplica estilos base ao `<body>` (cores, `font-feature-settings`).
*   **Tecnologias:** Tailwind CSS, CSS.
*   **Pontos Fortes:**
    *   Estrutura padrão e eficaz para usar Tailwind e `shadcn/ui`.
    *   Sistema de theming baseado em variáveis CSS.
*   **Áreas para Melhoria / Observações:** Nenhuma significativa, segue o padrão `shadcn/ui`.

### 4. Definições de Tipos Globais (`app/types.d.ts`)

*   **Funcionalidade:** Ficheiro de definição TypeScript (`.d.ts`) que melhora a tipagem global para props comuns de páginas Server Component no Next.js App Router.
*   **Conteúdo:** Define a interface `NextJS.PageProps` com tipos explícitos para `params` (parâmetros de rota) e `searchParams` (query parameters).
*   **Tecnologias:** TypeScript.
*   **Pontos Fortes:**
    *   Melhora a segurança de tipos e a experiência de desenvolvimento (DX) ao tipar `params` e `searchParams`.
*   **Áreas para Melhoria / Observações:** Pode precisar de atualizações com futuras versões do Next.js.

### 5. UI de Loading Global (`app/loading.tsx`)

*   **Funcionalidade:** Define a UI padrão exibida enquanto o conteúdo de uma rota Server Component está a carregar (convenção `loading.tsx` do Next.js App Router).
*   **Conteúdo:** Mostra um ícone `Loader2` animado (`lucide-react`) e o texto "A carregar..." centrados numa página com fundo gradiente.
*   **Tecnologias:** React, Next.js, `lucide-react`, Tailwind CSS.
*   **Pontos Fortes:**
    *   Fornece feedback de loading imediato usando a convenção do Next.js.
    *   UI simples e clara.
*   **Áreas para Melhoria / Observações:** É o fallback global; rotas específicas podem ter os seus próprios `loading.tsx`.

### 6. UI de Erro Global (`app/error.tsx`)

*   **Funcionalidade:** Define a UI de fallback exibida quando ocorrem erros durante a renderização de uma rota (convenção `error.tsx` do Next.js App Router). É um Client Component.
*   **Conteúdo:** Mostra uma página estilizada com código 500, mensagem de erro genérica, e duas opções: "Voltar ao início" (link para `/`) e "Tentar novamente" (botão que chama a função `reset` fornecida pelo Next.js para tentar re-renderizar).
*   **Props:** Recebe `error` (o objeto do erro) e `reset` (a função para tentar re-renderizar).
*   **Logging:** Regista o erro na consola do browser via `useEffect`.
*   **Tecnologias:** React (Client Component, `useEffect`), Next.js (`Link`), `shadcn/ui`, `lucide-react`, Tailwind CSS.
*   **Pontos Fortes:**
    *   Tratamento de erros robusto, evitando páginas quebradas.
    *   Oferece opção de recuperação (`reset`).
    *   Regista erros para depuração.
*   **Áreas para Melhoria / Observações:** É o fallback global; rotas específicas podem ter `error.tsx` próprios. Mensagem de erro é genérica.

### 7. UI de Página Não Encontrada Global (`app/not-found.tsx`)

*   **Funcionalidade:** Define a UI personalizada exibida para erros 404 (rota não encontrada), usando a convenção `not-found.tsx` do Next.js App Router.
*   **Conteúdo:** Mostra uma página estilizada com código 404, mensagem "Página não encontrada", e um botão "Voltar ao início" que linka para a homepage (`/`).
*   **Tecnologias:** React, Next.js (`Link`), `shadcn/ui`, `lucide-react`, Tailwind CSS.
*   **Pontos Fortes:**
    *   UI de 404 personalizada e consistente com o estilo da app.
    *   Mensagem clara e ação de retorno para o utilizador.
*   **Áreas para Melhoria / Observações:** É o fallback global; rotas específicas poderiam teoricamente ter os seus próprios `not-found.tsx`.

### 8. Página de Registo (`app/register/page.tsx`)

*   **Funcionalidade:** Página pública para registo de novos utilizadores. Permite inserir nome, sobrenome, email, senha (com confirmação) e escolher o tipo de conta ('organizador' ou 'promotor').
*   **Validação:** Usa `react-hook-form` e `zod` para validação robusta dos campos, incluindo a correspondência de senhas.
*   **Submissão:** Chama a função `signUp` do hook `useAuth` com os dados e metadados (nome, role). Em caso de sucesso, mostra toast, atrasa ligeiramente e redireciona para o dashboard apropriado (`/app/organizador/dashboard` ou `/app/promotor/equipes`). Em caso de erro, mostra toast de erro.
*   **Tecnologias:** React (Client Component), Next.js (`useRouter`, `Link`), `@/hooks/use-auth`, `react-hook-form`, `zod`, `shadcn/ui`, `sonner`, `framer-motion`.
*   **Pontos Fortes:**
    *   Fluxo de registo completo com seleção de papel.
    *   Validação robusta com Zod.
    *   Bom feedback visual (loading, toasts) e UX.
    *   Redirecionamento pós-registo.
*   **Áreas para Melhoria / Observações:**
    *   Depende criticamente da implementação de `signUp` em `useAuth`.
    *   Redirecionamento do promotor para `/app/promotor/equipes` pode ser revisto.
    *   Gestão do estado `isLoading` no `finally` pode ser ligeiramente melhorada.
    *   Tratamento de erros poderia ser mais específico para erros comuns de registo.

### 10. Detalhes do Evento - Cliente (Alternativo/Redundante) (`app/organizador/evento/[id]/components/EventDetailsClient.tsx`)

*   **Funcionalidade:** Componente cliente que tenta exibir detalhes e estatísticas de um evento. Busca todos os convidados no cliente e calcula agregações (registos por hora, contagens por equipa/promotor) no cliente. Busca nomes de equipas/promotores no cliente.
*   **Estado da Rota:** Este componente reside em `app/organizador/evento/[id]/components/`. O diretório pai `app/organizador/evento/[id]/` **não contém `page.tsx`** e parece estar vazio, tornando a rota `/organizador/evento/[id]` inativa/incompleta.
*   **Comparação:** É uma versão significativamente **menos eficiente e incompleta** comparada com `app/app/organizador/eventos/[id]/EventDetailsClient.tsx` (Análise #19), que recebe dados pré-agregados do servidor e delega a lista de convidados.
*   **Tecnologias:** React (Client Component), Supabase (Client JS), `shadcn/ui`.
*   **Pontos Fortes:** Nenhum significativo dada a redundância e ineficiência.
*   **Áreas para Melhoria / CRÍTICO:**
    *   **REDUNDÂNCIA E INEFICIÊNCIA (CRÍTICO):** Lógica duplicada com a versão em `app/app/...`, mas implementada de forma muito menos performante (agregação no cliente). Componente parece incompleto (falta UI de gráficos/rankings).
    *   **ROTA INATIVA:** A falta de `page.tsx` e o diretório pai vazio tornam a rota e este componente inúteis na prática.
*   **Recomendação Urgente:** Remover o diretório `app/organizador/evento/` e todo o seu conteúdo para eliminar código redundante, incompleto e confuso.

### 11. Página Pública de Organização (`app/organizacao/[slug]/page.tsx` e `OrganizationClient.tsx`)

*   **Funcionalidade:** Página pública (`/organizacao/[slug]`) que exibe o perfil de uma organização específica. Mostra banner, logo, nome, morada, links de redes sociais, e listas de eventos futuros e passados publicados pela organização.
*   **Estrutura:** Usa um Server Component (`page.tsx`) que valida o `slug` e o passa para um Client Component (`OrganizationClient.tsx`).
*   **`OrganizationClient.tsx`:** Busca no cliente (via Supabase anónimo): 1. Detalhes da organização (por `slug`). 2. Eventos futuros publicados. 3. Eventos passados publicados. Renderiza toda a UI da página, incluindo os cartões de evento com links.
*   **Tecnologias:** React (Client/Server), Next.js (`Image`, `Link`), Supabase (Client JS), `lucide-react`, Tailwind CSS.
*   **Pontos Fortes:**
    *   Implementa uma página de perfil público funcional e visualmente estruturada.
    *   Busca e apresenta os dados relevantes (detalhes da org, eventos).
    *   Componente `renderSocialLink` reutilizável.
*   **Áreas para Melhoria / Observações:**
    *   Busca de dados sequencial no cliente (`useEffect`); poderia ser paralelizada com `Promise.all`.
    *   Tratamento de erro limitado (apenas `console.error` e mensagem genérica "Organização não encontrada").
    *   Links dos cartões de evento são fixos (`/g/[id]`); deveriam ser dinâmicos baseados no tipo do evento (`/e/[id]` ou `/g/[id]`).
    *   Sem paginação para as listas de eventos.

### 12. Página de Login (`app/login/page.tsx`)

*   **Funcionalidade:** Página pública para utilizadores iniciarem sessão. Contém formulário para email e senha.
*   **Submissão:** Chama a função `signIn` do hook `useAuth`. O redirecionamento pós-login é tratado pelo `useAuth`/`AuthProvider`.
*   **Tratamento de Erros:** Exibe mensagens de erro específicas para credenciais inválidas ou rate limit, e genéricas para outros erros.
*   **Depuração:** Inclui um botão "Testar Conexão" que verifica a conectividade com a API Supabase e a presença de tokens no localStorage, exibindo o resultado.
*   **Tecnologias:** React (Client Component), Next.js (`useRouter`, `Link`), `@/hooks/use-auth`, `shadcn/ui`, `framer-motion`.
*   **Pontos Fortes:**
    *   Fluxo de login funcional.
    *   Tratamento de erros específicos útil.
    *   Ferramenta de depuração de conexão Supabase integrada.
    *   UI consistente com a página de registo.
*   **Áreas para Melhoria / Observações:**
    *   Não utiliza `react-hook-form`/`zod` (inconsistente com Registo).
    *   Depende da implementação de `signIn` e do redirecionamento em `useAuth`.
    *   Não inclui funcionalidades como "Lembrar-me" ou recuperação de senha.
    *   Importa `resetSession` mas não a usa.

### 13. Clientes Supabase (Servidor) (`app/lib/supabase/server.ts`)

*   **Funcionalidade:** Define funções utilitárias para criar clientes Supabase para uso no lado do servidor (Server Components, API Routes, Server Actions).
*   **Clientes Fornecidos:**
    *   `createServiceClient()`: Cria cliente usando a `SUPABASE_SERVICE_ROLE_KEY` (com fallback para chave anónima se não definida). **Contorna RLS**. Uso: Operações administrativas.
    *   `createRouteHandlerClient()`: Cria cliente (via `@supabase/ssr`) que usa cookies (`next/headers`) para representar o utilizador autenticado. **Respeita RLS**. Uso: API Routes.
    *   `createServerSideClient()`: **Idêntico a `createRouteHandlerClient()`**. Uso: Server Components, Server Actions.
*   **Tecnologias:** Supabase (`@supabase/supabase-js`, `@supabase/ssr`), Next.js (`next/headers`).
*   **Pontos Fortes:**
    *   Abstrai a criação de diferentes tipos de clientes de servidor.
    *   Utiliza `@supabase/ssr` para integração correta com cookies.
    *   Centraliza a lógica de criação de clientes.
*   **Áreas para Melhoria / Observações:**
    *   Redundância entre `createServerSideClient` e `createRouteHandlerClient`.
    *   Fallback da chave de serviço para anónima em `createServiceClient` é potencialmente inseguro/confuso.
    *   Localização em `app/lib/` em vez de `lib/` na raiz.

### 14. Ações de Convidado (`app/lib/actions/guestActions.ts`)

*   **Funcionalidade:** Define Server Actions relacionadas com convidados. Contém a action `getGuestsForEvent`.
*   **`getGuestsForEvent`:**
    *   Busca uma lista paginada e filtrada de convidados para um `eventId`.
    *   Usa `createServerActionClient` (respeita RLS do chamador).
    *   Filtra por `eventId`, `searchTerm` (nome ou telefone via `ilike`), e `filterCheckedIn` (opcional).
    *   Faz join implícito com `profiles` e `teams` para obter nomes.
    *   Ordena por `created_at` descendente (fixo).
    *   Usa `{ count: 'exact' }` para contagem total.
    *   Retorna `{ guests: GuestResult[], totalCount: number, error?: string }`.
*   **Tecnologias:** Next.js (Server Actions), Supabase (Auth Helpers, Query Builder), TypeScript.
*   **Pontos Fortes:**
    *   Encapsulamento da lógica de busca no servidor.
    *   Uso correto de cliente Supabase para Server Actions (segurança RLS).
    *   Implementa filtros, paginação e joins necessários para `GuestListTable`.
    *   Boa tipagem.
*   **Áreas para Melhoria / Observações:**
    *   Performance de `ilike %term%` e `count: 'exact'` pode ser um problema em tabelas grandes sem otimizações (índices FTS).
    *   Ordenação fixa.
    *   Retorna telefone do convidado (garantir que RLS está correta).

### Páginas Públicas Específicas (`app/g/`, `app/e/`) [✓ Visto]

#### 15. Página Pública de Guest List (`app/g/[id]/page.tsx` e `GuestListPageClient.tsx`)

*   **Funcionalidade:** Página pública canónica (`/g/[id]`) para registo em guest lists. Usa Server Component (`page.tsx`) para passar `eventId` (e `promoterId`, `teamId` como `null`) para o Client Component (`GuestListPageClient.tsx`).
*   **Client Component (`GuestListPageClient.tsx`):**
    *   Busca detalhes do evento (incluindo `guest_list_settings` e datas de abertura/fecho) da tabela `events`.
    *   Calcula o estado atual da lista (Aberta, Fechada, Em Breve, Cheia, Inativa, etc.) com base nas datas e contagem de convidados.
    *   Usa `react-hook-form` e `zod` para validação do formulário (nome, telefone). Inclui seletor de país para prefixo telefónico.
    *   **Submissão:** Chama a API `POST /api/guests` (abordagem segura), passando dados do convidado e IDs de promotor/equipa (se houver).
    *   **Pós-Registo:** Exibe QR code retornado pela API. Mostra mensagem condicional se o evento requerer aprovação (`requiresApproval` da API).
    *   **Extras:** Inclui funcionalidade de partilha (WhatsApp, Copiar Link).
*   **Tecnologias:** React (Client/Server), Next.js, Supabase (Client), `react-hook-form`, `zod`, `fetch` API, `shadcn/ui`, `date-fns`, `lucide-react`.
*   **Pontos Fortes:**
    *   Implementação mais completa e segura das páginas de guest list encontradas.
    *   Usa API para escrita e geração de QR code (seguro).
    *   Lógica de estado da lista detalhada (aberta/fechada/etc.).
    *   UI rica com seletor de país, feedback claro, partilha.
    *   Estrutura Server/Client Component correta.
*   **Áreas para Melhoria / CRÍTICO:**
    *   **REDUNDÂNCIA (CRÍTICO):** A existência dos diretórios `/app/guest-list/` e `/app/public/guest-list/` com implementações alternativas é um problema grave.
    *   Depende da API `/api/guests`.
*   **Recomendação Urgente:** Manter esta implementação como a canónica em `/app/g/[id]`. **Remover** os diretórios `app/guest-list/` e `app/public/guest-list/` e todo o seu conteúdo. Verificar a implementação da API `/api/guests`.

#### 16. Contexto de Organização (`app/contexts/organization-context.tsx`) - [VERSÃO CORRETA]

*   **Funcionalidade:** Provider de Contexto React (`OrganizationProvider`) e hook (`useOrganization`) para gerir a organização ativa do utilizador logado.
*   **Localização:** Este ficheiro reside em `app/contexts/`, enquanto uma versão **defeituosa e incompleta** existe em `app/app/contexts/` (ver Análise antiga #16).
*   **Lógica:** Busca as organizações associadas ao utilizador (via tabela `user_organizations`), permite a seleção da organização ativa (`setCurrentOrganization`), e fornece os dados (`organizations`, `currentOrganization`, `isLoading`, `hasOrganizations`) aos componentes filhos.
*   **Tecnologias:** React (Context API, Hooks), Supabase (Client JS), `@/hooks/use-auth`.
*   **Pontos Fortes (Desta Versão):**
    *   **FUNCIONAL:** Inclui `setCurrentOrganization` e o hook `useOrganization`, tornando o contexto utilizável (corrige falha da versão em `app/app/...`).
    *   Lógica de busca e gestão da organização ativa parece robusta.
*   **Áreas para Melhoria / CRÍTICO:**
    *   **REDUNDÂNCIA (CRÍTICO):** A versão defeituosa em `app/app/contexts/organization-context.tsx` deve ser **removida**.
    *   **Persistência:** Falta persistência da seleção ativa no `localStorage` (presente na versão defeituosa).
*   **Recomendação Urgente:** Remover `app/app/contexts/organization-context.tsx`. Garantir que todas as importações apontam para `app/contexts/organization-context.tsx`. Adicionar persistência via `localStorage` a esta versão correta.

## Notas Arquiteturais Iniciais

*   A aplicação utiliza o Next.js App Router com uma clara separação entre componentes de cliente e servidor (embora os analisados até agora sejam maioritariamente de cliente devido à interatividade).
*   O estado global parece ser gerido via Context API (`useAuth`, `useOrganization`), o que é adequado para estados como autenticação e organização ativa.
*   Supabase é usado como BaaS (Backend as a Service) para autenticação, base de dados e armazenamento de ficheiros.
*   `shadcn/ui` e Tailwind CSS fornecem a base para a UI, garantindo consistência visual e desenvolvimento eficiente.

## Recomendações Iniciais

*   **Prioridade:** Corrigir o potencial memory leak no componente `OrganizacaoPage` relacionado com `URL.createObjectURL`.
*   **Consistência:** Padronizar o uso de ícones (preferencialmente Lucide) em toda a aplicação.
*   **Validação:** Implementar validação de input (especialmente para ficheiros) no lado do cliente para melhor UX e segurança básica.
*   **Melhorar UX de Loading:** Usar skeletons em vez de `null` ou simples mensagens de texto durante o carregamento de dados.
*   **Revisão de Segurança:** Confirmar que as políticas de Row Level Security (RLS) no Supabase estão corretamente configuradas para todas as operações.

*(Este documento será atualizado à medida que a análise progride.)*

---

## Análise Detalhada por Diretório (`app/` e filhos)

*(Esta secção detalha os componentes e páginas encontradas, seguindo a estrutura de diretórios)*

### Diretório: `app/components/dashboard/` (Localização Raiz - Suspeita)

**Nota Estrutural Importante:** A existência destes componentes diretamente em `app/components/` (ao nível da raiz `app/`) em vez de em `app/app/components/` sugere fortemente uma **redundância ou erro estrutural**. É muito provável que estes ficheiros sejam duplicados ou que devessem estar localizados dentro da estrutura de `app/app/`. Recomenda-se verificar a existência de cópias em `app/app/components/dashboard/`, escolher a versão correta/completa, remover as duplicadas e padronizar a localização dentro de `app/app/components/`.

#### 17. Lista de Membros da Equipe (`app/components/dashboard/team-members-list.tsx`)

*   **Funcionalidade:** Exibe a lista de membros de uma equipe, permite atualizar a lista e (para chefes de equipe) remover membros (com confirmação).
*   **Busca de Dados:** Tenta buscar via RPC `get_team_members`, com fallback para query direta em `team_members` + `users`. Inclui fallback para mostrar o próprio chefe se a busca falhar.
*   **Remoção:** Impede auto-remoção do chefe, usa `AlertDialog` para confirmação, atualiza UI localmente.
*   **Tecnologias:** React (Client Component), Supabase (Client JS, RPC), `shadcn/ui`, `lucide-react`, `sonner`, `@/hooks/use-auth`.
*   **Pontos Fortes:** Busca robusta com fallback, segurança na remoção, boa UX (loading, toasts).
*   **Áreas para Melhoria / CRÍTICO:**
    *   **REDUNDÂNCIA (CRÍTICO):** Provavelmente duplicado com um ficheiro em `app/app/components/dashboard/`. Precisa ser consolidado.
    *   **Permissão de Remoção:** Verifica permissão via `user.user_metadata.role`, seria mais robusto verificar na tabela `team_members` para a equipa específica.
*   **Recomendação:** Consolidar com a versão em `app/app/components/` e remover esta cópia.

#### 18. Feed de Atividades (`app/components/dashboard/activity-feed.tsx`)

*   **Funcionalidade:** Exibe uma lista de atividades recentes (e.g., membro entrou, evento criado, venda realizada), formatadas com ícones, descrições dinâmicas e tempo relativo.
*   **Estrutura:** Componente principal `ActivityFeed` recebe array `activities` e renderiza `ActivityEntry` para cada item. Limita número de itens.
*   **`ActivityEntry`:** Formata cada tipo de atividade com ícone (`lucide-react`), descrição e tempo (`date-fns`).
*   **Tecnologias:** React, `date-fns`, `lucide-react`, Tailwind CSS, TypeScript.
*   **Pontos Fortes:** Componente modular, formatação clara, flexível para novos tipos de atividade.
*   **Áreas para Melhoria / CRÍTICO:**
    *   **REDUNDÂNCIA (CRÍTICO):** Provavelmente duplicado ou no local errado. Deveria estar em `app/app/components/`.
    *   **Origem dos Dados:** Apenas exibe dados; a lógica de busca/geração das atividades reside noutro local.
*   **Recomendação:** Consolidar com a versão em `app/app/components/` (se existir) e remover esta cópia.

#### 19. Exibição do Código da Equipe (`app/components/dashboard/team-code-display.tsx`)

*   **Funcionalidade:** Mostra o código de convite da equipe num `Card`, permitindo copiar para a área de transferência ou compartilhar via API Web Share (com fallback para cópia).
*   **UI/UX:** Exibe código textual, botões de "Copiar" (com feedback visual) e "Compartilhar". Desabilita botões se não houver código. Usa `toast` para notificações. Inclui placeholder visual de QR Code (não funcional).
*   **Tecnologias:** React, Web APIs (`navigator.clipboard`, `navigator.share`), `shadcn/ui`, `lucide-react`, `sonner`.
*   **Pontos Fortes:** Funcionalidade clara, boa UX (feedback, fallback de partilha).
*   **Áreas para Melhoria / CRÍTICO:**
    *   **REDUNDÂNCIA (CRÍTICO):** Provavelmente duplicado ou no local errado. Deveria estar em `app/app/components/`.
    *   **Placeholder QR Code:** Ícone pode ser confuso; considerar gerar QR real ou usar outro ícone.
*   **Recomendação:** Consolidar com a versão em `app/app/components/` (se existir) e remover esta cópia. Considerar gerar um QR Code real se for desejado.

---

### Diretório: `app/api/guests/` [✓ Visto]

#### 20. API de Convidados (`app/api/guests/route.ts`)

*   **Funcionalidade:** Define handlers para `POST` (registar convidado), `PUT` (check-in) e `GET` (listar convidados) na rota `/api/guests`.
*   **Handler POST (Registo):**
    *   Recebe `event_id`, `name`, `phone`, `promoter_id?`, `team_id?`.
    *   **Validações (INSEGURAS):** Usa `supabaseAdmin` (service role - ignora RLS) para validar evento (tipo, publicado, datas, limite de convidados).
    *   **Geração QR Code:** Gera QR Code (Data URL) com dados do convidado.
    *   **Persistência (CRÍTICA/INSEGURA/CONFUSA):** Tenta salvar o convidado (com service role) numa sequência de locais: SQL direto em `guests`, `.insert()` em `guests`, `.insert()` em `guest_list_guests`, criação/inserção em tabela dinâmica `guests_{eventId}` (desabilita RLS!).
    *   **Fallback (INSEGURO):** Retorna sucesso 200 com QR code mesmo se a escrita na BD falhar.
    *   **Vulnerabilidade SQL Injection:** Constrói SQL manualmente com interpolação de strings.
*   **Handler PUT (Check-in):**
    *   Recebe `id`, `event_id`, `checked_in`.
    *   Busca convidado em `guests` ou `guest_list_guests` (usando cliente anónimo - respeita RLS anónima).
    *   Valida `event_id`.
    *   Atualiza `checked_in`, `is_checked_in`, `check_in_time`, `updated_at` (usando cliente anónimo).
    *   **Falta Autenticação:** Endpoint parece público.
*   **Handler GET (Listagem):**
    *   Recebe `eventId`.
    *   Busca todos (`select *`) os convidados de `guests` para o evento (usando cliente anónimo).
    *   Calcula estatísticas.
    *   **Falta Autenticação/Paginação:** Endpoint público, busca todos os dados.
*   **Tecnologias:** Next.js (Route Handlers), Supabase (Client JS, Service Role Key!), `qrcode`, `uuid`.
*   **Pontos Fortes:** Validações no backend (POST), geração de QR code, cálculo de stats (GET).
*   **Áreas para Melhoria / CRÍTICO:**
    *   **USO DE SERVICE ROLE PARA ESCRITA (CRÍTICO/INSEGURO):** Contorna RLS, permitindo escrita não autorizada.
    *   **LÓGICA DE PERSISTÊNCIA CAÓTICA (CRÍTICO):** Múltiplas tabelas, criação dinâmica insegura, inconsistências garantidas.
    *   **SQL INJECTION (CRÍTICO):** Construção manual de SQL insegura.
    *   **FALLBACK INSEGURO (CRÍTICO):** Retornar sucesso 200 sem salvar dados.
    *   **FALTA DE AUTENTICAÇÃO (PUT/GET):** Endpoints sensíveis estão públicos.
    *   **INCONSISTÊNCIA DE TABELAS:** POST, PUT e GET operam sobre conjuntos diferentes de tabelas.
*   **Recomendação Urgente:** **REFATORAÇÃO COMPLETA E IMEDIATA.**
    1.  Remover uso da `service_role_key` para escrita.
    2.  Definir UMA tabela canónica para convidados e remover lógicas de fallback/criação dinâmica.
    3.  Usar métodos seguros do Supabase (`.insert`, `.update`) ou funções SQL parametrizadas, NUNCA interpolação de strings em SQL.
    4.  Falhar corretamente se a escrita na BD falhar.
    5.  Implementar autenticação/autorização adequada para PUT e GET.
    6.  Rever e corrigir RLS para `anon` e `authenticated`.

#### 20.1 API de Criação de Equipes Alternativa (`app/api/teams/create/route-alt.ts`)

*   **Funcionalidade:** Versão alternativa/anterior do handler POST para `/api/teams/create`.
*   **Comparação:** Quase idêntica a `route.ts`, mas *não* inclui `organization_id` nem `created_by` na inserção na tabela `teams`, tornando-a incompleta e incorreta.
*   **Conclusão:** Redundante e obsoleto.
*   **Recomendação Urgente:** **REMOVER** este ficheiro (`route-alt.ts`).

---

### Diretório: `app/api/teams/` [✓ Visto]

#### 21. API de Criação de Equipes (`app/api/teams/create/route.ts`)

*   **Funcionalidade:** Handler `POST` para `/api/teams/create`. Cria uma nova equipe associada a uma organização.
*   **Fluxo:**
    1.  Recebe `name` e `organizationId`.
    2.  Valida input.
    3.  **Autenticação:** Requer usuário logado (via `createRouteHandlerClient`).
    4.  **Autorização:** Verifica se o usuário pertence à organização (via `user_organizations` - *precisa confirmar tabela*) e tem role `owner` ou `admin`.
    5.  **Criação (INSEGURA):** Usa `supabaseAdmin` (service role) para:
        *   Inserir na tabela `teams` (com `teamCode` gerado).
        *   Inserir na tabela `organization_teams` para vincular.
    6.  **Rollback Manual:** Tenta deletar da `teams` se a inserção em `organization_teams` falhar.
*   **Tecnologias:** Next.js (Route Handlers), Supabase (Auth Helpers, Client JS, Service Role Key!), `uuid`.
*   **Pontos Fortes:** Verifica autenticação/autorização básica, valida input, tenta rollback.
*   **Áreas para Melhoria / CRÍTICO:**
    *   **USO DE SERVICE ROLE PARA ESCRITA (CRÍTICO/INSEGURO):** Contorna RLS, embora a permissão seja verificada *antes*.
    *   **ATOMICIDADE:** Rollback manual não garante atomicidade; preferível usar transação/função PostgreSQL.
    *   **VERIFICAÇÃO DE TABELA DE MEMBROS:** Incerteza sobre `user_organizations` vs `organization_members`.
    *   **REDUNDÂNCIA:** Existe `route-alt.ts` no mesmo diretório.
*   **Recomendação:**
    1.  **Refatorar para remover `service_role_key` da escrita**, usar RLS do usuário autenticado.
    2.  Confirmar e usar a tabela de membros correta para permissão.
    3.  Usar função PostgreSQL (RPC) para garantir atomicidade na criação.
    4.  Remover `route-alt.ts` se obsoleto.

#### 21.1 API de Criação de Equipes Alternativa (`app/api/teams/create/route-alt.ts`)

*   **Funcionalidade:** Versão alternativa/anterior do handler POST para `/api/teams/create`.
*   **Comparação:** Quase idêntica a `route.ts`, mas *não* inclui `organization_id` nem `created_by` na inserção na tabela `teams`, tornando-a incompleta e incorreta.
*   **Conclusão:** Redundante e obsoleto.
*   **Recomendação Urgente:** **REMOVER** este ficheiro (`route-alt.ts`).

---

### Diretório: `app/api/organizations/` [✓ Visto]

#### 22. API de Criação de Organizações (`app/api/organizations/route.ts`)

*   **Funcionalidade:** Handler `POST` para `/api/organizations`. Cria uma nova organização, faz upload de logo/banner e associa o criador.
*   **Fluxo:**
    1.  Recebe dados via `FormData` (incluindo `logo`, `banner` e **`userId`**).
    2.  Valida campos obrigatórios.
    3.  **Upload de Ficheiros (INSEGURO):** Usa `supabaseAdmin` (service role) para fazer upload de logo/banner para `organization_logos` (contorna políticas de storage).
    4.  **Verificação/Criação de Perfil (INSEGURO):** Usa `supabaseAdmin` para verificar/criar registo na tabela `profiles` para o `userId`.
    5.  **Criação da Organização (INSEGURO):** Usa `supabaseAdmin` para inserir na tabela `organizations` (ignora RLS).
    6.  **Criação da Relação (INSEGURO):** Usa `supabaseAdmin` para inserir na tabela `user_organizations` (ignora RLS). Tenta fallback com RPC se a inserção direta falhar, mas continua mesmo se o fallback falhar.
*   **Tecnologias:** Next.js (Route Handlers), Supabase (Admin Client, Storage, Auth Admin API), FormData API.
*   **Pontos Fortes:** Implementa fluxo completo com upload.
*   **Áreas para Melhoria / CRÍTICO:**
    *   **USO MASSIVO DE SERVICE ROLE (CRÍTICO/INSEGURO):** Toda a lógica usa `service_role_key`, contornando RLS e políticas de storage.
    *   **FALTA DE AUTENTICAÇÃO DA CHAMADA (CRÍTICO/INSEGURO):** Confia no `userId` vindo do FormData; qualquer pessoa pode tentar criar uma organização em nome de outrem.
    *   **FALLBACK INSEGURO:** Continua mesmo se a criação da relação user-org falhar, levando a estado inconsistente.
*   **Recomendação Urgente:** **REFATORAÇÃO COMPLETA E IMEDIATA.**
    1.  Remover completamente o uso de `supabaseAdmin` (service role).
    2.  Obter `userId` da sessão autenticada, não do FormData.
    3.  Usar RLS e Políticas de Storage para controlar acesso.
    4.  Realizar operações com o cliente autenticado do usuário.
    5.  Garantir atomicidade (idealmente via transação/função PostgreSQL).
    6.  Falhar corretamente se passos críticos falharem.

---

### Diretório: `app/api/guest-count/` [✓ Visto]

#### 23. API de Contagem de Convidados (`app/api/guest-count/route.ts`)

*   **Funcionalidade:** Handler `GET` para `/api/guest-count?eventId=...`. Retorna a contagem total e de check-in para um evento.
*   **Fluxo:**
    1.  Recebe `eventId` da query string.
    2.  **Contagem (INSEGURA):** Usa `supabaseAdmin` (service role) para executar duas queries `count` separadas na tabela `guests` (total e `checked_in = true`).
    3.  Retorna `{ success: true, count, checkedIn, timestamp }`.
    4.  Define headers para desabilitar cache.
*   **Tecnologias:** Next.js (Route Handlers), Supabase (Admin Client).
*   **Pontos Fortes:** Endpoint dedicado para contagem, desabilita cache.
*   **Áreas de Melhoria / CRÍTICO:**
    *   **USO DE SERVICE ROLE (CRÍTICO/INSEGURO):** Ignora RLS, permitindo que qualquer pessoa obtenha contagens de qualquer evento.
    *   **FALTA DE AUTENTICAÇÃO:** Endpoint público para dados potencialmente sensíveis.
    *   **EFICIÊNCIA:** Duas queries separadas; melhor usar uma única query ou RPC.
    *   **TABELA ASSUMIDA:** Assume `guests` como fonte única, o que pode ser incorreto.
*   **Recomendação:**
    1.  Remover `service_role_key`.
    2.  Implementar autenticação/autorização se necessário.
    3.  Usar RLS para controlar acesso.
    4.  Otimizar para uma única query/RPC.
    5.  Verificar a tabela de origem correta.

---

### Diretório: `app/api/db-schema/` [✓ Visto]

#### 24. API de Diagnóstico de Schema (`app/api/db-schema/route.ts`)

*   **Funcionalidade:** Handler `POST` para `/api/db-schema`. Ferramenta de diagnóstico/depuração que recebe `eventId` e retorna informações sobre as tabelas `guests`, `guest_list_guests`, `guests_{eventId}` (se existir), e permissões RLS.
*   **Fluxo (INSEGURO):**
    1.  Recebe `eventId`.
    2.  Usa `supabaseAdmin` (service role) para todas as operações (ignora RLS).
    3.  Consulta `guests`, `guest_list_guests`, verifica/consulta tabela dinâmica `guests_{eventId}` (via RPC `exec_sql`).
    4.  Consulta permissões SELECT de `anon`/`authenticated` nas tabelas `guest%`.
    5.  Retorna contagens, amostras de dados (limitadas a 5 linhas para algumas tabelas), e informações de permissão.
*   **Tecnologias:** Next.js (Route Handlers), Supabase (Admin Client, RPC).
*   **Pontos Fortes:** Ferramenta potencialmente útil para depuração interna das inconsistências de tabelas.
*   **Áreas de Melhoria / CRÍTICO:**
    *   **USO DE SERVICE ROLE (CRÍTICO/INSEGURO):** Ignora RLS, expondo estrutura, permissões e amostras de dados.
    *   **FALTA DE AUTENTICAÇÃO (CRÍTICO/INSEGURO):** Endpoint de diagnóstico exposto publicamente.
    *   **EXPOSIÇÃO DE DADOS:** Retorna amostras de dados reais de convidados.
    *   **SQL INJECTION (POTENCIAL):** Construção de SQL via interpolação para tabelas dinâmicas e permissões.
*   **Recomendação Urgente:**
    1.  **RESTRINGIR ACESSO IMEDIATAMENTE:** Proteger com autenticação/autorização rigorosa (apenas admins/devs).
    2.  Remover `service_role_key` se possível (usar role autenticado).
    3.  Remover/Ofuscar amostras de dados sensíveis na resposta.
    4.  Rever construção SQL.
    5.  **Considerar remover completamente este endpoint da API pública** e usar ferramentas de introspecção do Supabase diretamente para diagnóstico.

---

### Diretório: `app/api/cron/` [✓ Visto]

#### 25. API CRON - Atualização de Status de Eventos (`app/api/cron/update-event-status.ts`)

*   **Funcionalidade:** Handler `GET` para `/api/cron/update-event-status`. Projetado para ser chamado por um CRON job para atualizar o status (`scheduled`, `active`, `completed`) de eventos na tabela `events` com base na data/hora atual.
*   **Fluxo:**
    1.  **Autenticação (DESATIVADA):** Código para verificar `CRON_SECRET` está comentado.
    2.  **Busca Eventos:** Seleciona eventos não 'completed' ou null (usando cliente Supabase padrão - sujeito a RLS `anon`).
    3.  **Lógica de Status:** Usa função `isBetweenDates` (com margem de 8h pós-fim) para determinar o status correto.
    4.  **Atualização:** Se o status calculado difere do atual, atualiza o evento na tabela `events` (usando cliente padrão - sujeito a RLS `anon`).
    5.  Retorna resumo das atualizações.
*   **Tecnologias:** Next.js (Route Handlers), Supabase (Client JS).
*   **Pontos Fortes:** Implementa lógica necessária de atualização automática, usa cliente padrão (respeita RLS).
*   **Áreas de Melhoria / CRÍTICO:**
    *   **SEGURANÇA (CRÍTICO):** Endpoint público por padrão (autenticação comentada). Qualquer um pode chamá-lo e forçar operações de leitura/escrita.
    *   **DEPENDÊNCIA DE RLS `anon`:** Requer que RLS anónimas permitam SELECT e UPDATE na tabela `events` (especificamente no campo `status`), o que pode ser excessivamente permissivo.
    *   **EFICIÊNCIA:** Buscar e processar todos os eventos na API pode ser ineficiente.
*   **Recomendação Urgente:**
    1.  **ATIVAR AUTENTICAÇÃO IMEDIATAMENTE** (descomentar verificação `CRON_SECRET`).
    2.  Verificar e ajustar RLS para `anon` (ou criar role específico para CRON) para permitir apenas as operações estritamente necessárias.
    3.  **Considerar migrar a lógica para uma Função PostgreSQL agendada no Supabase (`pg_cron`)** para maior segurança e eficiência.

---

### Diretório: `app/api/admin/` [✓ Visto]

#### 26. API Admin - Adicionar Coluna (`app/api/admin/add-column/route.ts`)

*   **Funcionalidade:** Handler `GET` (!) para `/api/admin/add-column`. Tenta adicionar a coluna `status` à tabela `events` se não existir.
*   **Fluxo (INSEGURO/PERIGOSO):**
    1.  Verifica se a coluna existe com `select` (usando cliente anónimo).
    2.  Tenta chamar RPC `execute_sql` via REST com `ALTER TABLE ... ADD COLUMN IF NOT EXISTS status...` (usando chave anónima para auth - provavelmente falha, mas é inseguro).
    3.  Tenta um "fallback" inválido com `update` falso.
    4.  Retorna sucesso ou falha (com instrução para adicionar manualmente).
*   **Tecnologias:** Next.js (Route Handlers), Supabase (Client JS, REST API).
*   **Pontos Fortes:** Nenhum relevante dada a natureza perigosa.
*   **Áreas de Melhoria / CRÍTICO:**
    *   **MODIFICAÇÃO DE SCHEMA VIA API (CRÍTICO/INSEGURO):** Expor `ALTER TABLE` via API é extremamente perigoso.
    *   **ENDPOINT PÚBLICO/GET:** Funcionalidade administrativa sensível exposta publicamente e usando método GET para ação destrutiva.
    *   **AUTENTICAÇÃO INSEGURA:** Tenta usar chave anónima para chamar RPC potencialmente administrativa.
    *   **LÓGICA FALHA:** O fallback é inválido.
*   **Recomendação Urgente:**
    1.  **REMOVER ESTE ENDPOINT IMEDIATAMENTE.**
    2.  Gerir schema **APENAS** via migrações controladas (Supabase CLI).
    3.  Rever/restringir permissões de RPCs (`check_column_exists`, `exec_sql`?) e garantir que roles não privilegiados não podem executar DDL/DML arbitrário.

#### 27. API Admin - Adicionar Campo Status (`app/api/admin/add-status-field/route.ts`)

*   **Funcionalidade:** Handler `GET` (!) para `/api/admin/add-status-field`. Propósito similar a `add-column`, mas com lógica de tentativa diferente para adicionar a coluna `status` a `events`.
*   **Fluxo (INSEGURO/PERIGOSO):**
    1.  Verifica se coluna existe com `select`.
    2.  Tenta chamar RPC `add_status_field` (usando cliente anónimo).
    3.  Se falhar, tenta criar/executar/dropar função `add_status_column` (que faz `ALTER TABLE` e `UPDATE`) via REST (usando chave anónima para auth).
    4.  Se falhar, faz um "fallback" inútil que apenas calcula e loga status no servidor.
    5.  Retorna sucesso ou falha.
*   **Tecnologias:** Next.js (Route Handlers), Supabase (Client JS, REST API).
*   **Pontos Fortes:** Nenhum relevante.
*   **Áreas de Melhoria / CRÍTICO:**
    *   **MODIFICAÇÃO DE SCHEMA VIA API (CRÍTICO/INSEGURO):** Tenta `ALTER TABLE` e criar/dropar funções via API GET.
    *   **ENDPOINT PÚBLICO/GET:** Exposição pública de funcionalidade administrativa perigosa.
    *   **AUTENTICAÇÃO INSEGURA:** Usa chave anónima para tentar executar RPCs/SQL complexos.
    *   **LÓGICA FALHA:** O fallback final é inútil.
*   **Recomendação Urgente:**
    1.  **REMOVER ESTE ENDPOINT IMEDIATAMENTE (juntamente com `add-column`).**
    2.  Gerir schema **APENAS** via migrações controladas.
    3.  Rever/restringir permissões de RPCs (`add_status_field`?) e garantir que `anon` não pode criar/alterar/dropar funções ou tabelas.

#### 28. API Admin - Configuração de BD (`app/api/admin/db-setup/route.ts`)

*   **Funcionalidade:** Handler `GET` (!) para `/api/admin/db-setup`. Versão mais completa para garantir que a coluna `status` exista em `events`, adicionar índice e inicializar valores.
*   **Fluxo (INSEGURO/PERIGOSO):**
    1.  Usa `supabaseAdmin` (service role) para todas as operações.
    2.  Verifica se coluna `status` existe (via RPC `check_column_exists` ou `information_schema`).
    3.  Se não existir, executa `ALTER TABLE ... ADD COLUMN status...`, `COMMENT ON COLUMN`, `CREATE INDEX` (via RPC `exec_sql` ou `supabase.sql()`).
    4.  Executa `UPDATE` para inicializar status (`completed`, `active`) com base na data (via RPC `exec_sql` ou `supabase.sql()`, continua mesmo se falhar).
    5.  Retorna sucesso.
*   **Tecnologias:** Next.js (Route Handlers), Supabase (Admin Client, RPC, `supabase.sql()`).
*   **Pontos Fortes:** Mais completo que `add-column`/`add-status-field` (inclui índice, inicialização).
*   **Áreas de Melhoria / CRÍTICO:**
    *   **MODIFICAÇÃO DE SCHEMA/DADOS VIA API GET (CRÍTICO/INSEGURO):** Endpoint público que executa `ALTER TABLE`, `CREATE INDEX`, `UPDATE` usando `service_role_key`.
    *   **EXECUÇÃO DE SQL ARBITRÁRIO:** Usa RPCs ou `supabase.sql()` para executar SQL vindo do código da API.
*   **Recomendação Urgente:**
    1.  **REMOVER ESTE ENDPOINT IMEDIATAMENTE (juntamente com `add-column` e `add-status-field`).**
    2.  Gerir schema e inicialização **APENAS** via migrações controladas (Supabase CLI).
    3.  Rever/restringir permissões de RPCs (`check_column_exists`, `exec_sql`?) e garantir que roles não privilegiados não podem executar DDL/DML arbitrário.

#### 29. API Admin - Alteração Simples (`app/api/admin/db-setup/simple-alter/route.ts`)

*   **Funcionalidade:** Handler `GET` (!) para `/api/admin/db-setup/simple-alter`. Versão concisa para adicionar/inicializar a coluna `status` em `events`.
*   **Fluxo (INSEGURO/PERIGOSO):**
    1.  Usa `supabaseAdmin` (service role) importado de `@/lib/supabase-admin`.
    2.  Executa um bloco PL/pgSQL (`DO $$...$$`) via `supabase.sql()` que:
        *   Verifica se a coluna `status` existe.
        *   Se não existir, executa `ALTER TABLE`, `CREATE INDEX`, e `UPDATE` para inicializar.
*   **Tecnologias:** Next.js (Route Handlers), Supabase (Admin Client, `supabase.sql()`).
*   **Pontos Fortes:** Nenhum.
*   **Áreas de Melhoria / CRÍTICO:**
    *   **MODIFICAÇÃO DE SCHEMA/DADOS VIA API GET (CRÍTICO/INSEGURO):** Executa DDL e DML complexos a partir de uma API GET usando `service_role_key`.
*   **Recomendação Urgente:**
    1.  **REMOVER ESTE ENDPOINT IMEDIATAMENTE (juntamente com `add-column`, `add-status-field`, `db-setup`).**
    2.  Reforçar o uso **EXCLUSIVO** de migrações controladas (Supabase CLI) para alterações de schema.

#### 30. API Admin - Atualizar Status (`app/api/admin/update-status/route.ts`)

*   **Funcionalidade:** Handler `GET` (!) para `/api/admin/update-status`. Força a atualização do campo `status` em TODOS os eventos baseando-se na `start_date`.
*   **Fluxo (INSEGURO/PERIGOSO):**
    1.  Usa `supabaseAdmin` (service role).
    2.  Executa SQL via `supabase.sql()` para fazer `UPDATE public.events SET status = 'completed'` (para `start_date < CURRENT_DATE`) e `SET status = 'active'` (para `start_date = CURRENT_DATE`).
    3.  Retorna sucesso ou erro.
*   **Tecnologias:** Next.js (Route Handlers), Supabase (Admin Client, `supabase.sql()`).
*   **Pontos Fortes:** Nenhum.
*   **Áreas de Melhoria / CRÍTICO:**
    *   **UPDATE EM MASSA VIA API GET (CRÍTICO/INSEGURO):** Endpoint público que modifica todos os eventos usando `service_role_key`.
    *   **REDUNDANTE/PERIGOSO:** Funcionalidade similar ao CRON job `/api/cron/update-event-status`, mas implementada de forma insegura aqui.
*   **Recomendação Urgente:**
    1.  **REMOVER ESTE ENDPOINT IMEDIATAMENTE.**
    2.  Gerir atualização de status apenas via CRON job (que precisa ser protegido).

#### 31. Definição de Schema - Equipes/Comissões (`app/api/admin/wallet/schema.ts`)

*   **Funcionalidade:** Exporta a constante string `createTeamsSchema` contendo SQL DDL para criar tabelas (`teams`, `team_members`, `organization_teams`, `event_teams`, `commissions`, `commission_payments`, etc.), funções (`trigger_set_timestamp`, `generate_team_code`, `create_promoter_team_v2`), triggers e políticas RLS para um sistema de equipes/comissões. Exporta também funções TS (`createTeamsTables`, `checkTeamsTables`, `createPromotionFunction`) para tentar aplicar/verificar este schema.
*   **NÃO é uma API Route.**
*   **Tecnologias:** SQL (PostgreSQL), TypeScript.
*   **Pontos Fortes:** Define um schema de dados aparentemente completo para a funcionalidade de equipes/comissões. Inclui triggers úteis e referências condicionais.
*   **Áreas de Melhoria / CRÍTICO:**
    *   **RLS SIMPLIFICADAS/INSEGURAS (CRÍTICO):** As políticas RLS criadas são excessivamente permissivas (e.g., `USING (true)`), permitindo acesso muito amplo a usuários autenticados. Precisam ser reescritas.
    *   **FUNÇÃO `create_promoter_team_v2` INSEGURA (CRÍTICO):** Função `SECURITY DEFINER` que modifica `auth.users` tem permissão `EXECUTE` para `anon`. Risco de segurança elevado.
    *   **GESTÃO DE SCHEMA INADEQUADA:** Definir schema complexo numa string TS e tentar aplicá-lo via RPC `exec_sql` (na função `createTeamsTables`) é frágil e não versionado. Isso pertence a migrações.
    *   **LOCALIZAÇÃO:** Ficheiro de definição de schema dentro de `app/api/admin/wallet/` é inadequado.
*   **Recomendação Urgente:**
    1.  **Mover o SQL de `createTeamsSchema` para migrações controladas (Supabase CLI)**.
    2.  **Rever e Corrigir URGENTEMENTE as políticas RLS** para serem específicas e seguras.
    3.  **Rever e Corrigir URGENTEMENTE a função `create_promoter_team_v2`** (permissões, lógica de update `auth.users`).
    4.  Remover as funções TS exportadas (`createTeamsTables`, etc.) e a dependência da RPC `exec_sql` para aplicar schema.
    5.  Mover/reorganizar este ficheiro para um local mais apropriado se alguma definição de tipo TS for útil, ou remover se todo o conteúdo for para migrações.

#### 32. API Admin - Criar Tabelas Wallet (`app/api/admin/wallet/create-tables/route.ts`)

*   **Funcionalidade:** Handler `GET` (!) para `/api/admin/wallet/create-tables`. Tenta criar as tabelas de equipes/comissões chamando funções de `../schema.ts`.
*   **Fluxo (INSEGURO/PERIGOSO):**
    1.  Usa `createServiceClient` (que usa service role).
    2.  Chama `checkTeamsTables` (de `schema.ts`) para verificar se `teams` existe.
    3.  Se não existir, chama `createTeamsTables` (de `schema.ts`) que tenta executar todo o DDL/RLS/Funções inseguras de `createTeamsSchema` via RPC `exec_sql`.
    4.  Retorna sucesso ou erro.
*   **Tecnologias:** Next.js (Route Handlers), Supabase (Admin Client via `createServiceClient`).
*   **Pontos Fortes:** Nenhum.
*   **Áreas de Melhoria / CRÍTICO:**
    *   **APLICAÇÃO DE SCHEMA VIA API GET (CRÍTICO/INSEGURO):** Endpoint público que tenta executar DDL complexo usando `service_role_key`.
*   **Recomendação Urgente:**
    1.  **REMOVER ESTE ENDPOINT IMEDIATAMENTE.**
    2.  Aplicar o schema de `schema.ts` **APENAS** via migrações controladas (Supabase CLI), após corrigir as RLS e funções inseguras nele contidas.

### Conclusão e Recomendação Global para `app/api/admin/`

O diretório `app/api/admin/` (incluindo `add-column`, `add-status-field`, `db-setup`, `update-status`, `wallet/create-tables`) contém um conjunto de APIs administrativas **extremamente perigosas**. Todas tentam modificar o schema ou dados em massa usando o método `GET`, utilizam a `service_role_key` ignorando RLS, e estão potencialmente expostas publicamente.

**Recomendação Global Urgente:**
1.  **REMOVER TODO O DIRETÓRIO `app/api/admin/` E SEU CONTEÚDO IMEDIATAMENTE.**
2.  Gerir **TODAS** as alterações de schema e inicializações/migrações de dados exclusivamente através de **ferramentas de migração controladas (Supabase CLI)**.
3.  Rever e restringir rigorosamente as permissões de quaisquer **RPCs** que permitam execução de SQL arbitrário ou modificação de schema.

---

## Análise da Aplicação Autenticada (`app/app/`) [✓ Visto]

*(Esta secção foca-se na estrutura e componentes da área principal da aplicação, acessível após login)*

### Layout Principal da Aplicação (`app/app/layout.tsx`)

#### 33. Layout da Área Autenticada (`app/app/layout.tsx`)

*   **Funcionalidade:** Layout Server Component para toda a secção `/app/...`. Protege rotas, define estrutura de dashboard (nav lateral + conteúdo) e aplica providers específicos.
*   **Fluxo:**
    1.  **Autenticação Server-Side:** Usa `createClient` (server) para `getUser`. Se não houver user, `redirect('/login')`.
    2.  **Navegação por Role:** Obtém `user.user_metadata.role` e define `navItems` diferentes para 'organizador', 'chefe-equipe', 'promotor'.
    3.  **Renderização:**
        *   **(REDUNDANTE):** Inclui `<html>`, `<body>`.
        *   **(REDUNDANTE):** Envolve com `AuthProvider`.
        *   Envolve com `OrganizationProvider` (o correto de `app/contexts/`).
        *   Cria layout Grid com `DashboardNav` (de `_components/`, recebe `navItems`) e `<main>` para `{children}`.
        *   Usa `Suspense` com `LoadingSpinner` para `{children}`.
        *   **(REDUNDANTE):** Inclui `Toaster`.
*   **Tecnologias:** Next.js (Layout, Server Component, `redirect`), React (`Suspense`), Supabase (Server Client), Context API, Tailwind CSS/`shadcn/ui`.
*   **Pontos Fortes:** Proteção de rota no servidor, navegação dinâmica por role, uso do `OrganizationProvider` correto, estrutura de dashboard padrão.
*   **Áreas de Melhoria / CRÍTICO:**
    *   **REDUNDÂNCIA DE ELEMENTOS/PROVIDERS (CRÍTICO):** Reinclui `<html>`, `<body>`, `AuthProvider`, `Toaster`, que já estão no layout raiz (`app/layout.tsx`). Causa provável de problemas.
    *   Tipagem `any[]` para `navItems`.
    *   Tratamento básico para roles desconhecidos.
*   **Recomendação Urgente:**
    1.  **REMOVER `<html>`, `<body>`, `AuthProvider`, `Toaster` deste layout.** Deve começar com o `div` do grid.
    2.  Corrigir tipagem de `navItems`.
    3.  Melhorar tratamento de roles desconhecidos.

### Diretório Interno: `app/app/_providers/`

#### 34. Provider de Erros de Autenticação (`app/app/_providers/auth-provider.tsx`)

*   **Funcionalidade:** Componente Client (`AuthErrorProvider`) que atua como um "safety net" global no cliente para detetar e tratar erros de autenticação (e.g., token expirado, 401 em fetch para Supabase) que podem ocorrer entre verificações normais.
*   **NÃO é o provider de autenticação principal.** Complementa o `AuthProvider` de `hooks/use-auth.ts`.
*   **Fluxo:**
    1.  Adiciona listeners globais para `error` e `unhandledrejection`.
    2.  Sobrescreve `window.fetch` para monitorizar respostas (status 401) e erros.
    3.  Usa função `isAuthError` para tentar identificar erros de autenticação por strings chave.
    4.  Se detetar erro de auth: define flag `authError` no `localStorage`, chama `supabase.auth.signOut()`, e redireciona para `/login`.
    5.  No mount, verifica flag `authError` no `localStorage` e redireciona se existir.
    6.  Limpa listeners/fetch no unmount.
*   **Tecnologias:** React (Client Component, Hooks), Next.js (`useRouter`), Web APIs (`localStorage`, `fetch`, listeners), Supabase (Client JS).
*   **Pontos Fortes:** Abordagem proativa para robustez da autenticação no cliente, lida com diferentes fontes de erro, usa `localStorage` para persistência entre reloads, implementa cleanup.
*   **Áreas de Melhoria / Considerações:**
    *   Nome confuso (`AuthErrorProvider` vs `AuthProvider`).
    *   Sobrescrever `window.fetch` é arriscado.
    *   Deteção de erro baseada em string é heurística.
    *   Reforça a necessidade de usar o `AuthProvider` principal apenas uma vez (no layout raiz).
*   **Recomendação:**
    1.  Considerar renomear (e.g., `AuthErrorHandler`).
    2.  Aplicar uma única vez dentro da árvore da área autenticada (e.g., em `app/app/layout.tsx` após remover o `AuthProvider` redundante).

---

### Diretório: `app/app/promotor/`

#### 35. Layout Específico do Promotor (`app/app/promotor/layout.tsx`)

*   **Funcionalidade:** Layout Client Component que define uma estrutura visual **diferente** para a secção `/app/promotor/...`, com sua própria barra lateral deslizante/responsiva.
*   **Estrutura:** Implementa barra lateral própria com botão hamburger, overlay, e conteúdo principal. **Não reutiliza** a estrutura de grid/`DashboardNav` de `app/app/layout.tsx`.
*   **Navegação:** Define um conjunto **inconsistente** de links na barra lateral (apenas `Dashboard`) que difere do esperado para 'promotor' em `app/app/layout.tsx`.
*   **Logout:** Inclui botão e função de logout (código potencialmente duplicado).
*   **Tecnologias:** React (Client Component, Hooks), Next.js, `lucide-react`, `shadcn/ui`, Tailwind CSS.
*   **Pontos Fortes:** Barra lateral responsiva.
*   **Áreas de Melhoria / CRÍTICO:**
    *   **INCONSISTÊNCIA DE LAYOUT (CRÍTICO):** Redefine completamente a estrutura visual dentro de `/app/app/`, quebrando a consistência com outros roles e o layout pai.
    *   **NAVEGAÇÃO INCONSISTENTE/INCOMPLETA:** Links não correspondem ao esperado.
    *   **CÓDIGO DUPLICADO:** Componente `NavItem` e função `handleLogout` provavelmente duplicados.
*   **Recomendação:**
    1.  **Reavaliar a arquitetura de layouts.** Idealmente, remover este layout e usar/adaptar `app/app/layout.tsx` para todos os roles.
    2.  Se uma UI diferente for *intencional*, isolar ou refatorar o layout pai para permitir essa exceção.
    3.  Centralizar código reutilizável.

#### 36. Dashboard do Promotor (`app/app/promotor/dashboard/page.tsx`)

*   **Funcionalidade:** Página Client Component que serve como ponto de entrada para promotores. Mostra a equipe principal à qual pertencem e as organizações associadas a essa equipe.
*   **Fluxo:**
    1.  Usa `useAuth` para obter `user`.
    2.  `useEffect` chama `loadTeams`.
    3.  `loadTeams` busca `team_members` do usuário, depois busca detalhes das `teams` e das `organizations` associadas.
    4.  Renderiza condicionalmente:
        *   Loading spinner.
        *   Mensagem de erro.
        *   Card "Nenhuma equipa associada" com link para aderir (`/app/promotor/equipes/ingressar`).
        *   Card com nome/código da equipe (`teams[0]`) e botão "Entrar".
    5.  Botão "Entrar" abre `Dialog` que lista as organizações (`teams[0].organizations`) associadas à equipe.
    6.  Cada organização na lista é um link para `/app/promotor/eventos?orgId={org.id}`.
*   **Tecnologias:** React (Client Component, Hooks), Next.js (`Link`, `Image`), Supabase (Client Component Client), `lucide-react`, `shadcn/ui`.
*   **Pontos Fortes:** Fluxo claro (equipe -> orgs -> eventos), bom tratamento de estados (loading, erro, sem equipe), UI limpa.
*   **Áreas de Melhoria / Considerações:**
    *   **Suposição de Equipe Única:** UI assume/mostra apenas a primeira equipe (`teams[0]`), embora a busca traga todas.
    *   **Eficiência da Query:** Busca em duas etapas (`team_members` -> `teams` + `organizations`) pode ser otimizada (RPC/View).
    *   Depende da página `/app/promotor/eventos` para mostrar os eventos.
*   **Conclusão:** Dashboard funcional, mas pode precisar de ajuste se promotores puderem estar em múltiplas equipes ativas simultaneamente. Eficiência da busca pode melhorar.

#### 37. Página de Eventos do Promotor (`app/app/promotor/eventos/page.tsx`)

*   **Funcionalidade:** Página Server Component (`/app/promotor/eventos`) que exibe eventos (ativos e passados) de uma organização específica, identificada pelo query param `orgId`.
*   **Fluxo:**
    1.  Recebe `orgId` de `searchParams` (redireciona para dashboard se ausente).
    2.  Cria cliente Supabase server-side.
    3.  Busca em paralelo detalhes da organização e todos os eventos publicados (`is_published = true`) dessa organização.
    4.  Chama `notFound()` se a organização não for encontrada.
    5.  Usa funções auxiliares (`isEventPast`, `parseDateTime`) para dividir eventos em `activeEvents` e `pastEvents`.
    6.  Ordena `pastEvents` (mais recentes primeiro).
    7.  Renderiza secções separadas para eventos ativos e terminados, mapeando os dados para o componente `EventCardPromotor`.
    8.  Mostra mensagens apropriadas se não houver eventos.
*   **Tecnologias:** Next.js (Server Component, `searchParams`, `redirect`, `notFound`), Supabase (Server Component Client), `date-fns` (implícito), `lucide-react`.
*   **Pontos Fortes:** Server-side data fetching eficiente (paralelo), lógica clara de separação/ordenação de eventos, tratamento de erros/casos vazios, delegação para componente de card.
*   **Áreas de Melhoria / Considerações:**
    *   Lógica de `isEventPast` pode precisar de refinamento (não usa a margem de 8h do CRON).
    *   Falta Paginação para muitos eventos.
    *   Depende da implementação de `EventCardPromotor`.
*   **Conclusão:** Página sólida para listar eventos por organização para o promotor. Paginação seria importante para escala.

#### 38. Card de Evento para Promotor (`app/app/promotor/eventos/EventCardPromotor.tsx`)

*   **Funcionalidade:** Componente Client que renderiza um card para um evento específico, mostrando flyer, título, data/hora, localização e um botão para Material Promocional.
*   **Estrutura:**
    *   Usa `Card` de `shadcn/ui`.
    *   Formata data/hora com função auxiliar `formatDisplayDateTime`.
    *   Mostra flyer (com fallback `ImageOff`) e overlay "Evento Realizado" se `isPastEvent`.
    *   **Modal Material Promocional:**
        *   **CÓDIGO DUPLICADO:** Lógica de estado e fetch (`fetchPromotionalImages` da tabela `promotional_materials`) é copiada de outras partes (e.g., Chefe Equipe).
        *   Botão no rodapé abre `Dialog`.
        *   Modal busca e exibe imagens promocionais numa grelha.
        *   Permite download de cada imagem.
        *   Trata loading, erro e estado vazio.
*   **Tecnologias:** React (Client Component), Next.js (`Image`), Supabase (Client), `date-fns`, `lucide-react`, `shadcn/ui`.
*   **Pontos Fortes:** Card informativo e visualmente bom, funcionalidade útil de acesso/download de material, bom tratamento de estados no modal.
*   **Áreas de Melhoria / CRÍTICO:**
    *   **CÓDIGO DUPLICADO (CRÍTICO):** Lógica do modal de material promocional precisa ser extraída para um hook/componente reutilizável.
    *   Depende da existência e permissões (RLS) da tabela `promotional_materials`.
*   **Conclusão:** Bom componente de card, mas a duplicação de código é um problema significativo que precisa ser corrigido.

#### 39. Página de Gestão de Equipas do Promotor (`app/app/promotor/equipes/page.tsx`)

*   **Funcionalidade:** Página Client Component que serve como hub para promotores gerirem sua associação a equipes. Redireciona chefes, lista equipes atuais, e oferece opções para criar/aderir.
*   **Fluxo:**
    1.  Usa `useAuth` para `user` e `isTeamLeader`.
    2.  `useEffect` redireciona para `/app/chefe-equipe/dashboard` se `isTeamLeader === true`.
    3.  `useEffect` carrega dados (`loadTeams`, `loadSimulatedTeams`) apenas se `user` existe e `isTeamLeader === false`.
    4.  `loadTeams` busca equipes do BD.
    5.  `loadSimulatedTeams` busca equipes do `localStorage`.
    6.  Renderiza condicionalmente:
        *   Loading/Redirecionando.
        *   Card "Nenhuma equipa encontrada" com botões "Aderir" (`/ingressar`) e "Criar" (`/criar`).
        *   Grelha de cards das equipes (`allTeams = teams + simulatedTeams`), mostrando nome, código (ou "Simulação"), descrição e badge de role.
        *   Cada card tem botão "Ver Dashboard" (link para `/app/promotor/dashboard` - destino questionável).
    7.  Mostra `Alert` se houver equipes simuladas.
*   **Tecnologias:** React (Client Component, Hooks), Next.js (`useRouter`, `Link`), Supabase (Client), `localStorage`, `lucide-react`, `shadcn/ui`.
*   **Pontos Fortes:** Gestão clara de estados (sem equipe, com equipe, chefe), redirecionamento automático, hub central para ações, funcionalidade de simulação.
*   **Áreas de Melhoria / Considerações:**
    *   Lógica de `useEffect` para loading/redirect pode ser complexa.
    *   Destino do botão "Ver Dashboard" nos cards é estranho.
    *   Propósito/gestão das equipes simuladas (`localStorage`) não é claro.
    *   Depende das páginas `/criar` e `/ingressar`.
*   **Conclusão:** Página central importante para promotores. Lida bem com diferentes cenários, mas alguns detalhes (destino de botão, simulação) são questionáveis.

#### 40. Página de Criação de Equipe pelo Promotor (`app/app/promotor/equipes/criar/page.tsx`)

*   **Funcionalidade:** Página Client Component (`/criar`) que permite a um promotor criar sua própria equipe, tornando-se 'chefe-equipe'.
*   **Fluxo:**
    1.  Usa `react-hook-form` + `zod` para formulário (nome, descrição opcional).
    2.  Verifica se usuário já é `isTeamLeader` (via `useAuth`); se sim, redireciona.
    3.  **Chama RPC:** `onSubmit` chama a RPC `create_promoter_team_v2`.
    4.  **RPC (review #31):** Insere em `teams`, `team_members` (como leader), e tenta atualizar `role` e `team_id` nos metadados em `auth.users`.
    5.  **Tratamento Resposta:** Lida com erros da RPC. Tenta extrair `teamId` de diferentes formatos de resposta possíveis.
    6.  **Fallback Metadados:** Verifica se `user.user_metadata` foi atualizado pela RPC. Se não, tenta atualizar manualmente via `updateUserRole` (hook) e `supabase.auth.updateUser()`.
    7.  Força `refreshSession()`, mostra toast, espera e redireciona para `/app/chefe-equipe/dashboard`.
    8.  Inclui `useEffect` para diagnóstico de tabelas (`teams`, `team_members`), mas não usa o resultado na UI.
*   **Tecnologias:** React (Client), Next.js, Supabase (Client, RPC), `react-hook-form`, `zod`, `shadcn/ui`, `sonner`.
*   **Pontos Fortes:** Implementa fluxo de promoção promotor -> chefe, validação de form, verifica se já é líder, fallback para metadados, feedback ao usuário.
*   **Áreas de Melhoria / Considerações:**
    *   **Dependência da RPC Insegura:** Funcionalidade central depende da RPC `create_promoter_team_v2` (#31), que tem problemas de segurança (permissão `anon`, `SECURITY DEFINER`) e lógica (update `auth.users`).
    *   **Complexidade/Fragilidade:** Fallback manual para metadados indica falta de confiança na RPC. Atualizar metadados pode ser frágil.
    *   Diagnóstico de BD não utilizado na UI.
    *   Uso de `setTimeout` para esperar atualizações.
    *   Lógica complexa para extrair ID da resposta da RPC.
*   **Conclusão:** Implementa um fluxo crucial, mas herda os problemas da RPC subjacente e tem complexidade na gestão do estado pós-criação.
*   **Recomendação:** Corrigir a RPC `create_promoter_team_v2` no BD (segurança, consistência). Simplificar lógica de atualização de estado/metadados no cliente (tornar reativa). Remover diagnóstico não usado e `setTimeout`s.

#### 41. Página de Adesão a Equipe (`app/app/promotor/equipes/ingressar/page.tsx`)

*   **Funcionalidade:** Página Client Component (`/ingressar`) que permite a um promotor inserir um código (`teamCode`) para aderir a uma equipe existente.
*   **Fluxo:**
    1.  Formulário simples com input para `teamCode` (controlado via `useState`).
    2.  `onSubmit` valida input e se user está logado.
    3.  **Chama RPC:** Chama a RPC `join_team_with_code` passando `p_team_code` e `p_user_id`.
        *   *Nota:* Comentário sugere que a RPC contorna RLS. Implementação da RPC precisa ser verificada.
    4.  **Tratamento Resposta:** Lida com erros específicos da RPC ("não encontrada", "já membro") mostrando `error`/`sugestao` e toasts (`sonner`).
    5.  **Sucesso:** Mostra toast, espera 1.5s, redireciona para `/app/promotor/equipes`.
*   **Tecnologias:** React (Client), Next.js, Supabase (Client, RPC), `shadcn/ui`, `sonner`.
*   **Pontos Fortes:** UI focada, bom tratamento de erros específicos, feedback ao usuário.
*   **Áreas de Melhoria / Considerações:**
    *   **REDUNDÂNCIA:** Funcionalidade duplicada por `app/app/promotor/equipes/aderir/page.tsx` (#41.1).
    *   **Dependência de RPC `join_team_with_code`:** Precisa verificar a implementação/segurança da RPC (contorna RLS?).
    *   Uso de `useState` em vez de `react-hook-form` (inconsistente com `aderir`).
    *   Nomes de parâmetros RPC (`p_...`) diferem de `aderir` (`..._param`).
    *   Atraso `setTimeout` antes de redirecionar.
*   **Conclusão:** Página funcional, mas redundante e com dependência de RPC potencialmente problemática.

#### 41.1 Página de Adesão a Equipe (Alternativa) (`app/app/promotor/equipes/aderir/page.tsx`)

*   **Funcionalidade:** Versão alternativa e redundante de `/ingressar`. Usa `react-hook-form`+`zod`.
*   **Diferenças:** Nomes diferentes dos parâmetros na chamada RPC (`join_team_with_code`), usa `toast` diferente, chama `updateUserRole('promotor')` (desnecessário), redireciona para `/dashboard` em vez de `/equipes`.
*   **Conclusão:** Redundante.
*   **Recomendação (para #41 e #41.1):**
    1.  **Unificar:** Manter apenas uma rota/página (e.g., `/ingressar`).
    2.  **Padronizar:** Usar `react-hook-form`+`zod`.
    3.  Verificar/corrigir chamada e implementação da RPC `join_team_with_code` (nomes de params, segurança).
    4.  Remover chamada `updateUserRole`.
    5.  Redirecionar para `/app/promotor/equipes`.
    6.  **Remover o diretório/ficheiro redundante.**

#### 42. Página de Comissões do Promotor (`app/app/promotor/comissoes/page.tsx`)

*   **Funcionalidade:** Página Client (`"use client"`) para visualizar comissões por equipe e detalhadas, com filtros por equipe, status e data. Permite iniciar fluxo de pagamento.
*   **Estrutura e Lógica:**
    *   **Busca de Dados:** Usa RPC `get_commission_data` para buscar resumo por equipe (`fetchTeams`) e lista detalhada de comissões (`fetchCommissions`). **A RPC parece retornar todos os dados da organização.**
    *   **Filtragem (CRÍTICA):** Filtros por equipe, status e data são aplicados **no cliente** sobre a lista completa de comissões. **Ineficiente e não escalável.**
    *   **Chamada RPC Duplicada:** A mesma RPC é chamada em `fetchTeams` e `fetchCommissions`.
    *   **UI:** Usa Tabs (implícito), Cards para totais, `DatePickerWithRange`, `Select` para filtros, `Table` para detalhes com `Badge`s.
    *   **Ação Pagar:** Redireciona para `/pagar` com `teamId`.
    *   Mostra `toast` de sucesso pós-pagamento (via query param).
*   **Tecnologias:** React (Client), Supabase (Client, RPC), `shadcn/ui` (Table, DatePicker, Select, Badge), `sonner`.
*   **Pontos Fortes:** Interface rica com filtros, resumo por equipe, separação do fluxo de pagamento.
*   **Áreas de Melhoria / CRÍTICO:**
    *   **FILTRAGEM NO CLIENTE (CRÍTICO):** Causa problemas graves de performance/escalabilidade.
    *   **RPC CHAMADA DUAS VEZES.**
    *   RPC `get_commission_data` precisa aceitar filtros.
    *   Cálculo de totais no cliente.
*   **Recomendação Urgente:** **Refatorar RPC `get_commission_data`** para aceitar filtros e retornar apenas dados relevantes/agregados. **Chamar RPC apenas uma vez.** Remover filtragem/cálculo de totais no cliente.

#### 69. Pagamento de Comissões (`app/app/organizador/comissoes/pagar/page.tsx`)

*   **Funcionalidade:** Página Client (`"use client"`) para o organizador selecionar e marcar comissões pendentes de uma equipe específica como pagas.
*   **Estrutura e Lógica:**
    *   Recebe `teamId` via query params.
    *   Carrega comissões pendentes da equipe, **filtrando por data no servidor (BOM!)**.
    *   Exibe comissões em tabela com checkboxes para seleção. Mostra total selecionado.
    *   Permite adicionar notas e opções (enviar email, gerar recibo - não implementado).
    *   `handleSubmitPayment`:
        *   **NÃO ATÓMICO (CRÍTICO):** Executa múltiplas escritas sequenciais sem transação: INSERT `commission_payments`, INSERT `commission_payment_items`, UPDATE `commissions`. Risco MUITO ALTO de inconsistência de dados.
    *   Redireciona para `/comissoes?success=true` após a operação (potencialmente incompleta).
*   **Tecnologias:** React (Client), Supabase (Client), `shadcn/ui` (Table, Checkbox, DatePicker).
*   **Pontos Fortes:** Fluxo dedicado para pagamento, seleção granular, filtro de data no backend.
*   **Áreas de Melhoria / CRÍTICO:**
    *   **FALTA DE ATOMICIDADE NO PAGAMENTO (CRÍTICO):** Principal falha, garante inconsistência em caso de erro.
    *   Busca de equipes redundante/ineficiente.
    *   Funcionalidades de email/recibo não implementadas.
*   **Recomendação Urgente:** **Refatorar `handleSubmitPayment` para usar RPC Transacional ÚNICA.** Implementar funcionalidades pendentes (email/recibo) se necessário. Otimizar/remover busca de equipes.

---

### Diretório: `app/actions/`

#### 43. Ação de Associação de Equipe (`app/actions/organizerActions.ts` -> `associateTeamAction`)

*   **Propósito:** Server Action para associar uma equipe existente (via `teamCode`) a uma organização (`organizationId`).
*   **Funcionalidade:**
    1.  Recebe `teamCode`, `organizationId` via `FormData`.
    2.  Obtém `userId` da sessão.
*(Análise dos subdiretórios a seguir...)*

---

70. **Página Pública do Evento (`app/e/[id]/page.tsx`)**
    *   **Funcionalidade:** Exibe detalhes de um evento específico (título, descrição, data, hora, local, flyer) para o público geral. Busca dados de eventos publicados, ativos e que não sejam 'guest-list' no Supabase. Apresenta botão para compra de ingresso (se `ticket_url` existir) ou info genérica.
    *   **Estrutura:** Client Component (`'use client'`) que usa `useState`, `useEffect` para buscar e gerenciar estado. Separa lógica de dados (`EventPageContent`) do wrapper (`EventPage`) que lida com `params` via `React.use()`. Layout de duas colunas com `shadcn/ui` e Tailwind.
    *   **Lógica:** Busca dados no `useEffect`. Funções `formatDate`, `formatTime` para exibição. Tratamento de estados de loading/error. Botão "Comprar Ingresso" abre `ticket_url` em nova aba.
    *   **Tecnologias:** React, Next.js (App Router, Client Component), Supabase, TypeScript, Tailwind, `shadcn/ui`.
    *   **Pontos Fortes:** Página dedicada, boa UX (loading/error), componentes reutilizáveis, query Supabase eficiente, uso de `next/image`.
    *   **Áreas de Melhoria:** Funcionalidade incompleta (Compartilhar, Mais Info), formatação de hora frágil, falta de metadados dinâmicos (SEO), nenhuma info do organizador visível, tratamento de erro genérico.
    *   **Recomendações:** Implementar botões, robustecer formatação de data/hora, adicionar `generateMetadata`, exibir info do organizador, melhorar tratamento de erro.

71. **Cliente Supabase (Client-Side) (`lib/supabase.ts`)**
    *   **Funcionalidade:** Cria e exporta uma instância singleton do cliente Supabase para uso em Client Components (`'use client'`).
    *   **Lógica:** Usa `createClientComponentClient` (@supabase/auth-helpers-nextjs) para gerenciamento automático de sessão via cookies. Implementa padrão singleton. Inclui fallback para `createSupabaseClient` básico. Verifica variáveis de ambiente `NEXT_PUBLIC_...`.
    *   **Tecnologias:** Supabase JS Client, Supabase Auth Helpers (Next.js), TypeScript.
    *   **Pontos Fortes:** Singleton eficiente, usa helper recomendado para client-side, type safety com `Database`.
    *   **Áreas de Melhoria:** Fallback pouco claro, mas funcional.

72. **Cliente Supabase (Server-Side) (`lib/supabase-server.ts`)**
    *   **Funcionalidade:** Fornece uma função factory (`createServerSupabaseClient`) para criar instâncias do cliente Supabase no lado do servidor (Server Components, Actions, Route Handlers).
    *   **Lógica:** Usa `createServerClient` (@supabase/ssr). Integra com `cookies()` de `next/headers` para ler/escrever cookies de sessão. Retorna *nova instância* a cada chamada, configurada para o contexto da requisição. Verifica variáveis de ambiente `NEXT_PUBLIC_...`.
    *   **Tecnologias:** Supabase SSR, Next.js (`cookies`), TypeScript.
    *   **Pontos Fortes:** Usa biblioteca SSR recomendada, integração correta com cookies server-side.
    *   **Áreas de Melhoria:** Diretiva `'use server'` no topo do arquivo pode ser desnecessária/confusa. Tratamento de erro nos callbacks de cookie pode ser melhorado.

73. **Cliente Supabase (Admin) (`lib/supabase-admin.ts`)**
    *   **Funcionalidade:** Cria e exporta uma instância singleton do cliente Supabase com privilégios de administrador (usando `SUPABASE_SERVICE_ROLE_KEY`).
    *   **Lógica:** Usa `createClient` básico (@supabase/supabase-js) com a chave de serviço. Desabilita `autoRefreshToken` e `persistSession`. Verifica variáveis `NEXT_PUBLIC_SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` (não pública).
    *   **Tecnologias:** Supabase JS Client, TypeScript.
    *   **Pontos Fortes:** Singleton eficiente, separação clara do cliente admin, configuração adequada para service role.
    *   **Áreas de Melhoria / CRÍTICO:** **USO DEVE SER EXTREMAMENTE CONTROLADO.** Este cliente ignora RLS e políticas de storage. Qualquer código que o utilize exige auditoria rigorosa.

74. **Lógica de Autenticação Client-Side (`lib/auth.ts`)**
    *   **Funcionalidade:** Centraliza funções para interagir com Supabase Auth no cliente: `signUp`, `signIn`, `signOut`, `getUser`, `getSession`, `resetSession`.
    *   **Lógica:** Usa cliente Supabase (`createClient`). `signUp` lida com registro e metadados. `signIn` autentica, verifica roles, lida com compatibilidade de metadados antigos (atualizando no cliente - arriscado), e salva info/redirecionamento no `localStorage`. `signIn` também contém lógica complexa e comentada para limpeza e verificação de sessão pós-login (potencialmente problemática/desnecessária). `signOut`/`resetSession` limpam sessão e `localStorage`.
    *   **Tecnologias:** Supabase Client JS, TypeScript, Web APIs (`localStorage`).
    *   **Pontos Fortes:** Centralização, funções claras, tratamento de compatibilidade, uso de `localStorage` para info rápida.
    *   **Áreas de Melhoria / CRÍTICO:** Complexidade/fragilidade no `signIn` (loop de verificação pós-login, limpeza comentada), atualização de metadados críticos no cliente, dependência de `localStorage` para lógica de role/redirect (verificação server-side é essencial).
    *   **Recomendação:** Simplificar drasticamente a lógica pós-`signIn` (remover loop/`setSession` manual), mover atualização de metadados para backend, reforçar verificações server-side, remover logs excessivos.

--- 

### Diretório: `lib/` (Utilitários e Configuração Supabase) [✓ Visto]

75. **Utilitários Gerais (`lib/utils.ts`)**
    *   **Funcionalidade:** Fornece funções auxiliares: `cn` (para `clsx` + `tailwind-merge`), `generateSlug`, `formatDate`, `formatTime`.
    *   **Tecnologias:** TypeScript, `clsx`, `tailwind-merge`.
    *   **Pontos Fortes:** `cn` padrão, `generateSlug` útil, centralização.
    *   **Áreas de Melhoria / CRÍTICO:** **REDUNDÂNCIA (CRÍTICO):** `formatDate`/`formatTime` duplicadas de outros locais. Robustez da formatação pode ser melhorada (usar `date-fns`/`dayjs`).
    *   **Recomendação:** Unificar formatação de data/hora aqui, remover duplicatas, robustecer formatação.

76. **Interação com Storage (`lib/storage.ts`)**
    *   **Funcionalidade:** Contém `uploadOrganizationImage` para fazer upload de logo/banner para o bucket `organization_logos` no Supabase Storage.
    *   **Lógica:** Valida extensão, gera nome único, usa cliente Supabase padrão (`supabase`), faz upload, retorna URL pública.
    *   **Tecnologias:** Supabase Client JS (Storage API), TypeScript.
    *   **Pontos Fortes:** Função encapsulada, validações básicas, nome único, retorna URL.
    *   **Áreas de Melhoria / CRÍTICO:** **SEGURANÇA DEPENDE DE POLÍTICAS (CRÍTICO):** Usa cliente `anon`, segurança depende inteiramente das Políticas de Storage do bucket (precisam exigir auth/authz). Falta validação de tamanho.
    *   **Recomendação:** Revisar URGENTEMENTE as Políticas de Storage. Adicionar validação de tamanho. Usar com cliente autenticado, não admin.

77. **Cliente Supabase Client-Side (Alternativo/Redundante) (`lib/supabase/client.ts`)**
    *   **Funcionalidade:** Cria cliente Supabase básico client-side usando `createSupabaseClient` (@supabase/supabase-js).
    *   **Conclusão (CRÍTICO):** **REDUNDANTE E OBSOLETO.** Não usa helper `@supabase/auth-helpers-nextjs`, o que quebraria o gerenciamento de sessão em Client Components. Deve ser removido.

78. **Cliente Supabase Server-Side (Alternativo/Redundante) (`lib/supabase/server.ts`)**
    *   **Funcionalidade:** Cria cliente Supabase server-side usando `createServerClient` (@supabase/ssr) e cookies.
    *   **Conclusão (CRÍTICO):** **REDUNDANTE.** Quase idêntico a `lib/supabase-server.ts`. Deve ser removido.

79. **Tipos do Banco de Dados (`lib/database.types.ts`)**
    *   **Funcionalidade:** Contém definições de tipo TypeScript geradas automaticamente (`supabase gen types typescript`) a partir do schema do banco de dados Supabase.
    *   **Propósito:** Fornecer type safety para interações com o banco de dados (tabelas, views, funções) via cliente Supabase. Melhora autocompletar e previne erros.
    *   **Importância:** Fundamental para desenvolvimento robusto com TS + Supabase.
    *   **Manutenção:** Deve ser regenerado após cada alteração no schema do DB.

**Conclusão e Recomendações para `lib/`:**
*   O diretório contém lógica essencial, mas sofre de redundâncias significativas (clientes Supabase, formatação de data/hora).
*   **Recomendação Urgente:** Remover redundâncias (`lib/supabase/`, funções duplicadas em `utils.ts`), revisar políticas de Storage, simplificar `lib/auth.ts` e robustecer `lib/utils.ts`.

---

### Diretório: `hooks/` (Hooks Personalizados) [✓ Visto]

80. **Hook de Autenticação (`hooks/use-auth.tsx`)**
    *   **Funcionalidade:** Define `AuthContext`, `AuthProvider`, `useAuth` para gerenciamento global de autenticação e estado do usuário (user, session, isLoading, isTeamLeader).
    *   **Lógica:** Mantém estado local, usa `onAuthStateChange` para reatividade. Contém lógica complexa para normalização de roles, determinação/atualização de status `isTeamLeader` (incluindo escrita de metadados no cliente - INSEGURO), e wrappers para `signUp`/`signIn`/`signOut`. `signIn` reimplementa lógica de login e faz redirecionamento.
    *   **Tecnologias:** React (Context, Hooks), Supabase Client JS, Next.js Router, `sonner`.
    *   **Pontos Fortes:** Provider centralizado, reativo a mudanças de auth, tenta lidar com inconsistências de roles.
    *   **Áreas de Melhoria / CRÍTICO:** Duplicação/Complexidade em `signIn`, atualização de metadados no cliente (INSEGURO), necessidade de normalização de roles, tratamento de redirecionamento pode conflitar.
    *   **Recomendação:** Refatoração Urgente: Simplificar `signIn` (delegar a `lib/auth`), mover atualização de metadados para backend (Server Actions/RPCs), consolidar redirecionamento, padronizar roles no DB/código.

81. **Hook de Deteção Mobile (`hooks/use-mobile.tsx`)**
    *   **Funcionalidade:** Hook `useIsMobile` que retorna `true` se a largura da janela for menor que 768px.
    *   **Lógica:** Usa `useState` e `useEffect` com `window.matchMedia` para detetar largura e ouvir mudanças.
    *   **Tecnologias:** React (Hooks), Web APIs (`matchMedia`).
    *   **Pontos Fortes:** Implementação padrão e eficaz, reativa.
    *   **Áreas de Melhoria:** Valor inicial `undefined` (retorna `false` no SSR/antes do mount), breakpoint fixo.
    *   **Recomendação:** Sincronizar breakpoint com Tailwind/CSS. Considerar implicações de SSR/hidratação.

82. **Hook de Toast (shadcn/ui) (`hooks/use-toast.ts`)**
    *   **Funcionalidade:** Implementa sistema de estado para toasts (`useToast`, `toast`), padrão do `shadcn/ui` para seus componentes `<Toast />` / `<Toaster />`.
    *   **Lógica:** Usa estado global simples (`memoryState` + `listeners`) e um reducer para gerenciar adição, atualização, dispensa e remoção de toasts. Limita a 1 toast visível por padrão.
    *   **Tecnologias:** React (Hooks, Reducer pattern manual), TypeScript.
    *   **Pontos Fortes:** Implementação padrão `shadcn/ui`, funcional.
    *   **Áreas de Melhoria:** Verificar possível uso duplicado com `sonner`. Limite de 1 toast pode ser restritivo.
    *   **Recomendação:** Confirmar qual sistema de toast é usado primariamente e remover o outro. Ajustar limite/delay se necessário.

---

**Nota Final:** A análise detalhada dos diretórios `app/`, `app/api/`, `app/app/`, `lib/`, `hooks/` e das principais páginas públicas está concluída nesta fase.

---

## Análise Detalhada por Diretório (`app/` e filhos)

*(Esta secção detalha os componentes e páginas encontradas, seguindo a estrutura de diretórios)*

### Diretório: `app/components/dashboard/` (Localização Raiz - Suspeita)

**Nota Estrutural Importante:** A existência destes componentes diretamente em `app/components/` (ao nível da raiz `app/`) em vez de em `app/app/components/` sugere fortemente uma **redundância ou erro estrutural**. É muito provável que estes ficheiros sejam duplicados ou que devessem estar localizados dentro da estrutura de `app/app/`. Recomenda-se verificar a existência de cópias em `app/app/components/dashboard/`, escolher a versão correta/completa, remover as duplicadas e padronizar a localização dentro de `app/app/components/`.

#### 17. Lista de Membros da Equipe (`app/components/dashboard/team-members-list.tsx`)

*   **Funcionalidade:** Exibe a lista de membros de uma equipe, permite atualizar a lista e (para chefes de equipe) remover membros (com confirmação).
*   **Busca de Dados:** Tenta buscar via RPC `get_team_members`, com fallback para query direta em `team_members` + `users`. Inclui fallback para mostrar o próprio chefe se a busca falhar.
*   **Remoção:** Impede auto-remoção do chefe, usa `AlertDialog` para confirmação, atualiza UI localmente.
*   **Tecnologias:** React (Client Component), Supabase (Client JS, RPC), `shadcn/ui`, `lucide-react`, `sonner`, `@/hooks/use-auth`.
*   **Pontos Fortes:** Busca robusta com fallback, segurança na remoção, boa UX (loading, toasts).
*   **Áreas para Melhoria / CRÍTICO:**
    *   **REDUNDÂNCIA (CRÍTICO):** Provavelmente duplicado com um ficheiro em `app/app/components/dashboard/`. Precisa ser consolidado.
    *   **Permissão de Remoção:** Verifica permissão via `user.user_metadata.role`, seria mais robusto verificar na tabela `team_members` para a equipa específica.
*   **Recomendação:** Consolidar com a versão em `app/app/components/` e remover esta cópia.

#### 18. Feed de Atividades (`app/components/dashboard/activity-feed.tsx`)

*   **Funcionalidade:** Exibe uma lista de atividades recentes (e.g., membro entrou, evento criado, venda realizada), formatadas com ícones, descrições dinâmicas e tempo relativo.
*   **Estrutura:** Componente principal `ActivityFeed` recebe array `activities` e renderiza `ActivityEntry` para cada item. Limita número de itens.
*   **`ActivityEntry`:** Formata cada tipo de atividade com ícone (`lucide-react`), descrição e tempo (`date-fns`).
*   **Tecnologias:** React, `date-fns`, `lucide-react`, Tailwind CSS, TypeScript.
*   **Pontos Fortes:** Componente modular, formatação clara, flexível para novos tipos de atividade.
*   **Áreas para Melhoria / CRÍTICO:**
    *   **REDUNDÂNCIA (CRÍTICO):** Provavelmente duplicado ou no local errado. Deveria estar em `app/app/components/`.
    *   **Origem dos Dados:** Apenas exibe dados; a lógica de busca/geração das atividades reside noutro local.
*   **Recomendação:** Consolidar com a versão em `app/app/components/` (se existir) e remover esta cópia.

#### 19. Exibição do Código da Equipe (`app/components/dashboard/team-code-display.tsx`)

*   **Funcionalidade:** Mostra o código de convite da equipe num `Card`, permitindo copiar para a área de transferência ou compartilhar via API Web Share (com fallback para cópia).
*   **UI/UX:** Exibe código textual, botões de "Copiar" (com feedback visual) e "Compartilhar". Desabilita botões se não houver código. Usa `toast` para notificações. Inclui placeholder visual de QR Code (não funcional).
*   **Tecnologias:** React, Web APIs (`navigator.clipboard`, `navigator.share`), `shadcn/ui`, `lucide-react`, `sonner`.
*   **Pontos Fortes:** Funcionalidade clara, boa UX (feedback, fallback de partilha).
*   **Áreas para Melhoria / CRÍTICO:**
    *   **REDUNDÂNCIA (CRÍTICO):** Provavelmente duplicado ou no local errado. Deveria estar em `app/app/components/`.
    *   **Placeholder QR Code:** Ícone pode ser confuso; considerar gerar QR real ou usar outro ícone.
*   **Recomendação:** Consolidar com a versão em `app/app/components/` (se existir) e remover esta cópia. Considerar gerar um QR Code real se for desejado.

---

### Diretório: `app/api/guests/` [✓ Visto]

#### 20. API de Convidados (`app/api/guests/route.ts`)

*   **Funcionalidade:** Define handlers para `POST` (registar convidado), `PUT` (check-in) e `GET` (listar convidados) na rota `/api/guests`.
*   **Handler POST (Registo):**
    *   Recebe `event_id`, `name`, `phone`, `promoter_id?`, `team_id?`.
    *   **Validações (INSEGURAS):** Usa `supabaseAdmin` (service role - ignora RLS) para validar evento (tipo, publicado, datas, limite de convidados).
    *   **Geração QR Code:** Gera QR Code (Data URL) com dados do convidado.
    *   **Persistência (CRÍTICA/INSEGURA/CONFUSA):** Tenta salvar o convidado (com service role) numa sequência de locais: SQL direto em `guests`, `.insert()` em `guests`, `.insert()` em `guest_list_guests`, criação/inserção em tabela dinâmica `guests_{eventId}` (desabilita RLS!).
    *   **Fallback (INSEGURO):** Retorna sucesso 200 com QR code mesmo se a escrita na BD falhar.
    *   **Vulnerabilidade SQL Injection:** Constrói SQL manualmente com interpolação de strings.
*   **Handler PUT (Check-in):**
    *   Recebe `id`, `event_id`, `checked_in`.
    *   Busca convidado em `guests` ou `guest_list_guests` (usando cliente anónimo - respeita RLS anónima).
    *   Valida `event_id`.
    *   Atualiza `checked_in`, `is_checked_in`, `check_in_time`, `updated_at` (usando cliente anónimo).
    *   **Falta Autenticação:** Endpoint parece público.
*   **Handler GET (Listagem):**
    *   Recebe `eventId`.
    *   Busca todos (`select *`) os convidados de `guests` para o evento (usando cliente anónimo).
    *   Calcula estatísticas.
    *   **Falta Autenticação/Paginação:** Endpoint público, busca todos os dados.
*   **Tecnologias:** Next.js (Route Handlers), Supabase (Client JS, Service Role Key!), `qrcode`, `uuid`.
*   **Pontos Fortes:** Validações no backend (POST), geração de QR code, cálculo de stats (GET).
*   **Áreas para Melhoria / CRÍTICO:**
    *   **USO DE SERVICE ROLE PARA ESCRITA (CRÍTICO/INSEGURO):** Contorna RLS, permitindo escrita não autorizada.
    *   **LÓGICA DE PERSISTÊNCIA CAÓTICA (CRÍTICO):** Múltiplas tabelas, criação dinâmica insegura, inconsistências garantidas.
    *   **SQL INJECTION (CRÍTICO):** Construção manual de SQL insegura.
    *   **FALLBACK INSEGURO (CRÍTICO):** Retornar sucesso 200 sem salvar dados.
    *   **FALTA DE AUTENTICAÇÃO (PUT/GET):** Endpoints sensíveis estão públicos.
    *   **INCONSISTÊNCIA DE TABELAS:** POST, PUT e GET operam sobre conjuntos diferentes de tabelas.
*   **Recomendação Urgente:** **REFATORAÇÃO COMPLETA E IMEDIATA.**
    1.  Remover uso da `service_role_key` para escrita.
    2.  Definir UMA tabela canónica para convidados e remover lógicas de fallback/criação dinâmica.
    3.  Usar métodos seguros do Supabase (`.insert`, `.update`) ou funções SQL parametrizadas, NUNCA interpolação de strings em SQL.
    4.  Falhar corretamente se a escrita na BD falhar.
    5.  Implementar autenticação/autorização adequada para PUT e GET.
    6.  Rever e corrigir RLS para `anon` e `authenticated`.

#### 20.1 API de Criação de Equipes Alternativa (`app/api/teams/create/route-alt.ts`)

*   **Funcionalidade:** Versão alternativa/anterior do handler POST para `/api/teams/create`.
*   **Comparação:** Quase idêntica a `route.ts`, mas *não* inclui `organization_id` nem `created_by` na inserção na tabela `teams`, tornando-a incompleta e incorreta.
*   **Conclusão:** Redundante e obsoleto.
*   **Recomendação Urgente:** **REMOVER** este ficheiro (`route-alt.ts`).

---

### Diretório: `app/api/teams/` [✓ Visto]

#### 21. API de Criação de Equipes (`app/api/teams/create/route.ts`)

*   **Funcionalidade:** Handler `POST` para `/api/teams/create`. Cria uma nova equipe associada a uma organização.
*   **Fluxo:**
    1.  Recebe `name` e `organizationId`.
    2.  Valida input.
    3.  **Autenticação:** Requer usuário logado (via `createRouteHandlerClient`).
    4.  **Autorização:** Verifica se o usuário pertence à organização (via `user_organizations` - *precisa confirmar tabela*) e tem role `owner` ou `admin`.
    5.  **Criação (INSEGURA):** Usa `supabaseAdmin` (service role) para:
        *   Inserir na tabela `teams` (com `teamCode` gerado).
        *   Inserir na tabela `organization_teams` para vincular.
    6.  **Rollback Manual:** Tenta deletar da `teams` se a inserção em `organization_teams` falhar.
*   **Tecnologias:** Next.js (Route Handlers), Supabase (Auth Helpers, Client JS, Service Role Key!), `uuid`.
*   **Pontos Fortes:** Verifica autenticação/autorização básica, valida input, tenta rollback.
*   **Áreas para Melhoria / CRÍTICO:**
    *   **USO DE SERVICE ROLE PARA ESCRITA (CRÍTICO/INSEGURO):** Contorna RLS, embora a permissão seja verificada *antes*.
    *   **ATOMICIDADE:** Rollback manual não garante atomicidade; preferível usar transação/função PostgreSQL.
    *   **VERIFICAÇÃO DE TABELA DE MEMBROS:** Incerteza sobre `user_organizations` vs `organization_members`.
    *   **REDUNDÂNCIA:** Existe `route-alt.ts` no mesmo diretório.
*   **Recomendação:**
    1.  **Refatorar para remover `service_role_key` da escrita**, usar RLS do usuário autenticado.
    2.  Confirmar e usar a tabela de membros correta para permissão.
    3.  Usar função PostgreSQL (RPC) para garantir atomicidade na criação.
    4.  Remover `route-alt.ts` se obsoleto.

#### 21.1 API de Criação de Equipes Alternativa (`app/api/teams/create/route-alt.ts`)

*   **Funcionalidade:** Versão alternativa/anterior do handler POST para `/api/teams/create`.
*   **Comparação:** Quase idêntica a `route.ts`, mas *não* inclui `organization_id` nem `created_by` na inserção na tabela `teams`, tornando-a incompleta e incorreta.
*   **Conclusão:** Redundante e obsoleto.
*   **Recomendação Urgente:** **REMOVER** este ficheiro (`route-alt.ts`).

---

### Diretório: `app/api/organizations/` [✓ Visto]

#### 22. API de Criação de Organizações (`app/api/organizations/route.ts`)

*   **Funcionalidade:** Handler `POST` para `/api/organizations`. Cria uma nova organização, faz upload de logo/banner e associa o criador.
*   **Fluxo:**
    1.  Recebe dados via `FormData` (incluindo `logo`, `banner` e **`userId`**).
    2.  Valida campos obrigatórios.
    3.  **Upload de Ficheiros (INSEGURO):** Usa `supabaseAdmin` (service role) para fazer upload de logo/banner para `organization_logos` (contorna políticas de storage).
    4.  **Verificação/Criação de Perfil (INSEGURO):** Usa `supabaseAdmin` para verificar/criar registo na tabela `profiles` para o `userId`.
    5.  **Criação da Organização (INSEGURO):** Usa `supabaseAdmin` para inserir na tabela `organizations` (ignora RLS).
    6.  **Criação da Relação (INSEGURO):** Usa `supabaseAdmin` para inserir na tabela `user_organizations` (ignora RLS). Tenta fallback com RPC se a inserção direta falhar, mas continua mesmo se o fallback falhar.
*   **Tecnologias:** Next.js (Route Handlers), Supabase (Admin Client, Storage, Auth Admin API), FormData API.
*   **Pontos Fortes:** Implementa fluxo completo com upload.
*   **Áreas para Melhoria / CRÍTICO:**
    *   **USO MASSIVO DE SERVICE ROLE (CRÍTICO/INSEGURO):** Toda a lógica usa `service_role_key`, contornando RLS e políticas de storage.
    *   **FALTA DE AUTENTICAÇÃO DA CHAMADA (CRÍTICO/INSEGURO):** Confia no `userId` vindo do FormData; qualquer pessoa pode tentar criar uma organização em nome de outrem.
    *   **FALLBACK INSEGURO:** Continua mesmo se a criação da relação user-org falhar, levando a estado inconsistente.
*   **Recomendação Urgente:** **REFATORAÇÃO COMPLETA E IMEDIATA.**
    1.  Remover completamente o uso de `supabaseAdmin` (service role).
    2.  Obter `userId` da sessão autenticada, não do FormData.
    3.  Usar RLS e Políticas de Storage para controlar acesso.
    4.  Realizar operações com o cliente autenticado do usuário.
    5.  Garantir atomicidade (idealmente via transação/função PostgreSQL).
    6.  Falhar corretamente se passos críticos falharem.

---

### Diretório: `app/api/guest-count/` [✓ Visto]

#### 23. API de Contagem de Convidados (`app/api/guest-count/route.ts`)

*   **Funcionalidade:** Handler `GET` para `/api/guest-count?eventId=...`. Retorna a contagem total e de check-in para um evento.
*   **Fluxo:**
    1.  Recebe `eventId` da query string.
    2.  **Contagem (INSEGURA):** Usa `supabaseAdmin` (service role) para executar duas queries `count` separadas na tabela `guests` (total e `checked_in = true`).
    3.  Retorna `{ success: true, count, checkedIn, timestamp }`.
    4.  Define headers para desabilitar cache.
*   **Tecnologias:** Next.js (Route Handlers), Supabase (Admin Client).
*   **Pontos Fortes:** Endpoint dedicado para contagem, desabilita cache.
*   **Áreas de Melhoria / CRÍTICO:**
    *   **USO DE SERVICE ROLE (CRÍTICO/INSEGURO):** Ignora RLS, permitindo que qualquer pessoa obtenha contagens de qualquer evento.
    *   **FALTA DE AUTENTICAÇÃO:** Endpoint público para dados potencialmente sensíveis.
    *   **EFICIÊNCIA:** Duas queries separadas; melhor usar uma única query ou RPC.
    *   **TABELA ASSUMIDA:** Assume `guests` como fonte única, o que pode ser incorreto.
*   **Recomendação:**
    1.  Remover `service_role_key`.
    2.  Implementar autenticação/autorização se necessário.
    3.  Usar RLS para controlar acesso.
    4.  Otimizar para uma única query/RPC.
    5.  Verificar a tabela de origem correta.

---

### Diretório: `app/api/db-schema/` [✓ Visto]

#### 24. API de Diagnóstico de Schema (`app/api/db-schema/route.ts`)

*   **Funcionalidade:** Handler `POST` para `/api/db-schema`. Ferramenta de diagnóstico/depuração que recebe `eventId` e retorna informações sobre as tabelas `guests`, `guest_list_guests`, `guests_{eventId}` (se existir), e permissões RLS.
*   **Fluxo (INSEGURO):**
    1.  Recebe `eventId`.
    2.  Usa `supabaseAdmin` (service role) para todas as operações (ignora RLS).
    3.  Consulta `guests`, `guest_list_guests`, verifica/consulta tabela dinâmica `guests_{eventId}` (via RPC `exec_sql`).
    4.  Consulta permissões SELECT de `anon`/`authenticated` nas tabelas `guest%`.
    5.  Retorna contagens, amostras de dados (limitadas a 5 linhas para algumas tabelas), e informações de permissão.
*   **Tecnologias:** Next.js (Route Handlers), Supabase (Admin Client, RPC).
*   **Pontos Fortes:** Ferramenta potencialmente útil para depuração interna das inconsistências de tabelas.
*   **Áreas de Melhoria / CRÍTICO:**
    *   **USO DE SERVICE ROLE (CRÍTICO/INSEGURO):** Ignora RLS, expondo estrutura, permissões e amostras de dados.
    *   **FALTA DE AUTENTICAÇÃO (CRÍTICO/INSEGURO):** Endpoint de diagnóstico exposto publicamente.
    *   **EXPOSIÇÃO DE DADOS:** Retorna amostras de dados reais de convidados.
    *   **SQL INJECTION (POTENCIAL):** Construção de SQL via interpolação para tabelas dinâmicas e permissões.
*   **Recomendação Urgente:**
    1.  **RESTRINGIR ACESSO IMEDIATAMENTE:** Proteger com autenticação/autorização rigorosa (apenas admins/devs).
    2.  Remover `service_role_key` se possível (usar role autenticado).
    3.  Remover/Ofuscar amostras de dados sensíveis na resposta.
    4.  Rever construção SQL.
    5.  **Considerar remover completamente este endpoint da API pública** e usar ferramentas de introspecção do Supabase diretamente para diagnóstico.

---

### Diretório: `app/api/cron/` [✓ Visto]

#### 25. API CRON - Atualização de Status de Eventos (`app/api/cron/update-event-status.ts`)

*   **Funcionalidade:** Handler `GET` para `/api/cron/update-event-status`. Projetado para ser chamado por um CRON job para atualizar o status (`scheduled`, `active`, `completed`) de eventos na tabela `events` com base na data/hora atual.
*   **Fluxo:**
    1.  **Autenticação (DESATIVADA):** Código para verificar `CRON_SECRET` está comentado.
    2.  **Busca Eventos:** Seleciona eventos não 'completed' ou null (usando cliente Supabase padrão - sujeito a RLS `anon`).
    3.  **Lógica de Status:** Usa função `isBetweenDates` (com margem de 8h pós-fim) para determinar o status correto.
    4.  **Atualização:** Se o status calculado difere do atual, atualiza o evento na tabela `events` (usando cliente padrão - sujeito a RLS `anon`).
    5.  Retorna resumo das atualizações.
*   **Tecnologias:** Next.js (Route Handlers), Supabase (Client JS).
*   **Pontos Fortes:** Implementa lógica necessária de atualização automática, usa cliente padrão (respeita RLS).
*   **Áreas de Melhoria / CRÍTICO:**
    *   **SEGURANÇA (CRÍTICO):** Endpoint público por padrão (autenticação comentada). Qualquer um pode chamá-lo e forçar operações de leitura/escrita.
    *   **DEPENDÊNCIA DE RLS `anon`:** Requer que RLS anónimas permitam SELECT e UPDATE na tabela `events` (especificamente no campo `status`), o que pode ser excessivamente permissivo.
    *   **EFICIÊNCIA:** Buscar e processar todos os eventos na API pode ser ineficiente.
*   **Recomendação Urgente:**
    1.  **ATIVAR AUTENTICAÇÃO IMEDIATAMENTE** (descomentar verificação `CRON_SECRET`).
    2.  Verificar e ajustar RLS para `anon` (ou criar role específico para CRON) para permitir apenas as operações estritamente necessárias.
    3.  **Considerar migrar a lógica para uma Função PostgreSQL agendada no Supabase (`pg_cron`)** para maior segurança e eficiência.

---

### Diretório: `app/api/admin/` [✓ Visto]

#### 26. API Admin - Adicionar Coluna (`app/api/admin/add-column/route.ts`)

*   **Funcionalidade:** Handler `GET` (!) para `/api/admin/add-column`. Tenta adicionar a coluna `status` à tabela `events` se não existir.
*   **Fluxo (INSEGURO/PERIGOSO):**
    1.  Verifica se a coluna existe com `select` (usando cliente anónimo).
    2.  Tenta chamar RPC `execute_sql` via REST com `ALTER TABLE ... ADD COLUMN IF NOT EXISTS status...` (usando chave anónima para auth - provavelmente falha, mas é inseguro).
    3.  Tenta um "fallback" inválido com `update` falso.
    4.  Retorna sucesso ou falha (com instrução para adicionar manualmente).
*   **Tecnologias:** Next.js (Route Handlers), Supabase (Client JS, REST API).
*   **Pontos Fortes:** Nenhum relevante dada a natureza perigosa.
*   **Áreas de Melhoria / CRÍTICO:**
    *   **MODIFICAÇÃO DE SCHEMA VIA API (CRÍTICO/INSEGURO):** Expor `ALTER TABLE` via API é extremamente perigoso.
    *   **ENDPOINT PÚBLICO/GET:** Funcionalidade administrativa sensível exposta publicamente e usando método GET para ação destrutiva.
    *   **AUTENTICAÇÃO INSEGURA:** Tenta usar chave anónima para chamar RPC potencialmente administrativa.
    *   **LÓGICA FALHA:** O fallback é inválido.
*   **Recomendação Urgente:**
    1.  **REMOVER ESTE ENDPOINT IMEDIATAMENTE.**
    2.  Gerir schema **APENAS** via migrações controladas (Supabase CLI).
    3.  Rever/restringir permissões de RPCs (`check_column_exists`, `exec_sql`?) e garantir que roles não privilegiados não podem executar DDL/DML arbitrário.

#### 27. API Admin - Adicionar Campo Status (`app/api/admin/add-status-field/route.ts`)

*   **Funcionalidade:** Handler `GET` (!) para `/api/admin/add-status-field`. Propósito similar a `add-column`, mas com lógica de tentativa diferente para adicionar a coluna `status` a `events`.
*   **Fluxo (INSEGURO/PERIGOSO):**
    1.  Verifica se coluna existe com `select`.
    2.  Tenta chamar RPC `add_status_field` (usando cliente anónimo).
    3.  Se falhar, tenta criar/executar/dropar função `add_status_column` (que faz `ALTER TABLE` e `UPDATE`) via REST (usando chave anónima para auth).
    4.  Se falhar, faz um "fallback" inútil que apenas calcula e loga status no servidor.
    5.  Retorna sucesso ou falha.
*   **Tecnologias:** Next.js (Route Handlers), Supabase (Client JS, REST API).
*   **Pontos Fortes:** Nenhum relevante.
*   **Áreas de Melhoria / CRÍTICO:**
    *   **MODIFICAÇÃO DE SCHEMA VIA API (CRÍTICO/INSEGURO):** Tenta `ALTER TABLE` e criar/dropar funções via API GET.
    *   **ENDPOINT PÚBLICO/GET:** Exposição pública de funcionalidade administrativa perigosa.
    *   **AUTENTICAÇÃO INSEGURA:** Usa chave anónima para tentar executar RPCs/SQL complexos.
    *   **LÓGICA FALHA:** O fallback final é inútil.
*   **Recomendação Urgente:**
    1.  **REMOVER ESTE ENDPOINT IMEDIATAMENTE (juntamente com `add-column`).**
    2.  Gerir schema **APENAS** via migrações controladas.
    3.  Rever/restringir permissões de RPCs (`add_status_field`?) e garantir que `anon` não pode criar/alterar/dropar funções ou tabelas.

#### 28. API Admin - Configuração de BD (`app/api/admin/db-setup/route.ts`)

*   **Funcionalidade:** Handler `GET` (!) para `/api/admin/db-setup`. Versão mais completa para garantir que a coluna `status` exista em `events`, adicionar índice e inicializar valores.
*   **Fluxo (INSEGURO/PERIGOSO):**
    1.  Usa `supabaseAdmin` (service role) para todas as operações.
    2.  Verifica se coluna `status` existe (via RPC `check_column_exists` ou `information_schema`).
    3.  Se não existir, executa `ALTER TABLE ... ADD COLUMN status...`, `COMMENT ON COLUMN`, `CREATE INDEX` (via RPC `exec_sql` ou `supabase.sql()`).
    4.  Executa `UPDATE` para inicializar status (`completed`, `active`) com base na data (via RPC `exec_sql` ou `supabase.sql()`, continua mesmo se falhar).
    5.  Retorna sucesso.
*   **Tecnologias:** Next.js (Route Handlers), Supabase (Admin Client, RPC, `supabase.sql()`).
*   **Pontos Fortes:** Mais completo que `add-column`/`add-status-field` (inclui índice, inicialização).
*   **Áreas de Melhoria / CRÍTICO:**
    *   **MODIFICAÇÃO DE SCHEMA/DADOS VIA API GET (CRÍTICO/INSEGURO):** Endpoint público que executa `ALTER TABLE`, `CREATE INDEX`, `UPDATE` usando `service_role_key`.
    *   **EXECUÇÃO DE SQL ARBITRÁRIO:** Usa RPCs ou `supabase.sql()` para executar SQL vindo do código da API.
*   **Recomendação Urgente:**
    1.  **REMOVER ESTE ENDPOINT IMEDIATAMENTE (juntamente com `add-column` e `add-status-field`).**
    2.  Gerir schema e inicialização **APENAS** via migrações controladas (Supabase CLI).
    3.  Rever/restringir permissões de RPCs (`check_column_exists`, `exec_sql`?) e garantir que roles não privilegiados não podem executar DDL/DML arbitrário.

#### 29. API Admin - Alteração Simples (`app/api/admin/db-setup/simple-alter/route.ts`)

*   **Funcionalidade:** Handler `GET` (!) para `/api/admin/db-setup/simple-alter`. Versão concisa para adicionar/inicializar a coluna `status` em `events`.
*   **Fluxo (INSEGURO/PERIGOSO):**
    1.  Usa `supabaseAdmin` (service role) importado de `@/lib/supabase-admin`.
    2.  Executa um bloco PL/pgSQL (`DO $$...$$`) via `supabase.sql()` que:
        *   Verifica se a coluna `status` existe.
        *   Se não existir, executa `ALTER TABLE`, `CREATE INDEX`, e `UPDATE` para inicializar.
*   **Tecnologias:** Next.js (Route Handlers), Supabase (Admin Client, `supabase.sql()`).
*   **Pontos Fortes:** Nenhum.
*   **Áreas de Melhoria / CRÍTICO:**
    *   **MODIFICAÇÃO DE SCHEMA/DADOS VIA API GET (CRÍTICO/INSEGURO):** Executa DDL e DML complexos a partir de uma API GET usando `service_role_key`.
*   **Recomendação Urgente:**
    1.  **REMOVER ESTE ENDPOINT IMEDIATAMENTE (juntamente com `add-column`, `add-status-field`, `db-setup`).**
    2.  Reforçar o uso **EXCLUSIVO** de migrações controladas (Supabase CLI) para alterações de schema.

#### 30. API Admin - Atualizar Status (`app/api/admin/update-status/route.ts`)

*   **Funcionalidade:** Handler `GET` (!) para `/api/admin/update-status`. Força a atualização do campo `status` em TODOS os eventos baseando-se na `start_date`.
*   **Fluxo (INSEGURO/PERIGOSO):**
    1.  Usa `supabaseAdmin` (service role).
    2.  Executa SQL via `supabase.sql()` para fazer `UPDATE public.events SET status = 'completed'` (para `start_date < CURRENT_DATE`) e `SET status = 'active'` (para `start_date = CURRENT_DATE`).
    3.  Retorna sucesso ou erro.
*   **Tecnologias:** Next.js (Route Handlers), Supabase (Admin Client, `supabase.sql()`).
*   **Pontos Fortes:** Nenhum.
*   **Áreas de Melhoria / CRÍTICO:**
    *   **UPDATE EM MASSA VIA API GET (CRÍTICO/INSEGURO):** Endpoint público que modifica todos os eventos usando `service_role_key`.
    *   **REDUNDANTE/PERIGOSO:** Funcionalidade similar ao CRON job `/api/cron/update-event-status`, mas implementada de forma insegura aqui.
*   **Recomendação Urgente:**
    1.  **REMOVER ESTE ENDPOINT IMEDIATAMENTE.**
    2.  Gerir atualização de status apenas via CRON job (que precisa ser protegido).

#### 31. Definição de Schema - Equipes/Comissões (`app/api/admin/wallet/schema.ts`)

*   **Funcionalidade:** Exporta a constante string `createTeamsSchema` contendo SQL DDL para criar tabelas (`teams`, `team_members`, `organization_teams`, `event_teams`, `commissions`, `commission_payments`, etc.), funções (`trigger_set_timestamp`, `generate_team_code`, `create_promoter_team_v2`), triggers e políticas RLS para um sistema de equipes/comissões. Exporta também funções TS (`createTeamsTables`, `checkTeamsTables`, `createPromotionFunction`) para tentar aplicar/verificar este schema.
*   **NÃO é uma API Route.**
*   **Tecnologias:** SQL (PostgreSQL), TypeScript.
*   **Pontos Fortes:** Define um schema de dados aparentemente completo para a funcionalidade de equipes/comissões. Inclui triggers úteis e referências condicionais.
*   **Áreas de Melhoria / CRÍTICO:**
    *   **RLS SIMPLIFICADAS/INSEGURAS (CRÍTICO):** As políticas RLS criadas são excessivamente permissivas (e.g., `USING (true)`), permitindo acesso muito amplo a usuários autenticados. Precisam ser reescritas.
    *   **FUNÇÃO `create_promoter_team_v2` INSEGURA (CRÍTICO):** Função `SECURITY DEFINER` que modifica `auth.users` tem permissão `EXECUTE` para `anon`. Risco de segurança elevado.
    *   **GESTÃO DE SCHEMA INADEQUADA:** Definir schema complexo numa string TS e tentar aplicá-lo via RPC `exec_sql` (na função `createTeamsTables`) é frágil e não versionado. Isso pertence a migrações.
    *   **LOCALIZAÇÃO:** Ficheiro de definição de schema dentro de `app/api/admin/wallet/` é inadequado.
*   **Recomendação Urgente:**
    1.  **Mover o SQL de `createTeamsSchema` para migrações controladas (Supabase CLI)**.
    2.  **Rever e Corrigir URGENTEMENTE as políticas RLS** para serem específicas e seguras.
    3.  **Rever e Corrigir URGENTEMENTE a função `create_promoter_team_v2`** (permissões, lógica de update `auth.users`).
    4.  Remover as funções TS exportadas (`createTeamsTables`, etc.) e a dependência da RPC `exec_sql` para aplicar schema.
    5.  Mover/reorganizar este ficheiro para um local mais apropriado se alguma definição de tipo TS for útil, ou remover se todo o conteúdo for para migrações.

#### 32. API Admin - Criar Tabelas Wallet (`app/api/admin/wallet/create-tables/route.ts`)

*   **Funcionalidade:** Handler `GET` (!) para `/api/admin/wallet/create-tables`. Tenta criar as tabelas de equipes/comissões chamando funções de `../schema.ts`.
*   **Fluxo (INSEGURO/PERIGOSO):**
    1.  Usa `createServiceClient` (que usa service role).
    2.  Chama `checkTeamsTables` (de `schema.ts`) para verificar se `teams` existe.
    3.  Se não existir, chama `createTeamsTables` (de `schema.ts`) que tenta executar todo o DDL/RLS/Funções inseguras de `createTeamsSchema` via RPC `exec_sql`.
    4.  Retorna sucesso ou erro.
*   **Tecnologias:** Next.js (Route Handlers), Supabase (Admin Client via `createServiceClient`).
*   **Pontos Fortes:** Nenhum.
*   **Áreas de Melhoria / CRÍTICO:**
    *   **APLICAÇÃO DE SCHEMA VIA API GET (CRÍTICO/INSEGURO):** Endpoint público que tenta executar DDL complexo usando `service_role_key`.
*   **Recomendação Urgente:**
    1.  **REMOVER ESTE ENDPOINT IMEDIATAMENTE.**
    2.  Aplicar o schema de `schema.ts` **APENAS** via migrações controladas (Supabase CLI), após corrigir as RLS e funções inseguras nele contidas.

### Conclusão e Recomendação Global para `app/api/admin/`

O diretório `app/api/admin/` (incluindo `add-column`, `add-status-field`, `db-setup`, `update-status`, `wallet/create-tables`) contém um conjunto de APIs administrativas **extremamente perigosas**. Todas tentam modificar o schema ou dados em massa usando o método `GET`, utilizam a `service_role_key` ignorando RLS, e estão potencialmente expostas publicamente.

**Recomendação Global Urgente:**
1.  **REMOVER TODO O DIRETÓRIO `app/api/admin/` E SEU CONTEÚDO IMEDIATAMENTE.**
2.  Gerir **TODAS** as alterações de schema e inicializações/migrações de dados exclusivamente através de **ferramentas de migração controladas (Supabase CLI)**.
3.  Rever e restringir rigorosamente as permissões de quaisquer **RPCs** que permitam execução de SQL arbitrário ou modificação de schema.

---

## Análise da Aplicação Autenticada (`app/app/`) [✓ Visto]

*(Esta secção foca-se na estrutura e componentes da área principal da aplicação, acessível após login)*

### Layout Principal da Aplicação (`app/app/layout.tsx`)

#### 33. Layout da Área Autenticada (`app/app/layout.tsx`)

*   **Funcionalidade:** Layout Server Component para toda a secção `/app/...`. Protege rotas, define estrutura de dashboard (nav lateral + conteúdo) e aplica providers específicos.
*   **Fluxo:**
    1.  **Autenticação Server-Side:** Usa `createClient` (server) para `getUser`. Se não houver user, `redirect('/login')`.
    2.  **Navegação por Role:** Obtém `user.user_metadata.role` e define `navItems` diferentes para 'organizador', 'chefe-equipe', 'promotor'.
    3.  **Renderização:**
        *   **(REDUNDANTE):** Inclui `<html>`, `<body>`.
        *   **(REDUNDANTE):** Envolve com `AuthProvider`.
        *   Envolve com `OrganizationProvider` (o correto de `app/contexts/`).
        *   Cria layout Grid com `DashboardNav` (de `_components/`, recebe `navItems`) e `<main>` para `{children}`.
        *   Usa `Suspense` com `LoadingSpinner` para `{children}`.
        *   **(REDUNDANTE):** Inclui `Toaster`.
*   **Tecnologias:** Next.js (Layout, Server Component, `redirect`), React (`Suspense`), Supabase (Server Client), Context API, Tailwind CSS/`shadcn/ui`.
*   **Pontos Fortes:** Proteção de rota no servidor, navegação dinâmica por role, uso do `OrganizationProvider` correto, estrutura de dashboard padrão.
*   **Áreas de Melhoria / CRÍTICO:**
    *   **REDUNDÂNCIA DE ELEMENTOS/PROVIDERS (CRÍTICO):** Reinclui `<html>`, `<body>`, `AuthProvider`, `Toaster`, que já estão no layout raiz (`app/layout.tsx`). Causa provável de problemas.
    *   Tipagem `any[]` para `navItems`.
    *   Tratamento básico para roles desconhecidos.
*   **Recomendação Urgente:**
    1.  **REMOVER `<html>`, `<body>`, `AuthProvider`, `Toaster` deste layout.** Deve começar com o `div` do grid.
    2.  Corrigir tipagem de `navItems`.
    3.  Melhorar tratamento de roles desconhecidos.

### Diretório Interno: `app/app/_providers/`

#### 34. Provider de Erros de Autenticação (`app/app/_providers/auth-provider.tsx`)

*   **Funcionalidade:** Componente Client (`AuthErrorProvider`) que atua como um "safety net" global no cliente para detetar e tratar erros de autenticação (e.g., token expirado, 401 em fetch para Supabase) que podem ocorrer entre verificações normais.
*   **NÃO é o provider de autenticação principal.** Complementa o `AuthProvider` de `hooks/use-auth.ts`.
*   **Fluxo:**
    1.  Adiciona listeners globais para `error` e `unhandledrejection`.
    2.  Sobrescreve `window.fetch` para monitorizar respostas (status 401) e erros.
    3.  Usa função `isAuthError` para tentar identificar erros de autenticação por strings chave.
    4.  Se detetar erro de auth: define flag `authError` no `localStorage`, chama `supabase.auth.signOut()`, e redireciona para `/login`.
    5.  No mount, verifica flag `authError` no `localStorage` e redireciona se existir.
    6.  Limpa listeners/fetch no unmount.
*   **Tecnologias:** React (Client Component, Hooks), Next.js (`useRouter`), Web APIs (`localStorage`, `fetch`, listeners), Supabase (Client JS).
*   **Pontos Fortes:** Abordagem proativa para robustez da autenticação no cliente, lida com diferentes fontes de erro, usa `localStorage` para persistência entre reloads, implementa cleanup.
*   **Áreas de Melhoria / Considerações:**
    *   Nome confuso (`AuthErrorProvider` vs `AuthProvider`).
    *   Sobrescrever `window.fetch` é arriscado.
    *   Deteção de erro baseada em string é heurística.
    *   Reforça a necessidade de usar o `AuthProvider` principal apenas uma vez (no layout raiz).
*   **Recomendação:**
    1.  Considerar renomear (e.g., `AuthErrorHandler`).
    2.  Aplicar uma única vez dentro da árvore da área autenticada (e.g., em `app/app/layout.tsx` após remover o `AuthProvider` redundante).

---

### Diretório: `app/app/promotor/`

#### 35. Layout Específico do Promotor (`app/app/promotor/layout.tsx`)

*   **Funcionalidade:** Layout Client Component que define uma estrutura visual **diferente** para a secção `/app/promotor/...`, com sua própria barra lateral deslizante/responsiva.
*   **Estrutura:** Implementa barra lateral própria com botão hamburger, overlay, e conteúdo principal. **Não reutiliza** a estrutura de grid/`DashboardNav` de `app/app/layout.tsx`.
*   **Navegação:** Define um conjunto **inconsistente** de links na barra lateral (apenas `Dashboard`) que difere do esperado para 'promotor' em `app/app/layout.tsx`.
*   **Logout:** Inclui botão e função de logout (código potencialmente duplicado).
*   **Tecnologias:** React (Client Component, Hooks), Next.js, `lucide-react`, `shadcn/ui`, Tailwind CSS.
*   **Pontos Fortes:** Barra lateral responsiva.
*   **Áreas de Melhoria / CRÍTICO:**
    *   **INCONSISTÊNCIA DE LAYOUT (CRÍTICO):** Redefine completamente a estrutura visual dentro de `/app/app/`, quebrando a consistência com outros roles e o layout pai.
    *   **NAVEGAÇÃO INCONSISTENTE/INCOMPLETA:** Links não correspondem ao esperado.
    *   **CÓDIGO DUPLICADO:** Componente `NavItem` e função `handleLogout` provavelmente duplicados.
*   **Recomendação:**
    1.  **Reavaliar a arquitetura de layouts.** Idealmente, remover este layout e usar/adaptar `app/app/layout.tsx` para todos os roles.
    2.  Se uma UI diferente for *intencional*, isolar ou refatorar o layout pai para permitir essa exceção.
    3.  Centralizar código reutilizável.

#### 36. Dashboard do Promotor (`app/app/promotor/dashboard/page.tsx`)

*   **Funcionalidade:** Página Client Component que serve como ponto de entrada para promotores. Mostra a equipe principal à qual pertencem e as organizações associadas a essa equipe.
*   **Fluxo:**
    1.  Usa `useAuth` para obter `user`.
    2.  `useEffect` chama `loadTeams`.
    3.  `loadTeams` busca `team_members` do usuário, depois busca detalhes das `teams` e das `organizations` associadas.
    4.  Renderiza condicionalmente:
        *   Loading spinner.
        *   Mensagem de erro.
        *   Card "Nenhuma equipa associada" com link para aderir (`/app/promotor/equipes/ingressar`).
        *   Card com nome/código da equipe (`teams[0]`) e botão "Entrar".
    5.  Botão "Entrar" abre `Dialog` que lista as organizações (`teams[0].organizations`) associadas à equipe.
    6.  Cada organização na lista é um link para `/app/promotor/eventos?orgId={org.id}`.
*   **Tecnologias:** React (Client Component, Hooks), Next.js (`Link`, `Image`), Supabase (Client Component Client), `lucide-react`, `shadcn/ui`.
*   **Pontos Fortes:** Fluxo claro (equipe -> orgs -> eventos), bom tratamento de estados (loading, erro, sem equipe), UI limpa.
*   **Áreas de Melhoria / Considerações:**
    *   **Suposição de Equipe Única:** UI assume/mostra apenas a primeira equipe (`teams[0]`), embora a busca traga todas.
    *   **Eficiência da Query:** Busca em duas etapas (`team_members` -> `teams` + `organizations`) pode ser otimizada (RPC/View).
    *   Depende da página `/app/promotor/eventos` para mostrar os eventos.
*   **Conclusão:** Dashboard funcional, mas pode precisar de ajuste se promotores puderem estar em múltiplas equipes ativas simultaneamente. Eficiência da busca pode melhorar.

#### 37. Página de Eventos do Promotor (`app/app/promotor/eventos/page.tsx`)

*   **Funcionalidade:** Página Server Component (`/app/promotor/eventos`) que exibe eventos (ativos e passados) de uma organização específica, identificada pelo query param `orgId`.
*   **Fluxo:**
    1.  Recebe `orgId` de `searchParams` (redireciona para dashboard se ausente).
    2.  Cria cliente Supabase server-side.
    3.  Busca em paralelo detalhes da organização e todos os eventos publicados (`is_published = true`) dessa organização.
    4.  Chama `notFound()` se a organização não for encontrada.
    5.  Usa funções auxiliares (`isEventPast`, `parseDateTime`) para dividir eventos em `activeEvents` e `pastEvents`.
    6.  Ordena `pastEvents` (mais recentes primeiro).
    7.  Renderiza secções separadas para eventos ativos e terminados, mapeando os dados para o componente `EventCardPromotor`.
    8.  Mostra mensagens apropriadas se não houver eventos.
*   **Tecnologias:** Next.js (Server Component, `searchParams`, `redirect`, `notFound`), Supabase (Server Component Client), `date-fns` (implícito), `lucide-react`.
*   **Pontos Fortes:** Server-side data fetching eficiente (paralelo), lógica clara de separação/ordenação de eventos, tratamento de erros/casos vazios, delegação para componente de card.
*   **Áreas de Melhoria / Considerações:**
    *   Lógica de `isEventPast` pode precisar de refinamento (não usa a margem de 8h do CRON).
    *   Falta Paginação para muitos eventos.
    *   Depende da implementação de `EventCardPromotor`.
*   **Conclusão:** Página sólida para listar eventos por organização para o promotor. Paginação seria importante para escala.

#### 38. Card de Evento para Promotor (`app/app/promotor/eventos/EventCardPromotor.tsx`)

*   **Funcionalidade:** Componente Client que renderiza um card para um evento específico, mostrando flyer, título, data/hora, localização e um botão para Material Promocional.
*   **Estrutura:**
    *   Usa `Card` de `shadcn/ui`.
    *   Formata data/hora com função auxiliar `formatDisplayDateTime`.
    *   Mostra flyer (com fallback `ImageOff`) e overlay "Evento Realizado" se `isPastEvent`.
    *   **Modal Material Promocional:**
        *   **CÓDIGO DUPLICADO:** Lógica de estado e fetch (`fetchPromotionalImages` da tabela `promotional_materials`) é copiada de outras partes (e.g., Chefe Equipe).
        *   Botão no rodapé abre `Dialog`.
        *   Modal busca e exibe imagens promocionais numa grelha.
        *   Permite download de cada imagem.
        *   Trata loading, erro e estado vazio.
*   **Tecnologias:** React (Client Component), Next.js (`Image`), Supabase (Client), `date-fns`, `lucide-react`, `shadcn/ui`.
*   **Pontos Fortes:** Card informativo e visualmente bom, funcionalidade útil de acesso/download de material, bom tratamento de estados no modal.
*   **Áreas de Melhoria / CRÍTICO:**
    *   **CÓDIGO DUPLICADO (CRÍTICO):** Lógica do modal de material promocional precisa ser extraída para um hook/componente reutilizável.
    *   Depende da existência e permissões (RLS) da tabela `promotional_materials`.
*   **Conclusão:** Bom componente de card, mas a duplicação de código é um problema significativo que precisa ser corrigido.

#### 39. Página de Gestão de Equipas do Promotor (`app/app/promotor/equipes/page.tsx`)

*   **Funcionalidade:** Página Client Component que serve como hub para promotores gerirem sua associação a equipes. Redireciona chefes, lista equipes atuais, e oferece opções para criar/aderir.
*   **Fluxo:**
    1.  Usa `useAuth` para `user` e `isTeamLeader`.
    2.  `useEffect` redireciona para `/app/chefe-equipe/dashboard` se `isTeamLeader === true`.
    3.  `useEffect` carrega dados (`loadTeams`, `loadSimulatedTeams`) apenas se `user` existe e `isTeamLeader === false`.
    4.  `loadTeams` busca equipes do BD.
    5.  `loadSimulatedTeams` busca equipes do `localStorage`.
    6.  Renderiza condicionalmente:
        *   Loading/Redirecionando.
        *   Card "Nenhuma equipa encontrada" com botões "Aderir" (`/ingressar`) e "Criar" (`/criar`).
        *   Grelha de cards das equipes (`allTeams = teams + simulatedTeams`), mostrando nome, código (ou "Simulação"), descrição e badge de role.
        *   Cada card tem botão "Ver Dashboard" (link para `/app/promotor/dashboard` - destino questionável).
    7.  Mostra `Alert` se houver equipes simuladas.
*   **Tecnologias:** React (Client Component, Hooks), Next.js (`useRouter`, `Link`), Supabase (Client), `localStorage`, `lucide-react`, `shadcn/ui`.
*   **Pontos Fortes:** Gestão clara de estados (sem equipe, com equipe, chefe), redirecionamento automático, hub central para ações, funcionalidade de simulação.
*   **Áreas de Melhoria / Considerações:**
    *   Lógica de `useEffect` para loading/redirect pode ser complexa.
    *   Destino do botão "Ver Dashboard" nos cards é estranho.
    *   Propósito/gestão das equipes simuladas (`localStorage`) não é claro.
    *   Depende das páginas `/criar` e `/ingressar`.
*   **Conclusão:** Página central importante para promotores. Lida bem com diferentes cenários, mas alguns detalhes (destino de botão, simulação) são questionáveis.

#### 40. Página de Criação de Equipe pelo Promotor (`app/app/promotor/equipes/criar/page.tsx`)

*   **Funcionalidade:** Página Client Component (`/criar`) que permite a um promotor criar sua própria equipe, tornando-se 'chefe-equipe'.
*   **Fluxo:**
    1.  Usa `react-hook-form` + `zod` para formulário (nome, descrição opcional).
    2.  Verifica se usuário já é `isTeamLeader` (via `useAuth`); se sim, redireciona.
    3.  **Chama RPC:** `onSubmit` chama a RPC `create_promoter_team_v2`.
    4.  **RPC (review #31):** Insere em `teams`, `team_members` (como leader), e tenta atualizar `role` e `team_id` nos metadados em `auth.users`.
    5.  **Tratamento Resposta:** Lida com erros da RPC. Tenta extrair `teamId` de diferentes formatos de resposta possíveis.
    6.  **Fallback Metadados:** Verifica se `user.user_metadata` foi atualizado pela RPC. Se não, tenta atualizar manualmente via `updateUserRole` (hook) e `supabase.auth.updateUser()`.
    7.  Força `refreshSession()`, mostra toast, espera e redireciona para `/app/chefe-equipe/dashboard`.
    8.  Inclui `useEffect` para diagnóstico de tabelas (`teams`, `team_members`), mas não usa o resultado na UI.
*   **Tecnologias:** React (Client), Next.js, Supabase (Client, RPC), `react-hook-form`, `zod`, `shadcn/ui`, `sonner`.
*   **Pontos Fortes:** Implementa fluxo de promoção promotor -> chefe, validação de form, verifica se já é líder, fallback para metadados, feedback ao usuário.
*   **Áreas de Melhoria / Considerações:**
    *   **Dependência da RPC Insegura:** Funcionalidade central depende da RPC `create_promoter_team_v2` (#31), que tem problemas de segurança (permissão `anon`, `SECURITY DEFINER`) e lógica (update `auth.users`).
    *   **Complexidade/Fragilidade:** Fallback manual para metadados indica falta de confiança na RPC. Atualizar metadados pode ser frágil.
    *   Diagnóstico de BD não utilizado na UI.
    *   Uso de `setTimeout` para esperar atualizações.
    *   Lógica complexa para extrair ID da resposta da RPC.
*   **Conclusão:** Implementa um fluxo crucial, mas herda os problemas da RPC subjacente e tem complexidade na gestão do estado pós-criação.
*   **Recomendação:** Corrigir a RPC `create_promoter_team_v2` no BD (segurança, consistência). Simplificar lógica de atualização de estado/metadados no cliente (tornar reativa). Remover diagnóstico não usado e `setTimeout`s.

#### 41. Página de Adesão a Equipe (`app/app/promotor/equipes/ingressar/page.tsx`)

*   **Funcionalidade:** Página Client Component (`/ingressar`) que permite a um promotor inserir um código (`teamCode`) para aderir a uma equipe existente.
*   **Fluxo:**
    1.  Formulário simples com input para `teamCode` (controlado via `useState`).
    2.  `onSubmit` valida input e se user está logado.
    3.  **Chama RPC:** Chama a RPC `join_team_with_code` passando `p_team_code` e `p_user_id`.
        *   *Nota:* Comentário sugere que a RPC contorna RLS. Implementação da RPC precisa ser verificada.
    4.  **Tratamento Resposta:** Lida com erros específicos da RPC ("não encontrada", "já membro") mostrando `error`/`sugestao` e toasts (`sonner`).
    5.  **Sucesso:** Mostra toast, espera 1.5s, redireciona para `/app/promotor/equipes`.
*   **Tecnologias:** React (Client), Next.js, Supabase (Client, RPC), `shadcn/ui`, `sonner`.
*   **Pontos Fortes:** UI focada, bom tratamento de erros específicos, feedback ao usuário.
*   **Áreas de Melhoria / Considerações:**
    *   **REDUNDÂNCIA:** Funcionalidade duplicada por `app/app/promotor/equipes/aderir/page.tsx` (#41.1).
    *   **Dependência de RPC `join_team_with_code`:** Precisa verificar a implementação/segurança da RPC (contorna RLS?).
    *   Uso de `useState` em vez de `react-hook-form` (inconsistente com `aderir`).
    *   Nomes de parâmetros RPC (`p_...`) diferem de `aderir` (`..._param`).
    *   Atraso `setTimeout` antes de redirecionar.
*   **Conclusão:** Página funcional, mas redundante e com dependência de RPC potencialmente problemática.

#### 41.1 Página de Adesão a Equipe (Alternativa) (`app/app/promotor/equipes/aderir/page.tsx`)

*   **Funcionalidade:** Versão alternativa e redundante de `/ingressar`. Usa `react-hook-form`+`zod`.
*   **Diferenças:** Nomes diferentes dos parâmetros na chamada RPC (`join_team_with_code`), usa `toast` diferente, chama `updateUserRole('promotor')` (desnecessário), redireciona para `/dashboard` em vez de `/equipes`.
*   **Conclusão:** Redundante.
*   **Recomendação (para #41 e #41.1):**
    1.  **Unificar:** Manter apenas uma rota/página (e.g., `/ingressar`).
    2.  **Padronizar:** Usar `react-hook-form`+`zod`.
    3.  Verificar/corrigir chamada e implementação da RPC `join_team_with_code` (nomes de params, segurança).
    4.  Remover chamada `updateUserRole`.
    5.  Redirecionar para `/app/promotor/equipes`.
    6.  **Remover o diretório/ficheiro redundante.**

#### 42. Página de Comissões do Promotor (`app/app/promotor/comissoes/page.tsx`)

*   **Funcionalidade:** Página Client (`"use client"`) para visualizar comissões por equipe e detalhadas, com filtros por equipe, status e data. Permite iniciar fluxo de pagamento.
*   **Estrutura e Lógica:**
    *   **Busca de Dados:** Usa RPC `get_commission_data` para buscar resumo por equipe (`fetchTeams`) e lista detalhada de comissões (`fetchCommissions`). **A RPC parece retornar todos os dados da organização.**
    *   **Filtragem (CRÍTICA):** Filtros por equipe, status e data são aplicados **no cliente** sobre a lista completa de comissões. **Ineficiente e não escalável.**
    *   **Chamada RPC Duplicada:** A mesma RPC é chamada em `fetchTeams` e `fetchCommissions`.
    *   **UI:** Usa Tabs (implícito), Cards para totais, `DatePickerWithRange`, `Select` para filtros, `Table` para detalhes com `Badge`s.
    *   **Ação Pagar:** Redireciona para `/pagar` com `teamId`.
    *   Mostra `toast` de sucesso pós-pagamento (via query param).
*   **Tecnologias:** React (Client), Supabase (Client, RPC), `shadcn/ui` (Table, DatePicker, Select, Badge), `sonner`.
*   **Pontos Fortes:** Interface rica com filtros, resumo por equipe, separação do fluxo de pagamento.
*   **Áreas de Melhoria / CRÍTICO:**
    *   **FILTRAGEM NO CLIENTE (CRÍTICO):** Causa problemas graves de performance/escalabilidade.
    *   **RPC CHAMADA DUAS VEZES.**
    *   RPC `get_commission_data` precisa aceitar filtros.
    *   Cálculo de totais no cliente.
*   **Recomendação Urgente:** **Refatorar RPC `get_commission_data`** para aceitar filtros e retornar apenas dados relevantes/agregados. **Chamar RPC apenas uma vez.** Remover filtragem/cálculo de totais no cliente.

#### 69. Pagamento de Comissões (`app/app/organizador/comissoes/pagar/page.tsx`)

*   **Funcionalidade:** Página Client (`"use client"`) para o organizador selecionar e marcar comissões pendentes de uma equipe específica como pagas.
*   **Estrutura e Lógica:**
    *   Recebe `teamId` via query params.
    *   Carrega comissões pendentes da equipe, **filtrando por data no servidor (BOM!)**.
    *   Exibe comissões em tabela com checkboxes para seleção. Mostra total selecionado.
    *   Permite adicionar notas e opções (enviar email, gerar recibo - não implementado).
    *   `handleSubmitPayment`:
        *   **NÃO ATÓMICO (CRÍTICO):** Executa múltiplas escritas sequenciais sem transação: INSERT `commission_payments`, INSERT `commission_payment_items`, UPDATE `commissions`. Risco MUITO ALTO de inconsistência de dados.
    *   Redireciona para `/comissoes?success=true` após a operação (potencialmente incompleta).
*   **Tecnologias:** React (Client), Supabase (Client), `shadcn/ui` (Table, Checkbox, DatePicker).
*   **Pontos Fortes:** Fluxo dedicado para pagamento, seleção granular, filtro de data no backend.
*   **Áreas de Melhoria / CRÍTICO:**
    *   **FALTA DE ATOMICIDADE NO PAGAMENTO (CRÍTICO):** Principal falha, garante inconsistência em caso de erro.
    *   Busca de equipes redundante/ineficiente.
    *   Funcionalidades de email/recibo não implementadas.
*   **Recomendação Urgente:** **Refatorar `handleSubmitPayment` para usar RPC Transacional ÚNICA.** Implementar funcionalidades pendentes (email/recibo) se necessário. Otimizar/remover busca de equipes.

---

### Diretório: `app/actions/`

#### 43. Ação de Associação de Equipe (`app/actions/organizerActions.ts` -> `associateTeamAction`)

*   **Propósito:** Server Action para associar uma equipe existente (via `teamCode`) a uma organização (`organizationId`).
*   **Funcionalidade:**
    1.  Recebe `teamCode`, `organizationId` via `FormData`.
    2.  Obtém `userId` da sessão.
*(Análise dos subdiretórios a seguir...)*

---

70. **Página Pública do Evento (`app/e/[id]/page.tsx`)**
    *   **Funcionalidade:** Exibe detalhes de um evento específico (título, descrição, data, hora, local, flyer) para o público geral. Busca dados de eventos publicados, ativos e que não sejam 'guest-list' no Supabase. Apresenta botão para compra de ingresso (se `ticket_url` existir) ou info genérica.
    *   **Estrutura:** Client Component (`'use client'`) que usa `useState`, `useEffect` para buscar e gerenciar estado. Separa lógica de dados (`EventPageContent`) do wrapper (`EventPage`) que lida com `params` via `React.use()`. Layout de duas colunas com `shadcn/ui` e Tailwind.
    *   **Lógica:** Busca dados no `useEffect`. Funções `formatDate`, `formatTime` para exibição. Tratamento de estados de loading/error. Botão "Comprar Ingresso" abre `ticket_url` em nova aba.
    *   **Tecnologias:** React, Next.js (App Router, Client Component), Supabase, TypeScript, Tailwind, `shadcn/ui`.
    *   **Pontos Fortes:** Página dedicada, boa UX (loading/error), componentes reutilizáveis, query Supabase eficiente, uso de `next/image`.
    *   **Áreas de Melhoria:** Funcionalidade incompleta (Compartilhar, Mais Info), formatação de hora frágil, falta de metadados dinâmicos (SEO), nenhuma info do organizador visível, tratamento de erro genérico.
    *   **Recomendações:** Implementar botões, robustecer formatação de data/hora, adicionar `generateMetadata`, exibir info do organizador, melhorar tratamento de erro.

71. **Cliente Supabase (Client-Side) (`lib/supabase.ts`)**
    *   **Funcionalidade:** Cria e exporta uma instância singleton do cliente Supabase para uso em Client Components (`'use client'`).
    *   **Lógica:** Usa `createClientComponentClient` (@supabase/auth-helpers-nextjs) para gerenciamento automático de sessão via cookies. Implementa padrão singleton. Inclui fallback para `createSupabaseClient` básico. Verifica variáveis de ambiente `NEXT_PUBLIC_...`.
    *   **Tecnologias:** Supabase JS Client, Supabase Auth Helpers (Next.js), TypeScript.
    *   **Pontos Fortes:** Singleton eficiente, usa helper recomendado para client-side, type safety com `Database`.
    *   **Áreas de Melhoria:** Fallback pouco claro, mas funcional.

72. **Cliente Supabase (Server-Side) (`lib/supabase-server.ts`)**
    *   **Funcionalidade:** Fornece uma função factory (`createServerSupabaseClient`) para criar instâncias do cliente Supabase no lado do servidor (Server Components, Actions, Route Handlers).
    *   **Lógica:** Usa `createServerClient` (@supabase/ssr). Integra com `cookies()` de `next/headers` para ler/escrever cookies de sessão. Retorna *nova instância* a cada chamada, configurada para o contexto da requisição. Verifica variáveis de ambiente `NEXT_PUBLIC_...`.
    *   **Tecnologias:** Supabase SSR, Next.js (`cookies`), TypeScript.
    *   **Pontos Fortes:** Usa biblioteca SSR recomendada, integração correta com cookies server-side.
    *   **Áreas de Melhoria:** Diretiva `'use server'` no topo do arquivo pode ser desnecessária/confusa. Tratamento de erro nos callbacks de cookie pode ser melhorado.

73. **Cliente Supabase (Admin) (`lib/supabase-admin.ts`)**
    *   **Funcionalidade:** Cria e exporta uma instância singleton do cliente Supabase com privilégios de administrador (usando `SUPABASE_SERVICE_ROLE_KEY`).
    *   **Lógica:** Usa `createClient` básico (@supabase/supabase-js) com a chave de serviço. Desabilita `autoRefreshToken` e `persistSession`. Verifica variáveis `NEXT_PUBLIC_SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` (não pública).
    *   **Tecnologias:** Supabase JS Client, TypeScript.
    *   **Pontos Fortes:** Singleton eficiente, separação clara do cliente admin, configuração adequada para service role.
    *   **Áreas de Melhoria / CRÍTICO:** **USO DEVE SER EXTREMAMENTE CONTROLADO.** Este cliente ignora RLS e políticas de storage. Qualquer código que o utilize exige auditoria rigorosa.

74. **Lógica de Autenticação Client-Side (`lib/auth.ts`)**
    *   **Funcionalidade:** Centraliza funções para interagir com Supabase Auth no cliente: `signUp`, `signIn`, `signOut`, `getUser`, `getSession`, `resetSession`.
    *   **Lógica:** Usa cliente Supabase (`createClient`). `signUp` lida com registro e metadados. `signIn` autentica, verifica roles, lida com compatibilidade de metadados antigos (atualizando no cliente - arriscado), e salva info/redirecionamento no `localStorage`. `signIn` também contém lógica complexa e comentada para limpeza e verificação de sessão pós-login (potencialmente problemática/desnecessária). `signOut`/`resetSession` limpam sessão e `localStorage`.
    *   **Tecnologias:** Supabase Client JS, TypeScript, Web APIs (`localStorage`).
    *   **Pontos Fortes:** Centralização, funções claras, tratamento de compatibilidade, uso de `localStorage` para info rápida.
    *   **Áreas de Melhoria / CRÍTICO:** Complexidade/fragilidade no `signIn` (loop de verificação pós-login, limpeza comentada), atualização de metadados críticos no cliente, dependência de `localStorage` para lógica de role/redirect (verificação server-side é essencial).
    *   **Recomendação:** Simplificar drasticamente a lógica pós-`signIn` (remover loop/`setSession` manual), mover atualização de metadados para backend, reforçar verificações server-side, remover logs excessivos.

--- 

### Diretório: `lib/` (Utilitários e Configuração Supabase) [✓ Visto]

75. **Utilitários Gerais (`lib/utils.ts`)**
    *   **Funcionalidade:** Fornece funções auxiliares: `cn` (para `clsx` + `tailwind-merge`), `generateSlug`, `formatDate`, `formatTime`.
    *   **Tecnologias:** TypeScript, `clsx`, `tailwind-merge`.
    *   **Pontos Fortes:** `cn` padrão, `generateSlug` útil, centralização.
    *   **Áreas de Melhoria / CRÍTICO:** **REDUNDÂNCIA (CRÍTICO):** `formatDate`/`formatTime` duplicadas de outros locais. Robustez da formatação pode ser melhorada (usar `date-fns`/`dayjs`).
    *   **Recomendação:** Unificar formatação de data/hora aqui, remover duplicatas, robustecer formatação.

76. **Interação com Storage (`lib/storage.ts`)**
    *   **Funcionalidade:** Contém `uploadOrganizationImage` para fazer upload de logo/banner para o bucket `organization_logos` no Supabase Storage.
    *   **Lógica:** Valida extensão, gera nome único, usa cliente Supabase padrão (`supabase`), faz upload, retorna URL pública.
    *   **Tecnologias:** Supabase Client JS (Storage API), TypeScript.
    *   **Pontos Fortes:** Função encapsulada, validações básicas, nome único, retorna URL.
    *   **Áreas de Melhoria / CRÍTICO:** **SEGURANÇA DEPENDE DE POLÍTICAS (CRÍTICO):** Usa cliente `anon`, segurança depende inteiramente das Políticas de Storage do bucket (precisam exigir auth/authz). Falta validação de tamanho.
    *   **Recomendação:** Revisar URGENTEMENTE as Políticas de Storage. Adicionar validação de tamanho. Usar com cliente autenticado, não admin.

77. **Cliente Supabase Client-Side (Alternativo/Redundante) (`lib/supabase/client.ts`)**
    *   **Funcionalidade:** Cria cliente Supabase básico client-side usando `createSupabaseClient` (@supabase/supabase-js).
    *   **Conclusão (CRÍTICO):** **REDUNDANTE E OBSOLETO.** Não usa helper `@supabase/auth-helpers-nextjs`, o que quebraria o gerenciamento de sessão em Client Components. Deve ser removido.

78. **Cliente Supabase Server-Side (Alternativo/Redundante) (`lib/supabase/server.ts`)**
    *   **Funcionalidade:** Cria cliente Supabase server-side usando `createServerClient` (@supabase/ssr) e cookies.
    *   **Conclusão (CRÍTICO):** **REDUNDANTE.** Quase idêntico a `lib/supabase-server.ts`. Deve ser removido.

79. **Tipos do Banco de Dados (`lib/database.types.ts`)**
    *   **Funcionalidade:** Contém definições de tipo TypeScript geradas automaticamente (`supabase gen types typescript`) a partir do schema do banco de dados Supabase.
    *   **Propósito:** Fornecer type safety para interações com o banco de dados (tabelas, views, funções) via cliente Supabase. Melhora autocompletar e previne erros.
    *   **Importância:** Fundamental para desenvolvimento robusto com TS + Supabase.
    *   **Manutenção:** Deve ser regenerado após cada alteração no schema do DB.

**Conclusão e Recomendações para `lib/`:**
*   O diretório contém lógica essencial, mas sofre de redundâncias significativas (clientes Supabase, formatação de data/hora).
*   **Recomendação Urgente:** Remover redundâncias (`lib/supabase/`, funções duplicadas em `utils.ts`), revisar políticas de Storage, simplificar `lib/auth.ts` e robustecer `lib/utils.ts`.

---

### Diretório: `hooks/` (Hooks Personalizados) [✓ Visto]

80. **Hook de Autenticação (`hooks/use-auth.tsx`)**
    *   **Funcionalidade:** Define `AuthContext`, `AuthProvider`, `useAuth` para gerenciamento global de autenticação e estado do usuário (user, session, isLoading, isTeamLeader).
    *   **Lógica:** Mantém estado local, usa `onAuthStateChange` para reatividade. Contém lógica complexa para normalização de roles, determinação/atualização de status `isTeamLeader` (incluindo escrita de metadados no cliente - INSEGURO), e wrappers para `signUp`/`signIn`/`signOut`. `signIn` reimplementa lógica de login e faz redirecionamento.
    *   **Tecnologias:** React (Context, Hooks), Supabase Client JS, Next.js Router, `sonner`.
    *   **Pontos Fortes:** Provider centralizado, reativo a mudanças de auth, tenta lidar com inconsistências de roles.
    *   **Áreas de Melhoria / CRÍTICO:** Duplicação/Complexidade em `signIn`, atualização de metadados no cliente (INSEGURO), necessidade de normalização de roles, tratamento de redirecionamento pode conflitar.
    *   **Recomendação:** Refatoração Urgente: Simplificar `signIn` (delegar a `lib/auth`), mover atualização de metadados para backend (Server Actions/RPCs), consolidar redirecionamento, padronizar roles no DB/código.

81. **Hook de Deteção Mobile (`hooks/use-mobile.tsx`)**
    *   **Funcionalidade:** Hook `useIsMobile` que retorna `true` se a largura da janela for menor que 768px.
    *   **Lógica:** Usa `useState` e `useEffect` com `window.matchMedia` para detetar largura e ouvir mudanças.
    *   **Tecnologias:** React (Hooks), Web APIs (`matchMedia`).
    *   **Pontos Fortes:** Implementação padrão e eficaz, reativa.
    *   **Áreas de Melhoria:** Valor inicial `undefined` (retorna `false` no SSR/antes do mount), breakpoint fixo.
    *   **Recomendação:** Sincronizar breakpoint com Tailwind/CSS. Considerar implicações de SSR/hidratação.

82. **Hook de Toast (shadcn/ui) (`hooks/use-toast.ts`)**
    *   **Funcionalidade:** Implementa sistema de estado para toasts (`useToast`, `toast`), padrão do `shadcn/ui` para seus componentes `<Toast />` / `<Toaster />`.
    *   **Lógica:** Usa estado global simples (`memoryState` + `listeners`) e um reducer para gerenciar adição, atualização, dispensa e remoção de toasts. Limita a 1 toast visível por padrão.
    *   **Tecnologias:** React (Hooks, Reducer pattern manual), TypeScript.
    *   **Pontos Fortes:** Implementação padrão `shadcn/ui`, funcional.
    *   **Áreas de Melhoria:** Verificar possível uso duplicado com `sonner`. Limite de 1 toast pode ser restritivo.
    *   **Recomendação:** Confirmar qual sistema de toast é usado primariamente e remover o outro. Ajustar limite/delay se necessário.

---

**Nota Final:** A análise detalhada dos diretórios `app/`, `app/api/`, `app/app/`, `lib/`, `hooks/` e das principais páginas públicas está concluída nesta fase.

---

## Análise Detalhada por Diretório (`app/` e filhos)

*(Esta secção detalha os componentes e páginas encontradas, seguindo a estrutura de diretórios)*

### Diretório: `app/components/dashboard/` (Localização Raiz - Suspeita)

**Nota Estrutural Importante:** A existência destes componentes diretamente em `app/components/` (ao nível da raiz `app/`) em vez de em `app/app/components/` sugere fortemente uma **redundância ou erro estrutural**. É muito provável que estes ficheiros sejam duplicados ou que devessem estar localizados dentro da estrutura de `app/app/`. Recomenda-se verificar a existência de cópias em `app/app/components/dashboard/`, escolher a versão correta/completa, remover as duplicadas e padronizar a localização dentro de `app/app/components/`.

#### 17. Lista de Membros da Equipe (`app/components/dashboard/team-members-list.tsx`)

*   **Funcionalidade:** Exibe a lista de membros de uma equipe, permite atualizar a lista e (para chefes de equipe) remover membros (com confirmação).
*   **Busca de Dados:** Tenta buscar via RPC `get_team_members`, com fallback para query direta em `team_members` + `users`. Inclui fallback para mostrar o próprio chefe se a busca falhar.
*   **Remoção:** Impede auto-remoção do chefe, usa `AlertDialog` para confirmação, atualiza UI localmente.
*   **Tecnologias:** React (Client Component), Supabase (Client JS, RPC), `shadcn/ui`, `lucide-react`, `sonner`, `@/hooks/use-auth`.
*   **Pontos Fortes:** Busca robusta com fallback, segurança na remoção, boa UX (loading, toasts).
*   **Áreas para Melhoria / CRÍTICO:**
    *   **REDUNDÂNCIA (CRÍTICO):** Provavelmente duplicado com um ficheiro em `app/app/components/dashboard/`. Precisa ser consolidado.
    *   **Permissão de Remoção:** Verifica permissão via `user.user_metadata.role`, seria mais robusto verificar na tabela `team_members` para a equipa específica.
*   **Recomendação:** Consolidar com a versão em `app/app/components/` e remover esta cópia.

#### 18. Feed de Atividades (`app/components/dashboard/activity-feed.tsx`)

*   **Funcionalidade:** Exibe uma lista de atividades recentes (e.g., membro entrou, evento criado, venda realizada), formatadas com ícones, descrições dinâmicas e tempo relativo.
*   **Estrutura:** Componente principal `ActivityFeed` recebe array `activities` e renderiza `ActivityEntry` para cada item. Limita número de itens.
*   **`ActivityEntry`:** Formata cada tipo de atividade com ícone (`lucide-react`), descrição e tempo (`date-fns`).
*   **Tecnologias:** React, `date-fns`, `lucide-react`, Tailwind CSS, TypeScript.
*   **Pontos Fortes:** Componente modular, formatação clara, flexível para novos tipos de atividade.
*   **Áreas para Melhoria / CRÍTICO:**
    *   **REDUNDÂNCIA (CRÍTICO):** Provavelmente duplicado ou no local errado. Deveria estar em `app/app/components/`.
    *   **Origem dos Dados:** Apenas exibe dados; a lógica de busca/geração das atividades reside noutro local.
*   **Recomendação:** Consolidar com a versão em `app/app/components/` (se existir) e remover esta cópia.

#### 19. Exibição do Código da Equipe (`app/components/dashboard/team-code-display.tsx`)

*   **Funcionalidade:** Mostra o código de convite da equipe num `Card`, permitindo copiar para a área de transferência ou compartilhar via API Web Share (com fallback para cópia).
*   **UI/UX:** Exibe código textual, botões de "Copiar" (com feedback visual) e "Compartilhar". Desabilita botões se não houver código. Usa `toast` para notificações. Inclui placeholder visual de QR Code (não funcional).
*   **Tecnologias:** React, Web APIs (`navigator.clipboard`, `navigator.share`), `shadcn/ui`, `lucide-react`, `sonner`.
*   **Pontos Fortes:** Funcionalidade clara, boa UX (feedback, fallback de partilha).
*   **Áreas para Melhoria / CRÍTICO:**
    *   **REDUNDÂNCIA (CRÍTICO):** Provavelmente duplicado ou no local errado. Deveria estar em `app/app/components/`.
    *   **Placeholder QR Code:** Ícone pode ser confuso; considerar gerar QR real ou usar outro ícone.
*   **Recomendação:** Consolidar com a versão em `app/app/components/` (se existir) e remover esta cópia. Considerar gerar um QR Code real se for desejado.

---

### Diretório: `app/api/guests/` [✓ Visto]

#### 20. API de Convidados (`app/api/guests/route.ts`)

*   **Funcionalidade:** Define handlers para `POST` (registar convidado), `PUT` (check-in) e `GET` (listar convidados) na rota `/api/guests`.
*   **Handler POST (Registo):**
    *   Recebe `event_id`, `name`, `phone`, `promoter_id?`, `team_id?`.
    *   **Validações (INSEGURAS):** Usa `supabaseAdmin` (service role - ignora RLS) para validar evento (tipo, publicado, datas, limite de convidados).
    *   **Geração QR Code:** Gera QR Code (Data URL) com dados do convidado.
    *   **Persistência (CRÍTICA/INSEGURA/CONFUSA):** Tenta salvar o convidado (com service role) numa sequência de locais: SQL direto em `guests`, `.insert()` em `guests`, `.insert()` em `guest_list_guests`, criação/inserção em tabela dinâmica `guests_{eventId}` (desabilita RLS!).
    *   **Fallback (INSEGURO):** Retorna sucesso 200 com QR code mesmo se a escrita na BD falhar.
    *   **Vulnerabilidade SQL Injection:** Constrói SQL manualmente com interpolação de strings.
*   **Handler PUT (Check-in):**
    *   Recebe `id`, `event_id`, `checked_in`.
    *   Busca convidado em `guests` ou `guest_list_guests` (usando cliente anónimo - respeita RLS anónima).
    *   Valida `event_id`.
    *   Atualiza `checked_in`, `is_checked_in`, `check_in_time`, `updated_at` (usando cliente anónimo).
    *   **Falta Autenticação:** Endpoint parece público.
*   **Handler GET (Listagem):**
    *   Recebe `eventId`.
    *   Busca todos (`select *`) os convidados de `guests` para o evento (usando cliente anónimo).
    *   Calcula estatísticas.
    *   **Falta Autenticação/Paginação:** Endpoint público, busca todos os dados.
*   **Tecnologias:** Next.js (Route Handlers), Supabase (Client JS, Service Role Key!), `qrcode`, `uuid`.
*   **Pontos Fortes:** Validações no backend (POST), geração de QR code, cálculo de stats (GET).
*   **Áreas para Melhoria / CRÍTICO:**
    *   **USO DE SERVICE ROLE PARA ESCRITA (CRÍTICO/INSEGURO):** Contorna RLS, permitindo escrita não autorizada.
    *   **LÓGICA DE PERSISTÊNCIA CAÓTICA (CRÍTICO):** Múltiplas tabelas, criação dinâmica insegura, inconsistências garantidas.
    *   **SQL INJECTION (CRÍTICO):** Construção manual de SQL insegura.
    *   **FALLBACK INSEGURO (CRÍTICO):** Retornar sucesso 200 sem salvar dados.
    *   **FALTA DE AUTENTICAÇÃO (PUT/GET):** Endpoints sensíveis estão públicos.
    *   **INCONSISTÊNCIA DE TABELAS:** POST, PUT e GET operam sobre conjuntos diferentes de tabelas.
*   **Recomendação Urgente:** **REFATORAÇÃO COMPLETA E IMEDIATA.**
</rewritten_file> 