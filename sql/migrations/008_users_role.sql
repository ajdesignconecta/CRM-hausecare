ALTER TABLE users
ADD COLUMN IF NOT EXISTS role varchar(20) NOT NULL DEFAULT 'admin';

UPDATE users
SET role = 'admin'
WHERE role IS NULL OR role = '';
