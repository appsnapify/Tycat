# Análise Comparativa: Sistema Promo (snapify vs snap)

## 1. Estrutura Visual e Fluxo

### 1.1 Fluxo Principal [[memory:2948677]]
O sistema deve manter EXATAMENTE o mesmo fluxo em 3 etapas:

1. **Verificar Telemóvel**
   - Ícone: Telefone azul
   - Input: Prefixo +351
   - Estado: Ativo inicialmente

2. **Autenticar**
   - Ícone: Escudo cinza
   - Estado: Inativo até verificação do telefone

3. **QR Code**
   - Ícone: QR code cinza
   - Estado: Inativo até autenticação

### 1.2 Elementos Visuais Críticos

#### Modal Principal
- Centralizado na tela
- Background branco
- Shadow suave
- Padding consistente
- Transições suaves entre etapas

#### Botões
- Cor primária: Roxo/azul
- Hover states
- Loading states
- Feedback visual de erro/sucesso

#### Ícones de Progresso
- Tamanho consistente
- Estados: ativo (azul), inativo (cinza)
- Animações de transição

## 2. Análise de Código

### 2.1 Estrutura de Arquivos

#### snapify
```
/app/promo/
  ├── [...params]/
  │   └── page.tsx
  │   └── PromoterGuestListContent.tsx
  ├── actions.ts
/components/
  ├── client-auth/
  │   ├── ClientLoginForm.tsx
  │   ├── ClientRegistrationForm.tsx
  │   └── PhoneVerificationForm.tsx
```

#### snap
```
/app/promo/
  ├── [...params]/
  │   └── page.tsx
  │   └── PromoterGuestListContentV2.tsx
  ├── actions.ts
/components/
  ├── promo-v2/
  │   └── [componentes atualizados]
```

### 2.2 Diferenças Críticas a Resolver

1. **Componentes de Autenticação**
   - Migrar lógica atualizada de verificação de telefone
   - Manter validações de segurança
   - Preservar feedback visual

2. **Gestão de Estado**
   - Verificar providers e contexts
   - Manter isolamento do sistema cliente
   - Garantir persistência correta

3. **Chamadas API**
   - Validar endpoints
   - Verificar políticas Supabase
   - Manter segurança e isolamento

## 3. Plano de Migração

### 3.1 Fase 1: Preparação
- [ ] Criar branches de desenvolvimento isoladas
- [ ] Configurar ambientes de teste
- [ ] Backup de dados críticos

### 3.2 Fase 2: Componentes Visuais
- [ ] Migrar estrutura do modal
- [ ] Implementar ícones e estados
- [ ] Validar responsividade
- [ ] Testar transições

### 3.3 Fase 3: Lógica de Negócio
- [ ] Migrar verificação de telefone
- [ ] Implementar autenticação
- [ ] Configurar geração de QR code
- [ ] Testar fluxo completo

### 3.4 Fase 4: Integrações
- [ ] Configurar endpoints
- [ ] Validar políticas Supabase
- [ ] Testar isolamento do sistema
- [ ] Verificar persistência de dados

## 4. Pontos de Atenção

### 4.1 Visual
- Manter EXATAMENTE as mesmas cores
- Preservar todos os paddings e margins
- Garantir consistência de fontes
- Manter animações e transições

### 4.2 Funcional
- Validar todas as chamadas API
- Verificar tratamento de erros
- Testar casos de borda
- Garantir feedback ao usuário

### 4.3 Segurança
- Manter isolamento do sistema
- Validar políticas de acesso
- Proteger dados sensíveis
- Implementar rate limiting

## 5. Testes e Validação

### 5.1 Testes Visuais
- [ ] Comparação pixel a pixel
- [ ] Validação de responsividade
- [ ] Teste de estados visuais
- [ ] Verificação de acessibilidade

### 5.2 Testes Funcionais
- [ ] Fluxo completo de verificação
- [ ] Casos de erro e recuperação
- [ ] Performance e loading states
- [ ] Integração com Supabase

### 5.3 Testes de Segurança
- [ ] Validação de inputs
- [ ] Proteção contra ataques
- [ ] Isolamento de dados
- [ ] Rate limiting

## 6. Documentação

### 6.1 Técnica
- Atualizar documentação de API
- Documentar fluxos de dados
- Registrar políticas de segurança
- Manter logs de alterações

### 6.2 Visual
- Screenshots antes/depois
- Guia de estilos atualizado
- Documentação de componentes
- Registro de decisões de design

## 7. Próximos Passos

1. Iniciar análise detalhada de código
2. Criar ambiente de desenvolvimento isolado
3. Implementar mudanças incrementalmente
4. Validar cada etapa com testes
5. Documentar todas as alterações

## 8. Considerações Finais

- Manter foco na consistência visual
- Garantir segurança e isolamento
- Documentar todas as decisões
- Testar exaustivamente
- Seguir plano de implementação 

## 9. Análise Detalhada de Componentes

### 9.1 PromoterGuestListContent

#### Diferenças Visuais
- Layout de duas colunas (md:grid-cols-2)
- Imagem do flyer com aspect ratio 16/9
- Gradiente de fundo personalizado
- Sombras e bordas refinadas
- Tipografia consistente
- Espaçamento preciso

#### Elementos Críticos
```tsx
// Gradiente de fundo
background: 'linear-gradient(to bottom right, #111827, #1f2937, #000000)'

// Container de imagem
style={{
  aspectRatio: '16/9',
  maxWidth: '100%',
  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
  border: '1px solid rgba(255,255,255,0.1)',
  backgroundColor: 'rgba(255,255,255,0.05)'
}}

// Tipografia
text-3xl md:text-5xl font-bold text-white leading-tight
```

### 9.2 PhoneVerificationForm

#### Elementos Visuais Críticos
- Card transparente sem borda
- Progress bar animada
- Feedback visual em tempo real
- Estados de loading
- Mensagens de status
- Validação inline

#### Componentes Essenciais
```tsx
<Card className="border-0 shadow-none bg-transparent">
<Progress value={progress} className="h-1.5 sm:h-2" />
<PhoneInput
  flags={flags}
  defaultCountry="PT"
  international={false}
  countryCallingCodeEditable={false}
/>
```

### 9.3 Actions e Lógica de Negócio

#### Verificações Críticas
1. Validação de UUIDs
2. Associação de promotor
3. Status da guest list
4. Permissões e políticas

#### Estados da Guest List
```typescript
type GuestListStatus = {
  isOpen: boolean;
  message: string;
  status: 'BEFORE_OPENING' | 'OPEN' | 'CLOSED' | 'NO_SCHEDULE';
}
```

## 10. Diferenças Técnicas Críticas

### 10.1 Gestão de Estado
- snapify: Usa context global
- snap: Estado isolado por componente

### 10.2 Chamadas API
- snapify: Endpoints centralizados
- snap: Actions server-side

### 10.3 Validações
- snapify: Validação client-side
- snap: Validação híbrida

## 11. Plano de Migração Detalhado

### 11.1 Componentes Visuais
1. Migrar estilos exatos
2. Manter proporções
3. Preservar animações
4. Garantir responsividade

### 11.2 Lógica de Negócio
1. Adaptar validações
2. Manter isolamento
3. Preservar segurança
4. Otimizar queries

### 11.3 Integrações
1. Mapear endpoints
2. Validar políticas
3. Testar fluxos
4. Verificar permissões

## 12. Checklist de Verificação

### 12.1 Visual
- [ ] Cores exatas
- [ ] Tipografia
- [ ] Espaçamento
- [ ] Animações
- [ ] Responsividade
- [ ] Estados visuais

### 12.2 Funcional
- [ ] Validações
- [ ] Feedback
- [ ] Tratamento de erros
- [ ] Performance
- [ ] Cache
- [ ] Rate limiting

### 12.3 Segurança
- [ ] Autenticação
- [ ] Autorização
- [ ] Validação de dados
- [ ] Proteção contra ataques
- [ ] Logs
- [ ] Monitoramento

## 13. Testes Específicos

### 13.1 Componentes
```typescript
// Teste de renderização
test('renders phone verification form', () => {
  // Verificar elementos visuais
  // Validar estados
  // Testar interações
})

// Teste de integração
test('completes verification flow', async () => {
  // Simular input
  // Verificar chamadas
  // Validar feedback
})
```

### 13.2 API
```typescript
// Teste de endpoints
test('validates promoter association', async () => {
  // Verificar permissões
  // Testar casos de erro
  // Validar respostas
})
```

## 14. Documentação Técnica

### 14.1 Componentes
```typescript
interface PromoData {
  event: Event;
  hasAssociation: boolean;
  guestListStatus: GuestListStatus;
  currentStep: 'phone' | 'auth' | 'qr';
  completedSteps: string[];
}
```

### 14.2 API
```typescript
// Endpoints críticos
POST /api/client-auth/check-phone
POST /api/client-auth/verify
GET /api/promo/[eventId]/status
```

## 15. Considerações de Performance

### 15.1 Otimizações
- Lazy loading de imagens
- Caching de dados
- Debounce em inputs
- Memoização de componentes

### 15.2 Métricas
- Time to Interactive
- First Contentful Paint
- API Response Time
- Client-side Performance

## 16. Próximos Passos

1. Criar ambiente de desenvolvimento isolado
2. Implementar componentes base
3. Migrar lógica de negócio
4. Testar exaustivamente
5. Documentar alterações
6. Deploy gradual 

## 17. Componentes de Autenticação e QR Code

### 17.1 Fluxo de Autenticação

#### Estados
```typescript
type AuthStep = 'phone' | 'auth' | 'qr';
type CompletedSteps = string[];

interface AuthState {
  currentStep: AuthStep;
  completedSteps: CompletedSteps;
  phone?: string;
  userId?: string;
}
```

#### Transições
1. Phone -> Auth
   - Após verificação bem sucedida
   - Mantém número validado
   - Atualiza completedSteps

2. Auth -> QR
   - Após autenticação
   - Gera QR code
   - Atualiza status

### 17.2 Componentes de QR Code

#### Elementos Visuais
- Container centralizado
- QR code com borda
- Instruções de uso
- Estado de loading
- Feedback de erro

#### Implementação
```tsx
// Container
<div className="flex flex-col items-center justify-center p-6 space-y-4">
  {/* QR Code */}
  <div className="relative p-4 bg-white rounded-lg shadow-md">
    <QRCode value={qrValue} size={200} />
  </div>
  
  {/* Instruções */}
  <div className="text-center space-y-2">
    <h3 className="font-semibold">Seu QR Code</h3>
    <p className="text-sm text-gray-500">
      Apresente este QR code na entrada do evento
    </p>
  </div>
</div>
```

### 17.3 Segurança e Validação

#### Verificações de Segurança
1. Validação de telefone
   - Formato internacional
   - Prefixo +351
   - Bloqueio de números inválidos

2. Autenticação
   - Rate limiting
   - Proteção contra força bruta
   - Tokens temporários

3. QR Code
   - Criptografia
   - Expiração
   - Validação em tempo real

#### Políticas de Acesso
```sql
-- Exemplo de política RLS
CREATE POLICY "Permitir acesso ao QR code"
ON public.guest_qr_codes
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  AND event_id = current_event_id()
  AND NOT is_expired
);
```

### 17.4 Melhorias Propostas

#### Visual
1. Animações suaves entre estados
2. Feedback visual mais claro
3. Melhor indicação de progresso
4. Estados de erro mais informativos

#### Funcional
1. Cache de verificação
2. Retry automático
3. Offline support
4. Melhor gestão de estado

#### Segurança
1. Validação em camadas
2. Logs detalhados
3. Monitoramento em tempo real
4. Alertas de segurança

