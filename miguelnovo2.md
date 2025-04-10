# Documentação Ultradetalhada do Website Snap - Sistema de Gerenciamento de Equipes

## Dashboards e Fluxos de Trabalho Detalhados

### Estrutura Comum dos Dashboards
Todos os dashboards do sistema Snap compartilham uma estrutura visual base consistente:
- **Barra Lateral (Sidebar)**: Posicionada à esquerda, contém navegação principal
- **Cabeçalho**: Barra superior com informações do usuário e ações rápidas
- **Área de Conteúdo Principal**: Região central com cartões de métricas e funcionalidades
- **Rodapé**: Informações do sistema e links úteis

Esta estrutura mantém-se em todos os tipos de dashboard, com variações de conteúdo e permissões conforme o papel do usuário.

### Dashboard do Promotor
- **URL**: `/app/promotor/dashboard`
- **Acesso**: Exclusivo para usuários com papel "promotor"
- **Propósito**: Centro de visualização para promotores que ainda não ingressaram em equipes ou que têm acesso limitado

#### Componentes e Funcionalidades
1. **Painel de Métricas Pessoais**
   - **Dados Exibidos**: Total de vendas, comissões acumuladas, eventos participados, tarefas concluídas
   - **Fonte de Dados**: Consultas às tabelas sales, commissions, event_participants, tasks
   - **Atualização**: Carregamento inicial e atualização manual
   - **Armazenamento**: Estado local React (userStats)

2. **Seção "Minhas Equipes"**
   - **Funcionalidade**: Exibe equipe atual ou opção para criar/ingressar
   - **Estados Possíveis**: 
     * Estado vazio: Botões para criar equipe ou juntar-se a uma
     * Estado com equipe: Detalhes da equipe atual
   - **Dados Coletados**: Não coleta, apenas exibe
   - **Fluxo de Dados**: Visualização → teamData (de metadata do usuário) → Exibição ou botões de ação

3. **Eventos Próximos**
   - **Funcionalidade**: Lista eventos que o promotor pode participar
   - **Dados Exibidos**: Nome, data, localização, status, organização
   - **Fonte de Dados**: Tabela events com filtro por team_id
   - **Estados**: Com eventos ou vazio (com mensagem informativa)
   - **Ações**: Ver detalhes do evento (link para página do evento)

4. **Feed de Atividades**
   - **Funcionalidade**: Exibe atividades recentes relacionadas ao promotor
   - **Dados Exibidos**: Lista de ações, timestamps, status
   - **Fonte de Dados**: Tabela activities filtrada por user_id
   - **Limite**: 5-10 atividades mais recentes

#### Fluxos de Trabalho
1. **Ingresso em Equipe**:
   * Promotor vê estado vazio → Clica em "Juntar-se a Equipe" → Redireciona para `/app/promotor/equipes/juntar`
   * Insere código → Chama função RPC `join_team_with_code` → Sistema atualiza metadados do usuário
   * Redirecionamento automático para dashboard do membro de equipe após sucesso

2. **Criação de Equipe**:
   * Promotor vê estado vazio → Clica em "Criar Equipe" → Redireciona para `/app/promotor/equipes/criar`
   * Preenche dados → Chama função RPC `create_promoter_team_v2` → Sistema cria equipe e atualiza papel
   * Redirecionamento automático para dashboard de chefe de equipe após sucesso

3. **Visualização de Comissões**:
   * Clique em "Ver Comissões" → Redireciona para `/app/promotor/comissoes`
   * Sistema busca dados da tabela commissions → Exibe lista filtrada por user_id

#### Detecção de Código Morto/Inativo
- Função `loadDashboardData` contém consulta a 'organizations' em eventos, mas a relação não é usada na interface
- Existem handlers para aprovação de tarefas que não têm interface correspondente

### Dashboard do Chefe de Equipe
- **URL**: `/app/chefe-equipe/dashboard`
- **Acesso**: Exclusivo para usuários com papel "chefe-equipe"
- **Propósito**: Centro de controle para gerenciamento completo da equipe e métricas

#### Componentes e Funcionalidades
1. **Painel de Métricas da Equipe**
   - **Dados Exibidos**: Total de membros, eventos ativos, vendas totais, comissões pendentes
   - **Fonte de Dados**: Agregações das tabelas team_members, events, sales, commissions
   - **Atualização**: Carregamento inicial e atualização manual
   - **Armazenamento**: Estado local React (teamStats)

2. **Código da Equipe**
   - **Funcionalidade**: Exibe e permite compartilhar o código da equipe
   - **Dados Exibidos**: Código gerado no formato TEAM-XXXXX
   - **Ações**: Copiar para clipboard, gerar QR code
   - **Fluxo de Dados**: Exibição → Cópia para clipboard → Confirmação visual

3. **Gestão de Membros**
   - **Funcionalidade**: Lista resumida dos membros da equipe com ações rápidas
   - **Dados Exibidos**: Nomes, avatares, papéis, status
   - **Fonte de Dados**: JOIN entre team_members e profiles
   - **Ações**: Ver todos, adicionar membro, ver detalhes
   - **Fluxo de Dados**: Carga inicial de `/team_members` → Exibição → Ações de gerenciamento

4. **Eventos da Equipe**
   - **Funcionalidade**: Lista eventos criados/associados à equipe
   - **Dados Exibidos**: Nome, data, progresso, status
   - **Fonte de Dados**: Tabela events filtrada por team_id
   - **Ações**: Criar evento, ver detalhes, gerenciar
   - **Fluxo de Dados**: Listagem → Ações → Redirecionamento para páginas específicas

5. **Métricas de Vendas**
   - **Funcionalidade**: Resumo visual do desempenho de vendas
   - **Dados Exibidos**: Gráfico de barras/linhas, tendências, comparativos
   - **Fonte de Dados**: Agregações da tabela sales com time series
   - **Ações**: Ver relatório completo, filtrar por período

#### Páginas Secundárias
1. **Minha Equipe** (`/app/chefe-equipe/minha-equipe`)
   - **Propósito**: Gerenciamento detalhado de membros
   - **Funcionalidades**: Lista completa, adição/remoção, definição de papéis
   - **Dados Manipulados**: team_members (criação, atualização, exclusão)

