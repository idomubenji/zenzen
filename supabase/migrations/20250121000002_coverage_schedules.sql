-- COVERAGE SCHEDULES
CREATE TABLE coverage_schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

-- COVERAGE SHIFTS
CREATE TABLE coverage_shifts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  schedule_id UUID REFERENCES coverage_schedules(id) ON DELETE CASCADE,
  worker_id UUID REFERENCES users(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_shift_time CHECK (end_time > start_time)
);

-- Add indexes for common queries
CREATE INDEX idx_coverage_schedules_team ON coverage_schedules(team_id);
CREATE INDEX idx_coverage_schedules_date_range ON coverage_schedules(start_date, end_date);
CREATE INDEX idx_coverage_shifts_schedule ON coverage_shifts(schedule_id);
CREATE INDEX idx_coverage_shifts_worker ON coverage_shifts(worker_id);
CREATE INDEX idx_coverage_shifts_time_range ON coverage_shifts(start_time, end_time);

-- Enable RLS
ALTER TABLE coverage_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE coverage_shifts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for coverage_schedules
CREATE POLICY "Admins have full access to coverage schedules"
  ON coverage_schedules FOR ALL
  USING (is_admin());

CREATE POLICY "Workers can view all coverage schedules"
  ON coverage_schedules FOR SELECT
  USING (is_worker());

-- RLS Policies for coverage_shifts
CREATE POLICY "Admins have full access to coverage shifts"
  ON coverage_shifts FOR ALL
  USING (is_admin());

CREATE POLICY "Workers can view all coverage shifts"
  ON coverage_shifts FOR SELECT
  USING (is_worker());

CREATE POLICY "Workers can view and update their own shifts"
  ON coverage_shifts FOR ALL
  USING (auth.uid() = worker_id);

-- Function to check for shift conflicts
CREATE OR REPLACE FUNCTION check_shift_conflicts()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM coverage_shifts
    WHERE worker_id = NEW.worker_id
    AND id != NEW.id
    AND (
      (NEW.start_time, NEW.end_time) OVERLAPS (start_time, end_time)
    )
  ) THEN
    RAISE EXCEPTION 'Shift conflicts with existing schedule for worker';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to prevent conflicting shifts
CREATE TRIGGER prevent_shift_conflicts
  BEFORE INSERT OR UPDATE ON coverage_shifts
  FOR EACH ROW
  EXECUTE FUNCTION check_shift_conflicts(); 