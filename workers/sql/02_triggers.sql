CREATE OR REPLACE FUNCTION notify_email_change()
RETURNS trigger AS $$
BEGIN
  PERFORM pg_notify('email_queue', row_to_json(NEW)::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER email_insert_trigger
AFTER INSERT ON emails
FOR EACH ROW
EXECUTE FUNCTION notify_email_change();

CREATE TRIGGER email_retry_trigger
AFTER UPDATE OF status ON emails
FOR EACH ROW
WHEN (NEW.status = 'pending' AND OLD.status = 'failed')
EXECUTE FUNCTION notify_email_change();
