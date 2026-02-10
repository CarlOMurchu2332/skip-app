'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function HomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<'driver' | 'office' | null>(null);

  useEffect(() => {
    async function checkAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          router.push('/login');
          return;
        }

        // Get user role
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .single();

        if (roleData) {
          setUserRole(roleData.role as 'driver' | 'office');
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    }

    checkAuth();
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="max-w-2xl w-full">
        {/* Logo */}
        <div className="flex justify-center mb-12">
          <Image
            src="/imr-logo.png"
            alt="Irish Metals Logo"
            width={300}
            height={120}
            priority
            className="drop-shadow-2xl"
          />
        </div>

        {/* Title */}
        <h1 className="text-4xl md:text-5xl font-bold text-white text-center mb-4">
          Skip Management System
        </h1>
        <p className="text-xl text-gray-300 text-center mb-12">
          Choose your portal
        </p>

        {/* Portal Selection Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Driver Portal */}
          <Link
            href="/driver/jobs"
            className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 p-8 shadow-2xl hover:shadow-blue-500/50 transition-all duration-300 hover:scale-105 ${
              userRole === 'driver' ? 'ring-4 ring-blue-400' : userRole === 'office' ? '' : 'opacity-50 pointer-events-none'
            }`}
          >
            <div className="relative z-10">
              <div className="text-5xl mb-4">🚛</div>
              <h2 className="text-2xl font-bold text-white mb-2">Driver Portal</h2>
              <p className="text-blue-100">
                View and complete your skip jobs
              </p>
              {userRole === 'driver' && (
                <span className="inline-block mt-3 px-3 py-1 bg-blue-400 text-blue-900 text-xs font-bold rounded-full">
                  Your Portal
                </span>
              )}
            </div>
            <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-all duration-300" />
          </Link>

          {/* Office Portal */}
          <Link
            href="/office/skips"
            className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-600 to-green-800 p-8 shadow-2xl hover:shadow-green-500/50 transition-all duration-300 hover:scale-105 ${
              userRole === 'office' ? 'ring-4 ring-green-400' : 'opacity-50 pointer-events-none'
            }`}
          >
            <div className="relative z-10">
              <div className="text-5xl mb-4">🏢</div>
              <h2 className="text-2xl font-bold text-white mb-2">Office Portal</h2>
              <p className="text-green-100">
                Manage jobs, customers, and operations
              </p>
              {userRole === 'office' && (
                <span className="inline-block mt-3 px-3 py-1 bg-green-400 text-green-900 text-xs font-bold rounded-full">
                  Your Portal
                </span>
              )}
            </div>
            <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-all duration-300" />
          </Link>
        </div>

        {/* Logout Button */}
        <div className="mt-8 flex justify-center">
          <button
            onClick={handleLogout}
            className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            Logout
          </button>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-400 mt-12 text-sm">
          Irish Metals Recycling © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
