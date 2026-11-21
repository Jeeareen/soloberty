'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Hand, RotateCw, MapPin, MessageSquare, X } from 'lucide-react';
import { MatchStack } from '../../components/MatchStack';
import { useAuth } from '../../lib/hooks/useAuth';
import type { MatchCard } from '../../types/matching';

const FEED_INTRO_KEY = 'soloberty_feed_intro_seen';

export function FeedClient({ initialCards }: { initialCards: MatchCard[] }) {
  const { user, loading: authLoading } = useAuth();
  const [showIntro, setShowIntro] = useState(false);

  // Prevent any document/window bounce or wheel scroll on the feed page across all devices
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    const originalOverscroll = document.body.style.overscrollBehavior;
    document.body.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'none';

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.overscrollBehavior = originalOverscroll;
    };
  }, []);

  // Show a one-time quick guide on first visit to Match Feed (only when NOT logged in)
  useEffect(() => {
    if (authLoading) return;
    if (user) {
      setShowIntro(false);
      return;
    }
    try {
      if (localStorage.getItem(FEED_INTRO_KEY) !== '1') {
        setShowIntro(true);
      }
    } catch {
      // ignore storage errors
    }
  }, [user, authLoading]);

  const dismissIntro = () => {
    setShowIntro(false);
    try {
      localStorage.setItem(FEED_INTRO_KEY, '1');
    } catch {
      // ignore storage errors
    }
  };

  return (
    <div className="relative h-[calc(100dvh-56px-60px)] md:h-[calc(100dvh-56px)] w-full bg-[#F8FAFC] dark:bg-[#090D16] text-[#0F172A] dark:text-white transition-colors duration-200 flex flex-col items-center justify-center overflow-hidden overscroll-none select-none touch-none">
      <h1 className="sr-only">Soloberty Match Feed</h1>
      <MatchStack cards={initialCards.length > 0 ? initialCards : undefined} />

      {/* One-Time Quick Intro Guide (only when not logged in) */}
      <AnimatePresence>
        {showIntro && !user && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[2100] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4"
            onClick={dismissIntro}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 12 }}
              transition={{ type: 'spring', stiffness: 450, damping: 28 }}
              className="relative w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 text-slate-900 dark:text-slate-100 shadow-2xl space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h2 className="text-base font-extrabold font-heading">
                  How Match Feed Works
                </h2>
                <button
                  type="button"
                  onClick={dismissIntro}
                  aria-label="Close guide"
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <ul className="space-y-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                <li className="flex items-start gap-2.5">
                  <Hand className="w-4 h-4 text-[#007ABB] dark:text-[#B8E7FF] shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-slate-900 dark:text-white">Swipe left or right</strong> to browse people with shared interests.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <RotateCw className="w-4 h-4 text-[#007ABB] dark:text-[#B8E7FF] shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-slate-900 dark:text-white">Tap any card</strong>{' '}
                    to flip it and explore their bio &amp; interest photos.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-[#CC5500] dark:text-[#FF8533] shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-slate-900 dark:text-white">Tap Why You Two?</strong>{' '}
                    for instant AI compatibility insights.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <MessageSquare className="w-4 h-4 text-[#007ABB] dark:text-[#B8E7FF] shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-slate-900 dark:text-white">Tap Chat with them</strong>{' '}
                    to start a conversation with smart AI icebreakers.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-[#007ABB] dark:text-[#B8E7FF] shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-slate-900 dark:text-white">Tap the location tag</strong>{' '}
                    to jump straight to that user&apos;s spot on the map.
                  </span>
                </li>
              </ul>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={dismissIntro}
                  className="w-full py-2.5 px-4 bg-[#007ABB] hover:bg-[#0088CC] text-white dark:bg-[#B8E7FF] dark:hover:bg-[#99D8FF] dark:text-slate-900 text-xs sm:text-sm font-extrabold rounded-xl shadow-md shadow-[#007ABB]/20 transition-all active:scale-95 cursor-pointer"
                >
                  Got it, let&apos;s explore
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
