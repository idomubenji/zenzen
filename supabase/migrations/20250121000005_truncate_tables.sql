-- Create a function to truncate multiple tables
CREATE OR REPLACE FUNCTION truncate_tables(table_names text[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  table_name text;
BEGIN
  -- Disable triggers temporarily
  SET session_replication_role = 'replica';
  
  FOREACH table_name IN ARRAY table_names
  LOOP
    BEGIN
      EXECUTE format('TRUNCATE TABLE %I CASCADE', table_name);
    EXCEPTION
      WHEN undefined_table THEN
        -- Skip if table doesn't exist
        CONTINUE;
    END;
  END LOOP;
  
  -- Re-enable triggers
  SET session_replication_role = 'origin';
END;
$$; 