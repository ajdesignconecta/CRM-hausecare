ALTER TABLE leads
ADD COLUMN IF NOT EXISTS temperature varchar(10);

ALTER TABLE leads
ADD COLUMN IF NOT EXISTS deal_value numeric(12,2);

ALTER TABLE leads
ADD COLUMN IF NOT EXISTS closed_at date;

ALTER TABLE leads
ADD COLUMN IF NOT EXISTS lost_reason varchar(240);

ALTER TABLE leads
ADD COLUMN IF NOT EXISTS next_action_date date;

ALTER TABLE leads
ADD COLUMN IF NOT EXISTS next_action_note text;
