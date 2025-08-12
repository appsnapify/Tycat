# Dashboard do Administrador (Admin) — Análise Completa e Especificação

Este documento consolida a análise do site, descreve todas as funcionalidades existentes (por papel/área), mapeia serviços/APIs/dados, e define a especificação completa do futuro Dashboard do Administrador. Inclui ainda um plano para servir o admin em `admin.nomedosite.com` com login altamente seguro e melhores práticas de segurança.

## 1) Arquitetura e Stack
- Framework: Next.js 15 (App Router), `app/*`.
- UI: TailwindCSS, Radix UI; componentes em `components/*` e `components/ui/*`.
- Auth/DB: Supabase (`@supabase/ssr`, `@supabase/supabase-js`), Postgres com RLS.
- Estado/Contexto: `contexts/*`, providers em `app/app/_providers/*`.
- APIs: `app/api/*` (organizational, teams, guests, scanners, health, cron, admin).
- PWA Scanner: `public/scanner-sw.js`, `public/scanner-manifest.json`.

## 2) Papéis e Permissões (panorama)
- Frontend (middleware e UI): `promotor`, `chefe-equipe`, `organizador`.
- Base de dados (por organização): `owner`, `admin`, `member` em `user_organizations`.
- “Admin” global: previsto em SQL/scripts e endpoints de admin; ainda não integrado em redirects/guardas do frontend.
- Middleware atual: protege `/app/*`, redireciona por papel (via `lib/utils/role-redirect.ts`), impede cross-access de áreas.

## 3) Funcionalidades por Área (existentes hoje)

### 3.1 Organizador (`/app/organizador/*`)
- Organizações
  - Criar organização (upload `logo` e `banner`, redes sociais) e gerar `slug`.
  - Associar o utilizador criador como `owner` em `user_organizations`.
  - Endpoints: `POST /api/organizations` (usa `storage`, `profiles`, `organizations`, `user_organizations`).
- Equipas
  - Associar equipa por `team_code` com validação forte (regex `TEAM-XXXXX`).
  - Se necessário, cria vínculo `organization_teams` e adiciona o criador da equipa como `member` em `user_organizations`.
  - Server Action: `associateTeamAction(formData)` com via segura RPC + fallback administrativo controlado.
- Eventos
  - Gestão de eventos: `title`, `date/time`, `end_date/end_time`, `status`.
  - Cron status: `GET /api/cron/update-event-status` altera `scheduled/active/completed` com margem de 8h.
- Check-in
  - Fluxo de validação integrado com Scanner.
- Comissões
  - Páginas e lógica de comissionamento e relatórios (implementação distribuída nas páginas).
- Configurações (Business Details)
  - `upsertOrganizerBusinessDetails` escreve `organizer_business_details` (dados faturação, IBAN e prova, contactos admin, morada de faturação).

### 3.2 Chefe de Equipa (`/app/chefe-equipe/*`)
- Criar e gerir equipa: definição de líder, edição de dados, gestão de membros.
- Operação diária: `eventos`, `vendas`, `financeiro`, `wallet`, `organizacoes`.
- Dashboards com métricas da equipa e estado dos eventos.

### 3.3 Promotor (`/app/promotor/*`)
- Adesão a equipa por código (`joinTeamWithCode`) → atualiza metadata: `role=promotor`, `team_id`, `team_role=member`.
- Eventos e convites
  - Criar registo de convidado com QR assinado; consultar convidado existente; atualizar QR.
  - Actions: `checkExistingGuest`, `createGuestRecord`, `updateGuestQRCode`, `validateGuestQRCode`.
- Comissões e Configurações: visualização e ajustes.

### 3.4 Scanner (`/scanner/*`)
- Leitura robusta com duas estratégias (Html5Qrcode → fallback WebRTC + `jsQR`).
- Anti-duplicação, gestão de permissões da câmara, limpeza robusta de recursos.
- UI de feedback visual/sonoro (`ScanFeedback`, `useScannerSounds`, `useVibrate`).
- Endpoints de apoio: `scanners/list`, `search`, `stats`, `create`, `cleanup`, `healthcheck`.
- PWA com SW e manifest dedicados.

