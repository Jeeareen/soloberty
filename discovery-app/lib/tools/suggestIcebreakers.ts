import { z } from 'zod';
import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';

// Zod schema for tool input
export const suggestIcebreakersSchema = z.object({
  name: z.string().describe("The other person's first name"),
  bio: z.string().describe("Their profile bio"),
  interests: z.array(z.string()).describe("List of their interests"),
});

export type SuggestIcebreakersInput = z.infer<typeof suggestIcebreakersSchema>;

// Result interface
export interface IcebreakerResult {
  questions: string[]; // output: exactly 3 questions
}

export async function executeSuggestIcebreakers(
  input: SuggestIcebreakersInput
): Promise<IcebreakerResult> {
  const safeInterests = Array.isArray(input?.interests) ? input.interests : [];
  const safeName = input?.name || 'there';

  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
  const modelInstance = apiKey
    ? google('gemini-3.5-flash-lite', { apiKey })
    : google('gemini-3.5-flash-lite');

  try {
    const { object } = await generateObject({
      model: modelInstance,
      schema: z.object({
        questions: z.array(z.string()).length(3),
      }),
      prompt: `Generate 3 personal icebreakers for ${safeName} based on bio: ${input.bio || 'no bio provided'} and interests: ${safeInterests.join(', ') || 'none listed'}`,
    });

    //FOR DEBUGGING PURPOSES; COMMENT IT AFTER USING
    //await new Promise(resolve => setTimeout(resolve, 5000)); // 5 second delay
    /*
    await new Promise((_, reject) =>
      setTimeout(() => reject(new Error('NETWORK_ERROR')), 2000)
    );
    */
    //return { questions: [] };

    return { questions: object.questions };
  } catch (error) {
    // Classify the failure — this is the important part.
    const message = error instanceof Error ? error.message : String(error);
    const isRateLimit = message.includes('429') || message.includes('rate limit') || message.includes('quota');
    const isNetwork = message.includes('fetch failed') || message.includes('ECONNRESET') || message.includes('network');
    const isMalformed = error?.name === 'AI_TypeValidationError' || message.includes('schema');

    // These are real failures — let them throw so the tool call
    // surfaces as state 'error' in the UI, with a retry.
    if (isRateLimit || isNetwork || isMalformed) {
      console.error('[suggestIcebreakers] hard failure:', { isRateLimit, isNetwork, isMalformed, message });
      throw new Error(
        isRateLimit
          ? 'RATE_LIMIT'
          : isNetwork
            ? 'NETWORK_ERROR'
            : 'MALFORMED_RESPONSE'
      );
    }

    // Anything else unclassified: still treat as a real error rather
    // than silently faking success. Better to surface it than hide it.
    console.error('[suggestIcebreakers] unclassified failure:', message);
    throw new Error('GENERATION_FAILED');
  }
}
