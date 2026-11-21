'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import {
  MapPin,
  ArrowRight,
  LogIn,
  Sliders,
  Code2,
  X,
  Activity,
} from 'lucide-react';
import {
  MAX_RIPPLES,
  MAX_TRAIL,
  VERTEX_SHADER_SOURCE,
  FRAGMENT_SHADER_SOURCE,
  REDUCED_MOTION_ONE_LINER,
} from './rippleAuroraShader';

export interface ShaderHeroProps {
  /** Optional override for testing reduced-motion fallback in unit tests or demo controls */
  forceReducedMotion?: boolean;
  /** When true, hides the Log In / Sign Up CTA button */
  isAuthenticated?: boolean;
}

const AnimatedSlidersIcon: React.FC<{ isOpen: boolean; className?: string }> = ({
  isOpen,
  className = 'w-3.5 h-3.5',
}) => {
  const spring = { type: 'spring' as const, stiffness: 450, damping: 24 };
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* Vertical tracks */}
      <line x1="4" y1="3" x2="4" y2="21" opacity="0.45" />
      <line x1="12" y1="3" x2="12" y2="21" opacity="0.45" />
      <line x1="20" y1="3" x2="20" y2="21" opacity="0.45" />

      {/* Animated lever knobs */}
      <motion.line
        x1="1.5"
        x2="6.5"
        y1="14"
        y2="14"
        animate={{ y: isOpen ? -6 : 0 }}
        transition={spring}
      />
      <motion.line
        x1="9.5"
        x2="14.5"
        y1="8"
        y2="8"
        animate={{ y: isOpen ? 8 : 0 }}
        transition={spring}
      />
      <motion.line
        x1="17.5"
        x2="22.5"
        y1="16"
        y2="16"
        animate={{ y: isOpen ? -6 : 0 }}
        transition={spring}
      />
    </svg>
  );
};

function compileShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.warn('Shader compile error:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createShaderProgram(
  gl: WebGLRenderingContext,
  vsSource: string,
  fsSource: string
): WebGLProgram | null {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vsSource);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fsSource);
  if (!vs || !fs) return null;

  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.warn('Program link error:', gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

export const ShaderHero: React.FC<ShaderHeroProps> = ({
  forceReducedMotion = false,
  isAuthenticated = false,
}) => {
  const containerRef = useRef<HTMLElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // User-configurable lerp factor (defaults to 0.1 on initial load/refresh; preserved while on page)
  const [lerpFactor, setLerpFactor] = useState<number>(0.1);
  const lerpFactorRef = useRef<number>(0.1);
  useEffect(() => {
    lerpFactorRef.current = lerpFactor;
  }, [lerpFactor]);

  // System + manual reduced-motion state
  const [osReducedMotion, setOsReducedMotion] = useState<boolean>(false);
  const [manualReducedMotion, setManualReducedMotion] = useState<boolean>(false);
  const [webglUnsupported, setWebglUnsupported] = useState<boolean>(false);

  // Inspector drawer & code modal states for mentor walkthrough
  const [inspectorOpen, setInspectorOpen] = useState<boolean>(false);
  const [showShaderSource, setShowShaderSource] = useState<boolean>(false);
  const [isPausedByVisibility, setIsPausedByVisibility] = useState<boolean>(false);

  // Mutable refs for 60fps animation without triggering React re-renders every frame
  const targetMouseRef = useRef<{ x: number; y: number }>({ x: 0.5, y: 0.5 });
  const lerpedMouseRef = useRef<{ x: number; y: number }>({ x: 0.5, y: 0.5 });
  const pendingClickRef = useRef<{ x: number; y: number } | null>(null);
  const hudReadoutRef = useRef<HTMLDivElement | null>(null);

  const isReducedMotion =
    forceReducedMotion || osReducedMotion || manualReducedMotion;

  // Listen to OS prefers-reduced-motion media query + Navbar Settings menu toggle
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      setManualReducedMotion(
        localStorage.getItem('soloberty_reduced_motion') === 'true'
      );
    } catch {
      // ignore storage errors
    }

    const handleSettingsEvent = (e: Event) => {
      const custom = e as CustomEvent<boolean>;
      setManualReducedMotion(Boolean(custom.detail));
    };
    window.addEventListener('soloberty_reduced_motion_change', handleSettingsEvent);

    let mq: MediaQueryList | null = null;
    const handleMqChange = (e: MediaQueryListEvent) => {
      setOsReducedMotion(e.matches);
    };

    if (window.matchMedia) {
      mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      setOsReducedMotion(mq.matches);
      if (typeof mq.addEventListener === 'function') {
        mq.addEventListener('change', handleMqChange);
      }
    }

    return () => {
      window.removeEventListener('soloberty_reduced_motion_change', handleSettingsEvent);
      if (mq && typeof mq.removeEventListener === 'function') {
        mq.removeEventListener('change', handleMqChange);
      }
    };
  }, []);

  // Main WebGL lifecycle, DPR cap, lerp loop, Page Visibility pause & IntersectionObserver pause
  useEffect(() => {
    if (isReducedMotion) return;

    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    let gl: WebGLRenderingContext | null = null;
    try {
      gl =
        (canvas.getContext('webgl', {
          alpha: false,
          antialias: false,
          depth: false,
          stencil: false,
          powerPreference: 'default',
        }) as WebGLRenderingContext | null) ||
        (canvas.getContext('experimental-webgl') as WebGLRenderingContext | null);
    } catch {
      gl = null;
    }

    if (!gl) {
      setWebglUnsupported(true);
      return;
    }

    const program = createShaderProgram(
      gl,
      VERTEX_SHADER_SOURCE,
      FRAGMENT_SHADER_SOURCE
    );
    if (!program) {
      setWebglUnsupported(true);
      return;
    }

    gl.useProgram(program);

    // Fullscreen 2-triangle quad in clip space (-1..1)
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    const positions = new Float32Array([
      -1.0, -1.0,
      1.0, -1.0,
      -1.0, 1.0,
      -1.0, 1.0,
      1.0, -1.0,
      1.0, 1.0,
    ]);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    const aPositionLoc = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(aPositionLoc);
    gl.vertexAttribPointer(aPositionLoc, 2, gl.FLOAT, false, 0, 0);

    // Uniform locations
    const uTimeLoc = gl.getUniformLocation(program, 'u_time');
    const uResLoc = gl.getUniformLocation(program, 'u_resolution');
    const uMouseLoc = gl.getUniformLocation(program, 'u_mouse');
    const uTrailLoc = gl.getUniformLocation(program, 'u_trail[0]');
    const uRipplesLoc = gl.getUniformLocation(program, 'u_ripples[0]');

    // Chained-lerp short trail for hover glow tail
    const trailPoints: Array<{ x: number; y: number }> = Array.from(
      { length: MAX_TRAIL },
      () => ({ x: 0.5, y: 0.5 })
    );
    const trailData = new Float32Array(MAX_TRAIL * 2);

    // Flat Float32Array ring buffer for MAX_RIPPLES vec4(aspectX, y, clickTime, activeFlag)
    const ripplesData = new Float32Array(MAX_RIPPLES * 4);
    let rippleWriteIndex = 0;

    let width = 1;
    let height = 1;
    let currentDpr = 1;

    // Resize handler with responsible DPR cap (capped at 2.0)
    const updateSize = () => {
      if (!canvas || !gl) return;
      currentDpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      const nextWidth = Math.max(1, Math.floor(rect.width * currentDpr));
      const nextHeight = Math.max(1, Math.floor(rect.height * currentDpr));

      if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
        canvas.width = nextWidth;
        canvas.height = nextHeight;
      }
      // Always sync local width/height & WebGL viewport (fixes HMR / Fast Refresh reuse)
      width = nextWidth;
      height = nextHeight;
      gl.viewport(0, 0, width, height);
    };

    updateSize();
    window.addEventListener('resize', updateSize);

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => updateSize());
      resizeObserver.observe(container);
    }

    let rafId: number | null = null;
    let isTabHidden = typeof document !== 'undefined' ? document.hidden : false;
    let isOffscreen = false;
    let accumulatedTime = 0;
    let lastTimestamp: number | null = null;

    const shouldRun = () => !isTabHidden && !isOffscreen;

    const renderFrame = (timestamp: number) => {
      if (!shouldRun() || !gl) {
        rafId = null;
        return;
      }

      if (lastTimestamp === null) {
        lastTimestamp = timestamp;
      }
      // Clamp delta to max 100ms so returning from a tab or lag spike never jumps u_time
      const dt = Math.min((timestamp - lastTimestamp) / 1000, 0.1);
      lastTimestamp = timestamp;
      accumulatedTime += dt;

      // --- LERP MOUSE POSITION (HOVER GLOW TAIL) & SPAWN CLICK RIPPLES ---
      const target = targetMouseRef.current;
      const lerped = lerpedMouseRef.current;
      const alpha = lerpFactorRef.current;
      const aspect = width / Math.max(height, 1);

      const dx = target.x - lerped.x;
      const dy = target.y - lerped.y;
      if (Math.hypot(dx, dy) > 0.0005) {
        lerped.x += dx * alpha;
        lerped.y += dy * alpha;
      } else {
        lerped.x = target.x;
        lerped.y = target.y;
      }

      // Chained lerp for the short hover glow tail
      trailPoints[0].x = lerped.x;
      trailPoints[0].y = lerped.y;
      for (let i = 1; i < MAX_TRAIL; i++) {
        trailPoints[i].x += (trailPoints[i - 1].x - trailPoints[i].x) * 0.34;
        trailPoints[i].y += (trailPoints[i - 1].y - trailPoints[i].y) * 0.34;
      }
      for (let i = 0; i < MAX_TRAIL; i++) {
        trailData[i * 2] = trailPoints[i].x * aspect;
        trailData[i * 2 + 1] = trailPoints[i].y;
      }

      // If the user clicked, release a single expanding ripple from that exact spot
      const pendingClick = pendingClickRef.current;
      if (pendingClick) {
        const baseIdx = rippleWriteIndex * 4;
        ripplesData[baseIdx] = pendingClick.x * aspect;
        ripplesData[baseIdx + 1] = pendingClick.y;
        ripplesData[baseIdx + 2] = accumulatedTime;
        ripplesData[baseIdx + 3] = 1.0;

        rippleWriteIndex = (rippleWriteIndex + 1) % MAX_RIPPLES;
        pendingClickRef.current = null;
      }

      gl.uniform1f(uTimeLoc, accumulatedTime);
      gl.uniform2f(uResLoc, width, height);
      gl.uniform2f(uMouseLoc, lerped.x, lerped.y);
      if (uTrailLoc) {
        gl.uniform2fv(uTrailLoc, trailData);
      }
      if (uRipplesLoc) {
        gl.uniform4fv(uRipplesLoc, ripplesData);
      }

      gl.drawArrays(gl.TRIANGLES, 0, 6);

      // Update live uniform readout in DOM if inspector is open
      if (hudReadoutRef.current) {
        hudReadoutRef.current.textContent = `u_time: ${accumulatedTime.toFixed(1)}s\nu_resolution: ${width}×${height} (DPR ${currentDpr.toFixed(1)})\nu_mouse (lerped): [${lerped.x.toFixed(2)}, ${lerped.y.toFixed(2)}]`;
      }

      rafId = window.requestAnimationFrame(renderFrame);
    };

    const startLoop = () => {
      if (rafId === null && shouldRun()) {
        lastTimestamp = null;
        setIsPausedByVisibility(false);
        rafId = window.requestAnimationFrame(renderFrame);
      }
    };

    const stopLoop = () => {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
        rafId = null;
      }
      lastTimestamp = null;
      setIsPausedByVisibility(true);
    };

    // 1. Pause animation when browser tab is hidden
    const handleVisibilityChange = () => {
      isTabHidden = document.hidden;
      if (shouldRun()) {
        startLoop();
      } else {
        stopLoop();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 2. Pause animation when hero is scrolled completely out of the viewport
    let observer: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (entry) {
            isOffscreen = !entry.isIntersecting;
            if (shouldRun()) {
              startLoop();
            } else {
              stopLoop();
            }
          }
        },
        { threshold: 0.01 }
      );
      observer.observe(container);
    }

    startLoop();

    return () => {
      stopLoop();
      window.removeEventListener('resize', updateSize);
      if (resizeObserver) resizeObserver.disconnect();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (observer) observer.disconnect();
      if (gl) {
        gl.deleteBuffer(positionBuffer);
        gl.deleteProgram(program);
      }
    };
  }, [isReducedMotion]);

  // Update target mouse coordinates (normalized 0..1, Y flipped for WebGL bottom-left origin)
  const handlePointerMove = (e: React.PointerEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const normX = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const normY = Math.min(
      1,
      Math.max(0, 1.0 - (e.clientY - rect.top) / rect.height)
    );
    targetMouseRef.current = { x: normX, y: normY };
  };

  // Spawn an expanding ripple wave on pointer down (click / tap)
  const handlePointerDown = (e: React.PointerEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const normX = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const normY = Math.min(
      1,
      Math.max(0, 1.0 - (e.clientY - rect.top) / rect.height)
    );
    pendingClickRef.current = { x: normX, y: normY };
  };

  const showStaticFallback = isReducedMotion || webglUnsupported;

  return (
    <section
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerDown={handlePointerDown}
      aria-label="Soloberty Interactive Hero"
      className="relative w-full min-h-[calc(100dvh-56px)] overflow-hidden bg-[#090D16] text-white flex flex-col justify-between select-none"
    >
      {/* Layer 1: Fullscreen WebGL Fragment Shader OR Reduced-Motion Static Aurora Gradient Fallback */}
      {showStaticFallback ? (
        <div
          data-testid="shader-reduced-motion-fallback"
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at 28% 32%, rgba(0, 122, 187, 0.55) 0%, rgba(0, 71, 117, 0.35) 38%, rgba(9, 13, 22, 0.96) 78%), radial-gradient(circle at 76% 68%, rgba(184, 231, 255, 0.24) 0%, rgba(204, 85, 0, 0.14) 42%, rgba(9, 13, 22, 1) 85%)',
            backgroundColor: '#090D16',
          }}
        />
      ) : (
        <canvas
          ref={canvasRef}
          data-testid="shader-hero-canvas"
          aria-hidden="true"
          className="absolute inset-0 w-full h-full block pointer-events-none"
        />
      )}

      {/* Layer 2: Engineered Contrast Scrim (Guarantees WCAG AAA text readability over bright ripple crests) */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,rgba(9,13,22,0.52)_0%,rgba(9,13,22,0.25)_55%,rgba(9,13,22,0.65)_100%)]"
      />

      {/* Layer 3: Foreground Hero Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-8 pt-10 pb-24 md:pb-16 text-center max-w-4xl mx-auto">
        {/* Primary Hero Headline */}
        <h1 className="font-heading text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-white leading-[1.08] drop-shadow-[0_4px_24px_rgba(0,0,0,0.65)]">
          Freedom to{' '}
          <span className="text-[#007ABB] dark:text-[#B8E7FF]">
            Connect
          </span>
        </h1>

        {/* High-Contrast Subheadline */}
        <p className="mt-5 text-base sm:text-lg md:text-xl text-slate-100/95 max-w-2xl font-normal leading-relaxed drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)]">
          Discover people who share your passions, explore local events and
          users nearby, and spark effortless chats with AI match insights
          and icebreakers.
        </p>

        {/* Primary & Secondary Call-To-Action Buttons */}
        <div className="mt-8 flex flex-col items-center gap-3.5">
          <div className="flex flex-wrap items-center justify-center gap-3.5 sm:gap-4">
            <Link
              href="/feed"
              className="group w-56 inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-[#007ABB] hover:bg-[#0088CC] text-white dark:bg-[#B8E7FF] dark:hover:bg-[#99D8FF] dark:text-slate-900 font-extrabold text-sm sm:text-base shadow-[0_8px_30px_rgba(0,122,187,0.4)] border border-[#B8E7FF]/30 dark:border-[#B8E7FF]/40 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B8E7FF]"
            >
              <span>Meet New People</span>
              <ArrowRight className="w-4 h-4 shrink-0 transition-transform group-hover:translate-x-1" />
            </Link>

            <Link
              href="/map"
              className="w-56 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-white hover:bg-slate-100 text-[#007ABB] dark:bg-slate-900/75 dark:hover:bg-slate-900/90 dark:backdrop-blur-md dark:text-white font-bold text-sm sm:text-base border border-white/60 dark:border-white/25 dark:hover:border-[#B8E7FF]/60 shadow-[0_8px_30px_rgba(0,0,0,0.28)] dark:shadow-lg transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B8E7FF]"
            >
              <MapPin className="w-4 h-4 shrink-0 text-[#007ABB] dark:text-[#B8E7FF]" />
              <span>See Who&apos;s Nearby</span>
            </Link>
          </div>

          {!isAuthenticated && (
            <Link
              href="/auth/login"
              className="w-56 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-white/10 hover:bg-white/20 backdrop-blur-md text-[#B8E7FF] font-bold text-sm sm:text-base border border-white/15 hover:border-[#B8E7FF]/40 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B8E7FF]"
            >
              <LogIn className="w-4 h-4 shrink-0" />
              <span>Log In / Sign Up</span>
            </Link>
          )}
        </div>

        {/* Quick Feature Highlights Strip */}
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-2xl text-left">
          <div className="p-3.5 rounded-2xl bg-slate-950/60 backdrop-blur-md border border-white/15">
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#B8E7FF]">
              Interests &amp; Live Chat
            </div>
            <p className="text-xs text-slate-300 mt-0.5 leading-snug">
              Meet people who share your hobbies and jump straight into real-time conversations.
            </p>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-950/60 backdrop-blur-md border border-white/15">
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#B8E7FF]">
              Neighborhood &amp; Events
            </div>
            <p className="text-xs text-slate-300 mt-0.5 leading-snug">
              Explore nearby users on the live map and discover local events happening around you.
            </p>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-950/60 backdrop-blur-md border border-white/15">
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#B8E7FF]">
              AI Why You Two &amp; Icebreakers
            </div>
            <p className="text-xs text-slate-300 mt-0.5 leading-snug">
              Get instant AI compatibility highlights and tailored icebreakers to spark great chats.
            </p>
          </div>
        </div>
      </div>

      {/* Layer 4: Zero-CLS Floating Corner Pill & Popover for Assignment Metrics & Shader Inspector */}
      {/* Mobile (< md): anchored top-right, opens downward. Desktop (md+): anchored bottom-right, opens upward as a sleek vertical card. */}
      <div className="absolute top-3 right-3 md:top-auto md:bottom-5 md:right-8 z-30 flex flex-col items-end">
        <AnimatePresence>
          {inspectorOpen && (
            <motion.div
              role="region"
              aria-label="Shader Uniform Controls"
              initial={{ opacity: 0, scale: 0.88 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.88 }}
              transition={{
                type: 'spring',
                stiffness: 450,
                damping: 28,
              }}
              className="absolute top-full right-0 mt-2.5 md:top-auto md:bottom-full md:mt-0 md:mb-2.5 origin-top-right md:origin-bottom-right w-[min(calc(100vw-1.5rem),20rem)] md:w-80 p-4 rounded-3xl bg-slate-950/92 backdrop-blur-xl border border-white/20 text-xs text-slate-200 shadow-2xl space-y-3.5"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-2.5 gap-2">
                <span className="font-extrabold text-sm text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-[#B8E7FF] shrink-0" />
                  <span>Shader Lab</span>
                </span>
                <button
                  type="button"
                  onClick={() => setInspectorOpen(false)}
                  aria-label="Close shader controls"
                  className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Live Uniform Readout */}
              <div className="px-3 py-2.5 rounded-2xl bg-slate-900/90 border border-white/10 text-[11px] font-mono text-slate-300 flex items-start gap-2 leading-relaxed">
                <Activity className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span ref={hudReadoutRef} className="whitespace-pre-line break-words">
                  {showStaticFallback
                    ? 'STATIC FALLBACK ACTIVE\n0 GPU frames/sec\nprefers-reduced-motion'
                    : isPausedByVisibility
                      ? 'PAUSED\nTab hidden or offscreen'
                      : 'u_time: 0.0s\nu_resolution: — (DPR <= 2.0)\nu_mouse (lerped): [0.50, 0.50]'}
                </span>
              </div>

              {/* Lerp Tuning */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label htmlFor="lerp-slider" className="font-bold text-slate-300">
                    Cursor Lerp (<code className="text-[#B8E7FF]">lerpFactor</code>)
                  </label>
                  <span className="font-mono text-[#B8E7FF] font-bold text-[11px]">
                    {lerpFactor.toFixed(3)}
                  </span>
                </div>
                <input
                  id="lerp-slider"
                  type="range"
                  min="0.015"
                  max="0.20"
                  step="0.005"
                  value={lerpFactor}
                  onChange={(e) => setLerpFactor(parseFloat(e.target.value))}
                  className="w-full accent-[#007ABB] cursor-pointer"
                />
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Move cursor for the lerped glowing tail; click anywhere to release an expanding ripple wave. Toggle{' '}
                  <strong className="text-slate-200">Reduced Motion</strong> in Settings for the static fallback.
                </p>
              </div>

              {/* GLSL Source Button */}
              <button
                type="button"
                onClick={() => setShowShaderSource(true)}
                className="w-full py-2.5 px-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-xs font-bold text-[#B8E7FF] border border-[#B8E7FF]/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Code2 className="w-4 h-4 text-[#38BDF8]" />
                <span>View GLSL Source</span>
              </button>

              <div className="pt-2.5 border-t border-white/10 text-[11px] text-slate-300 leading-relaxed">
                <span className="font-bold text-emerald-400 block mb-0.5">
                  Perf &amp; Reduced-Motion One-Liner:
                </span>
                {REDUCED_MOTION_ONE_LINER}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Single Subtle Toggle Pill — smoothly extends left with spring physics */}
        <motion.button
          layout
          type="button"
          onClick={() => setInspectorOpen((prev) => !prev)}
          aria-expanded={inspectorOpen}
          transition={{ type: 'spring', stiffness: 450, damping: 28 }}
          className="px-3.5 py-2 rounded-full bg-slate-950/75 hover:bg-slate-900/90 text-xs font-bold text-[#B8E7FF] border border-white/15 hover:border-[#B8E7FF]/40 backdrop-blur-md transition-colors flex items-center gap-1.5 cursor-pointer shadow-lg overflow-hidden"
        >
          <motion.span
            layout="position"
            className="flex items-center justify-center shrink-0"
          >
            <AnimatedSlidersIcon isOpen={inspectorOpen} className="w-3.5 h-3.5" />
          </motion.span>
          <span className="inline-flex items-center whitespace-nowrap">
            <AnimatePresence initial={false}>
              {inspectorOpen && (
                <motion.span
                  key="hide-prefix"
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 'auto', opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 450, damping: 28 }}
                  className="inline-block overflow-hidden whitespace-pre"
                >
                  Hide{' '}
                </motion.span>
              )}
            </AnimatePresence>
            <motion.span layout="position">Shader Lab</motion.span>
          </span>
        </motion.button>
      </div>

      {/* Modal: Commented GLSL Fragment Shader Source for Mentor Walkthrough */}
      {showShaderSource && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Annotated GLSL Fragment Shader Source"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div className="bg-[#0F172A] border border-slate-700 rounded-3xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-base font-extrabold text-white">
                  Soloberty Ripple & Aurora Fragment Shader (GLSL)
                </h2>
                <p className="text-xs text-slate-400">
                  6 documented blocks: Uniforms, Aspect-Corrected UVs, Lerped Mouse Ripple Refraction, Aurora Sine Flow, Brand Palette + Caustics, Contrast Vignette + Grain
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowShaderSource(false)}
                aria-label="Close GLSL source modal"
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto font-mono text-xs text-sky-200 bg-slate-950 leading-relaxed select-text">
              <pre className="whitespace-pre-wrap break-words">
                {FRAGMENT_SHADER_SOURCE.trim()}
              </pre>
            </div>
            <div className="px-6 py-3.5 bg-slate-900 border-t border-slate-800 text-xs text-slate-300">
              <strong className="text-[#B8E7FF]">Fallback Summary: </strong>
              {REDUCED_MOTION_ONE_LINER}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default ShaderHero;
