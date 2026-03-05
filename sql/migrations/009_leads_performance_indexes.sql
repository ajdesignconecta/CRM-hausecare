-- Performance indexes for list/search/filter operations on leads.
-- Run this migration in Supabase SQL Editor.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_leads_org_status ON leads (organization_id, status);
CREATE INDEX IF NOT EXISTS idx_leads_org_city ON leads (organization_id, city);
CREATE INDEX IF NOT EXISTS idx_leads_org_level ON leads (organization_id, lead_level);
CREATE INDEX IF NOT EXISTS idx_leads_org_response ON leads (organization_id, had_response);
CREATE INDEX IF NOT EXISTS idx_leads_org_temperature ON leads (organization_id, temperature);
CREATE INDEX IF NOT EXISTS idx_leads_org_created_at ON leads (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_org_next_action ON leads (organization_id, next_action_date);
CREATE INDEX IF NOT EXISTS idx_leads_org_followup_1 ON leads (organization_id, followup_date_1);
CREATE INDEX IF NOT EXISTS idx_leads_org_deal_value ON leads (organization_id, deal_value);

-- Duplicate checks used during imports.
CREATE INDEX IF NOT EXISTS idx_leads_org_email ON leads (organization_id, email);
CREATE INDEX IF NOT EXISTS idx_leads_org_whatsapp_digits ON leads (organization_id, whatsapp_digits);
CREATE INDEX IF NOT EXISTS idx_leads_org_company_city ON leads (organization_id, company, city);

-- Accelerates ILIKE searches (company/email).
CREATE INDEX IF NOT EXISTS idx_leads_company_trgm ON leads USING gin (company gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_leads_email_trgm ON leads USING gin (email gin_trgm_ops);
