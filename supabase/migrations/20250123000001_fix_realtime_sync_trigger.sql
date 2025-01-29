-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.realtime_sync_logs;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.realtime_sync_logs;
DROP POLICY IF EXISTS "Admins can view realtime sync logs" ON public.realtime_sync_logs;

-- Fix the realtime sync delay trigger function to use created_at
CREATE OR REPLACE FUNCTION public.log_realtime_sync_delay()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    sync_delay FLOAT;
BEGIN
    -- Calculate sync delay using created_at instead of timestamp
    sync_delay := EXTRACT(EPOCH FROM (now() - NEW.created_at)) * 1000;
    
    INSERT INTO realtime_sync_logs (table_name, operation, sync_delay_ms)
    VALUES (TG_TABLE_NAME, TG_OP, sync_delay);

    -- Clean up old logs (keep last 7 days)
    DELETE FROM realtime_sync_logs
    WHERE timestamp < now() - interval '7 days';

    RETURN NEW;
END;
$function$;

-- Add RLS policy to allow inserts to realtime_sync_logs
ALTER TABLE realtime_sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable insert for authenticated users" 
    ON public.realtime_sync_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Enable delete for authenticated users" 
    ON public.realtime_sync_logs
    FOR DELETE
    TO authenticated
    USING (true);

CREATE POLICY "Admins can view realtime sync logs" 
    ON public.realtime_sync_logs
    FOR SELECT
    TO public
    USING (is_admin());
