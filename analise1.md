# Análise do Projeto Snapify

## Estrutura de Diretórios e Arquivos

```
├── .assistantrules
├── .cursor\
│   └── rules\
│       ├── regra.mdc
│       ├── regras1.mdc
│       └── testerute.mdc
├── .deepsource.toml
├── .github\
│   └── dependabot.yml
├── .gitignore
├── @\
│   ├── app\
│   │   └── actions\
│   │       └── organizerSettingsActions.ts
│   └── components\
│       └── app-sidebar.tsx
├── ANALISE_MODELO_DADOS_EVENTOS.md
├── AUDITORIA_COMPLETA_MIGUELLOPES.md
├── BACKUP_USER_ORIGINAL.MD
├── CHECK_PHONE_OPTIMIZATION_REPORT.md
├── CORREÇÕES_SCANNER_DEBUG.md
├── CREATE_SCANNER_TABLES.sql
├── DEBUG_SCANNER_FIXES.md
├── DOCS_SUPABASE_COOKIE_ERROR.md
├── FIXES_README.md
├── GUESTMOBILE_README.md
├── GUIA_IMPLEMENTACAO_QRCODE.md
├── GUIA_TESTE_SCANNER_COMPLETO.md
├── IMPLEMENTACAO_QRCODE_DETALHES.md
├── LOG_IMPLEMENTACAO_USER.md
├── MELHORIAS_SCANNER_2025.md
├── OTIMIZACAO_FLUXO_PROMO_ALTA_AFLUENCIA.md
├── OTIMIZACAO_FLUXO_PROMO_REFINADA.md
├── PLANO_IMPLEMENTACAO_PROMO.md
├── PLANO_MELHORIA_QRCODE.md
├── PLANO_MIGRACAO_VISUAL_PROMO.md
├── PLANO_SCANNER_COMPLETO.md
├── PROMO2_SISTEMA_OTIMIZADO.md
├── QUERIES_SUPABASE_PROMO.md
├── RELATORIO_IMPLEMENTACAO_GRACEFUL.md
├── RELATORIO_OTIMIZACAO_CHECK_PHONE.md
├── SCANNER_ANALYSIS.md
├── SECURITY.md
├── SECURITY_LOGGING.md
├── SISTEMA_CLIENTE_ISOLADO_IMPLEMENTACAO.SISTEMA_CLIENTE_ISOLADO_IMPLEMENTACAO.md
├── SUPABASE_COOKIE_PARSING_ISSUE.md
├── Testes\
│   ├── dashboard.txt
│   └── dashboard1\
│       └── page.tsx
├── VERIFICAR_SCANNER_SISTEMA.sql
├── analisardepois.md
├── analise-tecnica-snap.md
├── app\
│   ├── actions\
│   │   ├── auth.ts
│   │   ├── organizerActions.ts
│   │   ├── organizerSettingsActions.ts
│   │   ├── promo.ts
│   │   └── team-actions.ts
│   ├── admin\
│   │   ├── components\
│   │   ├── dashboard\
│   │   ├── database\
│   │   ├── login\
│   │   ├── migrations\
│   │   │   └── page.tsx
│   │   └── users\
│   ├── api\
│   │   ├── admin\
│   │   │   ├── add-column\
│   │   │   │   └── route.ts

# Análise Detalhada: `app/actions/organizerActions.ts`

## 1. Arquitetura e Funcionalidades
- **Visão Geral:** Este arquivo contém a função assíncrona `associateTeamAction`, que é uma Server Action projetada para associar uma equipe a uma organização existente. Ela lida com a autenticação do usuário, validação do código da equipe, e realiza operações de banco de dados (Supabase) para atualizar a equipe e registrar as associações nas tabelas `organization_teams` e `user_organizations`.
- **Componentes/Funções Principais:**
    - `associateTeamAction(formData: FormData)`: A função principal que orquestra o processo de associação.
    - `createServerClient()`: Utilizado para obter o cliente Supabase para o usuário autenticado.
    - `createClient()`: Utilizado para obter um cliente Supabase Admin com `SUPABASE_SERVICE_ROLE_KEY` para operações privilegiadas.
- **Fluxo de Dados:**
    1. Recebe `formData` contendo `teamCode` e `organizationId`.
    2. Autentica o usuário usando `supabaseUserClient.auth.getUser()`.
    3. Valida a presença de `teamCode` e `organizationId`.
    4. **Nova Validação:** Verifica o formato do `teamCode` (`TEAM-XXXXX`).
    5. Inicializa um cliente Supabase Admin.
    6. Busca a equipe (`teams`) pelo `team_code` usando o cliente Admin.
    7. Realiza várias validações: equipe existe, `created_by` presente, equipe já associada a esta organização, equipe associada a outra organização.
    8. Atualiza a tabela `teams` com o `organization_id` usando o cliente Admin.
    9. Insere registros nas tabelas `organization_teams` e `user_organizations` (para o criador da equipe) usando o cliente Admin.
    10. Retorna sucesso ou falha com mensagens detalhadas.

## 2. Considerações de Segurança
- **Vulnerabilidades Identificadas:**
    - **Uso Crítico de `SUPABASE_SERVICE_ROLE_KEY` (Alta):** A função utiliza `SUPABASE_SERVICE_ROLE_KEY` para operações de leitura e escrita (`select`, `update`, `insert`). Esta chave concede acesso total ao banco de dados, ignorando as Row Level Security (RLS). Embora seja usada para operações que exigem privilégios elevados (como associar equipes e membros), seu uso direto em uma Server Action requer extrema cautela. Se esta chave for comprometida ou se a lógica da Server Action tiver falhas, pode levar a acesso não autorizado e manipulação de dados.
    - **Falta de Autorização Granular (Média):** A lógica atual verifica se o usuário está autenticado, mas não verifica se o usuário autenticado tem permissão para associar equipes a *esta* organização específica. Qualquer usuário autenticado poderia tentar associar uma equipe a qualquer `organizationId` válido.
    - **Mensagens de Erro Detalhadas (Baixa/Média):** Em caso de falha, as mensagens de erro retornadas (`findError`, `updateError`, `orgTeamInsertError`, `orgMemberInsertError`) podem expor detalhes internos do banco de dados ou da lógica da aplicação, o que pode ser útil para um atacante.
- **Controles de Segurança Existentes:**
    - **Autenticação de Usuário:** `supabaseUserClient.auth.getUser()` garante que apenas usuários autenticados possam iniciar a ação.
    - **Validação de Entrada:** Verificação de `teamCode` e `organizationId` nulos e um novo padrão de `teamCode` (`TEAM-XXXXX`).
    - **Verificação de Associação Existente:** Impede que a mesma equipe seja associada múltiplas vezes ou a organizações diferentes.
- **Recomendações de Melhoria de Segurança:**
    1. **Restringir o Uso da Chave de Serviço:** Avaliar se todas as operações que usam `supabaseAdmin` realmente precisam ignorar RLS. Para operações que podem ser feitas com RLS, usar o cliente Supabase do usuário. Se o uso da chave de serviço for inevitável, garantir que a lógica que a utiliza seja à prova de falhas e minimamente privilegiada.
    2. **Implementar Autorização Baseada em Papéis/Permissões:** Antes de realizar qualquer operação de associação, verificar se o `userId` autenticado tem permissão para gerenciar a `organizationId` fornecida. Isso pode ser feito consultando uma tabela de `user_roles` ou `organization_memberships`.
    3. **Mensagens de Erro Genéricas:** Substituir mensagens de erro detalhadas por mensagens genéricas e amigáveis ao usuário para evitar a exposição de informações sensíveis. Registrar os erros detalhados apenas nos logs do servidor.
    4. **Auditoria e Logging:** Implementar logging robusto para todas as tentativas de associação de equipes, incluindo sucesso e falha, com detalhes sobre o usuário, `teamCode` e `organizationId`.

## 3. Performance e Otimização
- **Métricas Atuais (se aplicável):** Não há métricas de performance explícitas no código.
- **Otimizações Identificadas:**
    - A função realiza múltiplas operações de banco de dados (select, update, insert). Embora sejam sequenciais e dependentes, cada uma adiciona latência.
    - O uso de `maybeSingle()` para buscar a equipe é eficiente para garantir um único resultado.
- **Recomendações de Melhoria de Performance:**
    1. **Transações de Banco de Dados:** Para garantir atomicidade e potencialmente melhorar a performance em cenários de alta concorrência, considerar agrupar as operações de `update` e `insert` em uma única transação de banco de dados (se o Supabase/PostgreSQL suportar transações em Server Actions de forma eficiente). Isso também garantiria que, se uma parte falhar, todas as alterações sejam revertidas.
    2. **Otimização de Consultas:** Garantir que os índices apropriados existam nas colunas `team_code`, `id` (para `teams`), `organization_id`, `team_id` (para `organization_teams`), e `user_id` (para `user_organizations`) para otimizar as operações de busca e inserção.
    3. **Cache (se aplicável):** Para dados de equipe que não mudam frequentemente, considerar estratégias de cache para evitar buscas repetidas no banco de dados, embora para uma operação de escrita como esta, o cache pode não ser o principal gargalo.

## 4. Plano de Melhoria
- **Prioridade Alta:**
    - Implementar autorização granular para garantir que apenas usuários autorizados possam associar equipes a organizações específicas.
    - Substituir mensagens de erro detalhadas por mensagens genéricas para o usuário final.
- **Prioridade Média:**
    - Avaliar e, se possível, restringir o uso da `SUPABASE_SERVICE_ROLE_KEY` apenas para operações estritamente necessárias, ou encapsulá-la em uma camada de serviço mais segura.
    - Adicionar logging detalhado para todas as operações de associação de equipes.
- **Prioridade Baixa:**
    - Investigar a possibilidade de usar transações de banco de dados para as operações de escrita.
    - Confirmar a existência de índices de banco de dados apropriados para as consultas.
│   │   │   ├── add-status-field\
│   │   │   │   └── route.ts
│   │   │   ├── cleanup-scanners\
│   │   │   │   └── route.ts
│   │   │   ├── db-setup\
│   │   │   │   ├── route.ts
│   │   │   │   └── simple-alter\
│   │   │   ├── run-migrations\
│   │   │   │   └── route.ts
│   │   │   ├── update-status\
│   │   │   │   └── route.ts
│   │   │   └── wallet\
│   │   │       ├── create-tables\
│   │   │       └── schema.ts
│   │   ├── client-auth\
│   │   │   ├── check-phone\
│   │   │   │   └── route.ts
│   │   │   ├── debug-env\
│   │   │   │   └── route.ts
│   │   │   ├── direct-login\
│   │   │   │   └── route.ts
│   │   │   ├── guests\
│   │   │   │   ├── check-existing\
│   │   │   │   └── create\
│   │   │   ├── login\
│   │   │   │   └── route.ts
│   │   │   ├── logout\
│   │   │   │   └── route.ts
│   │   │   ├── register\
│   │   │   │   └── route.ts
│   │   │   ├── test-connection\
│   │   │   │   └── route.ts
│   │   │   └── user-events\
│   │   │       └── route.ts
│   │   ├── client-auth-v2\
│   │   │   ├── check-phone\\
│   │   │   │   └── route.ts
│   │   │   ├── direct-login\
│   │   │   │   └── route.ts
│   │   │   └── login\
│   │   │       └── route.ts
│   │   ├── client-auth-v3\
│   │   │   ├── check-phone\
│   │   │   ├── guest-request\
│   │   │   ├── guests\
│   │   │   │   ├── create-instant\
│   │   │   │   └── status\
│   │   │   ├── metrics\
│   │   │   │   └── route.ts
│   │   │   ├── register\
│   │   │   └── verify-code\
│   │   ├── cliente\
│   │   │   ├── auth\
│   │   │   │   ├── check\
│   │   │   │   ├── login\
│   │   │   │   └── logout\
│   │   │   └── events\\
│   │   │       └── route.ts
│   │   ├── cliente-isolado\
│   │   │   ├── auth\
│   │   │   │   ├── check\
│   │   │   │   ├── check-phone\
│   │   │   │   ├── login\
│   │   │   │   ├── logout\
│   │   │   │   └── register\
│   │   │   ├── events\
│   │   │   │   └── route.ts
│   │   │   └── user\
│   │   │       └── route.ts
│   │   ├── cron\
│   │   │   ├── cleanup-scanners\
│   │   │   │   └── route.ts
│   │   │   └── update-event-status.ts
│   │   ├── db-policies-fix\
│   │   ├── db-schema\
│   │   │   └── route.ts
│   │   ├── debug\
│   │   │   ├── guests\
│   │   │   │   └── route.ts
│   │   │   ├── guests-count\
│   │   │   │   └── route.ts
│   │   │   └── scanner-guest\
│   │   │       └── route.ts
│   │   ├── events\
│   │   │   └── duplicate\
│   │   ├── guest-count\
│   │   │   └── route.ts
│   │   ├── guest-counts\
│   │   │   └── route.ts
│   │   ├── guests\
│   │   │   ├── check\
│   │   │   │   └── route.ts
│   │   │   ├── create\
│   │   │   │   └── route.ts
│   │   │   ├── create-from-client\
│   │   │   │   └── route.ts
│   │   │   ├── get-or-create\
│   │   │   │   └── route.ts
│   │   │   └── route.ts
│   │   ├── health\
│   │   │   ├── system-status\
│   │   │   │   └── route.ts
│   │   │   └── route.ts
│   │   ├── login-cliente\
│   │   │   ├── check-phone\
│   │   │   │   └── route.ts
│   │   │   ├── guests\
│   │   │   │   └── create\
│   │   │   ├── login\
│   │   │   │   └── route.ts
│   │   │   ├── organizador\
│   │   │   │   └── guests\
│   │   │   └── register\\
│   │   │       └── route.ts
│   │   ├── metrics\
│   │   │   └── route.ts
│   │   ├── migrations\
│   │   │   └── apply\
│   │   │       └── route.ts
│   │   ├── organizador\
│   │   │   └── guests\
│   │   │       └── create\
│   │   │   └── route.ts
│   │   ├── organizations\
│   │   │   └── route.ts
│   │   ├── postal-code\
│   │   │   └── validate\
│   │   │       └── route.ts
│   │   ├── promo-v2\
│   │   │   ├── check-phone\
│   │   │   │   └── route.ts
│   │   │   ├── guests\
│   │   │   │   └── ...
│   │   │   ├── register\
│   │   │   │   └── ...
│   │   │   ├── resend-code\
│   │   │   │   └── ...
│   │   │   └── verify-code\
│   │   │       └── ...
│   │   ├── reset-cookies\
│   │   │   └── ...
│   │   ├── scanners\
│   │   │   └── ...
│   │   ├── send-welcome-email\
│   │   │   └── ...
│   │   ├── teams\
│   │   │   └── ...
│   │   ├── user\
│   │   │   └── ...
│   │   └── user-auth\
│   │       └── ...
│   ├── app\
│   │   └── ...
│   ├── auth\
│   │   └── ...
│   ├── client\
│   │   └── ...
│   ├── cliente\
│   │   └── ...
│   ├── cliente-isolado\
│   │   └── ...
│   ├── components\
│   │   └── ...
│   ├── contexts\
│   │   └── ...
│   ├── debug-login\
│   │   └── ...
│   ├── e\
│   │   └── ...
│   ├── error.tsx
│   ├── evento\
│   │   └── ...
│   ├── g\
│   │   └── ...
│   ├── globals.css
│   ├── guest-list\
│   │   └── ...
│   ├── layout.tsx
│   ├── lib\
│   │   └── ...
│   ├── loading.tsx
│   ├── login\
│   │   └── ...
│   ├── not-found.tsx
│   ├── organizacao\
│   │   └── ...
│   ├── organizador\
│   │   └── ...
│   ├── page.tsx
│   ├── profile\
│   │   └── ...
│   ├── promo\
│   │   └── ...
│   ├── promo-backup\
│   │   └── ...
│   ├── promo2-backup\
│   │   └── ...
│   ├── promogit\
│   │   └── ...
│   ├── promotor\
│   │   └── ...
│   ├── public\
│   │   └── ...
│   ├── register\
│   │   └── ...
│   ├── registro\
│   │   └── ...
│   ├── scanner\
│   │   └── ...
│   ├── testepage\
│   │   └── ...
│   ├── testpromo\
│   │   └── ...
│   ├── types.d.ts
│   └── user\
│       └── ...
├── apresentacao.md
├── backup_estado_atual\
│   └── ...
├── changelog_organizador_equipes_page.md
├── commit.bat
├── commit.ps1
├── commit_msg.txt
├── components.json
├── components\
│   └── ...
├── contexts\
│   └── ...
├── cordashboard.md
├── criarguestresolvido.md
├── debug_guests.js
├── function_calls
├── git_commit.cmd
├── guestmobile.md
├── hooks\
│   └── ...
├── lib\
│   └── ...
├── mcp-server\
│   └── ...
├── melhorias_promo.md
├── middleware.ts
├── migrations\
│   └── ...
├── miguel.md
├── miguelnovo.md
├── miguelnovo2.md
├── next.config.js
├── package-lock.json
├── package.json
├── porresolver.md
├── postcss.config.mjs
├── processo15-07-2025.md
├── promo.md
├── promogit\
│   └── ...
├── public\
│   └── ...
├── resolucao1.md
├── resolucaologin.md
├── resolução2025.md
├── resolve1.md
├── resumex.md
├── resumo.md
├── scanner1.md
├── scanner_plan.md
├── scripts\
│   └── ...
├── snap\
│   └── ...
├── snpifypromo.md
├── sql_columns.sql
├── sql_tables.sql
├── styles\
│   └── ...
├── supabase\
│   └── ...
├── tailwind.config.ts
├── test-login.json
├── teste1.md
├── tests-examples\
│   └── ...
├── todo.md
├── tree.md
├── tsconfig.json
├── types\
│   └── ...
├── vercel.json
└── verificar_usuarios.sql
```

