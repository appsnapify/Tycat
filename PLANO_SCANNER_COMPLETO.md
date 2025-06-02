# PLANO COMPLETO - Sistema Scanner QR Code SNAP

> **Documento de Especificação Técnica Final**  
> **Versão:** 1.0  
> **Data:** Janeiro 2025  
> **Objetivo:** Sistema completo de scanner para funcionários com modo offline e pesquisa por nome

---

## 📊 **ESTADO ATUAL VERIFICADO**

### **✅ TABELAS EXISTENTES NO SUPABASE:**
- `guests` - Convidados (id, event_id, client_user_id, name, phone, qr_code_url, checked_in, check_in_time)
- `events` - Eventos (id, title, description, date, time, location, organization_id, is_published)
- `client_users` - Clientes registados (id, phone, email, first_name, last_name, birth_date)
- `organizations` - Organizações (id, name, address, contacts, logo_url, banner_url)
- `profiles` - Perfis de utilizadores (id, first_name, last_name, role)
- `user_organizations` - Relacionamento user-organização (user_id, organization_id, role)

### **✅ SISTEMA ATUAL FUNCIONAL:**
- Check-in organizador: `app/app/organizador/eventos/checkin/page.tsx`
- API de guests: `app/api/guests/route.ts`
- Scanner HTML5 funcional
- QR codes guest funcionando
- Sistema client_users completo

---

## 🏗️ **ARQUITETURA COMPLETA DO SISTEMA**

### **DOMÍNIOS:**
```
📱 ORGANIZADOR: app.snapify.com/organizador/eventos/checkin
├── Sistema atual + nova seção scanners
├── Criação rápida de funcionários
├── Dashboard tempo real
└── Gestão de sessões ativas

📱 FUNCIONÁRIOS: scan.snapify.com
├── Login ultrarrápido
├── Scanner otimizado mobile
├── Pesquisa por nome (NOVO!)
├── Modo offline robusto
└── Sync automática
```

---

## 🗄️ **NOVAS TABELAS NECESSÁRIAS**

### **1. SCANNERS DE EVENTOS:**
```sql
CREATE TABLE event_scanners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES profiles(id), -- organizador que criou
  
  -- Dados do scanner
  scanner_name VARCHAR(100) NOT NULL,
  username VARCHAR(50) NOT NULL,
  password_hash TEXT NOT NULL,
  access_token TEXT UNIQUE NOT NULL,
  
  -- Status e controlo
  is_active BOOLEAN DEFAULT true,
  max_concurrent_sessions INTEGER DEFAULT 1,
  
  -- Auditoria
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity TIMESTAMPTZ,
  device_info JSONB,
  
  UNIQUE(event_id, username),
  INDEX(event_id),
  INDEX(access_token)
);
```

### **2. SESSÕES ATIVAS:**
```sql
CREATE TABLE scanner_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scanner_id UUID NOT NULL REFERENCES event_scanners(id) ON DELETE CASCADE,
  
  -- Dados da sessão
  start_time TIMESTAMPTZ DEFAULT NOW(),
  end_time TIMESTAMPTZ,
  session_token TEXT UNIQUE NOT NULL,
  
  -- Device tracking
  device_fingerprint TEXT,
  ip_address INET,
  user_agent TEXT,
  
  -- Estatísticas
  total_scans INTEGER DEFAULT 0,
  successful_scans INTEGER DEFAULT 0,
  offline_scans INTEGER DEFAULT 0,
  last_sync TIMESTAMPTZ DEFAULT NOW(),
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  INDEX(scanner_id),
  INDEX(session_token),
  INDEX(start_time)
);
```