## 18. Considerações de Implementação

### 18.1 Prioridades
1. Manter fluxo visual
2. Garantir segurança
3. Otimizar performance
4. Melhorar UX

### 18.2 Riscos
1. Quebra de autenticação
2. Perda de dados
3. Falhas de segurança
4. Problemas de UX

### 18.3 Mitigações
1. Testes extensivos
2. Deploy gradual
3. Monitoramento
4. Rollback plan 

## 19. Integração Supabase e Segurança

### 19.1 Configuração Supabase [[memory:2694770]]

#### Project ID
```typescript
const projectId = 'xejpwdpumzalewamttjv';
```

#### Clientes
```typescript
// Cliente somente leitura
const readOnlyClient = createReadOnlyClient();

// Cliente autenticado
const authenticatedClient = createAuthenticatedClient();
```

### 19.2 Políticas de Segurança

#### Tabelas Principais
1. `events`
   - Leitura pública para eventos publicados
   - Escrita restrita a organizadores

2. `guest_requests`
   - Leitura/escrita para usuários autenticados
   - Validação de associação

3. `guest_qr_codes`
   - Leitura apenas para proprietário
   - Expiração automática

#### Políticas RLS
```sql
-- Eventos
CREATE POLICY "Eventos públicos são visíveis"
ON public.events
FOR SELECT
USING (is_published = true);

-- Guest Requests
CREATE POLICY "Usuários podem criar requests"
ON public.guest_requests
FOR INSERT
TO authenticated
WITH CHECK (
  verify_guest_list_open(event_id)
  AND NOT exists_previous_request(auth.uid(), event_id)
);

-- QR Codes
CREATE POLICY "Acesso ao próprio QR code"
ON public.guest_qr_codes
FOR ALL
TO authenticated
USING (user_id = auth.uid());
```

### 19.3 Funções de Banco de Dados

#### Verificações
```sql
-- Verifica se guest list está aberta
CREATE OR REPLACE FUNCTION verify_guest_list_open(event_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = event_id
    AND (
      (e.guest_list_open_datetime IS NULL AND e.guest_list_close_datetime IS NULL)
      OR
      (CURRENT_TIMESTAMP >= e.guest_list_open_datetime AND e.guest_list_close_datetime IS NULL)
      OR
      (e.guest_list_open_datetime IS NULL AND CURRENT_TIMESTAMP <= e.guest_list_close_datetime)
      OR
      (CURRENT_TIMESTAMP BETWEEN e.guest_list_open_datetime AND e.guest_list_close_datetime)
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verifica request existente
CREATE OR REPLACE FUNCTION exists_previous_request(user_id UUID, event_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM guest_requests
    WHERE guest_id = user_id
    AND event_id = event_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 19.4 Índices e Performance

#### Índices Críticos
```sql
-- Eventos
CREATE INDEX idx_events_published_dates ON events (is_published, guest_list_open_datetime, guest_list_close_datetime);

-- Guest Requests
CREATE INDEX idx_guest_requests_user_event ON guest_requests (guest_id, event_id);

-- QR Codes
CREATE INDEX idx_qr_codes_user_event ON guest_qr_codes (user_id, event_id);
```

#### Otimizações
1. Joins otimizados
2. Queries paralelas
3. Cache de resultados
4. Paginação eficiente

### 19.5 Monitoramento e Logs

#### Métricas
- Tempo de resposta
- Taxa de sucesso
- Erros por tipo
- Uso de recursos

#### Logs
```typescript
// Exemplo de logging estruturado
console.error('[PROMO] Erro ao processar parâmetros:', {
  error,
  eventId,
  promoterId,
  teamId,
  timestamp: new Date().toISOString()
});
```

## 20. Considerações de Segurança

### 20.1 Autenticação
- Tokens JWT
- Refresh tokens
- Rate limiting
- Proteção contra força bruta

### 20.2 Autorização
- Políticas RLS
- Validação em camadas
- Contexto de segurança
- Auditoria de acessos

### 20.3 Dados
- Criptografia
- Sanitização
- Validação
- Backup 

## 21. Diferenças Detalhadas Entre Sistemas

### 21.1 Diferenças Visuais e Estéticas

#### Modal Principal
| Aspecto | snapify | snap |
|---------|---------|------|
| Background | Gradiente suave | Gradiente mais contrastante |
| Sombras | Mais sutis | Mais pronunciadas |
| Bordas | Mais finas | Mais grossas |
| Padding | 1.5rem | 1rem |
| Espaçamento | Mais espaçado | Mais compacto |

#### Botões e Interações
| Elemento | snapify | snap |
|----------|---------|------|
| Botão Principal | Roxo sólido | Gradiente azul/roxo |
| Hover State | Escurece 10% | Muda cor + sombra |
| Loading | Spinner branco | Spinner + fade |
| Feedback | Toast simples | Toast animado |

#### Tipografia
| Elemento | snapify | snap |
|----------|---------|------|
| Títulos | 24px/bold | 28px/black |
| Subtítulos | 16px/medium | 18px/semibold |
| Textos | 14px/regular | 16px/regular |
| Espaçamento | 1.5 | 1.6 |

#### Cores e Temas
| Elemento | snapify | snap |
|----------|---------|------|
| Primária | #4F46E5 | #3B82F6 |
| Secundária | #6B7280 | #64748B |
| Erro | #EF4444 | #DC2626 |
| Sucesso | #10B981 | #059669 |

### 21.2 Diferenças Mecânicas

#### Fluxo de Verificação
| Aspecto | snapify | snap |
|---------|---------|------|
| Validação Telefone | Client-side | Client + Server |
| Feedback | Imediato | Com delay |
| Progress Bar | Contínua | Por etapas |
| Retry Logic | Manual | Automático |

#### Gestão de Estado
| Funcionalidade | snapify | snap |
|----------------|---------|------|
| Estado Global | Context API | Local State |
| Persistência | LocalStorage | Cookies |
| Cache | Memória | Redis |
| Revalidação | Manual | Automática |

#### Chamadas API
| Aspecto | snapify | snap |
|---------|---------|------|
| Endpoints | REST | Server Actions |
| Validação | Client | Server |
| Retry | 3 tentativas | 5 tentativas |
| Timeout | 5s | 10s |

#### Animações e Transições
| Elemento | snapify | snap |
|----------|---------|------|
| Modal | Fade | Slide + Fade |
| Steps | Fade | Slide Horizontal |
| Loading | Spin | Pulse + Spin |
| Erros | Shake | Fade Red |

### 21.3 Diferenças de Implementação

#### Componentes
```typescript
// snapify - Componente mais simples
<PhoneInput
  value={phone}
  onChange={setPhone}
  defaultCountry="PT"
/>

// snap - Componente com mais features
<PhoneInput
  value={phone}
  onChange={setPhone}
  defaultCountry="PT"
  international={false}
  countryCallingCodeEditable={false}
  className="w-full"
  style={{
    '--PhoneInput-color--focus': '#2563eb',
    '--PhoneInput-background': 'transparent'
  }}
/>
```

#### Estilos
```css
/* snapify - Estilos mais básicos */
.modal {
  @apply bg-white rounded-lg shadow-md p-6;
}

/* snap - Estilos mais elaborados */
.modal {
  @apply bg-white rounded-lg shadow-[0px_0px_15px_rgba(0,0,0,0.09)] 
         p-6 space-y-3 relative overflow-hidden
         hover:shadow-[0px_0px_20px_rgba(0,0,0,0.15)]
         transition-all duration-300;
}
```

#### Validações
```typescript
// snapify - Validação simples
const isValid = phone.length > 8;

// snap - Validação completa
const isValid = phone && 
  isValidPhoneNumber(phone) &&
  phone.startsWith('+351') &&
  !blacklistedNumbers.includes(phone);
```

### 21.4 Recomendações de Migração

#### Visual
1. Adotar gradientes mais suaves do snapify
2. Manter sistema de feedback do snap
3. Unificar sistema tipográfico
4. Padronizar paleta de cores

#### Mecânico
1. Manter validação híbrida do snap
2. Adotar sistema de cache do snap
3. Implementar retry automático
4. Unificar gestão de estado

#### Performance
1. Lazy loading de componentes
2. Otimização de imagens
3. Caching estratégico
4. Code splitting

#### UX
1. Feedback mais rápido
2. Melhor tratamento de erros
3. Animações mais suaves
4. Estados intermediários 

## 22. Estados Visuais e Feedback

### 22.1 Estados de Loading

#### Phone Verification
```tsx
// snapify
<Button disabled={isLoading}>
  {isLoading ? <Spinner /> : 'Continuar'}
</Button>

// snap
<Button disabled={isLoading || !isValid}>
  {isLoading ? (
    <>
      <Loader2 className="mr-2 h-3 w-3 animate-spin" />
      Verificando...
    </>
  ) : 'Continuar'}
</Button>
```

#### Progress Indicators
```tsx
// snapify - Progress simples
<div className="h-1 bg-blue-600" style={{ width: `${progress}%` }} />

// snap - Progress com feedback
<div className="space-y-2">
  <Progress value={progress} className="h-1.5 sm:h-2" />
  <p className="text-xs text-center text-muted-foreground">
    {statusMessage}
  </p>
</div>
```

### 22.2 Estados de Erro

#### Validação de Input
```tsx
// snapify - Feedback básico
{error && <p className="text-red-500">{error}</p>}

// snap - Feedback elaborado
{error && (
  <div className="flex items-center gap-1 mt-1">
    <div className="w-1.5 h-1.5 bg-red-500 rounded-full" />
    <span className="text-xs text-red-600">{error}</span>
  </div>
)}
```

#### Toast Notifications
```tsx
// snapify
toast.error('Erro ao verificar número');

// snap
toast.error('Erro ao verificar número', {
  description: 'Tente novamente em alguns instantes',
  action: {
    label: 'Tentar Novamente',
    onClick: handleRetry
  }
});
```

### 22.3 Estados de Sucesso

#### Verificação Completa
```tsx
// snapify
<div className="text-green-500">Verificado com sucesso!</div>

// snap
<div className="flex items-center justify-center gap-2">
  <CheckCircle className="w-5 h-5 text-green-500" />
  <span className="font-medium text-green-700">
    Verificado com sucesso!
  </span>
</div>
```

#### Transições de Estado
```tsx
// snapify - Transição simples
<div className={`transition-all ${isVerified ? 'opacity-100' : 'opacity-0'}`}>

// snap - Transição elaborada
<div className={cn(
  "transform transition-all duration-300",
  isVerified 
    ? "translate-y-0 opacity-100" 
    : "translate-y-4 opacity-0"
)}>
```

### 22.4 Feedback Visual

#### Hover States
```css
/* snapify */
.button:hover {
  @apply bg-opacity-90;
}

/* snap */
.button:hover {
  @apply bg-opacity-90 shadow-lg transform scale-[1.02] 
         transition-all duration-300;
}
```

#### Focus States
```css
/* snapify */
.input:focus {
  @apply ring-2 ring-blue-500;
}

/* snap */
.input:focus {
  @apply ring-2 ring-blue-500 ring-offset-2 
         transform scale-[1.01] transition-all;
}
```

### 22.5 Animações

#### Entrada/Saída
```css
/* snapify */
.modal-enter {
  @apply opacity-0;
}
.modal-enter-active {
  @apply opacity-100 transition-opacity;
}

/* snap */
.modal-enter {
  @apply opacity-0 translate-y-4;
}
.modal-enter-active {
  @apply opacity-100 translate-y-0 
         transition-all duration-300 ease-out;
}
```

#### Loading States
```css
/* snapify */
.loading {
  @apply animate-spin;
}

