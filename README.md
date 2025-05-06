# Sistema de Gerenciamento de Equipes - Snap

Este projeto implementa um sistema de gerenciamento de equipes para promotores de eventos usando Next.js com Supabase como backend.

## Estrutura do Projeto

O projeto é uma aplicação Next.js que utiliza:
- Supabase para autenticação e banco de dados
- Middleware para controle de rotas protegidas
- Funções RPC para operações seguras com o banco de dados

## Configuração e Execução

1. Instale as dependências:
```bash
npm install
```

2. Execute o servidor de desenvolvimento:
```bash
npm run dev
```

3. Para construir o projeto para produção:
```bash
npm run build
npm start
```

## Configuração do Supabase

O projeto requer as seguintes tabelas e funcionalidades no Supabase:

1. Tabelas:
   - `teams`: Armazena informações das equipes
   - `team_members`: Relaciona usuários às equipes
   - `profiles`: Informações de perfil dos usuários

2. Funções SQL:
   - Importe o arquivo `supabase_rls_fixes.sql` no Supabase para configurar:
     - Funções RPC seguras
     - Políticas de segurança de linha (RLS)
     - Funções para criação de equipes e gerenciamento de membros

## Papéis de Usuário

O sistema gerencia os seguintes papéis de usuário:
- `promotor`: Usuário padrão que pode criar ou ingressar em equipes
- `chefe-equipe`: Líder de equipe com funcionalidades adicionais

## Correções Implementadas

1. **Normalização de Papéis**
   - Implementação de funções de normalização para garantir consistência entre termos como 'promoter'/'promotor' e 'team-leader'/'chefe-equipe'

2. **Segurança RLS**
   - Simplificação das políticas RLS para evitar recursão infinita
   - Implementação de funções RPC seguras (SECURITY DEFINER) para contornar limitações do RLS

3. **Tratamento de Erros**
   - Aprimoramento do tratamento de erros em operações críticas
   - Mecanismos de fallback para situações onde RLS pode falhar

4. **Metadados de Usuário**
   - Melhor gerenciamento de metadados de usuário para papéis e associações de equipe
   - Verificação e recuperação automática de metadados inconsistentes

## Endpoints Principais

- `/app/promotor/equipes/criar`: Criação de novas equipes
- `/app/chefe-equipe/dashboard`: Dashboard para líderes de equipe
- `/app/promotor/dashboard`: Dashboard para promotores regulares

## Funcionalidades

- Criação de equipes
- Gerenciamento de membros
- Visualização de estatísticas de equipe
- Códigos de convite para equipes

## Solução de Problemas

Se encontrar problemas com políticas RLS, você pode:

1. Verificar os logs do Supabase para identificar erros
2. Executar as funções RPC diretamente que contornam as políticas
3. Utilizar o arquivo `supabase_rls_fixes.sql` para redefinir as políticas

## Observações

As melhorias implementadas visam a manutenção da consistência e robustez, sem alterar a estrutura fundamental do banco de dados ou a aparência da interface do usuário.

# Sistema de Equipes (Teams) - Correções RLS e Funções

## Visão Geral
Este repositório contém as correções necessárias para o sistema de equipes da plataforma, especificamente focando nos problemas de RLS (Row Level Security) do Supabase e na unificação da terminologia usada no sistema.

## Problemas Identificados
1. **Recursão Infinita nas Políticas RLS**: As políticas atuais causam loop infinito ao verificarem permissões
2. **Inconsistência na Terminologia**: Uso misto de 'promoter'/'promotor' e 'team-leader'/'chefe-equipe'
3. **Metadados de Usuário Desatualizados**: Os metadados não são atualizados corretamente em algumas operações
4. **Falhas em Funções RPC**: Algumas funções apresentam erros ou não retornam os dados esperados

## Solução

### Arquivo SQL para Correções no Supabase
Foi criado um arquivo SQL abrangente (`supabase_rls_fixes_final.sql`) que:

1. Remove todas as políticas RLS problemáticas
2. Cria políticas RLS simplificadas e robustas
3. Recria todas as funções RPC com melhor tratamento de erros
4. Normaliza a terminologia em todo o banco de dados
5. Atualiza os metadados dos usuários existentes

### Como Aplicar as Correções

1. Acesse o painel administrativo do Supabase
2. Navegue até o SQL Editor
3. Copie todo o conteúdo do arquivo `supabase_rls_fixes_final.sql`
4. Cole no editor SQL e execute o script completo
5. Verifique os logs para garantir que não ocorreram erros na execução

## Melhorias Implementadas