## 4) Serviços, APIs e Processos

### 4.1 Supabase e Storage
- `lib/supabase-admin.ts` e `lib/supabase/adminClient.ts`: clientes administrativos (Service Role) somente no backend.
- Storage: `organization_logos` para `logo` e `banner` de organizações.
- Tabelas principais (exemplos): `organizations`, `profiles`, `teams`, `organization_teams`, `user_organizations (owner/admin/member)`, `events`, `guests`.
- RLS: deletes diretos em `guests` bloqueados (apenas via rotinas/admin); scanners acessíveis a `organizador` e `admin` por políticas.

### 4.2 Endpoints (inventário resumido)
- Organizations: `POST /api/organizations` (criar + storage + relacionamentos).
- Teams: `api/teams/create`, `api/teams/available` (listagem/descoberta).
- Guests: `api/guest/create`, `login`, `register`, `status`, `verify-phone`.
- Guest counts: `GET /api/guest-count?eventId=...`, `GET /api/guest-counts?eventIds=a,b`.
- Scanners: `GET /api/scanners/list`, `GET /search`, `GET /stats`, `POST /create`, `POST /cleanup`, `GET /healthcheck`.
- Health: `GET /api/health/system-status` (overview de saúde do sistema).
- Cron: `GET /api/cron/update-event-status` (agendado em `vercel.json`).
- Admin utilitários: `app/api/admin/*` (db-setup, run-migrations, update-status, wallet, cleanup-scanners).

### 4.3 Cron e Jobs
- `update-event-status`: recalcula status dos eventos com margem de segurança e logging.
- `vercel.json` agenda `cleanup-scanners` (existe também endpoint de cron/cleanup em scanners).

### 4.4 Hooks e UI de Dados
- `useGuestCount`: cache local 5m, fallback direto Supabase; versão batch `useGuestCounts`.
- UI de dashboards em `components/dashboard/*` (cards, métricas, equipas, listas).
- Formulários significativos: `components/event-creation-form.tsx` (onboarding e captação de dados do organizador/evento).

## 5) Segurança Atual (baseline)
- Middleware protege `/app/*`, injeta headers de user/role, bloqueia acessos cruzados de áreas.
- Service Role só em backend. Cookies SSR via `@supabase/ssr`.
- Políticas RLS para restringir writes/deletes sensíveis.

---

## 6) Especificação do Dashboard do Administrador (Manual de Utilizador)

### 6.1 Acesso (Admin)
- Apenas utilizadores com papel global “admin”.
- Admin pode ver/editar todas as entidades; navega entre dados de todos os perfis.
- Todas as ações sensíveis são server-side; nunca expor chaves no cliente.

### 6.2 Navegação (secções)
- Visão Geral (`/admin`): KPIs, estado do sistema, eventos ativos, cron/migrações recentes, erros.
- Utilizadores (`/admin/users`): contas, papéis, estado, último acesso.
- Organizações (`/admin/organizations`): CRUD, membros, papéis `owner/admin/member`.
- Equipas (`/admin/teams`): CRUD, líder, membros, código, associação a orgs.
- Eventos (`/admin/events`): CRUD, datas/estado, ligação a orgs, agregados.
- Convidados (`/admin/guests`): CRUD, importação/exportação, estado, validação.
- Scanners (`/admin/scanners`): listagem, pesquisa, encerrar/cleanup, stats.
- Contagens (`/admin/counts`): agregados por evento/equipa/intervalo, export.
- Configurações (`/admin/settings`): toggles, limites, integrações (Resend/Analytics), segurança.
- Migrações (`/admin/migrations`): execução controlada, histórico, logs.
- Logs/Auditoria (`/admin/logs`): erros, ações, exportação.

### 6.3 Visão Geral — Conteúdos
- KPIs: utilizadores totais, organizações/equipas ativas, eventos ativos, convidados totais, scans hoje, taxa de sucesso de scans.
- Gráficos: scans por hora (24h), convidados por evento.
- Estado: `api/health/system-status` + logs de cron/migrações.
- Ações rápidas: Criar organização, criar evento, cleanup scanners, abrir logs.

