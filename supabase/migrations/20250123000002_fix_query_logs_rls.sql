-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.query_performance_logs;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.query_performance_logs;
DROP POLICY IF EXISTS "Admins can view query performance logs" ON public.query_performance_logs;

-- Add RLS policy to allow inserts to query_performance_logs
ALTER TABLE query_performance_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable insert for authenticated users" 
    ON public.query_performance_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Enable delete for authenticated users" 
    ON public.query_performance_logs
    FOR DELETE
    TO authenticated
    USING (true);

CREATE POLICY "Admins can view query performance logs" 
    ON public.query_performance_logs
    FOR SELECT
    TO public
    USING (is_admin());
