-- Add metadata column to ai_operations table
ALTER TABLE ai_operations
ADD COLUMN metadata JSONB;

-- Make ticket_id optional since not all operations are tied to tickets
ALTER TABLE ai_operations
ALTER COLUMN ticket_id DROP NOT NULL; 