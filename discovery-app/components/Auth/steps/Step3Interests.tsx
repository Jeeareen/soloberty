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
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">Select your interests</h2>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
            {interests.length} / 3 selected
          </span>
        </div>
        <p className="text-xs sm:text-sm text-slate-500">
          Step 3: Choose <span className="text-slate-900 font-bold">at most 3</span> hobbies or passions
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
              className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all relative ${
                isSelected
                  ? 'bg-blue-50 border-slate-200 text-blue-900 shadow-sm'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-2">
                <span className="text-2xl">{item.icon}</span>
                {isSelected && (
                  <CheckCircle2 className="w-4 h-4 text-blue-600 absolute top-2.5 right-2.5" />
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
          className="px-4 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <button
          type="button"
          onClick={handleStep3Next}
          disabled={interests.length === 0 || interests.length > 3}
          className="flex-1 py-3.5 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
        >
          Continue to Bio
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
};
