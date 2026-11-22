import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { NextResponse } from 'next/server';

export const maxDuration = 30;

// Simple in-memory rate limiter (15 requests per minute per IP)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 15;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  if (entry.count >= RATE_LIMIT_MAX) return true;
  entry.count += 1;
  return false;
}

interface CompactEvent {
  id: string;
  title: string;
  category: string;
  venue: string;
  city: string;
  date: string;
  description: string;
}

function fallbackRecommend(
  prompt: string,
  userInterests: string[],
  events: CompactEvent[]
) {
  const terms = `${prompt} ${userInterests.join(' ')}`
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 3);

  const scored = events.map((ev) => {
    const text = `${ev.title} ${ev.category} ${ev.description} ${ev.venue}`.toLowerCase();
    let score = 0;
    for (const t of terms) {
      if (text.includes(t)) score += 1;
    }
    return { ev, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, 3);

  return {
    summary: prompt
      ? `Here are the closest matches for "${prompt}".`
      : 'Top picks based on your interests and upcoming local events.',
    recommendations: top.map(({ ev }) => ({
      id: ev.id,
      reason: `Great ${ev.category.toLowerCase()} pick at ${ev.venue}.`,
    })),
  };
}

export async function POST(req: Request) {
  try {
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      'unknown';

    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a minute and try again.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim().slice(0, 300) : '';
    const userInterests: string[] = Array.isArray(body.userInterests)
      ? body.userInterests.slice(0, 12).map((i: unknown) => String(i).slice(0, 40))
      : [];
    const events: CompactEvent[] = Array.isArray(body.events)
      ? body.events.slice(0, 25).map((e: any) => ({
          id: String(e.id || '').slice(0, 80),
          title: String(e.title || '').slice(0, 120),
          category: String(e.category || '').slice(0, 40),
          venue: String(e.venue || '').slice(0, 80),
          city: String(e.city || '').slice(0, 60),
          date: String(e.date || '').slice(0, 40),
          description: String(e.description || '').slice(0, 220),
        }))
      : [];

    if (events.length === 0) {
      return NextResponse.json({
        summary: 'No events available to recommend right now.',
        recommendations: [],
      });
    }

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(fallbackRecommend(prompt, userInterests, events));
    }

    const googleProvider = createGoogleGenerativeAI({ apiKey });
    const modelInstance = googleProvider('gemini-3.5-flash-lite');

    const userContext = prompt
      ? `User request: "${prompt}"${userInterests.length ? `\nUser profile interests: ${userInterests.join(', ')}` : ''}`
      : `User wants personalized recommendations based on their interests: ${
          userInterests.length ? userInterests.join(', ') : 'music, social, outdoors, culture'
        }`;

    const catalogText = events
      .map(
        (e) =>
          `- id: "${e.id}" | title: "${e.title}" | category: ${e.category} | venue: ${e.venue} (${e.city}) | date: ${e.date} | desc: ${e.description}`
      )
      .join('\n');

    const { text } = await generateText({
      model: modelInstance,
      system:
        'You are Soloberty Scout, an AI event concierge. Pick the best 2 to 4 matching events from the provided catalog ONLY. Respond strictly with valid JSON (no markdown fences) in this exact shape: {"summary":"1 short friendly sentence","recommendations":[{"id":"exact-event-id","reason":"1 short punchy reason under 110 chars"}]}',
      prompt: `${userContext}\n\nAvailable events:\n${catalogText}`,
    });

    const cleaned = text
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    const parsed = JSON.parse(cleaned);
    const validIds = new Set(events.map((e) => e.id));
    const recommendations = Array.isArray(parsed?.recommendations)
      ? parsed.recommendations
          .filter((r: any) => r && typeof r.id === 'string' && validIds.has(r.id))
          .slice(0, 4)
          .map((r: any) => ({
            id: r.id,
            reason: typeof r.reason === 'string' ? r.reason.slice(0, 140) : 'Great match for you.',
          }))
      : [];

    if (recommendations.length === 0) {
      return NextResponse.json(fallbackRecommend(prompt, userInterests, events));
    }

    return NextResponse.json({
      summary:
        typeof parsed?.summary === 'string'
          ? parsed.summary.slice(0, 200)
          : 'Here are your top event picks.',
      recommendations,
    });
  } catch (error) {
    console.error('[Events Recommend Route Error]:', error);
    return NextResponse.json(
      { error: 'Could not generate event recommendations right now.' },
      { status: 500 }
    );
  }
}