2. **Comissões** (`/app/chefe-equipe/comissoes`)
   - **Propósito**: Gerenciamento financeiro de comissões
   - **Funcionalidades**: Aprovação, rejeição, histórico
   - **Dados Manipulados**: commissions (atualizações de status)

3. **Eventos** (`/app/chefe-equipe/eventos`)
   - **Propósito**: Gerenciamento de eventos da equipe
   - **Funcionalidades**: Criação, edição, cancelamento, relatórios
   - **Dados Manipulados**: events, event_participants (CRUD completo)

4. **Financeiro/Wallet** (`/app/chefe-equipe/financeiro`, `/app/chefe-equipe/wallet`)
   - **Propósito**: Gestão financeira e pagamentos
   - **Funcionalidades**: Saldo, transações, transferências, relatórios
   - **Dados Manipulados**: transactions, wallets (consultas e criação)

5. **Vendas** (`/app/chefe-equipe/vendas`)
   - **Propósito**: Relatórios detalhados de vendas
   - **Funcionalidades**: Filtragem, exportação, análises
   - **Dados Manipulados**: sales (consultas e análises)

#### Fluxos de Trabalho
1. **Adição de Membros**:
   * Chefe vê seção de membros → Clica em "Adicionar Membro" → Opções: compartilhar código ou adicionar diretamente
   * Sistema gera link/código → Chefe compartilha externamente → Promotor usa o código
   * Atualização automática da lista de membros após ingresso

2. **Gestão de Eventos**:
   * Criação: Chefe clica em "Criar Evento" → Preenche formulário → Sistema insere na tabela events
   * Atribuição: Chefe associa promotores ao evento → Sistema insere em event_participants
   * Acompanhamento: Dashboard exibe progresso e métricas em tempo real

3. **Aprovação de Comissões**:
   * Sistema calcula comissões automaticamente → Chefe revisa na página de comissões
   * Aprovação: Atualização de status → Adição à carteira do promotor
   * Rejeição: Atualização de status → Notificação ao promotor

#### Detecção de Código Morto/Inativo
- Função `loadTeamMembersAlternative` indica problemas com a consulta principal
- Referências a organizações existem, mas a integração parece incompleta
- Variável `activities` é inicializada mas não preenchida corretamente

### Dashboard do Organizador
- **URL**: `/app/organizador/dashboard`
- **Acesso**: Exclusivo para usuários com papel "organizador"
- **Propósito**: Gerenciamento de organizações e eventos no nível superior

#### Componentes e Funcionalidades
1. **Painel de Organizações**
   - **Funcionalidade**: Gerenciamento de múltiplas organizações
   - **Dados Exibidos**: Lista de organizações, status, métricas
   - **Fonte de Dados**: Tabela organizations vinculada ao usuário
   - **Ações**: Criar, editar, gerenciar organização

2. **Eventos da Organização**
   - **Funcionalidade**: Controle de eventos criados pela organização
   - **Dados Exibidos**: Lista com detalhes, status, datas
   - **Fonte de Dados**: Tabela events filtrada por organization_id
   - **Ações**: Criar, editar, cancelar, ver relatórios

3. **Equipes Vinculadas**
   - **Funcionalidade**: Gerenciamento de equipes associadas
   - **Dados Exibidos**: Lista de equipes, desempenho, comissões
   - **Fonte de Dados**: JOIN entre organizations_teams e teams
   - **Ações**: Convidar equipe, remover vínculo, gerenciar

#### Fluxos de Trabalho
1. **Criação de Organização**:
   * Organizador acessa painel → Clica em "Nova Organização" → Preenche dados
   * Sistema insere em organizations → Vínculo automático com o usuário
   * Redirecionamento para dashboard da organização

2. **Gestão de Eventos**:
   * Criação: Organizador cria evento → Vinculado à organização atual
   * Associação: Organizador vincula equipes ao evento → Define comissões
   * Acompanhamento: Dashboard exibe métricas em tempo real

#### Detecção de Código Morto/Inativo
- Diretório `/app/organizador/debug` indica funcionalidades de depuração que podem não ser para produção
- Duplicação entre `/evento` e `/eventos`, possível inconsistência de nomenclatura

### Fluxos de Registro e Onboarding

#### Registro Promotor
1. Usuário acessa `/register` → Preenche dados básicos
2. Backend cria conta → Metadados com role="promotor"
3. Redirecionamento para `/app/promotor/dashboard`
4. Sistema apresenta opções: criar equipe ou juntar-se a uma

#### Registro Organizador
1. Usuário acessa `/register` → Preenche dados → Seleciona opção "Sou organizador"
2. Backend cria conta → Metadados com role="organizador"
3. Redirecionamento para `/app/organizador/dashboard`
4. Sistema solicita criação da primeira organização

#### Mudança de Papel (Promotor → Chefe de Equipe)
1. Promotor cria equipe → Sistema gera código único
2. Backend atualiza metadados → role="chefe-equipe"
3. Atualização nas tabelas → teams e team_members
4. Redirecionamento para dashboard apropriado

## Mecânica Fundamental do Sistema

O Snap é um sistema de gerenciamento de equipes para promotores de eventos que funciona em três níveis hierárquicos principais:

### Visão Geral do Sistema
- **Propósito Central**: Conectar organizadores de eventos, chefes de equipe e promotores em uma plataforma unificada que gerencia equipes, vendas e comissões.
- **Modelo de Negócio**: Facilitar a organização de eventos através de equipes de promotores, com rastreamento financeiro e comissões.
- **Arquitetura Base**: Aplicação Next.js com backend Supabase, utilizando autenticação, banco de dados e funções serverless.

### Ciclo de Vida do Usuário
1. **Entrada no Sistema**:
   * Usuário se registra como promotor (papel padrão)
   * Opções iniciais: criar uma equipe (torna-se chefe) ou juntar-se a uma equipe existente
   * Fluxo de decisão determine seu papel no sistema

2. **Papéis no Sistema**:
   * **Promotor**: Estado inicial de qualquer usuário, pode evoluir para outros papéis
   * **Chefe de Equipe**: Promotor que criou uma equipe e gerencia outros promotores
   * **Membro de Equipe**: Promotor que se juntou a uma equipe existente
   * A mudança de papel altera a interface e as permissões disponíveis