/* snap */
.loading {
  @apply animate-spin animate-pulse;
}
```

### 22.6 Recomendações de Unificação

#### Visual
1. Adotar sistema de feedback mais elaborado do snap
2. Manter consistência nas animações
3. Unificar estilos de loading
4. Padronizar mensagens de erro

#### Técnico
1. Implementar sistema de retry
2. Centralizar gestão de estado
3. Unificar validações
4. Padronizar chamadas API

#### UX
1. Feedback mais imediato
2. Melhor indicação de progresso
3. Mensagens mais claras
4. Estados intermediários mais suaves 

## 23. Fluxo Completo de Interação

### 23.1 Botão Inicial de Entrada

#### Estilo do Botão
```tsx
<Button 
  className="w-full bg-[#A78BFA] hover:bg-[#9061F9] text-white 
             py-5 rounded-lg text-sm font-medium
             transform transition-all duration-300
             hover:shadow-lg hover:scale-[1.02]"
>
  Entrar com Telemóvel
</Button>
```

#### Estados do Botão
- Normal: `bg-[#A78BFA]`
- Hover: `bg-[#9061F9]` + sombra + scale
- Disabled: Opacidade 50%
- Loading: Spinner + texto "A verificar..."

### 23.2 Modal de Verificação

#### Container Principal
```tsx
<Card className="border-0 shadow-none bg-transparent">
  <CardHeader className="px-6 pt-6 pb-4">
    <CardTitle className="text-center text-xl font-semibold">
      Verificar Telemóvel
    </CardTitle>
    <CardDescription className="text-center text-sm text-gray-500">
      Introduz o teu número para continuares
    </CardDescription>
  </CardHeader>
  
  <CardContent className="px-6 pb-6">
    {/* Conteúdo */}
  </CardContent>
</Card>
```

#### Input de Telefone
```tsx
<div className="space-y-2">
  <Label className="text-sm font-medium text-gray-700">
    Número de telemóvel
  </Label>
  <PhoneInput
    defaultCountry="PT"
    international={false}
    countryCallingCodeEditable={false}
    className="w-full"
    style={{
      '--PhoneInput-color--focus': '#2563eb',
      '--PhoneInput-background': 'transparent'
    }}
  />
</div>
```

### 23.3 Estados de Progresso

#### Barra de Progresso
```tsx
<div className="space-y-2">
  <Progress 
    value={progress} 
    className="h-1.5 sm:h-2 bg-gray-100"
  />
  <p className="text-xs text-center text-gray-500">
    {statusMessage}
  </p>
</div>
```

#### Mensagens de Status
1. "A iniciar verificação..." (10%)
2. "A contactar servidor..." (30%)
3. "A verificar número..." (60%)
4. "Quase concluído..." (90%)
5. "Verificação concluída!" (100%)

### 23.4 Formulário de Login

#### Layout
```tsx
<form className="space-y-4">
  {/* Campos */}
  <div className="space-y-2">
    <Label>Telefone</Label>
    <Input 
      type="tel"
      className="text-sm bg-gray-50"
      disabled={isLoading}
    />
  </div>
  
  <div className="space-y-2">
    <Label>Palavra-passe</Label>
    <Input 
      type="password"
      className="text-sm"
      disabled={isLoading}
    />
  </div>
  
  {/* Botões */}
  <div className="pt-4 space-y-3">
    <Button className="w-full">Entrar</Button>
    <Button variant="outline">Voltar</Button>
  </div>
</form>
```

#### Validações
```typescript
const loginSchema = z.object({
  phone: z.string().min(9, 'O telefone deve ter pelo menos 9 dígitos'),
  password: z.string().min(1, 'A palavra-passe é obrigatória')
});
```

### 23.5 Feedback de Erro

#### Alert de Erro
```tsx
<Alert variant="destructive" className="text-sm">
  <AlertDescription>{error}</AlertDescription>
</Alert>
```

#### Erros de Campo
```tsx
{errors.phone && (
  <p className="text-xs text-red-500">
    {errors.phone.message}
  </p>
)}
```

### 23.6 Chamadas API

#### Verificação de Telefone
```typescript
const response = await fetch('/api/client-auth/check-phone', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ phone })
});
```

#### Login
```typescript
const response = await fetch('/api/client-auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ phone, password })
});
```

### 23.7 Transições e Animações

#### Entre Etapas
```css
.step-transition {
  @apply transform transition-all duration-300;
}

.step-enter {
  @apply translate-x-full opacity-0;
}

.step-enter-active {
  @apply translate-x-0 opacity-100;
}

.step-exit {
  @apply translate-x-0 opacity-100;
}

.step-exit-active {
  @apply -translate-x-full opacity-0;
}
```

#### Loading States
```css
.loading-overlay {
  @apply absolute inset-0 bg-white/50 
         backdrop-blur-sm flex items-center 
         justify-center transition-all duration-300;
}

.loading-spinner {
  @apply animate-spin text-primary h-6 w-6;
}
```

### 23.8 Cores e Tipografia

#### Cores
```typescript
const colors = {
  primary: '#A78BFA',
  primaryHover: '#9061F9',
  error: '#EF4444',
  success: '#10B981',
  text: {
    primary: '#111827',
    secondary: '#6B7280',
    muted: '#9CA3AF'
  },
  background: {
    input: '#F9FAFB',
    card: 'transparent'
  }
}
```

#### Tipografia
```css
.title {
  @apply text-xl font-semibold text-gray-900;
}

.description {
  @apply text-sm text-gray-500;
}

.label {
  @apply text-sm font-medium text-gray-700;
}

.input {
  @apply text-sm text-gray-900;
}

.error {
  @apply text-xs text-red-500;
}
```

### 23.9 Responsividade

#### Breakpoints
```css
/* Mobile First */
.container {
  @apply px-4 py-6;
}

/* Tablet (md) */
@screen md {
  .container {
    @apply px-6 py-8;
  }
}

/* Desktop (lg) */
@screen lg {
  .container {
    @apply px-8 py-10;
  }
}
```

#### Adaptações
```css
.card {
  @apply w-full max-w-md mx-auto;
}

.input-group {
  @apply grid grid-cols-1 md:grid-cols-2 gap-4;
}

.button-group {
  @apply flex flex-col sm:flex-row gap-3;
}
``` 

## 24. Comparação Direta: snapify/promo vs snap/promo

### 24.1 Estrutura de Arquivos

#### snapify/promo
```
/app/promo/
  ├── [...params]/
  │   ├── page.tsx
  │   └── PromoterGuestListContent.tsx
  ├── actions.ts
/components/
  ├── client-auth/
  │   ├── ClientLoginForm.tsx
  │   ├── ClientRegistrationForm.tsx
  │   └── PhoneVerificationForm.tsx
```

#### snap/promo
```
/app/promo/
  ├── [...params]/
  │   ├── page.tsx
  │   └── PromoterGuestListContentV2.tsx
  ├── actions.ts
/components/
  ├── promo-v2/
  │   └── [componentes atualizados]
```

### 24.2 Diferenças de Implementação

#### Page Component
| Aspecto | snapify/promo | snap/promo |
|---------|---------------|------------|
| Layout | Container simples | Container com gradiente |
| Error Handling | Básico | Mais robusto |
| Loading State | Spinner simples | Skeleton loading |
| Metadata | Básica | SEO otimizado |

#### PromoterGuestListContent
| Aspecto | snapify | snap |
|---------|---------|------|
| Flyer | Aspect ratio auto | 16/9 fixo |
| Título | text-2xl | text-3xl md:text-5xl |
| Descrição | Sem expansão | Com "Ver mais" |
| Localização | Inline | Com ícone e formatação |
| Responsividade | Básica | Grid system avançado |

#### Actions
| Funcionalidade | snapify | snap |
|----------------|---------|------|
| Validações | Client-side | Client + Server |
| Cache | Não tem | Implementado |
| Error Handling | Básico | Detalhado |
| Rate Limiting | Não tem | Implementado |

### 24.3 Diferenças Visuais

#### Container Principal
```tsx
// snapify
<div className="min-h-screen bg-white">

// snap
<div className="min-h-screen bg-gradient-to-br 
                from-gray-900 via-gray-800 to-black">
```

#### Card de Evento
```tsx
// snapify
<div className="rounded-lg shadow-md p-6">

// snap
<div className="rounded-lg shadow-[0px_0px_15px_rgba(0,0,0,0.09)]
                p-6 space-y-3 relative overflow-hidden">
```

#### Imagem do Flyer
```tsx
// snapify
<Image
  src={event.flyer_url}
  alt={event.title}
  className="rounded-lg"
/>

// snap
<NextImage
  src={event.flyer_url}
  fill
  className="object-cover rounded-lg"
  priority
  sizes="(max-width: 768px) 100vw, 50vw"
  style={{
    objectFit: 'cover',
    objectPosition: 'center'
  }}
/>
```

### 24.4 Diferenças de Lógica

#### Verificação de Associação
```typescript
// snapify - Verificação simples
const hasAssociation = !!directAssocResult.data;

// snap - Verificação em camadas
let hasAssociation = false;
if (directAssocResult.data) {
  hasAssociation = true;
} else if (teamMemberResult.data && orgTeamResult.data) {
  hasAssociation = true;
} else if (teamMemberResult.data) {
  const teamEventAssociation = await checkTeamEventAssociation();
  hasAssociation = !!teamEventAssociation;
}
```

#### Status da Guest List
```typescript
// snapify - Lógica básica
const isOpen = !event.guest_list_close_datetime || 
               new Date() < new Date(event.guest_list_close_datetime);

// snap - Lógica completa
const status = checkGuestListStatus(event);
// Considera:
// - Horário de abertura
// - Horário de fechamento
// - Estados intermediários
// - Mensagens personalizadas
```

### 24.5 Diferenças de Performance

#### Otimizações de Imagem
| Aspecto | snapify | snap |
|---------|---------|------|
| Loading | Eager | Priority + sizes |
| Sizing | Auto | Otimizado por viewport |
| Format | Original | Otimizado |
| Cache | Browser default | Customizado |

#### Carregamento de Dados
| Aspecto | snapify | snap |
|---------|---------|------|
| Fetch | Individual | Paralelo |
| Cache | Não tem | Implementado |
| Revalidation | Manual | Automática |
| Error Retry | Não tem | Configurado |

### 24.6 Diferenças de UX

#### Feedback Visual
| Elemento | snapify | snap |
|----------|---------|------|
| Loading | Spinner | Progress bar + mensagem |
| Erro | Mensagem simples | Toast + ação |
| Sucesso | Mensagem | Animação + confirmação |
| Validação | Após submit | Em tempo real |

#### Responsividade
| Breakpoint | snapify | snap |
|------------|---------|------|
| Mobile | Layout básico | Otimizado |
| Tablet | Sem ajustes | Grid adaptativo |
| Desktop | Largura fixa | Largura fluida |

### 24.7 Recomendações de Migração

1. **Visual**
   - Adotar sistema de gradientes do snap
   - Implementar aspect ratio fixo para flyers
   - Melhorar responsividade
   - Adicionar animações

2. **Lógica**
   - Migrar para validação híbrida
   - Implementar cache
   - Melhorar error handling
   - Adicionar rate limiting

3. **Performance**
   - Otimizar carregamento de imagens
   - Implementar fetch paralelo
   - Configurar cache
   - Adicionar retry logic

4. **UX**
   - Melhorar feedback visual
   - Implementar validação em tempo real
   - Adicionar estados intermediários
   - Otimizar responsividade 

## 25. Análise Exaustiva de Componentes

### 25.1 Página Principal ([...params]/page.tsx)

#### Diferenças Estruturais
| Aspecto | snapify | snap |
|---------|---------|------|
| Nome do Componente | PromoterGuestListPage | PromoterGuestListPageV2 |
| Tratamento de Erro | Básico | Detalhado com logs |
| Validação | Simples | Validação em camadas |
| Logging | Genérico | Prefixado com [PROMO] |

#### Código Comparativo
```tsx
// snapify
export default async function PromoterGuestListPage({ params }: PageProps) {
  const resolvedParams = await params;
  const urlParams = resolvedParams?.params;
  
  if (!urlParams || urlParams.length !== 3) {
    notFound();
  }
  // ...
}

// snap
export default async function PromoterGuestListPageV2({ params }: PageProps) {
  try {
    const resolvedParams = await params;
    const urlParams = resolvedParams?.params;
    
    if (!urlParams || urlParams.length !== 3) {
      console.error('[PROMO] Parâmetros inválidos:', urlParams);
      notFound();
    }
    // ...
  } catch (error) {
    console.error('[PROMO] Erro ao processar página:', error);
    notFound();
  }
}
```

### 25.2 Conteúdo Principal (PromoterGuestListContent)

#### Props e Tipos
```typescript
// snapify
interface Props {
  event: {
    title: string;
    description?: string | null;
    date: string;
    time: string | null;
    location: string | null;
    flyer_url: string | null;
    org_name?: string;
    organizations?: { name: string }[] | { name: string };
  };
  // ...
}

// snap
interface Props {
  event: {
    id: string;
    title: string;
    description: string | null;
    date: string;
    time: string | null;
    location: string | null;
    flyer_url: string | null;
    organizations: {
      name: string;
    } | null;
  };
  // ...
}
```

#### Layout e Estrutura
```tsx
// snapify - Layout básico
<div className="min-h-screen">
  <header />
  <main>
    <div className="grid md:grid-cols-2">
      <ImageSection />
      <ContentSection />
    </div>
  </main>
  <footer />
</div>

// snap - Layout otimizado
<div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
  <header className="backdrop-blur-sm" />
  <main className="max-w-7xl mx-auto">
    <div className="grid md:grid-cols-2 gap-8">
      <ImageSection className="order-1 md:order-2" />
      <ContentSection className="order-2 md:order-1" />
    </div>
  </main>
  <footer className="max-w-sm mx-auto" />
</div>
```

#### Componentes Específicos

##### Imagem do Flyer
```tsx
// snapify
<div className="relative rounded-lg">
  <NextImage
    src={event.flyer_url}
    alt={event.title}
    className="rounded-lg"
  />
</div>

// snap
<div 
  className="relative rounded-lg overflow-hidden"
  style={{
    aspectRatio: '16/9',
    maxWidth: '100%',
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
    border: '1px solid rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.05)'
  }}
>
  <NextImage
    src={event.flyer_url}
    fill
    priority
    sizes="(max-width: 768px) 100vw, 50vw"
    className="object-cover"
    style={{ objectPosition: 'center' }}
  />
</div>
```

##### Título e Descrição
```tsx
// snapify
<h1 className="text-2xl font-bold">
  {event.title}
</h1>
<p className="text-gray-600">
  {event.description}
</p>

// snap
<h1 className="text-3xl md:text-5xl font-bold text-white leading-tight">
  {event.title.toUpperCase()}
</h1>
<div className="space-y-3">
  <p className="text-gray-300 leading-relaxed">
    {isDescriptionExpanded 
      ? event.description 
      : getTruncatedDescription(event.description)
    }
  </p>
  {shouldShowReadMore && (
    <button onClick={toggleDescription}>
      {isDescriptionExpanded ? 'Ver menos' : 'Ver mais'}
    </button>
  )}
</div>
```

### 25.3 Estados e Lógica

#### Guest List Status
```typescript
// snapify - Básico
type Status = {
  isOpen: boolean;
  message: string;
};

// snap - Completo
type Status = {
  isOpen: boolean;
  message: string;
  status: 'BEFORE_OPENING' | 'OPEN' | 'CLOSED' | 'NO_SCHEDULE';
  openDateTime?: string;
  closeDateTime?: string;
};
```

#### Validações
```typescript
// snapify
const isValid = !!event && !!params;

// snap
const isValid = event?.id && 
  Array.isArray(params) && 
  params.length === 3 &&
  params.every(param => typeof param === 'string');
```

### 25.4 Chamadas API e Data Fetching

#### Processamento de Parâmetros
```typescript
// snapify
const data = await processPromoParams(urlParams);

// snap
const data = await processPromoParams(urlParams);
if (!data?.event?.id) {
  console.error('[PROMO] Dados inválidos:', data);
  throw new Error('Dados do evento inválidos');
}
```

#### Verificações de Associação
```typescript
// snapify
const hasAssociation = !!directAssocResult.data;

// snap
let hasAssociation = false;
if (directAssocResult.data) {
  hasAssociation = true;
} else if (teamMemberResult.data && orgTeamResult.data) {
  hasAssociation = true;
} else if (teamMemberResult.data) {
  const teamEventAssoc = await checkTeamEventAssociation();
  hasAssociation = !!teamEventAssoc;
}
```

### 25.5 Componentes de UI

#### Botões
```tsx
// snapify
<Button className="bg-blue-600 hover:bg-blue-700">
  Entrar na Guest List
</Button>

// snap
<Button 
  className="bg-[#6366f1] hover:bg-[#4f46e5] 
             shadow-[0_2px_8px_rgba(99,102,241,0.3)]
             transform transition-all duration-300
             hover:shadow-lg hover:scale-[1.02]"
>
  Entrar na Guest List
</Button>
```

#### Alertas
```tsx
// snapify
<div className="text-red-500">{error}</div>

// snap
<Alert variant="destructive">
  <AlertTitle>Erro</AlertTitle>
  <AlertDescription>{error}</AlertDescription>
</Alert>
```

### 25.6 Responsividade

#### Breakpoints
```css
/* snapify */
.container {
  @apply px-4 md:px-6;
}

/* snap */
.container {
  @apply px-4 sm:px-6 md:px-8 lg:px-10
         py-6 sm:py-8 md:py-10 lg:py-12;
}
```

#### Grid System
```tsx
// snapify
<div className="grid md:grid-cols-2">

// snap
<div className="grid md:grid-cols-2 gap-8">
  <div className="order-1 md:order-2">
  <div className="order-2 md:order-1">
```

### 25.7 Performance

#### Image Loading
```tsx
// snapify
<Image src={url} alt={alt} />

// snap
<Image 
  src={url} 
  alt={alt}
  priority
  sizes="(max-width: 768px) 100vw, 50vw"
  loading="eager"
/>
```

#### Data Fetching
```typescript
// snapify
const data = await fetch(url);

// snap
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 15000);

try {
  const data = await fetch(url, { signal: controller.signal });
  clearTimeout(timeoutId);
} catch (error) {
  if (error.name === 'AbortError') {
    throw new Error('Request timeout');
  }
  throw error;
}
```

### 25.8 Segurança

#### Validações
```typescript
// snapify
const isValidUUID = (id: string) => {
  return id.length === 36;
};

// snap
const isValidUUID = (id: string) => {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
};
```

#### Sanitização
```typescript
// snapify
const title = event.title;

// snap
const title = DOMPurify.sanitize(event.title);
```

### 25.9 Logging e Monitoramento

#### Error Logging
```typescript
// snapify
console.error('Error:', error);

// snap
console.error('[PROMO] Error:', {
  error,
  context: 'PromoterGuestList',
  params: urlParams,
  timestamp: new Date().toISOString(),
  userId: session?.user?.id
});
```

#### Performance Monitoring
```typescript
// snapify
// Sem monitoramento

// snap
const startTime = performance.now();
// ... operação ...
const duration = performance.now() - startTime;
console.log('[PROMO] Operation duration:', duration);
``` 

## 26. Diferenças Críticas Adicionais

### 26.1 Layout (layout.tsx)

#### Estrutura
```tsx
// Ambos os sistemas usam o mesmo layout base
export default function PromoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      {children}
      <Toaster />
    </div>
  );
}
```

#### Diferenças de Comentários
```tsx
// snapify
// 🚀 OTIMIZAÇÃO PROMO: Layout otimizado com Toaster para performance melhorada

// snap
// 🚀 OTIMIZAÇÃO PROMO2: Layout otimizado com Toaster para o sistema v2
```

### 26.2 Actions (actions.ts)

#### Tipos e Interfaces
```typescript
// snapify - Interface mais flexível
interface PromoData {
  event: {
    id: string;
    // ... campos básicos ...
    org_name?: string;
    organizations?: { name: string }[] | { name: string };
  };
  promoter: {
    id: string;
    first_name: string | null;
    last_name: string | null;
  } | null;
  // ...
}

// snap - Interface mais estrita usando tipos do Supabase
type Event = Database['public']['Tables']['events']['Row'] & {
  organizations: {
    name: string;
  } | null;
}

interface PromoData {
  event: Event;
  hasAssociation: boolean;
  guestListStatus: {
    isOpen: boolean;
    message: string;
    status: 'BEFORE_OPENING' | 'OPEN' | 'CLOSED' | 'NO_SCHEDULE';
  };
  currentStep: 'phone' | 'auth' | 'qr';
  completedSteps: string[];
}
```

#### Validação de UUID
```typescript
// snapify - Validação com regex
const isValidUUID = (id: string): boolean => {
  const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  return uuidRegex.test(id);
}

// snap - Importado de utils
import { isValidUUID } from '@/lib/utils'
```

#### Verificação de Guest List
```typescript
// snapify - Lógica inline com formatação PT-PT
const now = new Date();
let guestListStatus = {
  isOpen: false,
  status: 'NO_SCHEDULE' as const,
  message: 'Período da guest list não configurado.',
  openDateTime: eventData.guest_list_open_datetime,
  closeDateTime: eventData.guest_list_close_datetime
};

// Formatação de data PT-PT
${openTime.toLocaleString('pt-PT', { 
  timeZone: 'Europe/Lisbon',
  day: '2-digit',
  month: '2-digit', 
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
})}

// snap - Função separada com formatação PT-BR
function checkGuestListStatus(event: Event) {
  const now = new Date();
  // Lógica em função separada
  // Formatação de data PT-BR
  ${openDate.toLocaleDateString('pt-BR')} às ${openDate.toLocaleTimeString('pt-BR')}
}
```

#### Processamento de Dados
```typescript
// snapify - Query unificada
const { data: unifiedData, error: unifiedError } = await supabase
  .from('events')
  .select(`
    id,
    title,
    description,
    date,
    time,
    location,
    flyer_url,
    is_published,
    guest_list_open_datetime,
    guest_list_close_datetime,
    organization_id,
    organizations(name)
  `)

// snap - Query com tipo do Supabase
const { data: event, error: eventError } = await supabase
  .from('events')
  .select('*, organizations(name)')
  .eq('id', eventId)
  .eq('is_published', true)
  .maybeSingle();
```

#### Logging
```typescript
// snapify - Prefixo [ERROR]
console.error('[ERROR] Erro ao buscar evento:', unifiedError);

// snap - Prefixo [PROMO]
console.error('[PROMO] Erro ao buscar evento:', eventError);
```

#### Retorno de Dados
```typescript
// snapify - Retorno com dados do promotor
return {
  event: processedEventData,
  promoter: promoterData || null,
  hasAssociation,
  guestListStatus
};

// snap - Retorno com steps
return {
  event,
  hasAssociation,
  guestListStatus,
  currentStep: 'phone',
  completedSteps: []
};
```

### 26.3 Diferenças Críticas de Implementação

1. **Tipagem**
   - snapify: Mais flexível, permite estruturas variadas
   - snap: Mais estrito, usa tipos do Supabase

2. **Formatação de Data**
   - snapify: PT-PT com timezone Lisboa
   - snap: PT-BR sem timezone específico

3. **Estrutura de Código**
   - snapify: Mais código inline
   - snap: Mais funções separadas

4. **Logging**
   - snapify: Foco em erros gerais
   - snap: Contexto específico do Promo

5. **Gestão de Estado**
   - snapify: Sem controle de steps
   - snap: Controle explícito de steps

### 26.4 Recomendações de Migração

1. **Tipagem**
   - Adotar tipos do Supabase
   - Manter consistência nas interfaces
   - Documentar tipos compartilhados

2. **Formatação**
   - Padronizar para PT-PT
   - Manter timezone Lisboa
   - Centralizar formatação

3. **Estrutura**
   - Separar funções auxiliares
   - Manter consistência no logging
   - Documentar funções principais

4. **Estado**
   - Implementar controle de steps
   - Manter histórico de completedSteps
   - Validar transições 

## 27. Análise Completa dos Componentes de Autenticação

### 27.1 GuestRequestClientV2

#### Estados
```typescript
// Estados principais
const [currentUser, setCurrentUser] = useState<ClientUser | null>(null);
const [isSubmitting, setIsSubmitting] = useState(false);
const [dialogOpen, setDialogOpen] = useState(false);
const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
const [showQRCode, setShowQRCode] = useState(false);

// Estados de loading
const [isPolling, setIsPolling] = useState(false);
const [processingProgress, setProcessingProgress] = useState(0);
const [loadingMessage, setLoadingMessage] = useState('');
const [loadingSubmessage, setLoadingSubmessage] = useState('');
```

#### Fluxo de Requisição
```typescript
const requestAccessOptimized = async () => {
  // 1. Validação inicial
  if (!currentUser) return;
  
  // 2. Setup do estado de loading
  setIsSubmitting(true);
  setLoadingMessage('Processando sua solicitação...');
  
  // 3. Preparação dos dados
  const userData = {
    event_id: eventId,
    client_user_id: currentUser.id,
    name: `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim(),
    phone: currentUser.phone || '',
    promoter_id: promoterId,
    team_id: teamId
  };
  
  // 4. Chamada à API
  const response = await fetch('/api/promo-v2/guests/create-instant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData),
  });
  
  // 5. Processamento do resultado
  const result = await response.json();
  if (result.data?.qr_code_url) {
    setQrCodeUrl(result.data.qr_code_url);
    setShowQRCode(true);
  }
};
```

#### Interface Visual
```tsx
<div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
  <div className="max-w-md mx-auto">
    {/* Informação do usuário */}
    {currentUser && (
      <div className="mb-4 text-center">
        <p className="text-lg text-white">
          Olá, {currentUser.firstName || 'Convidado'}!
        </p>
      </div>
    )}
    
    {/* QR Code ou Botão */}
    <div className="w-full">
      {showQRCode ? (
        <QRCodeDisplay url={qrCodeUrl} />
      ) : (
        <AuthButton
          currentUser={currentUser}
          isSubmitting={isSubmitting}
          onClick={handleClick}
        />
      )}
    </div>
  </div>
