'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function BottomNav() {
  const pathname = usePathname();
  
  const navItems = [
    { href: '/driver/jobs?tab=new', label: 'Jobs', icon: '📋', active: pathname.startsWith('/driver/jobs') && !pathname.includes('completed') },
    { href: '/driver/jobs?tab=completed', label: 'Completed', icon: '✅', active: pathname.includes('completed') || (pathname.startsWith('/driver/jobs') && pathname.includes('tab=completed')) },
    { href: '/', label: 'Home', icon: '🏠', active: pathname === '/' },
  ];
  
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-[#1a1a1a] via-[#1a1a1a]/98 to-[#1a1a1a]/90 backdrop-blur-xl border-t border-gray-800/50 shadow-2xl">
      <div className="flex justify-around items-center h-16 px-2 max-w-lg mx-auto">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center flex-1 h-full rounded-xl transition-all ${
              item.active
                ? 'text-green-400'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <span className={`text-2xl mb-1 transition-transform ${item.active ? 'scale-110' : ''}`}>
              {item.icon}
            </span>
            <span className={`text-xs font-medium ${item.active ? 'font-bold' : ''}`}>
              {item.label}
            </span>
            {item.active && (
              <div className="absolute bottom-0 w-12 h-1 bg-green-400 rounded-t-full" />
            )}
          </Link>
        ))}
      </div>
    </nav>
  );
}
