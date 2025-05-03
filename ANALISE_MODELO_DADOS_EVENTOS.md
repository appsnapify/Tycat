# Análise do Modelo de Dados: Eventos, Equipes e Organizações

## 1. Introdução

Este documento detalha a análise realizada sobre o modelo de dados relacionando eventos, equipes, promotores e organizações na plataforma. A análise foi motivada por uma aparente discrepância entre os dados exibidos na interface do usuário (dashboards do chefe de equipe e promotor) e os dados brutos encontrados em algumas tabelas do banco de dados, especificamente a `event_teams`. O objetivo é documentar a inconsistência, a correção aplicada e propor melhorias para garantir a integridade e clareza do modelo.

## 2. Modelo de Dados Atual (Tabelas Relevantes)

*   **`organizations`**: Armazena informações sobre as organizações (empresas, locais) que criam eventos. Contém `id`, `name`, `slug`, etc.
*   **`teams`**: Representa equipes dentro de uma organização. Contém `id`, `name`, `organization_id` (ligação à organização proprietária), `team_code`.
*   **`auth.users`**: Tabela de autenticação do Supabase, contém `id` (UUID do usuário), `email`, `raw_user_meta_data` (pode conter `role`, `team_id`, etc.).
*   **`profiles`**: Perfil público/interno dos usuários. Contém `id` (geralmente FK para `auth.users.id`), `first_name`, `last_name`, `role`.
*   **`team_members`**: Tabela de ligação entre `teams` e `profiles` (ou `auth.users`), definindo quem pertence a qual equipe e com qual `role` (ex: 'chefe', 'member'). Contém `id`, `team_id`, `user_id`, `role`.
*   **`events`**: Detalhes dos eventos. Contém `id`, `organization_id` (a organização que criou/possui o evento), `title`, `date`, `location`, `is_published`, `is_active`, etc.
*   **`event_promoters`**: Associa um promotor (`promoter_id`, FK para `profiles.id` ou `auth.users.id`) e sua equipe (`team_id`, FK para `teams.id`) a um evento específico (`event_id`, FK para `events.id`). Contém também `promoter_code`, `promoter_link`. Essencial para rastrear a atividade de promoção individual.
*   **`event_teams`**: Tabela de ligação que associa diretamente uma equipe (`team_id`) a um evento (`event_id`).

**Relações Principais:**
*   Um `user` (`auth.users`) tem um `profile`.
*   Um `user` pode ser membro de uma `team` através de `team_members`.
*   Uma `team` pertence a uma `organization`.
*   Um `event` pertence a uma `organization`.
*   Um `user` (promotor) de uma `team` pode ser associado a um `event` via `event_promoters`.
*   Uma `team` pode ser associada a um `event` via `event_teams`.

## 3. Inconsistência Detectada

Durante a análise, foi identificado um registro específico na tabela `event_teams` que contradizia a lógica implícita observada na interface do usuário:

*   **Evento:** "asdasd" (`id: 87c6854b-f113-43cf-b661-aa122cf47bbb`)
    *   Pertence à **Organização:** "Teste Organização" (`id: c20782f5-a8d6-41f8-a743-ae59421871c4`)
*   **Equipe Associada (via `event_teams`):** "Oggy" (`id: 71d0497d-9401-456d-9f99-0b52fa07f8df`)
    *   Pertence à **Organização:** "Instant" (`id: bfb98baf-64a0-45a7-8ad6-4ba5cb54eb02`)

Esta associação direta em `event_teams` ligava um evento de uma organização a uma equipe de outra organização. No entanto, os dashboards (como o do Chefe da Equipe "Oggy") exibiam corretamente apenas os eventos pertencentes à organização da equipe ("Instant"), sugerindo que a interface aplicava uma lógica de filtro que ignorava esta entrada inconsistente ou que a própria entrada era um erro.

A tabela `event_promoters` também continha uma entrada associando o promotor "Carlos Silva" (`user_id: 75608297-a569-4b63-9e67-93a4e83752f3`) da equipe "Oggy" a este mesmo evento "asdasd". Isso reforçava a ligação do evento à equipe, mas mantinha a inconsistência organizacional.

## 4. Correção Realizada