</div>
```

### 27.2 ClientAuthFlow

#### Estrutura de Steps
```typescript
type FlowStep = 'phone' | 'login' | 'register';

// Estados
const [currentStep, setCurrentStep] = useState<FlowStep>('phone');
const [completedSteps, setCompletedSteps] = useState<string[]>([]);
```

#### Fluxo de Navegação
```typescript
const handlePhoneVerified = (
  phoneNumber: string, 
  exists: boolean, 
  phoneUserId: string | null = null
) => {
  setCompletedSteps(['phone']);
  setCurrentStep(exists ? 'login' : 'register');
};

const handleLoginSuccess = (userData: any) => {
  setCompletedSteps(['phone', 'auth']);
  onComplete({ ...userData, isNewUser: false });
};

const handleRegistrationSuccess = (result: any) => {
  setCompletedSteps(['phone', 'auth']);
  onComplete({ ...result, isNewUser: true });
};
```

#### Componente de Dialog
```tsx
<Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent className="w-[95vw] max-w-[480px] p-0 bg-white rounded-xl">
    {/* Botão de fechar */}
    <CloseButton onClose={() => onOpenChange(false)} />
    
    {/* Progress Steps */}
    <ProgressSteps 
      currentStep={currentStep === 'phone' ? 'phone' : 'auth'} 
      completedSteps={completedSteps}
    />
    
    {/* Formulários */}
    {currentStep === 'phone' && <PhoneVerificationForm />}
    {currentStep === 'login' && <ClientLoginForm />}
    {currentStep === 'register' && <ClientRegistrationForm />}
  </DialogContent>
