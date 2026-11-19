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
- Navbar active tab (`#007ABB` on `linear-gradient` white background): WAVE may flag 1 contrast false-positive because it ignores CSS `linear-gradient` on the sibling `motion.div` and compares `#007ABB` against the `<header>` background `#007ABB` (1:1). Visually the text sits on solid white (`#FFFFFF`), which has 4.55:1+ WCAG AA contrast.
- `/feed` SSR LCP optimization: converted `app/feed/page.tsx` to a Server Component that fetches completed public profiles via Firestore REST API (`revalidate: 60`) and passes `initialCards` to `<FeedClient>` → `<MatchStack>`, eliminating the client-side `Loading profiles...` spinner and Firestore waterfall on initial paint (PageSpeed Insights Mobile Performance: **100**).
- `/map` LCP & bundle optimization: removed the `locatingUser` gate in `app/map/page.tsx` so `<MapCanvas>` mounts immediately at `DEFAULT_CENTER` without blocking up to 4s on Auth + `navigator.geolocation`, lazy-loaded `UserPreviewCard` and `UserDetailModal` via `next/dynamic(..., { ssr: false })` only when opened, rendered an eager high-priority center Vienna tile preview in the `/map` Suspense/loading shell for early LCP discovery, and set `keepBuffer: 0` + `updateWhenIdle: true` on Leaflet's `TileLayer` to avoid downloading 30 off-screen buffer tiles.



