# Database Schema Documentation

## Tables

### users
- `id` UUID PRIMARY KEY
- `email` TEXT NOT NULL UNIQUE
- `role` TEXT NOT NULL CHECK (role IN ('Administrator', 'Worker', 'Customer'))
- `name` TEXT
- `created_at` TIMESTAMPTZ NOT NULL DEFAULT now()
- `timestamp` TIMESTAMPTZ NOT NULL DEFAULT now()

### teams
- `id` UUID PRIMARY KEY
- `name` TEXT NOT NULL
- `focus_area` TEXT
- `created_at` TIMESTAMPTZ NOT NULL DEFAULT now()

### user_teams
- `id` UUID PRIMARY KEY
- `user_id` UUID REFERENCES users(id) ON DELETE CASCADE
- `team_id` UUID REFERENCES teams(id) ON DELETE CASCADE
- UNIQUE(user_id, team_id)

### templates
- `id` UUID PRIMARY KEY
- `created_by` UUID REFERENCES users(id) ON DELETE SET NULL
- `title` TEXT NOT NULL
- `content` TEXT NOT NULL
- `created_at` TIMESTAMPTZ NOT NULL DEFAULT now()
- `team_id` UUID REFERENCES teams(id) ON DELETE SET NULL
- `tags` TEXT[] DEFAULT '{}'

