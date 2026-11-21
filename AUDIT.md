# Soloberty — Frontend Performance & Accessibility Audit (`AUDIT.md`)

- **Audited Deployment:** `https://soloberty.vercel.app`
- **Preset & Environment:** Chrome Lighthouse **Mobile** preset (Incognito window) & **WAVE** Web Accessibility Evaluation Tool
- **Audited Routes:** `/feed`, `/map`, `/chat`, `/profile`, `/auth/login`, and `/auth/signup` *(Note: `/discover` was excluded because it is scheduled to be replaced by an Events page.)*
- **Rubric Targets:** Lighthouse Mobile Performance **90+** (80 min), Accessibility **90+** (80 min), **0 WAVE errors** (alerts fixed or justified), full **keyboard-only** primary flow, and **AI-specific accessibility** (`aria-live="polite"` + keyboard-reachable Stop button).

---

## 1. Executive Summary — Lighthouse Mobile (Before vs. After)

Every audited route now exceeds the **90+ Performance** and **90+ Accessibility** target (up from 64–81 Performance at baseline), with **LCP cut by 2.8 s – 8.0 s** across all pages.

| Page | Perf (Before → After) | Perf Δ | A11y (Before → After) | A11y Δ | Best Practices | SEO | LCP (Before → After) | LCP Δ | CLS (Before → After) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `/feed` | 71 → **92** | **+21** | 92 → **96** | **+4** | 96 → **100** | 100 → **100** | 6.6 s → **2.2 s** | **-4.4 s** | 0 → **0** |
| `/map` | 64 → **95** | **+31** | 96 → **96** | 0 | 92 → **96** | 100 → **100** | 9.6 s → **1.6 s** | **-8.0 s** | 0 → **0** |
| `/chat` | 81 → **92** | **+11** | 93 → **95** | **+2** | 96 → **100** | 100 → **100** | 4.1 s → **1.3 s** | **-2.8 s** | 0 → **0** |
| `/profile` | 66 → **96** | **+30** | 96 → **96** | 0 | 96 → **100** | 100 → **100** | 8.6 s → **1.9 s** | **-6.7 s** | 0.059 → **0.032** |
| `/auth/login` | 78 → **96** | **+18** | 96 → **96** | 0 | 96 → **100** | 100 → **100** | 5.0 s → **1.3 s** | **-3.7 s** | 0 → **0** |

### Core Web Vitals Breakdown (Before → After)

| Page | FCP | LCP | TBT | CLS | Speed Index |
|---|---:|---:|---:|---:|---:|
| `/feed` | 1.1 s → **1.2 s** | 6.6 s → **2.2 s** | 270 ms → **290 ms** | 0 → **0** | 2.3 s → **1.2 s** |
| `/map` | 1.0 s → **1.1 s** | 9.6 s → **1.6 s** | 260 ms → **230 ms** | 0 → **0** | 6.5 s → **3.5 s** |
| `/chat` | 1.0 s → **1.0 s** | 4.1 s → **1.3 s** | 280 ms → **330 ms** | 0 → **0** | 2.7 s → **2.2 s** |
| `/profile` | 1.0 s → **1.0 s** | 8.6 s → **1.9 s** | 360 ms → **210 ms** | 0.059 → **0.032** | 2.4 s → **1.2 s** |
| `/auth/login` | 1.0 s → **1.0 s** | 5.0 s → **1.3 s** | 220 ms → **220 ms** | 0 → **0** | 2.2 s → **1.7 s** |

---

## 2. Before & After Lighthouse Screenshots

### `/feed` — Performance 71 → 92 (+21), Accessibility 92 → 96 (+4), LCP 6.6 s → 2.2 s

| Before | After |
|---|---|
| ![Before /feed scores](discovery-app/docs/audit/images/before-feed.png) | ![After /feed scores](discovery-app/docs/audit/images/after-feed.png) |
| ![Before /feed metrics](discovery-app/docs/audit/images/before-feed-metrics.png) | ![After /feed metrics](discovery-app/docs/audit/images/after-feed-metrics.png) |

### `/map` — Performance 64 → 95 (+31), Accessibility 96 → 96, LCP 9.6 s → 1.6 s