### **3. LOG DETALHADO DE SCANS:**
```sql
CREATE TABLE scan_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES scanner_sessions(id) ON DELETE CASCADE,
  guest_id UUID REFERENCES guests(id), -- pode ser NULL se scan inválido
  
  -- Dados do scan
  scan_time TIMESTAMPTZ DEFAULT NOW(),
  scan_method VARCHAR(20) NOT NULL, -- 'qr_code', 'manual_search', 'manual_entry'
  scan_result VARCHAR(20) NOT NULL, -- 'success', 'duplicate', 'invalid', 'not_found'
  
  -- Dados originais
  qr_code_raw TEXT, -- código QR original se aplicável
  search_query TEXT, -- termo pesquisado se foi por nome
  
  -- Status offline/online
  was_offline BOOLEAN DEFAULT false,
  sync_time TIMESTAMPTZ, -- quando sincronizou se estava offline
  
  -- Observações
  scanner_notes TEXT,
  error_details TEXT,
  
  INDEX(scan_time),
  INDEX(guest_id),
  INDEX(session_id),
  INDEX(scan_result)
);
```

### **4. CACHE OFFLINE:**
```sql
CREATE TABLE scanner_offline_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  scanner_id UUID NOT NULL REFERENCES event_scanners(id) ON DELETE CASCADE,
  
  -- Dados do cache
  cache_data JSONB NOT NULL, -- lista de guests + evento info
  cache_version INTEGER DEFAULT 1,
  
  -- Controlo de expiração
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(event_id, scanner_id),
  INDEX(event_id),
  INDEX(expires_at)
);
```

---

## 🎨 **INTERFACE ORGANIZADOR (Melhorias na Página Check-in)**

### **NOVA SEÇÃO: GESTÃO DE SCANNERS**
```
┌─────────────────────────────────────────────────────┐
│ 📱 SCANNERS PARA FUNCIONÁRIOS                       │
├─────────────────────────────────────────────────────┤
│ ➕ [Criar Novo Scanner]           📊 [Ver Todos]     │
│                                                     │
│ 👤 Scanner-João      🟢 Online    📱 [QR] [❌]      │
│    📱 iPhone Safari - IP: 192.168.1.45             │
│    ⏰ Ativo há 2h15m - 47 scans (3 offline)        │
│    📊 Última atividade: há 2 minutos               │
│                                                     │
│ 👤 Scanner-Maria     🟡 Inativo   📱 [QR] [❌]      │
│    📱 Samsung Chrome - Última: há 45 min           │
│    📊 Total hoje: 23 scans                         │
│                                                     │
│ 👤 Scanner-Pedro     🔴 Offline   📱 [QR] [❌]      │
│    📱 iPhone Safari - Offline há 10 min            │
│    ⚠️ 5 scans pendentes sincronização              │
│                                                     │
│ 📈 RESUMO: 70 entradas | 5 pendentes | 3 ativos    │
└─────────────────────────────────────────────────────┘
```

### **MODAL CRIAR SCANNER:**
```
┌─────────────────────────────────────────┐
│ ➕ Criar Scanner para Funcionário       │
├─────────────────────────────────────────┤
│ Nome Funcionário: [João Silva    ]      │
│ Username: [joao.silva      ]            │
│ Password: [●●●●●●●●●●      ]            │
│ 🔄 [Gerar Password Aleatória]           │
│                                         │
│ ☑️ Ativo imediatamente                  │
│ ☑️ Apenas este evento                   │
│ ☑️ Permitir pesquisa por nome           │
│ ☑️ Modo offline habilitado              │
│                                         │
│ [Cancelar]    [Criar Scanner]           │
└─────────────────────────────────────────┘
```

### **QR CODE E INSTRUÇÕES:**
```
┌─────────────────────────────────────────┐
│ 📱 Scanner Criado: João Silva           │
├─────────────────────────────────────────┤
│     ████████████████████                │
│     ██  QR CODE TO   ██                 │ ← Link scan.snapify.com
│     ██  SCAN LOGIN   ██                 │
│     ████████████████████                │
│                                         │
│ 🔗 Link: scan.snapify.com/evt_abc123    │
│ 👤 Username: joao.silva                 │
│ 🔑 Password: Snap2025! (copiar)         │
│                                         │
│ 📋 INSTRUÇÕES:                          │
│ 1. Abrir link no telemóvel              │
│ 2. Fazer login com dados acima          │
│ 3. Scanner ativa automaticamente        │
│ 4. Pode pesquisar por nome se precisar  │
│                                         │
│ [📱 Enviar WhatsApp] [📧 Email] [❌]     │
└─────────────────────────────────────────┘
```

