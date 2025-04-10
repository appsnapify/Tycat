# Documentação de Código Morto e Elementos Não Utilizados no Sistema Snap

Esta documentação identifica e cataloga código morto, páginas vazias ou não utilizadas, e outros elementos que podem ser removidos ou refatorados no sistema Snap.

## Dashboards e Componentes

### Dashboard do Promotor
- **Consulta Inutilizada**: Em `app/app/promotor/dashboard/page.tsx`, a consulta que busca `organizations` junto com eventos não utiliza essa relação na interface
- **Handlers Sem Interface**: Existem handlers para aprovação de tarefas que não têm elementos correspondentes na UI
- **Variáveis Não Utilizadas**: O estado `activities` é inicializado mas nunca efetivamente populado com dados reais

### Dashboard do Chefe de Equipe
- **Código de Fallback**: A função `loadTeamMembersAlternative` existe como método alternativo, indicando problemas com a consulta principal
- **Integração Parcial com Organizações**: Há referências e consultas a organizações, mas a funcionalidade parece incompleta
- **Estado Não Utilizado**: O estado `activities` é definido mas não é corretamente preenchido ou exibido

### Dashboard do Organizador
- **Diretório de Debug**: `/app/organizador/debug` contém páginas que provavelmente não deveriam estar em produção
- **Inconsistência de Nomenclatura**: Existem dois diretórios separados, `/evento` e `/eventos`, com funcionalidades possivelmente duplicadas

## Estrutura de Arquivos e Diretórios

### Diretórios Vazios ou Subutilizados
- **Rotas "g" e "e"**: Os diretórios `/app/app/g/` e `/app/app/e/` parecem ser rotas encurtadas ou experimentais sem propósito claro
- **Dashboard Genérico**: O diretório `/app/app/dashboard/` contém apenas um arquivo de layout, sem página real

### Arquivos SQL
- **Migração Desatualizada**: Arquivos como `supabase_rls_fixes_clean.sql` e versões com sufixos diferentes (_v2, _full) indicam tentativas repetidas de corrigir o mesmo problema
- **Código SQL de Debug**: Arquivos como `supabase_analyze.sql` e `supabase_analyze_full.sql` parecem ser ferramentas de diagnóstico que não deveriam estar no repositório principal

## Componentes e Hooks

### Componentes Não Utilizados
- **Componentes em _components**: Alguns componentes em `/app/app/_components/` podem não estar sendo utilizados nas páginas atuais
- **Duplicação de Funcionalidade**: Existem múltiplas implementações de componentes similares, como seletores de organização

### Hooks e Contextos
- **Contextos Redundantes**: Em `/app/app/contexts/` e `/contexts/` parece haver duplicação de contextos
- **Provedores Subutilizados**: Alguns providers em `_providers` podem não estar sendo usados por todas as páginas

## Problemas no Banco de Dados

### Tabelas e Relações
- **Tabelas sem Uso Claro**: Referências a tabelas como `tasks` que não parecem ter interfaces correspondentes
- **Relações Incompletas**: JOIN entre events e organizations que não é completamente utilizado

### Funções RPC
- **Métodos Alternativos**: A existência de funções alternativas como `loadTeamMembersAlternative` indica problemas com as RPCs principais
- **Tratamento de Erros Redundante**: Múltiplas camadas de tratamento de erros nos componentes sugerem problemas com as RPCs

## Recomendações para Limpeza

### Prioridade Alta
1. Resolver duplicação de funcionalidade entre `/evento` e `/eventos`
2. Remover diretório de debug `/app/organizador/debug`
3. Consolidar arquivos SQL e remover versões desatualizadas

### Prioridade Média
1. Reavaliar os diretórios `g` e `e` para determinar seu propósito ou removê-los
2. Unificar os contextos duplicados
3. Completar a integração com organizações ou remover referências não utilizadas

### Prioridade Baixa
1. Revisar e limpar componentes não utilizados em `_components`
2. Consolidar e padronizar nomes de arquivos SQL
3. Remover variáveis de estado não utilizadas em componentes de dashboard 