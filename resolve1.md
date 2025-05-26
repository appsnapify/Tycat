# Relatório de Auditoria de Segurança

## Resumo Executivo

Após uma análise abrangente do projeto, foram identificadas diversas vulnerabilidades de segurança que podem comprometer a integridade, confidencialidade e disponibilidade do sistema. Este relatório apresenta uma visão detalhada das falhas encontradas, classificadas por severidade, juntamente com recomendações práticas para correção.

## Vulnerabilidades Críticas

### 1. Credenciais Expostas no Código-Fonte
**Local:** `next.config.js`
**Descrição:** Chaves de API do Supabase estão expostas diretamente no código-fonte, incluindo a chave anónima.
**Impacto:** Permite acesso não autorizado à base de dados se o código for exposto.

**Checklist de Correção:**
- ✅ Remover as credenciais do código e utilizar variáveis de ambiente via `.env.local`
- ✅ Adicionar `.env.example` como template para configuração
- ⏳ Adicionar `next.config.js` ao `.gitignore` ou remover credenciais do arquivo
- ⏳ Regenerar a chave anónima do Supabase imediatamente

> **Nota:** A implementação desta correção foi adiada temporariamente devido a dependências da aplicação nas configurações atuais.

### 2. Comparação Direta de Senhas ⏳ EM PROGRESSO
**Local:** `app/api/client-auth/login/route.ts`
**Descrição:** Senhas são comparadas diretamente sem utilização de funções hash seguras.
**Impacto:** Se a base de dados for comprometida, as senhas podem ser lidas em texto simples.

**Checklist de Correção:**
- ⏳ Implementar hashing de senhas com bcrypt, argon2 ou similar
- ⏳ Adicionar salt único para cada utilizador
- ⏳ Migrar senhas existentes para o novo formato de armazenamento seguro

**Plano de Correção Detalhado:**

#### Fase 1: Análise e Configuração ⏳ EM PROGRESSO
1. **Analisar Implementação Atual**
   - Examinar o código atual de autenticação para entender o fluxo
   - Identificar onde as senhas são armazenadas e como são comparadas
   - Avaliar impacto da alteração nos usuários existentes

2. **Selecionar Biblioteca de Hashing**
   - Escolher uma biblioteca robusta (bcrypt recomendado)
   - Instalar e configurar dependências necessárias

#### Fase 2: Implementação de Hashing
1. **Modificar Registro de Utilizador**
   - Atualizar código para fazer hash das senhas antes de armazenar
   - Implementar geração e armazenamento de salt

2. **Modificar Login/Verificação**
   - Alterar comparação direta para utilizar verificação segura via biblioteca

#### Fase 3: Migração de Dados Existentes
1. **Criar Script de Migração**
   - Desenvolver processo para migrar senhas existentes
   - Implementar verificação de transição para suportar ambos os formatos

2. **Executar Migração**
   - Aplicar script em ambiente controlado
   - Monitorar e validar resultados

#### Fase 4: Teste e Validação
1. **Testar Fluxos de Autenticação**
   - Verificar registro de novos utilizadores
   - Testar login de utilizadores existentes pré e pós-migração

2. **Validação de Segurança**
   - Confirmar que senhas não são mais armazenadas em texto simples
   - Verificar robustez contra ataques conhecidos

### 3. SQL Injection Potencial
**Local:** `app/api/guests/create/route.ts`
**Descrição:** Uso de strings SQL dinâmicas com concatenação direta de variáveis.
**Impacto:** Permite a execução de código SQL malicioso, podendo comprometer toda a base de dados.

**Checklist de Correção:**
- Substituir SQL dinâmico por queries parametrizadas
- Utilizar as funções nativas do Supabase com parâmetros seguros
- Implementar validação de entrada rigorosa

## Vulnerabilidades Altas

### 4. Ausência de Rate Limiting
**Local:** Todas as rotas de API
**Descrição:** Não foi identificado nenhum mecanismo de limitação de requisições.
**Impacto:** Vulnerabilidade a ataques de força bruta, DoS, e consumo excessivo de recursos.

**Checklist de Correção:**
- Implementar middleware de rate limiting
- Configurar diferentes limites baseados no tipo de endpoint
- Adicionar atraso incremental após falhas de autenticação consecutivas

### 5. Manipulação Insegura de Cookies de Sessão
**Local:** Middleware de autenticação
**Descrição:** Configuração incompleta de cookies com atributos de segurança inconsistentes.
**Impacto:** Possível roubo de sessão através de XSS ou man-in-the-middle.

**Checklist de Correção:**
- Garantir que todos os cookies de sessão tenham flags HttpOnly, Secure e SameSite=Strict
- Implementar regeneração periódica de IDs de sessão
- Definir tempo de expiração apropriado

