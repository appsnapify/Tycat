# 🧪 PLANO DE TESTES SISTEMÁTICO - VALIDAÇÃO COMPLETA

## 🎯 **OBJETIVO**
Validar que **TODAS** as funcionalidades estão funcionando corretamente **ANTES** de remover os fallbacks SERVICE_ROLE.

---

## 📋 **CHECKLIST DE TESTES OBRIGATÓRIOS**

### **1. 🏠 DASHBOARDS - TESTES CRÍTICOS**

#### **📊 Dashboard Organizador** (`/app/organizador/dashboard`)
- [ ] **KPIs carregam** (eventos, equipas, promotores)
- [ ] **Contadores de guests** aparecem nos cards de eventos
- [ ] **Gráficos e estatísticas** são exibidos
- [ ] **Sem erros no console** do navegador
- [ ] **Logs mostram** se usa função segura ou fallback

#### **🎯 Dashboard Promotor** (`/app/promotor/dashboard`)  
- [ ] **Lista de equipas** carrega corretamente
- [ ] **Organizações** aparecem associadas
- [ ] **Estatísticas pessoais** são exibidas
- [ ] **Sem erros no console** do navegador

#### **👑 Dashboard Chefe de Equipa** (`/app/chefe-equipe/dashboard`)
- [ ] **Detalhes da equipa** carregam
- [ ] **Membros da equipa** são listados
- [ ] **Estatísticas da equipa** aparecem
- [ ] **Sem erros no console** do navegador

### **2. 📊 CONTADORES DE GUESTS**

#### **📈 Página de Eventos** (`/app/organizador/eventos`)
- [ ] **Contadores individuais** aparecem em cada evento
- [ ] **Cache funciona** (não recarrega constantemente)
- [ ] **Fallback funciona** se API falhar temporariamente
- [ ] **Performance adequada** (carregamento < 3 segundos)

#### **✅ Página de Check-in** (`/app/organizador/check-in`)
- [ ] **Hook useGuestCount** funciona
- [ ] **Estatísticas em tempo real** são exibidas
- [ ] **Totais e check-ins** estão corretos
- [ ] **Atualização automática** funciona

### **3. 👥 GESTÃO DE EQUIPAS**

#### **➕ Criar Equipa** (`/app/promotor/equipes/criar`, `/app/chefe-equipe/criar-equipe`)
- [ ] **Formulário funciona** corretamente
- [ ] **Código único** é gerado
- [ ] **Equipa é criada** na base de dados
- [ ] **Criador vira líder** automaticamente
- [ ] **Mensagem de sucesso** aparece

#### **🔗 Associar Equipa** (`/app/organizador/equipes/adicionar`)
- [ ] **Busca por código** funciona
- [ ] **Validação de código** está ativa
- [ ] **Associação** é feita corretamente
- [ ] **Equipa aparece** na lista da organização
- [ ] **Criador vira membro** da organização

#### **📋 Listar Equipas Disponíveis**
- [ ] **API /teams/available** retorna dados
- [ ] **Equipas não associadas** aparecem
- [ ] **Contagem de membros** está correta
- [ ] **Filtros funcionam** adequadamente

### **4. 🌍 PÁGINAS PÚBLICAS**

#### **🎪 Páginas do Promotor** (`/promotor/[userId]/[eventSlug]`)
- [ ] **Formulário de registo** carrega
- [ ] **QR Code** é gerado
- [ ] **Informações do evento** aparecem
- [ ] **Sem erros de autenticação**

### **5. 🔍 VALIDAÇÃO TÉCNICA**

#### **📊 Logs do Navegador**
- [ ] **Console limpo** (sem erros críticos)
- [ ] **Logs mostram** qual método é usado (secure/fallback)
- [ ] **Warnings apropriados** se fallback é usado
- [ ] **Performance adequada** (sem loops infinitos)

#### **🔧 Respostas das APIs**
- [ ] **guest-count** retorna `secure: true` ou `fallback: true`
- [ ] **guest-counts** funciona para múltiplos eventos
- [ ] **teams/create** retorna dados completos
- [ ] **teams/available** lista equipas corretamente
- [ ] **organizerActions** associa equipas com sucesso

#### **🛡️ Segurança**
- [ ] **Funções SQL** são chamadas primeiro
- [ ] **Fallback SERVICE_ROLE** só é usado se necessário
- [ ] **Logs de segurança** são registados
- [ ] **Permissões RLS** são respeitadas

---

## 🚀 **COMO TESTAR**

### **PASSO 1: Abrir DevTools**
```
F12 → Console → Network
```

### **PASSO 2: Testar Cada Dashboard**
1. Fazer login como **Organizador**
2. Ir para `/app/organizador/dashboard`
3. Verificar se KPIs carregam
4. Observar logs no console
5. Repetir para **Promotor** e **Chefe de Equipa**

### **PASSO 3: Testar Contadores**
1. Ir para `/app/organizador/eventos`
2. Verificar se contadores aparecem
3. Observar chamadas na aba **Network**
4. Procurar por `secure: true` ou `fallback: true`

### **PASSO 4: Testar Gestão de Equipas**
1. Criar nova equipa
2. Associar equipa existente
3. Verificar se processos completam
4. Confirmar dados na base de dados

### **PASSO 5: Validar Logs**
```javascript
// No console, procurar por:
"Função segura OK"           // ✅ Ideal
"Usando fallback SERVICE_ROLE" // ⚠️ Temporário OK
"Erro crítico"               // ❌ Problema
```

---

## ✅ **CRITÉRIOS DE SUCESSO**

### **🟢 APROVADO PARA FASE 4:**
- ✅ Todos os dashboards carregam
- ✅ Contadores funcionam
- ✅ Gestão de equipas funciona
- ✅ Logs mostram funções seguras sendo usadas
- ✅ Fallbacks funcionam quando necessário

### **🔴 NECESSITA CORREÇÃO:**
- ❌ Qualquer dashboard quebrado
- ❌ Contadores não aparecem
- ❌ Criar/associar equipas falha
- ❌ Erros críticos no console
- ❌ Funções seguras nunca são usadas

---

## 🎯 **PRÓXIMOS PASSOS**

1. **✅ TESTES PASSAM** → Proceder com Fase 4 (remoção de fallbacks)
2. **❌ TESTES FALHAM** → Corrigir problemas antes de continuar

**Este plano garante que nada será quebrado na Fase 4!** 🛡️