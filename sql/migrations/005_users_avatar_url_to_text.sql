ALTER TABLE users
ADD COLUMN IF NOT EXISTS avatar_url text;

ALTER TABLE users
ALTER COLUMN avatar_url TYPE text;
