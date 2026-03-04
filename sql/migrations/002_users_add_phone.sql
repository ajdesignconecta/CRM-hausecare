ALTER TABLE users
ADD COLUMN IF NOT EXISTS phone varchar(40),
ADD COLUMN IF NOT EXISTS phone_digits varchar(20);

UPDATE users
SET phone = COALESCE(phone, ''),
    phone_digits = COALESCE(phone_digits, '')
WHERE phone IS NULL OR phone_digits IS NULL;

ALTER TABLE users
ALTER COLUMN phone SET NOT NULL,
ALTER COLUMN phone_digits SET NOT NULL;
