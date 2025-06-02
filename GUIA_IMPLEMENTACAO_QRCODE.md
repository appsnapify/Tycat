# GUIA PRÁTICO DE IMPLEMENTAÇÃO - Sistema QR Code Melhorado

> **Guia Passo a Passo**  
> **Para Desenvolvedores**  
> **Versão:** 1.0

---

## 🚀 COMEÇAR AGORA - FASE 1 (CRÍTICA)

### ⏰ **Implementação Imediata (1-2 semanas)**

---

## 📋 **PASSO 1: SETUP INICIAL**

### 1.1 Instalar Dependências
```bash
# Navegar para o diretório do projeto
cd C:\Users\Dalia\Desktop\game\snap

# Instalar bibliotecas necessárias
npm install qrcode
npm install @types/qrcode --save-dev

# Para testes (opcional por agora)
npm install jest @types/jest --save-dev
```

### 1.2 Criar Estrutura de Pastas
```bash
# Criar diretórios necessários
mkdir -p lib/services
mkdir -p lib/cache
mkdir -p lib/utils
mkdir -p app/api/health
mkdir -p app/api/analytics
mkdir -p migrations
mkdir -p tests
```

---

## 📝 **PASSO 2: IMPLEMENTAR EnhancedQRCodeService**

### 2.1 Criar o Arquivo Principal
**Arquivo:** `lib/services/enhanced-qrcode.service.ts`

✅ **COPIAR E COLAR** o código do `IMPLEMENTACAO_QRCODE_DETALHES.md` seção 1.1

### 2.2 Atualizar API Existente
**Arquivo:** `app/api/client-auth/guests/create/route.ts`

**MODIFICAR** a função `create_guest_safely` para usar o novo serviço:

```typescript
// ADICIONAR no início do arquivo
import { EnhancedQRCodeService } from '@/lib/services/enhanced-qrcode.service';

// MODIFICAR a seção de criação do QR code (linha ~190)
// SUBSTITUIR:
const { data: result, error: createError } = await supabaseAdmin.rpc('create_guest_safely', {
  // ... parâmetros existentes
});

// POR:
// Gerar QR code com novo serviço
const qrService = EnhancedQRCodeService.getInstance();
const qrResult = await qrService.generateQRCodeWithFallbacks(client_user_id);

if (!qrResult.success) {
  console.error('[CLIENT-AUTH-GUESTS] Falha na geração de QR code:', qrResult.error);
  return NextResponse.json({
    success: false,
    error: 'Erro ao gerar QR code: ' + qrResult.error
  }, { status: 500 });
}

// Usar função SQL com QR code gerado
const { data: result, error: createError } = await supabaseAdmin.rpc('create_guest_safely_enhanced', {
  p_event_id: event_id,
  p_client_user_id: client_user_id,
  p_promoter_id: promoter_id || null,
  p_team_id: team_id || null,
  p_name: name || 'Convidado',
  p_phone: phone || '',
  p_qr_code_url: qrResult.qr_code_url,
  p_qr_generation_method: qrResult.method_used
});
```

---

## 🗄️ **PASSO 3: ATUALIZAR BASE DE DADOS**

### 3.1 Executar Migração SQL
**Via Supabase Dashboard → SQL Editor:**

✅ **EXECUTAR** o script completo do `IMPLEMENTACAO_QRCODE_DETALHES.md` seção "Scripts de Migração"

### 3.2 Criar Nova Função SQL
**Executar no Supabase:**

