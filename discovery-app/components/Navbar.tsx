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
  Activity,
  Lock,
  Moon,
  Sun,
  Sparkles,
  Compass,
  MapPin,
  MessageSquare,
} from 'lucide-react';

const MotionLink = motion.create(Link);

// MatchStack 3-Card Stack Icon for Feed tab (center card larger in middle, side cards masked behind)
const CardsStackIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <defs>
      <mask id="matchstack-center-mask">
        {/* White area shows side cards */}
        <rect x="0" y="0" width="24" height="24" fill="white" />
        {/* Black cutout erases side cards behind center card */}
        <rect x="6" y="2.5" width="12" height="19" rx="3" fill="black" stroke="black" strokeWidth="1.5" />
      </mask>
    </defs>

    {/* Left & Right background cards (masked to cut out center overlap) */}
    <g mask="url(#matchstack-center-mask)" opacity="0.55">
      <rect x="2.5" y="6" width="7.5" height="13" rx="1.8" />
      <rect x="14" y="6" width="7.5" height="13" rx="1.8" />
    </g>

    {/* Center card (prominent & clean in middle) */}
    <rect x="6.5" y="3" width="11" height="18" rx="2.5" strokeWidth="2.2" fill="currentColor" fillOpacity="0.15" />
  </svg>
);

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Initialize Dark Mode state from localStorage & documentElement
  useEffect(() => {
    const isDark =
      document.documentElement.classList.contains('dark') ||
      localStorage.getItem('soloberty_theme') === 'dark';
    setDarkMode(isDark);
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    const nextMode = !darkMode;
    setDarkMode(nextMode);
    if (nextMode) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
      localStorage.setItem('soloberty_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
      localStorage.setItem('soloberty_theme', 'light');
    }
  };

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

  // Base navigation links with icons for mobile
  const baseItems = [
    { name: 'Feed', href: '/feed', icon: CardsStackIcon },
    { name: 'Discover', href: '/discover', icon: Compass },
    { name: 'Map', href: '/map', icon: MapPin },
    { name: 'Chat', href: '/chat', icon: MessageSquare },
  ];

  // Conditional tabs based on authentication status:
  // When NOT logged in: Show Login, hide Profile
  // When logged in or on authenticated pages: Show Profile, hide Login
  const showProfileTab = Boolean(user) || pathname === '/auth/changePassword';

  const authItem = showProfileTab
    ? { name: 'Profile', href: '/profile', icon: UserIcon }
    : { name: 'Login', href: '/auth/login', icon: LogIn };

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
    <>
      {/* Top Header Navbar */}
      <header className="sticky top-0 z-50 w-screen max-w-none bg-[#00AAFF] dark:bg-[#B8E7FF] shadow-md h-14 transition-colors duration-200">
        <div className="w-full flex items-center justify-between px-4 sm:px-8 h-full min-w-0 relative">
          {/* Brand Logo & Title (Left-aligned) */}
          <div className="flex items-center shrink-0">
            <Link
              href="/feed"
              className="flex items-center gap-2 text-lg sm:text-xl font-heading font-extrabold text-white dark:text-slate-900 tracking-tight hover:opacity-90 transition-colors"
            >
              <SolobertyLogo className="w-7 h-7 fill-white dark:fill-slate-900" />
              Soloberty
            </Link>
          </div>

          {/* Desktop Navigation Links & Settings (Right-aligned via Flexbox ml-auto) */}
          <div className="flex items-center gap-2 sm:gap-4 h-full ml-auto">
            {/* Desktop Navigation Links (Hidden on Mobile) */}
            <nav className="hidden md:flex relative items-stretch px-2 sm:px-4 max-w-full min-w-0 h-full">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  pathname === item.href ||
                  (item.href === '/auth/login' && (pathname?.startsWith('/auth/login') || pathname?.startsWith('/auth/signup'))) ||
                  (item.href !== '/feed' && item.href !== '/auth/login' && pathname?.startsWith(item.href) && pathname !== '/auth/changePassword');
                const isAuthTab = item.name === 'Profile' || item.name === 'Login';
                return (
                  <MotionLink
                    key={item.href}
                    href={item.href}
                    scroll={false}
                    initial="rest"
                    whileHover="hover"
                    animate="rest"
                    className={`relative flex items-center justify-center gap-2 px-3 sm:px-5 h-full text-xs sm:text-sm font-bold transition-colors whitespace-nowrap shrink-0 ${
                      isAuthTab ? 'w-24 sm:w-28 text-center' : ''
                    } ${
                      isActive
                        ? 'text-[#00AAFF] dark:text-[#0088CC]'
                        : 'text-white/90 dark:text-slate-800/90 hover:text-white dark:hover:text-slate-950'
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
                      className="relative z-10 flex items-center gap-1.5 origin-center"
                      variants={{
                        rest: { scale: 1 },
                        hover: { scale: 1.08 },
                      }}
                      transition={{ type: 'tween', ease: 'easeOut', duration: 0.15 }}
                    >
                      {Icon && <Icon className="w-4 h-4 shrink-0" />}
                      <span>{item.name}</span>
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
                className="p-2 text-white dark:text-slate-900 hover:bg-white/15 dark:hover:bg-slate-900/15 rounded-xl transition-colors active:scale-95 flex items-center justify-center cursor-pointer"
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
                    className="absolute top-full right-0 mt-2 w-64 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-3 z-50 text-slate-900 dark:text-white overflow-hidden space-y-2"
                  >
                    {/* Settings Title */}
                    <div className="px-2 pt-1 pb-1 flex items-center justify-between">
                      <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-400">
                        Settings
                      </span>
                    </div>

                    {/* Mail Info Tile */}
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/80 rounded-2xl flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-[#00AAFF] dark:bg-[#B8E7FF] text-white dark:text-slate-900 flex items-center justify-center text-xs font-bold shrink-0 shadow-sm">
                        {user?.email?.[0]?.toUpperCase() || <Mail className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">
                          Mail Info
                        </div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {user?.email || 'Guest Explorer'}
                        </div>
                      </div>
                    </div>

                    {/* Notifications Toggle Tile */}
                    <button
                      onClick={() => setNotificationsEnabled((prev) => !prev)}
                      className="w-full p-3 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100/80 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-700/80 rounded-2xl flex items-center justify-between transition-colors text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 rounded-xl">
                          <Bell className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900 dark:text-white">Notifications</div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400">
                            {notificationsEnabled ? 'Enabled' : 'Disabled'}
                          </div>
                        </div>
                      </div>
                      <div
                        className={`w-9 h-5 rounded-full p-0.5 transition-colors relative ${
                          notificationsEnabled ? 'bg-[#00AAFF] dark:bg-[#B8E7FF]' : 'bg-slate-300 dark:bg-slate-700'
                        }`}
                      >
                        <motion.div
                          className="w-4 h-4 bg-white dark:bg-slate-900 rounded-full shadow-sm"
                          animate={{ x: notificationsEnabled ? 16 : 0 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        />
                      </div>
                    </button>

                    {/* Dark Mode Toggle Tile */}
                    <button
                      onClick={toggleDarkMode}
                      className="w-full p-3 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100/80 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-700/80 rounded-2xl flex items-center justify-between transition-colors text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`p-1.5 rounded-xl ${
                            darkMode
                              ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400'
                              : 'bg-amber-100 dark:bg-amber-950/60 text-amber-500 dark:text-amber-400'
                          }`}
                        >
                          {darkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900 dark:text-white">Dark Mode</div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400">
                            {darkMode ? 'Enabled' : 'Disabled'}
                          </div>
                        </div>
                      </div>
                      <div
                        className={`w-9 h-5 rounded-full p-0.5 transition-colors relative ${
                          darkMode ? 'bg-[#00AAFF] dark:bg-[#B8E7FF]' : 'bg-slate-300 dark:bg-slate-700'
                        }`}
                      >
                        <motion.div
                          className="w-4 h-4 bg-white dark:bg-slate-900 rounded-full shadow-sm"
                          animate={{ x: darkMode ? 16 : 0 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        />
                      </div>
                    </button>

                    {/* Health Status Tile */}
                    <Link
                      href="/health"
                      onClick={() => setMenuOpen(false)}
                      className="w-full p-3 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100/80 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-700/80 rounded-2xl flex items-center justify-between transition-colors text-left"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-xl">
                          <Activity className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900 dark:text-white">System Health</div>
                          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Status: OK</div>
                        </div>
                      </div>
                      <span className="text-xs text-slate-400 font-bold">→</span>
                    </Link>

                    {/* Change Password Option */}
                    {user && (
                      <Link
                        href="/auth/changePassword"
                        onClick={() => setMenuOpen(false)}
                        className="w-full p-3 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100/80 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-700/80 rounded-2xl flex items-center justify-between transition-colors text-left"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="p-1.5 bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 rounded-xl">
                            <Lock className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900 dark:text-white">Change Password</div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400">Security & Credentials</div>
                          </div>
                        </div>
                        <span className="text-xs text-slate-400 font-bold">→</span>
                      </Link>
                    )}

                    {/* Logout or Login button */}
                    {user ? (
                      <button
                        onClick={handleLogout}
                        className="w-full py-2.5 px-3 bg-rose-600 hover:bg-rose-500 active:scale-[0.98] text-white font-bold text-xs rounded-2xl shadow-md shadow-rose-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Log Out</span>
                      </button>
                    ) : (
                      <Link
                        href="/auth/login"
                        onClick={() => setMenuOpen(false)}
                        className="w-full py-2.5 px-3 bg-[#00AAFF] dark:bg-[#B8E7FF] hover:bg-[#0088CC] dark:hover:bg-[#99D8FF] active:scale-[0.98] text-white dark:text-slate-900 font-bold text-xs rounded-2xl shadow-md shadow-[#00AAFF]/20 transition-all flex items-center justify-center gap-2"
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

      {/* Mobile Bottom Navigation Bar (Visible only on screens < md) */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 w-screen max-w-none z-50 bg-[#00AAFF]/95 dark:bg-[#0F172A]/95 backdrop-blur-lg border-t border-white/20 dark:border-slate-800/80 shadow-[0_-4px_20px_rgba(0,0,0,0.15)] px-3 py-1.5 flex items-center justify-around pb-[max(0.5rem,env(safe-area-inset-bottom))]"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href === '/auth/login' && (pathname?.startsWith('/auth/login') || pathname?.startsWith('/auth/signup'))) ||
            (item.href !== '/feed' && item.href !== '/auth/login' && pathname?.startsWith(item.href) && pathname !== '/auth/changePassword');

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-col items-center justify-center py-1 px-3.5 rounded-2xl text-[11px] font-extrabold transition-all active:scale-95 ${
                isActive
                  ? 'text-white dark:text-[#00AAFF]'
                  : 'text-white/70 dark:text-slate-400 hover:text-white dark:hover:text-slate-200'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeMobileTab"
                  className="absolute inset-0 bg-white/25 dark:bg-[#00AAFF]/20 rounded-2xl -z-0"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
              <Icon className="w-5 h-5 relative z-10 mb-0.5" />
              <span className="relative z-10 leading-none">{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
};

export default Navbar;