3. **Fluxo de Eventos**:
   * Chefe de Equipe cria/gerencia eventos
   * Membros da Equipe promovem eventos e recebem comissões
   * Sistema rastreia vendas e distribui comissões automaticamente

### Fluxos Principais do Sistema

#### Fluxo de Criação e Gestão de Equipe
1. Usuário se registra → Assume papel "promotor"
2. Cria equipe → Sistema gera código de equipe único → Papel atualizado para "chefe-equipe"
3. Compartilha código com promotores → Gerencia membros, comissões e finanças
4. Dashboard especializado mostra métricas da equipe e ferramentas de gestão

#### Fluxo de Participação em Equipe
1. Usuário se registra → Assume papel "promotor"
2. Recebe código de equipe → Utiliza para juntar-se a uma equipe
3. Sistema verifica código e adiciona à equipe → Papel atualizado para "membro-equipe"
4. Acesso a dashboard com informações da equipe, comissões e eventos

#### Fluxo Financeiro
1. Vendas são registradas no sistema
2. Comissões são calculadas automaticamente
3. Valores são adicionados à carteira virtual dos promotores
4. Chefe de equipe acompanha métricas e autoriza pagamentos

### Mecânica de Eventos e Promoções

#### Ciclo de Vida de um Evento
1. **Criação**: Chefe de equipe cria evento com detalhes, ingressos e comissões
2. **Atribuição**: Promotores são associados ao evento para promovê-lo
3. **Promoção**: Promotores compartilham códigos únicos de desconto/referência
4. **Venda**: Sistema rastreia vendas usando códigos dos promotores
5. **Registro**: Participantes compram ingressos com códigos promocionais
6. **Comissão**: Sistema calcula automaticamente comissões por venda
7. **Pagamento**: Valores são creditados nas carteiras virtuais dos promotores
8. **Retirada**: Promotores podem solicitar transferência para contas bancárias

#### Rastreamento de Vendas
- Cada promotor recebe URL/código único para compartilhar
- Sistema detecta códigos durante processo de compra
- Registro automático de vendas na conta do promotor
- Dashboard em tempo real mostra métricas de conversão
- Cálculo de comissões baseado em regras pré-estabelecidas

## 1. Mapeamento de Estrutura e Conteúdo

### Páginas Públicas
- **Página Inicial (Landing Page)**
  * URL: `/`
  * Responsável por apresentar o sistema aos visitantes e oferecer opções de login/registro
  * Contém seções: Hero, Features e CTA

- **Página de Login**
  * URL: `/login`
  * Formulário de autenticação para usuários existentes

- **Página de Registro**
  * URL: `/register`
  * Formulário para criação de novas contas

### Páginas Privadas - Promotor
- **Dashboard do Promotor**
  * URL: `/app/promotor/dashboard`
  * Painel central para promotores visualizarem informações relevantes

- **Equipes do Promotor**
  * URL: `/app/promotor/equipes`
  * Lista as equipes às quais o promotor pertence

- **Criação de Equipe**
  * URL: `/app/promotor/equipes/criar`
  * Formulário para criação de nova equipe

- **Comissões do Promotor**
  * URL: `/app/promotor/comissoes`
  * Visualização de comissões e ganhos do promotor

### Páginas Privadas - Chefe de Equipe
- **Dashboard do Chefe de Equipe**
  * URL: `/app/chefe-equipe/dashboard`
  * Painel central com métricas e gerenciamento de equipe

- **Gerenciamento de Equipe**
  * URL: `/app/chefe-equipe/minha-equipe`
  * Interface para gerenciar membros da equipe

- **Criação de Equipe**
  * URL: `/app/chefe-equipe/criar-equipe`
  * Formulário especializado para chefes criarem equipes

- **Comissões da Equipe**
  * URL: `/app/chefe-equipe/comissoes`
  * Visualização e gerenciamento de comissões da equipe

- **Vendas da Equipe**
  * URL: `/app/chefe-equipe/vendas`
  * Relatórios de vendas realizadas pela equipe

- **Carteira/Financeiro**
  * URL: `/app/chefe-equipe/wallet`
  * URL: `/app/chefe-equipe/financeiro`
  * Gerenciamento financeiro da equipe

- **Configurações**
  * URL: `/app/chefe-equipe/configuracoes`
  * Ajustes e preferências para a equipe

- **Organizações**
  * URL: `/app/chefe-equipe/organizacoes`
  * Gerenciamento de organizações vinculadas à equipe

### Páginas de Erro e Estados Especiais
- **Página 404 (Not Found)**
  * URL: Qualquer rota inexistente
  * Arquivo: `/app/not-found.tsx`

- **Página de Erro Geral**
  * URL: Qualquer rota com erros
  * Arquivo: `/app/error.tsx`

- **Página de Carregamento**
  * URL: Durante carregamento de qualquer rota
  * Arquivo: `/app/loading.tsx`

### Componentes Reutilizáveis
- **Sidebar**
  * Implementado em: `/components/sidebar.tsx`
  * Usado em: Layouts de dashboard

- **Seletor de Organização**
  * Implementado em: `/components/organization-selector.tsx`
  * Usado em: Páginas que requerem seleção de organização

- **Seletor de Data**
  * Implementado em: `/components/date-range-picker.tsx`
  * Usado em: Relatórios e análises

- **Previsualização de Organização**
  * Implementado em: `/components/organization-preview.tsx`
  * Usado em: Listagens de organizações

- **Componentes UI**
  * Localizados em: `/components/ui/`
  * Botões, formulários, modais e outros elementos de interface

### APIs Consumidas
- **Supabase Authentication**
  * Endpoints: auth.signIn, auth.signUp, auth.signOut

- **Funções RPC Personalizadas**
  * `join_team_with_code`: Permite usuários ingressarem em equipes
  * `create_promoter_team_v2`: Cria uma nova equipe de promotores

- **Tabelas do Supabase**
  * teams: Armazena informações das equipes
  * team_members: Relaciona usuários às equipes
  * profiles: Informações de perfil dos usuários

## 2. Dissecação Visual de Cada Página

### Página Inicial (Landing Page)
- **Header**
  * Dimensões: Largura 100%, altura 64px (h-16)
  * Posição: Fixa no topo (fixed top-0)
  * Cor de fundo: Branco transparente com blur (bg-white/80 backdrop-blur-sm)
  * Borda inferior: 1px sólida na cor padrão do tema

