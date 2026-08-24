'use client';

import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, Loader2, ArrowRight, ArrowLeft } from 'lucide-react';

import { ScoutBioButton } from '../ScoutBioButton';

interface Step4BioScoutProps {
  bio: string;
  setBio: (bio: string) => void;
  generatingBio: boolean;
  handleGenerateBio: () => Promise<void>;
  handleStep4Next: () => void;
  renderErrorAlert: () => React.ReactNode;
  setStep: (step: number) => void;
}

/** Counts characters excluding all whitespace (spaces, tabs, newlines) */
export const getBioCharCount = (text: string): number => {
  return (text || '').replace(/\s+/g, '').length;
};

export const Step4BioScout: React.FC<Step4BioScoutProps> = ({
  bio,
  setBio,
  generatingBio,
  handleGenerateBio,
  handleStep4Next,
  renderErrorAlert,
  setStep,
}) => {
  const bioCharCount = getBioCharCount(bio);

  return (
    <motion.div
      key="step4"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-5"
    >
      <div className="space-y-1">
        <h2 className="text-xl sm:text-2xl font-heading font-extrabold tracking-tight text-slate-900 dark:text-white">Create your bio</h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Step 4: Write a short bio or let <span className="text-[#00AAFF] dark:text-[#B8E7FF] font-bold">Soloberty Scout</span> draft one for you!
        </p>
      </div>

      {renderErrorAlert()}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Your Bio (30 - 300 characters)
          </label>
          <ScoutBioButton
            onClick={handleGenerateBio}
            disabled={generatingBio}
            overrideState={generatingBio ? 'loading' : null}
          />
        </div>

        <div className="relative">
          <textarea
            rows={5}
            maxLength={400}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Share a little bit about what you love, your vibe, or what kind of connections you're hoping to make..."
            className="w-full p-4 pb-10 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-[#00AAFF] transition-colors resize-none leading-relaxed"
          />
          <div
            className={`absolute bottom-3 right-3 text-[11px] font-semibold px-2 py-0.5 rounded-full border pointer-events-none backdrop-blur-sm ${
              bioCharCount >= 30 && bioCharCount <= 300
                ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-50/90 dark:bg-emerald-950/80 border-emerald-200 dark:border-emerald-800'
                : 'text-slate-500 dark:text-slate-400 bg-white/90 dark:bg-slate-800/90 border-slate-200 dark:border-slate-700'
            }`}
          >
            {bioCharCount} / 300 (min 30)
          </div>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={() => setStep(3)}
          className="px-4 py-3.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <button
          type="button"
          onClick={handleStep4Next}
          className="flex-1 py-3.5 px-4 bg-[#00AAFF] hover:bg-[#0088CC] dark:bg-[#B8E7FF] dark:hover:bg-[#99D8FF] text-white dark:text-slate-900 font-extrabold text-sm rounded-xl shadow-lg shadow-[#00AAFF]/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          Continue to Location
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
};
