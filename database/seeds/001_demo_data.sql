-- DCMS Seed Data — Development / Demo
-- Run AFTER 001_initial_schema.sql

INSERT INTO missions (mission_name, country_code, country_name, ambassador_name, contact_email, contact_phone) VALUES
  ('Embassy of Australia',       'AUS', 'Australia',      'H.E. John Smith',    'dcms@australia.embassy.pg', '+675 321 7654'),
  ('Embassy of Japan',           'JPN', 'Japan',          'H.E. Yuki Tanaka',   'dcms@japan.embassy.pg',     '+675 321 8765'),
  ('Embassy of France',          'FRA', 'France',         'H.E. Pierre Dupont', 'dcms@france.embassy.pg',    '+675 321 9876'),
  ('Embassy of United States',   'USA', 'United States',  'H.E. Mary Johnson',  'dcms@usa.embassy.pg',       '+675 321 0987'),
  ('Embassy of New Zealand',     'NZL', 'New Zealand',    'H.E. Kate Williams', 'dcms@nz.embassy.pg',        '+675 321 1098');
