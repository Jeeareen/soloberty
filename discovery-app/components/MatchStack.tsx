'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useAnimation, useMotionValue, useTransform, useReducedMotion, animate, type PanInfo } from 'motion/react';
import type { MatchCard, MatchStackProps } from '../types/matching';

const UI_TEXT = {
  NO_MORE_CARDS: 'No more profiles to review.',
  ANNOUNCE_CARD: (current: number, total: number) => `Card ${current} of ${total}`,
  FLIP_ARIA: 'Press Enter, Space, or tap card to flip for details',
};

const SWIPE_THRESHOLD = 50;

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
  };
});

export const MatchStack: React.FC<MatchStackProps> = ({ cards = defaultMockCards, onComplete }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [canUndoRight, setCanUndoRight] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);

  const shouldReduceMotion = useReducedMotion();
  const controls = useAnimation();
  const x = useMotionValue(0);

  const activeCardRef = useRef<HTMLDivElement>(null);
  const isFinished = currentIndex >= cards.length;
  const currentCard = cards[currentIndex];

  // Continuous 5-Slot Carousel with Depth Scaling (Solid opacities, no bleeding!)
  // 1. Active card (Middle slot at 0px): scale 1.0 down to 0.8 when swiping left/right
  const activeScale = useTransform(x, [-140, 0, 140], [0.8, 1, 0.8]);

  // 2. Preview card (Right slot at +140px, scale 0.8): As active card swipes left (x: 0 -> -140), preview shifts left (140 -> 0) & scales up (0.8 -> 1.0)
  const previewX = useTransform(x, [-140, 0, 140], [0, 140, 280]);
  const previewScale = useTransform(x, [-140, 0, 140], [1, 0.8, 0.6]);

  // 3. Next Preview card (Far Right slot at +280px, scale 0.6): As active card swipes left (x: 0 -> -140), next preview shifts left (280 -> 140) & scales up (0.6 -> 0.8)
  const nextPreviewX = useTransform(x, [-140, 0], [140, 280]);
  const nextPreviewScale = useTransform(x, [-140, 0], [0.8, 0.6]);

  // 4. Past card (Left slot at -140px, scale 0.8): As active card swipes right for undo (x: 0 -> 140), past card shifts right (-140 -> 0) & scales up (0.8 -> 1.0)
  const pastX = useTransform(x, [-140, 0, 140], [-280, -140, 0]);
  const pastScale = useTransform(x, [-140, 0, 140], [0.6, 0.8, 1]);

  // 5. Far Past card (Far Left slot at -280px, scale 0.6): As active card swipes right for undo (x: 0 -> 140), far past card shifts right (-280 -> -140) & scales up (0.6 -> 0.8)
  const farPastX = useTransform(x, [0, 140], [-280, -140]);
  const farPastScale = useTransform(x, [0, 140], [0.6, 0.8]);

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
    const isTest = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';
    const duration = shouldReduceMotion || isTest ? 0 : 0.22;

    if (duration > 0) {
      await animate(x, -140, { duration, ease: 'easeOut' });
    }

    // Swiping left grants 1 single right swipe (undo) capability
    setCanUndoRight(true);
    setIsFlipped(false);
    setCurrentIndex((prev) => prev + 1);

    x.set(0);
  };

  const handleSwipeRightUndo = async () => {
    if (!canUndoRight || currentIndex <= 0) {
      // Undo is not available, spring back
      animate(x, 0, { type: 'spring', stiffness: 300, damping: 25 });
      return;
    }

    const isTest = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';
    const duration = shouldReduceMotion || isTest ? 0 : 0.22;

    if (duration > 0) {
      await animate(x, 140, { duration, ease: 'easeOut' });
    }

    // Consumes the single right swipe capability & restores previous card
    setCanUndoRight(false);
    setIsFlipped(false);
    setCurrentIndex((prev) => prev - 1);

    x.set(0);
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
  }, [currentIndex, canUndoRight, isFinished]);

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const offset = info.offset.x;
    if (offset < -SWIPE_THRESHOLD) {
      handleSwipeLeft();
    } else if (offset > SWIPE_THRESHOLD && canUndoRight && currentIndex > 0) {
      handleSwipeRightUndo();
    } else {
      // Smooth spring back to 0 on release
      animate(x, 0, { type: 'spring', stiffness: 300, damping: 25 });
    }
  };

  if (isFinished) {
    return (
      <div className="flex h-[480px] w-[360px] items-center justify-center rounded-xl bg-gray-100 text-gray-500 mx-auto mt-6">
        <p role="status">{UI_TEXT.NO_MORE_CARDS}</p>
      </div>
    );
  }

  return (
    <div className="relative flex h-[480px] w-full max-w-[520px] min-w-0 max-w-full flex-col items-center justify-center overflow-hidden bg-gray-50 rounded-2xl shadow-lg touch-none mx-auto mt-4 sm:mt-6 [perspective:1000px]">
      {/* Accessibility Header */}
      <span className="sr-only" aria-live="polite">
        {UI_TEXT.ANNOUNCE_CARD(currentIndex + 1, cards.length)}
      </span>

      {/* Stack Container */}
      <div className="relative h-full w-full flex items-center justify-center">
        <AnimatePresence>
          {/* Far Past Card (Far Left, -280px, scale 0.6 -> 0.8) - Solid white, no bleeding */}
          {currentIndex > 1 && (
            <motion.div
              key={`far-past-${cards[currentIndex - 2].id}`}
              style={{ x: farPastX, scale: farPastScale }}
              className="absolute z-0 h-[400px] w-[280px] rounded-xl bg-white shadow-sm border border-gray-200 pointer-events-none opacity-100"
              aria-hidden="true"
            >
              <div className="p-6">
                <h2 className="text-xl font-bold text-gray-700">{cards[currentIndex - 2].name}</h2>
                <p className="mt-2 text-sm text-gray-500">{cards[currentIndex - 2].summary}</p>
              </div>
            </motion.div>
          )}

          {/* Past Card (Left, -140px, scale 0.8) - Solid white, no bleeding */}
          {currentIndex > 0 && (
            <motion.div
              key={`past-${cards[currentIndex - 1].id}`}
              style={{ x: pastX, scale: pastScale }}
              className="absolute z-10 h-[400px] w-[280px] rounded-xl bg-white shadow-md border border-gray-200 pointer-events-none opacity-100"
              aria-hidden="true"
            >
              <div className="p-6">
                <h2 className="text-xl font-bold text-gray-700">{cards[currentIndex - 1].name}</h2>
                <p className="mt-2 text-sm text-gray-500">{cards[currentIndex - 1].summary}</p>
              </div>
            </motion.div>
          )}

          {/* Preview Card (Right, +140px, scale 0.8) - Solid white, no bleeding */}
          {currentIndex + 1 < cards.length && (
            <motion.div
              key={`preview-${cards[currentIndex + 1].id}`}
              style={{ x: previewX, scale: previewScale }}
              className="absolute z-20 h-[400px] w-[280px] rounded-xl bg-white shadow-md border border-gray-200 pointer-events-none opacity-100"
              aria-hidden="true"
            >
              <div className="p-6">
                <h2 className="text-xl font-bold text-gray-700">{cards[currentIndex + 1].name}</h2>
                <p className="mt-2 text-sm text-gray-500">{cards[currentIndex + 1].summary}</p>
              </div>
            </motion.div>
          )}

          {/* Next Preview Card (Far Right, +280px, scale 0.6 -> 0.8) - Solid white, no bleeding */}
          {currentIndex + 2 < cards.length && (
            <motion.div
              key={`next-preview-${cards[currentIndex + 2].id}`}
              style={{ x: nextPreviewX, scale: nextPreviewScale }}
              className="absolute z-0 h-[400px] w-[280px] rounded-xl bg-white shadow-sm border border-gray-200 pointer-events-none opacity-100"
              aria-hidden="true"
            >
              <div className="p-6">
                <h2 className="text-xl font-bold text-gray-700">{cards[currentIndex + 2].name}</h2>
                <p className="mt-2 text-sm text-gray-500">{cards[currentIndex + 2].summary}</p>
              </div>
            </motion.div>
          )}

          {/* Active Card (Middle, 0px, scale 1.0) - 2-Faced 3D Flip Card */}
          <motion.div
            key={`active-${currentCard.id}`}
            ref={activeCardRef}
            tabIndex={0}
            role="button"
            aria-label={`${currentCard.name}, ${currentCard.summary}. ${UI_TEXT.FLIP_ARIA}`}
            onClick={() => setIsFlipped((prev) => !prev)}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            onDragEnd={handleDragEnd}
            style={{ x, scale: activeScale }}
            animate={{ rotateY: isFlipped ? 180 : 0 }}
            transition={{ rotateY: { duration: 0.4, ease: 'easeInOut' } }}
            className="absolute z-30 flex h-[400px] w-[280px] cursor-grab flex-col rounded-xl bg-white shadow-xl active:cursor-grabbing focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-100 [transform-style:preserve-3d]"
          >
            {/* Front Face */}
            <div className="absolute inset-0 flex flex-col p-6 bg-white rounded-xl [backface-visibility:hidden]">
              <h2 className="text-2xl font-bold text-gray-900">{currentCard.name}</h2>
              <p className="mt-2 text-gray-600 font-medium">{currentCard.summary}</p>
              <div className="mt-auto pt-4 flex items-center justify-between text-xs text-gray-400 italic border-t border-gray-100">
                <span>Tap card to view details</span>
                <span>🔄</span>
              </div>
            </div>

            {/* Back Face (Details side, rotated 180 deg) */}
            <div className="absolute inset-0 flex flex-col p-6 bg-white rounded-xl [transform:rotateY(180deg)] [backface-visibility:hidden]">
              <h2 className="text-xl font-bold text-gray-900">{currentCard.name}</h2>
              <p className="mt-1 text-sm text-gray-600 font-medium">{currentCard.summary}</p>
              <div className="mt-3 border-t pt-3 text-sm text-gray-700 leading-relaxed overflow-y-auto flex-1">
                {currentCard.details || 'No additional details available.'}
              </div>
              <div className="mt-auto pt-2 flex items-center justify-between text-xs text-gray-400 italic border-t border-gray-100">
                <span>Tap card to flip back</span>
                <span>🔄</span>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default MatchStack;