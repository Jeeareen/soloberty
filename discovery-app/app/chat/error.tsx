'use client';

import React from 'react';
import Link from 'next/link';
import { AlertCircle, RefreshCw, ArrowLeft } from 'lucide-react';

interface ChatErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ChatError({ error, reset }: ChatErrorProps) {
  React.useEffect(() => {
    // Log the error to console or error tracking service silently
    console.error('[Chat Route Error Boundary Caught]:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-56px)] sm:h-[calc(100vh-64px)] w-full max-w-4xl mx-auto bg-slate-50 dark:bg-[#090D16] border-x border-slate-200 dark:border-slate-800 p-4">
      <div className="w-full max-w-md p-6 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm text-center space-y-4">
        {/* Neutral Amber/Slate Icon */}
        <div className="w-12 h-12 mx-auto rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
          <AlertCircle className="w-6 h-6" />
        </div>

        {/* Heading & Subtext */}
        <div className="space-y-1">
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
            Something went wrong
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            We couldn't load this chat. Try again or go back to messages.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="w-full sm:w-auto px-4 py-2.5 bg-[#00AAFF] hover:bg-[#0088CC] text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try again</span>
          </button>

          <Link
            href="/chat"
            className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to messages</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
