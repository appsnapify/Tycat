# 🔐 PLANO DE RESOLUÇÃO SEGURA DOS PROBLEMAS DE SEGURANÇA CRÍTICOS - TYCAT

## 📌 RESUMO EXECUTIVO
- **Total de Problemas:** 7 issues de segurança crítica (SQL Grants, SSL/TLS, File Access)
- **Estratégia:** Correção cirúrgica e validada por testes de regressão
- **Risco:** Baixo — plano foca em permissões granulares, mantendo RLS e funcionamento atual
- **Tempo Estimado:** 2–3 horas (inclui testes)

---

## 🟥 FASE 1 — GRANT ALL: Correção de permissões excessivas (Prioridade Máxima)

### 1.1 Tabela `guests`
Problema encontrado:
```sql
GRANT ALL ON guests TO anon, authenticated, service_role;
```

Correção segura (granular):
```sql
REVOKE ALL ON guests FROM anon, authenticated, service_role;

-- Leitura pública, se aplicável (guest list pública)
GRANT SELECT ON guests TO anon;

-- Utilizadores autenticados: ler e inserir (registo/gestão de convidados)
GRANT SELECT, INSERT ON guests TO authenticated;

-- Service role mantém acesso total (migrações/admin)
GRANT ALL ON guests TO service_role;
```

Testes de regressão esperados:
- Anónimos conseguem ver guests apenas se a UI pública exigir
- Utilizadores autenticados continuam a conseguir inserir/ler seus convidados
- Scanner e migrações continuam a funcionar (service_role preservado)

---

### 1.2 Sistema de Scanner — `create_scanner_system.sql`
Problema encontrado:
```sql
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;
```

Correção segura (apenas objetos necessários):
```sql
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated, service_role;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM authenticated, service_role;

-- Scanner: permissões específicas
GRANT SELECT, INSERT, UPDATE ON event_scanners TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON scanner_sessions TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON scan_logs TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON scanner_offline_cache TO authenticated, service_role;

-- Objetos críticos mantidos para service_role (migrações e operações administrativas)
GRANT ALL ON guests TO service_role;
GRANT ALL ON events TO service_role;
GRANT ALL ON teams TO service_role;
GRANT ALL ON team_members TO service_role;
GRANT ALL ON organization_teams TO service_role;
GRANT ALL ON commissions TO service_role;
GRANT ALL ON commission_payments TO service_role;
GRANT ALL ON commission_payment_items TO service_role;
```

Testes de regressão esperados:
- Login do scanner, criação/atualização de sessões e registo de scans continuam a funcionar
- Dashboards e workflows de equipas/comissões imperturbados
- RLS continua ativo; service_role só onde necessário

---

## 🟧 FASE 2 — SSL/TLS: URLs seguras (Prioridade Média)
Problema: URLs hardcoded devem respeitar ambiente seguro.

Padrão recomendado:
```ts
const qrCodeUrl = process.env.NEXT_PUBLIC_QR_API_URL
  ? `${process.env.NEXT_PUBLIC_QR_API_URL}${guestId}`
  : `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${guestId}`;
```

Testes de regressão:
- QR codes continuam a gerar corretamente (dev e prod)
- Sem mixed content em produção

---

## 🟨 FASE 3 — File Access: leitura de SQL com validação (Prioridade Baixa)
Estado atual (adequado): `lib/supabase/runMigrations.ts` já valida caminho com `isSecurePath`, restringe diretórios e usa `fs.promises.readFile` com whitelisting.

Ação: manter como está e documentar no código a racional de segurança.

---

## 🧪 PLANO DE TESTES E VALIDAÇÕES (não intrusivo)

### A. Verificar existência de objetos (SQL)
```sql
-- Tabelas principais
SELECT to_regclass('public.events');
SELECT to_regclass('public.guests');
SELECT to_regclass('public.event_scanners');
SELECT to_regclass('public.scanner_sessions');
SELECT to_regclass('public.scan_logs');
SELECT to_regclass('public.scanner_offline_cache');
SELECT to_regclass('public.teams');
SELECT to_regclass('public.team_members');
SELECT to_regclass('public.organization_teams');
SELECT to_regclass('public.commissions');
SELECT to_regclass('public.commission_payments');
SELECT to_regclass('public.commission_payment_items');

-- Colunas necessárias
SELECT column_name FROM information_schema.columns 
WHERE table_name='guests' AND column_name='qr_code_url';

-- Funções usadas
SELECT proname FROM pg_proc 
WHERE proname IN (
  'get_public_promoter_page_data',
  'get_event_guest_count_secure',
  'get_multiple_events_guest_count_secure',
  'associate_team_to_organization_secure',
  'create_team_secure',
  'register_client_user',
  'client_user_login',
  'create_guest_with_client',
  'get_client_guests'
);
```

