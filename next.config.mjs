/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_YARD_LAT: process.env.NEXT_PUBLIC_YARD_LAT,
    NEXT_PUBLIC_YARD_LNG: process.env.NEXT_PUBLIC_YARD_LNG,
  },
};

export default nextConfig;
