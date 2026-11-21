Im auditing my Vercel deployment with the URL: https://soloberty.vercel.app/feed

im doing it in Incognito tab, so that the performance is affected as minimal as possible.

i wont audit the discover page since i plan to remove it or replace it with an events page.
---

Before /feed:
Per:71
Accessibility:92
Best Practices:96
SEO:100
Agentic Browsing: 1/2

FCP: 1.1s
LCP: 6.6s
TBT: 270ms
CLS: 0
Speed Index: 2.3s

Got 2 warnings:
IndexedDB stored data (often triggered by auth/cache/analytics SDKs writing to IndexedDB during load, even in Incognito).
"The page loaded too slowly to finish within the time limit" — likely tied to that 6.6 s LCP (e.g., an unoptimized image, slow API fetch, or heavy JS bundle).

---

WAVE /feed:
- Errors: 0
- Contrast Errors: 11 (Very low contrast)
- Alerts: 3 (1 Redundant alternative text, 1 Missing first level heading, 1 Redundant link)

---

Before /chat:
Per:81
Accessibility: 93
Best Practices: 96
SEO: 100
Agentic Browsing: 2/2

FCP: 1.0s
LCP: 4.1s
TBT: 280ms
CLS: 0
Speed Index: 2.7s

Got 2 warnings:
There may be stored data affecting loading performance in this location: IndexedDB. Audit this page in an incognito window to prevent those resources from affecting your scores.
The page loaded too slowly to finish within the time limit. Results may be incomplete.

---

WAVE /chat:
- Errors: 0
- Contrast Errors: 6 (Very low contrast)
- Alerts: 2 (1 Skipped heading level, 1 Redundant link)

---

Before /map:
Per:64
Accessibility: 96
Best Practices: 92
SEO: 100
Agentic Browsing: 1/2

FCP: 1.0s
LCP: 9.6s
TBT: 260ms
CLS: 0
Speed Index: 6.5s

---
WAVE /map:
- Errors: 0
- Contrast Errors: 3 (Very low contrast)
- Alerts: 4 (1 No heading structure, 1 Redundant link, 2 Very small text)

---

Before /profile:
Per: 66
Accessibility: 96
Best Practices: 96
SEO: 100
Agentic Browsing: 2/2

FCP: 1.0s
LCP: 8.6s
TBT: 360ms
CLS: 0.059
Speed Index: 2.4s

Got 2 warnings:
IndexedDB stored data (often triggered by auth/cache/analytics SDKs writing to IndexedDB during load, even in Incognito).
"The page loaded too slowly to finish within the time limit" — likely tied to that 8.6 s LCP.

---

WAVE /profile:
- Errors: 0
- Contrast Errors: 7 (Very low contrast)
- Alerts: 2 (1 Redundant alternative text, 1 Redundant link)

---
Before /auth/login:
Per: 78
Accessibility: 96
Best Practices: 96
SEO: 100
Agentic Browsing: 2/2

FCP: 1.0s
LCP: 5.0s
TBT: 220ms
CLS: 0
Speed Index: 2.2s

Got 1 warning:
IndexedDB stored data (often triggered by auth/cache/analytics SDKs writing to IndexedDB during load, even in Incognito).

---

WAVE /auth/login:
- Errors: 2 (2 Missing form label)
- Contrast Errors: 5 (Very low contrast)
- Alerts: 4 (2 Orphaned form label, 2 Redundant link)

---

WAVE /auth/signup:
- Errors: 0
- Contrast Errors: 5 (Very low contrast)
- Alerts: 3 (1 Missing first level heading, 2 Redundant link)

---