## Análise de Arquivos

### app/api/admin/add-column/route.ts - PENDENTE
### app/api/admin/add-status-field/route.ts - PENDENTE
### app/api/admin/cleanup-scanners/route.ts - PENDENTE
### app/api/admin/db-setup/route.ts - PENDENTE
### app/api/admin/db-setup/simple-alter/route.ts - PENDENTE
### app/api/admin/run-migrations/route.ts - PENDENTE
### app/api/admin/update-status/route.ts - PENDENTE
### app/api/admin/wallet/create-tables/route.ts - PENDENTE
### app/api/admin/wallet/schema.ts - PENDENTE

### 📋 ANÁLISE: auth.ts
**📍 Localização:** `/c:/Users/Dalia/Desktop/game/snap/app/actions/auth.ts`
**📊 Tamanho:** 2.0 KB | **📅 Última Modificação:** 2024-07-30 (Estimado)
**🎯 Função:** Contém ações de servidor para autenticação de usuários, incluindo verificação de sessão e logout, interagindo com o Supabase.
**🔗 Dependências:** `next/headers`, `@/lib/supabase/server`
**📱 Usado por:** Componentes ou páginas que precisam verificar o estado de autenticação do usuário ou realizar logout.

### 🔐 AUDITORIA DE SEGURANÇA
**🚨 Vulnerabilidades Identificadas:**
- [BAIXA] Exposição de Erros Detalhados: As mensagens de erro (`error.message`) são retornadas diretamente, o que pode expor detalhes internos do sistema em caso de falha na comunicação com o Supabase ou na busca de dados do usuário.
- [BAIXA] Dependência de `client_users`: A lógica de autenticação depende da existência e integridade da tabela `client_users`. Se essa tabela for comprometida ou mal configurada, a autenticação pode falhar ou ser bypassada.

