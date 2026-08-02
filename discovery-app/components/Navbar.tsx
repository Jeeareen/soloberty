'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export const Navbar: React.FC = () => {
  const pathname = usePathname();

  // Hide top navigation bar on login page
  if (pathname?.startsWith('/login')) {
    return null;
  }

  const navItems = [
    { name: 'Feed', href: '/feed' },
    { name: 'Discover', href: '/discover' },
    { name: 'Map', href: '/map' },
    { name: 'Chat', href: '/chat' },
    { name: 'Profile', href: '/profile' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full bg-blue-600 shadow-md">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-3">
        <Link href="/feed" className="text-xl font-extrabold text-white tracking-tight hover:opacity-90">
          Solibero
        </Link>
        <nav className="flex items-center space-x-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/feed' && pathname?.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-150 ${
                  isActive
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'bg-white/10 text-white hover:bg-white/25 hover:text-white'
                }`}
              >
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
