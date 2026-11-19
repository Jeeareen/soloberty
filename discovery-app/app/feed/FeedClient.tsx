'use client';

import { useEffect } from 'react';
import { MatchStack } from '../../components/MatchStack';
import type { MatchCard } from '../../types/matching';

export function FeedClient({ initialCards }: { initialCards: MatchCard[] }) {
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

  return (
    <div className="h-[calc(100dvh-56px-60px)] md:h-[calc(100dvh-56px)] w-full bg-[#F8FAFC] dark:bg-[#090D16] text-[#0F172A] dark:text-white transition-colors duration-200 flex flex-col items-center justify-center overflow-hidden overscroll-none select-none touch-none">
      <h1 className="sr-only">Soloberty Match Feed</h1>
      <MatchStack cards={initialCards.length > 0 ? initialCards : undefined} />
    </div>
  );
}