Para alinhar os dados brutos com o comportamento observado e esperado da aplicação, a entrada inconsistente na tabela `event_teams` foi removida:

```sql
DELETE FROM event_teams 
WHERE event_id = '87c6854b-f113-43cf-b661-aa122cf47bbb' 
AND team_id = '71d0497d-9401-456d-9f99-0b52fa07f8df';
```

**Nota:** A entrada correspondente em `event_promoters` *não* foi removida automaticamente, pois representa a atividade de um promotor específico. A questão sobre se um promotor da equipe "Oggy" (Organização "Instant") *deveria* poder promover um evento da "Teste Organização" permanece e depende da definição do modelo de negócio (ver Recomendações). Se não for permitido, essa entrada em `event_promoters` também deveria ser removida ou corrigida.

## 5. Análise da Necessidade da Tabela `event_teams`

A existência da tabela `event_teams` levanta questões sobre sua necessidade e propósito no modelo de dados atual.

*   **Redundância Potencial:** Se a regra de negócio principal for que uma equipe (`team_id`) só pode estar envolvida com eventos da sua própria organização (`organization_id`), e a associação principal ocorre quando um promotor (`promoter_id`) dessa equipe é ligado ao evento via `event_promoters`, então a tabela `event_teams` pode ser redundante. A lista de equipes associadas a um evento poderia ser derivada consultando `DISTINCT team_id` da tabela `event_promoters` para aquele `event_id`.
*   **Casos de Uso Específicos para `event_teams`:**
    1.  **Associação Prévia:** Permitir que um administrador associe uma equipe a um evento antes mesmo de qualquer promotor individual ser designado.
    2.  **Modelo de Parceria:** Permitir explicitamente que uma equipe da Organização A seja contratada/associada para trabalhar em um evento da Organização B. Neste caso, `event_teams` seria crucial para registrar essa relação específica, distinta da organização proprietária do evento. A inconsistência encontrada seria, neste cenário, apenas um erro de dados, mas a tabela em si seria válida.
    3.  **Permissões/Visibilidade:** Usar a associação em `event_teams` para controlar o acesso ou visibilidade de eventos para equipes inteiras.

**Avaliação:** A inconsistência corrigida sugere que o cenário 2 (Modelo de Parceria) não está sendo aplicado consistentemente ou não é a intenção principal, OU que houve simplesmente um erro na inserção de dados. Se o cenário 1 ou 3 for relevante, a tabela `event_teams` tem valor. Se nenhum destes for um requisito e o Modelo de Parceria não for desejado, a tabela pode estar apenas adicionando complexidade e potencial para inconsistências.

## Resumo da Investigação e Lógica da Aplicação

Esta secção resume o processo de investigação que levou à clarificação da lógica de apresentação de dados nos dashboards e listas de eventos, contrastando com a análise inicial baseada apenas nas relações diretas das tabelas.

1.  **Confusão Inicial:** A análise começou devido a uma discrepância entre o que era exibido na UI (ex: Dashboard do Chefe de Equipa mostrando 1 evento ativo para a Organização "Instant") e os dados brutos, que continham inconsistências. Especificamente, a tabela `event_teams` e `event_promoters` ligavam a equipa "Oggy" (da Org. "Instant") a um evento da "Teste Organização".
2.  **Análise do Código da Aplicação:** Para resolver a discrepância, analisamos o código-fonte das páginas relevantes:
    *   `app/app/chefe-equipe/dashboard/page.tsx`: Descobrimos que este dashboard não consulta diretamente `events` ou `event_teams`/`event_promoters` para obter o resumo. Em vez disso, chama a função RPC `get_team_leader_dashboard_data` no Supabase, passando o ID da equipa.
    *   `app/app/chefe-equipe/eventos/page.tsx`: Esta página busca *todos* os eventos publicados da organização (passada via URL) diretamente da tabela `events`, sem filtrar pela equipa específica do chefe. A classificação ativo/passado é feita no frontend.
    *   `app/app/promotor/eventos/page.tsx`: Similar à página de eventos do chefe, esta busca *todos* os eventos publicados da organização selecionada diretamente da tabela `events`.