| Before | After |
|---|---|
| ![Before /map scores](discovery-app/docs/audit/images/before-map.png) | ![After /map scores](discovery-app/docs/audit/images/after-map.png) |
| ![Before /map metrics](discovery-app/docs/audit/images/before-map-metrics.png) | ![After /map metrics](discovery-app/docs/audit/images/after-map-metrics.png) |

### `/chat` — Performance 81 → 92 (+11), Accessibility 93 → 95 (+2), LCP 4.1 s → 1.3 s

| Before | After |
|---|---|
| ![Before /chat scores](discovery-app/docs/audit/images/before-chat.png) | ![After /chat scores](discovery-app/docs/audit/images/after-chat.png) |
| ![Before /chat metrics](discovery-app/docs/audit/images/before-chat-metrics.png) | ![After /chat metrics](discovery-app/docs/audit/images/after-chat-metrics.png) |

### `/profile` — Performance 66 → 96 (+30), Accessibility 96 → 96, LCP 8.6 s → 1.9 s

| Before | After |
|---|---|
| ![Before /profile scores](discovery-app/docs/audit/images/before-profile.png) | ![After /profile scores](discovery-app/docs/audit/images/after-profile.png) |
| ![Before /profile metrics](discovery-app/docs/audit/images/before-profile-metrics.png) | ![After /profile metrics](discovery-app/docs/audit/images/after-profile-metrics.png) |

### `/auth/login` — Performance 78 → 96 (+18), Accessibility 96 → 96, LCP 5.0 s → 1.3 s

| Before | After |
|---|---|
| ![Before /auth/login scores](discovery-app/docs/audit/images/before-login.png) | ![After /auth/login scores](discovery-app/docs/audit/images/after-login.png) |
| ![Before /auth/login metrics](discovery-app/docs/audit/images/before-login-metrics.png) | ![After /auth/login metrics](discovery-app/docs/audit/images/after-login-metrics.png) |

---

## 3. WAVE Audit Results (Before vs. After)

All audited pages now have **0 WAVE Errors** and **0 real WCAG AA Contrast Errors**.

| Page | Before Errors | After Errors | Before Contrast Errors | After Contrast Errors | Alerts (Before → After / Justified) |
|---|---:|---:|---:|---:|---|
| `/feed` | 0 | **0** | 11 | **0 real** *(1 false-positive\*)* | 3 → **1 justified** (`Redundant link` in Navbar; fixed `Missing h1` & `Redundant alt`) |
| `/map` | 0 | **0** | 3 | **0 real** *(1 false-positive\*)* | 4 → **3 justified** (`1 Redundant link`, `2 Very small text` from Leaflet attribution; fixed `No heading structure`) |
| `/chat` | 0 | **0** | 6 | **0 real** *(1 false-positive\*)* | 2 → **1 justified** (`Redundant link` in Navbar; fixed `Skipped heading level`) |
| `/profile` | 0 | **0** | 7 | **0 real** *(1 false-positive\*)* | 2 → **1 justified** (`Redundant link` in Navbar; fixed `Redundant alt`) |
| `/auth/login` | 2 (`Missing form label`) | **0** | 5 | **0 real** *(1 false-positive\*)* | 4 → **2 justified** (`2 Redundant link`; fixed `2 Orphaned form label`) |
| `/auth/signup` | 0 | **0** | 5 | **0 real** *(1 false-positive\*)* | 3 → **2 justified** (`2 Redundant link`; fixed `Missing h1`) |

### Justified WAVE Items
- **\*Navbar active tab contrast (1 false-positive across all pages):** WAVE's Contrast Inspector reports `#007ABB` foreground on `#007ABB` background (`1:1`) on the active Navbar tab because WAVE ignores CSS `linear-gradient` backgrounds rendered on a sibling `<motion.div>` and falls back to the `<header>` background (`#007ABB`). Visually, the active tab text sits on solid white (`#FFFFFF`), which has a **4.67:1** WCAG AA passing contrast ratio.
- **Redundant link alerts (1–2 per page):** The `Soloberty` brand logo and the adjacent `Feed` nav tab both link to `/feed` (standard web app navigation convention). On `/auth/login` and `/auth/signup`, the `Login` nav tab and the `Log In` / `Sign Up` `AuthSwitch` pill provide dual entry points to the auth routes.
- **Very small text alerts on `/map` (2 alerts):** Rendered inside Leaflet's built-in bottom-right `.leaflet-control-attribution` (`Leaflet | © OpenStreetMap contributors`), which is required third-party map attribution.