### **DASHBOARD TEMPO REAL:**
```
┌─────────────────────────────────────────────────────┐
│ 📊 ENTRADAS EM TEMPO REAL                           │
├─────────────────────────────────────────────────────┤
│ 🕐 16:42:33 ✅ Ana Silva (Scanner-João/QR)          │
│ 🕐 16:42:12 🔍 Pedro Costa (Scanner-Maria/Nome)     │
│ 🕐 16:41:58 ⚠️ DUPLICADO: Rita Santos (Scanner-João)│
│ 🕐 16:41:45 ✅ Carlos Lima (Organizador/Direto)     │
│ 🕐 16:41:20 🔄 OFFLINE: 2 scans pendentes (Pedro)   │
│ 🕐 16:40:55 ✅ Marta Rocha (Scanner-Maria/QR)       │
│                                                     │
│ 📈 STATS: 156/200 | 🟢 3 online | ⚠️ 5 pendentes   │
│ [📊 Relatório Completo] [📧 Export] [🔄 Refresh]    │
└─────────────────────────────────────────────────────┘
```

---

## 📱 **SISTEMA SCANNER (scan.snapify.com)**

### **LOGIN OTIMIZADO:**
```
┌─────────────────────────────────────┐
│ 🎫 SNAP Scanner                     │
│ Entrada Rápida para Funcionários    │
├─────────────────────────────────────┤
│                                     │
│ Username: [             ]           │
│ Password: [             ]           │
│                                     │
│ [🚀 Entrar no Scanner]              │
│                                     │
│ 📱 Otimizado para telemóvel         │
│ 🔄 Funciona sem internet            │
│ 🔍 Pesquisa por nome disponível     │
│                                     │
│ ────────────────────────────────────│
│ 💡 Primeira vez? Peça QR code       │
│    ao organizador do evento         │
└─────────────────────────────────────┘
```

### **INTERFACE PRINCIPAL:**
```
┌─────────────────────────────────────┐
│ 🎫 João • Evento: Festa de Verão    │ ← Header com info
├─────────────────────────────────────┤
│                                     │
│   📷 SCANNER QR ATIVO               │ ← Área principal
│                                     │
│   ┌─────────────────────────────┐   │
│   │                             │   │
│   │     🎯 APONTE AQUI          │   │ ← Overlay visual
│   │       QR CODE               │   │
│   │                             │   │
│   └─────────────────────────────┘   │
│                                     │
├─────────────────────────────────────┤
│ ✅ Ana Silva - 16:42:33             │ ← Último scan
│ 📞 +351 91 999 8888                 │
├─────────────────────────────────────┤
│ 📊 47/200 | 🟢 Online | 0 pendentes │ ← Status em tempo real
├─────────────────────────────────────┤
│ [🔍 Nome] [📝 Manual] [📊] [⚙️]     │ ← Ações rápidas
└─────────────────────────────────────┘
```

### **NOVA FUNCIONALIDADE: PESQUISA POR NOME** 🔍
```
┌─────────────────────────────────────┐
│ 🔍 Pesquisar Convidado por Nome     │
├─────────────────────────────────────┤
│ Cliente esqueceu QR code?           │
│ Pesquise pelo nome:                 │
│                                     │
│ 🔍 [Ana Silva          ] [Buscar]   │
│                                     │
│ 📋 RESULTADOS:                      │
│ ┌─────────────────────────────────┐ │
│ │ ✅ Ana Silva Santos             │ │
│ │ 📞 +351 91 999 8888             │ │
│ │ [✅ Confirmar Entrada]          │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ 🔄 Ana Silva Costa              │ │
│ │ 📞 +351 93 777 5555             │ │
│ │ ⚠️ JÁ FEZ CHECK-IN (16:30)      │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [🔙 Voltar Scanner] [🔍 Nova Busca] │
└─────────────────────────────────────┘
```

