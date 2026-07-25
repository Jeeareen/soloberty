// src/components/MatchStack.tsx
import React, { useState, useEffect, useRef, type KeyboardEvent } from 'react';
import { motion, AnimatePresence, useAnimation, useMotionValue, useTransform, useReducedMotion, type PanInfo } from 'framer-motion';
import type { MatchCard, SwipeAction, MatchStackProps } from '../types/matching';

const UI_TEXT = {
  UNDO: 'Undo',
  LEFT_LIMIT_TOOLTIP: "You've passed on 3. Keep swiping right to find a match.",
  NO_MORE_CARDS: 'No more profiles to review.',
  ANNOUNCE_CARD: (current: number, total: number) => `Card ${current} of ${total}`,
  EXPAND_ARIA: 'Press Enter to view details',
  COLLAPSE_ARIA: 'Swipe down or press Escape to close',
};

const MAX_LEFT_SWIPES = 3;
const SWIPE_THRESHOLD = 50;

export const MatchStack: React.FC<MatchStackProps> = ({ cards, onComplete }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [leftSwipes, setLeftSwipes] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [lastAction, setLastAction] = useState<SwipeAction | null>(null);
  const [hasUndone, setHasUndone] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  const shouldReduceMotion = useReducedMotion();
  const controls = useAnimation();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  
  const activeCardRef = useRef<HTMLDivElement>(null);
  const isFinished = currentIndex >= cards.length;
  
  // Logic states
  const leftSwipeDisabled = leftSwipes >= MAX_LEFT_SWIPES;
  const canUndo = lastAction !== null && !hasUndone && !leftSwipeDisabled;
  const currentCard = cards[currentIndex];

  // Visuals mapped to drag
  const rotate = useTransform(x, [-200, 200], [-8, 8]);
  const activeOpacity = useTransform(x, [-200, 0, 200], [0.5, 1, 0.5]);

  useEffect(() => {
    if (isFinished && onComplete) onComplete();
  }, [isFinished, onComplete]);

  // Focus management for accessibility
  useEffect(() => {
    if (!isExpanded && activeCardRef.current) {
      activeCardRef.current.focus();
    }
  }, [currentIndex, isExpanded]);

  const handleSwipe = async (direction: 'left' | 'right') => {
    if (direction === 'left' && leftSwipeDisabled) {
      triggerTooltip();
      return;
    }

    const xTarget = direction === 'left' ? -300 : 300;
    
    if (!shouldReduceMotion) {
      await controls.start({ x: xTarget, opacity: 0, transition: { duration: 0.3 } });
    }

    setLastAction({
      direction,
      cardId: currentCard.id,
      previousIndex: currentIndex,
    });
    
    if (direction === 'left') setLeftSwipes((prev) => prev + 1);
    setCurrentIndex((prev) => prev + 1);
    
    // Reset for next card
    x.set(0);
    controls.set({ x: 0, opacity: 1 });
  };

  const triggerTooltip = () => {
    setShowTooltip(true);
    setTimeout(() => setShowTooltip(false), 3000);
  };

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (isExpanded) return;
    
    const offset = info.offset.x;
    if (offset > SWIPE_THRESHOLD) {
      handleSwipe('right');
    } else if (offset < -SWIPE_THRESHOLD) {
      if (leftSwipeDisabled) {
        triggerTooltip();
        controls.start({ x: 0, transition: { type: 'spring', stiffness: 300, damping: 20 } });
      } else {
        handleSwipe('left');
      }
    } else {
      controls.start({ x: 0, transition: { type: 'spring', stiffness: 300, damping: 20 } });
    }
  };

  const handleExpandedDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.y > SWIPE_THRESHOLD) {
      setIsExpanded(false);
      y.set(0);
    } else {
      controls.start({ y: 0, transition: { type: 'spring' } });
    }
  };

  const handleUndo = () => {
    if (!canUndo) return;
    
    if (lastAction?.direction === 'left') {
      setLeftSwipes((prev) => Math.max(0, prev - 1));
    }
    
    setCurrentIndex(lastAction!.previousIndex);
    setHasUndone(true);
    setLastAction(null);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (isExpanded) {
      if (e.key === 'Escape') setIsExpanded(false);
      return;
    }

    switch (e.key) {
      case 'ArrowRight':
        handleSwipe('right');
        break;
      case 'ArrowLeft':
        handleSwipe('left');
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        setIsExpanded(true);
        break;
    }
  };

  if (isFinished) {
    return (
      <div className="flex h-[480px] w-[360px] items-center justify-center rounded-xl bg-gray-100 text-gray-500">
        <p role="status">{UI_TEXT.NO_MORE_CARDS}</p>
      </div>
    );
  }

  const animationDurations = {
    swipe: shouldReduceMotion ? 0 : 0.3,
    expand: shouldReduceMotion ? 0 : 0.2,
    entrance: shouldReduceMotion ? 0 : 0.25,
  };

  return (
    <div className="relative flex h-[480px] w-[360px] flex-col items-center overflow-hidden bg-gray-50 rounded-2xl shadow-lg touch-none">
      {/* Header */}
      <header className="absolute top-0 z-40 flex w-full justify-between p-4">
        <span className="sr-only" aria-live="polite">
          {UI_TEXT.ANNOUNCE_CARD(currentIndex + 1, cards.length)}
        </span>
        <button
          onClick={handleUndo}
          disabled={!canUndo}
          aria-label={UI_TEXT.UNDO}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition-opacity duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            canUndo ? 'bg-white text-gray-800 shadow-sm opacity-100' : 'bg-gray-200 text-gray-400 opacity-50 cursor-not-allowed'
          }`}
        >
          {UI_TEXT.UNDO}
        </button>
      </header>

      {/* Stack Container */}
      <div className="relative h-full w-full">
        <AnimatePresence>
          {/* Past Card (Left) */}
          {currentIndex > 0 && (
            <motion.div
              key={`past-${cards[currentIndex - 1].id}`}
              initial={false}
              animate={{ x: -12, scale: 0.8, opacity: 0.3 }}
              className="absolute inset-0 z-10 m-auto h-[400px] w-[300px] rounded-xl bg-white shadow-md"
              aria-hidden="true"
            >
               <div className="p-6 opacity-50">
                 <h2 className="text-xl font-bold">{cards[currentIndex - 1].name}</h2>
               </div>
            </motion.div>
          )}

          {/* Preview Card (Right) */}
          {currentIndex + 1 < cards.length && (
            <motion.div
              key={`preview-${cards[currentIndex + 1].id}`}
              initial={false}
              animate={{ x: 12, scale: 0.7, opacity: 0.7 }}
              transition={{ duration: animationDurations.entrance }}
              className="absolute inset-0 z-20 m-auto h-[400px] w-[300px] rounded-xl bg-white shadow-md"
              aria-hidden="true"
            >
               <div className="p-6">
                 <h2 className="text-xl font-bold">{cards[currentIndex + 1].name}</h2>
               </div>
            </motion.div>
          )}

          {/* Active Card (Middle) */}
{!isExpanded && (
  <motion.div
    key={`active-${currentCard.id}`}
    ref={activeCardRef}
    tabIndex={0}
    role="button"
    aria-label={`${currentCard.name}, ${currentCard.summary}. ${UI_TEXT.EXPAND_ARIA}`}
    onKeyDown={handleKeyDown}
    onClick={() => setIsExpanded(true)}
    drag="x"
    dragConstraints={{ left: 0, right: 0 }}
    onDragEnd={handleDragEnd}
    style={{ x, rotate, opacity: activeOpacity }}
    animate={controls}
    initial={{ scale: 0.7, opacity: 0, x: 12 }}
    transition={{ type: 'spring', stiffness: 100, damping: 12 }}
    className="absolute inset-0 z-30 m-auto flex h-[400px] w-[300px] cursor-grab flex-col rounded-xl bg-white p-6 shadow-xl active:cursor-grabbing focus:outline-none focus:ring-2 focus:ring-blue-500"
  >
    <h2 className="text-2xl font-bold text-gray-900">{currentCard.name}</h2>
    <p className="mt-2 text-gray-600">{currentCard.summary}</p>
  </motion.div>
)}
        </AnimatePresence>

        {/* Expanded View */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, y: 100, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 200, scale: 0.9 }}
              transition={{ duration: animationDurations.expand, ease: 'easeOut' }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              onDragEnd={handleExpandedDragEnd}
              style={{ y }}
              className="absolute inset-0 z-50 flex h-full w-full cursor-ns-resize flex-col bg-white p-6 shadow-2xl overflow-y-auto"
              role="dialog"
              aria-label={`${currentCard.name} details. ${UI_TEXT.COLLAPSE_ARIA}`}
              tabIndex={0}
              onKeyDown={handleKeyDown}
              autoFocus
            >
              <div className="h-1 w-12 rounded-full bg-gray-300 mx-auto mb-6" />
              <h2 className="text-3xl font-bold text-gray-900">{currentCard.name}</h2>
              <p className="mt-2 text-lg text-gray-600">{currentCard.summary}</p>
              <div className="mt-6 border-t pt-6 text-gray-700">
                {currentCard.details || "Loading details..."}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Anti-paralysis Tooltip */}
        <AnimatePresence>
          {showTooltip && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              role="alert"
              className="absolute bottom-6 left-0 right-0 z-50 mx-4 rounded-lg bg-black/80 p-4 text-center text-sm font-medium text-white shadow-lg backdrop-blur-sm"
            >
              {UI_TEXT.LEFT_LIMIT_TOOLTIP}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};