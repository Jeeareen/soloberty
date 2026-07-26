Vague vs. Precise Prompting: Discovery/Matching Card Interface
Correctness

Round 1 (prompt: "Build a Tinder-like card swiping interface in React.") generated a full single-file component in seconds. It ran, and swiping worked, but none of my three core UX decisions were honored: cards were stacked directly on top of each other with no partial visibility of the previous/next card, swiping produced a rotating tilt with green "LIKE" / red "NOPE" stamps I never asked for, and there was no undo at all — a feature I had explicitly called essential.

Round 2 (precise prompt, with layout spec, gesture design, file structure, and a verification step) produced three properly organized files matching my project's folder hierarchy, plus a test suite. Getting it running took much longer — 1.5–2 hours versus 30 minutes — because the first run produced a blank page. VS Code's integrated AI diagnosed it as an "Invalid hook call" caused by duplicate React instances resolving at runtime, fixed by aliasing react/react-dom in vite.config.ts. Once running, the layout still didn't match spec: only 2 cards showed (stacked, top card shifted slightly right) instead of the 3-card past/active/preview layout, and the active card was invisible until interacted with. Undo worked, but only once per entire session rather than being reusable after each new swipe, and it was implemented as a button instead of the swipe-triggered gesture I'd specified.

Accessibility

Round 1 had zero accessibility considerations — no ARIA roles, no keyboard handling, no focus management. Round 2's precise prompt explicitly required keyboard navigation, ARIA labels, live-region announcements, and prefers-reduced-motion support, and the AI delivered all of it: arrow-key swiping, role="dialog" for the expanded profile view, aria-live card-count announcements, and a working reduced-motion check. This was the single clearest win of writing a detailed prompt — none of it existed in round 1.

Edge Cases

Round 1 handled no edge cases: no swipe limit, no empty state, no undo. Round 2's test suite specifically verified the swipe-limit lockout, the empty "no more cards" state, and undo behavior — and running those tests surfaced real gaps rather than assumed correctness.

Review Effort & AI Mistakes Caught

Round 1 took seconds to generate but ~30 minutes to get running (I didn't yet know how to scaffold a Vite project). Round 2 took ~1 minute to generate but 1.5–2 hours of review and fixing. Two concrete AI mistakes stand out: (1) the AI wrote a full test file but never installed or configured a test runner — npm test failed with "Missing script," and running Jest/Vitest directly surfaced further gaps (mismatched mock APIs, missing jsdom environment) that I only found by installing and running the tests myself; (2) even after fixing the runner, 2 of 6 tests failed, revealing that the 3-card layout, initial visibility, and reusable-undo behavior didn't match my spec — bugs I only caught by actually using the app, not from the AI's own confidence in its output.