ALTER TABLE users
ADD COLUMN IF NOT EXISTS company_name varchar(180),
ADD COLUMN IF NOT EXISTS responsible_name varchar(120);

UPDATE users
SET responsible_name = COALESCE(responsible_name, name)
WHERE responsible_name IS NULL;

UPDATE users u
SET company_name = COALESCE(company_name, o.name)
FROM organizations o
WHERE u.organization_id = o.id
  AND u.company_name IS NULL;