### **MODO OFFLINE COM PESQUISA:**
```
┌─────────────────────────────────────┐
│ 🔄 MODO OFFLINE - João              │
├─────────────────────────────────────┤
│ ⚠️ Sem conexão • Funcionando local  │
│ 📱 143 convidados em cache          │
│                                     │
│ 📷 Scanner QR + 🔍 Pesquisa         │
│ [Ambos funcionam offline]           │
│                                     │
├─────────────────────────────────────┤
│ ✅ Carlos Silva - 16:45:22          │
│ ⏳ Aguarda sincronização (3 total)  │
├─────────────────────────────────────┤
│ 📊 52 total | 🔄 3 pendentes        │
│ 📡 Tentando reconectar... (2 min)   │
├─────────────────────────────────────┤
│ [🔍 Nome] [📝 Manual] [📊] [🔄]     │
└─────────────────────────────────────┘
```

---

## 🔍 **SISTEMA DE PESQUISA POR NOME**

### **FUNCIONALIDADES INTELIGENTES:**

**1. PESQUISA FUZZY:**
```javascript
// Busca inteligente que encontra resultados similares
searchGuests("ana silva") 
// Encontra: "Ana Silva", "Ana da Silva", "Ana Silva Santos"

searchGuests("joao")
// Encontra: "João", "João Pedro", "Joao Silva" (sem acentos)
```

**2. PESQUISA POR TELEFONE:**
```javascript
// Se digitarem números, busca por telefone
searchGuests("91999")
// Encontra convidados com telefone +351 91 999 xxxx
```

**3. CACHE OFFLINE COMPLETO:**
```javascript
// Cache inclui todos os dados para pesquisa offline
const offlineCache = {
  event: { id, name, date },
  guests: [
    { 
      id, name, phone, 
      searchTerms: ["ana", "silva", "ana silva", "ana s", "919998888"]
    }
    // ... todos os convidados com termos de pesquisa pre-processados
  ]
}
```

### **VALIDAÇÕES DE SEGURANÇA:**
- ✅ Só mostra convidados do evento atual
- ✅ Não mostra dados sensíveis completos
- ✅ Log de todas as pesquisas
- ✅ Rate limiting (máx 10 pesquisas/minuto)

---

## 🔄 **MODO OFFLINE ROBUSTO**

### **ESTRATÉGIA DE CACHE:**

**1. DADOS CACHADOS NO LOGIN:**
```javascript
const cacheData = {
  event: {
    id: "evt_123",
    name: "Festa de Verão", 
    date: "2025-07-15",
    capacity: 200
  },
  guests: [
    {
      id: "guest_456",
      name: "Ana Silva",
      phone: "+351919998888", 
      qr_codes: ["qr_789", "guest_456"], // múltiplos formatos
      searchTerms: ["ana", "silva", "ana silva", "919998888"],
      checked_in: false,
      vip: false
    }
    // ... até 1000 convidados (limite)
  ],
  scanner: {
    id: "scanner_abc", 
    name: "João Silva",
    permissions: ["scan_qr", "search_name", "manual_entry"]
  },
  metadata: {
    cached_at: "2025-01-15T14:30:00Z",
    version: 3,
    expires_at: "2025-01-16T02:00:00Z" // expira 12h depois
  }
}
```

**2. SINCRONIZAÇÃO INTELIGENTE:**
```javascript
// Sync em background a cada 30 segundos
setInterval(async () => {
  if (navigator.onLine) {
    await syncPendingScans()
    await updateCacheIfNeeded()
  }
}, 30000)

// Sync prioritária quando volta online
window.addEventListener('online', async () => {
  await urgentSync() // envia tudo imediatamente
})
```

**3. GESTÃO DE CONFLITOS:**
```javascript
// Se mesmo convidado foi escaneado online e offline
const conflictResolution = {
  rule: "primeiro_timestamp_ganha",
  backup: "manter_ambos_com_flag",
  notify: "organizador_via_dashboard"
}
```

---

## 🔐 **SEGURANÇA E AUDITORIA**

