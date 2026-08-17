'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'motion/react';

const MotionLink = motion.create(Link);

export const AuthSwitch: React.FC = () => {
  const pathname = usePathname();

  const isLogin = pathname === '/auth/login';
  const isSignup = pathname === '/auth/signup';

  const items = [
    { label: 'Log In', href: '/auth/login', active: isLogin },
    { label: 'Sign Up', href: '/auth/signup', active: isSignup },
  ];

  return (
    <div className="w-full max-w-sm mx-auto mt-4 bg-white border border-slate-200 shadow-md p-1.5 rounded-2xl flex items-center gap-1.5 relative select-none">
      {items.map((item) => {
        return (
          <MotionLink
            key={item.href}
            href={item.href}
            scroll={false}
            initial="rest"
            whileHover="hover"
            animate="rest"
            className={`relative flex-1 py-2.5 text-center text-xs sm:text-sm font-extrabold rounded-xl transition-colors shrink-0 flex items-center justify-center ${item.active ? 'text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            {item.active && (
              <motion.div
                layoutId="authSwitchActivePill"
                className="absolute inset-0 bg-[#00AAFF] rounded-xl shadow-md"
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
              {item.label}
            </motion.span>
          </MotionLink>
        );
      })}
    </div>
  );
};

export default AuthSwitch;
