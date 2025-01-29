-- Create worker_skills table
CREATE TABLE IF NOT EXISTS worker_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill_name TEXT NOT NULL,
  proficiency_level TEXT NOT NULL CHECK (proficiency_level IN ('BEGINNER', 'INTERMEDIATE', 'EXPERT')),
  endorsed_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(worker_id, skill_name)
);

-- Enable RLS
ALTER TABLE worker_skills ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Public read access"
  ON worker_skills FOR SELECT
  USING (true);

CREATE POLICY "Administrators can insert"
  ON worker_skills FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'Administrator'
  ));

CREATE POLICY "Administrators can update"
  ON worker_skills FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'Administrator'
  ));

CREATE POLICY "Administrators can delete"
  ON worker_skills FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'Administrator'
  )); 