### **AUTENTICAÇÃO DE SCANNERS:**
```javascript
// Token único por scanner com expiração
const scannerAuth = {
  username: "joao.silva",
  password_hash: bcrypt.hash("Snap2025!"),
  access_token: "scanner_token_" + crypto.randomUUID(),
  session_token: "session_" + Date.now() + "_" + random(),
  expires_at: "2025-01-16T23:59:59Z" // expira com o evento
}
```

### **PERMISSÕES GRANULARES:**
```javascript
const scannerPermissions = {
  can_scan_qr: true,
  can_search_name: true, // NOVA PERMISSÃO
  can_manual_entry: false, // organizador decide
  can_view_stats: true,
  can_override_duplicate: false, // só organizador
  max_scans_per_hour: 200,
  event_access: ["evt_123"] // só eventos específicos
}
```

### **AUDITORIA COMPLETA:**
```sql
-- Todo scan é logado com detalhes completos
INSERT INTO scan_logs (
  session_id,
  guest_id,
  scan_time,
  scan_method, -- 'qr_code' | 'name_search' | 'manual_entry' 
  scan_result,
  qr_code_raw, -- código QR original se aplicável
  search_query, -- termo pesquisado se foi busca por nome
  was_offline,
  scanner_notes -- observações do funcionário se houver
);
```

---

## 🚀 **FASES DE IMPLEMENTAÇÃO**

### **FASE 1: FUNDAÇÃO (1 semana)**
- ✅ Criar tabelas: `event_scanners`, `scanner_sessions`, `scan_logs`
- ✅ Setup subdomain `scan.snapify.com` 
- ✅ API básica autenticação scanner
- ✅ Interface login mobile-optimized

### **FASE 2: CORE SCANNER (1 semana)**
- ✅ Sistema criar scanners (página organizador)
- ✅ Scanner QR funcional (adaptar existente)
- ✅ API scan com log detalhado
- ✅ Dashboard tempo real básico

### **FASE 3: PESQUISA POR NOME (3 dias)**
- ✅ Interface pesquisa nome no scanner
- ✅ API pesquisa fuzzy + telefone
- ✅ Cache de pesquisa offline
- ✅ Validações e segurança

### **FASE 4: MODO OFFLINE (1 semana)**
- ✅ Cache robusto no login
- ✅ Validação offline (QR + nome)
- ✅ Sincronização automática
- ✅ Gestão de conflitos

### **FASE 5: POLISH (3 dias)**
- ✅ PWA (instalar como app)
- ✅ Notificações push
- ✅ Estatísticas avançadas
- ✅ Export relatórios detalhados

---

## 📱 **EXPERIÊNCIA DO UTILIZADOR**

### **CENÁRIO 1: FUNCIONAMENTO NORMAL**
1. **Organizador** cria scanner em 30 segundos
2. **Funcionário** recebe QR code via WhatsApp
3. **Login** em 10 segundos no telemóvel
4. **Scanner** ativa automaticamente
5. **Scan QR** → feedback imediato → próximo cliente

### **CENÁRIO 2: CLIENTE SEM QR CODE**
1. **Cliente** chega sem QR code
2. **Funcionário** toca "🔍 Nome"
3. **Digita** "ana silva" 
4. **Seleciona** Ana Silva Santos da lista
5. **Confirma** entrada → cliente passa

### **CENÁRIO 3: SEM INTERNET**
1. **Internet** falha no meio do evento
2. **Scanner** continua a funcionar
3. **QR codes** e **pesquisa nome** funcionam
4. **Scans** ficam em fila local
5. **Internet volta** → sync automática

### **CENÁRIO 4: MÚLTIPLOS SCANNERS**
1. **5 funcionários** trabalham simultaneamente
2. **Cada scan** aparece no dashboard organizador
3. **Duplicados** são detectados e alertados
4. **Estatísticas** atualizadas em tempo real
5. **Relatório final** exportado automaticamente

---

## 📊 **MÉTRICAS DE SUCESSO**

### **PERFORMANCE:**
- ✅ Login scanner: < 10 segundos
- ✅ Scan QR + feedback: < 2 segundos  
- ✅ Pesquisa nome + resultados: < 3 segundos
- ✅ Sync offline → online: < 30 segundos
- ✅ Cache offline válido: 12 horas

