# ANALISE SNAPIFY

## Índice
- [API - Guests - route.ts](#api---guests---routets)

---

### 📋 ANÁLISE: route.ts
**📍 Localização:** `/app/api/guests/route.ts`
**📊 Tamanho:** 24KB | **📅 Última Modificação:** [ver git log]
**🎯 Função:** Endpoint principal para operações relacionadas a convidados (guests), incluindo criação, verificação, check-in e listagem de convidados para eventos. Implementa múltiplas estratégias de fallback para garantir robustez na inserção de dados.
**🔗 Dependências:**
- next/server (NextRequest, NextResponse)
- @supabase/supabase-js (createClient)
- uuid (v4)
- qrcode (QRCode)
- @/lib/supabase/server (createClient)
- Função RPC 'exec_sql' no Supabase
**📱 Usado por:**
- GuestListPageClient (app/g/[id]/GuestListPageClient.tsx)
- GuestListPage (app/guest-list/[id]/page.tsx)
- GuestRequestClientButton (components/promoter/GuestRequestClientButton.tsx)
- GuestRequestCard (components/promoter/GuestRequestCard.tsx)
- GuestRequestClient (components/client/GuestRequestClient.tsx)
- Diversos fluxos de registro/check-in de convidados no frontend

---

### 🔐 AUDITORIA DE SEGURANÇA
**🚨 Vulnerabilidades Identificadas:**
- [MÉDIA] Uso de SQL dinâmico via 'exec_sql' pode abrir brecha para SQL Injection se não houver sanitização rigorosa (linhas 201-226, 355, 380). O nome e telefone são escapados, mas eventuais campos futuros podem ser vetores.
- [MÉDIA] Service Role exposto via variável de ambiente pode ser risco se vazado.
- [BAIXA] Logs detalhados podem vazar dados sensíveis em ambientes de produção.

**🛡️ Validações de Input:**
- Campos validados: event_id, name, phone (obrigatórios)
- Campos não validados: promoter_id, team_id (opcionais, mas aceitam qualquer string)
- Sanitização: name, phone e qrCodeJson escapam apóstrofos para SQL, mas não há sanitização profunda para outros campos.

**🔑 Autenticação/Autorização:**
- Controle de acesso: Não há autenticação obrigatória para POST/PUT/GET (público).
- Verificação de roles: Não implementada.
- Tokens/Sessions: Não requeridos.

**📊 Exposição de Dados:**
- Dados sensíveis expostos: name, phone, promoter_id, team_id, QR code (pode conter dados sensíveis)
- Logs inseguros: Logs de request/response podem expor dados pessoais.
- Informações vazadas: Possível vazamento de estrutura de banco via logs de erro detalhados.

---

### ⚡ AUDITORIA DE PERFORMANCE
**🚀 Métricas Atuais:**
- Bundle size: N/A (API)
- Render time: N/A (API)
- Hydration time: N/A (API)
- Memory usage: Baixo a moderado (operações síncronas, mas pode crescer com volume de requests simultâneos)

**📈 Otimizações Identificadas:**
- [ALTA] Uso de fallback para múltiplas tabelas garante robustez, mas pode aumentar latência em caso de falha em cascata.
- [MÉDIA] Geração de QR code local pode ser otimizada para uso de worker/thread.
- [BAIXA] Repetição de lógica de inserção pode ser abstraída.

**🔄 Renderização:**
- Server Component: N/A
- Client Component: N/A
- Re-renders excessivos: N/A

**💾 Caching:**
- Cache implementado: Não
- Cache necessário: Sim, para GET de listas grandes (pode usar cache em memória ou CDN para eventos públicos)
- Estratégia recomendada: Cache de GET por event_id, TTL curto (5-10min), invalidar em mutações.

---

### 💀 DETECÇÃO DE CÓDIGO MORTO
**❌ Código Não Utilizado:**
- Imports não usados: Nenhum identificado
- Variáveis declaradas não usadas: Nenhuma relevante
- Funções não chamadas: Nenhuma
- Props não utilizadas: N/A
- CSS classes não aplicadas: N/A

**🔄 Código Duplicado:**
- Lógica repetida: Inserção de convidados em múltiplas tabelas (guests, guest_list_guests, tabela dinâmica)
- Componentes similares: N/A
- Constantes duplicadas: Nomes de campos repetidos em múltiplos blocos

**📦 Dependências Mortas:**
- Bibliotecas não utilizadas: Nenhuma
- Versões conflituantes: Não identificado
- Polyfills desnecessários: Não identificado

---

### 🔧 PLANO DE MELHORIAS
**🎯 Prioridade CRÍTICA (0-7 dias):**
1. Revisar e reforçar sanitização de todos os campos usados em SQL dinâmico (impacto: ALTO, esforço: 2h)
2. Implementar autenticação mínima (ex: rate limit, captcha ou token) para POST/PUT (impacto: ALTO, esforço: 4h)

**⚡ Prioridade ALTA (1-4 semanas):**
1. Centralizar lógica de fallback de inserção para evitar duplicação (impacto: MÉDIO, esforço: 4h)
2. Implementar cache para GET de listas grandes (impacto: MÉDIO, esforço: 3h)

**📈 Prioridade MÉDIA (1-3 meses):**
1. Refatorar logs para evitar exposição de dados sensíveis em produção (impacto: MÉDIO, esforço: 2h)
2. Adicionar validação de promoter_id e team_id (impacto: MÉDIO, esforço: 2h)

**🔮 Prioridade BAIXA (3+ meses):**
1. Otimizar geração de QR code para uso de worker/thread (impacto: BAIXO, esforço: 2h)
2. Revisar fallback para tabelas dinâmicas (avaliar necessidade real) (impacto: BAIXO, esforço: 2h)

---

> Análise detalhada preenchida conforme o padrão promo.md. Próximo arquivo será analisado incrementalmente seguindo este modelo. 

---

### 📋 ANÁLISE: create-from-client/route.ts
**📍 Localização:** `/app/api/guests/create-from-client/route.ts`
**📊 Tamanho:** 7.8KB | **📅 Última Modificação:** [ver git log]
**🎯 Função:** Endpoint para criação de convidados a partir do cliente, com validação de campos, proteção contra duplicatas, rate limiting, circuit breaker e integração com cache.
**🔗 Dependências:**
- next/server (NextResponse)
- @supabase/auth-helpers-nextjs (createRouteHandlerClient)
- next/headers (cookies)
- libphonenumber-js (isValidPhoneNumber)
- @/lib/cache/guest-cache (checkDuplicateGuest, setGuestExists, invalidateGuestCache)
- @/lib/monitoring/cache-metrics (recordGuestCacheHit, recordGuestCacheMiss)
- @/lib/security/rate-limit-v2 (createRateLimitResponse)
**📱 Usado por:**
- GuestRequestClient (components/client/GuestRequestClient.tsx)
- GuestRequestCard (components/promoter/GuestRequestCard.tsx)
- Fluxos de registro de convidados via frontend

---

### 🔐 AUDITORIA DE SEGURANÇA
**🚨 Vulnerabilidades Identificadas:**
- [BAIXA] Não há autenticação obrigatória, mas há rate limiting e circuit breaker.
- [MÉDIA] Possível brute force em campos de telefone se rate limit não for suficiente.
- [BAIXA] Logs detalhados podem vazar dados sensíveis em produção.

**🛡️ Validações de Input:**
- Campos validados: phone (formato E.164), eventId, promoterId, teamId (UUIDs obrigatórios)
- Campos não validados: Nenhum
- Sanitização: Validação rigorosa de UUID e telefone

**🔑 Autenticação/Autorização:**
- Controle de acesso: Não há autenticação obrigatória, mas há proteção por rate limit e circuit breaker
- Verificação de roles: Verifica associação do promotor ao evento/equipe
- Tokens/Sessions: Não requeridos

**📊 Exposição de Dados:**
- Dados sensíveis expostos: phone, promoter_id, team_id
- Logs inseguros: Logs de request/response podem expor dados pessoais
- Informações vazadas: Possível vazamento de estrutura de banco via logs de erro detalhados

---

### ⚡ AUDITORIA DE PERFORMANCE
**🚀 Métricas Atuais:**
- Bundle size: N/A (API)
- Render time: N/A (API)
- Hydration time: N/A (API)
- Memory usage: Baixo

**📈 Otimizações Identificadas:**
- [ALTA] Uso de cache para verificação de duplicatas
- [ALTA] Rate limiting e circuit breaker protegem contra overload
- [MÉDIA] Consulta direta para verificação de duplicatas pode ser otimizada para uso de índice

**🔄 Renderização:**
- Server Component: N/A
- Client Component: N/A
- Re-renders excessivos: N/A

**💾 Caching:**
- Cache implementado: Sim, para verificação de duplicatas
- Cache necessário: Sim, para GET de listas grandes (não implementado aqui)
- Estratégia recomendada: Manter cache de duplicatas e invalidar após mutação

---

### 💀 DETECÇÃO DE CÓDIGO MORTO
**❌ Código Não Utilizado:**
- Imports não usados: Nenhum identificado
- Variáveis declaradas não usadas: Nenhuma relevante
- Funções não chamadas: Nenhuma
- Props não utilizadas: N/A
- CSS classes não aplicadas: N/A

**🔄 Código Duplicado:**
- Lógica repetida: Validação de campos e duplicatas semelhante a outros endpoints
- Componentes similares: N/A
- Constantes duplicadas: Nomes de campos repetidos

**📦 Dependências Mortas:**
- Bibliotecas não utilizadas: Nenhuma
- Versões conflituantes: Não identificado
- Polyfills desnecessários: Não identificado

---

### 🔧 PLANO DE MELHORIAS
**🎯 Prioridade CRÍTICA (0-7 dias):**
1. Revisar logs para evitar exposição de dados sensíveis em produção (impacto: ALTO, esforço: 1h)
2. Reforçar rate limit para evitar brute force em telefones (impacto: ALTO, esforço: 2h)

**⚡ Prioridade ALTA (1-4 semanas):**
1. Otimizar consulta de duplicatas para uso de índice (impacto: MÉDIO, esforço: 2h)
2. Implementar autenticação mínima (ex: captcha) para POST (impacto: MÉDIO, esforço: 3h)

**📈 Prioridade MÉDIA (1-3 meses):**
1. Centralizar lógica de validação de campos para evitar duplicação (impacto: MÉDIO, esforço: 2h)
2. Adicionar cache para GET de listas grandes (impacto: MÉDIO, esforço: 3h)

**🔮 Prioridade BAIXA (3+ meses):**
1. Revisar necessidade de logs detalhados em produção (impacto: BAIXO, esforço: 1h)
2. Avaliar uso de cache distribuído para alta escala (impacto: BAIXO, esforço: 2h)

--- 

---

### 📋 ANÁLISE: check/route.ts
**📍 Localização:** `/app/api/guests/check/route.ts`
**📊 Tamanho:** 3.8KB | **📅 Última Modificação:** [ver git log]
**🎯 Função:** Endpoint para verificação de existência de registro de convidado por telefone e evento, incluindo validação de promotor associado. Usado para evitar duplicatas e garantir integridade de fluxo de registro.
**🔗 Dependências:**
- next/server (NextResponse)
- @/lib/supabase/server (createClient)
**📱 Usado por:**
- GuestRequestCard (components/promoter/GuestRequestCard.tsx)
- Fluxos de verificação de registro de convidados no frontend

---

### 🔐 AUDITORIA DE SEGURANÇA
**🚨 Vulnerabilidades Identificadas:**
- [BAIXA] Não há autenticação obrigatória, endpoint é público.
- [BAIXA] Possível brute force para descobrir registros existentes (mitigado por limitação de uso no frontend).
- [BAIXA] Logs podem vazar dados sensíveis em produção.

**🛡️ Validações de Input:**
- Campos validados: phone (regex internacional), eventId (UUID), promoterId/teamId (opcionais, UUID)
- Campos não validados: Nenhum
- Sanitização: Regex e validação de UUID

**🔑 Autenticação/Autorização:**
- Controle de acesso: Não há autenticação obrigatória
- Verificação de roles: Verifica se o telefone pertence a um promotor associado ao evento
- Tokens/Sessions: Não requeridos

**📊 Exposição de Dados:**
- Dados sensíveis expostos: phone, status do convidado
- Logs inseguros: Logs de request/response podem expor dados pessoais
- Informações vazadas: Possível vazamento de estrutura de banco via logs de erro detalhados

---

### ⚡ AUDITORIA DE PERFORMANCE
**🚀 Métricas Atuais:**
- Bundle size: N/A (API)
- Render time: N/A (API)
- Hydration time: N/A (API)
- Memory usage: Baixo

**📈 Otimizações Identificadas:**
- [MÉDIA] Consulta direta por telefone e evento pode ser otimizada para uso de índice
- [BAIXA] Lógica de verificação de promotor pode ser centralizada

**🔄 Renderização:**
- Server Component: N/A
- Client Component: N/A
- Re-renders excessivos: N/A

**💾 Caching:**
- Cache implementado: Não
- Cache necessário: Sim, para verificação de duplicatas em alta escala
- Estratégia recomendada: Cache de verificação por telefone/evento, TTL curto

---

### 💀 DETECÇÃO DE CÓDIGO MORTO
**❌ Código Não Utilizado:**
- Imports não usados: Nenhum identificado
- Variáveis declaradas não usadas: Nenhuma relevante
- Funções não chamadas: Nenhuma
- Props não utilizadas: N/A
- CSS classes não aplicadas: N/A

**🔄 Código Duplicado:**
- Lógica repetida: Validação de campos semelhante a outros endpoints
- Componentes similares: N/A
- Constantes duplicadas: Nomes de campos repetidos

**📦 Dependências Mortas:**
- Bibliotecas não utilizadas: Nenhuma
- Versões conflituantes: Não identificado
- Polyfills desnecessários: Não identificado

---

### 🔧 PLANO DE MELHORIAS
**🎯 Prioridade CRÍTICA (0-7 dias):**
1. Revisar logs para evitar exposição de dados sensíveis em produção (impacto: ALTO, esforço: 1h)
2. Implementar rate limit para POST (impacto: ALTO, esforço: 2h)

**⚡ Prioridade ALTA (1-4 semanas):**
1. Otimizar consulta para uso de índice composto (impacto: MÉDIO, esforço: 2h)
2. Centralizar lógica de validação de campos (impacto: MÉDIO, esforço: 2h)

**📈 Prioridade MÉDIA (1-3 meses):**
1. Implementar cache para verificação de duplicatas (impacto: MÉDIO, esforço: 3h)
2. Adicionar autenticação mínima para POST (impacto: MÉDIO, esforço: 3h)

**🔮 Prioridade BAIXA (3+ meses):**
1. Revisar necessidade de logs detalhados em produção (impacto: BAIXO, esforço: 1h)
2. Avaliar uso de cache distribuído para alta escala (impacto: BAIXO, esforço: 2h)

--- 