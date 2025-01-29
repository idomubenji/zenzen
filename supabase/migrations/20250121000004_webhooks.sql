-- WEBHOOKS TABLE
CREATE TABLE webhooks (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name          TEXT NOT NULL,
  url           TEXT NOT NULL,
  secret        TEXT NOT NULL,
  events        TEXT[] NOT NULL,
  is_active     BOOLEAN DEFAULT true,
  created_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add indexes for webhook queries
CREATE INDEX idx_webhooks_events ON webhooks USING gin(events);
CREATE INDEX idx_webhooks_created_by ON webhooks(created_by);
CREATE INDEX idx_webhooks_is_active ON webhooks(is_active);

-- WEBHOOK_LOGS TABLE
CREATE TABLE webhook_logs (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  webhook_id    UUID REFERENCES webhooks(id) ON DELETE CASCADE,
  event         TEXT NOT NULL,
  payload       JSONB NOT NULL,
  status_code   INTEGER,
  response      TEXT,
  error         TEXT,
  attempt_count INTEGER DEFAULT 1,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add indexes for webhook logs
CREATE INDEX idx_webhook_logs_webhook ON webhook_logs(webhook_id);
CREATE INDEX idx_webhook_logs_event ON webhook_logs(event);
CREATE INDEX idx_webhook_logs_created_at ON webhook_logs(created_at);
CREATE INDEX idx_webhook_logs_status_code ON webhook_logs(status_code);

-- Enable RLS
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for webhooks
CREATE POLICY "Service role has full access to webhooks"
  ON webhooks FOR ALL 
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins have full access to webhooks"
  ON webhooks FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- RLS Policies for webhook_logs
CREATE POLICY "Service role has full access to webhook_logs"
  ON webhook_logs FOR ALL 
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can view webhook logs"
  ON webhook_logs FOR SELECT
  TO authenticated
  USING (is_admin());

-- Function to create a webhook log entry
CREATE OR REPLACE FUNCTION create_webhook_log(
  p_webhook_id UUID,
  p_event TEXT,
  p_payload JSONB,
  p_status_code INTEGER DEFAULT NULL,
  p_response TEXT DEFAULT NULL,
  p_error TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO webhook_logs (
    webhook_id,
    event,
    payload,
    status_code,
    response,
    error
  ) VALUES (
    p_webhook_id,
    p_event,
    p_payload,
    p_status_code,
    p_response,
    p_error
  )
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update a webhook log entry
CREATE OR REPLACE FUNCTION update_webhook_log(
  p_log_id UUID,
  p_status_code INTEGER,
  p_response TEXT DEFAULT NULL,
  p_error TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  UPDATE webhook_logs
  SET
    status_code = p_status_code,
    response = p_response,
    error = p_error,
    attempt_count = attempt_count + 1,
    updated_at = now()
  WHERE id = p_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to trigger webhooks for an event
CREATE OR REPLACE FUNCTION trigger_webhooks()
RETURNS TRIGGER AS $$
DECLARE
  webhook_record RECORD;
  event_name TEXT;
  payload JSONB;
BEGIN
  -- Determine event name based on the table and operation
  event_name := TG_TABLE_NAME || '_' || TG_OP;
  
  -- Create payload based on the operation
  CASE TG_OP
    WHEN 'INSERT' THEN
      payload := to_jsonb(NEW);
    WHEN 'UPDATE' THEN
      payload := jsonb_build_object(
        'old', to_jsonb(OLD),
        'new', to_jsonb(NEW)
      );
    WHEN 'DELETE' THEN
      payload := to_jsonb(OLD);
  END CASE;

  -- Find active webhooks for this event
  FOR webhook_record IN
    SELECT id, url, secret
    FROM webhooks
    WHERE is_active = true
    AND event_name = ANY(events)
  LOOP
    -- Create a log entry for each webhook
    PERFORM create_webhook_log(
      webhook_record.id,
      event_name,
      payload
    );
  END LOOP;

  -- Return NEW for INSERT/UPDATE, OLD for DELETE
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for webhook events
CREATE TRIGGER webhook_tickets_trigger
  AFTER INSERT OR UPDATE OR DELETE ON tickets
  FOR EACH ROW EXECUTE FUNCTION trigger_webhooks();

CREATE TRIGGER webhook_messages_trigger
  AFTER INSERT OR UPDATE OR DELETE ON messages
  FOR EACH ROW EXECUTE FUNCTION trigger_webhooks();

CREATE TRIGGER webhook_feedback_trigger
  AFTER INSERT ON feedback
  FOR EACH ROW EXECUTE FUNCTION trigger_webhooks(); 