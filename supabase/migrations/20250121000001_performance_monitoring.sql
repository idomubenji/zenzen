-- Enable pgstattuple extension for detailed table statistics
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Function to check if current user is an admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM users
    WHERE id = auth.uid()
    AND role = 'Administrator'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Table to store query performance metrics
CREATE TABLE query_performance_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    query_id TEXT,
    query_text TEXT,
    execution_time_ms FLOAT,
    rows_affected INTEGER,
    timestamp TIMESTAMPTZ DEFAULT now()
);

-- Table to store real-time sync metrics
CREATE TABLE realtime_sync_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    table_name TEXT,
    operation TEXT,
    sync_delay_ms FLOAT,
    timestamp TIMESTAMPTZ DEFAULT now()
);

-- Table to store file upload metrics
CREATE TABLE file_upload_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    file_id UUID REFERENCES files(id),
    file_size_bytes BIGINT,
    upload_duration_ms FLOAT,
    timestamp TIMESTAMPTZ DEFAULT now()
);

-- Function to log query performance
CREATE OR REPLACE FUNCTION log_query_performance()
RETURNS trigger AS $$
BEGIN
    INSERT INTO query_performance_logs (query_id, query_text, execution_time_ms, rows_affected)
    VALUES (
        md5(TG_TABLE_NAME || '_' || TG_OP || '_' || now()::text),
        TG_TABLE_NAME || ' ' || TG_OP,
        0.0,  -- We can't get actual execution time without pg_stat_statements
        1     -- Default to 1 row affected
    );

    -- Clean up old logs (keep last 7 days)
    DELETE FROM query_performance_logs
    WHERE timestamp < now() - interval '7 days';

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to log real-time sync delay
CREATE OR REPLACE FUNCTION log_realtime_sync_delay()
RETURNS trigger AS $$
DECLARE
    sync_delay FLOAT;
BEGIN
    -- Calculate sync delay (difference between now and operation timestamp)
    sync_delay := EXTRACT(EPOCH FROM (now() - NEW.timestamp)) * 1000;
    
    INSERT INTO realtime_sync_logs (table_name, operation, sync_delay_ms)
    VALUES (TG_TABLE_NAME, TG_OP, sync_delay);

    -- Clean up old logs (keep last 7 days)
    DELETE FROM realtime_sync_logs
    WHERE timestamp < now() - interval '7 days';

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to log file upload performance
CREATE OR REPLACE FUNCTION log_file_upload_performance()
RETURNS trigger AS $$
BEGIN
    INSERT INTO file_upload_logs (file_id, file_size_bytes, upload_duration_ms)
    VALUES (NEW.id, octet_length(NEW.file_url), 
            EXTRACT(EPOCH FROM (now() - NEW.uploaded_at)) * 1000);

    -- Clean up old logs (keep last 7 days)
    DELETE FROM file_upload_logs
    WHERE timestamp < now() - interval '7 days';

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for performance monitoring
CREATE TRIGGER monitor_query_performance
    AFTER INSERT OR UPDATE OR DELETE
    ON tickets
    FOR EACH STATEMENT
    EXECUTE FUNCTION log_query_performance();

-- Add real-time sync monitoring to relevant tables
CREATE TRIGGER monitor_realtime_sync_tickets
    AFTER INSERT OR UPDATE OR DELETE
    ON tickets
    FOR EACH ROW
    EXECUTE FUNCTION log_realtime_sync_delay();

CREATE TRIGGER monitor_realtime_sync_messages
    AFTER INSERT OR UPDATE OR DELETE
    ON messages
    FOR EACH ROW
    EXECUTE FUNCTION log_realtime_sync_delay();

-- Monitor file uploads
CREATE TRIGGER monitor_file_uploads
    AFTER INSERT
    ON files
    FOR EACH ROW
    EXECUTE FUNCTION log_file_upload_performance();

-- Create indexes for performance monitoring tables
CREATE INDEX idx_query_perf_timestamp ON query_performance_logs(timestamp);
CREATE INDEX idx_realtime_sync_timestamp ON realtime_sync_logs(timestamp);
CREATE INDEX idx_file_upload_timestamp ON file_upload_logs(timestamp);

-- Create views for monitoring dashboards
CREATE VIEW vw_slow_queries AS
SELECT 
    query_id,
    query_text,
    avg(execution_time_ms) as avg_execution_time_ms,
    count(*) as occurrence_count,
    max(timestamp) as last_occurrence
FROM query_performance_logs
WHERE timestamp > now() - interval '24 hours'
GROUP BY query_id, query_text
HAVING avg(execution_time_ms) > 100
ORDER BY avg_execution_time_ms DESC;

CREATE VIEW vw_realtime_sync_performance AS
SELECT 
    table_name,
    operation,
    avg(sync_delay_ms) as avg_sync_delay_ms,
    count(*) as operation_count,
    max(sync_delay_ms) as max_sync_delay_ms
FROM realtime_sync_logs
WHERE timestamp > now() - interval '24 hours'
GROUP BY table_name, operation
ORDER BY avg_sync_delay_ms DESC;

CREATE VIEW vw_file_upload_performance AS
SELECT 
    avg(upload_duration_ms) as avg_upload_duration_ms,
    avg(file_size_bytes) as avg_file_size_bytes,
    count(*) as upload_count,
    max(upload_duration_ms) as max_upload_duration_ms
FROM file_upload_logs
WHERE timestamp > now() - interval '24 hours';

-- Enable RLS on monitoring tables
ALTER TABLE query_performance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE realtime_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_upload_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for monitoring tables (admin only)
CREATE POLICY "Admins can view query performance logs"
    ON query_performance_logs FOR SELECT
    USING (is_admin() OR current_user = 'service_role');

CREATE POLICY "Allow trigger to insert query performance logs"
    ON query_performance_logs FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Admins can view realtime sync logs"
    ON realtime_sync_logs FOR SELECT
    USING (is_admin() OR current_user = 'service_role');

CREATE POLICY "Allow trigger to insert realtime sync logs"
    ON realtime_sync_logs FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Admins can view file upload logs"
    ON file_upload_logs FOR SELECT
    USING (is_admin() OR current_user = 'service_role');

CREATE POLICY "Allow trigger to insert file upload logs"
    ON file_upload_logs FOR INSERT
    WITH CHECK (true); 