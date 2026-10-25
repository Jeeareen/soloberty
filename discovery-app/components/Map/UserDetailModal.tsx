'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Lightbulb, RefreshCw, LogIn } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import type { UserProfile } from '../../types/user';
import type { MatchCard } from '../../types/matching';
import { RenderCardFace } from '../MatchStack';
import { useAuth } from '../../lib/hooks/useAuth';

interface UserDetailModalProps {
  user: UserProfile | null;
  onClose: () => void;
}

export const UserDetailModal: React.FC<UserDetailModalProps> = ({ user: profile, onClose }) => {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const lastTapTimeRef = useRef<number>(0);

  // Auth modal state for unauthenticated users
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalFeature, setAuthModalFeature] = useState<'chat' | 'whyYouTwo'>('whyYouTwo');

  // Why You Two modal state
  const [whyYouTwoModalOpen, setWhyYouTwoModalOpen] = useState(false);
  const [whyYouTwoLoading, setWhyYouTwoLoading] = useState(false);
  const [whyYouTwoResult, setWhyYouTwoResult] = useState<any>(null);
  const [whyYouTwoError, setWhyYouTwoError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Reset flip state whenever target user changes
  useEffect(() => {
    setIsFlipped(false);
  }, [profile?.uid]);

  // Handle ESC key to unflip or close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (whyYouTwoModalOpen) {
          setWhyYouTwoModalOpen(false);
        } else if (authModalOpen) {
          setAuthModalOpen(false);
        } else if (isFlipped) {
          setIsFlipped(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [whyYouTwoModalOpen, authModalOpen, isFlipped, onClose]);

  if (!profile) return null;

  // Adapt UserProfile to MatchCard
  const card: MatchCard = {
    id: profile.uid,
    uid: profile.uid,
    name: profile.name || 'Anonymous',
    age: typeof profile.age === 'number' ? profile.age : 25,
    gender: profile.gender || 'other',
    bio: profile.bio || '',
    interests: profile.interests || [],
    location: {
      city: profile.location?.city || 'Vienna, AT',
      coordinates: profile.location?.coordinates,
    },
    avatarUrl: profile.avatarUrl || profile.profilePhoto?.url || '',
    interestImages: (profile.interestImages || []).map((img) => ({
      slot: img.slot || 1,
      url: img.url,
    })),
  };

  const handleRequireAuth = (feature: 'chat' | 'whyYouTwo') => {
    setAuthModalFeature(feature);
    setAuthModalOpen(true);
  };

  const handleWhyYouTwo = async (matchedCard: MatchCard) => {
    setWhyYouTwoModalOpen(true);
    setWhyYouTwoLoading(true);
    setWhyYouTwoResult(null);
    setWhyYouTwoError(null);

    try {
      const res = await fetch('/api/why-you-two', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentUserId: currentUser?.uid,
          matchedUserId: matchedCard.uid,
          matchedUser: {
            bio: matchedCard.bio,
            interests: matchedCard.interests,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setWhyYouTwoError(data?.message || 'Error generating Why You Two analysis');
      } else {
        setWhyYouTwoResult(data);
      }
    } catch (err: any) {
      setWhyYouTwoError(err instanceof Error ? err.message : String(err));
    } finally {
      setWhyYouTwoLoading(false);
    }
  };

  const modalContent = (
    <AnimatePresence>
      <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-md cursor-pointer"
        />

        {/* Modal Card Wrapper */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative z-10 flex flex-col items-center max-w-full"
        >
          {/* Header Controls: Card Label & Close Button */}
          <div className="w-[320px] sm:w-[360px] md:w-[400px] flex items-center justify-between pb-2 px-1 text-white">
            <span className="text-xs font-bold uppercase tracking-wider text-white/80 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#00AAFF] animate-pulse" />
              Member Profile
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close detailed profile card"
              className="p-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white/90 hover:text-white backdrop-blur-md border border-white/10 transition-all cursor-pointer shadow-lg active:scale-95"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 3D Flippable MatchCard */}
          <div className="[perspective:1000px]">
            <motion.div
              tabIndex={0}
              role="button"
              aria-label={`${card.name}. Tap card to flip for details`}
              onClick={() => {
                if (Date.now() - lastTapTimeRef.current < 400) return;
                setIsFlipped((prev) => !prev);
              }}
              onPointerDownCapture={(e) => {
                pointerStartRef.current = { x: e.clientX, y: e.clientY };
              }}
              onTouchStart={(e) => {
                const touch = e.touches[0];
                if (touch) {
                  pointerStartRef.current = { x: touch.clientX, y: touch.clientY };
                }
              }}
              onTouchEnd={(e) => {
                const target = e.target as HTMLElement;
                if (target?.closest('button, a')) return;
                const touch = e.changedTouches[0];
                if (touch && pointerStartRef.current) {
                  const dx = Math.abs(touch.clientX - pointerStartRef.current.x);
                  const dy = Math.abs(touch.clientY - pointerStartRef.current.y);
                  if (dx < 10 && dy < 10) {
                    lastTapTimeRef.current = Date.now();
                    setIsFlipped((prev) => !prev);
                  }
                }
                pointerStartRef.current = null;
              }}
              animate={{ rotateY: isFlipped ? 180 : 0 }}
              transition={{ rotateY: { duration: 0.5, ease: 'easeInOut' } }}
              className="relative flex h-[480px] w-[320px] sm:h-[540px] sm:w-[360px] md:h-[600px] md:w-[400px] flex-col rounded-[14px] bg-white dark:bg-[#0F172A] border-2 border-slate-300 dark:border-slate-700 shadow-2xl focus:outline-none [transform-style:preserve-3d] cursor-pointer"
            >
              <RenderCardFace
                card={card}
                activeBackFocus={null}
                onWhyYouTwo={handleWhyYouTwo}
                onRequireAuth={!currentUser ? handleRequireAuth : undefined}
              />
            </motion.div>
          </div>
        </motion.div>

        {/* Auth Required Modal */}
        {authModalOpen && (
          <div
            className="fixed inset-0 z-[2100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
            onClick={() => setAuthModalOpen(false)}
          >
            <div
              className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4 text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-12 rounded-full bg-[#00AAFF]/10 text-[#00AAFF] flex items-center justify-center mx-auto">
                <LogIn className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-heading font-extrabold text-slate-900 dark:text-white">
                  Sign in required
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {authModalFeature === 'chat'
                    ? 'You need an account to start chatting with members.'
                    : 'Sign in to use Why You Two and analyze profile compatibility.'}
                </p>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAuthModalOpen(false)}
                  className="flex-1 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => router.push('/login')}
                  className="flex-1 py-2 text-xs font-extrabold text-white bg-[#00AAFF] hover:bg-[#0088CC] rounded-xl transition-all shadow-md shadow-[#00AAFF]/20 cursor-pointer"
                >
                  Sign in
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Why You Two Analysis Modal */}
        {whyYouTwoModalOpen && (
          <div
            className="fixed inset-0 z-[2100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
            onClick={() => setWhyYouTwoModalOpen(false)}
          >
            <div
              className="w-full max-w-md max-h-[85vh] flex flex-col rounded-3xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 p-6 shadow-2xl overflow-y-auto space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
                    <Lightbulb className="w-5 h-5" />
                  </span>
                  <div>
                    <h3 className="text-base font-heading font-extrabold text-slate-900 dark:text-white">
                      Why You Two?
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Comparing you & {card.name}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setWhyYouTwoModalOpen(false)}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Loading State */}
              {whyYouTwoLoading && (
                <div className="py-12 flex flex-col items-center justify-center space-y-3">
                  <RefreshCw className="w-7 h-7 text-purple-600 dark:text-purple-400 animate-spin" />
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    Analyzing shared interests & possibilities...
                  </p>
                </div>
              )}

              {/* Error State */}
              {!whyYouTwoLoading && whyYouTwoError && (
                <div className="p-3.5 bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/40 rounded-2xl flex items-center justify-between text-xs text-amber-900 dark:text-amber-200 shadow-sm">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>{whyYouTwoError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleWhyYouTwo(card)}
                    className="flex items-center gap-1 px-2.5 py-1 bg-amber-100 dark:bg-amber-900/50 hover:bg-amber-200 dark:hover:bg-amber-800/60 text-amber-900 dark:text-amber-100 rounded-lg font-bold transition-colors cursor-pointer shrink-0 ml-2"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Retry
                  </button>
                </div>
              )}

              {/* Structured Result Sections */}
              {!whyYouTwoLoading && !whyYouTwoError && whyYouTwoResult && (
                <div className="space-y-4">
                  {whyYouTwoResult.thinData && (
                    <div className="px-3 py-2 bg-slate-100 dark:bg-slate-800/60 rounded-xl text-xs text-slate-500 dark:text-slate-400 italic">
                      Profile information is limited, but here are the best insights available from the profile data:
                    </div>
                  )}

                  {/* Section 1: Shared Interests */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      1. Shared Interests
                    </h4>
                    {whyYouTwoResult.sharedInterests && whyYouTwoResult.sharedInterests.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {whyYouTwoResult.sharedInterests.map((interest: string, idx: number) => (
                          <span
                            key={idx}
                            className="px-3 py-1 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/40 rounded-full text-xs font-bold"
                          >
                            {interest}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                        No direct interest overlap found between profiles.
                      </p>
                    )}
                  </div>

                  {/* Section 2: Complementary Interests */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      2. Complementary Interests
                    </h4>
                    {whyYouTwoResult.complementaryInterests && whyYouTwoResult.complementaryInterests.length > 0 ? (
                      <div className="space-y-2">
                        {whyYouTwoResult.complementaryInterests.map((item: any, idx: number) => (
                          <div
                            key={idx}
                            className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1"
                          >
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                              <span>{item.mine}</span>
                              <span className="text-purple-500 font-extrabold">↔</span>
                              <span>{item.theirs}</span>
                            </div>
                            {item.why && (
                              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                {item.why}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                        No complementary pairings found.
                      </p>
                    )}
                  </div>

                  {/* Section 3: Connection Idea */}
                  <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      3. Connection Idea
                    </h4>
                    <div className="p-3.5 bg-purple-500/10 border border-purple-500/20 rounded-xl text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 leading-relaxed">
                      {whyYouTwoResult.connectionIdea || 'No connection idea available.'}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AnimatePresence>
  );

  if (!mounted || typeof document === 'undefined') return null;
  return createPortal(modalContent, document.body);
};
