'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'motion/react';

const MotionLink = motion.create(Link);

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
    <header className="sticky top-0 z-50 w-screen max-w-none bg-blue-600 shadow-md overflow-hidden h-14 sm:h-16">
      <div className="max-w-6xl mx-auto flex items-stretch justify-between px-3 sm:px-6 h-full min-w-0 w-full">
        <div className="flex items-center shrink-0 mr-2 sm:mr-6">
          <Link href="/feed" className="text-lg sm:text-xl font-extrabold text-white tracking-tight hover:opacity-90">
            Soloberty
          </Link>
        </div>

        <nav className="relative flex items-stretch px-3 sm:px-6 max-w-full min-w-0 h-full">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/feed' && pathname?.startsWith(item.href));
            return (
              <MotionLink
                key={item.href}
                href={item.href}
                initial="rest"
                whileHover="hover"
                animate="rest"
                className={`relative flex items-center justify-center px-3.5 sm:px-6 h-full text-xs sm:text-sm font-bold transition-colors whitespace-nowrap shrink-0 ${isActive ? 'text-blue-600' : 'text-white/90 hover:text-white'
                  }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeNavbarTab"
                    className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0)_0%,rgba(255,255,255,0.45)_5%,rgba(255,255,255,0.75)_10%,rgba(255,255,255,0.92)_15%,rgba(255,255,255,1)_20%,rgba(255,255,255,1)_80%,rgba(255,255,255,0.92)_85%,rgba(255,255,255,0.75)_90%,rgba(255,255,255,0.45)_95%,rgba(255,255,255,0)_100%)] shadow-sm"
                    transition={{
                      type: 'spring',
                      stiffness: 500,
                      damping: 30,
                      mass: 0.7,
                    }}
                  />
                )}
                <motion.span
                  className="relative z-10 inline-block origin-center"
                  variants={{
                    rest: { scale: 1 },
                    hover: { scale: 1.1 },
                  }}
                  transition={{ type: 'tween', ease: 'easeOut', duration: 0.15 }}
                >
                  {item.name}
                </motion.span>
              </MotionLink>
            );
          })}
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
