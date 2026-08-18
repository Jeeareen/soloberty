'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useAnimation, useMotionValue, useTransform, useSpring, useReducedMotion, animate, type PanInfo } from 'motion/react';
import { useRouter } from 'next/navigation';
import { MapPin, MessageSquare, User } from 'lucide-react';
import type { MatchCard, MatchStackProps } from '../types/matching';
import { PREDEFINED_INTERESTS } from '../types/user';

const UI_TEXT = {
  NO_MORE_CARDS: 'No more profiles to review.',
  ANNOUNCE_CARD: (current: number, total: number) => `Card ${current} of ${total}`,
  FLIP_ARIA: 'Press Enter, Space, or tap card to flip for details',
};

const SWIPE_THRESHOLD = 50;

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

// Generate 50 mock cards
export const defaultMockCards: MatchCard[] = Array.from({ length: 50 }, (_, i) => {
  const names = [
    'Alice, 28', 'Bob, 32', 'Charlie, 26', 'Diana, 30', 'Eve, 27',
    'Frank, 29', 'Grace, 31', 'Hank, 25', 'Ivy, 28', 'Jack, 33',
    'Karen, 29', 'Leo, 26', 'Mona, 34', 'Nate, 27', 'Olivia, 31',
    'Paul, 30', 'Quinn, 28', 'Rachel, 26', 'Sam, 32', 'Tina, 29'
  ];
  const summaries = [
    'Frontend Developer', 'UX Designer', 'Product Manager', 'DevOps Engineer', 'Data Scientist',
    'Mobile Developer', 'QA Specialist', 'Backend Engineer', 'Full Stack Dev', 'AI Researcher'
  ];
  const baseName = names[i % names.length];
  const summary = summaries[i % summaries.length];
  const countSuffix = i >= 20 ? ` (${Math.floor(i / 20) + 1})` : '';

  return {
    id: `card-${i + 1}`,
    name: `${baseName}${countSuffix}`,
    summary,
    details: `Passionate about building connections, working on innovative projects, and sharing experiences. Profile #${i + 1}.`,
    gender: i % 2 === 0 ? 'female' : 'male',
    location: 'Vienna, AT',
    interests: ['outdoor', 'photography', 'movies'],
  };
});

