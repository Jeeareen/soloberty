'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, CheckCircle2, RefreshCw, LogOut, ArrowRight } from 'lucide-react';
import { auth } from '../../../lib/firebase/config';
import { useAuth } from '../../../lib/hooks/useAuth';
import { SolobertyLogo } from '../../../components/SolobertyLogo';

export default function VerifyEmailPage() {
  const router = useRouter();
  const { user, loading, logout, resendVerificationEmail, checkEmailVerification } = useAuth();

  const [email, setEmail] = useState<string>('');
  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (auth.currentUser?.email) {
      setEmail(auth.currentUser.email);
    } else if (user?.email) {
      setEmail(user.email);
    }
  }, [user]);

  useEffect(() => {
    if (user?.emailVerified) {
      router.replace('/feed');
    }
  }, [user, router]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleCheckVerified = async () => {
    if (!checkEmailVerification) return;
    setChecking(true);
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      const verified = await checkEmailVerification();
      if (verified) {
        setStatusMessage('Email verified! Redirecting you to Soloberty...');
        setTimeout(() => router.push('/feed'), 800);
      } else {
        setErrorMessage('Not verified yet. Please click the link in your inbox (and check spam), then try again.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Could not check verification status. Please try again.');
    } finally {
      setChecking(false);
    }
  };

  const handleResend = async () => {
    if (!resendVerificationEmail || cooldown > 0) return;
    setResending(true);
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      await resendVerificationEmail();
      setStatusMessage('Verification email sent! Please check your inbox and spam folder.');
      setCooldown(60);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Could not resend verification email. Please wait a moment and try again.');
    } finally {
      setResending(false);
    }
  };

  const handleSignOut = async () => {
    await logout();
    router.push('/auth/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FCF9F2] flex items-center justify-center p-6">
        <div className="w-8 h-8 rounded-full border-2 border-[#B84A00] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FCF9F2] text-[#2C2C2C] flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white border border-[#E6DFD3] rounded-3xl p-8 shadow-sm">
        <div className="flex justify-center mb-6">
          <Link href="/" aria-label="Soloberty Home">
            <SolobertyLogo />
          </Link>
        </div>

        <div className="w-14 h-14 rounded-2xl bg-[#FFF3EB] text-[#B84A00] flex items-center justify-center mx-auto mb-5">
          <Mail className="w-7 h-7" aria-hidden="true" />
        </div>

        <h1 className="text-2xl font-bold text-center text-[#1F1F1F] mb-2">
          Verify your email
        </h1>

        <p className="text-sm text-[#5A5A5A] text-center mb-6 leading-relaxed">
          {email ? (
            <>
              We sent a verification link to{' '}
              <span className="font-semibold text-[#1F1F1F] break-all">{email}</span>.
              Click the link in your inbox to activate your account.
            </>
          ) : (
            'Please log in and click the verification link sent to your email address.'
          )}
        </p>

        {statusMessage && (
          <div
            role="status"
            aria-live="polite"
            className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-start gap-2.5"
          >
            <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
            <span>{statusMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div
            role="alert"
            className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm"
          >
            {errorMessage}
          </div>
        )}

        <div className="space-y-3">
          <button
            type="button"
            onClick={handleCheckVerified}
            disabled={checking || !auth.currentUser}
            className="w-full py-3.5 px-4 rounded-xl bg-[#B84A00] hover:bg-[#9E3F00] text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {checking ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" aria-hidden="true" />
                Checking...
              </>
            ) : (
              <>
                I&apos;ve verified my email
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleResend}
            disabled={resending || cooldown > 0 || !auth.currentUser}
            className="w-full py-3 px-4 rounded-xl border border-[#E6DFD3] bg-[#FCF9F2] hover:bg-[#F5EFE4] text-[#2C2C2C] font-medium text-sm transition-colors disabled:opacity-50"
          >
            {resending
              ? 'Sending...'
              : cooldown > 0
                ? `Resend email (${cooldown}s)`
                : 'Resend verification email'}
          </button>

          <button
            type="button"
            onClick={handleSignOut}
            className="w-full py-2.5 px-4 rounded-xl text-sm text-[#6B6B6B] hover:text-[#1F1F1F] transition-colors flex items-center justify-center gap-1.5"
          >
            <LogOut className="w-4 h-4" aria-hidden="true" />
            Use a different email
          </button>
        </div>
      </div>
    </div>
  );
}
