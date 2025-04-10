# Plano de Implementação do Dashboard de Chefe de Equipe

Este documento detalha o plano para implementação gradual do dashboard completo de chefe de equipe, mantendo o código sensível existente intacto (especialmente a funcionalidade de promotor passando a chefe quando cria equipe).

## Funcionalidades Sensíveis (NÃO MODIFICAR)
- Lógica de criação de equipe pelo promotor (arquivo: `app/app/promotor/equipes/criar/page.tsx`)
- Funções SQL de criação de equipe (`create_promoter_team_v2`)
- Lógica de verificação de papel do usuário no hook auth (`hooks/use-auth.tsx`)
- Dashboard simplificado funcionando (`app/app/chefe-equipe/dashboard/page.tsx`)

## Fase 1: Estrutura de Navegação
**Objetivo**: Criar uma estrutura de navegação robusta sem interferir no código existente.

**Tarefas**:
- Criar componente `DashboardLayout` que envolverá o dashboard atual
- Implementar menu lateral ou sistema de tabs no topo  
- Criar páginas vazias para outras seções:
  - `/app/chefe-equipe/organizacoes`
  - `/app/chefe-equipe/equipe`
  - `/app/chefe-equipe/financeiro`
  - `/app/chefe-equipe/wallet`
- Implementar navegação entre páginas

**Arquivos a Criar/Modificar**:
- `app/app/chefe-equipe/layout.tsx` (NOVO - layout compartilhado)
- `components/dashboard/navigation.tsx` (NOVO - componente de navegação)
- Páginas básicas para cada seção (com mensagem "Em construção")

## Fase 2: Dashboard Completo
**Objetivo**: Expandir o dashboard atual com informações mais detalhadas.

**Tarefas**:
- Expandir o dashboard atual com cards de métricas
- Adicionar seção de atividade recente
- Melhorar a exibição do código da equipe
- Implementar componentes reutilizáveis para cada seção

**Arquivos a Criar/Modificar**:
- `components/dashboard/metric-card.tsx` (NOVO)
- `components/dashboard/activity-feed.tsx` (NOVO)
- `components/dashboard/team-code-display.tsx` (NOVO)
- Atualizar `app/app/chefe-equipe/dashboard/page.tsx` com novos componentes

## Fase 3: Gestão de Equipe
**Objetivo**: Implementar interface para gerenciar membros da equipe.

**Tarefas**:
- Criar lista de membros com detalhes
- Implementar funcionalidades para gerenciar promotores
- Incluir estatísticas individuais básicas

**Arquivos a Criar/Modificar**:
- `app/app/chefe-equipe/equipe/page.tsx` (Implementação completa)
- `components/team/member-list.tsx` (NOVO)
- `components/team/member-card.tsx` (NOVO)
- `components/team/invite-form.tsx` (NOVO)

## Fase 4: Organizações
**Objetivo**: Criar interface para visualizar e gerenciar organizações vinculadas.

**Tarefas**:
- Implementar grid de organizações
- Criar página de detalhes da organização
- Implementar compartilhamento de código para novas organizações

**Arquivos a Criar/Modificar**:
- `app/app/chefe-equipe/organizacoes/page.tsx` (Implementação completa)
- `app/app/chefe-equipe/organizacoes/[id]/page.tsx` (Página de detalhes)
- `components/organizations/org-grid.tsx` (NOVO)
- `components/organizations/org-card.tsx` (NOVO)

## Fase 5: Finanças/Comissões e Wallet
**Objetivo**: Implementar visualização e gerenciamento de aspectos financeiros.

**Tarefas**:
- Criar visão de comissões e pagamentos
- Implementar histórico financeiro
- Adicionar gráficos e estatísticas financeiras

**Arquivos a Criar/Modificar**:
- `app/app/chefe-equipe/financeiro/page.tsx` (Implementação completa)
- `app/app/chefe-equipe/wallet/page.tsx` (Implementação completa)
- Vários componentes para visualização de dados financeiros

## Considerações Técnicas
- **Tratamento de Erros**: Cada nova funcionalidade deve incluir tratamento de erros robusto
- **Fallbacks**: Implementar fallbacks para garantir que a UI não quebre quando dados não estiverem disponíveis
- **Loading States**: Adicionar estados de carregamento claros para feedback do usuário
- **Testes**: Testar cada nova adição antes de avançar para a próxima fase
- **Política RLS**: Utilizar as funções RPC criadas no SQL para evitar problemas de permissão
- **Desempenho**: Monitorar o desempenho após cada adição para evitar degradação

## Estratégia de Implementação
1. Desenvolver em branches separadas para cada fase
2. Testar exaustivamente antes de mesclar com a branch principal
3. Implementar de forma incremental dentro de cada fase
4. Manter o código limpo e documentado
5. **NÃO MODIFICAR** o código sensível que já está funcionando 