</Dialog>
```

### 27.3 Diferenças entre Versões

#### Estrutura de Arquivos
| snapify | snap |
|---------|------|
| /components/client-auth/* | /components/promo-v2/auth/* |
| Componentes genéricos | Componentes específicos |
| Sem providers dedicados | Com providers isolados |

#### Fluxo de Autenticação
| Aspecto | snapify | snap |
|---------|---------|------|
| Steps | Linear | Com branches |
| Estado | Local | Com context |
| Validação | Client-side | Híbrida |
| Feedback | Básico | Elaborado |

#### UI/UX
| Elemento | snapify | snap |
|----------|---------|------|
| Dialog | Fixo | Responsivo |
| Progress | Dots | Steps |
| Loading | Spinner | Progress bar |
| Feedback | Toast | Toast + Visual |

#### Segurança
| Feature | snapify | snap |
|---------|---------|------|
| Rate Limiting | Não | Sim |
| Validação | Básica | Completa |
| Sanitização | Não | Sim |
| Timeout | Não | Sim |

### 27.4 Melhorias no snap

1. **Segurança**
   ```typescript
   // Rate limiting
   if (response.status === 429) {
     throw new Error('Limite de tentativas atingido');
   }
   
   // Timeout
   const controller = new AbortController();
   const timeoutId = setTimeout(() => controller.abort(), 15000);
   ```

2. **Feedback Visual**
   ```typescript
   // Progress steps
   <ProgressSteps 
     currentStep={step}
     completedSteps={completedSteps}
     steps={[
       { id: 'phone', label: 'Telefone' },
       { id: 'auth', label: 'Autenticação' },
       { id: 'qr', label: 'QR Code' }
     ]}
   />
   ```

3. **Gestão de Estado**
   ```typescript
   // Context Provider
   <ClientAuthProvider>
     <ClientAuthFlow />
   </ClientAuthProvider>
   ```

4. **Validações**
   ```typescript
   // Validação híbrida
   const isValid = await Promise.all([
     validateClientSide(data),
     validateServerSide(data)
   ]);
   ```

### 27.5 Recomendações de Migração

1. **Segurança**
   - Implementar rate limiting
   - Adicionar timeouts
   - Melhorar validações
   - Implementar sanitização

2. **UX**
   - Migrar para progress steps
   - Melhorar feedback visual
   - Adicionar animações
   - Implementar loading states

3. **Arquitetura**
   - Isolar componentes
   - Implementar providers
   - Centralizar validações
   - Melhorar tipagem

4. **Performance**
   - Implementar lazy loading
   - Otimizar renders
   - Adicionar caching
   - Melhorar error handling

### 27.6 Plano de Implementação

1. **Fase 1: Estrutura**
   ```typescript
   // Criar providers
   export const ClientAuthProvider = ({ children }) => {
     // ... lógica de autenticação
   };
   
   // Criar hooks
   export const useClientAuth = () => {
     // ... lógica de estado
   };
   ```

2. **Fase 2: Componentes**
   ```typescript
   // Migrar para componentes isolados
   export const PhoneVerificationStep = () => {
     // ... lógica de verificação
   };
   
   export const AuthenticationStep = () => {
     // ... lógica de autenticação
   };
   ```

3. **Fase 3: Validações**
   ```typescript
   // Implementar validações
   const validatePhone = async (phone: string) => {
     // ... validação client-side
     const serverValidation = await validatePhoneServer(phone);
     // ... combinar resultados
   };
   ```

4. **Fase 4: UI/UX**
   ```typescript
   // Implementar feedback
   const showFeedback = (type: 'success' | 'error', message: string) => {
     toast[type](message, {
       // ... configurações avançadas
     });
   };
   ``` 

## 28. Análise dos Componentes de Verificação

### 28.1 PhoneVerificationForm

#### Estados e Refs
```typescript
// Estados principais
const [phone, setPhone] = useState<string>(defaultPhone)
const [isSubmitting, setIsSubmitting] = useState(false)
const [error, setError] = useState<string | null>(null)
const [progress, setProgress] = useState(0)
const [statusMessage, setStatusMessage] = useState('')
const [retryCount, setRetryCount] = useState(0)

// Refs para controle
const timeoutRef = useRef<NodeJS.Timeout | null>(null)
const debounceRef = useRef<NodeJS.Timeout | null>(null)
const controllerRef = useRef<AbortController | null>(null)
```

#### Sistema de Traduções
```typescript
const translations = {
  'Telefone': 'Telemóvel',
  'Por favor, insira um número de telemóvel': 'Por favor, introduz um número de telemóvel',
  'Formato de número incompleto ou inválido': 'Formato de número incompleto ou inválido',
  'Formato de número válido!': 'Formato de número válido!',
  // ... mais traduções
};
```

#### Verificação de Telefone
```typescript
const verifyPhone = async (): Promise<{exists: boolean, userId: string | null}> => {
  const response = await fetch('/api/client-auth-v3/check-phone', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone })
  });
  
  // Tratamento de erros robusto
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `Erro na verificação: ${response.status}`);
  }
  
  // Parse seguro
  let responseData;
  try {
    const responseText = await response.text();
    responseData = JSON.parse(responseText);
  } catch (parseError) {
    throw new Error('Erro ao processar resposta do servidor');
  }
  
  return {
    exists: !!responseData.exists,
    userId: responseData.userId || null
  };
};
```

#### Sistema de Retry
```typescript
const MAX_RETRIES = 2;
let currentTry = 0;

const attemptVerification = async () => {
  currentTry++;
  
  try {
    // Timeout de 10 segundos
    const timeoutId = setTimeout(() => {
      controllerRef.current?.abort();
    }, 10000);
    
    const data = await verifyPhone();
    clearTimeout(timeoutId);
    
    // Sucesso
    setProgress(100);
    onVerified(phone, data.exists, data.userId);
    
  } catch (error) {
    // Retry com backoff exponencial
    if (currentTry <= MAX_RETRIES) {
      const retryDelay = Math.min(1000 * Math.pow(2, currentTry - 1), 5000);
      setTimeout(() => attemptVerification(), retryDelay);
    }
  }
};
```

#### Interface Visual
```tsx
<Card className="border-0 shadow-none bg-transparent">
  <CardHeader>
    <CardTitle>Verificar Telemóvel</CardTitle>
    <CardDescription>
      Introduz o teu número para continuares
    </CardDescription>
  </CardHeader>
  
  <CardContent>
    <form className="space-y-3 sm:space-y-4">
      {/* Input de Telefone */}
      <PhoneInput
        defaultCountry="PT"
        international={false}
        countryCallingCodeEditable={false}
        style={{
          '--PhoneInput-color--focus': '#2563eb',
          '--PhoneInput-background': 'transparent'
        }}
      />
      
      {/* Validação em Tempo Real */}
      {phone && (
        <ValidationIndicator
          isValid={isPhoneValid}
          message={translations[isPhoneValid ? 'valid' : 'invalid']}
        />
      )}
      
      {/* Progress Bar */}
      {isSubmitting && (
        <ProgressIndicator
          value={progress}
          message={statusMessage}
        />
      )}
      
      {/* Botões */}
      <ButtonGroup
        isSubmitting={isSubmitting}
        onRetry={handleRetry}
        retryCount={retryCount}
      />
    </form>
  </CardContent>
