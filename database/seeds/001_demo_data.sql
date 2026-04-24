-- DCMS Seed Data — Categories & Missions
-- Run AFTER 001_initial_schema.sql

-- Missions
INSERT INTO missions (mission_name, country_code, country_name, ambassador_name, contact_email, contact_phone) VALUES
  ('Embassy of Australia',       'AUS', 'Australia',      'H.E. John Smith',    'dcms@australia.embassy.pg', '+675 321 7654'),
  ('Embassy of Japan',           'JPN', 'Japan',          'H.E. Yuki Tanaka',   'dcms@japan.embassy.pg',     '+675 321 8765'),
  ('Embassy of France',          'FRA', 'France',         'H.E. Pierre Dupont', 'dcms@france.embassy.pg',    '+675 321 9876'),
  ('Embassy of United States',   'USA', 'United States',  'H.E. Mary Johnson',  'dcms@usa.embassy.pg',       '+675 321 0987'),
  ('Embassy of New Zealand',     'NZL', 'New Zealand',    'H.E. Kate Williams', 'dcms@nz.embassy.pg',        '+675 321 1098');

-- Categories (Representative sample of the 29 SOP categories)
DO $$
DECLARE
  dept_dot   UUID := (SELECT dept_id FROM departments WHERE dept_code = 'DOT');
  dept_rpngc UUID := (SELECT dept_id FROM departments WHERE dept_code = 'RPNGC');
  dept_pngdf UUID := (SELECT dept_id FROM departments WHERE dept_code = 'PNGDF');
  dept_nicta UUID := (SELECT dept_id FROM departments WHERE dept_code = 'NICTA');
  dept_dict  UUID := (SELECT dept_id FROM departments WHERE dept_code = 'DICT');
BEGIN

  INSERT INTO clearance_categories (category_code, display_name, primary_dept_id, metadata_schema) VALUES
    ('AIRCRAFT', 'Diplomatic/Military Aircraft', dept_pngdf, '{
      "fields": [
        {"name": "aircraft_type", "type": "string", "label": "Aircraft Type"},
        {"name": "call_sign", "type": "string", "label": "Call Sign"},
        {"name": "flight_number", "type": "string", "label": "Flight Number"}
      ]
    }'),
    ('SHIPS', 'Naval/Research Vessels', dept_dot, '{
      "fields": [
        {"name": "vessel_type", "type": "string", "label": "Vessel Type"},
        {"name": "imo_number", "type": "string", "label": "IMO Number"},
        {"name": "tonnage", "type": "number", "label": "Tonnage"}
      ]
    }'),
    ('HIGH_RISK_CARGO', 'High-Risk Cargo', dept_rpngc, '{
      "fields": [
        {"name": "cargo_description", "type": "text", "label": "Cargo Description"},
        {"name": "hazard_class", "type": "string", "label": "Hazard Class"}
      ]
    }'),
    ('CRIMINAL_INVESTIGATION', 'International Criminal Investigations', dept_rpngc, '{
      "fields": [
        {"name": "case_reference", "type": "string", "label": "Case Reference"},
        {"name": "lead_agency", "type": "string", "label": "Lead International Agency"}
      ]
    }'),
    ('DISASTER_RESPONSE', 'Disaster Response / Humanitarian Aid', dept_pngdf, '{
      "fields": [
        {"name": "mission_objective", "type": "text", "label": "Mission Objective"},
        {"name": "aid_type", "type": "string", "label": "Type of Aid"}
      ]
    }'),
    ('RADIO_FREQUENCY', 'Radio Frequency / Telecommunications', dept_nicta, '{
      "fields": [
        {"name": "frequency_range", "type": "string", "label": "Frequency Range"},
        {"name": "equipment_type", "type": "string", "label": "Equipment Type"}
      ]
    }'),
    ('DIPLOMATIC_POUCH', 'Diplomatic Pouch (Oversized)', dept_dict, '{
      "fields": [
        {"name": "pouch_id", "type": "string", "label": "Pouch ID"},
        {"name": "weight_kg", "type": "number", "label": "Weight (kg)"}
      ]
    }'),
    ('FIREARMS', 'Security Personnel Firearms', dept_rpngc, '{
      "fields": [
        {"name": "weapon_serial", "type": "string", "label": "Weapon Serial Number"},
        {"name": "ammo_count", "type": "number", "label": "Ammunition Count"}
      ]
    }'),
    ('VIP_PROTECTION', 'VIP Protection Services', dept_rpngc, '{
      "fields": [
        {"name": "vip_name", "type": "string", "label": "VIP Name"},
        {"name": "security_detail_size", "type": "number", "label": "Security Detail Size"}
      ]
    }'),
    ('SCIENTIFIC_RESEARCH', 'Scientific/Oceanographic Research', dept_dot, '{
      "fields": [
        {"name": "research_topic", "type": "string", "label": "Research Topic"},
        {"name": "equipment_deployed", "type": "text", "label": "Equipment to be Deployed"}
      ]
    }');

  -- Add more placeholders for the remaining 19 categories to reach 29
  FOR i IN 11..29 LOOP
    INSERT INTO clearance_categories (category_code, display_name, primary_dept_id, metadata_schema)
    VALUES ('SOP_CAT_' || i, 'SOP Category ' || i, dept_rpngc, '{"fields": []}');
  END LOOP;

END $$;
