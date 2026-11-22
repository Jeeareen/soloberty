import { generateText } from 'ai';
import { google, createGoogleGenerativeAI } from '@ai-sdk/google';
import { checkRateLimit, rateLimitResponse } from '../../../lib/ai/rateLimit';

export const maxDuration = 30;

export async function POST(req: Request) {
  const limitResult = checkRateLimit(req, {
    route: 'api:bio',
    maxRequests: 10,
    windowMs: 60_000,
  });
  if (limitResult.limited) {
    return rateLimitResponse(limitResult.retryAfterSeconds);
  }

  try {
    const body = await req.json();
    const name = typeof body.name === 'string' ? body.name.trim().slice(0, 60) : '';
    const interests =
      typeof body.interests === 'string'
        ? body.interests.trim().slice(0, 250)
        : Array.isArray(body.interests)
          ? body.interests.slice(0, 12).map(String).join(', ').slice(0, 250)
          : '';

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
    const googleProvider = apiKey ? createGoogleGenerativeAI({ apiKey }) : google;
    const modelInstance = googleProvider('gemini-3.5-flash-lite');

    const promptText = `Write a single creative, warm, authentic first-person bio (between 60 and 260 characters, no quotes, no title, no meta commentary) for ${
      name || 'a member'
    } who loves ${interests || 'exploring new hobbies'}. DO NOT start the bio with their age or a number. Start naturally with an introduction or hook. Incorporate their interests (${
      interests || 'hobbies'
    }).`;

    const { text } = await generateText({
      model: modelInstance,
      system:
        'You are Soloberty Scout, an AI helper for the Soloberty app. Your job is to draft creative, warm, authentic first-person user bios.',
      prompt: promptText,
    });

    const cleanedText = (text || '')
      .replace(/[\r\n]+/g, ' ')
      .replace(/^"|"$/g, '')
      .replace(/^\d+\s*,\s*/, '')
      .replace(/^\d+\s*-?\s*year\s*-?\s*old\s*,?\s*/i, '')
      .trim()
      .slice(0, 300);

    return new Response(JSON.stringify({ bio: cleanedText }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('[Soloberty Scout Bio Route Error]:', error);
    return new Response(JSON.stringify({ error: 'Failed to generate bio' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
