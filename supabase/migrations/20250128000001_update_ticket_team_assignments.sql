-- Drop the existing index
DROP INDEX IF EXISTS idx_tickets_assigned_team;

-- Add new column for multiple team assignments
ALTER TABLE tickets ADD COLUMN assigned_teams UUID[] DEFAULT '{}';

-- Copy existing assignments to the new column
UPDATE tickets 
SET assigned_teams = ARRAY[assigned_team]
WHERE assigned_team IS NOT NULL;

-- Add index for the new column
CREATE INDEX idx_tickets_assigned_teams ON tickets USING gin(assigned_teams);

-- Drop the old column
ALTER TABLE tickets DROP COLUMN assigned_team;

-- Add foreign key constraint to ensure valid team IDs
ALTER TABLE tickets ADD CONSTRAINT fk_tickets_assigned_teams 
  FOREIGN KEY (assigned_teams) REFERENCES teams(id); 