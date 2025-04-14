# Plano de Diagnóstico: Problema no Dashboard do Promotor (Teste Limpo)

Este documento detalha os passos para diagnosticar o problema de não exibição do nome da equipa no dashboard do promotor, começando com uma base de dados limpa.

**Objetivo:** Identificar a causa raiz da falha na obtenção e exibição dos detalhes da equipa para promotores cuja equipa não está associada a uma organização.

---

## Fase 1: Preparação (Execução: Utilizador)

1.  **Confirmar Limpeza de Utilizadores:**
    *   Aceder ao Supabase -> Authentication -> Users.
    *   **APAGAR** manualmente todas as contas de utilizador criadas para testes anteriores (Organizadores, Promotores). Manter apenas contas essenciais (ex: admin pessoal).
    *   **Resultado Esperado:** Base de utilizadores limpa, sem dados de testes anteriores.

---

## Fase 2: Criação do Cenário (Execução: Utilizador)

2.  **Criar Nova Conta Promotor:**
    *   Na aplicação, registar um novo utilizador para ser o Promotor de teste.
    *   **Anotar:** Email e Senha.
3.  **Criar Nova Conta Organizador (Opcional mas Recomendado):**
    *   Na aplicação, registar um novo utilizador para ser um Organizador de teste.
    *   **Anotar:** Email e Senha.
4.  **Login como Novo Promotor:**
    *   Fazer login na aplicação com as credenciais do **novo Promotor** criadas no passo 2.
5.  **Criar Nova Equipa (como Promotor):**
    *   Navegar para a funcionalidade "Criar Equipa" disponível para o promotor.
    *   Inserir um nome distinto (ex: "EquipaDiagnostico").
    *   Submeter o formulário de criação.
    *   **Anotar:** Nome exato da equipa criada.
    *   **Informar o Assistente quando este passo for concluído.**

---

## Fase 3: Verificação da Criação (Execução: Assistente e Utilizador)

*   **Após o Utilizador informar a conclusão do Passo 5:**
    *   **6. Obter User ID (Assistente):** Solicitar o email do novo Promotor ou o seu `user_id` (se visível para o Utilizador).
    *   **7. Verificar Metadados (Assistente):** Executar SQL (`SELECT raw_user_meta_data FROM auth.users WHERE id = ...`) para verificar os metadados do novo Promotor.
        *   *Analisar:* O `role` é `promotor` ou `chefe-equipe`? `team_id`, `team_name`, `team_role` foram definidos e estão corretos?
    *   **8. Verificar Tabela `teams` (Assistente):** Executar SQL (`SELECT * FROM public.teams WHERE name = 'EquipaDiagnostico'`) para verificar a nova entrada.
        *   *Analisar:* Nome correto? `organization_id` é `NULL`? `created_by` corresponde ao `user_id` do Promotor?
    *   **9. Verificar Tabela `team_members` (Assistente):** Executar SQL (`SELECT * FROM public.team_members WHERE user_id = ...`) para verificar a associação.
        *   *Analisar:* O `user_id` do Promotor está presente? O `team_id` corresponde à nova equipa? Qual o `role` ('member' ou 'leader')?
    *   **10. Verificar Logs Postgres (Utilizador):** Imediatamente após criar a equipa (Passo 5), verificar os logs do Postgres no Supabase (sem filtros).
        *   *Analisar:* A função `create_promoter_team_v2` gerou algum `RAISE NOTICE`? Partilhar logs relevantes, se existirem.

---

## Fase 4: Verificação da Leitura no Dashboard (Execução: Utilizador e Assistente)

*   **Após a Fase 3 indicar que a criação foi (aparentemente) bem-sucedida:**
    *   **11. Aceder ao Dashboard (Utilizador):** Navegar para `/app/promotor/dashboard` (logado como o **novo Promotor**).
    *   **12. Observar Dashboard (Utilizador):** O nome da nova equipa ("EquipaDiagnostico") é exibido corretamente na interface?
    *   **13. Verificar Consola Browser (Utilizador):** Abrir F12 -> Consola. Encontrar a linha `PromotorDashboard: RPC successful. Data received: {...}`.
        *   *Partilhar:* Qual o valor exato dentro de `team_details`? É `null` ou um objeto JSON com `id` e `name`? Copiar/colar a linha inteira.
    *   **14. Verificar Logs Postgres (Utilizador):** **IMEDIATAMENTE** após carregar o dashboard (Passo 11), verificar os logs do Postgres no Supabase (sem filtros!).
        *   *Analisar:* Apareceram logs da função `get_promoter_dashboard_data` com a tag `[SIMPLIFIED]`? Se sim, copiar/colar as primeiras linhas relevantes.

---

## Fase 5: Diagnóstico Final (Execução: Assistente)

15. **Análise Conjunta:** Com base nos resultados detalhados das Fases 3 e 4 (metadados, dados nas tabelas, logs da consola, logs do Postgres), determinar a causa raiz:
    *   **Falha na Criação:** Problema na função `create_promoter_team_v2` ou RLS de `INSERT`.
    *   **Falha na Leitura (RLS):** A função `get_promoter_dashboard_data` (simplificada) é executada (logs `[SIMPLIFIED]` aparecem), mas não encontra o nome devido à RLS em `teams`. Requer ajuste da política `SELECT` em `teams`.
    *   **Falha na Leitura (Execução/RPC):** A função `get_promoter_dashboard_data` não gera logs `[SIMPLIFIED]`, apesar da consola mostrar RPC successful. Indica problema na camada RPC/PostgREST ou configuração fundamental.
    *   **Falha no Logging:** Os logs não aparecem em nenhum cenário, impedindo o diagnóstico. Requer abordagem alternativa de debug.
16. **Próximos Passos:** Definir as ações corretivas com base no diagnóstico (corrigir função SQL, ajustar RLS, investigar PostgREST, etc.). 