# Changelog para app/app/organizador/equipes/page.tsx (Proposto)

Este ficheiro documenta as alterações propostas para melhorar a limpeza e robustez da página de equipas do organizador.

1.  **Remoção de Import Não Utilizado:**
    *   Remover a linha: `import { v4 as uuidv4 } from 'uuid'`
    *   **Justificação:** A biblioteca `uuidv4` foi importada mas não está a ser utilizada no código, tornando-a código morto. A remoção limpa o ficheiro sem impacto funcional.

2.  **Ajuste na Lógica de Busca da Organização (`loadOrganizationAndTeams`):**
    *   Modificar a query à tabela `user_organizations`.
    *   **De:**
        ```javascript
        const { data: orgData, error: orgError } = await supabase
          .from('user_organizations')
          .select('organization_id')
          .eq('user_id', user?.id)
          .eq('role', 'owner')
          .single();
        // ... tratamento de orgData e orgError
        ```
    *   **Para:**
        ```javascript
        const { data: orgDataArray, error: orgError } = await supabase
          .from('user_organizations')
          .select('organization_id')
          .eq('user_id', user?.id)
          .in('role', ['owner', 'organizador']) // Aceita ambos os roles
          .limit(1); // Garante no máximo um resultado
        
        // ... log detalhado do orgError
        
        if (!orgDataArray || orgDataArray.length === 0) {
          // ... código para quando não encontra organização
          return;
        }
        const orgData = orgDataArray[0]; // Pega o primeiro resultado
        const organizationId = orgData.organization_id;
        // ... resto da função
        ```
    *   **Justificação:** Torna a busca mais robusta, alinhando-a com a correção feita no dashboard principal. Evita erros se o `role` for `'organizador'` ou se a query acidentalmente retornar múltiplas linhas (o `.single()` original falharia). Melhora a resiliência sem alterar a estrutura fundamental. 