</Card>
```

### 28.2 Diferenças entre Versões

#### Validação
| Aspecto | snapify | snap |
|---------|---------|------|
| Tempo Real | Não | Sim |
| Feedback | Básico | Visual + Texto |
| Retry | Manual | Automático |
| Timeout | Não | 10s |

#### UI/UX
| Elemento | snapify | snap |
|----------|---------|------|
| Input | Básico | Customizado |
| Progress | Simples | Com mensagens |
| Feedback | Toast | Inline + Toast |
| Responsivo | Não | Sim |

#### Segurança
| Feature | snapify | snap |
|---------|---------|------|
| Sanitização | Não | Sim |
| Rate Limit | Não | Sim |
| Timeout | Não | Sim |
| Retry | Não | Com backoff |

#### API
| Aspecto | snapify | snap |
|---------|---------|------|
| Endpoint | /v1/check | /v3/check |
| Validação | Client | Híbrida |
| Response | Simples | Detalhado |
| Erro | Básico | Estruturado |

### 28.3 Melhorias no snap

1. **Validação Robusta**
   ```typescript
   const validatePhone = async (phone: string) => {
     // Validação client-side
     if (!isValidPhoneNumber(phone)) {
       return false;
     }
     
     // Validação server-side
     try {
       const response = await fetch('/api/validate-phone', {
         method: 'POST',
         body: JSON.stringify({ phone })
       });
       return response.ok;
     } catch {
       return false;
     }
   };
   ```

2. **Retry com Backoff**
   ```typescript
   const retryWithBackoff = async (fn: () => Promise<any>, maxRetries = 3) => {
     for (let i = 0; i < maxRetries; i++) {
       try {
         return await fn();
       } catch (error) {
         if (i === maxRetries - 1) throw error;
         await new Promise(r => setTimeout(r, Math.pow(2, i) * 1000));
       }
     }
   };
   ```

3. **Feedback Visual**
   ```typescript
   const ProgressIndicator = ({ value, message }) => (
     <div className="space-y-2">
       <Progress value={value} className="h-2" />
       <p className="text-xs text-center">{message}</p>
     </div>
   );
   ```

4. **Gestão de Erros**
   ```typescript
   const handleError = (error: Error) => {
     // Erros conhecidos
     if (error instanceof NetworkError) {
       return 'Problema de conexão';
     }
     
     // Rate limiting
     if (error.status === 429) {
       return 'Muitas tentativas';
     }
     
     // Erro genérico
     return 'Erro na verificação';
   };
   ```

### 28.4 Recomendações de Migração

1. **Validação**
   - Implementar validação em tempo real
   - Adicionar feedback visual
   - Melhorar mensagens de erro
   - Implementar retry automático

2. **UI/UX**
   - Migrar para componentes customizados
   - Adicionar progress bar com mensagens
   - Melhorar feedback visual
   - Implementar responsividade

3. **Segurança**
   - Implementar rate limiting
   - Adicionar timeouts
   - Implementar sanitização
   - Adicionar retry com backoff

4. **API**
   - Migrar para v3 da API
   - Implementar validação híbrida
   - Melhorar estrutura de resposta
   - Implementar tratamento de erros 

## 29. Análise dos Componentes de Autenticação

### 29.1 ClientRegistrationForm

#### Estados e Props
```typescript
interface ClientRegistrationFormProps {
  phone: string;
  onSuccess: (userData: any) => void;
  onBack: () => void;
}

// Estados
const [isLoading, setIsLoading] = useState(false);
const [firstName, setFirstName] = useState('');
const [lastName, setLastName] = useState('');
```

#### Registro de Usuário
```typescript
const handleSubmit = async (e: React.FormEvent) => {
  // Validação
  if (!firstName || !lastName) {
    toast.error('Por favor, preencha todos os campos');
    return;
  }

  try {
    const response = await fetch('/api/promo-v2/register', {
      method: 'POST',
      body: JSON.stringify({ phone, firstName, lastName })
    });

    // Rate limiting
    if (response.status === 429) {
      toast.error('Muitas tentativas. Por favor, aguarde.');
      return;
    }

    const data = await response.json();
    onSuccess(data.user);
  } catch (error) {
    toast.error('Erro ao criar conta. Tente novamente.');
  }
};
```

#### Interface Visual
```tsx
<form className="space-y-6 p-6">
  {/* Campos de Input */}
  <Input
    placeholder="Seu nome"
    className="h-11 text-base bg-white dark:bg-gray-900 
               border-gray-200 dark:border-gray-800 
               focus:ring-2 focus:ring-blue-500/20"
  />
  
  {/* Botões */}
  <Button 
    className="w-full h-11 text-base font-medium 
               bg-blue-600 hover:bg-blue-700 
               shadow-lg shadow-blue-500/20"
  >
    {isLoading ? (
      <LoadingState />
    ) : (
      <CreateAccountState />
    )}
  </Button>
</form>
```

### 29.2 ClientLoginForm

#### Estados e Props
```typescript
interface ClientLoginFormProps {
  phone: string;
  userId?: string | null;
  onSuccess: (userData: any) => void;
  onBack: () => void;
}

// Estados
const [isLoading, setIsLoading] = useState(false);
const [code, setCode] = useState('');
```

#### Verificação de Código
```typescript
const handleSubmit = async (e: React.FormEvent) => {
  try {
    const response = await fetch('/api/promo-v2/verify-code', {
      method: 'POST',
      body: JSON.stringify({ phone, code, userId })
    });

    // Rate limiting
    if (response.status === 429) {
      toast.error('Muitas tentativas. Aguarde.');
      return;
    }

    const data = await response.json();
    onSuccess(data.user);
  } catch (error) {
    toast.error('Erro ao fazer login.');
  }
};
```

#### Reenvio de Código
```typescript
const handleResendCode = async () => {
  try {
    const response = await fetch('/api/promo-v2/resend-code', {
      method: 'POST',
      body: JSON.stringify({ phone })
    });

    if (response.ok) {
      toast.success('Novo código enviado!');
    }
  } catch (error) {
    toast.error('Erro ao reenviar código.');
  }
};
```

### 29.3 Diferenças entre Versões

#### Registro
| Aspecto | snapify | snap |
|---------|---------|------|
| Campos | Nome + Email | Nome + Sobrenome |
| Validação | Básica | Com feedback |
| UI | Simples | Com dark mode |
| Loading | Spinner | Com texto |

#### Login
| Aspecto | snapify | snap |
|---------|---------|------|
| Código | Numérico | Alfanumérico |
| Reenvio | Não tem | Implementado |
| Timeout | Não | 5 minutos |
| Feedback | Básico | Detalhado |

#### Segurança
| Feature | snapify | snap |
|---------|---------|------|
| Rate Limit | Não | Por IP + Phone |
| Tentativas | Ilimitadas | Máximo 3 |
| Bloqueio | Não | 15 minutos |
| Logs | Básicos | Detalhados |

#### UI/UX
| Elemento | snapify | snap |
|----------|---------|------|
| Tema | Light | Light + Dark |
| Inputs | Padrão | Customizados |
| Botões | Básicos | Com estados |
| Loading | Simples | Animado |

### 29.4 Melhorias no snap

1. **Validação de Campos**
   ```typescript
   const validateFields = (data: FormData) => {
     const errors = [];
     
     if (!data.firstName?.trim()) {
       errors.push('Nome é obrigatório');
     }
     
     if (!data.lastName?.trim()) {
       errors.push('Sobrenome é obrigatório');
     }
     
     return errors;
   };
   ```

2. **Rate Limiting**
   ```typescript
   const checkRateLimit = async (phone: string) => {
     const attempts = await getAttempts(phone);
     
     if (attempts >= 3) {
       const blockUntil = new Date();
       blockUntil.setMinutes(blockUntil.getMinutes() + 15);
       
       await setBlocked(phone, blockUntil);
       throw new Error('Muitas tentativas');
     }
   };
   ```

3. **Feedback Visual**
   ```typescript
   const LoadingState = () => (
     <div className="flex items-center">
       <Loader2 className="animate-spin mr-2" />
       <span className="text-sm">Processando...</span>
     </div>
   );
   ```

4. **Gestão de Erros**
   ```typescript
   const handleError = (error: Error) => {
     if (error.message.includes('rate limit')) {
       return 'Muitas tentativas. Aguarde 15 minutos.';
     }
     
     if (error.message.includes('invalid code')) {
       return 'Código inválido. Tente novamente.';
     }
     
     return 'Erro no sistema. Tente novamente.';
   };
   ```

### 29.5 Recomendações de Migração

1. **Segurança**
   - Implementar rate limiting
   - Adicionar bloqueio temporário
   - Melhorar validação de campos
   - Implementar logs detalhados

2. **UX**
   - Adicionar dark mode
   - Melhorar feedback visual
   - Implementar reenvio de código
   - Adicionar timeouts

3. **Performance**
   - Implementar cache
   - Otimizar validações
   - Melhorar loading states
   - Adicionar retry logic

4. **Código**
   - Migrar para TypeScript
   - Adicionar testes
   - Melhorar tipagem
   - Documentar funções
```

## 30. Análise dos Componentes de Sessão

### 30.1 RequireClientAuth

#### Estrutura
```typescript
interface ProtectedRouteProps {
  children: ReactNode;
}

// Componente de proteção
export function ClientProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isLoading } = useClientAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login/cliente');
    }
  }, [user, isLoading, router]);

  // Estados de renderização
  if (isLoading) return <LoadingSpinner />;
  if (user) return <>{children}</>;
  return null;
}

// Wrapper com provider
export function ClientProtectedRouteWrapper({ 
  children, 
  redirectTo = '/login/cliente'
}: { 
  children: React.ReactNode;
  redirectTo?: string;
}) {
  return (
    <ClientSessionProvider>
      <ClientProtectedRoute>
        {children}
      </ClientProtectedRoute>
    </ClientSessionProvider>
  );
}
```

#### Loading State
```tsx
<div className="flex items-center justify-center min-h-screen">
  <div className="animate-spin rounded-full h-12 w-12 
                  border-t-2 border-b-2 border-primary">
  </div>
</div>
```

### 30.2 ClientSessionProvider

#### Estrutura
```typescript
export function ClientSessionProvider({ 
  children 
}: { 
  children: ReactNode 
}) {
  const { user, isLoading, checkAuth } = useClientAuth();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const init = async () => {
      await checkAuth();
      setIsInitialized(true);
    };
    init();
  }, [checkAuth]);

  if (!isInitialized && isLoading) return null;
  return <>{children}</>;
}
```

### 30.3 Diferenças entre Versões

#### Proteção de Rota
| Aspecto | snapify | snap |
|---------|---------|------|
| Provider | Global | Isolado |
| Loading | Simples | Com spinner |
| Redirect | /client/auth | /login/cliente |
| Cache | v1 | v2 |

#### Sessão
| Aspecto | snapify | snap |
|---------|---------|------|
| Estado | Context | Hook |
| Init | Síncrono | Assíncrono |
| Check | Manual | Automático |
| Refresh | Não | Sim |

#### Segurança
| Feature | snapify | snap |
|---------|---------|------|
| Token | JWT | Session |
| Storage | Local | Cookie |
| Refresh | Não | Auto |
| Logout | Manual | Auto |