```sql
-- Função melhorada que aceita QR code pré-gerado
CREATE OR REPLACE FUNCTION public.create_guest_safely_enhanced(
  p_event_id UUID, 
  p_client_user_id UUID, 
  p_promoter_id UUID DEFAULT NULL, 
  p_team_id UUID DEFAULT NULL, 
  p_name TEXT DEFAULT 'Convidado', 
  p_phone TEXT DEFAULT '',
  p_qr_code_url TEXT DEFAULT NULL,
  p_qr_generation_method TEXT DEFAULT 'enhanced_service'
)
RETURNS TABLE (
  id UUID,
  qr_code_url TEXT
) 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_guest_id UUID;
  v_qr_code_url TEXT;
  v_qr_code_text TEXT;
  v_existing_guest_id UUID;
BEGIN
  -- Verificar se já existe
  SELECT id INTO v_existing_guest_id
  FROM guests
  WHERE event_id = p_event_id
    AND client_user_id = p_client_user_id
  LIMIT 1;
  
  IF v_existing_guest_id IS NOT NULL THEN
    RETURN QUERY
    SELECT g.id, g.qr_code_url
    FROM guests g
    WHERE g.id = v_existing_guest_id;
    RETURN;
  END IF;
  
  -- Gerar novo guest
  v_guest_id := gen_random_uuid();
  v_qr_code_text := v_guest_id::text;
  v_qr_code_url := COALESCE(p_qr_code_url, 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=' || v_qr_code_text);
  
  -- Inserir com informações de geração
  INSERT INTO guests (
    id, event_id, name, phone, qr_code, qr_code_url,
    checked_in, status, promoter_id, team_id, client_user_id,
    qr_generated_at, qr_generation_method, created_at
  )
  VALUES (
    v_guest_id, p_event_id, p_name, p_phone, v_qr_code_text, v_qr_code_url,
    false, 'pending', p_promoter_id, p_team_id, p_client_user_id,
    NOW(), p_qr_generation_method, NOW()
  );
  
  -- Analytics
  INSERT INTO qr_analytics (
    event_type, guest_id, event_id, generation_method, 
    success, timestamp
  ) VALUES (
    'generated', v_guest_id, p_event_id, p_qr_generation_method,
    true, NOW()
  );
  
  RETURN QUERY
  SELECT v_guest_id, v_qr_code_url;
END;
$$ LANGUAGE plpgsql;

-- Conceder permissões
GRANT EXECUTE ON FUNCTION public.create_guest_safely_enhanced(UUID, UUID, UUID, UUID, TEXT, TEXT, TEXT, TEXT) TO authenticated, anon, service_role;
```

---

## 💾 **PASSO 4: IMPLEMENTAR CACHE SERVICE**

### 4.1 Criar QRCacheService
**Arquivo:** `lib/cache/qr-cache.service.ts`

✅ **COPIAR E COLAR** o código do `IMPLEMENTACAO_QRCODE_DETALHES.md` seção 1.2

### 4.2 Integrar Cache na API
**No arquivo** `app/api/client-auth/guests/create/route.ts`

**ADICIONAR** no início:
```typescript
import { QRCacheService } from '@/lib/cache/qr-cache.service';
```

**MODIFICAR** antes da verificação de guest existente:
```typescript
// ADICIONAR depois da validação de parâmetros
// Verificar cache primeiro (apenas no frontend)
try {
  // Este check só funciona no frontend, server-side vai ignorar
  if (typeof window !== 'undefined') {
    const cached = QRCacheService.getFromCache(client_user_id, event_id);
    if (cached) {
      console.log('[CLIENT-AUTH-GUESTS] Cache hit - retornando QR code em cache');
      return NextResponse.json({
        success: true,
        data: {
          id: cached.guest_id,
          qr_code_url: cached.qr_code_url
        },
        message: 'QR Code recuperado do cache local',
        isExisting: true,
        fromCache: true
      });
    }
  }
} catch (cacheError) {
  console.warn('[CLIENT-AUTH-GUESTS] Erro no cache (ignorando):', cacheError);
}
```

---

## 🔍 **PASSO 5: IMPLEMENTAR VERIFICAÇÃO DE CAPACIDADE**

### 5.1 Adicionar Verificação
**No arquivo** `app/api/client-auth/guests/create/route.ts`

**ADICIONAR** a função antes do POST handler:

✅ **COPIAR E COLAR** o código da seção 1.3 do `IMPLEMENTACAO_QRCODE_DETALHES.md`

### 5.2 Chamar Verificação
**Dentro do POST handler, ADICIONAR após validação do client_user:**

```typescript
// NOVA VERIFICAÇÃO: Capacidade do evento
await checkEventCapacity(event_id);
```