**🛡️ Validações de Input:**
- Campos validados: N/A (funções de servidor sem input direto do usuário)
- Campos não validados: N/A
- Sanitização: N/A

**🔑 Autenticação/Autorização:**
- Controle de acesso: Gerenciado pelo Supabase Auth.
- Verificação de roles: Não há verificação explícita de roles. Busca dados do usuário na tabela `client_users`.
- Tokens/Sessions: Utiliza o sistema de sessão do Supabase (JWT via cookies).

**📊 Exposição de Dados:**
- Dados sensíveis expostos: `id`, `first_name`, `last_name`, `phone`, `email` (retornados apenas para o usuário autenticado).
- Logs inseguros: `console.error` usado para logar erros (deve ser monitorado em produção).
- Informações vazadas: Potencialmente, mensagens de erro detalhadas.

### ⚡ AUDITORIA DE PERFORMANCE
**🚀 Métricas Atuais:**
- Bundle size: N/A
- Render time: N/A
- Hydration time: N/A
- Memory usage: N/A

**📈 Otimizações Identificadas:**
- [BAIXA] Otimização de Query: A query para `client_users` é simples. Garantir que a coluna `id` em `client_users` seja indexada é crucial para performance.

**🔄 Renderização:**
- Server Component: SIM (ações de servidor)
- Client Component: N/A
- Re-renders excessivos: N/A