3.  **Análise da Função RPC (`get_team_leader_dashboard_data`):** O código SQL desta função revelou que ela calcula a contagem de `active_event_count` buscando eventos da organização da equipa (`e.organization_id = t.organization_id`) cuja data (`e.date`) é maior ou igual à data atual. **Importante:** A função *não* verifica se a equipa está associada a esses eventos via `event_teams` ou `event_promoters`.
4.  **Lógica do Dashboard do Promotor:** A análise sugere que a página de eventos do promotor (`eventos/page.tsx`) busca todos os eventos da organização e, para cada evento, o componente `EventCardPromotor` (código não analisado em detalhe) verifica na tabela `event_promoters` se o promotor logado está associado *àquele evento específico* para então mostrar os links/ferramentas promocionais.
5.  **Conclusão sobre `event_teams`:** A análise do código das páginas principais e da RPC indica que a tabela `event_teams` **não é utilizada** na lógica de apresentação de dados investigada. Sua presença com dados inconsistentes foi a fonte primária da confusão.
6.  **Ação de Mitigação:** Como teste seguro, a tabela `event_teams` foi renomeada para `event_teams_deprecated` usando `ALTER TABLE`. Se a aplicação continuar a funcionar sem erros, isso reforça a conclusão de que a tabela não é essencial e pode ser removida posteriormente.

**Conclusão da Lógica:** A aplicação depende de uma combinação de:
a) Funções RPC no backend (`get_team_leader_dashboard_data`) para fornecer resumos calculados.
b) Consultas diretas à tabela `events` nas páginas de lista, filtrando apenas por organização e publicação.
c) Lógica no frontend (componentes como `EventCardPromotor` e classificação de datas) para exibir informações específicas do contexto (links do promotor, status ativo/passado).
A tabela `event_teams` parece estar fora desta lógica principal.

## 6. Recomendações e Melhorias Futuras

1.  **Clarificar Modelo de Negócio:**
    *   **Decisão Crítica:** Definir formalmente se equipes de uma organização podem ou não promover/ser associadas a eventos de outra organização.
    *   Documentar esta decisão para guiar o desenvolvimento futuro e a manutenção.

2.  **Implementar Validação no Backend:**
    *   **Se Parcerias NÃO Permitidas:** Adicionar `constraints` ou lógica na API para garantir que, ao inserir/atualizar em `event_teams` e `event_promoters`, a `organization_id` derivada da `team_id` seja a mesma que a `organization_id` do `event_id`.
    *   **Se Parcerias PERMITIDAS:** Garantir que a interface do usuário e a lógica de negócios reflitam claramente essa possibilidade e que os dados sejam inseridos corretamente, evitando erros como o que foi corrigido. A validação ainda seria útil para garantir que as IDs existam.

3.  **Auditoria Completa de Dados:**
    *   Executar consultas para encontrar outras possíveis inconsistências em `event_teams` e `event_promoters` (ex: eventos associados a equipes de organizações diferentes, promotores associados a eventos onde sua equipe não está listada em `event_teams`, se esta for mantida e considerada a fonte primária de associação de equipe).
    *   Corrigir quaisquer outras inconsistências encontradas.

4.  **Avaliar Simplificação do Modelo:**
    *   Com base na decisão do Modelo de Negócio (ponto 1), reavaliar a necessidade da tabela `event_teams`.
    *   Se for considerada redundante, planejar um processo de migração para removê-la:
        *   Identificar todas as consultas que a utilizam.
        *   Refatorar essas consultas para derivar a informação de `event_promoters` ou outras tabelas, se aplicável.
        *   Remover a tabela `event_teams`.

5.  **Revisar Dados em `event_promoters`:**
    *   Verificar a entrada restante para o promotor "Carlos Silva" (`user_id: 75608297-a569-4b63-9e67-93a4e83752f3`) e o evento "asdasd" (`event_id: 87c6854b-f113-43cf-b661-aa122cf47bbb`). Se parcerias não são permitidas, esta entrada também é inválida e deve ser corrigida/removida.

6.  **Documentação do Esquema:**
    *   Manter a documentação do esquema do banco de dados atualizada, explicando claramente o propósito de cada tabela e as regras de negócio que governam suas relações.

Ao abordar estas recomendações, a plataforma terá um modelo de dados mais robusto, consistente e fácil de manter, alinhado com as regras de negócio definidas. 