- **Hero Section**
  * Dimensões: Largura máxima 1280px (max-w-7xl), altura automática
  * Grid: 1 coluna em mobile, 2 colunas em desktop (grid-cols-1 lg:grid-cols-2)
  * Espaçamento: mt-16 pt-12 pb-16 px-4 sm:px-6 lg:px-8
  * Animação: Fade in com movimento lateral usando Framer Motion

- **Features Section**
  * Cor de fundo: Cinza claro (bg-gray-50)
  * Grid: 1-3 colunas dependendo da largura (grid-cols-1 md:grid-cols-2 lg:grid-cols-3)
  * Card de Feature:
    * Cor de fundo: Branco
    * Sombra: Suave, aumenta no hover
    * Arredondamento: 8px (rounded-lg)
    * Ícone: 48px, fundo roxo claro (bg-indigo-100)

- **CTA Section**
  * Alinhamento: Centralizado
  * Botão: Tamanho grande, largura mínima 200px
  * Espaçamento: py-16 sm:py-20 lg:py-24

### Tipografia
- **Títulos Principais**
  * Fonte: Sistema padrão (via Tailwind)
  * Tamanho: text-4xl a text-6xl dependendo da viewport
  * Peso: font-bold
  * Cor: text-gray-900

- **Corpo de Texto**
  * Tamanho: text-lg para texto normal, text-xl para destaques
  * Cor: text-gray-600 para texto secundário, text-gray-900 para texto principal

- **Botões**
  * Texto: Centralizado, peso médio ou bold
  * Variantes: Primário (background sólido), Outline (apenas borda)

