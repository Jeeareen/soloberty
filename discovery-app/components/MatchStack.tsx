'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  motion,
  AnimatePresence,
  useAnimation,
  useMotionValue,
  useTransform,
  useSpring,
  useReducedMotion,
  animate,
  type PanInfo,
} from 'motion/react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { MapPin, MessageSquare, User, Lightbulb, X, RefreshCw } from 'lucide-react';
import type { MatchCard, MatchStackProps } from '../types/matching';
import { PREDEFINED_INTERESTS } from '../types/user';
import { useProfiles } from '../hooks/useProfiles';
import { useAuth } from '../lib/hooks/useAuth';

const UI_TEXT = {
  NO_MORE_CARDS: 'No more profiles to review.',
  ANNOUNCE_CARD: (current: number, total: number) => `Card ${current} of ${total}`,
  FLIP_ARIA: 'Press Enter, Space, or tap card to flip for details',
};

const SWIPE_THRESHOLD = 50;

// Export defaultMockCards as empty array for backward compatibility
export const defaultMockCards: MatchCard[] = [];

// Gender Icon Symbol helper component
const GenderSymbol: React.FC<{ gender?: string; className?: string }> = ({
  gender,
  className = 'w-6 h-6',
}) => {
  const g = (gender || 'male').toLowerCase();
  if (g === 'female') {
    return (
      <svg
        className={`${className} text-pink-500 dark:text-pink-400 shrink-0 inline-block`}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        viewBox="0 0 24 24"
        aria-label="Female"
      >
        <circle cx="12" cy="9" r="6" />
        <path strokeLinecap="round" d="M12 15v7M9 19h6" />
      </svg>
    );
  }
  if (g === 'other') {
    return (
      <svg
        className={`${className} text-purple-500 dark:text-purple-400 shrink-0 inline-block`}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        viewBox="0 0 24 24"
        aria-label="Other"
      >
        <circle cx="12" cy="12" r="6" />
        <path strokeLinecap="round" d="M12 6V2M12 2L9 5M12 2l3 3M12 18v4M9 20h6" />
      </svg>
    );
  }
  return (
    <svg
      className={`${className} text-sky-500 dark:text-sky-400 shrink-0 inline-block`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      viewBox="0 0 24 24"
      aria-label="Male"
    >
      <circle cx="10" cy="14" r="6" />
      <path strokeLinecap="round" d="M14.5 9.5L20 4M20 4h-5M20 4v5" />
    </svg>
  );
};

// Full Card Renderer component for all carousel card slots (Memoized for 60 FPS performance)
const RenderCardFace: React.FC<{ card: MatchCard; isBackground?: boolean; onWhyYouTwo?: (card: MatchCard) => void }> = React.memo(
  ({ card, isBackground = false, onWhyYouTwo }) => {
    const router = useRouter();
    const cardInterests = React.useMemo(
      () =>
        (card.interests || []).map(
          (id) => PREDEFINED_INTERESTS.find((i) => i.id === id) || { id, name: id, icon: '✨' }
        ),
      [card.interests]
    );

    return (
      <div className="relative h-full w-full [transform-style:preserve-3d] transform-gpu">
        {/* Front Face */}
        <div className="absolute inset-0 flex flex-col bg-white dark:bg-[#0F172A] rounded-xl overflow-hidden [backface-visibility:hidden]">
          <div className="relative w-full h-52 sm:h-56 shrink-0 bg-slate-100 dark:bg-slate-800 overflow-hidden">
            {card.avatarUrl ? (
              <img
                src={card.avatarUrl}
                alt={card.name}
                decoding="async"
                loading="lazy"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-[#B8E7FF] dark:bg-slate-800 text-[#00AAFF] dark:text-[#B8E7FF] flex items-center justify-center">
                <User className="w-20 h-20" />
              </div>
            )}
            {/* Profile Picture Name Overlay */}
            <div className="absolute inset-x-0 bottom-0 p-4">
              <h2 className="text-xl sm:text-2xl font-heading font-extrabold tracking-tight truncate text-white">
                {card.name}
              </h2>
            </div>
          </div>

          {/* Content Below PP */}
          <div className="flex-1 flex flex-col p-5 space-y-3.5">
            {/* Location Tag right below PP */}
            <div className="flex items-center gap-1.5 text-sm sm:text-base font-bold text-[#00AAFF] dark:text-[#B8E7FF]">
              <MapPin className="w-4 h-4 shrink-0 text-[#00AAFF]" />
              <span>{card.location?.city || 'Vienna, AT'}</span>
            </div>

            {/* Interests as Bulletpoints */}
            <div className="space-y-1.5 flex-1">
              <span className="text-xs font-heading font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                Interests
              </span>
              <ul className="space-y-2.5 pt-0.5">
                {cardInterests.length > 0 ? (
                  cardInterests.slice(0, 3).map((item, idx) => (
                    <li
                      key={idx}
                      className="flex items-center gap-2.5 text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100"
                    >
                      <span className="text-[#00AAFF] font-black text-base">•</span>
                      <span className="text-lg sm:text-xl shrink-0">{item.icon || '✨'}</span>
                      <span className="truncate">{item.name}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-xs text-slate-400 italic">No interests listed</li>
                )}
              </ul>
            </div>

            {/* Footer Hint */}
            <div className="mt-auto pt-2.5 flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400 italic border-t border-gray-100 dark:border-slate-800">
              <span>Tap card to view bio & details</span>
              <span>🔄</span>
            </div>
          </div>
        </div>

        {/* Back Face */}
        {!isBackground && (
          <div className="absolute inset-0 flex flex-col p-6 bg-white dark:bg-[#0F172A] rounded-xl [transform:rotateY(180deg)] [backface-visibility:hidden]">
            {/* Top: Name, Age, Gender */}
            <div className="flex items-center gap-2 pb-3 border-b border-gray-100 dark:border-slate-800 shrink-0">
              <GenderSymbol gender={card.gender} className="w-6 h-6 shrink-0" />
              <h2 className="text-xl sm:text-2xl font-heading font-extrabold text-gray-900 dark:text-white truncate">
                {card.name}{card.age ? `, ${card.age}` : ''}
              </h2>
            </div>

            {/* Middle: Bio */}
            <div className="mt-3 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 leading-relaxed overflow-y-auto flex-1 space-y-1 pr-1">
              <span className="text-xs font-heading font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1">
                Bio
              </span>
              <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{card.bio}</p>
            </div>

            {/* Bottom Section: Interest Photos & Action Buttons */}
            <div className="mt-auto pt-3 border-t border-gray-100 dark:border-slate-800 space-y-2.5 shrink-0">
              <div className="space-y-1">
                <span className="text-xs font-heading font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                  Interest Photos
                </span>
                {card.interestImages && card.interestImages.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                    {card.interestImages.slice(0, 3).map((item, idx) => (
                      <div
                        key={idx}
                        className="aspect-square rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100"
                      >
                        <img
                          src={item.url}
                          alt={`Interest ${idx + 1}`}
                          decoding="async"
                          loading="lazy"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No interest photos available</p>
                )}
              </div>

              {/* Action Buttons Row */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onPointerUp={(e) => e.stopPropagation()}
                  onTouchEnd={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    const token = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
                    router.push(
                      `/chat?name=${encodeURIComponent(card.name)}&age=${card.age}&bio=${encodeURIComponent(card.bio)}&interests=${encodeURIComponent((card.interests || []).join(','))}&uid=${card.uid}&generate=true&token=${token}&from=feed`
                    );
                  }}
                  className="flex-1 py-3 px-3 bg-[#00AAFF] hover:bg-[#0088CC] text-white dark:bg-[#B8E7FF] dark:hover:bg-[#99D8FF] dark:text-slate-900 text-xs font-extrabold rounded-xl shadow-md shadow-[#00AAFF]/20 flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4 shrink-0" />
                  <span className="truncate">Chat with {card.name.split(' ')[0]}</span>
                </button>

                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onPointerUp={(e) => e.stopPropagation()}
                  onTouchEnd={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onWhyYouTwo) {
                      onWhyYouTwo(card);
                    }
                  }}
                  className="flex-1 py-3 px-3 bg-purple-600 hover:bg-purple-700 text-white text-xs font-extrabold rounded-xl shadow-md shadow-purple-600/20 flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                >
                  <Lightbulb className="w-4 h-4 shrink-0" />
                  <span className="truncate">Why You Two?</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  },
  (prevProps, nextProps) =>
    prevProps.card.id === nextProps.card.id &&
    prevProps.isBackground === nextProps.isBackground &&
    prevProps.onWhyYouTwo === nextProps.onWhyYouTwo
);

export const MatchStack: React.FC<MatchStackProps> = ({ cards: propCards, onComplete }) => {
  const { profiles, loading, error } = useProfiles();
  const { user } = useAuth();

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Why You Two modal state
  const [whyYouTwoModalOpen, setWhyYouTwoModalOpen] = useState(false);
  const [whyYouTwoLoading, setWhyYouTwoLoading] = useState(false);
  const [whyYouTwoResult, setWhyYouTwoResult] = useState<any>(null);
  const [whyYouTwoError, setWhyYouTwoError] = useState<string | null>(null);
  const [whyYouTwoCard, setWhyYouTwoCard] = useState<MatchCard | null>(null);

  const handleWhyYouTwo = async (matchedCard: MatchCard) => {
    setWhyYouTwoCard(matchedCard);
    setWhyYouTwoModalOpen(true);
    setWhyYouTwoLoading(true);
    setWhyYouTwoResult(null);
    setWhyYouTwoError(null);

    try {
      const res = await fetch('/api/why-you-two', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentUserId: user?.uid,
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

  // Close modal on Escape key press
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && whyYouTwoModalOpen) {
        setWhyYouTwoModalOpen(false);
      }
    };
    if (whyYouTwoModalOpen) {
      window.addEventListener('keydown', handleEscape);
    }
    return () => {
      window.removeEventListener('keydown', handleEscape);
    };
  }, [whyYouTwoModalOpen]);

  // Restore swiping position from sessionStorage or default to 0
  const [currentIndex, setCurrentIndex] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedIndex = sessionStorage.getItem('soloberty_matchstack_index');
      if (savedIndex !== null) {
        const parsed = parseInt(savedIndex, 10);
        if (!isNaN(parsed) && parsed >= 0) return parsed;
      }
    }
    return 0;
  });

  const [undoCount, setUndoCount] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isHeld, setIsHeld] = useState(false);
  const isDraggingRef = useRef(false);

  // Save current swiping index to sessionStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('soloberty_matchstack_index', currentIndex.toString());
    }
  }, [currentIndex]);

  // State to hold dynamically appended cards for endless swiping
  const [appendedCardCount, setAppendedCardCount] = useState(0);

  const baseCards: MatchCard[] = React.useMemo(() => {
    if (propCards && propCards.length > 0) {
      return propCards.filter((c) => !user || c.uid !== user.uid);
    }
    return (profiles || [])
      .filter((p) => !user || p.uid !== user.uid)
      .map((p) => ({
        id: p.uid,
        uid: p.uid,
        name: p.name || 'Anonymous',
        age: typeof p.age === 'number' ? p.age : 25,
        gender: p.gender || 'other',
        bio: p.bio || '',
        interests: p.interests || [],
        location: {
          city: p.location?.city || 'Vienna, AT',
        },
        avatarUrl: p.avatarUrl || '',
        interestImages: (p.interestImages || []).map((img) => ({
          slot: img.slot || 1,
          url: img.url,
        })),
      }));
  }, [profiles, propCards, user]);

  // Construct endless cards list by appending copies when needed
  const cards: MatchCard[] = React.useMemo(() => {
    if (baseCards.length === 0) return [];
    let list = [...baseCards];

    for (let loop = 1; loop <= appendedCardCount; loop++) {
      const loopedCopies = baseCards.map((c, i) => ({
        ...c,
        id: `${c.id}_loop_${loop}_${i}`,
      }));
      list = [...list, ...loopedCopies];
    }
    return list;
  }, [baseCards, appendedCardCount]);

  // Endless swiping trigger: When user reaches cards.length - 2, append another set of DB profiles to the end
  useEffect(() => {
    if (baseCards.length > 0 && currentIndex >= cards.length - 2) {
      setAppendedCardCount((prev) => prev + 1);
    }
  }, [currentIndex, cards.length, baseCards.length]);

  const shouldReduceMotion = useReducedMotion();
  const controls = useAnimation();
  const x = useMotionValue(0);

  // Smooth spring for the hold/press scale transition
  const centerScaleTarget = useMotionValue(1.0);
  const centerScaleSpring = useSpring(centerScaleTarget, { stiffness: 300, damping: 25 });

  useEffect(() => {
    centerScaleTarget.set(isHeld ? 1.05 : 1.0);
  }, [isHeld, centerScaleTarget]);

  const activeCardRef = useRef<HTMLDivElement>(null);
  const isFinished = cards.length > 0 && currentIndex >= cards.length;

  // Continuous 3-Slot Carousel with Depth Scaling, Dynamic Layering & Linear Opacity (20% to 100%)
  const activeScale = useTransform([x, centerScaleSpring], ([latestX, latestCenterScale]: number[]) => {
    const dragRatio = Math.min(Math.abs(latestX) / 320, 1);
    return latestCenterScale - dragRatio * (latestCenterScale - 0.8);
  });
  const activeOpacity = useTransform(x, [-320, 0, 320], [0.2, 1, 0.2]);

  const previewX = useTransform(x, [-320, 0, 320], [0, 320, 640]);
  const previewScale = useTransform(x, [-320, 0, 320], [1, 0.8, 0.65]);
  const previewOpacity = useTransform(x, [-320, 0, 320], [1, 0.2, 0.2]);
  const previewZIndex = useTransform(x, [-320, -160, 0, 320], [40, 20, 20, 10]);

  const nextNextX = useTransform(x, [-320, 0, 320], [320, 640, 960]);
  const nextNextScale = useTransform(x, [-320, 0, 320], [0.8, 0.65, 0.5]);
  const nextNextOpacity = useTransform(x, [-320, 0, 320], [0.2, 0.15, 0.1]);

  const pastX = useTransform(x, [-320, 0, 320], [-640, -320, 0]);
  const pastScale = useTransform(x, [-320, 0, 320], [0.65, 0.8, 1]);
  const pastOpacity = useTransform(x, [-320, 0, 320], [0.2, 0.2, 1]);
  const pastZIndex = useTransform(x, [-320, 0, 160, 320], [10, 20, 20, 40]);

  const prevPrevX = useTransform(x, [-320, 0, 320], [-960, -640, -320]);
  const prevPrevScale = useTransform(x, [-320, 0, 320], [0.5, 0.65, 0.8]);
  const prevPrevOpacity = useTransform(x, [-320, 0, 320], [0.1, 0.15, 0.2]);

  useEffect(() => {
    if (isFinished && onComplete) onComplete();
  }, [isFinished, onComplete]);

  // Ensure active card is rendered in final visible state on mount & index change
  useEffect(() => {
    if (!isFinished && cards.length > 0) {
      controls.start({ scale: 1, opacity: 1, x: 0 });
    }
  }, [currentIndex, isFinished, cards.length, controls]);

  const handleSwipeLeft = async () => {
    setIsHeld(false);
    centerScaleTarget.set(1.0);
    centerScaleSpring.jump(1.0);

    const isTest = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';
    const duration = shouldReduceMotion || isTest ? 0 : 0.22;

    if (duration > 0) {
      await animate(x, -320, { duration, ease: 'easeOut' });
    }

    x.set(0);
    setUndoCount((prev) => Math.min(prev + 1, 2));
    setIsFlipped(false);
    setCurrentIndex((prev) => prev + 1);
  };

  const handleSwipeRightUndo = async () => {
    if (undoCount <= 0 || currentIndex <= 0) {
      animate(x, 0, { type: 'spring', stiffness: 300, damping: 25 });
      return;
    }

    setIsHeld(false);
    centerScaleTarget.set(1.0);
    centerScaleSpring.jump(1.0);

    const isTest = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';
    const duration = shouldReduceMotion || isTest ? 0 : 0.22;

    if (duration > 0) {
      await animate(x, 320, { duration, ease: 'easeOut' });
    }

    x.set(0);
    setUndoCount((prev) => Math.max(prev - 1, 0));
    setIsFlipped(false);
    setCurrentIndex((prev) => prev - 1);
  };

  // Global window keyboard navigation
  useEffect(() => {
    const handleGlobalKeyDown = (e: globalThis.KeyboardEvent) => {
      const targetTag = (e.target as HTMLElement)?.tagName;
      if (targetTag === 'INPUT' || targetTag === 'TEXTAREA' || targetTag === 'SELECT') return;

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          handleSwipeLeft();
          break;
        case 'ArrowRight':
          e.preventDefault();
          handleSwipeRightUndo();
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          setIsFlipped((prev) => !prev);
          break;
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [currentIndex, undoCount, isFinished]);

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setIsHeld(false);
    x.stop();
    if (Math.abs(info.offset.x) > 5) {
      isDraggingRef.current = true;
      setTimeout(() => {
        isDraggingRef.current = false;
      }, 150);
    }

    const offset = info.offset.x;
    if (offset < -SWIPE_THRESHOLD) {
      handleSwipeLeft();
    } else if (offset > SWIPE_THRESHOLD && undoCount > 0 && currentIndex > 0) {
      handleSwipeRightUndo();
    } else {
      animate(x, 0, { type: 'spring', stiffness: 300, damping: 25 });
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-[#F8FAFC] dark:bg-[#090D16] text-gray-500 dark:text-slate-200 space-y-3">
        <div className="w-8 h-8 border-4 border-[#00AAFF] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium">Loading profiles...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#F8FAFC] dark:bg-[#090D16] text-rose-500 dark:text-rose-400 p-4 text-center">
        <p role="alert" className="text-sm font-semibold">
          Couldn't load profiles. Pull to refresh.
        </p>
      </div>
    );
  }

  // Empty profiles state
  if (!loading && cards.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#F8FAFC] dark:bg-[#090D16] text-gray-500 dark:text-slate-200">
        <p role="status" className="text-sm font-medium">
          No profiles nearby yet.
        </p>
      </div>
    );
  }

  // All cards swiped
  if (isFinished) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#F8FAFC] dark:bg-[#090D16] text-gray-500 dark:text-slate-200">
        <p role="status">{UI_TEXT.NO_MORE_CARDS}</p>
      </div>
    );
  }

  const currentCard = cards[currentIndex];

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-[#F8FAFC] dark:bg-[#090D16] touch-none [perspective:1000px]">
      {/* Accessibility Header */}
      <span className="sr-only" aria-live="polite">
        {UI_TEXT.ANNOUNCE_CARD(currentIndex + 1, cards.length)}
      </span>

      {/* Left Fixed Page Curtain */}
      <div
        aria-hidden="true"
        className="absolute top-0 bottom-0 left-0 w-[calc(50%-499px)] bg-[#F8FAFC] dark:bg-[#090D16] z-25 pointer-events-none transition-colors duration-200"
      />

      {/* Right Fixed Page Curtain */}
      <div
        aria-hidden="true"
        className="absolute top-0 bottom-0 right-0 w-[calc(50%-499px)] bg-[#F8FAFC] dark:bg-[#090D16] z-25 pointer-events-none transition-colors duration-200"
      />

      {/* Stack Container */}
      <div className="relative h-full w-full flex items-center justify-center">
        <AnimatePresence>
          {/* Prev-Prev Card (Far Left, -640px) */}
          {currentIndex > 1 && undoCount >= 2 && cards[currentIndex - 2] && (
            <motion.div
              key={`prevprev-${cards[currentIndex - 2].id}`}
              style={{ x: prevPrevX, scale: prevPrevScale, opacity: prevPrevOpacity, zIndex: 5 }}
              className="absolute h-[600px] w-[420px] rounded-[14px] bg-white dark:bg-[#0F172A] border-2 border-slate-300 dark:border-slate-700 overflow-hidden pointer-events-none will-change-transform"
              aria-hidden="true"
            >
              <RenderCardFace card={cards[currentIndex - 2]} isBackground={true} />
            </motion.div>
          )}

          {/* Prev Card (Left, -320px) */}
          {currentIndex > 0 && undoCount >= 1 && cards[currentIndex - 1] && (
            <motion.div
              key={`past-${cards[currentIndex - 1].id}`}
              style={{ x: pastX, scale: pastScale, opacity: pastOpacity, zIndex: pastZIndex }}
              className="absolute h-[600px] w-[420px] rounded-[14px] bg-white dark:bg-[#0F172A] border-2 border-slate-300 dark:border-slate-700 overflow-hidden pointer-events-none will-change-transform"
              aria-hidden="true"
            >
              <RenderCardFace card={cards[currentIndex - 1]} isBackground={true} />
            </motion.div>
          )}

          {/* Next Card (Right, +320px) */}
          {currentIndex + 1 < cards.length && cards[currentIndex + 1] && (
            <motion.div
              key={`preview-${cards[currentIndex + 1].id}`}
              style={{ x: previewX, scale: previewScale, opacity: previewOpacity, zIndex: previewZIndex }}
              className="absolute h-[600px] w-[420px] rounded-[14px] bg-white dark:bg-[#0F172A] border-2 border-slate-300 dark:border-slate-700 overflow-hidden pointer-events-none will-change-transform"
              aria-hidden="true"
            >
              <RenderCardFace card={cards[currentIndex + 1]} isBackground={true} />
            </motion.div>
          )}

          {/* Next-Next Card (Far Right, +640px) */}
          {currentIndex + 2 < cards.length && cards[currentIndex + 2] && (
            <motion.div
              key={`nextnext-${cards[currentIndex + 2].id}`}
              style={{ x: nextNextX, scale: nextNextScale, opacity: nextNextOpacity, zIndex: 5 }}
              className="absolute h-[600px] w-[420px] rounded-[14px] bg-white dark:bg-[#0F172A] border-2 border-slate-300 dark:border-slate-700 overflow-hidden pointer-events-none will-change-transform"
              aria-hidden="true"
            >
              <RenderCardFace card={cards[currentIndex + 2]} isBackground={true} />
            </motion.div>
          )}

          {/* Active Card */}
          {currentCard && (
            <motion.div
              key={`active-${currentCard.id}`}
              ref={activeCardRef}
              tabIndex={0}
              role="button"
              aria-label={`${currentCard.name}. ${UI_TEXT.FLIP_ARIA}`}
              onClick={() => {
                if (!isDraggingRef.current) setIsFlipped((prev) => !prev);
              }}
              onPointerDown={() => setIsHeld(true)}
              onPointerUp={() => setIsHeld(false)}
              onPointerCancel={() => setIsHeld(false)}
              drag="x"
              dragConstraints={{ left: -320, right: undoCount > 0 && currentIndex > 0 ? 320 : 0 }}
              dragElastic={0}
              dragMomentum={false}
              onDragStart={() => {
                isDraggingRef.current = true;
              }}
              onDragEnd={handleDragEnd}
              style={{ x, scale: activeScale, opacity: activeOpacity, zIndex: 30 }}
              animate={{ rotateY: isFlipped ? 180 : 0 }}
              transition={{ rotateY: { duration: 0.4, ease: 'easeInOut' } }}
              className="absolute flex h-[600px] w-[420px] cursor-grab flex-col rounded-[14px] bg-white dark:bg-[#0F172A] border-2 border-slate-300 dark:border-slate-700 active:cursor-grabbing focus:outline-none [transform-style:preserve-3d]"
            >
              <RenderCardFace card={currentCard} onWhyYouTwo={handleWhyYouTwo} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Why You Two Modal Portaled to Body */}
      {mounted &&
        whyYouTwoModalOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-in fade-in duration-200"
            onClick={() => setWhyYouTwoModalOpen(false)}
          >
            <div
              className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 text-slate-900 dark:text-slate-100 shadow-2xl max-h-[85vh] overflow-y-auto space-y-5"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  <h3 className="text-lg font-extrabold font-heading">
                    Why You Two?
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setWhyYouTwoModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  aria-label="Close modal"
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

              {/* Amber Error Card with Retry Button */}
              {!whyYouTwoLoading && whyYouTwoError && (
                <div className="p-3.5 bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/40 rounded-2xl flex items-center justify-between text-xs text-amber-900 dark:text-amber-200 shadow-sm">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>{typeof whyYouTwoError === 'string' ? whyYouTwoError : "Couldn't generate comparison right now."}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => whyYouTwoCard && handleWhyYouTwo(whyYouTwoCard)}
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
          </div>,
          document.body
        )}
    </div>
  );
};

export default MatchStack;