Changes since committing to the nextjs-migration branch:

01/08/26
1. Migrating existing project to Next.js
-index.htm - Deleted single-page HTML entry template used by Vite.
-vite.config.ts - Deleted Vite config file.
-src directory cleaned & moved
    src/main.tsx — Deleted React DOM root renderer.
    src/App.tsx & src/App.css — Deleted initial Vite starter components.
    src/index.css — Deleted legacy Tailwind @import "tailwindcss" file.
    src/assets/ — Deleted Vite logo SVGs (react.svg, vite.svg, hero.png).
    src/components/MatchStack.tsx & src/components/MatchStack.test.tsx — Moved to root components/.
    src/types/matching.ts — Moved to root types/.
-Added Next.js Build & configuration files.
-next.config.ts (New): Added Next.js configuration object.
-tailwind.config.ts (New) : Configured Tailwind CSS content pats scanning ./app/**/*.{js,ts,jsx,tsx}, ./components/**/*.{js,ts,jsx,tsx}, and ./pages/**/*.{js,ts,jsx,tsx}.
-postcss.config.mjs (New): Configured @tailwindcss/postcss plugin for Next.js build pipeline.
-next-env.d.ts (New): Auto-generated Next.js TypeScript environment declarations.
-tsconfig.app.json (Modified): Updated the include compiler option from ["src"] to ["app", "components", "types", "assets", "src"].
-package.json / package-lock.json (Modified): Switched dependencies to next (v16.2.12), react (v19), react-dom (v19), framer-motion, @tailwindcss/postcss, and tailwindcss (v4).
-app/layout.tsx (New): Root Next.js layout defining standard <html> / <body> tags and loading ./globals.css.
-app/globals.css (New): Global styles file importing Tailwind CSS v4 directive @import "tailwindcss";.
-app/page.tsx (New): Home page route (/).
-app/feed/page.tsx (New): Feed page rendering <MatchStack cards={defaultMockCards} />.
-app/discover/page.tsx (New): Discover page route (/discover).
-app/map/page.tsx (New): Map page route (/map).
-app/chat/page.tsx (New): Messaging/Chat route (/chat).
-app/health/page.tsx (New): Health check endpoint route (/health).
-app/login/page.tsx & app/login/layout.tsx (New): Authentication page and custom layout for /login.
-app/profile/page.tsx &
-app/profile/settings/page.tsx (New): Profile and settings page routes.
-🛠️ Component Updates & Bug Fixes
types/matching.ts
-Exported the mock dataset: export const defaultMockCards: MatchCard[] = [...] ( L19).
-Added inline centering styles (style={{ margin: '0 auto', marginTop: '24px' }}) on line 171.
-app/feed/page.tsx: Resolved broken import paths and duplicate imports, standardizing the import statement to:
    import { MatchStack, defaultMockCards } from '../../components/MatchStack';
    export default function FeedPage() {
        return <MatchStack cards={defaultMockCards} />;
    }

Next.js App Router Setup Complete

02/08/26
2. Particularly fixing matching stack component

- Removed the seperate undo button
- Swiping Left rejects the current profile card and grants 1 Right-Swipe (Undo) credit.
- Swiping Right consumes the credit and restores the previously rejected card.
- After using the right swipe, subsequent right swipes are safely blocked until a new left swipe is performed.

- Changed the card layout to a Horizontal 3-Card Stack layout.
- Active Card (Middle): Scale 1.0 (20% larger than side cards), z-index: 30.
- Past Card (Left): Only renders when currentIndex > 0. Scale 0.8, z-index: 10, positioned so 50% of its width is visible and 50% is hidden under the Active card.
- Preview Card (Right): Renders when currentIndex + 1 < cards.length. Scale 0.8, z-index: 20, positioned so 50% of its width is visible and 50% is hidden under the Active card.

- Instant Mount & Un-expand Visibility:
- Initial mount renders the active and preview cards in their final, visible state (opacity: 1, scale: 1, x: 0).
- Closing the detail modal dialog leaves the active card immediately visible and interactive.

- 50 Cards & Feed Page Integration:
- Expanded default mock dataset to 50 profile cards.
- Rendered cleanly on /feed (page.tsx).

- Updated the undo mechanism so that only a single right-swipe undo is allowed at a time, regardless of how many left swipes were performed earlier.

- Changed the animation from tilting cards to Stack Carousel with Depth Scaling.

- Fixed the keyboard navigation issue in MatchStack.tsx
- Switched to Global Keyboard Listener to make the swiping keyboard navigation work regardless of which element has focus.
- no initial click required each time so the arrow keys work.

- Particularly  fixed the snapping issue upon releasing the left mouse button (LMB) in MatchStack.tsx

- updated MatchStack.tsx to make the card transition seamlessly into the carousel stack
- when you swipe left, the active card smoothly slides from 0px to -140px (the exact position of the Past Card slot) while scaling down to 80%.
- At the exact same time, the Preview Card slides from +140px to 0px while scaling up to 100%.
- Right-swipe undo similarly animates the active card from 0px to +140px (into the Preview Card slot).

-  updated MatchStack.tsx with the incoming Next Preview Card animation

- 2-Faced 3D Flip Card Animation:
- Removed the swipe-up modal sheet and drag-up gesture.
- 3D Vertical Axis Flip:
- Applied 3D perspective (perspective: 1000px) and rotateY animations (0deg <-> 180deg) over 0.4s smooth transition.
- Front Face: Displays profile name, title summary, and a subtle prompt ("Tap card to view details 🔄").
- Back Face: Rotated 180°, displaying the profile name, summary, and full bio details ("Tap card to flip back 🔄").
- Interaction:
- Tapping/clicking the card or pressing Space/Enter flips the card 180° around its vertical axis to reveal the details.
- Tapping again, pressing Escape, or swiping left/right flips it back to the front face.

- Created the top navigation bar and updated the routes
- NOTE: HEALTH PAGE CAN BE ACCESSED FROM PROFILE PAGE.

----

Next.js App Scaffolding & Roots - Done

Server vs. Client Components - Routes use Server Components by default; interactive components (MatchStack.tsx, Navbar.tsx) use 'use client'- Done

Top Blue Navigation Bar	- Done

Health Check Page (/health) - Server component fetching live API data with Status: OK. Accessible from /profile - Done

Tailwind CSS & Tokens -  Base tokens, HSL Tailwind colors, and layout utilities configured (globals.css, tailwind.config.ts) - Done

Production Build (npm run build) - Tested locally — compiled 11 static & dynamic pages with 0 errors - Done

No Secrets in Repo - Done

Responsive Design (375px & 1280px) - Tested and formatted for mobile viewports (375px) and desktop screens (1280px). - Done

