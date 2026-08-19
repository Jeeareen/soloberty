import { streamText, tool } from 'ai';
import { google } from '@ai-sdk/google';
import { suggestIcebreakersSchema, executeSuggestIcebreakers } from '../../../lib/tools/suggestIcebreakers';

export const maxDuration = 30;

function parsePromptParams(promptText: string) {
  const nameMatch = promptText.match(/questions for\s+([^,.]+)/i);
  const bioMatch = promptText.match(/Bio:\s*([\s\S]*?)(?=\.?\s*Interests:|$)/i);
  const interestsMatch = promptText.match(/Interests:\s*(.*)/i);

  const name = nameMatch ? nameMatch[1].trim() : 'User';
  const bio = bioMatch ? bioMatch[1].trim() : '';
  const interests = interestsMatch
    ? interestsMatch[1].split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  return { name, bio, interests };
}

export async function POST(req: Request) {
  let userPrompt = '';
  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'Messages array is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Format and sanitize messages array
    const formattedMessages = messages.map((m: any) => {
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

      const strContent = typeof content === 'string' ? content : String(content || '');
      if (m.role === 'user' && strContent) {
        userPrompt = strContent;
      }

      return {
        role: m.role || 'user',
        content: strContent,
      };
    });

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
    const modelInstance = apiKey
      ? google('gemini-3.5-flash-lite', { apiKey })
      : google('gemini-3.5-flash-lite');

    try {
      const result = streamText({
        model: modelInstance,
        system:
          'You are Soloberty Scout. Your ONLY task when given a profile is to call the suggestIcebreakers tool. Do NOT write any conversational text messages or chat responses yourself.',
        messages: formattedMessages,
        maxSteps: 5,
        tools: {
          suggestIcebreakers: tool({
            description:
              'Generates 3 warm, personal icebreaker questions based on a user profile (name, bio, interests).',
            parameters: suggestIcebreakersSchema,
            execute: executeSuggestIcebreakers,
          }),
        },
      });

      if (typeof (result as any).toUIMessageStreamResponse === 'function') {
        return (result as any).toUIMessageStreamResponse();
      }
      if (typeof (result as any).toDataStreamResponse === 'function') {
        return (result as any).toDataStreamResponse();
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
