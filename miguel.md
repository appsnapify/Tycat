# Análise Detalhada do Website

## 1. Arquitetura e Mapeamento Completo

### Páginas Principais
- **Página Inicial** (`/`)
- **Login/Registro** (`/login`, `/cadastro`)
- **Dashboard Promotor** (`/app/promotor/dashboard`)
- **Dashboard Chefe de Equipe** (`/app/chefe-equipe/dashboard`)
- **Criação de Equipe** (`/app/promotor/equipes/criar`)
- **Juntar-se a Equipe** (`/app/promotor/equipes/juntar`)
- **Gerenciamento de Equipe** (`/app/chefe-equipe/equipe`)
- **Perfil do Usuário** (`/app/perfil`)
- **Carteira** (`/app/wallet`)

### Modais e Pop-ups
- Modal de confirmação para criação de equipe
- Modal de confirmação para juntar-se a equipe
- Modal de erro para falhas em operações
- Pop-up de notificação de sucesso
- Modal de carregamento durante operações assíncronas

### Diagrama de Arquitetura
```
Página Inicial
  ├── Login/Registro
  │     ├── Dashboard Promotor
  │     │     ├── Criação de Equipe → Dashboard Chefe de Equipe
  │     │     └── Juntar-se a Equipe → Dashboard Membro de Equipe
  │     └── Dashboard Chefe de Equipe
  │           └── Gerenciamento de Equipe
  ├── Perfil do Usuário (acessível de qualquer dashboard)
  └── Carteira (acessível de qualquer dashboard)
```

## 2. Análise Microscópica de Cada Página

### Página Inicial
#### Seções
- **Topo**: Logo, menu de navegação
- **Cabeçalho**: Banner principal com chamada para ação
- **Corpo**: Descrição do serviço, benefícios, testimonials
- **Rodapé**: Links de navegação secundária, informações de contato, links de redes sociais

#### Elementos Visuais
- Logo (topo-centro, 0.5rem do topo)
- Imagem de banner (cabeçalho, ocupando 100% da largura)
- Ícones de benefícios (corpo, distribuídos em grid 3x2)
- Fotos de testimonials (corpo-inferior, carrossel horizontal)

#### Estados Variáveis
- Links de navegação: normal, hover (mudança de cor), active (sublinhado)
- Botões CTA: normal, hover (aumento de escala), active (mudança de cor), focus (contorno)

### Página de Login/Registro
#### Seções
- **Topo**: Logo, alternador entre login e cadastro
- **Corpo**: Formulário de entrada
- **Rodapé**: Links para termos de uso e política de privacidade

#### Elementos Visuais
- Logo (topo-centro, 1rem do topo)
- Campos de formulário (centro da página, espaçamento vertical de 1rem)
- Botão de submissão (abaixo do último campo, largura de 100%)

#### Estados Variáveis
- Campos de formulário: vazio, preenchido, erro, foco
- Botão de submissão: normal, hover, active, disabled (durante validação/envio)

### Dashboard Promotor/Chefe de Equipe
#### Seções
- **Barra lateral**: Navegação principal, informações do usuário
- **Topo**: Barra de pesquisa, notificações, menu de usuário
- **Corpo**: Widgets de estatísticas, lista de atividades recentes
- **Área de trabalho principal**: Conteúdo específico da seção selecionada

#### Elementos Visuais
- Avatar do usuário (barra lateral-topo, circular)
- Ícones de navegação (barra lateral, alinhados verticalmente)
- Cards de estatísticas (corpo-superior, grid 2x2)
- Tabela de atividades (corpo-inferior, ocupando 100% da largura)

#### Estados Variáveis
- Itens de navegação: inativo, ativo (destacado), hover
- Cards: normal, hover (elevação de sombra)
- Linhas da tabela: normal, hover (background alterado)

## 3. Inventário de Elementos Interativos

### Página Inicial
- **Botão "Entrar"**
  - Texto: "Entrar"
  - Posição: Topo-direita, 1rem de margem
  - Estado padrão: Ativo, cor primária
  - Estados alternativos: Hover (escurecimento 10%), Active (escurecimento 15%)
  - Feedback: Mudança de cor, cursor pointer
  - Ação: Redireciona para /login

