-- This script will populate current_portfolio with NAV data
-- It properly handles both ISIN and scheme_name matching

-- First, clear existing data
DELETE FROM current_portfolio;

-- Insert the latest transaction for each folio+scheme combination
INSERT INTO current_portfolio (
  user_id,
  folio,
  scheme_name,
  isin,
  latest_transaction_id,
  latest_date,
  latest_amount,
  latest_units,
  latest_price,
  latest_transaction_type,
  latest_unit_balance,
  total_invested,
  current_nav,
  current_value,
  return_amount,
  return_percentage,
  last_nav_update_date,
  created_at,
  updated_at
)
SELECT 
  t.user_id,
  t.folio,
  t.scheme_name,
  t.isin,
  t.id as latest_transaction_id,
  t.date as latest_date,
  t.amount as latest_amount,
  t.units as latest_units,
  t.price as latest_price,
  t.transaction_type as latest_transaction_type,
  t.unit_balance as latest_unit_balance,
  COALESCE(
    (SELECT SUM(amount) 
     FROM transactions t2 
     WHERE t2.user_id = t.user_id 
       AND t2.folio = t.folio 
       AND t2.scheme_name = t.scheme_name
       AND t2.transaction_type IN ('Purchase', 'Switch In', 'Dividend Reinvestment')),
    0
  ) as total_invested,
  0 as current_nav, -- Will be updated below
  0 as current_value, -- Will be updated below
  0 as return_amount, -- Will be updated below
  0 as return_percentage, -- Will be updated below
  NULL as last_nav_update_date, -- Will be updated below
  NOW() as created_at,
  NOW() as updated_at
FROM (
  SELECT DISTINCT ON (user_id, folio, scheme_name) *
  FROM transactions
  ORDER BY user_id, folio, scheme_name, date DESC, id DESC
) t;

-- Update NAV data for entries with ISIN
UPDATE current_portfolio 
SET 
  current_nav = nav_lookup.nav_value,
  last_nav_update_date = nav_lookup.nav_date,
  current_value = nav_lookup.nav_value * latest_unit_balance,
  return_amount = (nav_lookup.nav_value * latest_unit_balance) - total_invested,
  return_percentage = CASE 
    WHEN total_invested > 0 THEN ((nav_lookup.nav_value * latest_unit_balance) - total_invested) / total_invested * 100
    ELSE 0 
  END,
  updated_at = NOW()
FROM (
  SELECT 
    cp.id,
    nd.nav_value,
    nd.nav_date
  FROM current_portfolio cp
  JOIN nav_data nd ON (
    (cp.isin IS NOT NULL AND cp.isin != '' AND 
     (nd.isin_div_payout = cp.isin OR nd.isin_div_reinvestment = cp.isin))
  )
  WHERE cp.isin IS NOT NULL AND cp.isin != ''
  AND nd.nav_date = (
    SELECT MAX(nav_date) 
    FROM nav_data nd2 
    WHERE (nd2.isin_div_payout = cp.isin OR nd2.isin_div_reinvestment = cp.isin)
  )
) nav_lookup
WHERE current_portfolio.id = nav_lookup.id;

-- Update NAV data for entries without ISIN (using scheme_name)
UPDATE current_portfolio 
SET 
  current_nav = nav_lookup.nav_value,
  last_nav_update_date = nav_lookup.nav_date,
  current_value = nav_lookup.nav_value * latest_unit_balance,
  return_amount = (nav_lookup.nav_value * latest_unit_balance) - total_invested,
  return_percentage = CASE 
    WHEN total_invested > 0 THEN ((nav_lookup.nav_value * latest_unit_balance) - total_invested) / total_invested * 100
    ELSE 0 
  END,
  updated_at = NOW()
FROM (
  SELECT 
    cp.id,
    nd.nav_value,
    nd.nav_date
  FROM current_portfolio cp
  JOIN nav_data nd ON (
    LOWER(nd.scheme_name) LIKE LOWER('%' || cp.scheme_name || '%')
  )
  WHERE (cp.isin IS NULL OR cp.isin = '') -- Only for entries without ISIN
  AND cp.current_nav = 0 -- Only update if not already updated by ISIN
  AND nd.nav_date = (
    SELECT MAX(nav_date) 
    FROM nav_data nd2 
    WHERE LOWER(nd2.scheme_name) LIKE LOWER('%' || cp.scheme_name || '%')
  )
) nav_lookup
WHERE current_portfolio.id = nav_lookup.id;

-- Show summary of the population
SELECT 
  COUNT(*) as total_entries,
  COUNT(CASE WHEN current_nav > 0 THEN 1 END) as entries_with_nav,
  COUNT(CASE WHEN current_nav = 0 THEN 1 END) as entries_without_nav,
  COUNT(CASE WHEN isin IS NOT NULL AND isin != '' THEN 1 END) as entries_with_isin,
  COUNT(CASE WHEN isin IS NULL OR isin = '' THEN 1 END) as entries_without_isin
FROM current_portfolio; 