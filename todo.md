# Explicação das Alterações nas Políticas de Segurança (RLS) e Impacto nos Dashboards

Este documento detalha as alterações realizadas nas políticas de Row-Level Security (RLS) das tabelas `organizations` e `teams` para resolver erros e inconsistências nos dashboards, especialmente nos do Organizador, Chefe de Equipa e Promotor.

**É CRUCIAL entender que modificar estas políticas pode quebrar o funcionamento destes dashboards.**

## Problema Inicial

Observámos vários problemas:

1.  **Erro 500 no Dashboard Promotor:** A função `get_promoter_dashboard_data` falhava com um erro (`record "org_details" is not assigned yet`) quando um promotor pertencia a uma equipa sem organização associada.
2.  **Erros 500 nos Dashboards Organizador/Chefe de Equipa:** Ocorriam erros 500 (Internal Server Error) ao tentar carregar dados das tabelas `organizations` e `teams` diretamente via API REST.
3.  **Dados Incorretos:** O dashboard do promotor mostrava o ID da equipa em vez do nome.
4.  **Suspeita de Recursão:** Logs do frontend indicavam potencial recursão infinita nas políticas RLS.
5.  **Políticas Confusas:** A análise revelou múltiplas políticas `SELECT` redundantes, potencialmente conflituosas e uma excessivamente permissiva (`USING (true)`) nas tabelas `organizations` e `teams`.

## Ações Realizadas

1.  **Correção da Função `get_promoter_dashboard_data`:**
    *   A função foi modificada para verificar explicitamente se `team_details.organization_id` era `NULL` antes de tentar buscar ou usar detalhes da organização.
    *   Introduzimos uma variável intermédia (`org_details_json`) para construir o JSON da organização apenas se os dados existissem, prevenindo o erro `record "org_details" is not assigned yet`.

2.  **Simplificação das Políticas RLS em `organizations`:**
    *   **Remoção:** Foram removidas (via `DROP POLICY`) todas as políticas `SELECT` redundantes e a política `USING (true)`.
    *   **Política Mantida:** Apenas a política `"Organizações são visíveis para usuários com acesso"` foi mantida ativa. A sua expressão `USING` é:
        ```sql
        EXISTS ( SELECT 1
           FROM public.user_organizations uo
          WHERE uo.organization_id = organizations.id AND uo.user_id = auth.uid() )
        ```
    *   **Impacto:** Isto garante que um utilizador autenticado só vê as organizações às quais está diretamente associado na tabela `user_organizations`. Esta ação resolveu os erros 500 ao aceder à tabela `organizations` no dashboard do organizador.

3.  **Simplificação das Políticas RLS em `teams`:**
    *   **Remoção:** Foram removidas (via `DROP POLICY`) as políticas `"Líder pode ver detalhes da sua equipa"` e `"Membros podem ver detalhes da sua própria equipa"`.
    *   **Política Mantida:** Apenas a política `"Membros podem ver equipas da sua organização"` foi mantida ativa. A sua expressão `USING` é:
        ```sql
        EXISTS ( SELECT 1
           FROM public.organization_members om
          WHERE om.organization_id = teams.organization_id AND om.user_id = auth.uid() )
        ```
    *   **Impacto:** Isto permite a um utilizador ver as equipas que pertencem a organizações das quais ele é membro (via `organization_members`). Esta ação resolveu os erros que surgiram no dashboard do organizador ao tentar carregar as equipas.

## Estado Atual e Avisos

*   Atualmente, a visibilidade das tabelas `organizations` e `teams` está controlada por UMA única política `SELECT` em cada uma, focada na relação do utilizador com a organização (`user_organizations` e `organization_members`).
*   **Qualquer alteração ou adição de novas políticas RLS nestas tabelas, especialmente nas políticas `SELECT` atualmente ativas, terá impacto direto naquilo que os dashboards do Organizador e Chefe de Equipa conseguem mostrar.** Alterações descuidadas podem reintroduzir erros 500 ou fazer com que os dashboards mostrem dados incorretos ou nenhuma informação.
*   **Refinamentos Futuros:** Pode ser necessário reintroduzir (com cuidado) a política `"Membros podem ver detalhes da sua própria equipa"` na tabela `teams` se verificarmos que os dashboards do Promotor ou Chefe de Equipa precisam dessa permissão específica para mostrar corretamente os detalhes da *sua* equipa (e não apenas as equipas da organização).

**Conclusão:** A simplificação drástica das RLS foi necessária para estabilizar os dashboards. Procede com extrema cautela ao modificar estas regras de segurança. 