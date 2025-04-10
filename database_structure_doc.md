# Documentação do Banco de Dados Supabase

Este documento serve como referência para a estrutura do banco de dados Supabase e para registrar todas as alterações feitas nos scripts SQL.

## Estrutura Atual do Banco de Dados

### Tabelas com RLS Ativado

Conforme análise feita em 08/06/2024, as seguintes tabelas têm RLS ativado:

```json
[
  { "table_name": "commission_payment_items", "rls_status": "RLS ativado" },
  { "table_name": "commission_payments", "rls_status": "RLS ativado" },
  { "table_name": "commissions", "rls_status": "RLS ativado" },
  { "table_name": "event_promoters", "rls_status": "RLS ativado" },
  { "table_name": "event_teams", "rls_status": "RLS ativado" },
  { "table_name": "events", "rls_status": "RLS ativado" },
  { "table_name": "guest_list_events", "rls_status": "RLS ativado" },
  { "table_name": "guests", "rls_status": "RLS ativado" },
  { "table_name": "organization_teams", "rls_status": "RLS ativado" },
  { "table_name": "organizations", "rls_status": "RLS ativado" },
  { "table_name": "payment_confirmations", "rls_status": "RLS ativado" },
  { "table_name": "profiles", "rls_status": "RLS ativado" },
  { "table_name": "team_members", "rls_status": "RLS ativado" },
  { "table_name": "teams", "rls_status": "RLS ativado" },
  { "table_name": "user_organizations", "rls_status": "RLS ativado" }
]
```

### Tabelas com RLS Desativado

```json
[
  { "table_name": "financial_transactions", "rls_status": "RLS desativado" },
  { "table_name": "organization_members", "rls_status": "RLS desativado" },
  { "table_name": "reports", "rls_status": "RLS desativado" }
]
```

### Função create_promoter_team_v2

```json
[
  {
    "function_name": "create_promoter_team_v2",
    "function_arguments": "user_id uuid, team_name text, team_description text DEFAULT NULL::text",
    "return_type": "jsonb"
  }
]
```

### Políticas RLS Anteriores

Antes da correção, havia várias políticas duplicadas e conflitantes:

#### Para tabela teams:
- Teams are viewable by all authenticated users (SELECT)
- Teams are viewable by authenticated users (SELECT)
- Teams can be created by authenticated users (INSERT)
- Teams can be inserted by authenticated users (INSERT)
- Teams can be updated by team creator (UPDATE)
- Teams can be updated by team leader (UPDATE)
- Teams can be deleted by team creator (DELETE)
- Teams can be deleted by team leader (DELETE)
- access_teams (ALL) para usuários públicos

#### Para tabela team_members:
- Team members are viewable by all authenticated users (SELECT)
- Team members are viewable by authenticated users (SELECT)
- Team members can be added by anyone (INSERT)
- Team members can be inserted by any authenticated user (INSERT)
- Team members can be updated by team leader (UPDATE)
- Team members can be deleted by team leader or self (DELETE)
- team_members_access_all (ALL) para usuários públicos

## Problemas Identificados

1. **Múltiplas políticas RLS redundantes e conflitantes**:
   - Políticas duplicadas para SELECT, INSERT, UPDATE e DELETE
   - Políticas com nomes diferentes mas mesma funcionalidade
   - Políticas muito permissivas com acesso ALL para usuários públicos

2. **Erros ao acessar informações do dashboard**:
   - Erro ao buscar membros da equipe
   - Erro ao buscar eventos

## Alterações Realizadas

### [Data: 08/06/2024]

1. **Criado script de análise completa**
   - Arquivo: `supabase_analyze_full.sql`
   - Objetivo: Analisar a estrutura completa do banco de dados

2. **Corrigidas políticas RLS redundantes**
   - Removidas todas as políticas existentes para as tabelas `teams` e `team_members`
   - Criadas políticas únicas e bem definidas:

#### Para tabela teams:
   - `teams_select_for_authenticated`: Permite que qualquer usuário autenticado veja equipes
   - `teams_insert_for_authenticated`: Permite que qualquer usuário autenticado crie equipes
   - `teams_update_for_creator`: Apenas o criador pode atualizar equipes
   - `teams_delete_for_creator`: Apenas o criador pode excluir equipes

#### Para tabela team_members:
   - `team_members_select_for_authenticated`: Permite que qualquer usuário autenticado veja membros
   - `team_members_insert_for_authenticated`: Permite que qualquer usuário autenticado adicione membros
   - `team_members_update_for_owner`: Apenas o criador da equipe pode atualizar membros
   - `team_members_delete_for_owner_or_self`: Usuário pode excluir a si mesmo ou criador pode excluir qualquer um

3. **Mantida a estrutura da função create_promoter_team_v2**
   - A função existente com os parâmetros `(user_id uuid, team_name text, team_description text)` foi mantida
   - Não foi necessário fazer alterações na função, pois não havia problema de duplicidade

### Resultados das Alterações

- Dashboard do chefe de equipe agora exibe corretamente os membros da equipe
- Corrigidos erros ao buscar dados da equipe e membros
- Removidas políticas potencialmente inseguras que permitiam acesso público

### [Próximas alterações serão registradas aqui] 