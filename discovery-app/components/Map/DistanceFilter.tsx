'use client';

import React from 'react';
import { motion } from 'motion/react';

export type DistanceOption = 5 | 25 | 50 | 100 | 'any';

interface DistanceFilterProps {
  selectedDistance: DistanceOption;
  onChange: (distance: DistanceOption) => void;
}

const DISTANCE_OPTIONS: { label: string; value: DistanceOption }[] = [
  { label: '5 km', value: 5 },
  { label: '25 km', value: 25 },
  { label: '50 km', value: 50 },
  { label: '100 km', value: 100 },
  { label: 'Any', value: 'any' },
];

export const DistanceFilter: React.FC<DistanceFilterProps> = ({
  selectedDistance,
  onChange,
}) => {
  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] max-w-md">
      <div className="bg-white/95 dark:bg-[#0F172A]/95 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-xl p-1.5 flex items-center justify-center">
        {/* Distance Selector Pills */}
        <div className="relative flex items-center gap-1 bg-slate-100/80 dark:bg-slate-800/80 p-1 rounded-xl">
          {DISTANCE_OPTIONS.map((opt) => {
            const isSelected = selectedDistance === opt.value;
            return (
              <button
                key={opt.label}
                type="button"
                onClick={() => onChange(opt.value)}
                className={`relative h-7 px-3 flex items-center justify-center text-xs font-heading font-extrabold rounded-lg transition-colors cursor-pointer leading-none select-none ${
                  isSelected
                    ? 'text-white dark:text-slate-900'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {isSelected && (
                  <motion.div
                    layoutId="activeDistanceFilter"
                    className="absolute inset-0 bg-[#00AAFF] dark:bg-[#B8E7FF] rounded-lg shadow-sm -z-0"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

