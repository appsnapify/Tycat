# Correções de Segurança e Funcionalidade no Sistema de Convites

## Problemas resolvidos

Foram implementadas correções para os seguintes problemas:

1. **QR Code com Fallback**: Adicionado mecanismo de fallback para geração de QR code usando serviço externo quando o método interno falha.

2. **Erro de Login na Página do Promotor**: Corrigido erro "Erro ao encontrar usuário com o ID fornecido" ao tentar fazer login por telefone:
   - Removido o uso desnecessário de `await` na função `getCookieSafe` no arquivo `lib/supabase/server.ts`
   - Implementadas funções SQL seguras para verificação de usuários

3. **Violação de Políticas RLS ao Criar Convidados**: Corrigido erro "violates row-level security policy for table 'guests'" com:
   - Implementação de função `create_guest_safely` com `SECURITY DEFINER` para contornar RLS ao criar convidados de forma segura

## Funções SQL Implementadas

1. **create_guest_safely**
   - Contorna as políticas RLS para inserção de convidados
   - Verifica duplicidade de convidados antes de inserir
   - Gera QR Code automaticamente
   - Usa `SECURITY DEFINER` para execução com privilégios elevados

2. **check_client_user_exists**
   - Verifica de forma segura se um cliente existe no sistema
   - Permite validar existência de usuário sem expor dados sensíveis

3. **verify_client_user_credentials**
   - Valida credenciais de usuário de forma segura
   - Retorna dados básicos do usuário incluindo flag de senha válida
   - Protege contra acesso não autorizado

## Como aplicar as alterações

Para aplicar estas correções ao banco de dados:

1. Execute o script de migração:
   ```bash
   node scripts/apply_migrations.js
   ```

2. Verifique os logs para confirmar a aplicação bem-sucedida das funções

3. Teste o sistema de convites:
   - Funcionalidade de login por telefone
   - Geração de QR codes para convidados
   - Verificação de convidados existentes

## Segurança

As correções implementadas seguem as boas práticas de segurança:

- Uso de `SECURITY DEFINER` apenas onde necessário
- Definição explícita de `search_path` para evitar ataques de injeção
- Validação de entradas em funções SQL
- Permissões restritas apenas aos roles necessários
- Tratamento adequado de erros com mensagens informativas

## Próximos passos

- Monitorar o uso das funções para garantir que estão funcionando corretamente
- Considerar a implementação de logs mais detalhados para auditoria
- Avaliar a necessidade de ajustes nas políticas RLS para reduzir a dependência de funções SECURITY DEFINER 