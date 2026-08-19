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

// Execute function that calls Gemini via @ai-sdk/google using generateObject()
export async function executeSuggestIcebreakers(
  input: SuggestIcebreakersInput
): Promise<IcebreakerResult> {
  try {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
    const modelInstance = apiKey
      ? google('gemini-3.5-flash-lite', { apiKey })
      : google('gemini-3.5-flash-lite');

    const safeInterests = Array.isArray(input?.interests) ? input.interests : [];

    const { object } = await generateObject({
      model: modelInstance,
      schema: z.object({
        questions: z
          .array(z.string())
          .length(3)
          .describe('Exactly 3 warm, personal icebreaker questions referencing their bio and interests'),
      }),
      prompt:
        `You are generating icebreaker questions to start a friendly, genuine conversation with ${input.name}.\n` +
        `Profile Details:\n` +
        `- Name: ${input.name}\n` +
        `- Bio: ${input.bio}\n` +
        `- Interests: ${safeInterests.join(', ')}\n\n` +
        `Generate exactly 3 fun, personal, engaging icebreaker questions that directly mention or relate to their bio and interests.`,
    });

    return {
      questions: object.questions,
    };
  } catch (error) {
    console.warn('[executeSuggestIcebreakers Fallback Triggered]:', error);
    const safeInterests = Array.isArray(input?.interests) ? input.interests : [];
    const firstInterest = safeInterests[0] || 'your hobbies';
    const secondInterest = safeInterests[1] || 'exploring new activities';

    return {
      questions: [
        `Hey ${input.name}! What's your absolute favorite thing about ${firstInterest}?`,
        `I saw in your bio that you love ${secondInterest} — what's a recent highlight or story from that?`,
        `Hi ${input.name}! If you could plan the ultimate day out centered around ${firstInterest}, what would we do?`,
      ],
    };
  }
}
