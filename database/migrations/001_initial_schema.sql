-- ============================================================
-- DCMS Migration 001: Initial Schema (Refactored for Categories)
-- Diplomatic Clearance Management System — Papua New Guinea
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE request_status AS ENUM (
  'DRAFT','SUBMITTED','UNDER_REVIEW','APPROVED',
  'FINALIZED','REJECTED','WITHDRAWN','EXPIRED'
);
CREATE TYPE review_status AS ENUM (
  'PENDING','APPROVED','REJECTED','INFORMATION_REQUESTED'
);
CREATE TYPE clearance_type AS ENUM ('STANDARD','EMERGENCY');

CREATE TABLE missions (
  mission_id      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mission_name    VARCHAR(255) NOT NULL,
  country_code    CHAR(3) NOT NULL,
  country_name    VARCHAR(100) NOT NULL,
  ambassador_name VARCHAR(255),
  contact_email   VARCHAR(255) NOT NULL UNIQUE,
  contact_phone   VARCHAR(50),
  address         TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE departments (
  dept_id       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dept_code     VARCHAR(20) NOT NULL UNIQUE,
  dept_name     VARCHAR(255) NOT NULL,
  is_mandatory  BOOLEAN NOT NULL DEFAULT TRUE,
  review_order  SMALLINT,
  contact_email VARCHAR(255),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO departments (dept_code, dept_name, is_mandatory, review_order, contact_email) VALUES
  ('DOT',   'Department of Transportation',                         TRUE,  1, 'reviews@dot.gov.pg'),
  ('RPNGC', 'Royal Papua New Guinea Constabulary',                  TRUE,  2, 'reviews@rpngc.gov.pg'),
  ('PNGDF', 'Papua New Guinea Defence Force',                       TRUE,  3, 'reviews@pngdf.mil.pg'),
  ('NICTA', 'National Information & Communications Authority',      TRUE,  4, 'reviews@nicta.gov.pg'),
  ('DICT',  'Department of Information & Communications Technology',TRUE,  5, 'reviews@dict.gov.pg'),
  ('DFA',   'Department of Foreign Affairs',                        FALSE, 6, 'clearances@dfa.gov.pg');

CREATE TABLE clearance_categories (
  category_id     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_code   VARCHAR(50) NOT NULL UNIQUE,
  display_name    VARCHAR(255) NOT NULL,
  metadata_schema JSONB NOT NULL DEFAULT '{}',
  primary_dept_id UUID REFERENCES departments(dept_id),
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE requests (
  request_id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference_number        VARCHAR(30) NOT NULL UNIQUE,
  mission_id              UUID NOT NULL REFERENCES missions(mission_id) ON DELETE RESTRICT,
  category_id             UUID NOT NULL REFERENCES clearance_categories(category_id),
  vessel_name             VARCHAR(255), -- Keep for legacy/compatibility if needed, but move to metadata
  port_of_entry           VARCHAR(255) NOT NULL,
  port_of_exit            VARCHAR(255),
  route_waypoints         JSONB DEFAULT '[]',
  intended_activities     TEXT,
  proposed_entry_date     DATE NOT NULL,
  proposed_exit_date      DATE NOT NULL,
  total_crew              SMALLINT NOT NULL DEFAULT 0,
  total_passengers        SMALLINT NOT NULL DEFAULT 0,
  personnel_manifest      JSONB DEFAULT '[]',
  category_metadata       JSONB NOT NULL DEFAULT '{}',
  security_coordination_required BOOLEAN NOT NULL DEFAULT FALSE,
  is_emergency            BOOLEAN NOT NULL DEFAULT FALSE,
  clearance_type          clearance_type NOT NULL DEFAULT 'STANDARD',
  emergency_reason        TEXT,
  status                  request_status NOT NULL DEFAULT 'DRAFT',
  submitted_at            TIMESTAMPTZ,
  initial_review_deadline TIMESTAMPTZ,
  agency_review_deadline  TIMESTAMPTZ,
  issuance_deadline       TIMESTAMPTZ,
  review_deadline         TIMESTAMPTZ,
  overdue_at              TIMESTAMPTZ,
  rejected_reason         TEXT,
  final_clearance_id      UUID,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_exit_after_entry CHECK (proposed_exit_date >= proposed_entry_date),
  CONSTRAINT chk_emergency_reason CHECK (
    clearance_type = 'STANDARD' OR emergency_reason IS NOT NULL
  )
);

CREATE OR REPLACE FUNCTION add_working_days(start_ts TIMESTAMPTZ, num_days INT)
RETURNS TIMESTAMPTZ LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  result_ts TIMESTAMPTZ := start_ts;
  days_added INT := 0;
BEGIN
  WHILE days_added < num_days LOOP
    result_ts := result_ts + INTERVAL '1 day';
    IF EXTRACT(DOW FROM result_ts) NOT IN (0, 6) THEN
      days_added := days_added + 1;
    END IF;
  END LOOP;
  RETURN result_ts;
END;
$$;

CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_missions_updated_at BEFORE UPDATE ON missions FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_requests_updated_at BEFORE INSERT OR UPDATE ON requests FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_categories_updated_at BEFORE UPDATE ON clearance_categories FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE OR REPLACE FUNCTION set_submission_deadlines()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'SUBMITTED' AND (OLD.status IS NULL OR OLD.status = 'DRAFT') THEN
    NEW.submitted_at := NOW();
    IF NEW.is_emergency = TRUE OR NEW.clearance_type = 'EMERGENCY' THEN
      NEW.initial_review_deadline := NOW() + INTERVAL '4 hours';
      NEW.agency_review_deadline  := NOW() + INTERVAL '12 hours';
      NEW.issuance_deadline       := NOW() + INTERVAL '24 hours';
      NEW.review_deadline         := NEW.issuance_deadline;
    ELSE
      NEW.initial_review_deadline := add_working_days(NOW(), 2);
      NEW.agency_review_deadline  := add_working_days(NOW(), 7);
      NEW.issuance_deadline       := add_working_days(NOW(), 10);
      NEW.review_deadline         := NEW.issuance_deadline;
    END IF;
    NEW.overdue_at := NEW.review_deadline;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_submission_deadlines
  BEFORE INSERT OR UPDATE ON requests
  FOR EACH ROW EXECUTE FUNCTION set_submission_deadlines();

CREATE TABLE workflow_steps (
  review_id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id       UUID NOT NULL REFERENCES requests(request_id) ON DELETE CASCADE,
  dept_id          UUID NOT NULL REFERENCES departments(dept_id) ON DELETE RESTRICT,
  assigned_to      VARCHAR(255),
  status           review_status NOT NULL DEFAULT 'PENDING',
  comments         TEXT,
  conditions       TEXT,
  assessment_data  JSONB NOT NULL DEFAULT '{}',
  reviewed_at      TIMESTAMPTZ,
  notified_at      TIMESTAMPTZ,
  reminder_sent_at TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (request_id, dept_id)
);

CREATE TRIGGER trg_reviews_updated_at
  BEFORE INSERT OR UPDATE ON workflow_steps
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE OR REPLACE FUNCTION set_reviewed_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status IN ('APPROVED','REJECTED','INFORMATION_REQUESTED') AND OLD.status = 'PENDING' THEN
    NEW.reviewed_at := NOW();
    UPDATE requests SET status = 'UNDER_REVIEW'
    WHERE request_id = NEW.request_id AND status = 'SUBMITTED';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_reviewed_at
  BEFORE UPDATE ON workflow_steps
  FOR EACH ROW EXECUTE FUNCTION set_reviewed_at();

CREATE OR REPLACE FUNCTION check_all_reviews_complete()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  total_mandatory INT;
  total_approved  INT;
  any_rejected    BOOLEAN;
BEGIN
  SELECT COUNT(*) INTO total_mandatory FROM departments WHERE is_mandatory = TRUE;
  SELECT COUNT(*) INTO total_approved
  FROM workflow_steps dr JOIN departments d ON dr.dept_id = d.dept_id
  WHERE dr.request_id = NEW.request_id AND d.is_mandatory = TRUE AND dr.status = 'APPROVED';
  SELECT EXISTS (
    SELECT 1 FROM workflow_steps dr JOIN departments d ON dr.dept_id = d.dept_id
    WHERE dr.request_id = NEW.request_id AND d.is_mandatory = TRUE AND dr.status = 'REJECTED'
  ) INTO any_rejected;
  IF any_rejected THEN
    UPDATE requests SET status = 'REJECTED' WHERE request_id = NEW.request_id;
  ELSIF total_approved >= total_mandatory THEN
    UPDATE requests SET status = 'APPROVED' WHERE request_id = NEW.request_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_check_reviews_complete
  AFTER INSERT OR UPDATE ON workflow_steps
  FOR EACH ROW EXECUTE FUNCTION check_all_reviews_complete();

CREATE TABLE clearance_log (
  clearance_id      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id        UUID NOT NULL UNIQUE REFERENCES requests(request_id) ON DELETE RESTRICT,
  issued_by_dept_id UUID NOT NULL REFERENCES departments(dept_id),
  clearance_number  VARCHAR(50) NOT NULL UNIQUE,
  digital_hash      VARCHAR(128) NOT NULL UNIQUE,
  letter_hash       VARCHAR(128),
  qr_payload        TEXT NOT NULL,
  valid_from        DATE NOT NULL,
  valid_until       DATE NOT NULL,
  conditions        TEXT,
  issued_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  issued_by_officer VARCHAR(255) NOT NULL,
  is_revoked        BOOLEAN NOT NULL DEFAULT FALSE,
  revoked_at        TIMESTAMPTZ,
  revocation_reason TEXT,
  CONSTRAINT chk_valid_window CHECK (valid_until >= valid_from)
);

CREATE OR REPLACE FUNCTION guard_clearance_issuance()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE req_status request_status;
BEGIN
  SELECT status INTO req_status FROM requests WHERE request_id = NEW.request_id;
  IF req_status != 'APPROVED' THEN
    RAISE EXCEPTION 'Cannot issue clearance: request % has status %. All agencies must approve first.', NEW.request_id, req_status;
  END IF;
  UPDATE requests SET status = 'FINALIZED', final_clearance_id = NEW.clearance_id
  WHERE request_id = NEW.request_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_guard_clearance
  AFTER INSERT ON clearance_log
  FOR EACH ROW EXECUTE FUNCTION guard_clearance_issuance();

ALTER TABLE requests ADD CONSTRAINT fk_final_clearance
  FOREIGN KEY (final_clearance_id) REFERENCES clearance_log(clearance_id) DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE system_logs (
  log_id      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type VARCHAR(50) NOT NULL,
  entity_id   UUID NOT NULL,
  changed_by  VARCHAR(255),
  old_status  VARCHAR(50),
  new_status  VARCHAR(50),
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION protect_immutable_logs()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Audit logs are immutable and cannot be updated or deleted. (SOP Section 6)';
END;
$$;

CREATE TRIGGER trg_protect_system_logs
  BEFORE UPDATE OR DELETE ON system_logs
  FOR EACH ROW EXECUTE FUNCTION protect_immutable_logs();

CREATE OR REPLACE FUNCTION log_status_change()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_TABLE_NAME = 'requests' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO system_logs(entity_type,entity_id,old_status,new_status)
    VALUES ('REQUEST',NEW.request_id,OLD.status::TEXT,NEW.status::TEXT);
  ELSIF TG_TABLE_NAME = 'workflow_steps' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO system_logs(entity_type,entity_id,old_status,new_status)
    VALUES ('REVIEW',NEW.review_id,OLD.status::TEXT,NEW.status::TEXT);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_audit_requests AFTER UPDATE ON requests FOR EACH ROW EXECUTE FUNCTION log_status_change();
CREATE TRIGGER trg_audit_reviews  AFTER UPDATE ON workflow_steps FOR EACH ROW EXECUTE FUNCTION log_status_change();

CREATE OR REPLACE VIEW v_request_dashboard AS
SELECT r.request_id, r.reference_number, m.mission_name, m.country_name,
  c.display_name AS category_name, r.vessel_name, r.status, r.security_coordination_required,
  r.proposed_entry_date, r.proposed_exit_date, r.submitted_at,
  r.initial_review_deadline, r.agency_review_deadline, r.issuance_deadline, r.review_deadline,
  CASE
    WHEN r.status = 'SUBMITTED' AND r.initial_review_deadline < NOW() THEN 'OVERDUE_INITIAL'
    WHEN r.status = 'UNDER_REVIEW' AND r.agency_review_deadline < NOW() THEN 'OVERDUE_AGENCY'
    WHEN r.status = 'APPROVED' AND r.issuance_deadline < NOW() THEN 'OVERDUE_ISSUANCE'
    WHEN r.status NOT IN ('SUBMITTED','UNDER_REVIEW','APPROVED') THEN NULL
    WHEN r.review_deadline < NOW() THEN 'OVERDUE'
    WHEN r.review_deadline < NOW() + INTERVAL '2 days' THEN 'DUE_SOON'
    ELSE 'ON_TRACK'
  END AS deadline_status,
  COUNT(dr.review_id) FILTER (WHERE dr.status='APPROVED') AS approved_count,
  COUNT(dr.review_id) FILTER (WHERE dr.status='PENDING')  AS pending_count,
  COUNT(dr.review_id) FILTER (WHERE dr.status='REJECTED') AS rejected_count,
  (SELECT COUNT(*) FROM departments WHERE is_mandatory=TRUE) AS total_mandatory
FROM requests r
JOIN missions m ON r.mission_id = m.mission_id
JOIN clearance_categories c ON r.category_id = c.category_id
LEFT JOIN workflow_steps dr ON r.request_id = dr.request_id
GROUP BY r.request_id, m.mission_name, m.country_name, c.display_name;

CREATE OR REPLACE VIEW v_clearance_verify AS
SELECT fc.clearance_id, fc.clearance_number, fc.digital_hash, fc.letter_hash,
  fc.valid_from, fc.valid_until, fc.is_revoked, fc.issued_at,
  fc.issued_by_officer, fc.conditions,
  r.reference_number, r.vessel_name, r.port_of_entry, r.port_of_exit,
  r.route_waypoints, r.total_crew, r.total_passengers, r.personnel_manifest,
  r.category_metadata, c.display_name AS category_name,
  m.mission_name, m.country_name
FROM clearance_log fc
JOIN requests r ON fc.request_id = r.request_id
JOIN clearance_categories c ON r.category_id = c.category_id
JOIN missions m ON r.mission_id = m.mission_id;

CREATE INDEX idx_requests_mission  ON requests(mission_id);
CREATE INDEX idx_requests_category ON requests(category_id);
CREATE INDEX idx_requests_status   ON requests(status);
CREATE INDEX idx_requests_deadline ON requests(review_deadline);
CREATE INDEX idx_reviews_request   ON workflow_steps(request_id);
CREATE INDEX idx_reviews_dept      ON workflow_steps(dept_id);
CREATE INDEX idx_clearances_hash   ON clearance_log(digital_hash);
CREATE INDEX idx_audit_entity      ON system_logs(entity_type, entity_id);