- **Botão "Cadastre-se"**
  - Texto: "Cadastre-se"
  - Posição: Adjacente ao botão "Entrar"
  - Estado padrão: Ativo, cor secundária
  - Estados alternativos: Hover (escurecimento 10%), Active (escurecimento 15%)
  - Feedback: Mudança de cor, cursor pointer
  - Ação: Redireciona para /cadastro

### Página de Login
- **Campo "Email"**
  - Texto placeholder: "Seu email"
  - Posição: Corpo-superior, centralizado
  - Estado padrão: Vazio, borda leve
  - Estados alternativos: Focus (borda destacada), Preenchido (ícone de verificação), Erro (borda vermelha)
  - Feedback: Mudança de borda, mensagem de erro abaixo do campo
  - Validação: Formato de email válido

- **Campo "Senha"**
  - Texto placeholder: "Sua senha"
  - Posição: Abaixo do campo email
  - Estado padrão: Vazio, borda leve
  - Estados alternativos: Focus (borda destacada), Preenchido (sem indicação visual), Erro (borda vermelha)
  - Feedback: Mudança de borda, mensagem de erro abaixo do campo
  - Validação: Mínimo 8 caracteres
  - Elemento adicional: Ícone de olho para mostrar/ocultar senha

- **Botão "Entrar"**
  - Texto: "Entrar"
  - Posição: Abaixo dos campos
  - Estado padrão: Ativo se ambos os campos preenchidos, caso contrário desativado
  - Estados alternativos: Hover (escurecimento), Active (escurecimento maior), Loading (spinner)
  - Feedback: Mudança de cor, cursor pointer, estado de loading durante a autenticação
  - Ação: Submete formulário, autentica usuário, redireciona para dashboard apropriado

## 4. Documentação de Fluxos de Interação

### Fluxo de Login
1. **Início**: Usuário acessa /login
2. **Entrada de dados**:
   - Usuário preenche email
   - Usuário preenche senha
   - Sistema valida formato em tempo real
3. **Submissão**:
   - Usuário clica em "Entrar"
   - Sistema exibe estado de loading no botão
   - Sistema envia credenciais para API
4. **Resposta**:
   - Se sucesso: redireciona para dashboard conforme role do usuário
   - Se falha: exibe mensagem de erro abaixo do botão, focando o campo problemático
5. **Tempo médio**: 2-5 segundos (dependendo da conexão)
6. **Histórico**: URL muda para dashboard sem adicionar /login ao histórico

### Fluxo de Criação de Equipe
1. **Início**: Usuário acessa /app/promotor/equipes/criar
2. **Entrada de dados**:
   - Usuário preenche nome da equipe
   - Usuário adiciona descrição (opcional)
3. **Submissão**:
   - Usuário clica em "Criar Equipe"
   - Sistema exibe modal de confirmação
   - Usuário confirma no modal
   - Sistema envia dados para API
4. **Processamento**:
   - Sistema cria equipe no banco de dados
   - Sistema atualiza metadados do usuário para chefe-equipe
   - Sistema gera código único para a equipe
5. **Resposta**:
   - Se sucesso: exibe mensagem de sucesso, redireciona para dashboard de chefe de equipe
   - Se falha: exibe mensagem de erro específica, mantém usuário na página de criação
6. **Mudanças de estado**:
   - Role do usuário muda de "promotor" para "chefe-equipe"
   - Nova equipe é criada na tabela teams
   - Usuário é adicionado como membro na tabela team_members

### Fluxo de Juntar-se a Equipe
1. **Início**: Usuário acessa /app/promotor/equipes/juntar
2. **Entrada de dados**:
   - Usuário insere código da equipe
3. **Submissão**:
   - Usuário clica em "Juntar-se à Equipe"
   - Sistema exibe modal de confirmação
   - Usuário confirma no modal
   - Sistema envia dados para API
4. **Processamento**:
   - Sistema verifica existência da equipe com o código fornecido
   - Sistema adiciona usuário como membro da equipe
   - Sistema atualiza metadados do usuário para membro-equipe
5. **Resposta**:
   - Se sucesso: exibe mensagem de sucesso, redireciona para dashboard de membro de equipe
   - Se falha: exibe mensagem de erro específica (equipe não encontrada, já é membro, etc.)
