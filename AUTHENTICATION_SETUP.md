# Authentication Setup Instructions

## Overview
Authentication has been added with role-based access control. Users will now need to log in to access the system.

## User Roles
- **Driver**: Can only access Driver Portal (`/driver/jobs`)
- **Office**: Can access both Driver and Office Portals

## Setup Steps

### 1. Run the Migration in Supabase

Go to your Supabase project → SQL Editor and run:

```sql
-- This creates the user_roles table and updates Stephen's phone number
-- (Already in migrations/009_add_user_roles.sql)
```

The migration will:
- Create `user_roles` table
- Set up Row Level Security policies
- Update driver phone number to `0833248236`

### 2. Create Users in Supabase

Go to Supabase → Authentication → Users → Add User

**Create these 3 users:**

#### Driver User
- Email: `stephenmck5@gmail.com`
- Password: `grumpy2026`
- Email Confirmed: ✅ Yes

#### Office User 1 (Carl)
- Email: `carl@irishmetals.ie`
- Password: `KqZ@12g83`
- Email Confirmed: ✅ Yes

#### Office User 2 (Conor)
- Email: `conor@irishmetals.ie`
- Password: `K@yden3714`
- Email Confirmed: ✅ Yes

### 3. Assign Roles to Users

After creating the users, go to SQL Editor and run:

```sql
-- Assign driver role to Stephen
INSERT INTO user_roles (user_id, role)
SELECT id, 'driver' 
FROM auth.users 
WHERE email = 'stephenmck5@gmail.com';

-- Assign office role to Carl
INSERT INTO user_roles (user_id, role)
SELECT id, 'office' 
FROM auth.users 
WHERE email = 'carl@irishmetals.ie';

-- Assign office role to Conor
INSERT INTO user_roles (user_id, role)
SELECT id, 'office' 
FROM auth.users 
WHERE email = 'conor@irishmetals.ie';
```

## How It Works

### Login Flow
1. User visits the app → Redirected to `/login`
2. User enters email and password
3. System checks role in `user_roles` table
4. **Driver** → Redirected to `/driver/jobs`
5. **Office** → Redirected to `/office/skips`

### Home Page
- Driver users see only Driver Portal (highlighted)
- Office users see both portals (Office highlighted, but can access both)
- Logout button available

### Security
- Unauthenticated users are redirected to `/login`
- Role-based access enforced at the page level
- Session managed by Supabase Auth

## Testing

1. **Test Driver Login:**
   - Email: stephenmck5@gmail.com
   - Password: grumpy2026
   - Should land on `/driver/jobs`
   - Should only see Driver Portal on home page

2. **Test Office Login:**
   - Email: carl@irishmetals.ie
   - Password: KqZ@12g83
   - Should land on `/office/skips`
   - Should see both portals (can access both)

## Files Changed
- `supabase/migrations/009_add_user_roles.sql` - Database migration
- `src/app/login/page.tsx` - Login page
- `src/app/page.tsx` - Protected home page with role check

## Commit
- `92bc48a` - feat: add authentication with role-based access (driver/office)