### Cores
- **Primária**: Indigo (#4f46e5 - indigo-600)
- **Secundária**: Roxo claro para gradientes e fundos
- **Fundo**: Branco (#ffffff) e cinza claro (#f9fafb - gray-50)
- **Texto**: Cinza escuro (#111827 - gray-900) e cinza médio (#4b5563 - gray-600)

## 3. Catalogação Exaustiva de Elementos Interativos

### Mecânica de Interação
A interface do Snap utiliza um sistema de interação baseado em componentes React altamente responsivos, com feedback visual imediato e estados claramente definidos. Cada elemento interativo segue padrões consistentes de design, com estados padrão, hover, focus, active e disabled visualmente distintos.

### Botão de Login (Página Inicial)
- **Conteúdo**: "Iniciar Sessão"
- **Dimensões**: Automático baseado no conteúdo
- **Estilo**: Outline (variant="outline")
- **Estados**:
  * Padrão: Borda cinza, texto primário
  * Hover: Fundo levemente colorido, borda mais escura
  * Focus: Anel de foco azul, contorno destacado
  * Active: Escala ligeiramente reduzida
- **Seletores**: Componente Button do Shadcn UI
- **Animação**: Transição suave (0.2s) em hover
- **Tab Order**: Logo após o logo do site

### Botão de Registro (Página Inicial)
- **Conteúdo**: "Criar Conta"
- **Dimensões**: Automático baseado no conteúdo
- **Estilo**: Sólido (variant padrão)
- **Estados**:
  * Padrão: Fundo colorido (indigo-600), texto branco
  * Hover: Fundo mais escuro
  * Focus: Anel de foco azul
  * Active: Escala ligeiramente reduzida
- **Navegação**: Link para `/register`

### Botão "Começar Agora" (Hero Section)
- **Conteúdo**: "Começar Agora"
- **Dimensões**: size="lg", w-full em mobile, w-auto em desktop
- **Estados**: Similares ao botão de registro, mais proeminente
- **Navegação**: Link para `/register`

### Botão "Saiba Mais" (Hero Section)
- **Conteúdo**: "Saiba Mais"
- **Dimensões**: size="lg", w-full em mobile, w-auto em desktop
- **Estilo**: Outline
- **Navegação**: Link para `/about`

### Links de Feature Cards
- **Comportamento**: Toda a área do card é clicável
- **Animação**: Elevação suave no hover (aumento de sombra)
- **Feedback Visual**: Mudança de sombra apenas

### Botão de Dashboard (Quando Logado)
- **Conteúdo**: "Dashboard"
- **Dimensões**: Padrão do sistema
- **Navegação**: Para `/app/organizador/dashboard`

### Botão de Logout (Quando Logado)
- **Conteúdo**: Ícone "LogOut" + texto "Sair"
- **Dimensões**: Padrão com espaçamento entre ícone e texto
- **Comportamento**: onClick={handleLogout}
- **Ação**: Chama a função signOut() do hook useAuth

## 4. Documentação Microscópica dos Fluxos de Interação

### Princípios de Fluxo de Usuário
Os fluxos de interação do Snap são projetados para serem intuitivos e eficientes, seguindo um padrão de:
1. **Inicialização** - Apresentação do contexto e opções
2. **Entrada** - Coleta de dados necessários com validação em tempo real
3. **Processamento** - Feedback visual durante operações assíncronas
4. **Resultado** - Confirmação clara de sucesso ou orientação em caso de erro
5. **Próximos passos** - Direcionamento contextual para ações subsequentes

### Fluxo de Login
1. **Estado Inicial**:
   * Usuário na página de login
   * Formulário com campos vazios

2. **Input de Credenciais**:
   * onFocus: Destaque do campo focado
   * onChange: Validação em tempo real (email/senha)
   * Erros mostrados conforme digitação

3. **Submissão do Formulário**:
   * onClick do botão "Entrar"
   * Validação final dos campos
   * Exibição de estado de carregamento (spinner no botão)

4. **Processamento da Autenticação**:
   * Chamada à API Supabase auth.signIn
   * Tempo médio: 1-2 segundos
   * Armazenamento de tokens em localStorage

5. **Resposta Bem-Sucedida**:
   * Redirecionamento para dashboard adequado ao papel do usuário
   * Atualização do estado global de autenticação
   * Notificação de sucesso (opcional)

6. **Resposta com Erro**:
   * Exibição de mensagem específica de erro
   * Botão retorna ao estado normal
   * Foco retorna ao campo com problema (quando aplicável)

### Fluxo de Registro
1. **Estado Inicial**:
   * Formulário com campos vazios
   * Validação desativada

2. **Preenchimento e Validação**:
   * Validação em tempo real de formato de email
   * Verificação de força da senha
   * Habilitação progressiva do botão de submissão

3. **Submissão**:
   * Chamada à API Supabase auth.signUp
   * Exibição de loading state

4. **Criação da Conta**:
   * Criação do usuário no Supabase Auth
   * Criação automática de perfil vazio
   * Possível requisição de verificação por email

5. **Conclusão**:
   * Redirecionamento para página inicial ou onboarding
   * Atualização do contexto de autenticação

### Fluxo de Criação de Equipe
1. **Acesso ao Formulário**:
   * Navegação para `/app/promotor/equipes/criar` ou `/app/chefe-equipe/criar-equipe`

2. **Preenchimento de Dados**:
   * Nome da equipe (obrigatório)
   * Descrição (opcional)
   * Validação em tempo real

3. **Submissão**:
   * Chamada à função RPC `create_promoter_team_v2`
   * Parâmetros: user_id, team_name, team_description
   * Estado de loading exibido

4. **Processamento no Backend**:
   * Geração de código único para a equipe (formato TEAM-XXXXX)
   * Criação do registro na tabela teams
   * Adição do usuário como membro e líder
   * Atualização dos metadados do usuário

5. **Resposta e Feedback**:
   * Exibição do código da equipe para compartilhamento
   * Redirecionamento para o dashboard da equipe
   * Atualização da UI com a nova equipe criada

### Fluxo de Ingresso em Equipe
1. **Acesso**:
   * Usuário recebe código de equipe externamente
   * Navegação para tela de ingresso

2. **Inserção do Código**:
   * Entrada do código no formato TEAM-XXXXX
   * Validação de formato

3. **Submissão**:
   * Chamada à função RPC `join_team_with_code`
   * Parâmetros: user_id atual, team_code inserido

4. **Processamento**:
   * Verificação da existência da equipe
   * Verificação se usuário já pertence à equipe
   * Adição do usuário à tabela team_members
   * Atualização dos metadados do usuário

5. **Conclusão**:
   * Notificação de sucesso
   * Redirecionamento para dashboard da equipe
   * Atualização da UI com dados da nova equipe

## 5. Mapeamento de Lógica de Negócio

### Papéis de Usuário
- **Promotor**:
  * Papel básico no sistema
  * Pode participar de equipes
  * Visualiza suas comissões e eventos
  * Acesso limitado ao dashboard

- **Chefe de Equipe**:
  * Papel avançado com capacidades de gerenciamento
  * Pode criar e gerenciar equipes
  * Visualiza relatórios de comissões e vendas
  * Acesso a funcionalidades financeiras

### Regras para Criação de Equipe
- **Requisitos de Dados**:
  * Nome da equipe (obrigatório): 3-50 caracteres
  * Descrição (opcional): Até 200 caracteres
  * Usuário autenticado

- **Validações**:
  * Frontend: Comprimentos mínimo e máximo, caracteres permitidos
  * Backend: Verificação de permissões, unicidade do nome

- **Fluxos Possíveis**:
  * Sucesso: Equipe criada, usuário torna-se chefe
  * Erro: Validação falha, nome duplicado, erro de permissão

- **Persistência**:
  * Tabela `teams`: Registro principal da equipe
  * Tabela `team_members`: Relacionamento usuário-equipe
  * Metadados do usuário: Atualização com ID da equipe e papel

### Regras para Ingresso em Equipe
- **Requisitos**:
  * Código de equipe válido (formato TEAM-XXXXX)
  * Usuário autenticado não pertencente à equipe

- **Validações**:
  * Frontend: Formato do código (TEAM-XXXXX)
  * Backend: Existência do código, verificação de duplicação

- **Mensagens de Erro**:
  * "Código de equipe inválido" - Quando código não existe
  * "Usuário já pertence a esta equipe" - Quando já é membro

### Gerenciamento de Estado do Usuário
- **Autenticação**:
  * Hook `useAuth` com funções signIn, signUp, signOut
  * Estado armazenado em contexto React acessível globalmente

- **Metadados de Usuário**:
  * Estrutura na tabela auth.users:
  ```json
  {
    "role": "promotor" | "chefe-equipe",
    "team_id": "uuid-da-equipe",
    "team_code": "TEAM-XXXXX",
    "team_name": "Nome da Equipe",
    "team_role": "promoter" | "leader",
    "previous_role": "papel-anterior"
  }
  ```

### Modelo de Dados Fundamental
O sistema opera em torno de três entidades principais inter-relacionadas:

1. **Usuários** (auth.users): Armazena informações de autenticação e metadados de papel
2. **Equipes** (teams): Contém informações básicas da equipe e seu código único
3. **Membros de Equipe** (team_members): Estabelece relações entre usuários e equipes

Este modelo permite que um usuário:
- Crie uma equipe e se torne seu líder
- Junte-se a uma equipe existente como membro
- Mantenha seu papel e relações nos metadados de usuário

As políticas de segurança (RLS) garantem que:
- Chefes de equipe só podem gerenciar suas próprias equipes
- Membros só podem ver informações relevantes à sua equipe
- Dados sensíveis são protegidos por permissões adequadas

## 6. Documentação de Responsividade

### Breakpoints Principais
- **Mobile**: < 640px
- **Tablet**: 640px - 1024px
- **Desktop**: > 1024px

### Adaptações por Breakpoint

#### Página Inicial
- **Mobile**:
  * Layout em coluna única
  * Botões empilhados com largura total
  * Cards de features em coluna única

- **Tablet**:
  * Hero section mantém layout em coluna
  * Features em duas colunas
  * Botões lado a lado

- **Desktop**:
  * Hero em duas colunas (texto + imagem)
  * Features em três colunas
  * Espaçamento aumentado entre seções

#### Dashboards
- **Mobile**:
  * Sidebar substituída por menu hamburger
  * Cards empilhados em coluna única
  * Tabelas com scroll horizontal

- **Tablet**:
  * Sidebar compacta (apenas ícones)
  * Cards em duas colunas
  * Algumas tabelas responsivas

- **Desktop**:
  * Sidebar completa sempre visível
  * Layout em grade com múltiplas colunas
  * Tabelas com todas as colunas visíveis

### Media Queries Principais
- Definidas via Tailwind:
  * sm: 640px
  * md: 768px
  * lg: 1024px
  * xl: 1280px
  * 2xl: 1536px

## 7. Análise de Estados e Condições

### Estados de Autenticação
- **Não Autenticado**:
  * Acesso apenas a páginas públicas
  * Header mostra botões de login/registro
  * Redirecionamento automático para login em rotas protegidas

- **Autenticado como Promotor**:
  * Acesso a dashboard de promotor
  * Visualização limitada de funcionalidades
  * Header mostra botão de dashboard e logout

- **Autenticado como Chefe de Equipe**:
  * Acesso a todas as funcionalidades
  * Permissões de gerenciamento de equipe
  * UI adaptada com opções adicionais

### Estados de Carregamento
- **Inicial (Loading)**:
  * Exibido durante carregamento de página ou dados
  * Implementado via `loading.tsx` no Next.js
  * Spinners ou esqueletos de UI

- **Erro**:
  * Exibido quando ocorrem falhas
  * Implementado via `error.tsx` no Next.js
  * Mensagens específicas por tipo de erro

- **Vazio**:
  * Quando listas ou dados não possuem conteúdo
  * Mensagens informativas e call-to-actions
  * Ex: "Você ainda não pertence a nenhuma equipe. Crie uma nova ou junte-se usando um código."

- **Com Dados**:
  * Exibição completa das informações
  * Paginação quando aplicável

## 8. Documentação de Dependências e Serviços

### Backend e Autenticação
- **Supabase**: v2.49.4
  * Autenticação via @supabase/auth-helpers-nextjs v0.10.0
  * Banco de dados PostgreSQL gerenciado
  * Storage para arquivos (quando necessário)

### Framework Frontend
- **Next.js**: v15.2.4
  * App Router para roteamento baseado em arquivos
  * Server Components para renderização no servidor
  * API Routes para endpoints serverless

### UI e Componentes
- **Tailwind CSS**: v3.4.17
  * Estilização utility-first
  * Configuração em tailwind.config.ts

- **Shadcn/ui**:
  * Componentes baseados em Radix UI
  * Totalmente customizáveis e acessíveis

- **Radix UI**: Diversas versões (v1.x-v2.x)
  * Componentes primitivos acessíveis
  * Dialog, Dropdown, Tabs, etc.

- **Framer Motion**:
  * Animações fluidas e responsivas
  * Usado em transições de página e microinterações

### Gerenciamento de Formulários
- **React Hook Form**: v7.54.1
  * Validação controlada de formulários
  * Integração com Zod para validação de schema

- **Zod**: v3.24.1
  * Validação de schema com TypeScript

### Utilitários
- **date-fns**: v2.30.0 (Manipulação de datas)
- **recharts**: v2.15.0 (Gráficos)
- **qrcode**: v1.5.4 (Geração de QR Code)

## 9. Análise de Performance e Comportamento

### Estratégias de Otimização
- **Server Components**:
  * Renderização no servidor para conteúdo estático
  * Redução de JavaScript enviado ao cliente

- **Code Splitting**:
  * Automático pelo Next.js
  * Carregamento sob demanda de módulos

- **Lazy Loading**:
  * Imagens com o componente Image do Next.js
  * Componentes pesados carregados apenas quando necessários

### Comportamento em Diferentes Condições de Rede
- **Carregamento Inicial**:
  * Estado de loading exibido durante carregamento
  * Carregamento progressivo de componentes

- **Estado Offline**:
  * Fallback para dados em cache quando possível
  * Mensagens informativas sobre status da conexão

## 10. Usabilidade e Acessibilidade

### Estrutura Semântica
- **Elementos Semânticos**:
  * `<header>`, `<nav>`, `<main>`, `<section>`, `<footer>`
  * Landmarks apropriados para navegação por screen readers

- **Atributos ARIA**:
  * aria-label em elementos interativos
  * aria-expanded em menus expansíveis
  * aria-current para indicar página atual

### Navegação por Teclado
- **Tab Order**:
  * Sequência lógica de tabulação
  * Focus styles claramente visíveis

- **Keyboard Shortcuts**:
  * Escape para fechar modais
  * Enter para submeter formulários

## 11. Documentação Técnica Completa

### Arquitetura do Frontend
- **Gerenciamento de Estado**:
  * Contexts React para estado global
  * Estados locais para componentes específicos

- **Padrões de Componente**:
  * Componentes reutilizáveis em `/components`
  * Componentes específicos de página em `_components` dentro das pastas de rota

- **Routing**:
  * Next.js App Router
  * Layout aninhado para UI persistente

### Pipeline de Build
- **Desenvolvimento**:
  * `npm run dev`: Servidor local com hot reload

- **Produção**:
  * `npm run build`: Criação de build otimizada
  * `npm start`: Execução do build de produção

## 12. Documentação de Teste e Garantia de Qualidade

### Casos de Teste Críticos
- **Autenticação**:
  * Login com credenciais válidas
  * Login com credenciais inválidas
  * Registro de novo usuário
  * Logout

- **Equipes**:
  * Criação de nova equipe
  * Ingresso em equipe com código válido
  * Tentativa de ingresso com código inválido
  * Gerenciamento de membros

### Cenários de Borda
- **Múltiplas Equipes**:
  * Comportamento quando usuário pertence a várias equipes
  * Troca entre equipes

- **Estados de Erro**:
  * Recuperação de falhas de API
  * Tratamento de sessão expirada

## 13. VERIFICAÇÃO DE DUALIDADE

### Dualidades Identificadas
- **Criar Equipe ↔ Juntar-se a Equipe**
  * Fluxos complementares no sistema
  * Páginas: `/app/promotor/equipes/criar` vs páginas de ingresso com código

- **Chefe de Equipe ↔ Membro (Promotor)**
  * Papéis com diferentes permissões e interfaces
  * Dashboards e funcionalidades adaptadas a cada papel

- **Organização (Entidade) ↔ Participante (Equipe)**
  * Relação entre entidades organizadoras e equipes participantes
  * Fluxos de vinculação e permissões

### Fluxos Complementares Detalhados
- **Criação vs Ingresso**:
  * Criação gera código único
  * Ingresso consome código existente
  * Ambos resultam em vínculo usuário-equipe

- **Gerenciamento vs Participação**:
  * Chefe pode gerenciar membros, configurações, finanças
  * Promotor visualiza dados limitados, participa em eventos

- **Backend**:
  * Funções RPC específicas para cada lado da dualidade
  * Políticas RLS diferenciadas por papel 

## 14. Glossário de Termos do Sistema

### Termos Gerais
- **Snap**: Nome da plataforma de gerenciamento de equipes para eventos.
- **Promotor**: Usuário base do sistema, pode criar ou participar de equipes. Responsável por promover eventos e obter comissões por vendas.
- **Chefe de Equipe**: Promotor que criou e gerencia uma equipe. Tem acesso a ferramentas administrativas e relatórios detalhados.
- **Membro de Equipe**: Promotor que participa de uma equipe existente. Tem acesso limitado, focado em promoção e acompanhamento de comissões.
- **Comissão**: Valor pago aos promotores por vendas realizadas. Calculado como percentual do valor de venda ou valor fixo.
- **Código de Equipe**: Identificador único no formato TEAM-XXXXX usado para ingresso em equipes. Gerado automaticamente pelo sistema.
- **Código de Promotor**: Identificador único usado para rastrear vendas e atribuir comissões. Vinculado a um promotor específico.
- **Carteira Virtual**: Saldo mantido dentro da plataforma, onde comissões são depositadas antes da transferência para contas bancárias.

### Funcionamento do Sistema
- **Criação de Equipe**: Processo onde um promotor cria uma nova equipe, tornando-se automaticamente chefe de equipe. O sistema gera um código único para convidar membros.
- **Ingresso em Equipe**: Processo onde um promotor utiliza um código de equipe para se juntar a uma equipe existente, tornando-se um membro.
- **Promoção de Evento**: Atividade onde promotores divulgam eventos usando seus códigos únicos para obter comissões.
- **Rastreamento de Vendas**: Sistema que detecta e registra vendas realizadas através dos códigos dos promotores.
- **Cálculo de Comissões**: Processo automático que determina os valores devidos a cada promotor com base nas vendas atribuídas.
- **Pagamento de Comissões**: Transferência de valores da carteira virtual para contas bancárias dos promotores.
- **Gestão de Equipe**: Conjunto de ferramentas disponíveis para chefes de equipe gerenciarem membros, eventos e finanças.

### Termos Técnicos
- **RLS (Row Level Security)**: Sistema de segurança do Supabase que controla o acesso aos dados com base em regras definidas no banco de dados. Fundamental para garantir que usuários só vejam dados relevantes a seu papel e equipe.
- **Função RPC (Remote Procedure Call)**: Função executada no servidor Supabase que permite operações complexas com segurança aprimorada (SECURITY DEFINER). Usada para criação de equipes, ingresso de membros e outras operações críticas.
- **Metadados de Usuário**: Informações adicionais armazenadas no objeto de usuário no Supabase Auth, incluindo papel atual, equipe associada e histórico de papel.
- **App Router**: Sistema de roteamento do Next.js baseado em arquivos, onde a estrutura de pastas define as rotas da aplicação.
- **Server Components**: Componentes renderizados no servidor no Next.js, que permitem acesso direto ao banco de dados sem expor lógica sensível ao cliente.
- **Hook**: Função React que permite uso de estado e outros recursos em componentes funcionais. O sistema utiliza hooks personalizados para autenticação (useAuth), gerenciamento de equipe (useTeam) e outros.
- **Middleware**: Função que executa antes do carregamento das páginas, utilizada para verificar autenticação e redirecionar usuários não autorizados.

### Estados do Sistema
- **Loading**: Estado durante carregamento de dados ou processamento. Exibe indicadores visuais como spinners ou esqueletos de interface.
- **Erro**: Estado após falha em operação. Mostra mensagens específicas com orientações para resolução.
- **Vazio**: Estado quando não há dados disponíveis. Exibe mensagens informativas e sugestões de ação.
- **Com Dados**: Estado normal com dados carregados. Apresenta informações completas e opções de interação.
- **Não Autenticado**: Usuário sem sessão ativa. Acesso limitado a páginas públicas.
- **Autenticado**: Usuário com sessão ativa e papel definido. Acesso a funcionalidades baseado em seu papel atual.
- **Em Manutenção**: Estado especial quando o sistema está temporariamente indisponível para atualizações.

### Fluxos de Dados
- **Autenticação**: Processamento de credenciais → Validação no Supabase → Criação de sessão → Armazenamento de tokens → Redirecionamento contextual.
- **Fluxo de Equipe**: Criação/Ingresso → Atualização de metadados → Atualização de banco de dados → Redirecionamento para dashboard apropriado.
- **Fluxo de Venda**: Compartilhamento de código → Compra com código → Registro de venda → Cálculo de comissão → Atualização de saldo.

# Análise de Fluxo Visual e Estrutura de Dashboards

Esta seção expande a documentação com uma análise detalhada da estrutura visual e interativa dos dashboards, focando nos aspectos de design, layout e organização visual dos elementos.

## Estrutura Visual Comum dos Dashboards

Todos os dashboards do sistema compartilham uma estrutura visual consistente com os seguintes elementos:

### Layout Base
- **Barra Lateral (Sidebar)**: Posicionada à esquerda, largura fixa de 64px em desktop (w-64), retrátil em dispositivos móveis
- **Cabeçalho da Sidebar**: Contém título do dashboard específico e email do usuário com espaçamento vertical (mb-8)
- **Área Principal**: Ocupa o restante da largura da tela (flex-1), com scroll vertical
- **Tema Visual**: Esquema de cores consistente usando classes "bg-card", "bg-muted/20", com sombras sutis nas divisões
- **Responsividade**: Layout adapta-se com `hidden md:block` para a sidebar em dispositivos móveis

### Componentes Visuais Comuns
- **Cartões Métricos**: Dimensões padronizadas, com margens consistentes (gap-6)
- **Cards Informativos**: Estrutura visual com CardHeader (pb-2), CardTitle e CardContent
- **Sistema de Grid**: Uso de CSS Grid para organização de cards (grid-cols-2, grid-cols-4, grid-cols-5)
- **Navegação Interna**: Representada por botões com ícones e labels descritivos
- **Tipografia Hierárquica**: Títulos principais com "text-3xl font-bold", subtítulos com "text-2xl" e texto com "text-sm"

## Dashboard do Promotor

### Estrutura Visual
- **Cabeçalho**: Título "Dashboard" em tamanho grande (text-3xl) com margem inferior (mb-8)
- **Métricas Primárias**: Grid de 4 cartões com informações essenciais:
  - Vendas Realizadas (ícone Shopping Bag)
  - Comissão Total (ícone Credit Card)
  - Eventos Participados (ícone Calendar)
  - Tarefas Concluídas (ícone CheckCircle)
- **Seção "Minha Equipe"**: Card com informações de equipe
  - Exibição do código da equipe em formato destacado
  - Contador de membros com ícone Users
  - Botão de ação para copiar código com feedback visual (ícone Copy → Check)
- **Eventos Próximos**: Listagem vertical com até 3 eventos
  - Data formatada com dia/mês
  - Nome do evento e localização
  - Badge de status colorido (upcoming, active, past)
- **Atividades Recentes**: Feed de atividades com timestamp
  - Ícones específicos para cada tipo de atividade
  - Formatação temporal relativa (há X horas/dias)

### Estados Visuais
- **Estado Vazio**: Cards com valores zerados e mensagem de orientação
- **Estado de Carregamento**: Animação de loading com ícone Loader2 centralizado
- **Estado de Erro**: Mensagem de erro com ícone AlertCircle e botão de retry
- **Feedback de Cópia**: Animação de transição do ícone Copy para Check ao copiar código

## Dashboard do Chefe de Equipe

### Estrutura Visual
- **Cabeçalho**: Similar ao do Promotor, com título "Dashboard" (text-3xl font-bold)
- **Métricas Principais**: Grid de 5 cartões:
  - Membros da Equipe (ícone Users)
  - Eventos Ativos (ícone Calendar)
  - Vendas Totais (ícone ShoppingBag)
  - Comissões Pendentes (ícone CreditCard)
  - Performance da Equipe (ícone BarChart3)
- **Gestão da Equipe**: Card destacado com:
  - Lista de membros com avatares e nome
  - Indicador de função (promotor/chefe)
  - Código da equipe em formato QR e texto
  - Botões de ação para compartilhar e copiar código
- **Eventos Gerenciados**: Grid 2x2 de cards de eventos com:
  - Imagem/cor de fundo do evento
  - Título, data e local
  - Indicador de progresso de vendas (componente Progress)
  - Contadores de tickets vendidos/disponíveis

### Elementos Visuais Específicos
- **Barra de Progresso**: Componente visual para mostrar progresso de vendas
- **QR Code**: Representação visual do código da equipe
- **Menu de Ações**: Dropdown com ações rápidas para cada membro
- **Indicadores de Status**: Badges coloridos para estados diferentes
- **Área de Estatísticas**: Gráfico simplificado de performance da equipe

## Dashboard do Organizador

### Estrutura Visual
- **Cabeçalho**: Título "Dashboard" com seletor de organização quando aplicável
- **KPIs Principais**: Grid de 5 cartões com métricas críticas:
  - Eventos (total e próximos)
  - Equipes (contagem total)
  - Tickets (vendidos/disponíveis)
  - Comissões (pendentes/pagas)
  - Faturamento (total e período atual)
- **Tabela de Equipes**: Lista detalhada com:
  - Nome da equipe
  - Valor pendente em comissões
  - Número de eventos associados
  - Botão de ação para detalhes
- **Próximos Eventos**: Cards horizontais com:
  - Data em formato destacado (dia e mês)
  - Nome, local e contador de vendas
  - Barra de progresso visual
  - Badges de status e categoria

### Elementos Visuais Específicos
- **Seletor de Tabs**: Componente TabsList/TabsTrigger para alternar entre visões
- **Cards de Acesso Rápido**: Grid de 3x3 botões de navegação com ícones grandes
- **Estado "Sem Organização"**: Card de orientação com ícone Building e botão de ação
- **Área de Resumo Financeiro**: Card destacado com valores totais e período

## Características de Responsividade

### Adaptações em Dispositivos Móveis
- **Sidebar**: Recolhe-se automaticamente (hidden md:block)
- **Grid de Cards**: Reduz de 4/5 colunas para 2 e então 1 (grid-cols-1 md:grid-cols-2 lg:grid-cols-4)
- **Orientação de Cards**: Alguns cards mudam de horizontal para vertical
- **Espaçamento**: Redução proporcional de margens e paddings

### Breakpoints Principais
- **Pequeno (sm)**: < 640px - Layout simplificado, empilhado verticalmente
- **Médio (md)**: 768px - Aparece sidebar, grid parcialmente restaurado
- **Grande (lg)**: 1024px - Layout completo, todas as colunas visíveis
- **Extra grande (xl)**: 1280px - Espaçamentos otimizados para telas maiores

## Fundamentos de Design do Sistema

### Sistema de Cores
- **Primária**: Usada em botões de ação principal e elementos destacados
- **Muted**: Fundo de áreas secundárias e textos com menor ênfase
- **Background**: Tom claro para o fundo geral da aplicação
- **Card**: Branco para cards, com sombras sutis
- **Border**: Tom suave para separação visual de elementos

### Hierarquia Tipográfica
- **Títulos Principais**: text-3xl font-bold (24px, negrito)
- **Subtítulos**: text-2xl font-bold (20px, negrito)
- **Títulos de Card**: text-sm font-medium (14px, médio)
- **Texto Regular**: 16px com peso regular
- **Texto Secundário**: text-muted-foreground, geralmente em 14px ou 12px

### Espaçamento e Ritmo Visual
- **Grid Gap**: gap-6 (24px) entre cards e seções principais
- **Padding Interno**: p-4 (16px) para conteúdo de cards
- **Margens Verticais**: mb-8 (32px) entre seções principais
- **Hierarquia Visual**: Consistentemente aplicada através de tamanhos, pesos e cores

Este detalhamento visual complementa a documentação funcional, oferecendo uma compreensão completa da experiência visual e de interação dos dashboards no sistema Snap. 