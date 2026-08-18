'use client';

import React from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, ArrowRight, ArrowLeft } from 'lucide-react';
import { PREDEFINED_INTERESTS } from '../../../types/user';

interface Step3InterestsProps {
  interests: string[];
  toggleInterest: (id: string) => void;
  handleStep3Next: () => void;
  setStep: (step: number) => void;
}

export const Step3Interests: React.FC<Step3InterestsProps> = ({
  interests,
  toggleInterest,
  handleStep3Next,
  setStep,
}) => {
  return (
    <motion.div
      key="step3"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-5"
    >
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <h2 className="text-xl sm:text-2xl font-heading font-extrabold tracking-tight text-slate-900 dark:text-white">Select your interests</h2>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#B8E7FF]/40 dark:bg-[#B8E7FF]/20 text-[#0088CC] dark:text-[#B8E7FF] border border-[#B8E7FF]/60 dark:border-[#B8E7FF]/30">
            {interests.length} / 3 selected
          </span>
        </div>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Step 3: Choose <span className="text-slate-900 dark:text-white font-bold">at most 3</span> hobbies or passions
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[320px] overflow-y-auto pr-1">
        {PREDEFINED_INTERESTS.map((item) => {
          const isSelected = interests.includes(item.id);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => toggleInterest(item.id)}
              className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all relative cursor-pointer ${
                isSelected
                  ? 'bg-[#B8E7FF]/60 dark:bg-[#B8E7FF]/25 border-[#00AAFF] text-[#0088CC] dark:text-[#B8E7FF] shadow-sm'
                  : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-2">
                <span className="text-2xl">{item.icon}</span>
                {isSelected && (
                  <CheckCircle2 className="w-4 h-4 text-[#00AAFF] dark:text-[#B8E7FF] absolute top-2.5 right-2.5" />
                )}
              </div>
              <span className="text-xs font-bold line-clamp-1">{item.name}</span>
            </button>
          );
        })}
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={() => setStep(2)}
          className="px-4 py-3.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <button
          type="button"
          onClick={handleStep3Next}
          disabled={interests.length === 0 || interests.length > 3}
          className="flex-1 py-3.5 px-4 bg-[#00AAFF] hover:bg-[#0088CC] dark:bg-[#B8E7FF] dark:hover:bg-[#99D8FF] text-white dark:text-slate-900 font-extrabold text-sm rounded-xl shadow-lg shadow-[#00AAFF]/20 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          Continue to Bio
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
};
