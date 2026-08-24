'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { Sparkles, Check, AlertCircle, Loader2 } from 'lucide-react';

export type ButtonState = 'idle' | 'hover' | 'loading' | 'success' | 'error';

interface ScoutBioButtonProps {
  onClick?: () => Promise<void> | void;
  disabled?: boolean;
  /** Force an explicit state from outside (useful for demo controls) */
  overrideState?: ButtonState | null;
  /** Force reduced motion for demo testing */
  forceReducedMotion?: boolean;
  className?: string;
  idleText?: string;
  loadingText?: string;
  successText?: string;
  errorText?: string;
}

export const ScoutBioButton: React.FC<ScoutBioButtonProps> = ({
  onClick,
  disabled = false,
  overrideState = null,
  forceReducedMotion = false,
  className = '',
  idleText = 'Auto-generate with Scout',
  loadingText = 'Scout is drafting...',
  successText = 'Bio Generated!',
  errorText = 'Generation Failed • Retry',
}) => {
  const systemPrefersReducedMotion = useReducedMotion();
  const prefersReducedMotion = forceReducedMotion || systemPrefersReducedMotion;

  const [internalState, setInternalState] = useState<ButtonState>('idle');
  const [isHovered, setIsHovered] = useState(false);

  // Sync state if controlled externally
  const currentState = overrideState !== null ? overrideState : internalState;

  // Interruptibility safety: reset state automatically after success or error after a brief delay
  useEffect(() => {
    if (overrideState !== null) return;

    if (currentState === 'success') {
      const timer = setTimeout(() => {
        setInternalState('idle');
      }, 2500);
      return () => clearTimeout(timer);
    }

    if (currentState === 'error') {
      const timer = setTimeout(() => {
        setInternalState('idle');
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [currentState, overrideState]);

  const isInteractionDisabled = disabled || currentState === 'loading' || currentState === 'success';

  const handleClick = async () => {
    if (isInteractionDisabled) return;

    // Transition to loading
    setInternalState('loading');

    if (onClick) {
      try {
        await onClick();
        setInternalState('success');
      } catch (err) {
        setInternalState('error');
      }
    } else {
      // Default fake delay for demo if no onClick provided
      setTimeout(() => {
        if (Math.random() > 0.2) {
          setInternalState('success');
        } else {
          setInternalState('error');
        }
      }, 1500);
    }
  };

  // Easing definitions
  const transitionEase = prefersReducedMotion
    ? { duration: 0.1 }
    : { type: 'spring', stiffness: 700, damping: 18 };

  // Error shake keyframes (compositor translateX only)
  const shakeAnimation =
    currentState === 'error' && !prefersReducedMotion
      ? {
          x: [0, -6, 6, -4, 4, -2, 2, 0],
        }
      : {};

  // Background color map according to state
  const getBgClass = () => {
    switch (currentState) {
      case 'success':
        return 'bg-emerald-600 dark:bg-emerald-500 text-white shadow-emerald-500/20';
      case 'error':
        return 'bg-rose-600 dark:bg-rose-500 text-white shadow-rose-500/20';
      case 'loading':
        return 'bg-[#0099EE] dark:bg-[#99D8FF] text-white dark:text-slate-900 shadow-[#00AAFF]/20';
      default:
        return 'bg-[#00AAFF] hover:bg-[#0088CC] dark:bg-[#B8E7FF] dark:hover:bg-[#99D8FF] text-white dark:text-slate-900 shadow-[#00AAFF]/25';
    }
  };

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      disabled={isInteractionDisabled}
      animate={{
        scale: isHovered && !isInteractionDisabled ? 1.02 : 1,
        ...shakeAnimation,
      }}
      whileTap={{ scale: prefersReducedMotion || isInteractionDisabled ? 1 : 0.95 }}
      transition={{
        x: { duration: 0.4, ease: 'easeInOut' },
        default: transitionEase,
      }}
      className={`relative inline-flex items-center justify-center gap-2 w-[220px] shrink-0 px-3.5 py-2 text-xs font-extrabold rounded-xl shadow-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00AAFF] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 disabled:opacity-90 select-none overflow-hidden ${
        isInteractionDisabled ? 'cursor-not-allowed' : 'cursor-pointer'
      } ${getBgClass()} ${className}`}
      aria-live="polite"
      aria-label={`${idleText} - Current state: ${currentState}`}
    >
      {/* Content wrapper with pure opacity crossfade */}
      <AnimatePresence mode="wait" initial={false}>
        {currentState === 'loading' && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: prefersReducedMotion ? 0.05 : 0.2 }}
            className="flex items-center gap-2"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.2, 1] }}
              transition={{ duration: prefersReducedMotion ? 0.05 : 0.3 }}
            >
              <motion.div
                animate={
                  prefersReducedMotion
                    ? { opacity: [0.7, 1, 0.7] }
                    : {
                        scale: [1, 1.08, 1],
                        opacity: [0.55, 1, 0.55],
                      }
                }
                transition={{
                  duration: prefersReducedMotion ? 1.6 : 1.2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-200 dark:text-amber-500" />
              </motion.div>
            </motion.div>
            <span>{loadingText}</span>
          </motion.div>
        )}

        {currentState === 'success' && (
          <motion.div
            key="success"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: prefersReducedMotion ? 0.05 : 0.2 }}
            className="flex items-center gap-1.5"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.2, 1] }}
              transition={{ duration: prefersReducedMotion ? 0.05 : 0.3 }}
            >
              <Check className="w-4 h-4 text-white stroke-[3]" />
            </motion.div>
            <span>{successText}</span>
          </motion.div>
        )}

        {currentState === 'error' && (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: prefersReducedMotion ? 0.05 : 0.2 }}
            className="flex items-center gap-1.5"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.2, 1] }}
              transition={{ duration: prefersReducedMotion ? 0.05 : 0.3 }}
            >
              <AlertCircle className="w-3.5 h-3.5" />
            </motion.div>
            <span>{errorText}</span>
          </motion.div>
        )}

        {(currentState === 'idle' || currentState === 'hover') && (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: prefersReducedMotion ? 0.05 : 0.2 }}
            className="flex items-center gap-1.5"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.2, 1] }}
              transition={{ duration: prefersReducedMotion ? 0.05 : 0.3 }}
            >
              {/* Sparkle icon only floats vertically on hover - NO rotation */}
              <motion.div
                animate={{
                  y: isHovered && !prefersReducedMotion ? -3 : 0,
                }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-200 dark:text-amber-500" />
              </motion.div>
            </motion.div>
            <span>{idleText}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
};
