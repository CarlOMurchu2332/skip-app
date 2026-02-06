# Skip App - Irish Metals Dispatch System

A dispatch → driver completion → PDF + email workflow for skip hire operations.

## Features

- **Office Dashboard**: Create and manage skip jobs
- **Driver Mobile View**: Simple tap-to-complete interface
- **SMS Notifications**: Twilio integration for driver alerts
- **PDF Dockets**: Auto-generated professional dockets
- **Email Delivery**: Completed dockets sent via Resend
- **GPS Capture**: Optional location tracking on completion

## Quick Start

### 1. Set up Supabase

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run the contents of `supabase/schema.sql`
3. Copy your project URL and keys from Settings > API

### 2. Configure Environment

Update `.env.local` with your credentials:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Resend (Email)
RESEND_API_KEY=re_your_api_key
EMAIL_FROM=noreply@yourdomain.com
EMAIL_TO=carlmurphy2332@gmail.com

# Twilio (SMS)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+353xxxxxxxxx

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Add Your Logo

Place your logo file at `public/logo.png` for it to appear on PDF dockets.

### 4. Add Sample Data

Run this in Supabase SQL Editor to add test customers and drivers:

```sql
INSERT INTO customers (name, address, contact_phone) VALUES
  ('ABC Construction', '123 Main St, Dublin', '+353 1 234 5678'),
  ('XYZ Builders', '456 High St, Meath', '+353 1 987 6543'),
  ('Murphy & Sons', '789 Industrial Estate, Drogheda', '+353 41 123 4567');

INSERT INTO drivers (name, phone) VALUES
  ('John Murphy', '+353 87 123 4567'),
  ('Mike O''Brien', '+353 86 987 6543');
```

### 5. Run the App

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Pages

| Route | Description |
|-------|-------------|
| `/` | Home page with links |
| `/office/skips` | Jobs list dashboard |
| `/office/skips/new` | Create new job |
| `/office/skips/[id]` | Job detail view |
| `/driver/skip/[token]` | Driver completion page |

## API Routes

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/skip-jobs/create` | POST | Create new job |
| `/api/skip-jobs/send` | POST | Send SMS to driver |
| `/api/skip-jobs/complete` | POST | Complete job + send PDF |

## Docket Number Format

Dockets follow the pattern: `YYMMDD-####-IMR`

Example: `260203-0007-IMR`

## Tech Stack

- **Frontend**: Next.js 14 (App Router), Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Email**: Resend
- **SMS**: Twilio
- **PDF**: pdf-lib

## Production Deployment

1. Deploy to Vercel or similar
2. Update `NEXT_PUBLIC_APP_URL` to your production URL
3. Configure Resend domain verification
4. Set up Twilio phone number for Ireland

## Support

For issues, contact the development team.

---

**Irish Metals Recycling**  
Unit 2, Duleek Business Park, Co. Meath, A92 TK20
