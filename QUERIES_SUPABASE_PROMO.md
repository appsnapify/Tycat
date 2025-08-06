# QUERIES SUPABASE - SISTEMA PROMO V2

## IMPORTANTE: UI/UX
Este documento contém apenas as queries necessárias. A interface do usuário deve manter EXATAMENTE o mesmo visual e fluxo:
- Modal de 3 etapas (Telefone → Auth → QR)
- Ícones e cores específicas
- Textos e layout idênticos
- Fluxo de usuário inalterado

## QUERIES PRINCIPAIS

### 1. Verificação de Telefone
```sql
-- Verificar se telefone existe
select exists (
  select 1 
  from public.client_users 
  where phone = $1
) as exists;
```

### 2. Verificação de Associações
```sql
-- Verificar se promotor está associado ao evento
select exists (
  select 1
  from public.event_promoters ep
  where ep.event_id = $1
  and ep.promoter_id = $2
  and ep.team_id = $3
) as has_association;

-- Verificar se equipe está associada à organização
select exists (
  select 1
  from public.organization_teams ot
  join public.events e on e.organization_id = ot.organization_id
  where e.id = $1
  and ot.team_id = $2
) as team_associated;
```

### 3. Queries Otimizadas
```sql
-- Buscar evento com joins otimizados
select 
  e.*,
  json_build_object(
    'name', o.name
  ) as organization
from public.events e
left join public.organizations o on o.id = e.organization_id
where e.id = $1
and e.is_published = true;

-- Buscar guest com dados relacionados
select 
  g.*,
  json_build_object(
    'first_name', cu.first_name,
    'last_name', cu.last_name,
    'phone', cu.phone
  ) as client_user,
  json_build_object(
    'title', e.title,
    'date', e.date
  ) as event
from public.guests g
join public.client_users cu on cu.id = g.client_user_id
join public.events e on e.id = g.event_id
where g.id = $1;
```

### 4. Funções RPC Existentes

#### 4.1 Verificação de Guest
```sql
-- Usar função existente
select * from check_guest_exists($1, $2);
```

#### 4.2 Criação de Guest
```sql
-- Usar função existente
select * from create_guest_with_validation($1, $2, $3, $4, $5, $6);
```

## ÍNDICES EXISTENTES

### 1. Índices Principais
```sql
-- guests
- guests_event_id_idx
- guests_client_user_id_idx
- guests_promoter_id_idx
- guests_team_id_idx

-- client_users
- client_users_phone_idx
- client_users_email_idx

-- events
- events_organization_id_idx
```

## MONITORAMENTO

### 1. Queries de Monitoramento
```sql
-- Verificar status de guests
select 
  status,
  count(*) as total,
  max(created_at) as latest_creation
from public.guests
where event_id = $1
group by status;

-- Verificar rate limits
select 
  count(*) as attempts,
  max(created_at) as latest_attempt
from public.guests
where 
  event_id = $1 
  and created_at > now() - interval '1 hour'
group by client_user_id;
```

### 2. Queries de Performance
```sql
-- Verificar queries lentas
select 
  query,
  calls,
  total_time,
  mean_time
from pg_stat_statements
where query ilike '%guests%'
order by total_time desc
limit 10;
```

## NOTAS IMPORTANTES

1. **Usar Estrutura Existente**:
   - Não criar novas tabelas
   - Não modificar índices
   - Não alterar políticas

2. **Otimizações**:
   - Usar índices existentes
   - Evitar full table scans
   - Usar prepared statements

3. **Monitoramento**:
   - Usar pg_stat_statements
   - Monitorar performance
   - Alertar em degradação 