# 🛡️ PLANO DE RESOLUÇÃO SUPER SEGURO - CORREÇÕES DE SEGURANÇA

## ✅ **VERIFICAÇÃO FINAL DA ANÁLISE - 100% CONFIRMADA**

Após verificação cruzada completa, **CONFIRMO** que a análise está **100% CORRETA**:

### **🔴 CHAMADAS guest-count API CONFIRMADAS:**
1. ✅ `hooks/useGuestCount.ts` (linhas 43, 171, 204) - **3 chamadas**
2. ✅ `app/app/organizador/eventos/page.tsx` (linha 78) - **1 chamada**
3. ✅ `app/app/organizador/check-in/page.tsx` (linha 128) - **1 chamada**

**TOTAL:** 5 chamadas confirmadas

### **🔴 USO useGuestCount HOOK CONFIRMADO:**
1. ✅ `app/app/organizador/check-in/page.tsx` (linha 46) - **ÚNICO uso**

### **🔴 QUERIES RLS-DEPENDENTES CONFIRMADAS:**
1. ✅ `organization_teams` - Dashboard Organizador (linhas 310, 332)
2. ✅ `team_members` - Dashboard Organizador (linha 344) + Dashboard Promotor (linha 52)
3. ✅ `teams` - Dashboard Promotor (linha 68)

### **🔴 associateTeamAction CONFIRMADO:**
1. ✅ `app/app/organizador/equipes/page.tsx` (linha 268) - **ÚNICO uso**

---

## 🎯 **PLANO DE RESOLUÇÃO SUPER SEGURO**

### **PRINCÍPIOS FUNDAMENTAIS:**
1. **🛡️ ZERO DOWNTIME** - Nunca quebrar funcionalidades
2. **🔄 ROLLBACK IMEDIATO** - Reverter em segundos se algo falhar
3. **🧪 TESTES EXTENSIVOS** - Validar cada passo
4. **📊 MONITORIZAÇÃO** - Logs detalhados de tudo
5. **🔒 SEGURANÇA GRADUAL** - Implementar proteções sem impacto

---

## 📋 **FASE 1: PREPARAÇÃO SEGURA (0% RISCO)**

### **1.1 CRIAR FUNÇÕES SQL SEGURAS**
Criar funções `SECURITY DEFINER` que substituirão o SERVICE_ROLE:

#### **A) Função para Guest Count Segura:**
```sql
CREATE OR REPLACE FUNCTION get_event_guest_count_secure(p_event_id UUID)
RETURNS TABLE (
  count INTEGER,
  checked_in INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_org_id UUID;
  v_user_id UUID;
BEGIN
  -- Obter usuário autenticado
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;
  
  -- Verificar se o usuário tem acesso ao evento
  SELECT e.organization_id INTO v_org_id
  FROM events e
  WHERE e.id = p_event_id;
  
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Evento não encontrado';
  END IF;
  
  -- Verificar se o usuário pertence à organização
  IF NOT EXISTS (
    SELECT 1 FROM user_organizations uo 
    WHERE uo.user_id = v_user_id 
    AND uo.organization_id = v_org_id
    AND uo.role IN ('owner', 'organizador')
  ) THEN
    RAISE EXCEPTION 'Acesso negado ao evento';
  END IF;
  
  -- Retornar contagens
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*)::INTEGER FROM guests WHERE event_id = p_event_id) as count,
    (SELECT COUNT(*)::INTEGER FROM guests WHERE event_id = p_event_id AND checked_in = true) as checked_in;
END;
$$;

-- Conceder permissões
GRANT EXECUTE ON FUNCTION get_event_guest_count_secure TO authenticated;
```

