# Dashboard do Administrador — Especificação e Manual de Utilização

## Objetivo
Fornecer uma interface completa para administração do sistema, com acesso total de leitura e escrita a todas as entidades: utilizadores, organizações, equipas, eventos, convidados, scanners, contagens, configurações, migrações e auditoria.

## Perfis e Permissões
- **Administrador (admin)**: Acesso total a todas as rotas e ações. Pode ler/editar/apagar qualquer recurso. Acede a `/admin/*` e a todas as rotas em `/app/*`.
- **Outros perfis**: Organizador, Chefe de Equipa, Promotor — acesso limitado às suas áreas. Bloqueados de `/admin/*`.

## Navegação Global do Dashboard
- **Visão Geral** (`/admin`): métricas gerais, status de sistema, eventos ativos, uso de scanners, erros recentes.
- **Utilizadores** (`/admin/users`): gestão de contas, papéis, estado, metadados.
- **Organizações** (`/admin/organizations`): CRUD de organizações, proprietários, membros e papéis (owner/admin/member).
- **Equipas** (`/admin/teams`): CRUD, associação a organizações e membros, códigos de equipa, líderes.
- **Eventos** (`/admin/events`): CRUD, datas, estado (scheduled/active/completed), ligação a organizações, contagens.
- **Convidados** (`/admin/guests`): CRUD, estado, validação, importações, contagens agregadas.
- **Scanners** (`/admin/scanners`): gestão de dispositivos/sessões; listagem, pesquisa, limpeza, estatísticas e saúde.
- **Contagens** (`/admin/counts`): agregados por evento/equipa, série temporal e picos.
- **Configurações** (`/admin/settings`): chaves, toggles de funcionalidades, limites, segurança.
- **Migrações** (`/admin/migrations`): executar migrações seguras (server-side).
- **Logs/Auditoria** (`/admin/logs`): ações administrativas, erros de API, health checks.

## Especificações por Secção

### 1) Visão Geral (`/admin`)
- Cards: Utilizadores totais, Organizações, Equipas, Eventos ativos, Convidados totais, Scans hoje.
- Gráficos: scans por hora (últimas 24h), convidados por evento.
- Estado do sistema: health checks, últimas migrações, cron jobs.

### 2) Utilizadores (`/admin/users`)
- Tabela: ID, Email, Telefone, Papel (metadata.role), Estado, Criado em, Último acesso.
- Ações: criar, suspender/reativar, definir papel (promotor/chefe-equipe/organizador/admin), reset MFA.
- Filtros: por papel, estado, organização, data de criação.
- Integrações: Supabase `auth.users`, `profiles` e `user_organizations`.

### 3) Organizações (`/admin/organizations`)
- Tabela: ID, Nome, Proprietário, Nº membros, Nº equipas, Criado em.
- Ações: criar, editar, transferir propriedade, adicionar/remover membros, definir papéis (owner/admin/member).
- Filtros: por nome, proprietário, data.

### 4) Equipas (`/admin/teams`)
- Tabela: ID, Nome, Organização, Código, Líder, Nº membros, Estado.
- Ações: criar, editar, atribuir líder, gerir membros, regenerar código, arquivar.

### 5) Eventos (`/admin/events`)
- Tabela: ID, Título, Organização, Data Início/Fim, Estado (scheduled/active/completed), Nº convidados.
- Ações: criar/editar, publicar/encerrar, recalcular estado, duplicar.
- Cron: endpoint `/api/cron/update-event-status` (agendado no `vercel.json`).

### 6) Convidados (`/admin/guests`)
- Tabela: ID, Nome, Telefone, Evento, Estado, Criado em, Validado por, Último scan.
- Ações: criar/importar CSV, editar, invalidar, apagar (restrito), exportar.
- Políticas RLS: deletes apenas via admin/rotinas seguras.

### 7) Scanners (`/admin/scanners`)
- Tabela: ID, Organização, Evento, Dispositivo, IP, Status, Criado/Atualizado.
- Ações: listar, pesquisar, encerrar sessões, limpar inativos (`/api/scanners/cleanup`), ver estatísticas (`/api/scanners/stats`).

### 8) Contagens (`/admin/counts`)
- Agregações: por evento, equipa, intervalo de datas.
- Ações: recalcular, exportar CSV.

### 9) Configurações (`/admin/settings`)
- Secções: Segurança (RLS, roles), Notificações (SMTP), Limites e Toggles (features), Integrações (Resend, Analytics).
- Ações: atualizar chaves seguras via server actions; nunca expor no cliente.

### 10) Migrações (`/admin/migrations`)
- Executar scripts controlados (somente server-side) com feedback e logs.
- Requer `service role` no backend, nunca no cliente.

### 11) Logs/Auditoria (`/admin/logs`)
- Visualizar logs de API, erros, auditoria de ações admin.
- Filtros: por nível, rota, utilizador, data.

## Regras de Acesso e Segurança
- Middleware protege `/admin/*` e `/app/*`.
- `admin` tem acesso a todas as rotas; perfis não-admin são redirecionados para o seu dashboard.
- Chaves de `service role` apenas em endpoints server-side.

## Endpoints Relevantes (existentes)
- Scanners: `/api/scanners/list`, `/api/scanners/search`, `/api/scanners/stats`, `/api/scanners/cleanup`.
- Convidados: `/api/guest/*`, contagens: `/api/guest-count`, `/api/guest-counts`.
- Cron: `/api/cron/update-event-status`.
- Admin utilitários: `/api/admin/*` (mutações controladas).

## Layout e UX
- Sidebar fixa com secções listadas acima; cabeçalho com pesquisa global e quick actions.
- Tabelas com paginação, ordenação, filtros persistentes.
- Modais para criação/edição; confirmações para ações destrutivas.
- Suporte mobile com colunas essenciais e ações compactas.

## Métricas e KPIs (Visão Geral)
- Utilizadores totais, organizações ativas, equipas ativas, eventos ativos, scans hoje, taxa de sucesso de scans.

## Estados e Erros
- Estados vazios com CTAs (criar/importar).
- Erros com mensagens claras e logs correlacionados.

## Performance
- Paginação server-side; evitar overfetch no cliente.
- Reutilizar endpoints existentes; batching quando aplicável.

## Roadmap de Implementação
1) Proteções e roles (`middleware`/`role-redirect`).
2) Scaffold de rotas `/admin/*` com layout e sidebar.
3) Páginas de tabela estáticas + fetch incrementais.
4) Ações críticas (create/edit/delete) atrás de server actions seguras.
5) KPIs e dashboards.