### tickets
- `id` UUID PRIMARY KEY
- `customer_id` UUID REFERENCES users(id) ON DELETE SET NULL
- `title` TEXT NOT NULL
- `status` TEXT NOT NULL CHECK (status IN ('UNOPENED', 'IN PROGRESS', 'RESOLVED', 'UNRESOLVED'))
- `priority` TEXT CHECK (priority IN ('NONE', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL')) DEFAULT 'NONE'
- `created_at` TIMESTAMPTZ NOT NULL DEFAULT now()
- `updated_at` TIMESTAMPTZ
- `first_response_at` TIMESTAMPTZ
- `resolved_at` TIMESTAMPTZ
- `reopen_count` INT DEFAULT 0
- `assigned_to` UUID REFERENCES users(id) ON DELETE SET NULL
- `assigned_team` UUID REFERENCES teams(id) ON DELETE SET NULL
- `tags` TEXT[]
- `custom_fields` JSONB
- `timestamp` TIMESTAMPTZ NOT NULL DEFAULT now()

### messages
- `id` UUID PRIMARY KEY
- `ticket_id` UUID REFERENCES tickets(id) ON DELETE CASCADE
- `user_id` UUID REFERENCES users(id) ON DELETE SET NULL
- `content` TEXT NOT NULL
- `created_at` TIMESTAMPTZ NOT NULL DEFAULT now()
- `timestamp` TIMESTAMPTZ NOT NULL DEFAULT now()

### notes
- `id` UUID PRIMARY KEY
- `ticket_id` UUID REFERENCES tickets(id) ON DELETE CASCADE
- `created_by` UUID REFERENCES users(id) ON DELETE SET NULL
- `content` TEXT NOT NULL
- `created_at` TIMESTAMPTZ NOT NULL DEFAULT now()

### feedback
- `id` UUID PRIMARY KEY
- `ticket_id` UUID REFERENCES tickets(id) ON DELETE CASCADE
- `score` INT CHECK (score >= 1 AND score <= 100)
- `comment` TEXT
- `created_at` TIMESTAMPTZ NOT NULL DEFAULT now()

### files
- `id` UUID PRIMARY KEY
- `ticket_id` UUID REFERENCES tickets(id) ON DELETE CASCADE
- `file_url` TEXT NOT NULL
- `uploaded_at` TIMESTAMPTZ NOT NULL DEFAULT now()

### worker_chat
- `id` UUID PRIMARY KEY
- `title` TEXT NOT NULL
- `theme` TEXT
- `creation_date` TIMESTAMPTZ NOT NULL DEFAULT now()

### worker_chat_messages
- `id` UUID PRIMARY KEY
- `worker_chat_id` UUID REFERENCES worker_chat(id) ON DELETE CASCADE
- `user_id` UUID REFERENCES users(id) ON DELETE SET NULL
- `content` TEXT NOT NULL
- `created_at` TIMESTAMPTZ NOT NULL DEFAULT now()

### help_articles
- `id` UUID PRIMARY KEY
- `title` TEXT NOT NULL
- `content` TEXT NOT NULL
- `category` TEXT
- `tags` TEXT[]
- `created_by` UUID REFERENCES users(id) ON DELETE SET NULL
- `created_at` TIMESTAMPTZ NOT NULL DEFAULT now()
- `updated_at` TIMESTAMPTZ NOT NULL DEFAULT now()
- `published` BOOLEAN DEFAULT false

### webhooks
- `id` UUID PRIMARY KEY
- `name` TEXT NOT NULL
- `url` TEXT NOT NULL
- `secret` TEXT NOT NULL
- `events` TEXT[] NOT NULL
- `is_active` BOOLEAN DEFAULT true
- `created_by` UUID REFERENCES users(id) ON DELETE SET NULL
- `created_at` TIMESTAMPTZ NOT NULL DEFAULT now()
- `updated_at` TIMESTAMPTZ NOT NULL DEFAULT now()

### webhook_logs
- `id` UUID PRIMARY KEY
- `webhook_id` UUID REFERENCES webhooks(id) ON DELETE CASCADE
- `event` TEXT NOT NULL
- `payload` JSONB NOT NULL
- `status_code` INTEGER
- `response` TEXT
- `error` TEXT
- `attempt_count` INTEGER DEFAULT 1
- `created_at` TIMESTAMPTZ NOT NULL DEFAULT now()
- `updated_at` TIMESTAMPTZ NOT NULL DEFAULT now()

## Indexes

### users
- `idx_users_role` ON (role)

### user_teams
- `idx_user_teams_user` ON (user_id)
- `idx_user_teams_team` ON (team_id)

### tickets
- `idx_tickets_status` ON (status)
- `idx_tickets_customer` ON (customer_id)
- `idx_tickets_assigned_to` ON (assigned_to)
- `idx_tickets_assigned_team` ON (assigned_team)
- `idx_tickets_created_at` ON (created_at)
- `idx_tickets_priority` ON (priority)
- `idx_tickets_tags` ON (tags) USING gin
- `idx_tickets_custom_fields` ON (custom_fields) USING gin
- `idx_tickets_title_search` ON (to_tsvector('english', title)) USING gin

### messages
- `idx_messages_ticket` ON (ticket_id)
- `idx_messages_user` ON (user_id)
- `idx_messages_created_at` ON (created_at)

### notes
- `idx_notes_ticket` ON (ticket_id)
- `idx_notes_created_by` ON (created_by)

### feedback
- `idx_feedback_ticket` ON (ticket_id)
- `idx_feedback_score` ON (score)

### files
- `idx_files_ticket` ON (ticket_id)

### templates
- `idx_templates_created_by` ON (created_by)
- `idx_templates_title_search` ON (to_tsvector('english', title)) USING gin
- `idx_templates_team` ON (team_id)
- `idx_templates_tags` ON (tags) USING gin

### help_articles
- `idx_help_articles_category` ON (category)
- `idx_help_articles_created_by` ON (created_by)
- `idx_help_articles_tags` ON (tags) USING gin
- `idx_help_articles_title_search` ON (to_tsvector('english', title)) USING gin
- `idx_help_articles_content_search` ON (to_tsvector('english', content)) USING gin

### webhooks
- `idx_webhooks_events` ON (events) USING gin
- `idx_webhooks_created_by` ON (created_by)
- `idx_webhooks_is_active` ON (is_active)

## Row Level Security (RLS)

All tables have Row Level Security enabled. Specific policies are defined for each table to control access based on user roles and relationships. 