---

## 4. Key Changes Made

### Performance Optimizations
1. **`/feed` (`app/feed/page.tsx`, `components/FeedClient.tsx`, `components/MatchStack.tsx`):**
   - Converted `/feed` to a **Next.js Server Component** that fetches completed public profiles via the Firestore REST API (`revalidate: 60`) and passes `initialCards` directly to `<FeedClient>` → `<MatchStack>`, eliminating the client-side loading spinner and Firestore waterfall on initial paint (LCP `6.6 s → 2.2 s`).
   - Added `loading="eager"` + `fetchPriority="high"` on the active center card image and `loading="lazy"` on background cards.
2. **`/map` (`app/map/page.tsx`, `components/Map/MapCanvas.tsx`, `components/Map/DistanceFilter.tsx`, `hooks/useUserMarkers.ts`, `public/map-preview-vienna.webp`):**
   - Removed the initial auth/geolocation gate so `MapCanvas` mounts immediately at `DEFAULT_CENTER`.
   - Switched Leaflet from `{s}.tile.openstreetmap.org` to single HTTP/2 host `tile.openstreetmap.org` (`keepBuffer: 0`, `updateWhenIdle: true`, `updateWhenZooming: false`) and added `preconnect` + `dns-prefetch` in `app/layout.tsx`.
   - Replaced the external `256×256` OSM preview image (which lost LCP to Leaflet tiles due to Chrome's upscaling penalty) with a local **360×360 WebP** (`/map-preview-vienna.webp`, 27.5 KB) rendered at `320×320` (`fetchPriority="high"`, `decoding="sync"`), cutting LCP from **9.6 s → 1.6 s**.
   - Dynamically imported `UserPreviewCard`, `UserDetailModal`, and `firebase/firestore`, deferred the initial `useUserMarkers` query via `requestIdleCallback` and `navigator.geolocation` by `1.2 s`, and replaced `motion/react` in `DistanceFilter.tsx` with pure CSS transitions.
3. **`/chat` (`app/chat/page.tsx`, `components/Chat/IndividualChat.tsx`):**
   - Rendered the `Messages` `<header>` / `<h1>` directly inside the `<Suspense>` fallback (`ChatListShell`) for instant SSR LCP (`4.1 s → 1.3 s`) with zero CLS.
   - Code-split `IndividualChat` (~1,160 lines, `@ai-sdk/react`, `motion/react`) into `components/Chat/IndividualChat.tsx` and lazy-loaded both `IndividualChat` and `UserDetailModal` via `next/dynamic(..., { ssr: false })`.
   - Replaced `motion/react` in the chat list with CSS transitions and gated `useProfiles()`, `useUnreadMessages()`, and dynamic `firebase/firestore` inside `SignedInChatList` so signed-out loads avoid unnecessary Firestore listeners.
4. **`/profile` (`components/Profile/ProfileEditor.tsx`):**
   - Fixed mobile typographic hierarchy (`<h1>` `text-3xl sm:text-4xl` + `text-sm` subtitle vs. hydrated `<h2>` `text-2xl sm:text-3xl`) so the instant SSR header wins LCP instead of waiting on Firestore-hydrated name text (`8.6 s → 1.9 s`).
   - Reserved `min-h` heights on the name row and Interest Photos container to cut CLS (`0.059 → 0.032`).
   - Lazy-loaded View Mode interest photos, gated hidden back-face card `<img>`s behind `isFlipped`, and scoped `fetchUserProfile` to `[user?.uid]`.
5. **`/auth/login` (`app/auth/login/page.tsx`):**
   - Rendered the card header immediately at full opacity for instant SSR LCP (`5.0 s → 1.3 s`) and dynamically imported `firebase/auth` and `firebase/firestore` only on form submission.

### Accessibility, Contrast & Landmarks
- **Contrast fixes (WCAG AA ≥ 4.5:1):**
  - `Navbar.tsx`: Upgraded inactive desktop nav links (`text-white/90` `4.09:1` → `text-white` `4.67:1`), mobile inactive links (`text-white/70` → `text-white/95`), and Settings dropdown headers (`text-slate-400` → `text-slate-600`).
  - `MatchStack.tsx`: Darkened `Why You Two?` AI button (`#CC5500` `4.31:1` → `#C25000` `4.73:1`), removed `opacity-80` from unfocused back-face action buttons (`3.31–3.54:1` → `4.67–4.73:1`), and upgraded `text-slate-400` labels to `text-slate-600` (`7.58:1`).
  - `MapCanvas.tsx`: Darkened emerald cluster badges & pins (`#10B981` `2.54:1` → `#047857` `5.48:1`).
  - `app/chat/page.tsx`: Darkened avatar initials (`text-[#007ABB]` on `bg-[#E8F4FC]` `4.17:1` → `text-[#005E91]` `6.19:1`) and `Clear All` button (`text-rose-600` `4.12:1` → `text-rose-700` `6.16:1`).
  - `AuthSwitch.tsx`: Applied `bg-[#007ABB] dark:bg-[#B8E7FF]` directly on the active link (`4.67:1`).
  - `ProfileEditor.tsx`: Fixed `ProfileMatchCardPreview` white-on-light-blue name overlay (switched to `text-slate-900` on placeholder + dark gradient scrim over photos), darkened interest cards (`text-[#0088CC]` `3.64:1` → `text-[#005E91]` `6.48:1`), and upgraded `text-slate-400` labels to `text-slate-600`.
  - `app/auth/login/page.tsx` & `Step1Credentials.tsx`: Upgraded input placeholders to `placeholder-slate-500` (`4.56:1`).
- **Labels, Headings & Alt Text:**
  - Linked `<label htmlFor>` to `<input id>` on `/auth/login` (fixed `2 Missing form label` errors & `2 Orphaned form label` alerts).
  - Added proper `<h1>` headings on `/feed`, `/map`, `/auth/signup`, and fixed skipped heading levels (`h1 → h2`) on `/chat`.
  - Set `alt=""` on `MatchStack` card avatars where the person's name is already announced by the adjacent `<h2>` (fixed `Redundant alternative text` alert).

---

## 5. Keyboard-Only Pass & AI-Specific Accessibility

### Keyboard-Only Primary Flow (All Resolved)
- **`/feed`:** Fixed global key handler in `MatchStack.tsx` so `Enter` on navbar links, settings gear, or logo navigates normally instead of flipping the card. Added `tabIndex={-1}` and `aria-hidden="true"` to non-active background cards and hidden card faces so Tab never enters off-screen cards. Added visible focus rings and keyboard arrow/Space navigation.
- **`/map`:** Made Leaflet cluster/user markers keyboard-focusable (`tabIndex={0}`, `role="button"`, `aria-label`) and activatable with `Enter`/`Space`. Made `DistanceFilter` pills (`5 km`, `25 km`, `50 km`, `100 km`, `Any`) keyboard-activatable `<button>` elements with `aria-pressed` and focus rings. Added focus trapping (`useFocusTrap`) and `Escape` dismissal to `UserPreviewCard` and `UserDetailModal`.
- **`/chat`:** Converted conversation rows to native `<button>` elements reachable via Tab/Enter. Made the active chat profile header keyboard-focusable and trapped focus inside the `Clear All` confirmation dialog.
- **`/profile`:** Made `ProfileMatchCardPreview` focusable and flippable via `Enter`/`Space`, removed the redundant self-chat button, made Edit Profile photo upload triggers keyboard-accessible `<button>` elements, and trapped focus inside the WebRTC photo capture modal with `Escape` close.
- **`/auth/signup` & `/auth/changePassword`:** Made Step 6 ("Upload Photo") and Step 7 ("Interest Images") upload controls keyboard-reachable `<button>` elements, and aligned the focus ring on the password visibility toggle button.

### AI-Specific Accessibility
- **Polite Live Announcements (`aria-live="polite"`):** Streamed AI responses in **Scout Icebreaker** (`components/Chat/IndividualChat.tsx`) and **Why You Two?** (`components/MatchStack.tsx`, `components/Map/UserDetailModal.tsx`) are wrapped in `aria-live="polite"` status regions so screen readers announce generated output without interrupting the user.
- **Keyboard-Reachable Stop Button:** Added a visible, keyboard-focusable **Stop** button (`aria-label="Stop generating"`, `focus-visible:ring-2`) next to the Send button in `IndividualChat.tsx` while Scout is streaming, wired directly to `useChat`'s `stop()` handler with a polite `"Stopped icebreaker generation."` status message.