#### Performance
| Aspecto | snapify | snap |
|---------|---------|------|
| Loading | Eager | Lazy |
| Cache | Não | Sim |
| Prefetch | Não | Sim |
| Revalidate | Manual | Auto |

### 30.4 Melhorias no snap

1. **Gestão de Sessão**
   ```typescript
   const useSession = () => {
     const [session, setSession] = useState(null);
     const [loading, setLoading] = useState(true);
     
     useEffect(() => {
       const checkSession = async () => {
         try {
           const data = await getSession();
           setSession(data);
         } finally {
           setLoading(false);
         }
       };
       
       checkSession();
       
       // Auto refresh
       const interval = setInterval(checkSession, 5 * 60 * 1000);
       return () => clearInterval(interval);
     }, []);
     
     return { session, loading };
   };
   ```

2. **Proteção de Rota**
   ```typescript
   const ProtectedRoute = ({ children }) => {
     const { session, loading } = useSession();
     const router = useRouter();
     
     useEffect(() => {
       if (!loading && !session) {
         router.replace('/login');
       }
     }, [session, loading]);
     
     if (loading) {
       return <LoadingSpinner />;
     }
     
     if (!session) {
       return null;
     }
     
     return <>{children}</>;
   };
   ```

3. **Cache de Sessão**
   ```typescript
   const sessionCache = {
     data: null,
     timestamp: 0,
     
     async get() {
       const now = Date.now();
       if (this.data && now - this.timestamp < 5 * 60 * 1000) {
         return this.data;
       }
       
       const session = await fetchSession();
       this.data = session;
       this.timestamp = now;
       return session;
     },
     
     clear() {
       this.data = null;
       this.timestamp = 0;
     }
   };
   ```

4. **Refresh Token**
   ```typescript
   const refreshSession = async () => {
     try {
       const response = await fetch('/api/auth/refresh', {
         credentials: 'include'
       });
       
       if (!response.ok) {
         throw new Error('Refresh failed');
       }
       
       return await response.json();
     } catch {
       sessionCache.clear();
       return null;
     }
   };
   ```

### 30.5 Recomendações de Migração

1. **Segurança**
   - Migrar para cookies seguros
   - Implementar refresh token
   - Adicionar rate limiting
   - Melhorar validação de sessão

2. **Performance**
   - Implementar cache
   - Adicionar prefetch
   - Otimizar loading states
   - Implementar revalidação

3. **UX**
   - Melhorar feedback de loading
   - Adicionar transições suaves
   - Implementar redirect inteligente
   - Melhorar mensagens de erro

4. **Código**
   - Isolar lógica de autenticação
   - Melhorar tipagem
   - Adicionar testes
   - Documentar funções

### 30.6 Plano de Implementação

1. **Fase 1: Segurança**
   ```typescript
   // Implementar cookies seguros
   const setSecureCookie = (name: string, value: string) => {
     document.cookie = `${name}=${value}; Secure; HttpOnly; SameSite=Strict`;
   };
   
   // Implementar refresh token
   const refreshToken = async () => {
     const response = await fetch('/api/auth/refresh');
     const { token } = await response.json();
     setSecureCookie('session', token);
   };
   ```

2. **Fase 2: Performance**
   ```typescript
   // Implementar cache
   const cache = new Map();
   
   const getCachedData = async (key: string) => {
     if (cache.has(key)) {
       return cache.get(key);
     }
     
     const data = await fetchData(key);
     cache.set(key, data);
     return data;
   };
   ```

3. **Fase 3: UX**
   ```typescript
   // Melhorar loading states
   const LoadingState = () => (
     <div className="flex flex-col items-center">
       <Spinner />
       <p>Verificando sessão...</p>
     </div>
   );
   ```

4. **Fase 4: Testes**
   ```typescript
   // Testes de autenticação
   describe('Authentication', () => {
     it('should protect routes', () => {
       // ... testes
     });
     
     it('should handle session expiry', () => {
       // ... testes
     });
   });
   ```

## 31. Análise de Hooks e Tipos

### 31.1 useClientAuth

#### Contexto e Provider
```typescript
interface ClientAuthContextType {
  user: ClientUser | null;
  isLoading: boolean;
  error: string | null;
  updateUser: (user: ClientUser) => Promise<ClientUser>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<ClientUser | null>;
}

const ClientAuthContext = createContext<ClientAuthContextType>({
  user: null,
  isLoading: true,
  error: null,
  // ... funções padrão
});
```

#### Gestão de Estado
```typescript
const [authState, setAuthState] = useState<{
  user: ClientUser | null;
  isLoading: boolean;
  error: string | null;
}>({
  user: null,
  isLoading: true,
  error: null
});
```

#### Segurança e Timeout
```typescript
// Timeout de segurança
loadingTimeoutRef.current = setTimeout(() => {
  console.warn('⚠️ [CLIENT-AUTH] Timeout - forçando isLoading: false');
  setAuthState(prevState => ({
    ...prevState,
    isLoading: false,
    error: prevState.error || 'Timeout ao carregar autenticação'
  }));
}, 10000);

// Limpeza de cookies problemáticos
document.cookie.split(";").forEach(cookie => {
  if (name.includes('supabase') && document.cookie.includes('base64-')) {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  }
});
```

### 31.2 Tipos do Sistema

#### Cliente
```typescript
interface ClientUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  email: string | null;
  auth_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

interface ClientUserProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  auth_id: string | null;
  created_at: string;
  updated_at: string;
}
```

#### Verificação
```typescript
interface PhoneVerificationResult {
  exists: boolean;
  userId: string | null;
  source?: 'cache' | 'database';
  responseTime?: number;
}
```

#### Guest List
```typescript
interface GuestCreationData {
  event_id: string;
  client_user_id: string;
  promoter_id: string;
  team_id: string;
  name: string;
  phone: string;
  email?: string;
}

interface GuestResult {
  id: string;
  qr_code_url: string;
  created_at?: string;
}
```

### 31.3 Diferenças entre Versões

#### Hook de Autenticação
| Aspecto | snapify | snap |
|---------|---------|------|
| Provider | Global | Isolado |
| Cache | Não | Sim |
| Timeout | Não | 10s |
| Retry | Não | Com backoff |

#### Tipos
| Aspecto | snapify | snap |
|---------|---------|------|
| Tipagem | Básica | Estrita |
| Interfaces | Simples | Detalhadas |
| Validação | Runtime | Compile-time |
| Documentação | Não | JSDoc |

#### Segurança
| Feature | snapify | snap |
|---------|---------|------|
| Cookie Clean | Não | Sim |
| Timeout | Não | 10s |
| Retry | Não | 3x |
| Logs | Básicos | Detalhados |

#### Performance
| Aspecto | snapify | snap |
|---------|---------|------|
| Cache | Não | Sim |
| Lazy Load | Não | Sim |
| Cleanup | Básico | Completo |
| Error Handling | Simples | Robusto |

### 31.4 Melhorias no snap

1. **Gestão de Cache**
   ```typescript
   const authCache = {
     data: null as ClientUser | null,
     timestamp: 0,
     
     isValid() {
       return (
         this.data && 
         Date.now() - this.timestamp < 5 * 60 * 1000
       );
     },
     
     set(user: ClientUser) {
       this.data = user;
       this.timestamp = Date.now();
     },
     
     clear() {
       this.data = null;
       this.timestamp = 0;
     }
   };
   ```

2. **Retry com Backoff**
   ```typescript
   const retryWithBackoff = async (
     fn: () => Promise<any>,
     maxRetries = 3
   ) => {
     for (let i = 0; i < maxRetries; i++) {
       try {
         return await fn();
       } catch (error) {
         const delay = Math.min(1000 * Math.pow(2, i), 5000);
         await new Promise(r => setTimeout(r, delay));
       }
     }
     throw new Error('Max retries reached');
   };
   ```

3. **Cleanup Robusto**
   ```typescript
   const cleanup = () => {
     // Limpar timeouts
     clearTimeout(loadingTimeoutRef.current);
     clearTimeout(retryTimeoutRef.current);
     
     // Limpar listeners
     authListener?.unsubscribe();
     
     // Limpar cache
     authCache.clear();
     
     // Limpar cookies
     cleanupCookies();
   };
   ```

4. **Error Handling**
   ```typescript
   const handleError = (error: Error) => {
     // Log estruturado
     console.error('[CLIENT-AUTH] Error:', {
       message: error.message,
       stack: error.stack,
       timestamp: new Date().toISOString()
     });
     
     // Cleanup
     cleanup();
     
     // Update state
     setAuthState({
       user: null,
       isLoading: false,
       error: error.message
     });
   };
   ```

### 31.5 Recomendações de Migração

1. **Segurança**
   - Implementar cache seguro
   - Adicionar timeouts
   - Melhorar limpeza de cookies
   - Implementar retry com backoff

2. **Performance**
   - Implementar lazy loading
   - Otimizar cleanup
   - Melhorar gestão de estado
   - Adicionar cache

3. **Tipagem**
   - Migrar para tipos estritos
   - Adicionar validações
   - Melhorar interfaces
   - Documentar tipos

4. **Código**
   - Isolar lógica
   - Melhorar error handling
   - Adicionar logs estruturados
   - Implementar testes
```

## 32. Integrações e Dependências

### 32.1 Tipos do Supabase

#### Roles e Permissões
```typescript
// Tipos de roles
type Role = 'organizador' | 'promotor';

// Tipos de tabelas
interface EventPromoters {
  id: string;
  event_id: string;
  promoter_id: string;
  team_id: string;
  promoter_code: string;
  promoter_link: string;
  created_at: string;
}

interface Guests {
  id: string;
  event_id: string;
  promoter_id: string | null;
  team_id: string | null;
  // ... outros campos
}
```

#### Funções RPC
```typescript
interface Database {
  public: {
    Functions: {
      create_promoter_team_v2: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      get_public_promoter_page_data: {
        Args: { promoter_user_id: string };
        Returns: {
          promoter_first_name: string | null;
          promoter_last_name: string | null;
          promoter_avatar_url: string | null;
        };
      };
    };
  };
}
```

### 32.2 Middleware e Redirecionamento

#### Middleware
```typescript
// Mapeamento de roles
const roleMap = {
  'promoter': 'promotor',
  // ... outros
};

// Redirecionamento baseado em role
switch (userRole) {
  case 'promotor':
    if (hasTeam) {
      return '/app/promotor/dashboard';
    }
    return '/app/promotor/equipes/escolha';
}
```

#### Verificações Especiais
```typescript
// Caso especial para promotores
if (userRole === 'promotor' && 
    req.nextUrl.pathname === '/app/promotor/dashboard') {
  // Verificar se tem equipe
  const redirectUrl = new URL('/app/promotor/equipes', req.url);
  // ...
}
```

### 32.3 Resilience e Queues

#### Graceful Degradation
```typescript
interface GuestData {
  promoter_id: string;
  // ... outros campos
}