**💾 Caching:**
- Cache implementado: Não há caching explícito. Supabase gerencia o caching de sessões.
- Cache necessário: N/A
- Estratégia recomendada: N/A

### 💀 DETECÇÃO DE CÓDIGO MORTO
**❌ Código Não Utilizado:**
- Imports não usados: N/A
- Variáveis declaradas não usadas: N/A
- Funções não chamadas: N/A
- Props não utilizadas: N/A
- CSS classes não aplicadas: N/A

**🔄 Código Duplicado:**
- Lógica repetida: N/A
- Componentes similares: N/A
- Constantes duplicadas: N/A

**📦 Dependências Mortas:**
- Bibliotecas não utilizadas: N/A
- Versões conflituantes: N/A
- Polyfills desnecessários: N/A

### 🔧 PLANO DE MELHORIAS
**🎯 Prioridade CRÍTICA (0-7 dias):**
1. Nenhuma.

**⚡ Prioridade ALTA (1-4 semanas):**
1. Nenhuma.

**📈 Prioridade MÉDIA (1-3 meses):**
1. Tratamento de Erros: Implementar um tratamento de erros mais genérico para as respostas da API, evitando expor mensagens de erro detalhadas do Supabase diretamente ao cliente. - Impacto: ALTO - Esforço: 2 horas

