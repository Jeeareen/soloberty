'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../lib/hooks/useAuth';
import SolobertyLogo from './SolobertyLogo';
import {
  Settings as SettingsIcon,
  LogOut,
  LogIn,
  User as UserIcon,
  Bell,
  Mail,
  Check,
} from 'lucide-react';

const MotionLink = motion.create(Link);

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Hide top navigation bar on standalone login page if needed
  if (pathname?.startsWith('/login')) {
    return null;
  }

  // Base navigation links
  const baseItems = [
    { name: 'Feed', href: '/feed' },
    { name: 'Discover', href: '/discover' },
    { name: 'Map', href: '/map' },
    { name: 'Chat', href: '/chat' },
  ];

  // Conditional tabs based on authentication status:
  // When NOT logged in: Show Login, hide Profile
  // When logged in: Show Profile, hide Login
  const authItem = user
    ? { name: 'Profile', href: '/profile' }
    : { name: 'Login', href: '/auth/login' };

  const navItems = [...baseItems, authItem];

  const handleLogout = async () => {
    try {
      setMenuOpen(false);
      await logout();
      router.push('/auth/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-screen max-w-none bg-blue-600 shadow-md h-14 sm:h-16">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-3 sm:px-6 h-full min-w-0 w-full relative">
        {/* Brand Logo & Title */}
        <div className="flex items-center shrink-0 mr-2 sm:mr-6">
          <Link
            href="/feed"
            className="flex items-center gap-2 text-lg sm:text-xl font-extrabold text-white tracking-tight hover:opacity-90"
          >
            <SolobertyLogo className="w-7 h-7" color="white" />
            Soloberty
          </Link>
        </div>

        {/* Desktop Navigation Links */}
        <div className="flex items-center gap-2 h-full">
          <nav className="relative flex items-stretch px-2 sm:px-4 max-w-full min-w-0 h-full">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== '/feed' && pathname?.startsWith(item.href)) ||
                (item.href === '/auth/login' && pathname?.startsWith('/auth'));
              return (
                <MotionLink
                  key={item.href}
                  href={item.href}
                  scroll={false}
                  initial="rest"
                  whileHover="hover"
                  animate="rest"
                  className={`relative flex items-center justify-center px-3 sm:px-5 h-full text-xs sm:text-sm font-bold transition-colors whitespace-nowrap shrink-0 ${
                    isActive ? 'text-blue-600' : 'text-white/90 hover:text-white'
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

          {/* Settings Gear Button with 60-deg Counterclockwise Rotation */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setMenuOpen((prev) => !prev)}
              aria-label="Settings"
              className="p-2 text-white hover:bg-white/15 rounded-xl transition-colors active:scale-95 flex items-center justify-center"
            >
              <motion.div
                animate={{ rotate: menuOpen ? -60 : 0 }}
                transition={{
                  type: 'spring',
                  stiffness: 300,
                  damping: 20,
                }}
                className="flex items-center justify-center"
              >
                <SettingsIcon className="w-5 h-5" />
              </motion.div>
            </button>

            {/* Direct Settings Dropdown Menu */}
            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.85, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.85, y: -10 }}
                  transition={{
                    type: 'spring',
                    stiffness: 450,
                    damping: 28,
                  }}
                  style={{ transformOrigin: 'top right' }}
                  className="absolute top-full right-0 mt-2 w-64 bg-white border border-slate-200 rounded-3xl shadow-2xl p-3 z-50 text-slate-900 overflow-hidden space-y-2"
                >
                  {/* Settings Title */}
                  <div className="px-2 pt-1 pb-1 flex items-center justify-between">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                      Settings
                    </span>
                  </div>

                  {/* Mail Info Tile */}
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-sm">
                      {user?.email?.[0]?.toUpperCase() || <Mail className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Mail Info
                      </div>
                      <div className="text-xs font-bold text-slate-900 truncate">
                        {user?.email || 'Guest Explorer'}
                      </div>
                    </div>
                  </div>

                  {/* Notifications Toggle Tile */}
                  <button
                    onClick={() => setNotificationsEnabled((prev) => !prev)}
                    className="w-full p-3 bg-slate-50 hover:bg-slate-100/80 border border-slate-100 rounded-2xl flex items-center justify-between transition-colors text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-xl">
                        <Bell className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">Notifications</div>
                        <div className="text-[10px] text-slate-500">
                          {notificationsEnabled ? 'Enabled' : 'Disabled'}
                        </div>
                      </div>
                    </div>
                    <div
                      className={`w-9 h-5 rounded-full p-0.5 transition-colors relative ${
                        notificationsEnabled ? 'bg-blue-600' : 'bg-slate-300'
                      }`}
                    >
                      <motion.div
                        className="w-4 h-4 bg-white rounded-full shadow-sm"
                        animate={{ x: notificationsEnabled ? 16 : 0 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      />
                    </div>
                  </button>

                  <div className="my-1 border-t border-slate-100" />

                  {/* Logout or Login button */}
                  {user ? (
                    <button
                      onClick={handleLogout}
                      className="w-full py-2.5 px-3 bg-rose-600 hover:bg-rose-500 active:scale-[0.98] text-white font-bold text-xs rounded-2xl shadow-md shadow-rose-600/20 transition-all flex items-center justify-center gap-2"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Log Out</span>
                    </button>
                  ) : (
                    <Link
                      href="/auth/login"
                      onClick={() => setMenuOpen(false)}
                      className="w-full py-2.5 px-3 bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white font-bold text-xs rounded-2xl shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
                    >
                      <LogIn className="w-4 h-4" />
                      <span>Log In / Sign Up</span>
                    </Link>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
