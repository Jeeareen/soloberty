'use client';

import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile, PREDEFINED_INTERESTS } from '../../types/user';
import { User, ChevronLeft, ChevronRight, X, MapPin } from 'lucide-react';
import { getOptimizedCloudinaryUrl } from '../../lib/cloudinary';
import { useFocusTrap } from '../../hooks/useFocusTrap';

interface UserPreviewCardProps {
  users: UserProfile[];
  clusterTitle?: string;
  currentIndex: number;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
  onSelectUser?: (user: UserProfile) => void;
  pauseFocusTrap?: boolean;
}

export const UserPreviewCard: React.FC<UserPreviewCardProps> = ({
  users,
  clusterTitle,
  currentIndex,
  onPrev,
  onNext,
  onClose,
  onSelectUser,
  pauseFocusTrap = false,
}) => {
  const previewRef = useRef<HTMLDivElement | null>(null);
  const firstUserRef = useRef<HTMLDivElement | null>(null);
  const isOpen = Boolean(users && users.length > 0);
  useFocusTrap(isOpen && !pauseFocusTrap, previewRef, onClose, firstUserRef);

  if (!isOpen) return null;

  const isMulti = users.length > 1;
  // Display up to 3 cards for the current window if multi, or single card
  const pageSize = 3;
  const totalPages = Math.ceil(users.length / pageSize);
  const activePage = Math.floor(currentIndex / pageSize);
  const visibleUsers = isMulti
    ? users.slice(activePage * pageSize, (activePage + 1) * pageSize)
    : users;

  return (
    <AnimatePresence>
      <motion.div
        ref={previewRef}
        role="dialog"
        aria-modal="true"
        aria-label={clusterTitle || 'Member Preview'}
        tabIndex={-1}
        initial={{ opacity: 0, y: 40, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.96 }}
        transition={{ type: 'spring', damping: 26, stiffness: 320 }}
        className="fixed bottom-20 md:bottom-8 left-1/2 -translate-x-1/2 z-[1000] w-[calc(100%-2rem)] max-w-md bg-white/95 dark:bg-[#0F172A]/95 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 rounded-3xl shadow-2xl overflow-hidden p-4 sm:p-5 focus:outline-none"
      >
        {/* Header with Title and Close Button */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#007ABB] animate-pulse" />
            <h3 className="text-sm font-heading font-extrabold text-slate-900 dark:text-white truncate">
              {clusterTitle || (isMulti ? `${users.length} People Nearby` : 'Member Preview')}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close preview"
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* User Card(s) List */}
        <div className="space-y-3 max-h-[50vh] overflow-y-auto p-1">
          {visibleUsers.map((u, idx) => {
            const interests = (u.interests || []).slice(0, 3).map((id) => {
              const item = PREDEFINED_INTERESTS.find((p) => p.id === id);
              return item ? { id, name: item.name, icon: item.icon } : { id, name: id, icon: '✨' };
            });

            return (
              <div
                key={u.uid}
                ref={idx === 0 ? firstUserRef : undefined}
                role="button"
                tabIndex={0}
                onClick={() => onSelectUser?.(u)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectUser?.(u);
                  }
                }}
                className="flex items-start gap-3.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 transition-all hover:bg-blue-50/50 dark:hover:bg-slate-800 hover:border-[#007ABB]/40 cursor-pointer active:scale-[0.98] group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007ABB]"
              >
                {/* User Avatar */}
                <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-2xl overflow-hidden bg-slate-200 dark:bg-slate-700 shrink-0 border border-slate-300 dark:border-slate-600">
                  {u.avatarUrl || u.profilePhoto?.url ? (
                    <img
                      src={getOptimizedCloudinaryUrl(u.avatarUrl || u.profilePhoto?.url)}
                      alt={u.name}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-[#E8F4FC] dark:bg-slate-800 text-[#007ABB]">
                      <User className="w-6 h-6" />
                    </div>
                  )}
                </div>

                {/* Info & Interest Badges */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <h4 className="text-sm sm:text-base font-heading font-extrabold text-slate-900 dark:text-white truncate">
                      {u.name}{u.age ? `, ${u.age}` : ''}
                    </h4>
                    {u.location?.city && (
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-0.5 shrink-0">
                        <MapPin className="w-3 h-3 text-[#007ABB]" />
                        {u.location.type === 'approximate' ? '~ ' : ''}{u.location.city.split(',')[0]}
                      </span>
                    )}
                  </div>

                  {/* Interests Pill Badges */}
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {interests.length > 0 ? (
                      interests.map((item) => (
                        <span
                          key={item.id}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] sm:text-xs font-bold bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 shadow-2xs"
                        >
                          <span>{item.icon}</span>
                          <span className="truncate max-w-[90px]">{item.name}</span>
                        </span>
                      ))
                    ) : (
                      <span className="text-[11px] text-slate-400 italic">No interests listed</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Click to view full card hint */}
        <div className="mt-2 text-center">
          <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 group-hover:text-[#007ABB] transition-colors">
            Tap a profile to view detailed card
          </span>
        </div>

        {/* Pagination Controls for Multi-User Clusters */}
        {isMulti && totalPages > 1 && (
          <div className="mt-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300">
            <span>
              Page {activePage + 1} of {totalPages} ({users.length} total)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onPrev}
                disabled={activePage === 0}
                aria-label="Previous users"
                className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onNext}
                disabled={activePage >= totalPages - 1}
                aria-label="Next users"
                className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};