**🔮 Prioridade BAIXA (3+ meses):**
1. Monitoramento de Logs: Assegurar que os logs de erro (`console.error`) sejam enviados para um sistema de monitoramento seguro em produção e que não contenham PII ou detalhes de infraestrutura. - Impacto: MÉDIO - Esforço: 1 hora
2. Indexação de `client_users.id`: Confirmar que a coluna `id` na tabela `client_users` está devidamente indexada no banco de dados para otimizar a busca de usuários. - Impacto: BAIXO - Esforço: 0.5 horas

---

### app/actions/auth.ts - CONCLUÍDO

### 📋 ANÁLISE: organizerActions.ts
**📍 Localização:** `/c:/Users/Dalia/Desktop/game/snap/app/actions/organizerActions.ts`
**📊 Tamanho:** 5.0 KB | **📅 Última Modificação:** 2024-07-30 (Estimado)
**🎯 Função:** Contém a ação de servidor `associateTeamAction` que associa uma equipe a uma organização. Envolve validação do código da equipe, busca de dados da equipe, atualização da tabela `teams` e inserção em `organization_teams` e `user_organizations`.
**🔗 Dependências:** `next/headers`, `@supabase/supabase-js`, `@/lib/supabase/server`
**📱 Usado por:** Componentes ou páginas que permitem aos organizadores associar equipes às suas organizações.

