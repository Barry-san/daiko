CREATE TABLE IF NOT EXISTS port_allocations (
  port_number INT PRIMARY KEY,
  project_id UUID,
  status TEXT NOT NULL DEFAULT 'free',
  allocated_at TIMESTAMPTZ,
  CHECK (status IN ('free', 'allocated'))
);

INSERT INTO port_allocations (port_number, status)
SELECT generate_series(4000, 4999), 'free'
ON CONFLICT DO NOTHING;
