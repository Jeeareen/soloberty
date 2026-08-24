'use client';

import React, { useState } from 'react';
import { ScoutBioButton, ButtonState } from '../../../components/Auth/ScoutBioButton';
import { Sparkles, ShieldAlert, Eye, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function MotionButtonDemoPage() {
  const [overrideState, setOverrideState] = useState<ButtonState | null>(null);
  const [forceReducedMotion, setForceReducedMotion] = useState<boolean>(false);
  const [isDisabled, setIsDisabled] = useState<boolean>(false);
  const [bioText, setBioText] = useState<string>(
    'Passionate software builder crafting high-delight UI micro-interactions.'
  );
  const [logs, setLogs] = useState<string[]>([
    'Demo initialized. Click "Auto-generate with Scout" or use control triggers below.',
  ]);

  const addLog = (msg: string) => {
    setLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 7)]);
  };

  const handleSimulatedAsync = async () => {
    addLog('Async call started (simulating Scout AI generation)...');
    return new Promise<void>((resolve, reject) => {
      const delay = 1200 + Math.random() * 800; // random delay 1.2s - 2s
      setTimeout(() => {
        const isSuccess = Math.random() > 0.2; // 80% success, 20% failure
        if (isSuccess) {
          setBioText(
            'Full-stack frontend builder who loves crafting smooth micro-interactions, responsive UI components, and accessible motion design.'
          );
          addLog('Async call resolved: SUCCESS (80% path)');
          resolve();
        } else {
          addLog('Async call failed: ERROR (20% random failure path)');
          reject(new Error('Simulated network/timeout error'));
        }
      }, delay);
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans p-4 sm:p-8 md:p-12 transition-colors">
      <div className="max-w-4xl mx-auto space-y-10">
        {/* Header */}
        <header className="space-y-3 border-b border-slate-200 dark:border-slate-800 pb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#00AAFF]/10 text-[#00AAFF] border border-[#00AAFF]/20 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
                FE-AA1 Assignment Showcase
              </span>
              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Buttons with a Brain: Motion & State Micro-interactions
              </h1>
            </div>
            <Link
              href="/auth/signup"
              className="text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3.5 py-2 rounded-xl transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              View in Signup Wizard
            </Link>
          </div>
          <p className="text-slate-600 dark:text-slate-400 text-sm max-w-2xl">
            A stateful micro-interaction system choreographing 5 distinct states: <code className="text-[#00AAFF] dark:text-sky-300 font-mono">idle</code>,{' '}
            <code className="text-[#00AAFF] dark:text-sky-300 font-mono">hover/focus</code>, <code className="text-[#00AAFF] dark:text-sky-300 font-mono">loading</code>,{' '}
            <code className="text-emerald-600 dark:text-emerald-300 font-mono">success</code>, and <code className="text-rose-600 dark:text-rose-300 font-mono">error</code> (+ disabled bonus).
          </p>
        </header>

        {/* Interactive Demo Card Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Main Component Card */}
          <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-6 flex flex-col justify-between shadow-sm dark:shadow-xl transition-colors">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#00AAFF] dark:text-sky-400" />
                  Primary Component: Scout AI Bio Generator
                </h2>
                <span className="text-[11px] font-mono bg-sky-50 dark:bg-sky-500/10 text-[#00AAFF] dark:text-sky-400 px-2 py-0.5 rounded-md border border-sky-100 dark:border-transparent">
                  ScoutBioButton.tsx
                </span>
              </div>

              {/* The Main Stateful Button */}
              <div className="p-6 bg-slate-50/80 dark:bg-slate-950/40 border border-slate-200/80 dark:border-slate-800/60 rounded-2xl flex flex-col items-center justify-center gap-3">
                <ScoutBioButton
                  onClick={handleSimulatedAsync}
                  overrideState={overrideState}
                  forceReducedMotion={forceReducedMotion}
                  disabled={isDisabled}
                  className="px-5 py-2.5 text-sm"
                />
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {overrideState ? `State forced: ${overrideState}` : 'Click to run fake async (20% random failure rate)'}
                </span>
              </div>
            </div>

            {/* Quick manual state triggers */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/60">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Manual State Override Triggers:</span>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setOverrideState(null)}
                  className={`px-2.5 py-1 text-xs rounded-lg border font-semibold transition-colors cursor-pointer ${
                    overrideState === null
                      ? 'bg-sky-50 dark:bg-sky-500/20 text-[#00AAFF] dark:text-sky-300 border-sky-200 dark:border-sky-500/40'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Auto (Normal)
                </button>
                <button
                  onClick={() => setOverrideState('idle')}
                  className="px-2.5 py-1 text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold cursor-pointer"
                >
                  Idle
                </button>
                <button
                  onClick={() => setOverrideState('loading')}
                  className="px-2.5 py-1 text-xs bg-sky-50 dark:bg-sky-950 text-[#00AAFF] dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900 rounded-lg border border-sky-200 dark:border-sky-800 font-semibold cursor-pointer"
                >
                  Loading
                </button>
                <button
                  onClick={() => setOverrideState('success')}
                  className="px-2.5 py-1 text-xs bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900 rounded-lg border border-emerald-200 dark:border-emerald-800 font-semibold cursor-pointer"
                >
                  Success
                </button>
                <button
                  onClick={() => setOverrideState('error')}
                  className="px-2.5 py-1 text-xs bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900 rounded-lg border border-rose-200 dark:border-rose-800 font-semibold cursor-pointer"
                >
                  Error
                </button>
              </div>
            </div>
          </div>

          {/* Controls & Event Console */}
          <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-6 flex flex-col justify-between shadow-sm dark:shadow-xl transition-colors">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                  Accessibility & Demo Controls
                </h2>
              </div>

              {/* Accessibility & State Controls */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5 font-medium">
                    Force Reduced Motion:
                  </span>
                  <button
                    onClick={() => {
                      setForceReducedMotion((prev) => !prev);
                      addLog(`Reduced Motion toggled: ${!forceReducedMotion}`);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                      forceReducedMotion
                        ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:text-slate-900 dark:hover:text-white shadow-sm'
                    }`}
                  >
                    {forceReducedMotion ? 'ON (Dampened Motion)' : 'OFF (Standard Motion)'}
                  </button>
                </div>

                <div className="flex items-center justify-between text-xs pt-3 border-t border-slate-200 dark:border-slate-800/60">
                  <span className="text-slate-600 dark:text-slate-400 font-medium">Toggle Disabled State:</span>
                  <button
                    onClick={() => {
                      setIsDisabled((prev) => !prev);
                      addLog(`Disabled state toggled: ${!isDisabled}`);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                      isDisabled
                        ? 'bg-slate-800 dark:bg-slate-700 text-white border border-slate-700 dark:border-slate-600'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:text-slate-900 dark:hover:text-white shadow-sm'
                    }`}
                  >
                    {isDisabled ? 'Disabled' : 'Enabled'}
                  </button>
                </div>
              </div>
            </div>

            {/* Event Console */}
            <div className="space-y-2">
              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider block">State Event Console</span>
              <div className="p-3.5 bg-slate-900 dark:bg-slate-950 border border-slate-800 rounded-2xl font-mono text-[11px] text-slate-300 dark:text-slate-400 h-36 overflow-y-auto space-y-1.5 leading-relaxed">
                {logs.map((log, idx) => (
                  <div key={idx} className={idx === 0 ? 'text-sky-400 dark:text-sky-300 font-semibold' : ''}>
                    {log}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Assignment Note & Rationale Section */}
        <section className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4 shadow-sm dark:shadow-none transition-colors">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Eye className="w-5 h-5 text-[#00AAFF] dark:text-sky-400" />
            Motion Choreography & System Rationale
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-700 dark:text-slate-300">
            <div className="p-4 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-2xl space-y-1.5">
              <h3 className="font-extrabold text-[#00AAFF] dark:text-sky-400">1. Stiff Click Spring & Pop Icon Reveal</h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Uses a stiff click spring (<code className="text-slate-900 dark:text-slate-200 font-mono">stiffness: 700, damping: 18</code>) for tactile feedback. All state icons share the identical pop curve (<code className="text-slate-900 dark:text-slate-200 font-mono">scale: [0, 1.2, 1]</code>).
              </p>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-2xl space-y-1.5">
              <h3 className="font-extrabold text-emerald-600 dark:text-emerald-400">2. Fixed Width & Pure Opacity Crossfade</h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Button width is locked at <code className="text-slate-900 dark:text-slate-200 font-mono">220px</code> with pure opacity crossfades between states to prevent layout shifts. Gentle AI breathing pulse (<code className="text-slate-900 dark:text-slate-200 font-mono">1.2s</code>) during loading.
              </p>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-2xl space-y-1.5">
              <h3 className="font-extrabold text-rose-600 dark:text-rose-400">3. Interaction Guard & Reduced Motion</h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Prevents double-triggers during loading & hold states (<code className="text-slate-900 dark:text-slate-200 font-mono">cursor-not-allowed</code>). Suppresses shake/float under <code className="text-slate-900 dark:text-slate-200 font-mono">prefers-reduced-motion</code> while keeping color state feedback.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