### 1. Políticas RLS Simplificadas
- **Visualização de Equipes e Membros**: Todos os usuários autenticados podem visualizar
- **Gerenciamento de Equipes**: Apenas o criador pode modificar suas equipes
- **Gerenciamento de Membros**: Líderes de equipe podem gerenciar membros, e usuários podem gerenciar sua própria associação

### 2. Funções RPC Melhoradas
- **create_promoter_team_v2**: Cria equipe e atualiza metadados do usuário
- **join_team_with_code**: Permite ingressar em equipe usando código
- **get_team_details**: Obtém informações detalhadas da equipe
- **get_team_members**: Lista membros com perfis completos
- **get_promoter_profile**: Obtém perfil completo do promotor/líder
- **update_user_metadata_role**: Atualiza papel do usuário nos metadados

### 3. Normalização da Terminologia
- Padronização para 'promotor' e 'chefe-equipe' em todo o sistema
- Atualização automática dos metadados de usuários existentes

## Verificação de Sucesso
Após aplicar as correções:

1. A criação de equipes deve funcionar corretamente e atualizar os metadados do usuário
2. A visualização de membros da equipe deve funcionar sem erros de permissão
3. Os papéis dos usuários devem aparecer consistentes em todo o sistema

## Próximos Passos
- Monitorar os logs do Supabase para identificar quaisquer problemas persistentes
- Considerar a criação de índices adicionais para melhorar o desempenho das consultas
- Implementar testes automatizados para as funções RPC

## Contato
Se encontrar problemas ao aplicar essas correções, entre em contato com a equipe de desenvolvimento.

---

*Este documento e as correções foram atualizados em 08/04/2025.*

# Resolução do Erro: "Cookies can only be modified in a Server Action or Route Handler"

## O Problema

Em aplicativos Next.js 13+ com Supabase, você pode encontrar o seguinte erro:

```
Error: Cookies can only be modified in a Server Action or Route Handler
```

Este erro ocorre porque o Next.js impõe restrições sobre onde os cookies podem ser modificados:

- ✅ **Server Actions**: Podem ler e modificar cookies
- ✅ **Route Handlers**: Podem ler e modificar cookies  
- ❌ **Server Components**: Podem apenas ler cookies, não modificá-los

## A Solução

Foram criados dois clientes Supabase especializados em `lib/supabase-server.ts`:

1. **`createReadOnlyClient()`** - Para uso em Server Components (páginas, layouts)
   - Só pode ler cookies, não modificá-los
   - Ideal para componentes que apenas leem dados

2. **`createClient()`** - Para uso em Server Actions e Route Handlers
   - Pode ler e modificar cookies
   - Use para autenticação e operações que precisam alterar estado

## Como Migrar Código Existente

Se você estiver enfrentando este erro, siga estas etapas:

### 1. Identifique o Contexto

Determine se o código está em:
- Um Server Component (`.tsx` sem `'use client'` no topo)
- Um Server Action (arquivo ou função com `'use server'`)
- Um Route Handler (`app/api/*/route.ts`)

### 2. Use o Cliente Apropriado

#### Em Server Components:

```typescript
// ❌ ERRADO
import { createClient } from '@/lib/supabase-server';
// ...
const supabase = await createClient();

// ✅ CORRETO
import { createReadOnlyClient } from '@/lib/supabase-server';
// ...
const supabase = await createReadOnlyClient();
```

#### Em Server Actions:

```typescript
// ✅ CORRETO
'use server'
import { createClient } from '@/lib/supabase-server';

export async function minhaAction() {
  const supabase = await createClient();
  // Operações de autenticação funcionarão aqui
}
```

### 3. Reestruture se Necessário

Se você precisar modificar cookies em um Server Component:

1. Crie um Server Action separado para manipulação de cookies
2. Chame o Server Action do seu Server Component

```typescript
// auth-actions.ts
'use server'
import { createClient } from '@/lib/supabase-server';

export async function fazerLogin(email: string, senha: string) {
  const supabase = await createClient();
  return supabase.auth.signInWithPassword({
    email,
    password: senha
  });
}

// MeuComponente.tsx (Server Component)
import { createReadOnlyClient } from '@/lib/supabase-server';
import { fazerLogin } from './auth-actions';

export default async function MeuComponente() {
  // Para leitura de dados
  const supabase = await createReadOnlyClient();
  const { data } = await supabase.from('produtos').select();
  
  // Login será gerenciado pela action
  return (
    <form action={fazerLogin}>
      {/* ... */}
    </form>
  );
}
```

## Resumo

- Use `createReadOnlyClient()` em **Server Components**
- Use `createClient()` em **Server Actions** e **Route Handlers**
- Reestruture seu código para mover manipulações de cookies para Server Actions

Esta abordagem resolve o erro sem exigir mudanças arquitetônicas significativas em seu aplicativo.
