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
SECURITY DEFINER -- Added security definer for better performance
SET search_path = public -- Explicitly set search path for security
AS $$
  WITH promoter_data AS (
    -- Get promoter info first to fail fast if promoter doesn't exist
    SELECT 
      p.first_name,
      p.last_name,
      p.avatar_url
    FROM profiles p
    WHERE p.id = promoter_user_id
    LIMIT 1
  ),
  active_events AS (
    -- Get only active and future events
    SELECT e.*
    FROM events e
    WHERE e.is_published = TRUE
    AND e.date >= CURRENT_DATE - INTERVAL '1 day'
    ORDER BY e.date ASC, e.time ASC
    LIMIT 50 -- Limit results for performance
  )
  SELECT
    pd.first_name AS promoter_first_name,
    pd.last_name AS promoter_last_name,
    pd.avatar_url AS promoter_avatar_url,
    e.id AS event_id,
    e.title AS event_title,
    e.flyer_url AS event_flyer_url,
    e.type AS event_type,
    e.date AS event_date,
    e.time AS event_time,
    org.id AS org_id,
    org.name AS org_name,
    org.logo_url AS org_logo_url,
    ep.id AS tracking_promoter_id,
    ep.team_id AS tracking_team_id
  FROM promoter_data pd
  CROSS JOIN active_events e
  JOIN event_promoters ep ON ep.event_id = e.id AND ep.promoter_id = promoter_user_id
  JOIN organizations org ON e.organization_id = org.id
  WHERE ep.is_active = TRUE -- Only active promoter associations
  ORDER BY e.date ASC, e.time ASC;
$$;

-- Add function comment
COMMENT ON FUNCTION get_public_promoter_page_data(UUID) IS 'Retrieves public promoter page data including active events. Limited to 50 events for performance.';

-- Grant permissions for anonymous and authenticated users to execute this function
REVOKE ALL ON FUNCTION get_public_promoter_page_data(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_public_promoter_page_data(UUID) TO anon, authenticated; 