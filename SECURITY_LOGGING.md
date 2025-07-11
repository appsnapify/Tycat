# 🔒 DIRETRIZES DE SEGURANÇA PARA LOGS

## ✅ CORREÇÕES APLICADAS

### Dados Sensíveis Mascarados:
- **UserIDs:** `0ce26e89-7e54-4ab8-a682-72acc023db21` → `0ce26e89...`
- **Telefones:** `+351919999998` → `+351***998`
- **Nomes:** `Pedro Lopes` → `P*** L***`

### Arquivos Corrigidos:
1. ✅ `lib/utils.ts` - Funções de mascaramento
2. ✅ `lib/user/auth.ts` - Logs telefone/userId mascarados
3. ✅ `app/api/user/events/route.ts` - UserId mascarado
4. ✅ `app/user/login/page.tsx` - Telefone mascarado
5. ✅ `app/api/user/auth/check-phone/route.ts` - Telefone mascarado
6. ✅ `app/api/user/auth/login/route.ts` - Telefone mascarado
7. ✅ `app/api/user/auth/register/route.ts` - Telefone/nome mascarados
8. ✅ `lib/constants.ts` - Sistema de logging seguro

## 🛡️ FUNÇÕES DE SEGURANÇA

### Mascaramento Automático:
```typescript
import { maskUserId, maskPhone, safeLog } from '@/lib/utils'

// ❌ NUNCA FAÇA ISSO:
console.log('User:', userId, phone)

// ✅ FAÇA ASSIM:
console.log('User:', maskUserId(userId), maskPhone(phone))
// ou
safeLog('User login:', { userId, phone }) // Mascara automaticamente
```

### Produção vs Desenvolvimento:
```typescript
import { secureLog } from '@/lib/constants'

// Só mostra logs em desenvolvimento, mascara tudo em produção
secureLog('Debug info:', { userId, phone, email })
```

## 🚫 DADOS A NUNCA LOGAR

### SEMPRE SENSÍVEIS:
- ❌ **Passwords** (mesmo hash)
- ❌ **Tokens de acesso completos** 
- ❌ **Números de telefone completos**
- ❌ **UUIDs completos de usuários**
- ❌ **Emails completos**
- ❌ **Sessões/cookies**

### PERMITIDOS (mascarados):
- ✅ **Primeiros 8 chars do UUID**
- ✅ **Telefone mascarado** (+351***998)
- ✅ **Primeira letra do nome** (P***)
- ✅ **Comprimento do token** (sem conteúdo)

## 📝 EXEMPLOS DE LOGS SEGUROS

### Antes (❌):
```bash
📞 [PHONE CHECK] Verificando: +351919999998
🔍 [USER-EVENTS] Buscando para userId: 0ce26e89-7e54-4ab8-a682-72acc023db21
👤 [LOGIN] Utilizador: Pedro Lopes
```

### Depois (✅):
```bash
📞 [PHONE CHECK] Verificando telemóvel mascarado
🔍 [USER-EVENTS] Buscando para userId: 0ce26e89...
👤 [LOGIN] Utilizador: P*** L***
```

## 🔧 MANUTENÇÃO

### Verificação Periódica:
```bash
# Buscar logs perigosos
grep -r "console\.log.*\+351" .
grep -r "console\.log.*[0-9a-f]\{32\}" .
```

### Auditoria de Segurança:
1. **Logs de produção:** Sem dados sensíveis
2. **Logs de desenvolvimento:** Mascarados
3. **Monitorização:** Alertas para vazamentos

## 🚨 EM CASO DE VAZAMENTO

1. **Parar logs** imediatamente
2. **Limpar histórico** de logs
3. **Revisar** todos os pontos de logging
4. **Aplicar patches** de segurança
5. **Notificar** stakeholders

---

**STATUS:** ✅ Segurança aplicada em todos os logs críticos
**ÚLTIMA REVISÃO:** $(date) 