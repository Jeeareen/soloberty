# Soloberty — Discovery App & Generative AI Icebreaker Tool

Soloberty is an AI-native social discovery application built with Next.js, React, TailwindCSS, and Framer Motion, powered by Google's `gemini-3.5-flash-lite`.

---

## AI Server-Side Tool Contract

### Tool Name
`suggestIcebreakers`

### Tool Definition File
[`discovery-app/lib/tools/suggestIcebreakers.ts`](file:///c:/dev/solibero-main/discovery-app/lib/tools/suggestIcebreakers.ts)

---

### Input Schema (Zod)
```typescript
import { z } from 'zod';

export const suggestIcebreakersSchema = z.object({
  name: z.string().describe("The target person's first name"),
  bio: z.string().describe("Their profile bio text"),
  interests: z.array(z.string()).describe("List of their profile interest tags"),
});
```

---

### Return Shape
```typescript
export interface IcebreakerResult {
  questions: string[]; // Array of exactly 3 personalized icebreaker questions
}
```

---

## Tool Lifecycle & Generative UI States

The `suggestIcebreakers` tool handles the complete 4-state lifecycle using typed tool parts and smooth Framer Motion spring transitions:

1. **State 1 — Input Streaming (`partial-call`)**:
   - **UI**: `"Scout is generating icebreakers"` pill with staggered animated 3-dot pulse.
   - **Role**: Indicates active background generation without layout shift.

2. **State 2 — Input Available (`call`)**:
   - **UI**: Styled profile card displaying target name and active `#interest` tags.
   - **Role**: Renders structured input parameters clearly to the user for 1.1s before morphing.

3. **State 3 — Output Available (`result`)**:
   - **UI**: Designed Emerald result container featuring 3 interactive, tappable icebreaker question chips.
   - **Role**: Tapping any question auto-populates the chat input bar.

4. **State 4 — Output Error (`error`)**:
   - **UI**: Designed Rose alert container with warning icon and an interactive **Retry** button.
   - **Role**: Graceful failure recovery without application crashes.

---

## Model Mandate
- Model: `gemini-3.5-flash-lite` via `@ai-sdk/google`
- Governed by project rule: [`.agents/rules/AgentRules.md`](file:///c:/dev/solibero-main/.agents/rules/AgentRules.md)