6. **Mudanças de estado**:
   - Role do usuário muda de "promotor" para "membro-equipe"
   - Usuário é adicionado na tabela team_members
   - Contagem de membros da equipe é incrementada

## 5. Mapeamento de Fluxos de Navegação

### Fluxo Completo: Registro até Criação de Equipe
1. Acesso à página inicial
2. Clique em "Cadastre-se"
3. Preenchimento de formulário de registro
4. Submissão e criação de conta
5. Redirecionamento para dashboard de promotor
6. Navegação para "Criar Equipe"
7. Preenchimento do formulário de equipe
8. Confirmação de criação
9. Redirecionamento para dashboard de chefe de equipe

### Fluxo Completo: Registro até Juntar-se a Equipe
1. Acesso à página inicial
2. Clique em "Cadastre-se"
3. Preenchimento de formulário de registro
4. Submissão e criação de conta
5. Redirecionamento para dashboard de promotor
6. Navegação para "Juntar-se a Equipe"
7. Inserção do código da equipe
8. Confirmação de adesão
9. Redirecionamento para dashboard de membro de equipe

### Bifurcações Possíveis
- **Durante registro**:
  - Opção de login se já possui conta
  - Cancelamento do processo (retorno à página inicial)
- **Durante criação de equipe**:
  - Cancelamento (permanece como promotor)
  - Erro de validação (permanece no formulário)
- **Durante juntar-se a equipe**:
  - Cancelamento (permanece como promotor)
  - Erro de validação (código inválido, equipe não encontrada)
  - Já é membro de outra equipe (redirecionado para dashboard atual)
- **Após criação de equipe**:
  - Gerenciamento da equipe criada
  - Acesso ao perfil para configurações
  - Visualização de carteira

## 6. Análise de Processos e Funções

### Processo de Registro
- **Passos**:
  1. Acesso ao formulário de cadastro
  2. Preenchimento de dados pessoais (nome, email, senha)
  3. Verificação de email (opcional dependendo da configuração)
  4. Definição de papel inicial (promotor por padrão)
- **Campos obrigatórios**: Nome, email, senha, confirmação de senha
- **Campos opcionais**: Telefone
- **Validações**:
  - Email: formato válido e não existente no sistema
  - Senha: mínimo 8 caracteres, pelo menos uma letra e um número
  - Confirmação: deve ser idêntica à senha
- **Processamento**:
  - Criação de registro na tabela auth.users
  - Inicialização de metadados (role: promotor)
  - Geração de token de autenticação
- **Feedback**:
  - Sucesso: mensagem "Conta criada com sucesso!"
  - Erro de email existente: "Este email já está em uso"
  - Erro de validação: mensagens específicas próximas a cada campo

### Processo de Criação de Equipe
- **Passos**:
  1. Acesso à página de criação
  2. Preenchimento do formulário
  3. Confirmação via modal
  4. Processamento pelo sistema
- **Campos obrigatórios**: Nome da equipe
- **Campos opcionais**: Descrição
- **Validações**:
  - Nome: não vazio, mínimo 3 caracteres
  - Usuário: deve ter role "promotor"
- **Processamento**:
  1. Chamada RPC para função `create_promoter_team_v2`
  2. Criação de registro na tabela teams
  3. Adição do usuário na tabela team_members
  4. Atualização de metadados do usuário
  5. Geração de código único para a equipe
- **Feedback**:
  - Sucesso: modal "Equipe criada com sucesso!" + redirecionamento
  - Erro: mensagem específica dependendo do tipo de falha

### Processo de Juntar-se a Equipe
- **Passos**:
  1. Acesso à página de juntar-se
  2. Inserção do código da equipe
  3. Confirmação via modal
  4. Processamento pelo sistema
- **Campos obrigatórios**: Código da equipe
- **Validações**:
  - Código: deve corresponder a uma equipe existente
  - Usuário: deve ter role "promotor" e não ser membro de outra equipe
- **Processamento**:
  1. Validação do código da equipe
  2. Inserção do registro na tabela team_members
  3. Atualização de metadados do usuário para membro-equipe
  4. Incremento da contagem de membros da equipe