### 6.4 Utilizadores — Operações
- Tabela: ID, Email, Telefone, Papel (metadata.role), Estado, Criado em, Último acesso.
- Ações: criar, suspender/reativar, alterar papel (promotor/chefe-equipe/organizador/admin), reset MFA.
- Filtros: por papel, estado, organização, data de criação.

### 6.5 Organizações — Operações
- Tabela: ID, Nome, Proprietário, Nº membros, Nº equipas, Criado em.
- Ações: criar/editar, transferir owner, gerir membros, papéis `owner/admin/member`, uploads (logo/banner), redes sociais.

### 6.6 Equipas — Operações
- Tabela: ID, Nome, Organização, Código (TEAM-XXXXX), Líder, Nº membros, Estado.
- Ações: criar/editar, definir líder, gerir membros, regenerar código, associar org.

### 6.7 Eventos — Operações
- Tabela: ID, Título, Organização, Início/Fim, Estado, Nº convidados.
- Ações: criar/editar, publicar/encerrar, duplicar, forçar recalcular estado (cron/manual).

### 6.8 Convidados — Operações
- Tabela: ID, Nome, Telefone, Evento, Estado, Criado em, Validado por, Último scan.
- Ações: criar/importar CSV, editar, invalidar, exportar, apagar (via rotinas admin, confirmação dupla).

### 6.9 Scanners — Operações
- Tabela: ID, Organização, Evento, Dispositivo, IP, Status, Criado/Atualizado.
- Ações: listar/pesquisar, encerrar sessões, cleanup inativos, ver stats/health.

### 6.10 Contagens — Operações
- Visualizações por evento/equipa/intervalo; recalcular e exportar CSV.

### 6.11 Configurações — Operações
- Segurança: RLS/roles, proteção de rotas.
- Notificações: SMTP (server-side), integrações (Resend/Analytics).
- Limites/Toggles: ativar/desativar funcionalidades.

### 6.12 Migrações — Operações
- Executar scripts com service role (backend), ver histórico/logs, rollback controlado.

### 6.13 Logs/Auditoria — Operações
- Filtrar por nível/rota/utilizador/data; export para auditoria.

---

## 7) Subdomínio Admin — `admin.nomedosite.com`

### 7.1 Objetivo
- Isolar a UI e a autenticação do Admin em subdomínio próprio, com controlos de segurança reforçados e políticas de cookies/headers mais estritas.

### 7.2 DNS e Deploy (exemplo em Vercel)
- DNS: criar `CNAME admin → cname.vercel-dns.com` (ou equivalente na sua infraestrutura).
- Projeto/Deploy: apontar `admin.nomedosite.com` para o mesmo projeto Next.js ou um projeto separado (ver 7.4).
- Supabase Auth: adicionar `admin.nomedosite.com` a Redirect URLs/Allowed Origins nas configurações do Auth.

### 7.3 Roteamento por Domínio (opções)
- Único projeto Next:
  - Middleware verifica `Host` (ex.: começa por `admin.`) e permite apenas rotas de admin.
  - Agrupar páginas admin sob um route group (ex.: `(admin)`) e servir como raiz quando `host` é admin.
  - Rejeitar acessos ao admin via domínio público, redirecionando para `https://admin.nomedosite.com`.
- Projetos separados:
  - Projeto Admin dedicado (UI e rotas só de admin), isolando dependências/risco.
  - Permite políticas de segurança específicas (CSP, cookies, rate limit) sem impactar o público.

### 7.4 Arquitetura recomendada
- Preferível projeto Admin separado para isolamento (blast radius menor).
- Partilhar biblioteca de tipos (`types/*`) e clientes (`lib/supabase*`) por pacote interno ou workspace (opcional).

### 7.5 Cookies/Sessão (subdomínios)
- Separar cookies de sessão do admin dos do site público.
- Definir `Secure`, `HttpOnly`, `SameSite=Strict` (login apenas no subdomínio admin).
- Opcional: `domain=.nomedosite.com` apenas se quiser SSO entre subdomínios (não recomendado para Admin).