Keyboard-Only Pass:
- /feed: Pressing Enter while focused on any navbar link, the settings gear, or the "Soloberty" logo is blocked from navigating/opening and instead rotates/flips the MatchCard. Generally nothing works via keyboard on /feed except Tab moving focus and Enter flipping the card.
- /feed: Tabbing reaches focusable elements inside the previous/next cards in MatchStack even when they are not the active center card (this also explains the Lighthouse `[aria-hidden="true"] elements contain focusable descendents` error).
- /map: Green user location bubbles are focusable via Tab, but pressing Enter does not open user details. Distance filter pills (5 km, 25 km, 50 km, 100 km, Any) are focusable via Tab, but pressing Enter does not activate them. On-screen + / - zoom buttons work via keyboard.
- /chat: Individual conversation rows cannot be navigated to using Tab (likely `<div onClick>` instead of `<button>` or `<Link>`). The "Clear All" button works with keyboard. Inside an individual chat, the clickable profile header is also not reachable via Tab. The Icebreaker AI tool does not have a keyboard-reachable Stop button (and needs `aria-live="polite"` for streamed/generated output).
- /auth/changePassword: Focus ring on the password visibility eye icon is off-center to the right.
- /profile: Cannot navigate to or rotate the MatchCard via keyboard (also remove the "Chat with [name]" button from the profile page's MatchCard). In Edit Profile, "Upload Photo" and "Add Photo" (Interest Photos) are not reachable via Tab. During the photo capture popup, Tab navigates the background page instead of trapping focus inside the popup (close X and Capture Photo buttons).
- /auth/signup: Step 6 ("Upload Photo") and Step 7 ("Interest Images" upload) of SignupWizard are not reachable via Tab.

---

Notes for AUDIT.md:
- Navbar active tab (`#007ABB` on `linear-gradient` white background) — **confirmed WAVE contrast false-positive** (all pages): WAVE Contrast Inspector reports `#007ABB` foreground on `#007ABB` background (`1:1`) because WAVE ignores the CSS `linear-gradient` white fill on the sibling `<motion.div>` and falls back to the `<header>` background (`#007ABB`). Visually the active tab text sits on solid white (`#FFFFFF`), which has a **4.67:1** WCAG AA passing contrast ratio.
- WAVE contrast & alert fixes applied across all pages:
  - `/feed`: darkened `Why You Two?` AI button in `MatchStack.tsx` from `#CC5500` (`4.31:1`) to `#C25000` (`4.73:1` WCAG AA pass), upgraded `text-slate-400` labels to `text-slate-600` (`7.58:1`), upgraded Navbar inactive links (`text-white/90` → `text-white`, `4.67:1`; mobile `text-white/70` → `text-white/95`), and set `alt=""` on `MatchStack` card avatars to eliminate the `Redundant alternative text` alert.
  - `/map`: darkened emerald cluster bubbles & pins in `MapCanvas.tsx` from `#10B981` (`2.54:1`) to `#047857` (`5.48:1` WCAG AA pass).
  - `/chat`: darkened conversation avatar initials in `app/chat/page.tsx` from `text-[#007ABB]` on `bg-[#E8F4FC]` (`4.19:1`) to `text-[#005E91]` (`6.19:1` WCAG AA pass).
  - `/auth/login` & `/auth/signup`: applied `bg-[#007ABB] dark:bg-[#B8E7FF]` directly on the active `AuthSwitch` link so WAVE evaluates `text-white` against `#007ABB` (`4.67:1`) instead of `bg-white` (`1:1`).
  - `/profile`: fixed `ProfileMatchCardPreview` name overlay (`text-slate-900` on light placeholder + dark gradient scrim over photos) and darkened `text-slate-400` labels to `text-slate-600`.
  - Justified remaining WAVE alerts: `Redundant link` (`Soloberty` logo + `Feed` nav tab both linking to `/feed`; `Login` nav tab + `Log In` pill in `AuthSwitch`) and `/map`'s `2 Very small text` alerts (Leaflet's built-in bottom-right OpenStreetMap attribution control).
- /map performance optimization (after intermediate 6.3s LCP run): Switched Leaflet tile URL from `{s}.tile.openstreetmap.org` to single HTTP/2 host `tile.openstreetmap.org` (`updateWhenZooming: false`, `crossOrigin: true`, `keepBuffer: 0`, `updateWhenIdle: true`) and added `preconnect` + `dns-prefetch` to `https://tile.openstreetmap.org` in `app/layout.tsx`.
- `/feed` SSR LCP optimization: converted `app/feed/page.tsx` to a Server Component that fetches completed public profiles via Firestore REST API (`revalidate: 60`) and passes `initialCards` to `<FeedClient>` → `<MatchStack>`, eliminating the client-side `Loading profiles...` spinner and Firestore waterfall on initial paint (PageSpeed Insights Mobile Performance: **100**).
- `/map` LCP & bundle optimization: removed the `locatingUser` gate in `app/map/page.tsx` so `<MapCanvas>` mounts immediately at `DEFAULT_CENTER` without blocking up to 4s on Auth + `navigator.geolocation`, lazy-loaded `UserPreviewCard` and `UserDetailModal` via `next/dynamic(..., { ssr: false })` only when opened, rendered an eager high-priority center Vienna tile preview in the `/map` Suspense/loading shell for early LCP discovery, and set `keepBuffer: 0` + `updateWhenIdle: true` on Leaflet's `TileLayer` to avoid downloading 30 off-screen buffer tiles.
- `/map` LCP follow-up (`b7f69f7`): replaced the external `256×256` `a.tile.openstreetmap.org` preview (which lost LCP to Leaflet tiles due to Chrome's upscaling penalty) with a local `360×360` WebP (`/map-preview-vienna.webp`, 27.5 KB) rendered at `320×320`, removed `crossOrigin: true` on Leaflet tiles, dynamically imported & idle-deferred `firebase/firestore` in `useUserMarkers.ts` and `app/map/page.tsx`, deferred `navigator.geolocation`, and replaced `motion/react` in `DistanceFilter.tsx` with pure CSS transitions.
- `/chat` performance optimization (`148e95c`): rendered the `Messages` `<header>` / `<h1>` directly in the `<Suspense>` fallback shell (`ChatListShell`) for instant SSR LCP, extracted `IndividualChat` into `components/Chat/IndividualChat.tsx` and lazy-loaded it + `UserDetailModal` via `next/dynamic(..., { ssr: false })`, replaced `motion/react` in the chat list with CSS transitions, and gated `useProfiles()` / `useUnreadMessages()` / dynamic `firebase/firestore` behind `SignedInChatList` so signed-out loads avoid unnecessary Firestore listeners.
- `/profile` performance optimization (`a2c7c1e`, Lighthouse Mobile Performance **96**): fixed mobile `h1 > h2` typography in `ProfileEditor.tsx` (`<h1>` `text-3xl sm:text-4xl` + `text-sm` subtitle vs. hydrated `<h2>` `text-2xl sm:text-3xl`) so the instant SSR header wins LCP instead of waiting on Firestore-hydrated name text (`8.5 s → ~1.0 s`), reserved `min-h` heights on the name row and Interest Photos section to eliminate CLS, lazy-loaded View Mode interest photos and gated back-face card `<img>`s behind `isFlipped`, and scoped `fetchUserProfile` to `[user?.uid]`.