// Full Card Renderer component for all carousel card slots (Memoized for 60 FPS performance)
const RenderCardFace: React.FC<{ card: MatchCard; isBackground?: boolean }> = React.memo(
  ({ card, isBackground = false }) => {
    const router = useRouter();
    const cardInterests = React.useMemo(
      () =>
        (card.interests || ['sports', 'music', 'coffee']).map(
          (id) => PREDEFINED_INTERESTS.find((i) => i.id === id) || { id, name: id, icon: '✨' }
        ),
      [card.interests]
    );

    return (
      <div className="relative h-full w-full [transform-style:preserve-3d] transform-gpu">
        {/* Front Face */}
        <div className="absolute inset-0 flex flex-col bg-white dark:bg-[#0F172A] rounded-xl overflow-hidden [backface-visibility:hidden]">
          <div className="relative w-full h-52 sm:h-56 shrink-0 bg-slate-100 dark:bg-slate-800 overflow-hidden">
            {card.photoUrl ? (
              <img src={card.photoUrl} alt={card.name} decoding="async" loading="lazy" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-[#B8E7FF] dark:bg-slate-800 text-[#00AAFF] dark:text-[#B8E7FF] flex items-center justify-center">
                <User className="w-20 h-20" />
              </div>
            )}
            {/* Profile Picture Name Overlay */}
            <div className="absolute inset-x-0 bottom-0 p-4">
              <h2 className="text-xl sm:text-2xl font-heading font-extrabold tracking-tight truncate text-white">
                {card.name.split(',')[0]}
              </h2>
            </div>
          </div>

          {/* Content Below PP */}
          <div className="flex-1 flex flex-col p-5 space-y-3.5">
            {/* Location Tag right below PP (1.25x font size) */}
            <div className="flex items-center gap-1.5 text-sm sm:text-base font-bold text-[#00AAFF] dark:text-[#B8E7FF]">
              <MapPin className="w-4 h-4 shrink-0 text-[#00AAFF]" />
              <span>{card.location || 'Vienna, AT'}</span>
            </div>

            {/* 3 Interests as Bulletpoints (1.25x font size) */}
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
              <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{card.details || card.summary}</p>
            </div>

            {/* Bottom Section: Interest Photos & Chat Button */}
            <div className="mt-auto pt-3 border-t border-gray-100 dark:border-slate-800 space-y-2.5 shrink-0">
              <div className="space-y-1">
                <span className="text-xs font-heading font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                  Interest Photos
                </span>
                {card.interestImages && card.interestImages.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                    {card.interestImages.slice(0, 3).map((url, idx) => (
                      <div
                        key={idx}
                        className="aspect-square rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100"
                      >
                        <img src={url} alt={`Interest ${idx + 1}`} decoding="async" loading="lazy" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No interest photos available</p>
                )}
              </div>

              {/* Chat Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  router.push('/chat');
                }}
                className="w-full py-3 px-4 bg-[#00AAFF] hover:bg-[#0088CC] text-white dark:bg-[#B8E7FF] dark:hover:bg-[#99D8FF] dark:text-slate-900 text-xs sm:text-sm font-extrabold rounded-xl shadow-md shadow-[#00AAFF]/20 flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
              >
                <MessageSquare className="w-4 h-4" />
                Chat with {card.name.split(',')[0].split(' ')[0]}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  },
  (prevProps, nextProps) => prevProps.card.id === nextProps.card.id && prevProps.isBackground === nextProps.isBackground
);

export const MatchStack: React.FC<MatchStackProps> = ({ cards = defaultMockCards, onComplete }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [undoCount, setUndoCount] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isHeld, setIsHeld] = useState(false);
  const isDraggingRef = useRef(false);

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
  const isFinished = currentIndex >= cards.length;

  // Continuous 3-Slot Carousel with Depth Scaling, Dynamic Layering & Linear Opacity (20% to 100%)
  // 1. Active card (Middle slot at 0px): resting center at 1.0x, smoothly spring-upscales to 1.05x when held, and linearly decreases to 0.8x at -320px / +320px
  const activeScale = useTransform([x, centerScaleSpring], ([latestX, latestCenterScale]: number[]) => {
    const dragRatio = Math.min(Math.abs(latestX) / 320, 1);
    return latestCenterScale - dragRatio * (latestCenterScale - 0.8);
  });
  const activeOpacity = useTransform(x, [-320, 0, 320], [0.2, 1, 0.2]);

  // 2. Preview card (Right slot / next card at +320px): As active card swipes left, preview shifts left & scales up linearly to 1.0x (0.8 -> 1.0)
  const previewX = useTransform(x, [-320, 0, 320], [0, 320, 640]);
  const previewScale = useTransform(x, [-320, 0, 320], [1, 0.8, 0.65]);
  const previewOpacity = useTransform(x, [-320, 0, 320], [1, 0.2, 0.2]);
  const previewZIndex = useTransform(x, [-320, -160, 0, 320], [40, 20, 20, 10]);

  // 2b. Next-Next card (Further Right slot at +640px): Shifts left towards preview slot as active card swipes left
  const nextNextX = useTransform(x, [-320, 0, 320], [320, 640, 960]);
  const nextNextScale = useTransform(x, [-320, 0, 320], [0.8, 0.65, 0.5]);
  const nextNextOpacity = useTransform(x, [-320, 0, 320], [0.2, 0.15, 0.1]);

  // 3. Past card (Left slot / prev card at -320px): As active card swipes right for undo, past card shifts right & scales up linearly to 1.0x (0.8 -> 1.0)
  const pastX = useTransform(x, [-320, 0, 320], [-640, -320, 0]);
  const pastScale = useTransform(x, [-320, 0, 320], [0.65, 0.8, 1]);
  const pastOpacity = useTransform(x, [-320, 0, 320], [0.2, 0.2, 1]);
  const pastZIndex = useTransform(x, [-320, 0, 160, 320], [10, 20, 20, 40]);

  // 3b. Prev-Prev card (Further Left slot at -640px): Shifts right towards past slot as active card swipes right
  const prevPrevX = useTransform(x, [-320, 0, 320], [-960, -640, -320]);
  const prevPrevScale = useTransform(x, [-320, 0, 320], [0.5, 0.65, 0.8]);
  const prevPrevOpacity = useTransform(x, [-320, 0, 320], [0.1, 0.15, 0.2]);

  useEffect(() => {
    if (isFinished && onComplete) onComplete();
  }, [isFinished, onComplete]);

  // Ensure active card is rendered in final visible state on mount & index change
  useEffect(() => {
    if (!isFinished) {
      controls.start({ scale: 1, opacity: 1, x: 0 });
    }
  }, [currentIndex, isFinished, controls]);

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
      // Undo is not available, spring back
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

  // Global window keyboard navigation for continuous arrow-key swiping and 3D card flipping
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
        case 'Escape':
          e.preventDefault();
          setIsFlipped(false);
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
      // Smooth spring back to 0 on release
      animate(x, 0, { type: 'spring', stiffness: 300, damping: 25 });
    }
  };

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
          {/* Prev-Prev Card (Far Left, -640px) - Only rendered if undoCount >= 2 */}
          {currentIndex > 1 && undoCount >= 2 && (
            <motion.div
              key={`prevprev-${cards[currentIndex - 2].id}`}
              style={{ x: prevPrevX, scale: prevPrevScale, opacity: prevPrevOpacity, zIndex: 5 }}
              className="absolute h-[600px] w-[420px] rounded-[14px] bg-white dark:bg-[#0F172A] border-2 border-slate-300 dark:border-slate-700 overflow-hidden pointer-events-none will-change-transform"
              aria-hidden="true"
            >
              <RenderCardFace card={cards[currentIndex - 2]} isBackground={true} />
            </motion.div>
          )}

          {/* Prev Card (Left, -320px) - Only rendered if undoCount >= 1 */}
          {currentIndex > 0 && undoCount >= 1 && (
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
          {currentIndex + 1 < cards.length && (
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
          {currentIndex + 2 < cards.length && (
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
          <motion.div
            key={`active-${currentCard.id}`}
            ref={activeCardRef}
            tabIndex={0}
            role="button"
            aria-label={`${currentCard.name}, ${currentCard.summary}. ${UI_TEXT.FLIP_ARIA}`}
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
            <RenderCardFace card={currentCard} />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default MatchStack;