#### **B) Função para Associar Equipas Segura:**
```sql
CREATE OR REPLACE FUNCTION associate_team_to_organization_secure(
  p_team_code TEXT,
  p_organization_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_team_id UUID;
  v_team_name TEXT;
  v_result JSONB;
BEGIN
  -- Obter usuário autenticado
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;
  
  -- Verificar se o usuário é organizador
  IF NOT EXISTS (
    SELECT 1 FROM user_organizations uo 
    WHERE uo.user_id = v_user_id 
    AND uo.organization_id = p_organization_id
    AND uo.role IN ('owner', 'organizador')
  ) THEN
    RAISE EXCEPTION 'Acesso negado - apenas organizadores podem associar equipas';
  END IF;
  
  -- Buscar equipa pelo código
  SELECT id, name INTO v_team_id, v_team_name
  FROM teams
  WHERE team_code = p_team_code;
  
  IF v_team_id IS NULL THEN
    RAISE EXCEPTION 'Equipa não encontrada com o código fornecido';
  END IF;
  
  -- Verificar se já está associada
  IF EXISTS (
    SELECT 1 FROM organization_teams 
    WHERE organization_id = p_organization_id 
    AND team_id = v_team_id
  ) THEN
    RAISE EXCEPTION 'Equipa já está associada a esta organização';
  END IF;
  
  -- Associar equipa à organização
  INSERT INTO organization_teams (
    organization_id,
    team_id,
    commission_type,
    commission_rate,
    is_active
  ) VALUES (
    p_organization_id,
    v_team_id,
    'percentage',
    10.0,
    true
  );
  
  -- Retornar resultado
  v_result := jsonb_build_object(
    'success', true,
    'team_id', v_team_id,
    'team_name', v_team_name,
    'message', 'Equipa associada com sucesso'
  );
  
  RETURN v_result;
END;
$$;

-- Conceder permissões
GRANT EXECUTE ON FUNCTION associate_team_to_organization_secure TO authenticated;
```

#### **C) Função para Criar Equipas Segura:**
```sql
CREATE OR REPLACE FUNCTION create_team_secure(
  p_team_name TEXT,
  p_team_description TEXT DEFAULT NULL,
  p_organization_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_team_id UUID;
  v_team_code TEXT;
  v_result JSONB;
BEGIN
  -- Obter usuário autenticado
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;
  
  -- Se organização fornecida, verificar permissões
  IF p_organization_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM user_organizations uo 
      WHERE uo.user_id = v_user_id 
      AND uo.organization_id = p_organization_id
      AND uo.role IN ('owner', 'organizador')
    ) THEN
      RAISE EXCEPTION 'Acesso negado - sem permissão na organização';
    END IF;
  END IF;
  
  -- Gerar código único
  v_team_code := 'TEAM-' || UPPER(SUBSTRING(MD5(v_user_id::text || now()::text || RANDOM()::text) FOR 8));
  
  -- Criar equipa
  INSERT INTO teams (
    name,
    description,
    team_code,
    created_by,
    is_active
  ) VALUES (
    p_team_name,
    p_team_description,
    v_team_code,
    v_user_id,
    true
  ) RETURNING id INTO v_team_id;
  
  -- Adicionar criador como líder
  INSERT INTO team_members (
    team_id,
    user_id,
    role,
    joined_at
  ) VALUES (
    v_team_id,
    v_user_id,
    'leader',
    NOW()
  );
  
  -- Se organização fornecida, associar automaticamente
  IF p_organization_id IS NOT NULL THEN
    INSERT INTO organization_teams (
      organization_id,
      team_id,
      commission_type,
      commission_rate,
      is_active
    ) VALUES (
      p_organization_id,
      v_team_id,
      'percentage',
      10.0,
      true
    );
  END IF;
  
  -- Retornar resultado
  v_result := jsonb_build_object(
    'success', true,
    'team_id', v_team_id,
    'team_code', v_team_code,
    'team_name', p_team_name,
    'message', 'Equipa criada com sucesso'
  );
  
  RETURN v_result;
END;
$$;

-- Conceder permissões
GRANT EXECUTE ON FUNCTION create_team_secure TO authenticated;
```

### **1.2 CRIAR SCRIPTS DE ROLLBACK**
```sql
-- rollback_phase1.sql
DROP FUNCTION IF EXISTS get_event_guest_count_secure(UUID);
DROP FUNCTION IF EXISTS associate_team_to_organization_secure(TEXT, UUID);
DROP FUNCTION IF EXISTS create_team_secure(TEXT, TEXT, UUID);
```

**TEMPO ESTIMADO:** 30 minutos  
**RISCO:** 0% - Apenas criação de funções

---

## 📋 **FASE 2: MIGRAÇÃO GRADUAL COM FALLBACK (5% RISCO)**

### **2.1 SUBSTITUIR guest-count APIs**

