import { streamText, convertToModelMessages } from 'ai';
import { discoveryModel, DISCOVERY_SYSTEM_PROMPT, DEFAULT_MODEL_PARAMS } from '../../../lib/ai/config';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'Messages array is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Call streamText using our isolated config module
    const result = streamText({
      model: discoveryModel,
      system: DISCOVERY_SYSTEM_PROMPT,
      messages: await convertToModelMessages(messages),
      temperature: DEFAULT_MODEL_PARAMS.temperature,
      maxTokens: DEFAULT_MODEL_PARAMS.maxTokens,
    });

    // Return real streaming response (compatible with useChat client hook)
    return result.toUIMessageStreamResponse();
  } catch (error: any) {
    console.error('[Solibero Discovery AI Chat API Error]:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'An error occurred processing your request' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
