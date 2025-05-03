-- Function to retrieve data needed for the public promoter page
-- Combines promoter profile info with their associated published events and tracking details.
CREATE OR REPLACE FUNCTION get_public_promoter_page_data(promoter_user_id UUID)
RETURNS TABLE (
  promoter_first_name TEXT,
  promoter_last_name TEXT,
  promoter_avatar_url TEXT,
  event_id UUID,
  event_title TEXT,
  event_flyer_url TEXT,
  event_type TEXT,
  event_date DATE,
  event_time TIME, -- Using TIME, as the type is 'time without time zone'
  org_id UUID,
  org_name TEXT,
  org_logo_url TEXT,
  tracking_promoter_id UUID, -- This is the event_promoters.id
  tracking_team_id UUID
)
LANGUAGE sql STABLE
AS $$
  SELECT
    p.first_name AS promoter_first_name,
    p.last_name AS promoter_last_name,
    p.avatar_url AS promoter_avatar_url,
    e.id AS event_id,
    e.title AS event_title,
    e.flyer_url AS event_flyer_url,
    e.type AS event_type,
    e.date AS event_date,
    e.time AS event_time, -- time without time zone can be returned as TIME
    org.id AS org_id,
    org.name AS org_name,
    org.logo_url AS org_logo_url,
    ep.id AS tracking_promoter_id, -- Using alias 'ep' and the 'id' column from event_promoters
    ep.team_id AS tracking_team_id -- Using alias 'ep'
  FROM
    event_promoters ep -- Alias 'ep'
  JOIN
    profiles p ON ep.promoter_id = p.id
  JOIN
    events e ON ep.event_id = e.id
  JOIN
    organizations org ON e.organization_id = org.id
  WHERE
    ep.promoter_id = promoter_user_id
    AND e.is_published = TRUE; -- Confirmed column is is_published
$$;

-- Grant permissions for anonymous and authenticated users to execute this function
GRANT EXECUTE ON FUNCTION get_public_promoter_page_data(UUID) TO anon, authenticated; 