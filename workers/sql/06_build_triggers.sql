CREATE OR REPLACE FUNCTION notify_build_change()
RETURNS trigger AS $$
BEGIN
  PERFORM pg_notify('build_queue', row_to_json(NEW)::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER build_insert_trigger
AFTER INSERT ON jobs
FOR EACH ROW
WHEN (NEW.name = 'BUILD')
EXECUTE FUNCTION notify_build_change();

CREATE TRIGGER build_retry_trigger
AFTER UPDATE OF status ON jobs
FOR EACH ROW
WHEN (NEW.name = 'BUILD' AND NEW.status = 'pending' AND OLD.status = 'failed')
EXECUTE FUNCTION notify_build_change();
