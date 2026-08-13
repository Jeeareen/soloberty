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
    <header className="sticky top-0 z-50 w-full max-w-full bg-blue-600 shadow-md overflow-hidden min-w-0">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-3 sm:px-6 py-2.5 min-w-0 w-full">
        <Link href="/feed" className="text-lg sm:text-xl font-extrabold text-white tracking-tight hover:opacity-90 shrink-0 mr-2 sm:mr-4">
          Soloberty
        </Link>
        <nav className="flex items-center space-x-1 sm:space-x-2 overflow-x-auto no-scrollbar py-0.5 max-w-full min-w-0">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/feed' && pathname?.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-2.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold transition-all duration-150 whitespace-nowrap shrink-0 ${
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