- **Feedback**:
  - Sucesso: modal "Você agora faz parte da equipe!" + redirecionamento
  - Erro: mensagem específica dependendo do tipo de falha (código inválido, já é membro, etc.)

## 7. Comportamento Responsivo

### Pontos de Quebra
- **Desktop**: > 1024px
- **Tablet**: 768px - 1024px
- **Mobile**: < 768px

### Adaptações em Mobile
- Barra lateral se transforma em menu hambúrguer
- Grid de cards muda de 2x2 para 1x4 (empilhado)
- Tabelas recebem scroll horizontal
- Formulários ocupam 100% da largura
- Botões aumentam de tamanho para facilitar toque
- Espaçamento entre elementos é reduzido

### Alterações Específicas
- **Dashboard**:
  - Widgets empilhados em coluna única
  - Estatísticas mostram menos informações
  - Ícones substituem alguns textos para economizar espaço
- **Formulários**:
  - Campos empilhados verticalmente
  - Labels movem para cima do campo em vez de ao lado
  - Botões ocupam largura total

## 8. Estados Condicionais

### Baseados em Autenticação
- Usuário não autenticado: vê apenas página inicial e login/registro
- Usuário autenticado: acessa dashboard e funcionalidades internas

### Baseados em Role
- **Promotor**:
  - Vê opção de criar equipe
  - Vê opção de juntar-se a equipe existente
  - Não tem acesso ao gerenciamento de equipes
- **Chefe de Equipe**:
  - Vê dashboard específico com estatísticas da equipe
  - Acessa gerenciamento de membros
  - Pode convidar novos membros
  - Pode gerar códigos de convite
- **Membro de Equipe**:
  - Vê dashboard específico com informações da equipe
  - Não pode gerenciar a equipe
  - Acesso a funcionalidades específicas de membro
- **Admin** (se implementado):
  - Acesso a todas as equipes
  - Funcionalidades de gerenciamento global

### Baseados em Estado de Equipe
- Equipe sem membros: mostra mensagem incentivando convites
- Equipe com membros: exibe listagem e estatísticas

## 9. Microtransições e Feedback

### Indicadores de Carregamento
- Spinners para operações assíncronas
- Skeleton loaders para carregamento de conteúdo
- Barra de progresso para operações maiores

### Animações de Transição
- Fade-in/fade-out entre páginas (300ms)
- Slide para modais e drawers (250ms)
- Scale para elementos que recebem foco (150ms)

### Tooltips e Ajuda
- Ícones de informação (i) com tooltips em hover
- Mensagens de ajuda contextual em campos complexos
- Tooltips em botões com ícones sem texto

## 10. Análise de Dependências entre Páginas

### Persistência de Dados
- Sessão de usuário mantida via localStorage e cookies
- Preferências de visualização salvas localmente
- Dados de navegação recente mantidos em cache

### Efeitos Cruzados
- Criação de equipe: afeta dashboard, menu de navegação e permissões
- Atualização de perfil: reflete em todas as páginas que mostram dados do usuário
- Ações na carteira: atualizam saldo exibido no cabeçalho global

### Manutenção de Estado
- Uso de Context API para estado global da aplicação
- Caching de dados frequentes para minimizar requisições
- Sincronização de metadata entre frontend e banco de dados

## 11. Tecnologias e Implementação

### Frontend
- **Framework**: Next.js (App Router)
- **UI/UX**: Componentes personalizados com TailwindCSS
- **Estado**: Context API + hooks personalizados
- **Autenticação**: Integração com Supabase Auth

### Backend
- **Database**: PostgreSQL (via Supabase)
- **Autenticação**: Supabase Auth
- **API**: Funções serverless + RPC
- **Segurança**: Policies RLS (Row Level Security)

### Estrutura de Dados Principal
- **Usuários**: auth.users com metadados para roles (promotor, chefe-equipe, membro-equipe)
- **Equipes**: tabela teams relacionada com team_members
- **Convites**: código único por equipe para permitir novos membros se juntarem
- **Transações**: sistema de wallet para operações financeiras

---

# Prompt para Análise Completa de Sistema

Ao analisar um sistema web, especialmente plataformas com múltiplos papéis de usuário e funcionalidades de equipes, considere sempre:

