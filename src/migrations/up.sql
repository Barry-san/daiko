-- Consolidated schema, kept in sync with workers/sql/*.
-- All statements are idempotent so they can be re-applied.

CREATE TABLE IF NOT EXISTS users(
  user_id uuid PRIMARY KEY,
  email varchar(255) NOT NULL UNIQUE,
  username varchar(255),
  password_hash varchar(255) NOT NULL,
  is_verified boolean DEFAULT false,
  created_at timestamptz DEFAULT NOW(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS projects(
  project_id uuid PRIMARY KEY,
  project_name varchar(255) NOT NULL,
  author uuid NOT NULL REFERENCES users(user_id),
  created_at timestamptz DEFAULT NOW(),
  content text,
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS deployments(
  deployment_id uuid PRIMARY KEY,
  project_id uuid NOT NULL,
  port int NOT NULL,
  container_id text,
  status text NOT NULL DEFAULT 'running',
  created_at timestamptz DEFAULT NOW(),
  stopped_at timestamptz,
  deployment_url text
);

CREATE TABLE IF NOT EXISTS otp(
  otp varchar(6) NOT NULL,
  user_id uuid NOT NULL REFERENCES users(user_id),
  expires_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS emails(
  email_id uuid NOT NULL PRIMARY KEY,
  recipient varchar(255) NOT NULL,
  content text NOT NULL,
  type varchar(20),
  status varchar(10) DEFAULT 'pending',
  created_at timestamptz DEFAULT NOW(),
  completed_at timestamptz,
  failed_at timestamptz,
  retry_count integer DEFAULT 0,
  CHECK (status IN ('pending', 'success', 'failed')),
  CHECK (type IN ('OTP', 'RESET'))
);

CREATE TABLE IF NOT EXISTS jobs(
  job_id uuid PRIMARY KEY,
  project_id uuid REFERENCES projects(project_id),
  author uuid REFERENCES users(user_id),
  name varchar(20),
  details text,
  status varchar(10),
  created_at timestamptz DEFAULT NOW(),
  started_at timestamptz,
  completed_at timestamptz
);

CREATE TABLE IF NOT EXISTS port_allocations(
  port_number int PRIMARY KEY,
  project_id uuid,
  status text NOT NULL DEFAULT 'free',
  allocated_at timestamptz,
  CHECK (status IN ('free', 'allocated'))
);

CREATE TABLE IF NOT EXISTS sessions(
  session_id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  expires_at timestamptz NOT NULL,
  last_used_at timestamptz NOT NULL DEFAULT NOW(),
  revoked_at timestamptz
);

INSERT INTO port_allocations (port_number, status)
SELECT generate_series(4000, 4999), 'free'
ON CONFLICT DO NOTHING;

CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions(expires_at);

CREATE OR REPLACE FUNCTION notify_email_change()
RETURNS trigger AS $$
BEGIN
  PERFORM pg_notify('email_queue', row_to_json(NEW)::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS email_insert_trigger ON emails;
CREATE TRIGGER email_insert_trigger
AFTER INSERT ON emails
FOR EACH ROW
EXECUTE FUNCTION notify_email_change();

DROP TRIGGER IF EXISTS email_retry_trigger ON emails;
CREATE TRIGGER email_retry_trigger
AFTER UPDATE OF status ON emails
FOR EACH ROW
WHEN (NEW.status = 'pending' AND OLD.status = 'failed')
EXECUTE FUNCTION notify_email_change();

CREATE OR REPLACE FUNCTION notify_build_change()
RETURNS trigger AS $$
BEGIN
  PERFORM pg_notify('build_queue', row_to_json(NEW)::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS build_insert_trigger ON jobs;
CREATE TRIGGER build_insert_trigger
AFTER INSERT ON jobs
FOR EACH ROW
WHEN (NEW.name = 'BUILD')
EXECUTE FUNCTION notify_build_change();

DROP TRIGGER IF EXISTS build_retry_trigger ON jobs;
CREATE TRIGGER build_retry_trigger
AFTER UPDATE OF status ON jobs
FOR EACH ROW
WHEN (NEW.name = 'BUILD' AND NEW.status = 'pending' AND OLD.status = 'failed')
EXECUTE FUNCTION notify_build_change();