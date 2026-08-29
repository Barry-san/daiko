ALTER TABLE emails ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE emails ADD COLUMN IF NOT EXISTS failed_at TIMESTAMPTZ;
ALTER TABLE emails ADD COLUMN IF NOT EXISTS retry_count INT DEFAULT 0;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'emails' AND column_name = 'recepient'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'emails' AND column_name = 'recipient'
  ) THEN
    ALTER TABLE emails RENAME COLUMN recepient TO recipient;
  END IF;
END $$;