### 🔐 AUDITORIA DE SEGURANÇA
**🚨 Vulnerabilidades Identificadas:**
- [ALTA] Uso de `SUPABASE_SERVICE_ROLE_KEY` para Operações de Escrita: A função utiliza `SUPABASE_SERVICE_ROLE_KEY` para criar um cliente Supabase com privilégios de serviço (`supabaseAdmin`). Este cliente é então usado para operações de `UPDATE` na tabela `teams` e `INSERT` nas tabelas `organization_teams` e `user_organizations`. O uso desta chave de serviço em uma ação de servidor acessível por um usuário autenticado (mesmo que indiretamente) é uma vulnerabilidade crítica, pois bypassa completamente o Row Level Security (RLS) do Supabase. Se esta ação for explorada, um atacante poderia manipular dados de equipes e organizações sem as devidas permissões de RLS.
- [MÉDIA] Exposição de Erros Detalhados: As mensagens de erro (`findError`, `updateError`, `orgTeamInsertError`, `orgMemberInsertError`) são logadas no console do servidor e, em alguns casos, retornadas diretamente ao cliente. Isso pode expor detalhes internos do banco de dados ou da lógica de negócios, auxiliando um atacante em futuras tentativas de exploração.
- [BAIXA] Validação de Input: Embora haja uma validação de formato para `teamCode` (`/^TEAM-[A-Z0-9]{5}$/`), a validação de `organizationId` é apenas de presença. É crucial garantir que `organizationId` seja um UUID válido e que o usuário autenticado tenha permissão para associar equipes a essa `organizationId` específica.

**🛡️ Validações de Input:**
- Campos validados: `teamCode` (formato regex).
- Campos não validados: `organizationId` (apenas verificação de presença).
- Sanitização: Não há sanitização explícita além da validação de formato.

**🔑 Autenticação/Autorização:**
- Controle de acesso: A função `associateTeamAction` é uma ação de servidor e é protegida pela autenticação do usuário via `supabaseUserClient.auth.getUser()`. No entanto, a autorização para realizar a associação de equipes a uma organização específica não é explicitamente verificada para o usuário autenticado, apenas para o `organizationId` da equipe.
- Verificação de roles: Não há verificação explícita de roles para o usuário que invoca a ação.
- Tokens/Sessions: Utiliza o sistema de sessão do Supabase.

**📊 Exposição de Dados:**
- Dados sensíveis expostos: `teamData` (incluindo `id`, `name`, `organization_id`, `created_by` da equipe) é manipulado internamente. Mensagens de erro podem vazar detalhes do sistema.
- Logs inseguros: `console.error` e `console.warn` são usados para logar erros e avisos, o que é aceitável em ambiente de desenvolvimento, mas deve ser monitorado e gerenciado em produção para evitar vazamento de informações sensíveis.
- Informações vazadas: Potencialmente, mensagens de erro detalhadas do Supabase.

