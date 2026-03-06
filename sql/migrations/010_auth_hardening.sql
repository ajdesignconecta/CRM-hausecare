ALTER TABLE users
  ADD COLUMN IF NOT EXISTS mfa_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mfa_method varchar(20) NOT NULL DEFAULT 'email';

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_step integer NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS auth_magic_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_magic_tokens_lookup
  ON auth_magic_tokens (token_hash, expires_at);

CREATE TABLE IF NOT EXISTS auth_mfa_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash text NOT NULL,
  channel varchar(20) NOT NULL DEFAULT 'email',
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  attempts integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_mfa_challenges_lookup
  ON auth_mfa_challenges (user_id, expires_at, consumed_at);

CREATE TABLE IF NOT EXISTS auth_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  email varchar(160),
  event_type varchar(60) NOT NULL,
  status varchar(20) NOT NULL,
  latency_ms integer NOT NULL DEFAULT 0,
  ip varchar(120),
  user_agent text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_audit_events_type_status_created
  ON auth_audit_events (event_type, status, created_at DESC);
