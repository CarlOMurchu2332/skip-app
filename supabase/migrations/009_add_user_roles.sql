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

-- NOTE: To create users, go to Supabase Dashboard > Authentication > Users
-- Then manually add the users with the credentials in AUTHENTICATION_SETUP.md
-- After creating users, assign roles by running these INSERT statements separately:
--
-- For driver (stephenmck5@gmail.com):
--   INSERT INTO user_roles (user_id, role)
--   SELECT id, 'driver' FROM auth.users WHERE email = 'stephenmck5@gmail.com';
--
-- For office (carl@irishmetals.ie):
--   INSERT INTO user_roles (user_id, role)
--   SELECT id, 'office' FROM auth.users WHERE email = 'carl@irishmetals.ie';
--
-- For office (conor@irishmetals.ie):
--   INSERT INTO user_roles (user_id, role)
--   SELECT id, 'office' FROM auth.users WHERE email = 'conor@irishmetals.ie';