### ⚡ AUDITORIA DE PERFORMANCE
**🚀 Métricas Atuais:**
- Bundle size: N/A
- Render time: N/A
- Hydration time: N/A
- Memory usage: N/A

**📈 Otimizações Identificadas:**
- [MÉDIA] Múltiplas Operações de Banco de Dados: A função realiza várias operações de banco de dados sequenciais (buscar equipe, atualizar equipe, inserir em `organization_teams`, inserir em `user_organizations`). Embora necessárias, a performance pode ser impactada por latência de rede. Considerar a possibilidade de combinar essas operações em uma única função de banco de dados (e.g., um procedimento armazenado ou função Supabase) se a latência se tornar um problema significativo.

**🔄 Renderização:**
- Server Component: SIM (ações de servidor)
- Client Component: N/A
- Re-renders excessivos: N/A

**💾 Caching:**
- Cache implementado: Não há caching explícito.
- Cache necessário: N/A
- Estratégia recomendada: N/A

### 💀 DETECÇÃO DE CÓDIGO MORTO
**❌ Código Não Utilizado:**
- Imports não usados: N/A
- Variáveis declaradas não usadas: N/A
- Funções não chamadas: N/A
- Props não utilizadas: N/A
- CSS classes não aplicadas: N/A

**🔄 Código Duplicado:**
- Lógica repetida: A lógica de tratamento de erro para `orgTeamInsertError.code === '23505'` e `orgMemberInsertError.code === '23505'` é similar. Pode ser refatorada para uma função auxiliar.
- Componentes similares: N/A
- Constantes duplicadas: N/A

**📦 Dependências Mortas:**
- Bibliotecas não utilizadas: N/A
- Versões conflituantes: N/A
- Polyfills desnecessários: N/A

### 🔧 PLANO DE MELHORIAS
**🎯 Prioridade CRÍTICA (0-7 dias):**
1. **Remover `SUPABASE_SERVICE_ROLE_KEY` de Ações de Servidor Acessíveis ao Usuário:** Refatorar a lógica para que as operações de escrita que exigem privilégios elevados sejam realizadas por meio de funções de banco de dados (PostgreSQL Functions) no Supabase, que podem ser invocadas com RLS ativado, ou por um serviço de backend seguro que não exponha a chave de serviço diretamente. A ação de servidor deve apenas invocar essa função de banco de dados ou serviço, passando os parâmetros necessários. - Impacto: ALTÍSSIMO - Esforço: 8 horas

**⚡ Prioridade ALTA (1-4 semanas):**
1. **Autorização Granular:** Implementar verificações de autorização para garantir que o usuário autenticado tenha permissão para associar equipes à `organizationId` fornecida. Isso pode envolver verificar se o usuário é um administrador ou membro autorizado da organização. - Impacto: ALTO - Esforço: 4 horas
2. **Validação de `organizationId`:** Adicionar validação para garantir que `organizationId` seja um UUID válido e que corresponda a uma organização existente à qual o usuário tem acesso. - Impacto: ALTO - Esforço: 2 horas

**📈 Prioridade MÉDIA (1-3 meses):**
1. **Tratamento de Erros Genérico:** Implementar um tratamento de erros mais genérico para as respostas da API, evitando expor mensagens de erro detalhadas do Supabase diretamente ao cliente. - Impacto: ALTO - Esforço: 2 horas
2. **Refatorar Lógica de Erro de Duplicidade:** Criar uma função auxiliar para lidar com erros de código `23505` (duplicidade) para reduzir a duplicação de código. - Impacto: BAIXO - Esforço: 1 hora

**🔮 Prioridade BAIXA (3+ meses):**
1. **Monitoramento de Logs:** Assegurar que os logs de erro (`console.error` e `console.warn`) sejam enviados para um sistema de monitoramento seguro em produção e que não contenham PII ou detalhes de infraestrutura. - Impacto: MÉDIO - Esforço: 1 hora
2. **Otimização de Múltiplas Queries (Opcional):** Se a performance se tornar um gargalo, investigar a possibilidade de consolidar as operações de banco de dados em uma única função PostgreSQL para reduzir a latência. - Impacto: MÉDIO - Esforço: 4 horas

---

### app/actions/organizerActions.ts - CONCLUÍDO

