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
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">Tell us about yourself</h2>
        <p className="text-xs sm:text-sm text-slate-500">Step 2: Enter your name, age, and gender</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Full Name
          </label>
          <div className="relative">
            <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
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
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Age (18 - 130)
          </label>
          <div className="relative">
            <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
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
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Gender Identity
          </label>
          <div className="relative p-1 bg-slate-100/90 rounded-2xl flex items-center border border-slate-200/80 shadow-inner">
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
                  onClick={() => setFormData({ ...formData, gender: g.id as 'male' | 'female' | 'other' })}
                  className="relative flex-1 py-2.5 text-xs font-extrabold text-center transition-colors duration-200 z-10 flex items-center justify-center"
                >
                  {isActive && (
                    <motion.div
                      layoutId="genderSwitchPill"
                      className="absolute inset-0 bg-blue-600 rounded-xl shadow-md"
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
                      hover: { scale: 1.1 },
                    }}
                    transition={{ type: 'tween', ease: 'easeOut', duration: 0.15 }}
                    className={`relative z-10 inline-block origin-center transition-colors duration-200 ${
                      isActive ? 'text-white' : 'text-slate-600 hover:text-slate-900'
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
          className="px-4 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <button
          type="submit"
          className="flex-1 py-3.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
        >
          Continue to Interests
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </motion.form>
  );
};
