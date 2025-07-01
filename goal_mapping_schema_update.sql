-- Add source_type enum and column to goal_scheme_mapping table
-- This allows mapping different types of investments (mutual_fund, stock, nps) to goals

-- Create enum for source types
CREATE TYPE investment_source_type AS ENUM ('mutual_fund', 'stock', 'nps');

-- Add source_type column to goal_scheme_mapping table
ALTER TABLE goal_scheme_mapping 
ADD COLUMN IF NOT EXISTS source_type investment_source_type DEFAULT 'mutual_fund';

-- Add source_id column to store the specific investment ID (stock_id, nps_id, etc.)
ALTER TABLE goal_scheme_mapping 
ADD COLUMN IF NOT EXISTS source_id uuid;

-- Update existing mappings to have mutual_fund as default source type
UPDATE goal_scheme_mapping 
SET source_type = 'mutual_fund' 
WHERE source_type IS NULL;

-- Create index for better performance on source type queries
CREATE INDEX IF NOT EXISTS idx_goal_scheme_mapping_source_type ON goal_scheme_mapping(source_type);
CREATE INDEX IF NOT EXISTS idx_goal_scheme_mapping_source_id ON goal_scheme_mapping(source_id);

-- Update the unique constraint to include source_type and source_id
-- First drop the existing constraint
ALTER TABLE goal_scheme_mapping DROP CONSTRAINT IF EXISTS goal_scheme_mapping_goal_id_scheme_name_folio_key;

-- Add new unique constraint
ALTER TABLE goal_scheme_mapping 
ADD CONSTRAINT goal_scheme_mapping_unique 
UNIQUE (goal_id, scheme_name, folio, source_type, source_id); 