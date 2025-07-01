-- Add unique constraint on scheme_code for nav_data table
-- This is required for the upsert functionality with onConflict: 'scheme_code'

-- First, let's check if there are any duplicate scheme_codes that would prevent adding the constraint
SELECT scheme_code, COUNT(*) as count
FROM nav_data 
GROUP BY scheme_code 
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- If there are duplicates, we need to clean them up first
-- Keep only the latest NAV for each scheme_code
DELETE FROM nav_data 
WHERE id NOT IN (
  SELECT MAX(id) 
  FROM nav_data 
  GROUP BY scheme_code
);

-- Now add the unique constraint
ALTER TABLE nav_data 
ADD CONSTRAINT nav_data_scheme_code_unique UNIQUE (scheme_code);

-- Verify the constraint was added
SELECT constraint_name, constraint_type 
FROM information_schema.table_constraints 
WHERE table_name = 'nav_data' 
AND constraint_type = 'UNIQUE'; 