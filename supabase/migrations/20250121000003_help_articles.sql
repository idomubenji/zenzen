-- HELP_ARTICLES TABLE
CREATE TABLE help_articles (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title         TEXT NOT NULL,
  content       TEXT NOT NULL,
  category      TEXT,
  tags          TEXT[],
  created_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  published     BOOLEAN DEFAULT false
);

-- Add indexes for help articles
CREATE INDEX idx_help_articles_category ON help_articles(category);
CREATE INDEX idx_help_articles_created_by ON help_articles(created_by);
CREATE INDEX idx_help_articles_tags ON help_articles USING gin(tags);
CREATE INDEX idx_help_articles_title_search ON help_articles USING gin(to_tsvector('english', title));
CREATE INDEX idx_help_articles_content_search ON help_articles USING gin(to_tsvector('english', content));

-- Enable RLS
ALTER TABLE help_articles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for help_articles
CREATE POLICY "Service role has full access to help_articles"
  ON help_articles FOR ALL 
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins have full access to help_articles"
  ON help_articles FOR ALL
  TO authenticated
  USING (is_admin());

CREATE POLICY "Workers can view all and create help articles"
  ON help_articles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Workers can create and edit their own help articles"
  ON help_articles FOR INSERT
  TO authenticated
  WITH CHECK (is_worker());

CREATE POLICY "Workers can update their own help articles"
  ON help_articles FOR UPDATE
  TO authenticated
  USING (is_worker() AND created_by = auth.uid());

-- Customers can only view published articles
CREATE POLICY "Customers can view published help articles"
  ON help_articles FOR SELECT
  TO authenticated
  USING (published = true); 