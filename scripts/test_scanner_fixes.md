# Teste das Correções do Scanner

## Problemas Corrigidos
1. **Erro 500**: Quando um QR code que já foi lido volta a ser lido, agora mostra corretamente a hora que o convidado entrou originalmente em vez de dar erro 500.
2. **Timezone incorreto**: Corrigido problema onde horários apareciam com 1-2 horas de diferença (UTC vs Portugal time).
3. **Loop de erros na consola**: Resolvido problema onde timestamps inválidos causavam loops infinitos de warnings na consola.

## Correções Implementadas

### 1. API `/api/scanners/scan/route.ts`
- ✅ **Campo de timestamp corrigido**: Agora verifica múltiplos campos possíveis (`checked_in_at`, `check_in_time`, `updated_at`, `created_at`)
- ✅ **Gravação do timestamp**: Quando faz check-in, agora grava o timestamp em múltiplos campos para compatibilidade
- ✅ **Formatação da hora**: API agora envia `check_in_display_time` já formatado (HH:mm) com timezone de Portugal
- ✅ **Race condition**: Melhor tratamento quando múltiplos scanners tentam fazer check-in do mesmo convidado
- ✅ **Timezone correto**: Usa `timeZone: 'Europe/Lisbon'` para garantir hora de Portugal

### 2. Dashboard `/app/scanner/dashboard/page.tsx`
- ✅ **Uso do horário formatado**: Agora usa `check_in_display_time` da API quando disponível
- ✅ **Mensagem melhorada**: "Check-in já realizado às [HH:mm]" em vez de formatação local inconsistente
- ✅ **Interface atualizada**: Suporte ao novo campo na ApiResponse
- ✅ **Timezone consistente**: Usa função utilitária `formatPortugalTime()`

### 3. Função Utilitária `/lib/utils/time.ts`
- ✅ **Nova função criada**: `formatPortugalTime()` para formatação consistente
- ✅ **Timezone explícito**: Sempre usa `Europe/Lisbon` timezone
- ✅ **Tratamento de erros**: Retorna mensagens apropriadas para valores inválidos
- ✅ **Uso padronizado**: Substituiu todas as formatações manuais no sistema
- ✅ **Proteção anti-loop**: Detecta e previne loops infinitos com timestamps inválidos
- ✅ **Validação de timestamps**: Nova função `isValidTimestamp()` para validar inputs

### 4. Limpeza de Dados `app/scanner/dashboard/page.tsx`
- ✅ **Filtro de scans antigos**: Remove scans com timestamps inválidos do localStorage
- ✅ **Validação na gravação**: Só grava novos scans se têm timestamps válidos  
- ✅ **Limpeza automática**: Remove automaticamente dados corrompidos
- ✅ **Prevenção de propagação**: Evita que timestamps inválidos se espalhem

## Como Testar

### Cenário 1: Check-in Normal (deve funcionar)
1. Fazer scan de um QR code que ainda não foi lido
2. ✅ Deve mostrar "Check-in realizado com sucesso"
3. ✅ Deve aparecer som/vibração de sucesso
4. ✅ Contador de check-ins deve aumentar

### Cenário 2: Check-in Duplicado (correção principal)
1. Fazer scan do mesmo QR code novamente
2. ✅ Deve mostrar "Check-in já realizado às [HH:mm]" 
3. ✅ Deve aparecer som/vibração de "já verificado"
4. ✅ **NÃO deve dar erro 500**
5. ✅ Hora mostrada deve ser a do check-in original
6. ✅ **Hora deve estar correta** (não +1 ou +2 horas)

### Cenário 3: Múltiplos Scanners (race condition)
1. Dois scanners fazem scan do mesmo QR code simultaneamente
2. ✅ Um deve mostrar "Check-in realizado com sucesso"
3. ✅ Outro deve mostrar "Check-in já realizado às [HH:mm]"
4. ✅ Ambos devem funcionar sem erro 500

### Cenário 4: Verificação de Timezone
1. Verificar hora atual no telemóvel/computador
2. Fazer check-in de novo convidado
3. ✅ Hora mostrada no scanner deve coincidir com hora atual (±1 minuto)
4. ✅ Não deve mostrar horas futuras ou com diferença de horas

### Cenário 5: Verificação da Consola (Correção dos Loops)
1. Abrir DevTools (F12) → Console
2. Recarregar a página do scanner
3. ✅ **NÃO deve aparecer** erros repetidos sobre "Invalid timestamp provided to formatPortugalTime"
4. ✅ Consola deve estar limpa ou apenas com logs normais
5. ✅ Se aparecer limpeza automática: "🧹 Limpeza: Removidos X scans com timestamps inválidos"

