-- Enable the pg_net extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Function to schedule an AI operation
CREATE OR REPLACE FUNCTION schedule_ai_operation(operation_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  edge_function_url TEXT;
BEGIN
  -- Get the Edge Function URL from your Supabase project settings
  edge_function_url := current_setting('app.settings.edge_function_url');
  
  -- Make async HTTP request to the Edge Function
  PERFORM net_http_post(
    url := edge_function_url || '/process-ai-operation',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.anon_key')
    ),
    body := jsonb_build_object('operation_id', operation_id)
  );
END;
$$;

-- Trigger function to automatically schedule AI operations
CREATE OR REPLACE FUNCTION trigger_schedule_ai_operation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Schedule the operation asynchronously
  PERFORM schedule_ai_operation(NEW.id);
  RETURN NEW;
END;
$$;

-- Create trigger on ai_operations table
CREATE TRIGGER schedule_ai_operation_trigger
  AFTER INSERT ON ai_operations
  FOR EACH ROW
  WHEN (NEW.status = 'pending')
  EXECUTE FUNCTION trigger_schedule_ai_operation();