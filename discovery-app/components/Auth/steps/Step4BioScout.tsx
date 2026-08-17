'use client';

import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, Loader2, ArrowRight, ArrowLeft } from 'lucide-react';

interface Step4BioScoutProps {
  bio: string;
  setBio: (bio: string) => void;
  generatingBio: boolean;
  handleGenerateBio: () => Promise<void>;
  handleStep4Next: () => void;
  renderErrorAlert: () => React.ReactNode;
  setStep: (step: number) => void;
}

export const Step4BioScout: React.FC<Step4BioScoutProps> = ({
  bio,
  setBio,
  generatingBio,
  handleGenerateBio,
  handleStep4Next,
  renderErrorAlert,
  setStep,
}) => {
  const bioTrimmedLength = bio.trim().length;

  return (
    <motion.div
      key="step4"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-5"
    >
      <div className="space-y-1">
        <h2 className="text-xl sm:text-2xl font-heading font-extrabold tracking-tight text-slate-900">Create your bio</h2>
        <p className="text-xs sm:text-sm text-slate-500">
          Step 4: Write a short bio or let <span className="text-[#00AAFF] font-bold">Soloberty Scout</span> draft one for you!
        </p>
      </div>

      {renderErrorAlert()}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Your Bio (30 - 300 characters)
          </label>
          <button
            type="button"
            onClick={handleGenerateBio}
            disabled={generatingBio}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#00AAFF] hover:bg-[#0088CC] text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50"
          >
            {generatingBio ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Scout is drafting...
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-amber-200 animate-pulse" />
                Auto-generate with Scout
              </>
            )}
          </button>
        </div>

        <div className="relative">
          <textarea
            rows={4}
            minLength={30}
            maxLength={300}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Share a little bit about what you love, your vibe, or what kind of connections you're hoping to make..."
            className="w-full p-4 pb-10 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-900 focus:outline-none focus:border-[#00AAFF] focus:bg-white focus:ring-2 focus:ring-[#B8E7FF] resize-none leading-relaxed"
          />
          <div
            className={`absolute bottom-3 right-3 text-[11px] font-semibold px-2 py-0.5 rounded-full border pointer-events-none backdrop-blur-sm ${
              bioTrimmedLength >= 30 && bioTrimmedLength <= 300
                ? 'text-emerald-700 bg-emerald-50/90 border-emerald-200'
                : 'text-slate-500 bg-white/90 border-slate-200'
            }`}
          >
            {bio.length} / 300 (min 30)
          </div>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={() => setStep(3)}
          className="px-4 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <button
          type="button"
          onClick={handleStep4Next}
          disabled={bioTrimmedLength < 30 || bioTrimmedLength > 300}
          className="flex-1 py-3.5 px-4 bg-[#00AAFF] hover:bg-[#0088CC] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl shadow-lg shadow-[#00AAFF]/20 transition-all flex items-center justify-center gap-2"
        >
          Continue to Location
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
};