### Cenário 6: Teste de QR Codes Novos (Correção Principal do Erro 500)
1. Fazer scan de um QR code que **NUNCA** foi usado antes
2. ✅ **NÃO deve dar erro 500** "Erro ao registrar check-in"
3. ✅ Deve mostrar "Check-in realizado com sucesso"
4. ✅ Nome do convidado deve aparecer corretamente
5. ✅ Hora deve estar correta (não +1 ou +2 horas)
6. ✅ Scan deve aparecer na lista com ícone verde ✅

### Cenário 7: Debug API (se houver problemas)
1. Abrir no browser: `http://localhost:3000/api/debug/guests`
2. ✅ Deve retornar lista de alguns guests sem erro
3. ✅ Para testar guest específico: `http://localhost:3000/api/debug/guests?guest_id=[ID_DO_QR_CODE]`
4. ✅ Verificar se todos os campos existem na resposta

## Verificação de Logs
```bash
# Verificar logs da API durante os testes (para QR codes novos):
# ✅ "🔍 Processando scan:" - Log inicial
# ✅ "🔍 Guest atual:" - Dados do guest encontrado  
# ✅ "🔄 Tentativa 1: Update com todos os campos" - Primeira tentativa
# ✅ "✅ Tentativa 1 bem-sucedida" OU "⚠️ Tentativa 1 falhou"
# ✅ "✅ Check-in realizado com sucesso:" - Sucesso final
# ❌ NÃO deve aparecer "❌ Todas as tentativas falharam"

# Para QR codes já verificados:
# ✅ "⚠️ Check-in já realizado:" (com timestamp formatado)
# ❌ NÃO deve aparecer erro 500

# Verificar logs do frontend na consola:
# ✅ "🧹 Limpeza: Removidos X scans com timestamps inválidos" (se houver limpeza)
# ✅ "⚠️ Scan com timestamp inválido não foi salvo:" (se tentar salvar inválido)
# ❌ NÃO deve aparecer loops de "Invalid timestamp provided to formatPortugalTime"
```

## Campos na Base de Dados
Após check-in, verificar se estes campos foram atualizados:
- `checked_in = true`
- `checked_in_at = [timestamp ISO]`
- `check_in_time = [timestamp ISO]` 
- `updated_at = [timestamp ISO]`

## Rollback
Se houver problemas, o código anterior pode ser restaurado revertendo as alterações em:
- `app/api/scanners/scan/route.ts` (linhas 77-90 e 95-110)
- `app/scanner/dashboard/page.tsx` (interface ApiResponse, processamento e validações)
- `app/scanner/components/ScannerFeedback.tsx` (formatação de horários)
- `lib/utils/time.ts` (nova função utilitária e validações)

**NOTA**: Depois do rollback, pode ser necessário limpar o localStorage manualmente:
```javascript
// Na consola do browser:
localStorage.removeItem('recent_scans')
```

## Troubleshooting Adicional

### Se ainda aparecerem erros 500 em QR codes novos:

1. **Verificar a API de debug:**
   ```
   GET http://localhost:3000/api/debug/guests
   ```
   - Se retornar erro, o problema é acesso à tabela guests
   - Se retornar dados, testar guest específico

2. **Testar guest específico:**
   ```
   GET http://localhost:3000/api/debug/guests?guest_id=[QR_CODE_ID]
   ```
   - Verificar se o guest existe
   - Verificar estrutura dos campos retornados

3. **Verificar logs detalhados:**
   - Abrir DevTools → Network → tentar scan
   - Ver resposta da API `/api/scanners/scan`
   - Procurar por mensagens de erro específicas

4. **Campos em falta na tabela:**
   Se logs mostrarem campos em falta (ex: `checked_in_at`, `check_in_time`):
   - API vai tentar fallback para update simples
   - Deve funcionar mesmo sem todos os campos

5. **Problemas de permissões RLS:**
   Se logs mostrarem "insufficient privileges":
   - Verificar se utilizador tem permissões na tabela guests
   - Pode ser necessário ajustar políticas RLS no Supabase

### Comandos de Debug Úteis:
```javascript
// Na consola do browser, para testar localStorage:
console.log('Recent scans:', localStorage.getItem('recent_scans'))

// Para limpar dados corrompidos:
localStorage.removeItem('recent_scans')
localStorage.removeItem('scanner_token') // Força novo login

// Para ver dados do scanner atual:
console.log('Scanner data:', JSON.parse(localStorage.getItem('scanner_data') || '{}'))
``` 