### 7.6 Autenticação “Muito Segura”
- MFA obrigatório: TOTP (Supabase 2FA) e/ou WebAuthn (chaves de segurança/passkeys).
- Step-up auth para ações destrutivas (apenas após MFA recente).
- Rate limiting por IP/rota para tentativas de login.
- Proteções adicionais:
  - Password policy forte; passwordless com passkeys recomendado.
  - Bloqueio temporário após N tentativas falhadas.
  - Revalidação periódica de sessão (ex.: 12h) e rotação de tokens.
  - Verificação de `Host` e `Origin` no middleware; CSRF tokens em POSTs.
  - CSP rigorosa (whitelists de scripts/origens); headers de segurança (HSTS, X-Frame-Options DENY, etc.).

### 7.7 Autorização
- Papel “admin” global no metadata do utilizador (Supabase `auth.users.user_metadata.role = 'admin'`) — ou tabela dedicada.
- Middleware do Admin: bloquear tudo que não for `admin`; registar tentativas e IPs.
- Gate por IP (allowlist) opcional para acessos de gestão.

### 7.8 Integração com Serviços Existentes
- Reutilizar `app/api/admin/*` e criar endpoints adicionais só no projeto Admin.
- Reutilizar contagens (`guest-count*`), scanners (`stats/cleanup`), cron status e health.

---

## 8) Roadmap de Implementação do Admin
1) Papel e Guardas
   - Definir atribuição de `admin` (global) e integrar no middleware/redirects.
   - Bloquear `/admin/*` por `Host` e `role` + rate limiting.
2) Projeto/Admin UI
   - Scaffold do layout + sidebar; homepage com KPIs e health.
   - Configurar DNS e domínio em Vercel; ajustar Supabase Auth Redirects.
3) Listagens
   - Users, Organizations, Teams, Events, Guests, Scanners (paginação server-side, filtros, ordenação).
4) Ações/CRUD
   - Server actions/APIs seguras para criar/editar/arquivar; confirmações para destrutivas.
5) Métricas
   - Gráficos de scans/contagens; taxa de sucesso; comparativos por evento/equipa.
6) Manutenção
   - Cleanup scanners, trigger cron/manual, migrações com logs/histórico.
7) Logs/Auditoria
   - UI de logs e exportações; correlação por request id (se houver).
8) Hardening
   - CSP estrita, HSTS, CSRF, WebAuthn/TOTP, rotação de tokens, testes e pentest.

---

## 9) Operação (Runbook)
- Gestão de acessos: quem pode atribuir/remover `admin` (processo interno + logging).
- Resposta a incidentes: bloquear contas, invalidar sessões, exportar logs, rollback de migrações.
- Backups: base de dados e storage; testes periódicos de restore.

## 10) Riscos e Mitigações
- Ambiguidade de papéis (frontend vs DB): padronizar nomenclaturas e validações.
- Uso de Service Role: restrito ao backend; substituir fallbacks por RPCs seguras.
- Cargas elevadas nas listas/admin: paginação server-side e índices adequados.
- Segregação de cookies: não partilhar sessão entre subdomínios.

## 11) Próximos Passos
- Decidir entre projeto Admin separado vs subpasta com routing por domínio.
- Definir requisitos de MFA (TOTP, WebAuthn) e políticas (bloqueios/expirações).
- Alinhar com equipas de infra (DNS, Vercel, Supabase Auth Allowed Origins).
- Iniciar Fase 1 do Roadmap (papéis/guardas) e Fase 2 (scaffold + DNS).

---

## 12) Funcionalidades Detalhadas por Área

### 12.1 Organizador — Operações end-to-end
- Organizações
  - Criar com uploads (logo/banner) e redes sociais; geração automática de `slug`.
  - Gerir membros e papéis (owner/admin/member) via relação `user_organizations`.
- Equipas
  - Associar equipas por `team_code` (regex `^TEAM-[A-Z0-9]{5}$`).
  - Ao associar: criar vínculo `organization_teams` e garantir criador como `member` da organização.