### 📋 ANÁLISE: organizerSettingsActions.ts
**📍 Localização:** `/c:/Users/Dalia/Desktop/game/snap/app/actions/organizerSettingsActions.ts`
**📊 Tamanho:** 5.0 KB | **📅 Última Modificação:** 2024-07-30 (Estimado)
**🎯 Função:** Contém ações de servidor para gerenciar detalhes de negócios do organizador, incluindo `getOrganizerBusinessDetails` para buscar informações e `upsertOrganizerBusinessDetails` para inserir ou atualizar esses detalhes na tabela `organizer_business_details` do Supabase.
**🔗 Dependências:** `next/headers`, `@/lib/supabase-server`
**📱 Usado por:** Páginas ou componentes relacionados à configuração de detalhes de negócios do organizador.

### 🔐 AUDITORIA DE SEGURANÇA
**🚨 Vulnerabilidades Identificadas:**
- [MÉDIA] Exposição de Erros Detalhados: As mensagens de erro (`error.message`) são retornadas diretamente ao cliente em caso de falha na comunicação com o Supabase ou na manipulação de dados. Isso pode expor detalhes internos do sistema ou do banco de dados, auxiliando um atacante em futuras tentativas de exploração.
- [BAIXA] Validação de Input (Frontend-dependente): A nota no código menciona que a validação Zod é feita no frontend (`/app/organizador/configuracao/page.tsx`) e que, por simplicidade, os dados são assumidos como validados no backend. Em um ambiente de produção, a validação de todos os inputs no backend é crucial para prevenir ataques como injeção de SQL (embora o Supabase ORM ajude a mitigar isso), Cross-Site Scripting (XSS) ou manipulação de dados maliciosos, especialmente para campos como `iban` ou `iban_proof_url`.
- [BAIXA] Logging de Cookies: O logging de `allCookies` no console (`console.log(JSON.stringify(allCookies))`) pode, em ambientes de desenvolvimento ou se não for removido em produção, expor informações sensíveis contidas nos cookies, como tokens de sessão. Embora seja útil para depuração, deve ser tratado com cautela.

**🛡️ Validações de Input:**
- Campos validados: Não há validação explícita no backend para os dados recebidos em `upsertOrganizerBusinessDetails`. A validação é assumida como feita no frontend.
- Campos não validados: Todos os campos de `BusinessDetailsData` (`business_name`, `vat_number`, `admin_contact_email`, etc.) não são validados no backend.
- Sanitização: Não há sanitização explícita.

**🔑 Autenticação/Autorização:**
- Controle de acesso: Ambas as funções (`getOrganizerBusinessDetails` e `upsertOrganizerBusinessDetails`) dependem da autenticação do usuário via `supabase.auth.getUser()`. As operações de banco de dados são filtradas por `user.id`, o que sugere que o Row Level Security (RLS) do Supabase deve estar configurado para garantir que um usuário só possa acessar/modificar seus próprios detalhes de negócio.
- Verificação de roles: Não há verificação explícita de roles para o usuário que invoca a ação.
- Tokens/Sessions: Utiliza o sistema de sessão do Supabase (JWT via cookies).

**📊 Exposição de Dados:**
- Dados sensíveis expostos: Detalhes de negócios do organizador (`business_name`, `vat_number`, `iban`, etc.) são manipulados e retornados. A exposição é controlada pela autenticação e RLS.
- Logs inseguros: `console.error` e `console.log` são usados extensivamente para depuração, o que é aceitável em desenvolvimento, mas deve ser monitorado e gerenciado em produção para evitar vazamento de informações sensíveis.
- Informações vazadas: Potencialmente, mensagens de erro detalhadas e conteúdo de cookies em logs.

### ⚡ AUDITORIA DE PERFORMANCE
**🚀 Métricas Atuais:**
- Bundle size: N/A
- Render time: N/A
- Hydration time: N/A
- Memory usage: N/A

**📈 Otimizações Identificadas:**
- [BAIXA] Múltiplas Chamadas `createClient()`: Embora `createClient()` seja leve, chamá-lo em cada função pode ser ligeiramente menos eficiente do que passá-lo como argumento ou usar um contexto, se a arquitetura permitir. No entanto, para Server Actions, a abordagem atual é comum e geralmente otimizada pelo Next.js.

**🔄 Renderização:**
- Server Component: SIM (ações de servidor)
- Client Component: N/A
- Re-renders excessivos: N/A

**💾 Caching:**
- Cache implementado: Não há caching explícito. O Supabase gerencia o