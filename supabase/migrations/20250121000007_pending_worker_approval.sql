-- Update users table to include PendingWorker role
ALTER TABLE users 
  DROP CONSTRAINT users_role_check,
  ADD CONSTRAINT users_role_check 
    CHECK (role IN ('Administrator', 'Worker', 'Customer', 'PendingWorker'));

-- Add columns for worker approval tracking
ALTER TABLE users
  ADD COLUMN approval_status TEXT CHECK (approval_status IN ('PENDING', 'APPROVED', 'REJECTED')),
  ADD COLUMN approval_requested_at TIMESTAMPTZ,
  ADD COLUMN approved_at TIMESTAMPTZ,
  ADD COLUMN approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN approval_notes TEXT;

-- Add indexes for approval-related queries
CREATE INDEX idx_users_approval_status ON users(approval_status);
CREATE INDEX idx_users_approval_requested_at ON users(approval_requested_at);

-- Update RLS policies for pending worker approval
CREATE POLICY "Pending workers can view their own profile while waiting"
  ON users FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id 
    AND role = 'PendingWorker'
  );

-- Function to handle worker approval
CREATE OR REPLACE FUNCTION approve_worker(
  worker_id UUID,
  admin_notes TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify the current user is an administrator
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only administrators can approve workers';
  END IF;

  -- Update the user record
  UPDATE users
  SET role = 'Worker',
      approval_status = 'APPROVED',
      approved_at = now(),
      approved_by = auth.uid(),
      approval_notes = admin_notes
  WHERE id = worker_id
    AND role = 'PendingWorker'
    AND approval_status = 'PENDING';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid worker approval request';
  END IF;
END;
$$;

-- Function to handle worker rejection
CREATE OR REPLACE FUNCTION reject_worker(
  worker_id UUID,
  admin_notes TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify the current user is an administrator
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only administrators can reject workers';
  END IF;

  -- Update the user record
  UPDATE users
  SET approval_status = 'REJECTED',
      approved_at = now(),
      approved_by = auth.uid(),
      approval_notes = admin_notes
  WHERE id = worker_id
    AND role = 'PendingWorker'
    AND approval_status = 'PENDING';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid worker rejection request';
  END IF;
END;
$$; 