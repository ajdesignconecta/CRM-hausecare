CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'had_response_enum') THEN
    CREATE TYPE had_response_enum AS ENUM ('sim', 'nao');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lead_level_enum') THEN
    CREATE TYPE lead_level_enum AS ENUM ('com_interesse', 'sem_interesse', 'nao_respondeu');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lead_status_enum') THEN
    CREATE TYPE lead_status_enum AS ENUM (
      'lead_novo',
      'em_contato',
      'reuniao_marcada',
      'proposta_enviada',
      'fechado',
      'perdido'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(180) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name varchar(120) NOT NULL,
  email varchar(160) NOT NULL,
  phone varchar(40) NOT NULL,
  phone_digits varchar(20) NOT NULL,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  UNIQUE(email)
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_lookup
  ON password_reset_tokens (token_hash, expires_at);

CREATE TABLE IF NOT EXISTS lead_counters (
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  current_value integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  PRIMARY KEY (organization_id, user_id)
);

CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  owner_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  lead_number integer NOT NULL,
  company varchar(180) NOT NULL,
  city varchar(120),
  phone varchar(40),
  phone_digits varchar(20),
  whatsapp varchar(40),
  whatsapp_digits varchar(20),
  email varchar(160),
  site varchar(220),
  maps_url varchar(350),
  decisor_name_role varchar(180),
  had_response had_response_enum,
  lead_level lead_level_enum,
  status lead_status_enum NOT NULL DEFAULT 'lead_novo',
  first_contact_date date,
  followup_date_1 date,
  followup_date_2 date,
  followup_date_3 date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, owner_user_id, lead_number)
);

CREATE INDEX IF NOT EXISTS idx_leads_org_status ON leads (organization_id, status);
CREATE INDEX IF NOT EXISTS idx_leads_org_city ON leads (organization_id, city);
CREATE INDEX IF NOT EXISTS idx_leads_org_level ON leads (organization_id, lead_level);
CREATE INDEX IF NOT EXISTS idx_leads_org_had_response ON leads (organization_id, had_response);
CREATE INDEX IF NOT EXISTS idx_leads_org_company_trgm ON leads (organization_id, company);
CREATE INDEX IF NOT EXISTS idx_leads_org_email ON leads (organization_id, email);
CREATE INDEX IF NOT EXISTS idx_leads_org_whatsapp_digits ON leads (organization_id, whatsapp_digits);

CREATE UNIQUE INDEX IF NOT EXISTS uq_leads_org_email_not_null
  ON leads (organization_id, email)
  WHERE email IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_leads_org_whatsapp_not_null
  ON leads (organization_id, whatsapp_digits)
  WHERE whatsapp_digits IS NOT NULL;

CREATE TABLE IF NOT EXISTS lead_import_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  file_name varchar(255) NOT NULL,
  status varchar(30) NOT NULL,
  total_rows integer NOT NULL DEFAULT 0,
  imported_count integer NOT NULL DEFAULT 0,
  duplicate_count integer NOT NULL DEFAULT 0,
  invalid_count integer NOT NULL DEFAULT 0,
  report jsonb,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  finished_at timestamptz
);

CREATE TABLE IF NOT EXISTS lead_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action varchar(60) NOT NULL,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_organizations_updated_at ON organizations;
CREATE TRIGGER trg_organizations_updated_at
BEFORE UPDATE ON organizations
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_leads_updated_at ON leads;
CREATE TRIGGER trg_leads_updated_at
BEFORE UPDATE ON leads
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_lead_counters_updated_at ON lead_counters;
CREATE TRIGGER trg_lead_counters_updated_at
BEFORE UPDATE ON lead_counters
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
