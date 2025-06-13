# 🍪 SUPABASE COOKIE PARSING ERROR - GUIA DE REFERÊNCIA

**Data:** Janeiro 2025  
**Status:** DOCUMENTADO - Solução Proposta  

## 🚨 PROBLEMA

### Erro Observado:
```
Failed to parse cookie string: SyntaxError: Unexpected token 'b', "base64-eyJ"... is not valid JSON
```

### Impacto:
- ❌ Console poluído (10-50+ erros por página)
- ❌ Warnings em todas as páginas
- ✅ Funcionalidade NÃO afetada

## 🔍 ANÁLISE

### Causa:
- Cookies Supabase corrompidos com formato `base64-eyJ...`
- Múltiplas instâncias de clientes Supabase
- Parsing direto falha: `JSON.parse("base64-eyJ...")` 

### Arquivos Afetados:
```
lib/supabase/client.ts - Cliente principal
hooks/useClientAuth.tsx - Auth cliente  
app/*/StatsComponents.tsx - Components
app/client/dashboard/page.tsx - Dashboard
app/scanner/*/page.tsx - Scanner system
```

## 🛠️ SOLUÇÕES TENTADAS

### ❌ Solução 1: Configuração Nativa
Remover configuração customizada de cookies → FALHOU

### ❌ Solução 2: Limpeza Cirúrgica  
Detectar e remover cookies corrompidos → FALHOU

## ✅ SOLUÇÃO RECOMENDADA

### Estratégia: "Correção em Tempo Real"
Interceptar `document.cookie` temporariamente e corrigir formato automaticamente.

### Implementação:
```typescript
function setupCookieCorrection() {
  if (typeof window === 'undefined') return;
  
  const originalDescriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie');
  
  Object.defineProperty(document, 'cookie', {
    get: function() {
      const cookies = originalDescriptor.get.call(this);
      return fixCorruptedSupabaseCookies(cookies);
    },
    set: originalDescriptor.set,
    configurable: true
  });
  
  setTimeout(() => {
    Object.defineProperty(document, 'cookie', originalDescriptor);
  }, 5000);
}

function fixCorruptedSupabaseCookies(cookieString) {
  if (!cookieString) return cookieString;
  
  return cookieString.replace(/([^=;]+)=base64-([^;]+)/g, (match, name, value) => {
    if (name.trim().includes('supabase')) {
      try {
        const decoded = atob(value);
        JSON.parse(decoded);
        return `${name.trim()}=${decoded}`;
      } catch {
        return `${name.trim()}=`;
      }
    }
    return match;
  });
}
```

### Vantagens:
- ✅ Preserva sessões ativas
- ✅ Não quebra sistemas (Scanner, Cliente, Promotor)
- ✅ Interceptação temporária (5 segundos)
- ✅ Auto-limpeza

## 🧪 TESTE

### Validar:
- [ ] Console limpo de erros
- [ ] Login/logout funcionando
- [ ] Scanner mantém tokens
- [ ] Cliente acessa dashboard
- [ ] Performance preservada

## 🔮 FUTURO

### Alternativas:
1. Aguardar correção oficial Supabase
2. Investigar causa raiz dos cookies corrompidos
3. Considerar migração de auth

### Monitoramento:
- Verificar logs periodicamente
- Acompanhar updates Supabase
- Remover solução se desnecessária

---

## 🎯 SISTEMAS CRÍTICOS A PROTEGER

**Scanner System:**
- `scanner_token` - Login funcionários
- `device_id` - ID dispositivos
- `cached_guests` - Dados offline

**Client System:**
- Autenticação independente
- QR codes de acesso
- Dashboard cliente

**Promoter System:**
- Links públicos ativos
- Redirecionamentos salvos
- Sessões promotor

---

*Qualquer alteração que delete localStorage/cookies quebra estes sistemas críticos* 