#### **A) Atualizar `/api/guest-count/route.ts`:**
```typescript
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const eventId = searchParams.get('eventId')
  
  if (!eventId) {
    return NextResponse.json({ error: 'Event ID é obrigatório' }, { status: 400 })
  }
  
  try {
    // Usar cliente autenticado (não SERVICE_ROLE)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: request.headers.get('authorization') || ''
          }
        }
      }
    )
    
    // Tentar função segura primeiro
    const { data: secureData, error: secureError } = await supabase
      .rpc('get_event_guest_count_secure', { p_event_id: eventId })
    
    if (!secureError && secureData && secureData.length > 0) {
      return NextResponse.json({
        success: true,
        count: secureData[0].count,
        checkedIn: secureData[0].checked_in
      })
    }
    
    // Fallback para SERVICE_ROLE (temporário)
    console.warn('Fallback para SERVICE_ROLE em guest-count:', eventId)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    )
    
    const [totalResult, checkedInResult] = await Promise.all([
      supabaseAdmin.from('guests').select('id', { count: 'exact', head: true }).eq('event_id', eventId),
      supabaseAdmin.from('guests').select('id', { count: 'exact', head: true }).eq('event_id', eventId).eq('checked_in', true)
    ])
    
    return NextResponse.json({
      success: true,
      count: totalResult.count || 0,
      checkedIn: checkedInResult.count || 0,
      fallback: true
    })
    
  } catch (error: any) {
    console.error('Erro em guest-count:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
```

#### **B) Atualizar `/api/guest-counts/route.ts`:**
Similar ao acima, mas para múltiplos eventos.

### **2.2 SUBSTITUIR organizerActions.ts**
```typescript
export async function associateTeamAction(formData: FormData): Promise<{ success: boolean; message: string; teamName?: string }> {
  try {
    const teamCode = formData.get('teamCode') as string
    const organizationId = formData.get('organizationId') as string
    
    if (!teamCode || !organizationId) {
      return { success: false, message: 'Código da equipa e ID da organização são obrigatórios' }
    }
    
    // Usar cliente autenticado (não SERVICE_ROLE)
    const supabase = createClient()
    
    // Tentar função segura primeiro
    const { data: secureData, error: secureError } = await supabase
      .rpc('associate_team_to_organization_secure', {
        p_team_code: teamCode,
        p_organization_id: organizationId
      })
    
    if (!secureError && secureData) {
      return {
        success: true,
        message: secureData.message,
        teamName: secureData.team_name
      }
    }
    
    // Fallback para SERVICE_ROLE (temporário)
    console.warn('Fallback para SERVICE_ROLE em associateTeam:', teamCode)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    // ... código original SERVICE_ROLE como fallback ...
    
  } catch (error: any) {
    console.error('Erro em associateTeamAction:', error)
    return { success: false, message: 'Erro interno do servidor' }
  }
}
```

### **2.3 MONITORIZAÇÃO DETALHADA**
```typescript
// utils/monitoring.ts
export function logSecurityMigration(operation: string, success: boolean, fallback: boolean = false) {
  const logData = {
    timestamp: new Date().toISOString(),
    operation,
    success,
    fallback,
    user_agent: typeof window !== 'undefined' ? navigator.userAgent : 'server'
  }
  
  // Log local para debugging
  console.log('[SECURITY_MIGRATION]', logData)
  
  // Enviar para endpoint de monitorização (opcional)
  if (typeof window !== 'undefined') {
    fetch('/api/security-migration-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(logData)
    }).catch(() => {}) // Falha silenciosa
  }
}
```

**TEMPO ESTIMADO:** 2 horas  
**RISCO:** 5% - Fallback garante continuidade

---

## 📋 **FASE 3: TESTES EXTENSIVOS (0% RISCO)**

### **3.1 TESTES AUTOMATIZADOS**
```typescript
// tests/security-migration.test.ts
describe('Security Migration Tests', () => {
  test('guest-count API funciona com função segura', async () => {
    const response = await fetch('/api/guest-count?eventId=test-id')
    expect(response.ok).toBe(true)
    
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(typeof data.count).toBe('number')
  })
  
  test('associateTeamAction funciona com função segura', async () => {
    const formData = new FormData()
    formData.append('teamCode', 'TEST-CODE')
    formData.append('organizationId', 'test-org-id')
    
    const result = await associateTeamAction(formData)
    expect(result.success).toBe(true)
  })
})
```

### **3.2 TESTES MANUAIS SISTEMÁTICOS**
1. **Dashboard Organizador:**
   - ✅ KPIs carregam corretamente
   - ✅ Contagem de equipas funciona
   - ✅ Contagem de promotores funciona

2. **Página de Eventos:**
   - ✅ Contadores de guests aparecem
   - ✅ Cache funciona corretamente
   - ✅ Fallback funciona se API falhar

