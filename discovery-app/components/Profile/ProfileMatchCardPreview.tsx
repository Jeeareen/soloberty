'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { MapPin, User } from 'lucide-react';
import { PREDEFINED_INTERESTS } from '../../types/user';
import { getOptimizedCloudinaryUrl } from '../../lib/cloudinary';

const GenderSymbol: React.FC<{ gender: string; className?: string }> = ({
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
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v7m-3-3h6" />
      </svg>
    );
  }
  if (g === 'male') {
    return (
      <svg
        className={`${className} text-blue-500 dark:text-[#007ABB] shrink-0 inline-block`}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        viewBox="0 0 24 24"
        aria-label="Male"
      >
        <circle cx="10" cy="14" r="6" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.5 9.5L20 4m0 0h-5m5 0v5" />
      </svg>
    );
  }
  return (
    <svg
      className={`${className} text-gray-400 dark:text-slate-400 shrink-0 inline-block`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      viewBox="0 0 24 24"
      aria-label="Other"
    >
      <circle cx="12" cy="12" r="6" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v4m-2-2h4M12 6V2m-2 2h4" />
    </svg>
  );
};

export interface ProfileMatchCardPreviewProps {
  name: string;
  age: number | string;
  gender: string;
  bio: string;
  photoUrl?: string | null;
  city?: string;
  interests?: string[];
  interestPhotos?: string[];
}

export const ProfileMatchCardPreview: React.FC<ProfileMatchCardPreviewProps> = ({
  name,
  age,
  gender,
  bio,
  photoUrl,
  city,
  interests = [],
  interestPhotos = [],
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isHeld, setIsHeld] = useState(false);

  const selectedInterests = interests.map(
    (id) => PREDEFINED_INTERESTS.find((i) => i.id === id) || { id, name: id, icon: '✨' }
  );

  return (
    <div className="flex flex-col items-center justify-center w-full sticky top-4 sm:top-6 [perspective:1000px] overflow-hidden">
      <div className="flex items-center justify-between w-full max-w-[420px] mb-3 px-1">
        <span className="text-xs font-heading font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Your Live MatchCard
        </span>
      </div>
      <div className="w-full max-w-[420px] flex justify-center overflow-hidden py-1">
        {/* Active Card Container (Fluid responsive width on mobile, locked 2:3 aspect ratio) */}
        <motion.div
          role="button"
          tabIndex={0}
          aria-label={`${name}, ${bio}. Tap to flip card`}
          onClick={() => setIsFlipped((prev) => !prev)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setIsFlipped((prev) => !prev);
            }
          }}
          onPointerDown={() => setIsHeld(true)}
          onPointerUp={() => setIsHeld(false)}
          onPointerCancel={() => setIsHeld(false)}
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ rotateY: { duration: 0.4, ease: 'easeInOut' } }}
          className="relative flex w-full max-w-[400px] aspect-[2/3] h-auto max-h-[75vh] cursor-pointer flex-col rounded-[14px] bg-white dark:bg-[#0F172A] border-2 border-slate-300 dark:border-slate-700 [transform-style:preserve-3d] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#007ABB]/60"
        >
          {/* Inner Tap/Hold Scale Container */}
          <motion.div
            animate={{ scale: isHeld ? 1.05 : 1 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            className="relative h-full w-full [transform-style:preserve-3d]"
          >
            {/* Front Face */}
            <div className="absolute inset-0 flex flex-col bg-white dark:bg-[#0F172A] rounded-xl overflow-hidden [backface-visibility:hidden]">
              {/* Rectangular PP taking top ~35% with Name, Gender Symbol & Age overlay */}
              <div className="relative w-full h-52 sm:h-56 shrink-0 bg-slate-100 dark:bg-slate-800 overflow-hidden">
                {photoUrl ? (
                  <img src={getOptimizedCloudinaryUrl(photoUrl)} alt={name} loading="lazy" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-[#E8F4FC] dark:bg-slate-800 text-[#007ABB] dark:text-[#B8E7FF] flex items-center justify-center">
                    <User className="w-20 h-20" />
                  </div>
                )}

                {/* Profile Picture Name Overlay */}
                <div className="absolute inset-x-0 bottom-0 p-4">
                  <h2 className="text-xl sm:text-2xl font-heading font-extrabold tracking-tight truncate text-white">
                    {name || 'Soloberty Member'}
                  </h2>
                </div>
              </div>

              {/* Content Below PP */}
              <div className="flex-1 flex flex-col p-5 space-y-3.5">
                {/* Location Tag right below PP (1.25x font size) */}
                <div className="flex items-center gap-1.5 text-sm sm:text-base font-bold text-[#007ABB] dark:text-[#B8E7FF]">
                  <MapPin className="w-4 h-4 shrink-0 text-[#007ABB]" />
                  <span>{city || 'Vienna, AT'}</span>
                </div>

                {/* 3 Interests as Bulletpoints (1.25x font size) */}
                <div className="space-y-1.5 flex-1">
                  <span className="text-xs font-heading font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                    Interests
                  </span>
                  <ul className="space-y-2.5 pt-0.5">
                    {selectedInterests.length > 0 ? (
                      selectedInterests.slice(0, 3).map((item, idx) => (
                        <li
                          key={idx}
                          className="flex items-center gap-2.5 text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100"
                        >
                          <span className="text-[#007ABB] font-black text-base">•</span>
                          <span className="text-lg sm:text-xl shrink-0">{item.icon || '✨'}</span>
                          <span className="truncate">{item.name}</span>
                        </li>
                      ))
                    ) : (
                      <li className="text-xs text-slate-400 italic">No interests selected yet</li>
                    )}
                  </ul>
                </div>

                {/* Footer Hint */}
                <div className="mt-auto pt-2.5 flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400 italic border-t border-gray-100 dark:border-slate-800">
                  <span>Tap card to view bio & photos</span>
                  <span>🔄</span>
                </div>
              </div>
            </div>

            {/* Back Face (Name, Age, Gender / Bio / Interest Images) */}
            <div className="absolute inset-0 flex flex-col p-6 bg-white dark:bg-[#0F172A] rounded-xl [transform:rotateY(180deg)] [backface-visibility:hidden]">
              {/* Top: Name, Age, Gender (1.25x font size) */}
              <div className="flex items-center gap-2 pb-3 border-b border-gray-100 dark:border-slate-800 shrink-0">
                <GenderSymbol gender={gender} className="w-6 h-6 shrink-0" />
                <h2 className="text-xl sm:text-2xl font-heading font-extrabold text-gray-900 dark:text-white truncate">
                  {name || 'Soloberty Member'}{age ? `, ${age}` : ''}
                </h2>
              </div>

              {/* Middle: Bio (1x font size, auto-wrapping without horizontal scrolling) */}
              <div className="mt-3 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 leading-relaxed overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden flex-1 space-y-1 pr-1">
                <span className="text-xs font-heading font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1">
                  Bio
                </span>
                <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{bio || 'No bio provided yet.'}</p>
              </div>

              {/* Bottom Section: Interest Photos */}
              <div className="mt-auto pt-3 border-t border-gray-100 dark:border-slate-800 space-y-2.5 shrink-0">
                <div className="space-y-1">
                  <span className="text-xs font-heading font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                    Interest Photos
                  </span>
                  {interestPhotos.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2">
                      {interestPhotos.slice(0, 3).map((url, idx) => (
                        <div
                          key={idx}
                          className="aspect-square rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100"
                        >
                          <img src={getOptimizedCloudinaryUrl(url)} alt={`Interest ${idx + 1}`} loading="lazy" className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No interest photos uploaded</p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default ProfileMatchCardPreview;