- Eventos
  - Criar/editar: `title`, `description`, `date/time`, `end_date/end_time`, `location`, `type` (ex.: guest-list), `guest_list_open/close_datetime`.
  - Estado: `scheduled`, `active`, `completed` (cron com margem de 8h após fim oficial).
  - Página de Detalhe (tabs):
    - Estatísticas: total convidados, total check-ins, taxa; distribuição por género; horário(s) de pico de registos; análise temporal; top equipas; top promotores; top localizações (código postal/cidade).
    - Convidados: tabela com filtros/ordenação; operações de gestão individuais.
    - Informações: dados do evento; ações rápidas (Check-in, Página pública, Editar evento).
- Check-in
  - Link direto para modo check-in; integração com Scanner.
- Comissões
  - Gestão de regras e relatórios por equipa/promotor.
- Configurações do organizador (Business Details)
  - Faturação, IBAN/prova, contactos admin, morada de faturação (upsert por `user_id`).

### 12.2 Chefe de Equipa
- Criar/gerir equipa, definir líder, gerir membros.
- Vendas, financeiro, wallet, acesso a eventos da organização.
- Métricas operacionais da equipa.

### 12.3 Promotor
- Entrar numa equipa com `team_code` (atualiza `user_metadata` com `team_id` e `team_role`).
- Criar/registar convidados, gerir QR codes, verificar existência e atualizar.
- Ver eventos e comissões; configurações pessoais.

### 12.4 Scanner
- Leitura robusta com Html5Qrcode e fallback WebRTC + `jsQR`.
- Prevenção de duplicados, sons/vibração, limpeza de recursos; PWA com SW/manifest.
- Pesquisa/listagem/stats/cleanup via APIs dedicadas.

## 13) Modelos de Dados Essenciais (campos principais)
- organizations: `id`, `name`, `email`, `address`, `logo_url`, `banner_url`, `social_media (json)`, `slug`, `created_at`, `updated_at`.
- user_organizations: `user_id`, `organization_id`, `role ('owner'|'admin'|'member')`, `created_at`.
- teams: `id`, `name`, `team_code (TEAM-XXXXX)`, `organization_id?`, `created_by`.
- organization_teams: `organization_id`, `team_id`.
- events: `id`, `organization_id`, `title`, `description?`, `date`, `time?`, `end_date?`, `end_time?`, `location?`, `type? ('guest-list'|...)`, `guest_list_open_datetime?`, `guest_list_close_datetime?`, `status ('scheduled'|'active'|'completed')`.
- guests: `id`, `event_id`, `name`, `phone`, `client_user_id`, `promoter_id`, `team_id`, `qr_code (assinado)`, `qr_code_url`, `checked_in (bool)`, timestamps.
- profiles: `id`, `first_name`, `last_name`, `role?`, timestamps.

## 14) Endpoints por Domínio (resumo prático)
- Organizations
  - POST `/api/organizations` — Criar organização
    - FormData: `name`, `email`, `address`, `logo(File)`, `banner(File)`, `userId`, socials (`instagram/facebook/youtube/tiktok/twitter/website`).
    - Retorna: `{ id, slug, name }`.
- Teams
  - POST `/api/teams/create` — Criar equipa (se existir)
  - GET `/api/teams/available` — Descobrir equipas
- Guests
  - POST `/api/guest/create` — Criar convidado
  - POST `/api/guest/login` — Login convidado
  - POST `/api/guest/register` — Registo convidado
  - GET `/api/guest/status` — Estado convidado/QR
  - POST `/api/guest/verify-phone` — Verificar telefone
- Guest Counts
  - GET `/api/guest-count?eventId=UUID`
  - GET `/api/guest-counts?eventIds=UUID,UUID`
- Scanners
  - GET `/api/scanners/list` — Listar sessões
  - GET `/api/scanners/search?q=...` — Buscar
  - GET `/api/scanners/stats` — Estatísticas
  - POST `/api/scanners/create` — Criar sessão
  - POST `/api/scanners/cleanup` — Limpar inativos
  - GET `/api/scanners/healthcheck` — Saúde
- Health
  - GET `/api/health/system-status` — Status de serviços
- Cron
  - GET `/api/cron/update-event-status` — Recalcular estados
- Admin utilitários
  - `/api/admin/*` — db-setup, run-migrations, update-status, wallet, cleanup-scanners