### **USABILIDADE:**
- ✅ Organizador cria scanner: < 60 segundos
- ✅ Funcionário aprende interface: < 5 minutos
- ✅ Taxa sucesso primeira tentativa: > 95%
- ✅ Zero perda de dados offline/online

### **CAPACIDADE:**
- ✅ 5 scanners simultâneos por evento
- ✅ 1000+ convidados em cache offline
- ✅ 200+ scans/hora por scanner
- ✅ 10,000+ scans/evento total

---

## 🎯 **RESULTADO FINAL**

### **PARA O ORGANIZADOR:**
- ✅ **Criação instantânea** de scanners para funcionários
- ✅ **Dashboard tempo real** com todas as entradas
- ✅ **Zero preocupações técnicas** - tudo funciona automaticamente  
- ✅ **Auditoria completa** - sabe exatamente quem entrou quando e como
- ✅ **Relatórios detalhados** para análise posterior

### **PARA O FUNCIONÁRIO:**
- ✅ **Login ultrarrápido** via QR code ou link
- ✅ **Interface intuitiva** otimizada para telemóvel
- ✅ **Scanner sempre funciona** mesmo sem internet
- ✅ **Pesquisa por nome** quando cliente esquece QR code
- ✅ **Feedback claro** para cada ação

### **PARA O CLIENTE:**
- ✅ **Entrada rápida** com QR code
- ✅ **Alternativa por nome** se esquecer código
- ✅ **Sem filas** devido à eficiência dos scanners
- ✅ **Experiência consistente** independente do funcionário

### **PARA O SISTEMA:**
- ✅ **100% uptime** mesmo com falhas de internet
- ✅ **Escalável** para eventos grandes
- ✅ **Seguro** com auditoria completa
- ✅ **Robusto** com backup e recovery automático

---

## 🚀 **IMPLEMENTAÇÃO PRÁTICA**

### **ESTRUTURA DE FICHEIROS:**
```
app/
├── scanner/                         # Novo: scan.snapify.com
│   ├── login/page.tsx              # Login funcionários
│   ├── dashboard/page.tsx          # Scanner principal  
│   ├── search/page.tsx             # Pesquisa por nome
│   └── components/
│       ├── QRScanner.tsx           # Scanner melhorado
│       ├── NameSearch.tsx          # NOVO: Pesquisa nome
│       ├── OfflineSync.tsx         # Gestão offline
│       └── ScannerStats.tsx        # Stats em tempo real

app/organizador/eventos/checkin/     # Melhorar existente
├── page.tsx                        # + Seção gestão scanners
└── components/
    ├── ScannerManager.tsx          # NOVO: Gestão scanners
    ├── CreateScanner.tsx           # NOVO: Criar scanner
    └── RealTimeDashboard.tsx       # NOVO: Dashboard tempo real

api/
├── scanner/
│   ├── auth/route.ts               # Autenticação scanners
│   ├── create/route.ts             # Criar scanner
│   ├── scan/route.ts               # Processar scans
│   ├── search/route.ts             # NOVO: API pesquisa nome
│   └── sync/route.ts               # Sync offline
└── guests/                         # Melhorar existente
    └── route.ts                    # + Suporte pesquisa

lib/
├── scanner/
│   ├── auth.ts                     # Sistema auth scanner
│   ├── cache.ts                    # Cache offline robusto
│   ├── search.ts                   # NOVO: Engine pesquisa nome
│   └── sync.ts                     # Sincronização inteligente
```

### **NEXT STEPS:**
1. **Aprovar este plano** completo
2. **Criar branch** `feature/scanner-system`
3. **Implementar Fase 1** (fundação)
4. **Testar** com evento pequeno
5. **Iterar** baseado em feedback
6. **Deploy** gradual para produção

---

**Este sistema transformará completamente a experiência de entrada em eventos, oferecendo flexibilidade, robustez e facilidade de uso tanto para organizadores quanto para funcionários! 🎉** 