-- Add user roles table
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('driver', 'office')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own role
CREATE POLICY "Users can read own role"
  ON user_roles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Service role can manage all roles
CREATE POLICY "Service role can manage roles"
  ON user_roles
  FOR ALL
  USING (auth.role() = 'service_role');

-- Update driver phone number
UPDATE drivers 
SET phone = '0833248236' 
WHERE name = 'Stephen McKiernan';

-- Note: To create the users, run these commands in Supabase SQL Editor:
-- 
-- Driver user:
-- INSERT INTO auth.users (email, encrypted_password, email_confirmed_at)
-- VALUES ('stephenmck5@gmail.com', crypt('grumpy2026', gen_salt('bf')), NOW());
-- 
-- INSERT INTO user_roles (user_id, role)
-- SELECT id, 'driver' FROM auth.users WHERE email = 'stephenmck5@gmail.com';
--
-- Office users:
-- INSERT INTO auth.users (email, encrypted_password, email_confirmed_at)
-- VALUES ('carl@irishmetals.ie', crypt('KqZ@12g83', gen_salt('bf')), NOW());
--
-- INSERT INTO user_roles (user_id, role)
-- SELECT id, 'office' FROM auth.users WHERE email = 'carl@irishmetals.ie';
--
-- INSERT INTO auth.users (email, encrypted_password, email_confirmed_at)
-- VALUES ('conor@irishmetals.ie', crypt('K@yden3714', gen_salt('bf')), NOW());
--
-- INSERT INTO user_roles (user_id, role)
-- SELECT id, 'office' FROM auth.users WHERE email = 'conor@irishmetals.ie';