## 15) Matriz de Permissões (alto nível)
- Admin (global)
  - Acesso total a `/admin/*` e leitura/escrita de todas as entidades; ações destrutivas com step-up MFA.
- Organizador
  - R/W na(s) suas organizações, equipas associadas, eventos e convidados; acesso a scanners conforme políticas.
- Chefe de Equipa
  - R/W na sua equipa (membros, vendas, financeiro), leitura de eventos ligados e métricas.
- Promotor
  - Ler eventos/organização associada, criar convidados seus; ver comissões; gerir perfil.

## 16) Jornadas de Utilizador (User Journeys)
- Organizador: login → criar organização → associar equipas → criar eventos → gerir guest list/check-in → consultar stats/comissões → ajustar configs.
- Chefe de Equipa: login → criar/gerir equipa → recrutar/gerir membros → operar em eventos → acompanhar vendas/financeiro.
- Promotor: login/aderir equipa → ver eventos → registar convidados (QR) → acompanhar comissões.
- Scanner: login → iniciar sessão scanner → validar convidados → monitorizar stats.
- Admin: login admin → overview KPIs → gerir users/orgs/teams/events/guests/scanners → manutenção (cleanup/cron/migrations) → auditar logs.

## 17) KPIs por Área
- Visão Geral: utilizadores, organizações/equipas ativas, eventos ativos, convidados totais, scans/dia, taxa sucesso scans.
- Evento: total convidados, total check-ins, taxa check-in, picos de registo, distribuição por género, top equipas/promotores, top localizações.
- Equipa: nº membros, convidados registados, check-ins, conversão por evento.

## 18) Erros e Edge Cases Relevantes
- Códigos de equipa inválidos (regex falha) ou duplicados.
- Falhas RLS (permission denied) — usar RPCs seguras; evitar service role no cliente.
- QR duplicado/scan repetido — mitigado no hook com anti-duplicação temporal.
- Permissão de câmara negada — fallback WebRTC e mensagens claras.
- Sessões de scanner órfãs — resolver com `cleanup` e expiração.
- Cron de estado de eventos — garantir robustez e logging; reprocessar em falhas.

## 19) Segurança Recomendada (Admin 10/10)
- MFA obrigatória (TOTP; preferível WebAuthn/passkeys); step-up MFA para ações destrutivas.
- Rate limiting por IP/rota (ex.: login, /admin/* APIs).
- Cookies: `Secure`, `HttpOnly`, `SameSite=Strict`, segregados por subdomínio; sem SSO com público.
- CSRF: tokens em POSTs no admin; validação de `Origin`/`Host` no middleware.
- CSP: apenas domínios whitelisted; `frame-ancestors 'none'`; `upgrade-insecure-requests`;
  - Exemplo (alto nível): `default-src 'self'; script-src 'self' 'sha256-...'; connect-src 'self' https://<supabase-url>; img-src 'self' data: https://storage-url; frame-ancestors 'none'; base-uri 'self';`.
- HSTS (subdomínios incluídos), X-Frame-Options DENY, Referrer-Policy strict-origin-when-cross-origin.
- Rotação de tokens e expiração de sessão (ex.: 12h), logout global.

## 20) Subdomínio Admin — Implementação Técnica
- DNS: `admin` → CNAME/ALIAS conforme provider.
- Deploy: projeto Admin separado (recomendado) ou route group + verificação de `Host` no middleware.
- Supabase Auth: adicionar `admin.nomedosite.com` a Allowed Origins/Redirects.
- Cookies: domínio limitado ao subdomínio; sem partilha com `www`.
- Middleware dedicado do Admin: bloquear não-admin; registar IP/tentativas; opcional allowlist IP.
- Endpoints Admin-only: sob `/api/admin/*` com validação adicional de role e, se necessário, assinatura server-to-server.

## 21) Completaridade e Próximos Detalhes
- Para cada endpoint, definir contrato formal (OpenAPI opcional) com `request/response` e códigos de erro.
- Para cada tabela crítica, validar índices (ex.: `event_id`, `team_id`) e chaves para performance.
- Testes E2E: login admin, fluxos CRUD críticos, segurança (CSRF, rate limit), scanner e cron.