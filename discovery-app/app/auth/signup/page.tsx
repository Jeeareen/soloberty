'use client';

import React from 'react';
import SignupWizard from '../../../components/Auth/SignupWizard';
import AuthSwitch from '../../../components/Auth/AuthSwitch';

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#090D16] text-slate-900 dark:text-white flex flex-col items-center justify-center p-4 sm:p-6 font-sans transition-colors duration-200">
      <div className="w-full max-w-xl space-y-4">
        {/* Main Wizard Card */}
        <SignupWizard />

        {/* Auth Switcher Component */}
        <AuthSwitch />
      </div>
    </div>
  );
}