## Fluxos Completos de Usuário
- **Mapeie todos os caminhos possíveis**: Identifique cada caminho que um usuário pode seguir desde o registro até suas interações principais.
- **Bifurcações de jornada**: Para cada papel de usuário (promotor, chefe de equipe, membro, etc.), documente as bifurcações de caminhos possíveis.
- **Capture a dualidade de ações**: Se um sistema permite criar/juntar a algo, sempre analise ambas as ações com igual importância.

## Funcionalidades Essenciais
- **Criação vs. Adesão**: Sempre verifique se o sistema permite tanto criar uma nova entidade (equipe, organização) quanto ingressar em uma existente.
- **Gerenciamento de convites/códigos**: Como novos membros são adicionados? Por convite direto, código, solicitação?
- **Mudanças de papel**: Como um usuário transita entre diferentes papéis? Quais triggers existem para estas mudanças?

## Análise Técnica
- **Funções RPC chave**: Identifique funções como `create_promoter_team_v2` e `join_team_with_code` que implementam lógica crítica.
- **Fluxo de metadados**: Como são atualizados os metadados de usuário quando seu papel muda?
- **Estados transitórios**: Existem estados intermediários durante processos de adesão ou criação?

## Checklist de Análise Completa
- [ ] Mapeei a criação de entidades (equipes/organizações)
- [ ] Identifiquei como usuários se juntam a entidades existentes
- [ ] Documentei todos os papéis de usuário e suas permissões
- [ ] Analisei o fluxo de metadados e atualizações de estado
- [ ] Verifiquei funções RPC críticas e seu comportamento
- [ ] Identifiquei pontos de falha potenciais e tratamento de erros
- [ ] Compreendi a hierarquia de usuários e relacionamentos

*Lembre-se: Nunca presuma que um sistema possui apenas um caminho principal. Sistemas colaborativos sempre têm múltiplos fluxos de igual importância, como criar equipes E juntar-se a equipes existentes.*

Observação: Esta análise foi baseada na estrutura de código visualizada. Para uma documentação completa com capturas de tela e diagramas visuais, seria necessário acesso ao sistema em funcionamento.

---

# Prompt para Evitar Omissões em Análise de Sistemas

```
Analise o código da aplicação em busca de TODAS as operações duais. Para cada funcionalidade de CRIAÇÃO, verifique se existe a funcionalidade correspondente de ADESÃO/PARTICIPAÇÃO:

1. Se há criar equipe → deve haver juntar-se a equipe
2. Se há criar organização → deve haver juntar-se a organização
3. Se há criar projeto → deve haver participar de projeto
4. Se há criar evento → deve haver inscrever-se em evento

Para cada papel de usuário mapeado, identifique:
- Caminhos de ENTRADA neste papel (como um usuário obtém este papel?)
- Ações EXCLUSIVAS deste papel (o que só este papel pode fazer?)
- Caminhos de TRANSIÇÃO para outros papéis

Na implementação técnica, verifique:
- Funções RPC ou métodos para CADA operação dual (ex: create_X e join_X)
- Atualizações de metadados para AMBOS os lados da operação
- Fluxos de UI para AMBAS as operações (criação e participação)

NUNCA presuma que um sistema tem apenas o caminho "feliz" de criação sem o caminho alternativo de participação.
```

## Prompt Simplificado para Não Esquecer Funcionalidades

```
VERIFICAÇÃO DE DUALIDADE:
Se existe CRIAR, procure JUNTAR-SE.
Se existe LÍDER, procure MEMBRO.
Se existe CRIADOR, procure PARTICIPANTE.

PARA CADA FUNÇÃO QUE ENCONTRAR:
1. Verifique seu oposto ou complemento
2. Rastreie o fluxo completo de ambas
3. Identifique as páginas e componentes relacionados
4. Verifique as funções de backend correspondentes

LEMBRE-SE: Em sistemas sociais/colaborativos, quase tudo tem um lado A e um lado B.
```

Observação: Esta análise foi baseada na estrutura de código visualizada. Para uma documentação completa com capturas de tela e diagramas visuais, seria necessário acesso ao sistema em funcionamento. 