// Fallback para criação de guest
const createGuestFallback = async (guestData: GuestData) => {
  try {
    await supabase.rpc('create_guest_fallback', {
      p_promoter_id: guestData.promoter_id,
      // ... outros params
    });
  } catch (error) {
    // Fallback do fallback
    await emergencyQueue.add(guestData);
  }
};
```

#### Emergency Queue
```typescript
const emergencyQueue = {
  add: async (data: GuestData) => {
    await supabase.rpc('emergency_guest_creation', {
      p_promoter_id: data.promoter_id,
      // ... outros params
    });
  }
};
```

### 32.4 Diferenças entre Versões

#### Database
| Aspecto | snapify | snap |
|---------|---------|------|
| Schema | Simples | Otimizado |
| Índices | Básicos | Completos |
| RPC | Não | Sim |
| Políticas | Básicas | Granulares |

#### Middleware
| Aspecto | snapify | snap |
|---------|---------|------|
| Checks | Simples | Completos |
| Cache | Não | Sim |
| Redirect | Direto | Com fallback |
| Logs | Básicos | Detalhados |

#### Resilience
| Feature | snapify | snap |
|---------|---------|------|
| Fallback | Não | Sim |
| Queue | Não | Sim |
| Retry | Não | Com backoff |
| Recovery | Manual | Automático |

#### Performance
| Aspecto | snapify | snap |
|---------|---------|------|
| Caching | Não | Sim |
| Batching | Não | Sim |
| Indexing | Básico | Otimizado |
| Monitoring | Não | Sim |

### 32.5 Melhorias no snap

1. **Database Schema**
   ```sql
   -- Índices otimizados
   CREATE INDEX idx_guests_promoter ON guests (
     promoter_id,
     event_id,
     created_at DESC
   );
   
   -- Políticas granulares
   CREATE POLICY "Promoters can view their guests"
   ON guests FOR SELECT
   USING (promoter_id = auth.uid());
   ```

2. **Middleware Resiliente**
   ```typescript
   const resilientMiddleware = async (req: Request) => {
     try {
       // Cache check
       const cached = await cache.get(req.url);
       if (cached) return cached;
       
       // Main logic
       const result = await mainLogic(req);
       
       // Cache result
       await cache.set(req.url, result);
       return result;
       
     } catch (error) {
       // Fallback
       return fallbackLogic(req);
     }
   };
   ```

3. **Queue System**
   ```typescript
   const queueSystem = {
     add: async (task: Task) => {
       const result = await retryWithBackoff(
         () => processTask(task),
         {
           maxRetries: 3,
           baseDelay: 1000,
           maxDelay: 5000
         }
       );
       return result;
     }
   };
   ```

4. **Monitoring**
   ```typescript
   const monitor = {
     track: (metric: string, value: number) => {
       console.log('[METRIC]', {
         metric,
         value,
         timestamp: new Date(),
         context: 'promo-system'
       });
     }
   };
   ```

### 32.6 Recomendações de Migração

1. **Database**
   - Otimizar schema
   - Adicionar índices
   - Implementar RPC
   - Melhorar políticas

2. **Middleware**
   - Implementar cache
   - Adicionar resilience
   - Melhorar redirects
   - Adicionar logs

3. **Resilience**
   - Implementar fallbacks
   - Adicionar queues
   - Configurar retry
   - Automatizar recovery

4. **Performance**
   - Implementar cache
   - Otimizar queries
   - Adicionar monitoring
   - Melhorar indexing
```

## 33. Análise Visual do Fluxo Completo

### 33.1 Tela Inicial (Landing)

#### snapify
```tsx
<div className="min-h-screen bg-white">
  <div className="max-w-7xl mx-auto px-4">
    {/* Flyer */}
    <div className="relative rounded-lg">
      <Image
        src={event.flyer_url}
        alt={event.title}
        className="rounded-lg"
      />
    </div>
    
    {/* Botão */}
    <Button className="w-full bg-blue-600 hover:bg-blue-700">
      Entrar com Telemóvel
    </Button>
  </div>
</div>
```

#### snap
```tsx
<div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
  <div className="max-w-7xl mx-auto px-4">
    {/* Flyer */}
    <div 
      className="relative rounded-lg overflow-hidden"
      style={{
        aspectRatio: '16/9',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
        border: '1px solid rgba(255,255,255,0.1)',
        backgroundColor: 'rgba(255,255,255,0.05)'
      }}
    >
      <Image
        src={event.flyer_url}
        fill
        priority
        sizes="(max-width: 768px) 100vw, 50vw"
        className="object-cover"
      />
    </div>
    
    {/* Botão */}
    <Button 
      className="w-full h-11 text-base font-medium 
                 bg-[#7C3AED] hover:bg-[#6D28D9] 
                 text-white rounded-lg transition-all 
                 duration-200 shadow-lg 
                 shadow-purple-500/20"
    >
      <Phone className="mr-2 h-5 w-5" />
      Entrar com Telemóvel
    </Button>
  </div>
</div>
```

### 33.2 Modal de Progresso

#### snapify
```tsx
// Não tem barra de progresso
<div className="flex justify-between mb-4">
  <div className="flex items-center">
    <Phone className="w-6 h-6 text-gray-500" />
    <span>Verificar</span>
  </div>
  // ... outros steps
</div>
```

#### snap
```tsx
<ProgressSteps
  steps={[
    {
      id: 'phone',
      title: 'Verificar',
      subtitle: 'Confirme seu número',
      icon: Phone,
      // Estilos
      activeColor: '#1A73E8',
      activeBg: '#E8F0FE',
      inactiveColor: 'gray-500',
      inactiveBg: '#F3F4F6'
    },
    {
      id: 'auth',
      title: 'Autenticar',
      subtitle: 'Login ou registro',
      icon: Shield
    },
    {
      id: 'qr',
      title: 'QR Code',
      subtitle: 'Gerar acesso',
      icon: QrCode
    }
  ]}
  currentStep={currentStep}
  completedSteps={completedSteps}
/>
```

### 33.3 Verificação de Telefone

#### snapify
```tsx
<div className="p-4">
  <h2 className="text-lg font-medium">Verificar Telemóvel</h2>
  
  <PhoneInput
    defaultCountry="PT"
    className="mt-4"
  />
  
  <Button className="w-full mt-4 bg-blue-600">
    Continuar
  </Button>
</div>
```

#### snap
```tsx
<Card className="border-0 shadow-none bg-transparent">
  <CardHeader className="px-6 pt-6 pb-4">
    <CardTitle className="text-center text-xl">
      Verificar Telemóvel
    </CardTitle>
    <CardDescription className="text-center text-sm">
      Introduz o teu número para continuares
    </CardDescription>
  </CardHeader>
  
  <CardContent className="px-6 pb-6">
    <PhoneInput
      defaultCountry="PT"
      international={false}
      countryCallingCodeEditable={false}
      style={{
        '--PhoneInput-color--focus': '#2563eb',
        '--PhoneInput-background': 'transparent'
      }}
    />
    
    {/* Validação em tempo real */}
    {phone && (
      <ValidationIndicator
        isValid={isPhoneValid}
        message={translations[isPhoneValid ? 'valid' : 'invalid']}
      />
    )}
    
    {/* Progress Bar */}
    {isSubmitting && (
      <Progress value={progress} className="h-1.5 sm:h-2" />
    )}
    
    <Button 
      className="w-full h-11 text-base font-medium
                 bg-[#7C3AED] hover:bg-[#6D28D9]"
    >
      {isSubmitting ? (
        <LoadingState />
      ) : (
        'Continuar'
      )}
    </Button>
  </CardContent>
</Card>
```

### 33.4 Login

#### snapify
```tsx
<div className="p-4">
  <h2 className="text-lg font-medium">Login</h2>
  
  <Input
    type="password"
    placeholder="Senha"
    className="mt-4"
  />
  
  <Button className="w-full mt-4 bg-blue-600">
    Entrar
  </Button>
</div>
```

#### snap
```tsx
<form className="space-y-6 p-6">
  <div className="space-y-2">
    <Label className="text-sm font-medium text-gray-700">
      Código de Verificação
    </Label>
    <Input
      type="text"
      maxLength={6}
      className="text-center text-lg tracking-wider h-11 
                 bg-white dark:bg-gray-900 
                 border-gray-200 dark:border-gray-800 
                 focus:ring-2 focus:ring-blue-500/20"
    />
    <p className="text-sm text-gray-500">
      Enviamos um código para {phone}
    </p>
  </div>

  <div className="space-y-4">
    <Button 
      className="w-full h-11 text-base font-medium
                 bg-blue-600 hover:bg-blue-700 
                 shadow-lg shadow-blue-500/20"
    >
      {isLoading ? (
        <LoadingState />
      ) : (
        <>
          <LogIn className="mr-2 h-5 w-5" />
          Entrar
        </>
      )}
    </Button>

    <div className="flex justify-between">
      <BackButton />
      <ResendCodeButton />
    </div>
  </div>
</form>
```

### 33.5 Registro

#### snapify
```tsx
<div className="p-4">
  <h2 className="text-lg font-medium">Criar Conta</h2>
  
  <Input
    placeholder="Nome"
    className="mt-4"
  />
  
  <Input
    placeholder="Email"
    className="mt-4"
  />
  
  <Button className="w-full mt-4 bg-blue-600">
    Criar Conta
  </Button>
</div>
```

#### snap
```tsx
<form className="space-y-6 p-6">
  <div className="space-y-4">
    <div className="space-y-2">
      <Label className="text-sm font-medium text-gray-700">
        Nome
      </Label>
      <Input
        type="text"
        placeholder="Seu nome"
        className="h-11 text-base bg-white dark:bg-gray-900 
                   border-gray-200 dark:border-gray-800 
                   focus:ring-2 focus:ring-blue-500/20"
      />
    </div>

    <div className="space-y-2">
      <Label className="text-sm font-medium text-gray-700">
        Sobrenome
      </Label>
      <Input
        type="text"
        placeholder="Seu sobrenome"
        className="h-11 text-base bg-white dark:bg-gray-900 
                   border-gray-200 dark:border-gray-800 
                   focus:ring-2 focus:ring-blue-500/20"
      />
    </div>
  </div>

  <div className="space-y-4">
    <Button 
      className="w-full h-11 text-base font-medium
                 bg-blue-600 hover:bg-blue-700 
                 shadow-lg shadow-blue-500/20"
    >
      {isLoading ? (
        <LoadingState />
      ) : (
        <>
          <UserPlus className="mr-2 h-5 w-5" />
          Criar Conta
        </>
      )}
    </Button>

    <Button
      variant="ghost"
      onClick={onBack}
      className="w-full text-sm text-gray-600"
    >
      <ArrowLeft className="mr-2 h-4 w-4" />
      Voltar
    </Button>
  </div>
</form>
```

### 33.6 Principais Diferenças Visuais

#### Cores
| Elemento | snapify | snap |
|----------|---------|------|
| Background | Branco | Gradiente escuro |
| Botão Principal | #2563EB | #7C3AED |
| Inputs | Cinza claro | Transparente |
| Texto | Cinza escuro | Branco/Cinza |

#### Tipografia
| Elemento | snapify | snap |
|----------|---------|------|
| Títulos | 18px/medium | 20px/semibold |
| Labels | 14px/regular | 14px/medium |
| Botões | 14px/medium | 16px/medium |
| Inputs | 14px/regular | 16px/regular |

#### Espaçamento
| Elemento | snapify | snap |
|----------|---------|------|
| Padding Container | 16px | 24px |
| Gap Vertical | 16px | 24px |
| Altura Botões | 40px | 44px |
| Altura Inputs | 40px | 44px |

#### Feedback Visual
| Elemento | snapify | snap |
|----------|---------|------|
| Loading | Spinner | Progress + Text |
| Validação | Após submit | Em tempo real |
| Erros | Texto simples | Com ícone |
| Success | Texto simples | Com animação |

### 33.7 Recomendações de Migração

1. **Visual**
   - Adotar gradiente escuro
   - Implementar shadows
   - Melhorar tipografia
   - Adicionar animações

2. **Feedback**
   - Adicionar progress bar
   - Implementar validação real-time
   - Melhorar estados de erro
   - Adicionar animações de transição

3. **Layout**
   - Aumentar espaçamentos
   - Melhorar hierarquia
   - Implementar grid system
   - Otimizar responsividade

4. **UX**
   - Adicionar loading states
   - Melhorar feedback visual
   - Implementar transições
   - Adicionar micro-interações