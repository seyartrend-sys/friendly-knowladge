CREATE TABLE IF NOT EXISTS topics (
  id uuid PRIMARY KEY,
  owner_id text NOT NULL DEFAULT 'owner',
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  color text NOT NULL DEFAULT '#7968e8',
  icon text NOT NULL DEFAULT '✦',
  stage text NOT NULL DEFAULT 'بذرة'
    CHECK (stage IN ('بذرة', 'بحث', 'موثّق', 'معرفة', 'تطبيق', 'أرشيف')),
  progress integer NOT NULL DEFAULT 10 CHECK (progress BETWEEN 0 AND 100),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(description, ''))
  ) STORED
);

CREATE TABLE IF NOT EXISTS notes (
  id uuid PRIMARY KEY,
  owner_id text NOT NULL DEFAULT 'owner',
  topic_id uuid REFERENCES topics(id) ON DELETE SET NULL,
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  summary text NOT NULL DEFAULT '',
  kind text NOT NULL DEFAULT 'note'
    CHECK (kind IN ('note', 'idea', 'question', 'research')),
  stage text NOT NULL DEFAULT 'بذرة'
    CHECK (stage IN ('بذرة', 'بحث', 'موثّق', 'معرفة', 'تطبيق', 'أرشيف')),
  tags text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  search_vector tsvector GENERATED ALWAYS AS (
  to_tsvector(
    'simple',
    coalesce(title, '') || ' ' || coalesce(content, '') || ' ' ||
    coalesce(summary, '')
  )
) STORED

);

CREATE TABLE IF NOT EXISTS sources (
  id uuid PRIMARY KEY,
  owner_id text NOT NULL DEFAULT 'owner',
  topic_id uuid REFERENCES topics(id) ON DELETE SET NULL,
  title text NOT NULL,
  url text NOT NULL DEFAULT '',
  author text NOT NULL DEFAULT '',
  source_type text NOT NULL DEFAULT 'article'
    CHECK (source_type IN ('article', 'book', 'video', 'paper', 'podcast')),
  status text NOT NULL DEFAULT 'unread'
    CHECK (status IN ('unread', 'reading', 'complete')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY,
  owner_id text NOT NULL DEFAULT 'owner',
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'idea'
    CHECK (status IN ('idea', 'active', 'paused', 'complete')),
  progress integer NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  due_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(description, ''))
  ) STORED
);

CREATE TABLE IF NOT EXISTS project_topics (
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  topic_id uuid NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  PRIMARY KEY (project_id, topic_id)
);

CREATE TABLE IF NOT EXISTS project_tasks (
  id uuid PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  position integer NOT NULL DEFAULT 0,
  due_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS knowledge_links (
  id uuid PRIMARY KEY,
  owner_id text NOT NULL DEFAULT 'owner',
  source_type text NOT NULL
    CHECK (source_type IN ('topic', 'note', 'source', 'project')),
  source_id uuid NOT NULL,
  target_type text NOT NULL
    CHECK (target_type IN ('topic', 'note', 'source', 'project')),
  target_id uuid NOT NULL,
  relation text NOT NULL,
  confidence numeric(4, 3) NOT NULL DEFAULT 0.5
    CHECK (confidence BETWEEN 0 AND 1),
  reason text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_type, source_id, target_type, target_id, relation)
);

CREATE TABLE IF NOT EXISTS chat_threads (
  id text PRIMARY KEY,
  owner_id text NOT NULL DEFAULT 'owner',
  title text NOT NULL DEFAULT 'محادثة المعرفة',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY,
  thread_id text NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  provider text CHECK (provider IN ('demo', 'connected')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS topics_owner_updated_idx
  ON topics (owner_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS topics_search_idx
  ON topics USING gin (search_vector);
CREATE INDEX IF NOT EXISTS notes_topic_updated_idx
  ON notes (topic_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS notes_search_idx
  ON notes USING gin (search_vector);
CREATE INDEX IF NOT EXISTS sources_topic_created_idx
  ON sources (topic_id, created_at DESC);
CREATE INDEX IF NOT EXISTS projects_owner_updated_idx
  ON projects (owner_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS projects_search_idx
  ON projects USING gin (search_vector);
CREATE INDEX IF NOT EXISTS links_source_idx
  ON knowledge_links (source_type, source_id);
CREATE INDEX IF NOT EXISTS links_target_idx
  ON knowledge_links (target_type, target_id);
CREATE INDEX IF NOT EXISTS messages_thread_created_idx
  ON chat_messages (thread_id, created_at);

INSERT INTO chat_threads (id, title)
VALUES ('default', 'محادثة المعرفة')
ON CONFLICT (id) DO NOTHING;
