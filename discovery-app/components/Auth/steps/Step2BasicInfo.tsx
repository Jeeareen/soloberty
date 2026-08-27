'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { User as UserIcon, Calendar, ArrowRight, ArrowLeft, AlertCircle } from 'lucide-react';

interface Step2BasicInfoProps {
  formData: {
    name: string;
    age: number | '';
    gender: 'male' | 'female' | 'other';
  };
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  handleStep2Next: (e: React.FormEvent) => void;
  renderErrorAlert?: () => React.ReactNode;
  setStep: (step: number) => void;
}

export const Step2BasicInfo: React.FC<Step2BasicInfoProps> = ({
  formData,
  setFormData,
  handleStep2Next,
  renderErrorAlert,
  setStep,
}) => {
  const [nameError, setNameError] = useState<string | null>(null);
  const [ageError, setAgeError] = useState<string | null>(null);

  const validateName = (name: string) => {
    if (!name.trim()) return 'Please enter your full name.';
    return null;
  };

  const validateAge = (age: number | '') => {
    if (age === '' || typeof age !== 'number' || isNaN(age)) return 'Please enter your age.';
    if (age < 18 || age > 130) return 'Age must be between 18 and 130 years old.';
    return null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nErr = validateName(formData.name);
    const aErr = validateAge(formData.age);

    setNameError(nErr);
    setAgeError(aErr);

    if (nErr || aErr) {
      return;
    }

    handleStep2Next(e);
  };

  return (
    <motion.form
      key="step2"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      onSubmit={handleSubmit}
      noValidate
      className="flex-1 flex flex-col justify-start space-y-3"
    >
      <div className="space-y-1.5 shrink-0 mb-1">
        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-heading font-extrabold tracking-tight text-slate-900 dark:text-white">Basic Info</h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">Step 2: Tell us your name, age, and gender</p>
        </div>

        {renderErrorAlert && renderErrorAlert()}
      </div>

      <div className="space-y-3 py-0.5 px-0.5 shrink-0">
        <div className="space-y-1.5">
          <label htmlFor="signup-name" className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Full Name
          </label>
          <div className="relative">
            <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
            <input
              id="signup-name"
              type="text"
              required
              maxLength={50}
              value={formData.name}
              aria-describedby={nameError ? 'name-error' : undefined}
              aria-invalid={Boolean(nameError)}
              onChange={(e) => {
                const val = e.target.value.replace(/[^a-zA-Z\s\u00C0-\u024F]/g, '');
                setFormData({
                  ...formData,
                  name: val,
                });
                if (nameError) setNameError(validateName(val));
              }}
              onBlur={() => setNameError(validateName(formData.name))}
              placeholder="Alex Morgan"
              className={`w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800/60 border ${
                nameError
                  ? 'border-rose-500 dark:border-rose-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                  : 'border-slate-200 dark:border-slate-700 focus:border-[#00AAFF]'
              } rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:outline-none transition-colors`}
            />
          </div>
          {nameError && (
            <p
              id="name-error"
              className="text-xs font-semibold text-rose-600 dark:text-rose-400 mt-1 flex items-center gap-1.5"
              role="alert"
            >
              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
              <span>{nameError}</span>
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="signup-age" className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Age (18 - 130)
          </label>
          <div className="relative">
            <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
            <input
              id="signup-age"
              type="number"
              required
              min={18}
              max={130}
              value={formData.age}
              aria-describedby={ageError ? 'age-error' : undefined}
              aria-invalid={Boolean(ageError)}
              onChange={(e) => {
                const parsed = e.target.value ? parseInt(e.target.value, 10) : '';
                setFormData({
                  ...formData,
                  age: parsed,
                });
                if (ageError) setAgeError(validateAge(parsed));
              }}
              onBlur={() => setAgeError(validateAge(formData.age))}
              placeholder="25"
              className={`w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800/60 border ${
                ageError
                  ? 'border-rose-500 dark:border-rose-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                  : 'border-slate-200 dark:border-slate-700 focus:border-[#00AAFF]'
              } rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:outline-none transition-colors`}
            />
          </div>
          {ageError && (
            <p
              id="age-error"
              className="text-xs font-semibold text-rose-600 dark:text-rose-400 mt-1 flex items-center gap-1.5"
              role="alert"
            >
              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
              <span>{ageError}</span>
            </p>
          )}
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
                      layoutDependency={formData.gender}
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

      <div className="flex gap-3 pt-2 mt-auto shrink-0">
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
