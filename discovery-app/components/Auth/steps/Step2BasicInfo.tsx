'use client';

import React from 'react';
import { motion } from 'motion/react';
import { User as UserIcon, Calendar, ArrowRight, ArrowLeft } from 'lucide-react';

interface Step2BasicInfoProps {
  formData: {
    name: string;
    age: number | '';
    gender: 'male' | 'female' | 'other';
  };
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  handleStep2Next: (e: React.FormEvent) => void;
  setStep: (step: number) => void;
}

export const Step2BasicInfo: React.FC<Step2BasicInfoProps> = ({
  formData,
  setFormData,
  handleStep2Next,
  setStep,
}) => {
  return (
    <motion.form
      key="step2"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      onSubmit={handleStep2Next}
      className="space-y-5"
    >
      <div className="space-y-1">
        <h2 className="text-xl sm:text-2xl font-heading font-extrabold tracking-tight text-slate-900 dark:text-white">Basic Info</h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">Step 2: Tell us your name, age, and gender</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Full Name
          </label>
          <div className="relative">
            <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              required
              maxLength={50}
              value={formData.name}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  name: e.target.value.replace(/[^a-zA-Z\s\u00C0-\u024F]/g, ''),
                })
              }
              placeholder="Alex Morgan"
              className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-[#00AAFF] transition-colors"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Age (18 - 130)
          </label>
          <div className="relative">
            <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
            <input
              type="number"
              required
              min={18}
              max={130}
              value={formData.age}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  age: e.target.value ? parseInt(e.target.value, 10) : '',
                })
              }
              placeholder="25"
              className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-[#00AAFF] transition-colors"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Gender Identity
          </label>
          <div className="relative p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl flex items-center border border-slate-200/80 dark:border-slate-700/80 shadow-inner">
            {[
              { id: 'male', label: 'Male' },
              { id: 'female', label: 'Female' },
              { id: 'other', label: 'Other' },
            ].map((g) => {
              const isActive = formData.gender === g.id;
              return (
                <motion.button
                  key={g.id}
                  type="button"
                  initial="rest"
                  whileHover="hover"
                  animate="rest"
                  onClick={() => setFormData({ ...formData, gender: g.id as any })}
                  className="relative flex-1 py-2.5 px-3 text-center transition-colors duration-200 z-10 rounded-xl cursor-pointer"
                >
                  {isActive && (
                    <motion.div
                      layoutId="signupGenderPill"
                      className="absolute inset-0 bg-[#00AAFF] dark:bg-[#B8E7FF] rounded-xl shadow-md"
                      transition={{
                        type: 'spring',
                        stiffness: 500,
                        damping: 30,
                        mass: 0.7,
                      }}
                    />
                  )}
                  <motion.span
                    variants={{
                      rest: { scale: 1 },
                      hover: { scale: 1.03 },
                    }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    className={`relative z-10 font-bold text-xs sm:text-sm block ${
                      isActive ? 'text-white dark:text-slate-900' : 'text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    {g.label}
                  </motion.span>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={() => setStep(1)}
          className="px-4 py-3.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <button
          type="submit"
          className="flex-1 py-3.5 px-4 bg-[#00AAFF] hover:bg-[#0088CC] dark:bg-[#B8E7FF] dark:hover:bg-[#99D8FF] text-white dark:text-slate-900 font-extrabold text-sm rounded-xl shadow-lg shadow-[#00AAFF]/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          Continue to Interests
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </motion.form>
  );
};
