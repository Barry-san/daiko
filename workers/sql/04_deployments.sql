CREATE TABLE IF NOT EXISTS deployments (
  deployment_id UUID PRIMARY KEY,
  project_id UUID NOT NULL,
  port INT NOT NULL,
  container_id TEXT,
  status TEXT NOT NULL DEFAULT 'running',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  stopped_at TIMESTAMPTZ
);
