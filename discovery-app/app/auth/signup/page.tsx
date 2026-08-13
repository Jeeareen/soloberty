'use client';

import React from 'react';
import SignupWizard from '../../../components/Auth/SignupWizard';
import AuthSwitch from '../../../components/Auth/AuthSwitch';

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center justify-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-xl space-y-4">
        {/* Main Wizard Card */}
        <SignupWizard />

        {/* Auth Switcher Component */}
        <AuthSwitch />
      </div>
    </div>
  );
}