### B. Validar RLS ativo
```sql
SELECT tablename, policyname, roles, cmd
FROM pg_policies
WHERE schemaname='public'
  AND tablename IN (
    'events','guests','event_scanners','scanner_sessions','scan_logs',
    'scanner_offline_cache','teams','team_members','organization_teams',
    'commissions','commission_payments','commission_payment_items'
  );
```

### C. Confirmar permissões pós-correção
```sql
SELECT grantee, table_name, string_agg(privilege_type, ', ') AS privileges
FROM information_schema.table_privileges
WHERE table_name IN (
  'guests','events','event_scanners','scanner_sessions','scan_logs',
  'scanner_offline_cache','teams','team_members','organization_teams',
  'commissions','commission_payments','commission_payment_items'
)
GROUP BY grantee, table_name
ORDER BY table_name, grantee;
```

### D. Testes funcionais (via API/UI)
- Scanner: login, criação de sessão, scan, stats, healthcheck
- Organizador: KPIs/contagens, criação/gestão de eventos
- Promotor: criação de convidados (inserção em `guests`), listagens
- Equipas/Comissões: criar equipa, associar, pagar comissões
- Funções RPC: `.rpc('get_public_promoter_page_data', ...)` autenticado

---

## 🛠️ EXECUÇÃO PASSO-A-PASSO (DBA)

### 1) Backup e baseline
```bash
pg_dump -h <HOST> -U <USER> -d <DB> > backup_pre_permissoes.sql
```

### 2) Aplicar correções de permissões (em transações lógicas)
```sql
BEGIN;
  -- Guests
  REVOKE ALL ON guests FROM anon, authenticated, service_role;
  GRANT SELECT ON guests TO anon;
  GRANT SELECT, INSERT ON guests TO authenticated;
  GRANT ALL ON guests TO service_role;

  -- Scanner (revogações globais e concessões específicas)
  REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated, service_role;
  REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM authenticated, service_role;

  GRANT SELECT, INSERT, UPDATE ON event_scanners TO authenticated, service_role;
  GRANT SELECT, INSERT, UPDATE ON scanner_sessions TO authenticated, service_role;
  GRANT SELECT, INSERT, UPDATE ON scan_logs TO authenticated, service_role;
  GRANT SELECT, INSERT, UPDATE ON scanner_offline_cache TO authenticated, service_role;

  -- Objetos críticos p/ service_role (migrações/admin)
  GRANT ALL ON events TO service_role;
  GRANT ALL ON teams TO service_role;
  GRANT ALL ON team_members TO service_role;
  GRANT ALL ON organization_teams TO service_role;
  GRANT ALL ON commissions TO service_role;
  GRANT ALL ON commission_payments TO service_role;
  GRANT ALL ON commission_payment_items TO service_role;
COMMIT;
```

### 3) Validações pós-correção
- Executar as queries de verificação A, B e C (acima)
- Exercitar testes funcionais D

### 4) Monitorização
- Acompanhar logs de API e DB por 24–48h
- Se surgir erro de RPC ausente (`cleanup_expired_scanners`, `list_tables`, `add_status_field`), optar por:
  - (a) criar função no DB; ou
  - (b) remover/ajustar chamadas no código num ciclo separado (fora deste plano)

---

## 🔄 ROLLBACK (se necessário)
```sql
BEGIN;
  -- Reverter permissões (estado anterior)
  GRANT ALL ON guests TO anon, authenticated, service_role;
  GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
  GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;
COMMIT;

-- Último recurso: restaurar backup
-- pg_restore -h <HOST> -U <USER> -d <DB> backup_pre_permissoes.sql
```

---

## ✅ CRITÉRIOS DE SUCESSO
- 0 issues críticos relacionados a permissões/SSL/File Access
- RLS ativo em todas as tabelas sensíveis
- Scanner, eventos, guests, equipas e comissões intactos
- Migrações e admin flows funcionais

---

## 📎 ANEXO — SQL de verificação rápida
```sql
-- Objetos
SELECT to_regclass('public.events'), to_regclass('public.guests');
SELECT to_regclass('public.event_scanners'), to_regclass('public.scanner_sessions');

-- RLS
SELECT tablename, policyname FROM pg_policies WHERE schemaname='public';

-- Permissões
SELECT grantee, table_name, privilege_type 
FROM information_schema.table_privileges 
WHERE table_name IN ('guests','event_scanners','scanner_sessions','scan_logs');
```
