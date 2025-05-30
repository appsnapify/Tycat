-- 1. Verificar informações dos usuários na tabela auth.users
SELECT 
    id,
    raw_user_meta_data->>'role' as role,
    raw_user_meta_data->>'name' as name
FROM auth.users 
WHERE id IN ('75608297-a569-4b63-9e67-93a4e83752f3', '162db77f-73ba-402b-845a-22b521855fe6');

-- 2. Verificar membros das equipes e suas funções
SELECT 
    tm.user_id,
    tm.team_id,
    tm.role as team_role,
    t.name as team_name,
    t.created_at as team_created_at,
    t.is_active as team_is_active
FROM team_members tm
JOIN teams t ON t.id = tm.team_id
WHERE tm.user_id IN ('75608297-a569-4b63-9e67-93a4e83752f3', '162db77f-73ba-402b-845a-22b521855fe6');

-- 3. Verificar relação entre equipes e organizações
SELECT 
    ot.team_id,
    ot.organization_id,
    ot.commission_rate,
    ot.is_active as org_team_is_active,
    o.name as organization_name
FROM organization_teams ot
JOIN organizations o ON o.id = ot.organization_id
WHERE ot.team_id IN (
    SELECT team_id 
    FROM team_members 
    WHERE user_id IN ('75608297-a569-4b63-9e67-93a4e83752f3', '162db77f-73ba-402b-845a-22b521855fe6')
);

-- 4. Verificar eventos disponíveis para as equipes
SELECT 
    e.id as event_id,
    e.name as event_title,
    e.start_date as event_date,
    e.is_published,
    e.organization_id,
    o.name as organization_name,
    ep.team_id
FROM events e
JOIN organizations o ON o.id = e.organization_id
LEFT JOIN event_promoters ep ON ep.event_id = e.id
WHERE ep.team_id IN (
    SELECT team_id 
    FROM team_members 
    WHERE user_id IN ('75608297-a569-4b63-9e67-93a4e83752f3', '162db77f-73ba-402b-845a-22b521855fe6')
)
OR e.organization_id IN (
    SELECT organization_id 
    FROM organization_teams 
    WHERE team_id IN (
        SELECT team_id 
        FROM team_members 
        WHERE user_id IN ('75608297-a569-4b63-9e67-93a4e83752f3', '162db77f-73ba-402b-845a-22b521855fe6')
    )
);

-- 5. Verificar todas as permissões e relações em uma única query
WITH user_teams AS (
    SELECT 
        tm.user_id,
        tm.team_id,
        tm.role as team_role,
        t.name as team_name,
        t.is_active as team_is_active
    FROM team_members tm
    JOIN teams t ON t.id = tm.team_id
    WHERE tm.user_id IN ('75608297-a569-4b63-9e67-93a4e83752f3', '162db77f-73ba-402b-845a-22b521855fe6')
),
team_orgs AS (
    SELECT 
        ot.team_id,
        ot.organization_id,
        ot.is_active as org_team_is_active,
        o.name as organization_name
    FROM organization_teams ot
    JOIN organizations o ON o.id = ot.organization_id
    WHERE ot.team_id IN (SELECT team_id FROM user_teams)
),
team_events AS (
    SELECT 
        ep.team_id,
        e.id as event_id,
        e.name as event_title,
        e.start_date as event_date,
        e.is_published,
        e.organization_id
    FROM event_promoters ep
    JOIN events e ON e.id = ep.event_id
    WHERE ep.team_id IN (SELECT team_id FROM user_teams)
    AND ep.is_active = true
)
SELECT 
    ut.user_id,
    au.raw_user_meta_data->>'role' as user_role,
    ut.team_role,
    ut.team_name,
    ut.team_is_active,
    org.organization_name,
    org.org_team_is_active,
    te.event_id,
    te.event_title,
    te.event_date,
    te.is_published
FROM user_teams ut
JOIN auth.users au ON au.id = ut.user_id
LEFT JOIN team_orgs org ON org.team_id = ut.team_id
LEFT JOIN team_events te ON te.team_id = ut.team_id
ORDER BY ut.user_id, te.event_date; 