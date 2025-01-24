-- Add tags and team_id to templates table
ALTER TABLE templates
ADD COLUMN tags TEXT[] DEFAULT '{}',
ADD COLUMN team_id UUID REFERENCES teams(id) ON DELETE SET NULL;

-- Add index for team_id lookups
CREATE INDEX idx_templates_team ON templates(team_id);

-- Add index for tags search
CREATE INDEX idx_templates_tags ON templates USING gin(tags);

-- Update RLS policies to include team access
CREATE POLICY "Templates are viewable by team members"
ON templates
FOR SELECT
USING (
  auth.uid() IN (
    SELECT user_id 
    FROM user_teams 
    WHERE team_id = templates.team_id
  )
  OR 
  auth.uid() = created_by
  OR
  team_id IS NULL
); 