-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- USERS TABLE
CREATE TABLE users (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email             TEXT NOT NULL UNIQUE,
  role              TEXT NOT NULL CHECK (role IN ('Administrator', 'Worker', 'Customer')),
  name              TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add index for role-based queries
CREATE INDEX idx_users_role ON users(role);

-- TEAMS TABLE
CREATE TABLE teams (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name         TEXT NOT NULL,
  focus_area   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- USER_TEAMS (JOIN TABLE)
CREATE TABLE user_teams (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  team_id    UUID REFERENCES teams(id) ON DELETE CASCADE,
  UNIQUE(user_id, team_id)
);

-- Add indexes for the join table
CREATE INDEX idx_user_teams_user ON user_teams(user_id);
CREATE INDEX idx_user_teams_team ON user_teams(team_id);

-- TICKETS TABLE
CREATE TABLE tickets (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  title           TEXT NOT NULL,
  status          TEXT NOT NULL CHECK (status IN ('UNOPENED', 'IN PROGRESS', 'RESOLVED', 'UNRESOLVED')),
  priority        TEXT CHECK (priority IN ('NONE', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL')) DEFAULT 'NONE',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ,
  first_response_at TIMESTAMPTZ,           -- Track first response time
  resolved_at      TIMESTAMPTZ,            -- Track resolution time
  reopen_count     INT DEFAULT 0,          -- Track number of reopens
  assigned_to      UUID REFERENCES users(id) ON DELETE SET NULL,  -- Track current assignee
  assigned_team    UUID REFERENCES teams(id) ON DELETE SET NULL,  -- Track assigned team
  tags            TEXT[],
  custom_fields   JSONB
);

-- Add indexes for common ticket queries
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_customer ON tickets(customer_id);
CREATE INDEX idx_tickets_assigned_to ON tickets(assigned_to);
CREATE INDEX idx_tickets_assigned_team ON tickets(assigned_team);
CREATE INDEX idx_tickets_created_at ON tickets(created_at);
CREATE INDEX idx_tickets_priority ON tickets(priority);
CREATE INDEX idx_tickets_tags ON tickets USING gin(tags);
CREATE INDEX idx_tickets_custom_fields ON tickets USING gin(custom_fields);

-- Add index for full text search on ticket title
CREATE INDEX idx_tickets_title_search ON tickets USING gin(to_tsvector('english', title));

-- MESSAGES TABLE
CREATE TABLE messages (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id     UUID REFERENCES tickets(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES users(id) ON DELETE SET NULL,
  content       TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add indexes for message queries
CREATE INDEX idx_messages_ticket ON messages(ticket_id);
CREATE INDEX idx_messages_user ON messages(user_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);

-- NOTES TABLE (Worker/Administrator internal notes on tickets)
CREATE TABLE notes (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id     UUID REFERENCES tickets(id) ON DELETE CASCADE,
  created_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  content       TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add indexes for notes
CREATE INDEX idx_notes_ticket ON notes(ticket_id);
CREATE INDEX idx_notes_created_by ON notes(created_by);

-- FEEDBACK TABLE (For ticket resolution feedback)
CREATE TABLE feedback (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id     UUID REFERENCES tickets(id) ON DELETE CASCADE,
  score         INT CHECK (score >= 1 AND score <= 100),
  comment       TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add index for feedback analysis
CREATE INDEX idx_feedback_ticket ON feedback(ticket_id);
CREATE INDEX idx_feedback_score ON feedback(score);

-- FILES TABLE
CREATE TABLE files (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id     UUID REFERENCES tickets(id) ON DELETE CASCADE,
  file_url      TEXT NOT NULL,
  uploaded_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add index for file queries
CREATE INDEX idx_files_ticket ON files(ticket_id);

-- TEMPLATES TABLE (Reusable text macros for quick responses)
CREATE TABLE templates (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  title       TEXT NOT NULL,
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add index for template search
CREATE INDEX idx_templates_created_by ON templates(created_by);
CREATE INDEX idx_templates_title_search ON templates USING gin(to_tsvector('english', title));

-- WORKERCHAT TABLE (Optional internal worker-to-worker discussions)
CREATE TABLE worker_chat (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title          TEXT NOT NULL,
  theme          TEXT,
  creation_date  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- WORKERCHAT_MESSAGES TABLE
CREATE TABLE worker_chat_messages (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  worker_chat_id  UUID REFERENCES worker_chat(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
  content         TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add indexes for worker chat messages
CREATE INDEX idx_worker_chat_messages_chat ON worker_chat_messages(worker_chat_id);
CREATE INDEX idx_worker_chat_messages_user ON worker_chat_messages(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_chat ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_chat_messages ENABLE ROW LEVEL SECURITY; 