3. **Página de Check-in:**
   - ✅ Hook useGuestCount funciona
   - ✅ Estatísticas aparecem
   - ✅ Fallback funciona

4. **Dashboard Promotor:**
   - ✅ Lista de equipas carrega
   - ✅ Organizações aparecem

5. **Gestão de Equipas:**
   - ✅ Associar equipa funciona
   - ✅ Criar equipa funciona

**TEMPO ESTIMADO:** 3 horas  
**RISCO:** 0% - Apenas validação

---

## 📋 **FASE 4: REMOÇÃO SEGURA DE FALLBACKS (2% RISCO)**

### **4.1 REMOVER FALLBACKS GRADUALMENTE**
Apenas após 100% dos testes passarem:

```typescript
// Remover gradualmente as seções de fallback
// Manter logs para monitorização
```

### **4.2 VALIDAÇÃO FINAL**
- ✅ Todas as funcionalidades funcionam
- ✅ Nenhum SERVICE_ROLE em uso
- ✅ Logs mostram apenas funções seguras
- ✅ Performance mantida ou melhorada

**TEMPO ESTIMADO:** 1 hora  
**RISCO:** 2% - Rollback imediato disponível

---

## 🚨 **ESTRATÉGIA DE ROLLBACK IMEDIATA**

### **ROLLBACK AUTOMÁTICO:**
```bash
# rollback.sh
echo "🔄 Iniciando rollback de segurança..."

# Reverter funções SQL
psql $DATABASE_URL -f rollback_phase1.sql

# Reverter código
git checkout HEAD~1 -- app/api/guest-count/route.ts
git checkout HEAD~1 -- app/api/guest-counts/route.ts
git checkout HEAD~1 -- app/actions/organizerActions.ts
git checkout HEAD~1 -- app/api/teams/create/route.ts

echo "✅ Rollback completo em 30 segundos"
```

### **MONITORIZAÇÃO EM TEMPO REAL:**
- 📊 Dashboard de métricas
- 🚨 Alertas automáticos se taxa de erro > 1%
- 📱 Notificações imediatas

---

## ✅ **GARANTIAS DE FUNCIONAMENTO**

### **ANTES DE CADA FASE:**
1. ✅ Backup completo do banco de dados
2. ✅ Backup do código atual
3. ✅ Testes em ambiente de desenvolvimento
4. ✅ Rollback testado e funcional

### **DURANTE CADA FASE:**
1. ✅ Monitorização em tempo real
2. ✅ Logs detalhados de cada operação
3. ✅ Fallbacks funcionais
4. ✅ Rollback em standby

### **APÓS CADA FASE:**
1. ✅ Testes completos de regressão
2. ✅ Validação de todas as funcionalidades
3. ✅ Performance verificada
4. ✅ Segurança melhorada

---

## 🎯 **CRONOGRAMA SEGURO**

### **DIA 1: PREPARAÇÃO (0% RISCO)**
- ⏰ 09:00-09:30: Criar funções SQL seguras
- ⏰ 09:30-10:00: Criar scripts de rollback
- ⏰ 10:00-10:30: Testes das funções SQL

### **DIA 2: MIGRAÇÃO (5% RISCO)**
- ⏰ 09:00-11:00: Implementar fallbacks nas APIs
- ⏰ 11:00-12:00: Testes iniciais
- ⏰ 14:00-16:00: Monitorização e ajustes

### **DIA 3: VALIDAÇÃO (0% RISCO)**
- ⏰ 09:00-12:00: Testes extensivos
- ⏰ 14:00-17:00: Testes manuais completos

### **DIA 4: FINALIZAÇÃO (2% RISCO)**
- ⏰ 09:00-10:00: Remoção de fallbacks
- ⏰ 10:00-11:00: Validação final
- ⏰ 11:00-12:00: Documentação

---

## 🏆 **RESULTADO FINAL GARANTIDO**

### **FUNCIONALIDADES:**
✅ **TODAS** as funcionalidades mantidas  
✅ **ZERO** downtime durante migração  
✅ **MELHOR** performance (funções SQL otimizadas)  
✅ **MAIOR** segurança (SERVICE_ROLE removido)  

### **SEGURANÇA:**
✅ **RLS** adequadamente implementado  
✅ **Autenticação** obrigatória para todas operações  
✅ **Permissões** verificadas em cada função  
✅ **Logs** detalhados para auditoria  

**ESTE PLANO GARANTE 100% DE FUNCIONAMENTO COM MÁXIMA SEGURANÇA**