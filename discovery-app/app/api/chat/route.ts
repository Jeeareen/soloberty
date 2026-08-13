import { streamText } from 'ai';
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

    // Standardize message format to ensure compatibility with Vercel AI SDK streamText
    const formattedMessages = messages.map((m: any) => ({
      role: m.role || 'user',
      content: typeof m.content === 'string' ? m.content : (Array.isArray(m.parts) ? m.parts.map((p: any) => p.text || '').join('') : String(m.content || '')),
    }));

    const result = streamText({
      model: discoveryModel,
      system: DISCOVERY_SYSTEM_PROMPT,
      messages: formattedMessages,
      temperature: DEFAULT_MODEL_PARAMS.temperature,
      maxTokens: DEFAULT_MODEL_PARAMS.maxTokens,
    });

    return result.toDataStreamResponse();
  } catch (error: any) {
    console.error('[Soloberty Scout API Error]:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'An error occurred processing your request' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
