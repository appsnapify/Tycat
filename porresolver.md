# Problema Pendente: Inconsistência do Campo `role`

## Descrição do Problema

Foi identificado que o campo `role` (papel do utilizador, ex: organizador, chefe-equipe, promotor) está armazenado em dois locais distintos na base de dados:

1.  **`auth.users` (coluna `raw_user_meta_data`):** Usado primariamente para autenticação e lógica inicial no frontend (via `useAuth`).
2.  **`public.profiles` (coluna `role`):** Usado para informações adicionais do perfil e possivelmente noutras lógicas da aplicação.

Estas duas fontes de informação ficaram dessincronizadas. Especificamente, a lógica na função `checkIfTeamLeader` (em `hooks/use-auth.tsx`) atualizava o `role` nos metadados de `auth.users` para `chefe-equipe` se um utilizador criasse uma equipa, mas não atualizava a tabela `public.profiles`. Isto causou um bug onde um utilizador `organizador` passou a ser tratado como `chefe-equipe` no login, apesar de `public.profiles` ainda o listar como `organizador`.

## Risco

Manter a mesma informação em dois locais sem sincronização automática cria um risco contínuo de inconsistências. Qualquer modificação futura no `role` que atualize apenas uma das tabelas recriará problemas semelhantes.

## Soluções Propostas

### Opção 1: Definir uma ÚNICA Fonte da Verdade (Recomendado)

Decidir qual tabela será a autoridade única para o `role`.

*   **1.A: Usar `public.profiles.role` como Fonte (Preferencial):**
    *   **Ação:**
        1.  Manter `public.profiles.role` como a coluna oficial.
        2.  Remover a chave `role` dos `raw_user_meta_data` em `auth.users`.
        3.  Modificar `useAuth` para, após obter o `user.id`, fazer uma query a `public.profiles` para buscar o `role` oficial e adicioná-lo ao estado do utilizador no frontend.
    *   **Prós:** Arquitetura limpa, separação de responsabilidades (autenticação vs. perfil), elimina redundância.
    *   **Contras:** Requer modificar `useAuth` (adicionar query), remover chave dos metadados, ajustar código que dependia do `role` vindo direto da autenticação.

*   **1.B: Usar `auth.users.raw_user_meta_data.role` como Fonte:**
    *   **Ação:**
        1.  Manter `role` nos metadados de `auth.users` como oficial.
        2.  Remover a coluna `role` de `public.profiles`.
        3.  Modificar todo o código que lia `role` de `public.profiles` para usar `user.user_metadata.role` (via `useAuth`).
    *   **Prós:** `Role` disponível imediatamente após autenticação.
    *   **Contras:** Mantém dados não essenciais na autenticação, requer remover coluna de `profiles`, potencialmente muitas alterações no código.

### Opção 2: Sincronização Automática via Triggers (Mais Complexo)

*   **Ação:** Manter o `role` em ambos os locais, mas criar triggers na base de dados PostgreSQL que atualizem automaticamente uma tabela quando a outra for alterada.
*   **Prós:** A aplicação não precisa de se preocupar com a sincronização.
*   **Contras:** Adiciona complexidade significativa à base de dados, triggers são mais difíceis de manter e depurar, potenciais problemas de performance ou permissões.

## Recomendação Atual

A **Opção 1.A** (`public.profiles.role` como fonte única) é a abordagem mais robusta e recomendada para garantir consistência a longo prazo.

## Estado Atual (Após Correções Imediatas)

1.  O código em `hooks/use-auth.tsx` foi modificado para **não** atualizar mais o `role` em `auth.users` automaticamente, **exceto** quando um `promotor` cria uma equipa (promovendo-o a `chefe-equipe`). Organizadores e outros roles não terão seus `role` em `auth.users` alterados por esta lógica.
2.  Foi necessário corrigir **manualmente** o `role` do utilizador `organizador@gmail.com` nos metadados de `auth.users` de volta para `organizador`.

Embora o problema imediato esteja resolvido com estas correções, a implementação de uma das soluções definitivas acima (preferencialmente a 1.A) é recomendada para prevenir futuros problemas de inconsistência. 