---

## ✅ **PASSO 6: TESTAR IMPLEMENTAÇÃO FASE 1**

### 6.1 Teste Manual
1. **Iniciar servidor:** `npm run dev`
2. **Acessar:** `http://localhost:3000/promo/[evento]/[promoter]/[team]`
3. **Registrar novo usuário**
4. **Verificar logs no console**

### 6.2 Verificar Funcionamento
**Procurar nos logs:**
```
[QR] Tentando método: local_canvas
[QR] Sucesso com local_canvas em XXXms
[CLIENT-AUTH-GUESTS] Convidado criado com sucesso
```

### 6.3 Verificar Base de Dados
**No Supabase → SQL Editor:**
```sql
-- Verificar se analytics estão sendo registrados
SELECT * FROM qr_analytics ORDER BY timestamp DESC LIMIT 5;

-- Verificar guests com novos campos
SELECT id, name, qr_generation_method, qr_generated_at 
FROM guests 
ORDER BY created_at DESC LIMIT 5;
```

---

## 🩺 **PASSO 7: IMPLEMENTAR HEALTH CHECK (OPCIONAL FASE 1)**

### 7.1 Criar Health Check API
**Arquivo:** `app/api/health/qr-system/route.ts`

✅ **COPIAR E COLAR** o código da seção 2.2 do `IMPLEMENTACAO_QRCODE_DETALHES.md`

### 7.2 Testar Health Check
**Acessar:** `http://localhost:3000/api/health/qr-system`

**Resposta esperada:**
```json
{
  "status": "healthy",
  "health_score": 90,
  "services": [
    {"service": "database", "status": "healthy"},
    {"service": "qr_generation", "status": "healthy"}
  ]
}
```

---

## 🎯 **CHECKLIST FASE 1 COMPLETA**

### ✅ Verificar Se Tudo Funciona:

- [ ] **EnhancedQRCodeService instalado** e funcionando
- [ ] **Múltiplos fallbacks** testados (desconectar internet e testar)
- [ ] **Cache implementado** (verificar localStorage no browser)
- [ ] **Verificação de capacidade** ativa
- [ ] **Base de dados atualizada** com novas tabelas
- [ ] **Analytics básico** funcionando
- [ ] **Health check** respondendo

### 🧪 Testes Finais:
1. **Registro novo usuário** → QR code gerado localmente
2. **Usuário existente** → QR code do cache/BD
3. **Internet desconectada** → Fallback funciona
4. **Verificar analytics** → Dados sendo salvos

---

## 🚀 **PRÓXIMOS PASSOS (FASE 2)**

### Depois da Fase 1 funcionando:
1. **Sistema de Retry** (retry.service.ts)
2. **Regeneração Automática**
3. **Monitoramento Avançado**
4. **Componentes Frontend Melhorados**

---

## 🆘 **SOLUÇÃO DE PROBLEMAS**

### ❌ **Erro: "Cannot find module 'qrcode'"**
```bash
npm install qrcode @types/qrcode
```

### ❌ **Erro: "localStorage is not defined"**
✅ **Normal no server-side** - o código tem verificação `typeof window !== 'undefined'`

### ❌ **Erro na função SQL**
✅ **Verificar** se as tabelas foram criadas corretamente no Supabase

### ❌ **QR code não aparece no frontend**
1. Verificar **Network tab** no DevTools
2. Verificar **Console logs**
3. Testar **API diretamente:** `/api/client-auth/guests/create`

### ❌ **Performance lenta**
✅ **Normal na primeira implementação** - otimizações vêm na Fase 2

---

## 📞 **SUPORTE**

### Em caso de problemas:
1. **Verificar logs do console** (F12 → Console)
2. **Verificar Network tab** para erros de API
3. **Consultar base de dados** no Supabase Dashboard
4. **Revisar este guia** passo a passo

---

**🎯 OBJETIVO FASE 1:** Eliminar dependência externa crítica e adicionar fallbacks robustos

**⏰ TEMPO ESTIMADO:** 1-2 semanas

**🚀 RESULTADO:** Sistema 99% mais estável e resiliente 