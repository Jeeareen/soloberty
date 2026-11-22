import { streamText, tool } from 'ai';
import { google, createGoogleGenerativeAI } from '@ai-sdk/google';
import { suggestIcebreakersSchema, executeSuggestIcebreakers } from '../../../lib/tools/suggestIcebreakers';
import { checkRateLimit, rateLimitResponse } from '../../../lib/ai/rateLimit';

export const maxDuration = 30;
const MAX_MESSAGES = 20;
const MAX_MESSAGE_CHARS = 1500;
const MAX_TOTAL_CHARS = 8000;

function parsePromptParams(promptText: string) {
  const nameMatch = promptText.match(/questions for\s+([^,]+)/i);
  const bioMatch = promptText.match(/Bio:\s*([\s\S]*?)(?=\s*Interests:|$)/i);
  const interestsMatch = promptText.match(/Interests:\s*(.*)/i);

  const name = nameMatch ? nameMatch[1].trim() : 'User';
  const bio = bioMatch ? bioMatch[1].trim() : '';
  const interests = interestsMatch
    ? interestsMatch[1].split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  return { name, bio, interests };
}

export async function POST(req: Request) {
  const limitResult = checkRateLimit(req, {
    route: 'api:chat',
    maxRequests: 20,
    windowMs: 60_000,
  });
  if (limitResult.limited) {
    return rateLimitResponse(limitResult.retryAfterSeconds);
  }

  let userPrompt = '';
  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'Messages array is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Format, sanitize, and cap messages array to prevent prompt/token abuse
    let totalChars = 0;
    const formattedMessages = messages.slice(-MAX_MESSAGES).map((m: any) => {
      let content = m.content;
      if (content === undefined || content === null) {
        if (Array.isArray(m.parts)) {
          content = m.parts
            .filter((p: any) => p.type === 'text' && typeof p.text === 'string')
            .map((p: any) => p.text)
            .join('');
        } else {
          content = '';
        }
      }

      const strContent = (typeof content === 'string' ? content : String(content || '')).slice(
        0,
        MAX_MESSAGE_CHARS
      );
      totalChars += strContent.length;
      if (m.role === 'user' && strContent) {
        userPrompt = strContent;
      }

      return {
        role: m.role || 'user',
        content: strContent,
      };
    });

    if (totalChars > MAX_TOTAL_CHARS) {
      return new Response(
        JSON.stringify({ error: 'Conversation payload exceeds maximum allowed length.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
    const googleProvider = apiKey ? createGoogleGenerativeAI({ apiKey }) : google;
    const modelInstance = googleProvider('gemini-3.5-flash-lite');

    try {
      const result = streamText({
        model: modelInstance,
        system:
          'You are Soloberty Scout, an enthusiastic and friendly AI discovery assistant for Soloberty. Help users find matches, explore hobbies, discuss shared interests, and give personalized recommendations. If a user asks for icebreaker questions or provides a profile to get icebreakers for, use the suggestIcebreakers tool. Otherwise, engage in natural, helpful conversation.',
        messages: formattedMessages,
        maxSteps: 5,
        tools: {
          suggestIcebreakers: tool({
            description:
              'Generates 3 warm, personal icebreaker questions based on a user profile (name, bio, interests). Use this tool when the user asks for icebreaker suggestions or provides profile info for icebreakers.',
            parameters: suggestIcebreakersSchema,
            execute: executeSuggestIcebreakers,
          } as any),
        },
      } as any);

      const getErrorMessage = (error: unknown) => {
        const message = error instanceof Error ? error.message : String(error || '');
        if (message.includes('RATE_LIMIT')) {
          return 'Too many requests right now — try again in a moment.';
        }
        if (message.includes('NETWORK_ERROR')) {
          return "Couldn't reach the AI service.";
        }
        if (message.includes('MALFORMED_RESPONSE')) {
          return 'Got an unexpected response.';
        }
        return "Couldn't generate suggestions right now.";
      };

      if (typeof (result as any).toUIMessageStreamResponse === 'function') {
        return (result as any).toUIMessageStreamResponse({ getErrorMessage });
      }
      if (typeof (result as any).toDataStreamResponse === 'function') {
        return (result as any).toDataStreamResponse({ getErrorMessage });
      }
      if (typeof (result as any).toTextStreamResponse === 'function') {
        return (result as any).toTextStreamResponse();
      }

      return (result as any).toResponse();
    } catch (modelErr) {
      console.warn('[streamText Execution Fallback]:', modelErr);
    }

    // Direct tool fallback execution if Gemini API stream fails
    const parsed = parsePromptParams(userPrompt);
    const icebreakerData = await executeSuggestIcebreakers(parsed);

    const fallbackResponseData = [
      {
        id: 'msg-' + Date.now(),
        role: 'assistant',
        parts: [
          {
            type: 'tool-invocation',
            toolInvocation: {
              state: 'result',
              toolCallId: 'call-' + Date.now(),
              toolName: 'suggestIcebreakers',
              args: parsed,
              result: icebreakerData,
            },
          },
        ],
      },
    ];

    return new Response(JSON.stringify(fallbackResponseData), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('[Soloberty Scout Chat Route Error]:', error);

    const parsed = parsePromptParams(userPrompt);
    const icebreakerData = await executeSuggestIcebreakers(parsed);

    return new Response(
      JSON.stringify({
        questions: icebreakerData.questions,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