### 6. Controlo de Acesso Insuficiente
**Local:** Middleware.ts e esquema RLS
**Descrição:** As verificações de autorização são inconsistentes e potencialmente contornáveis.
**Impacto:** Possibilidade de escalação de privilégios e acesso não autorizado.

**Checklist de Correção:**
- Implementar verificações rigorosas em todas as rotas protegidas
- Revisar e reforçar políticas RLS no Supabase
- Adicionar logs detalhados para atividades sensíveis

## Vulnerabilidades Médias

### 7. Logging Excessivo
**Local:** Vários componentes
**Descrição:** O código regista dados sensíveis nos logs, como partes de números de telefone.
**Impacto:** Exposição de informações sensíveis em logs de sistema.

**Checklist de Correção:**
- Remover logging de dados sensíveis
- Implementar ofuscação para logs necessários
- Definir níveis de log apropriados para cada ambiente

### 8. Gestão Inadequada de Dependências
**Local:** package.json
**Descrição:** Várias dependências sem versões fixas (usando ^) e potencialmente desatualizadas.
**Impacto:** Risco de introdução de vulnerabilidades conhecidas.

**Checklist de Correção:**
- Fixar versões de dependências críticas
- Implementar verificação automática de segurança de dependências
- Estabelecer processo de atualização regular de pacotes

### 9. Ausência de Content Security Policy
**Local:** Configuração global da aplicação
**Descrição:** Não há políticas CSP implementadas para mitigar XSS.
**Impacto:** Vulnerabilidade aumentada a ataques XSS.

**Checklist de Correção:**
- Configurar Content Security Policy adequada
- Implementar nonces para scripts inline necessários
- Testar a política em modo report-only antes de ativar

## Vulnerabilidades Baixas

### 10. Headers de Segurança Ausentes
**Local:** Configuração Next.js
**Descrição:** Faltam headers de segurança importantes como X-Content-Type-Options.
**Impacto:** Proteção reduzida contra ataques comuns baseados em navegador.

**Checklist de Correção:**
- Adicionar X-Content-Type-Options: nosniff
- Configurar X-Frame-Options para prevenir clickjacking
- Implementar Referrer-Policy adequada

### 11. Falta de Sanitização de Saída
**Local:** Componentes de UI
**Descrição:** Dados de utilizador podem ser renderizados sem sanitização adequada.
**Impacto:** Possibilidade de XSS persistente.

**Checklist de Correção:**
- Implementar sanitização de saída em todos os pontos onde dados do utilizador são renderizados
- Utilizar bibliotecas seguras para sanitização de HTML
- Escapar corretamente entidades HTML

### 12. Instruções SQL em Código-Fonte
**Local:** Migrações e funções SQL
**Descrição:** Funções SQL complexas armazenadas diretamente no código-fonte.
**Impacto:** Risco de exposição de lógica de negócio e estrutura de dados.

**Checklist de Correção:**
- Mover lógica sensível para funções na base de dados
- Implementar testes de integração para funções SQL
- Revisar e fortalecer permissões mínimas necessárias

## Recomendações Gerais de Segurança

1. **Implementar SAST/DAST:** Integrar ferramentas de análise estática e dinâmica de segurança no pipeline CI/CD
2. **Estabelecer Processo de Gestão de Segredos:** Utilizar uma solução dedicada para armazenar e gerir credenciais
3. **Realizar Testes de Penetração Regulares:** Agendar testes de penetração por terceiros ao menos anualmente
4. **Criar Política de Resposta a Incidentes:** Estabelecer procedimentos para responder a violações de segurança
5. **Implementar Autenticação Multi-Factor:** Adicionar camada adicional de segurança para contas privilegiadas
6. **Configurar Monitorização de Segurança:** Estabelecer sistema de alerta para atividades suspeitas
7. **Desenvolver Programa de Formação:** Treinar a equipa em práticas seguras de desenvolvimento

## Plano de Melhoria da Postura de Segurança

### Imediato (1-2 semanas)
- Corrigir exposição de credenciais no código-fonte (Vulnerabilidade #1)
- Implementar hashing seguro de senhas (Vulnerabilidade #2)
- Corrigir vulnerabilidades de SQL Injection (Vulnerabilidade #3)

### Curto Prazo (1 mês)
- Implementar rate limiting (Vulnerabilidade #4)
- Corrigir gestão de cookies de sessão (Vulnerabilidade #5)
- Reforçar controlos de acesso (Vulnerabilidade #6)

### Médio Prazo (3 meses)
- Corrigir logging excessivo (Vulnerabilidade #7)
- Atualizar e fixar dependências (Vulnerabilidade #8)
- Implementar Content Security Policy (Vulnerabilidade #9)

### Longo Prazo (6 meses)
- Adicionar headers de segurança (Vulnerabilidade #10)
- Implementar sanitização de saída abrangente (Vulnerabilidade #11)
- Reestruturar funções SQL (Vulnerabilidade #12)
- Implementar recomendações gerais de segurança 