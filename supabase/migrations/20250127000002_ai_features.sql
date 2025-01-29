-- Enable vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add AI description to tickets
ALTER TABLE tickets
ADD COLUMN ai_description TEXT;

-- Create embeddings table
CREATE TABLE embeddings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    content_id UUID NOT NULL,  -- Reference to the content being embedded (ticket, message, etc)
    content_type TEXT NOT NULL, -- Type of content ('ticket', 'message', etc)
    embedding vector(1536) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add indexes for embeddings
CREATE INDEX idx_embeddings_content ON embeddings(content_id, content_type);
CREATE INDEX idx_embeddings_vector ON embeddings USING ivfflat (embedding vector_cosine_ops);

-- Create priority rules table
CREATE TABLE priority_rules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    rules JSONB NOT NULL,  -- Flexible structure for rules
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create AI operations audit table
CREATE TABLE ai_operations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
    operation_type TEXT NOT NULL, -- 'summarize', 'tag', 'prioritize', etc
    status TEXT NOT NULL DEFAULT 'completed',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add indexes for AI operations
CREATE INDEX idx_ai_operations_ticket ON ai_operations(ticket_id);
CREATE INDEX idx_ai_operations_type ON ai_operations(operation_type);

-- Enable RLS on new tables
ALTER TABLE embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE priority_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_operations ENABLE ROW LEVEL SECURITY;

-- Add basic RLS policies
CREATE POLICY "Embeddings are viewable by all authenticated users"
    ON embeddings FOR SELECT
    USING (auth.role() IN ('authenticated'));

CREATE POLICY "Priority rules are viewable by all authenticated users"
    ON priority_rules FOR SELECT
    USING (auth.role() IN ('authenticated'));

CREATE POLICY "AI operations are viewable by all authenticated users"
    ON ai_operations FOR SELECT
    USING (auth.role() IN ('authenticated')); 