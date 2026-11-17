-- ============================================================================
-- ClubMatch PostgreSQL Triggers & Stored Trigger Functions
-- ============================================================================

-- 1. Automatic updated_at timestamp maintenance
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_user_accounts_updated_at ON user_accounts;
CREATE TRIGGER trg_user_accounts_updated_at
  BEFORE UPDATE ON user_accounts
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_students_updated_at ON students;
CREATE TRIGGER trg_students_updated_at
  BEFORE UPDATE ON students
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_clubs_updated_at ON clubs;
CREATE TRIGGER trg_clubs_updated_at
  BEFORE UPDATE ON clubs
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_events_updated_at ON events;
CREATE TRIGGER trg_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_event_registrations_updated_at ON event_registrations;
CREATE TRIGGER trg_event_registrations_updated_at
  BEFORE UPDATE ON event_registrations
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- 2. Maintain event.current_registrations & audit resource_activities
CREATE OR REPLACE FUNCTION fn_sync_event_registration_count()
RETURNS TRIGGER AS $$
DECLARE
  v_event_id TEXT;
  v_active_count INTEGER;
  v_action TEXT;
  v_student_id TEXT;
BEGIN
  IF (TG_OP = 'DELETE') THEN
    v_event_id := OLD.event_id;
    v_student_id := OLD.student_id;
    v_action := 'REGISTRATION_DELETED';
  ELSE
    v_event_id := NEW.event_id;
    v_student_id := NEW.student_id;
    IF (TG_OP = 'INSERT') THEN
      v_action := 'EVENT_REGISTERED';
    ELSIF (NEW.status = 'CANCELLED' AND OLD.status <> 'CANCELLED') THEN
      v_action := 'REGISTRATION_CANCELLED';
    ELSIF (NEW.status = 'REGISTERED' AND OLD.status = 'CANCELLED') THEN
      v_action := 'REGISTRATION_REACTIVATED';
    ELSE
      v_action := 'REGISTRATION_UPDATED';
    END IF;
  END IF;

  SELECT COUNT(*)::INT
  INTO v_active_count
  FROM event_registrations
  WHERE event_id = v_event_id
    AND status IN ('REGISTERED', 'ATTENDED');

  UPDATE events
  SET current_registrations = v_active_count
  WHERE event_id = v_event_id;

  INSERT INTO resource_activities (
    activity_id, actor_role, action, entity_type, entity_id, summary, metadata
  ) VALUES (
    'act_' || md5(random()::text || clock_timestamp()::text),
    'SYSTEM_TRIGGER',
    v_action,
    'EVENT',
    v_event_id,
    'Trigger updated registration count to ' || v_active_count || ' for event ' || v_event_id,
    jsonb_build_object('student_id', v_student_id, 'active_count', v_active_count, 'op', TG_OP)
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_event_registration_count ON event_registrations;
CREATE TRIGGER trg_sync_event_registration_count
  AFTER INSERT OR UPDATE OF status OR DELETE ON event_registrations
  FOR EACH ROW EXECUTE FUNCTION fn_sync_event_registration_count();

-- 3. Maintain club.member_count automatically on membership changes
CREATE OR REPLACE FUNCTION fn_sync_club_member_count()
RETURNS TRIGGER AS $$
DECLARE
  v_club_id TEXT;
  v_count INTEGER;
BEGIN
  v_club_id := COALESCE(NEW.club_id, OLD.club_id);

  SELECT COUNT(*)::INT
  INTO v_count
  FROM club_memberships
  WHERE club_id = v_club_id AND status = 'ACTIVE';

  UPDATE clubs
  SET member_count = GREATEST(member_count, v_count)
  WHERE club_id = v_club_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_club_member_count ON club_memberships;
CREATE TRIGGER trg_sync_club_member_count
  AFTER INSERT OR UPDATE OR DELETE ON club_memberships
  FOR EACH ROW EXECUTE FUNCTION fn_sync_club_member_count();

-- 4. Audit club approval / status transitions
CREATE OR REPLACE FUNCTION fn_log_club_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF (OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO resource_activities (
      activity_id, actor_role, action, entity_type, entity_id, summary, metadata
    ) VALUES (
      'act_' || md5(random()::text || clock_timestamp()::text),
      'SYSTEM_TRIGGER',
      'CLUB_STATUS_CHANGED',
      'CLUB',
      NEW.club_id,
      'Club "' || NEW.name || '" status changed from ' || OLD.status || ' to ' || NEW.status,
      jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_log_club_status_change ON clubs;
CREATE TRIGGER trg_log_club_status_change
  AFTER UPDATE OF status ON clubs
  FOR EACH ROW EXECUTE FUNCTION fn_log_club_status_change();
