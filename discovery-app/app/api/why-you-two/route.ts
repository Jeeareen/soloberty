import { NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { google, createGoogleGenerativeAI } from '@ai-sdk/google';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../lib/firebase/config';
import { whyYouTwoSchema, WHY_YOU_TWO_SYSTEM_PROMPT } from '../../../lib/tools/whyYouTwo';

export const maxDuration = 30;

async function resolveUserProfile(userParam: any): Promise<{ bio: string; interests: string[]; name?: string } | null> {
  if (!userParam) return null;

  // Case A: User object with direct bio or interests properties
  if (typeof userParam === 'object') {
    if (userParam.bio !== undefined || userParam.interests !== undefined) {
      return {
        bio: userParam.bio || '',
        interests: Array.isArray(userParam.interests) ? userParam.interests : [],
        name: userParam.name || userParam.displayName,
      };
    }
    const id = userParam.id || userParam.uid || userParam.currentUserId || userParam.matchedUserId;
    if (id) {
      return resolveUserProfile(id);
    }
    return null;
  }

  // Case B: String or number ID
  const idStr = String(userParam).trim();
  if (!idStr) return null;

  try {
    // 1. Direct doc lookup
    const docRef = doc(db, 'users', idStr);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      console.log('🔥 [Firestore Read - Server Terminal] Fetched current user profile for ID:', idStr, {
        name: data.name || data.displayName,
        bio: data.bio || '',
        interests: data.interests || [],
      });
      return {
        bio: data.bio || '',
        interests: Array.isArray(data.interests) ? data.interests : [],
        name: data.name || data.displayName,
      };
    }

    // 2. Query by 'uid' field
    const usersRef = collection(db, 'users');
    const qUid = query(usersRef, where('uid', '==', idStr));
    const snapUid = await getDocs(qUid);
    if (!snapUid.empty) {
      const data = snapUid.docs[0].data();
      return {
        bio: data.bio || '',
        interests: Array.isArray(data.interests) ? data.interests : [],
        name: data.name || data.displayName,
      };
    }

    // 3. Query by 'id' field
    const qId = query(usersRef, where('id', '==', idStr));
    const snapId = await getDocs(qId);
    if (!snapId.empty) {
      const data = snapId.docs[0].data();
      return {
        bio: data.bio || '',
        interests: Array.isArray(data.interests) ? data.interests : [],
        name: data.name || data.displayName,
      };
    }
  } catch (err) {
    console.warn('[why-you-two] Firestore lookup warning:', err);
  }

  return null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const currentUserInput = body.currentUser ?? body.currentUserId ?? body;
    const matchedUserInput = body.matchedUser ?? body.matchedUserId ?? body;

    let currentUserProfile = await resolveUserProfile(currentUserInput);
    if (!currentUserProfile) {
      currentUserProfile = {
        bio: body.currentUserBio ?? body.currentUser?.bio ?? '',
        interests: body.currentUserInterests ?? body.currentUser?.interests ?? [],
      };
    }

    let matchedUserProfile = await resolveUserProfile(matchedUserInput);
    if (!matchedUserProfile) {
      matchedUserProfile = {
        bio: body.matchedUserBio ?? body.matchedUser?.bio ?? '',
        interests: body.matchedUserInterests ?? body.matchedUser?.interests ?? [],
      };
    }

    const currentUserInterestsStr = Array.isArray(currentUserProfile.interests)
      ? currentUserProfile.interests.join(', ')
      : String(currentUserProfile.interests || '');

    const matchedUserInterestsStr = Array.isArray(matchedUserProfile.interests)
      ? matchedUserProfile.interests.join(', ')
      : String(matchedUserProfile.interests || '');

    // Interpolate profile details into prompt
    const prompt = WHY_YOU_TWO_SYSTEM_PROMPT
      .replace('{{currentUserBio}}', currentUserProfile.bio || 'None provided')
      .replace('{{currentUserInterests}}', currentUserInterestsStr || 'None provided')
      .replace('{{matchedUserBio}}', matchedUserProfile.bio || 'None provided')
      .replace('{{matchedUserInterests}}', matchedUserInterestsStr || 'None provided');

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
    const googleProvider = apiKey ? createGoogleGenerativeAI({ apiKey }) : google;
    const modelInstance = googleProvider('gemini-3.5-flash-lite');

    const { object } = await generateObject({
      model: modelInstance,
      schema: whyYouTwoSchema,
      prompt,
    });

    return NextResponse.json(object, { status: 200 });
  } catch (error: any) {
    const message = error instanceof Error ? error.message : String(error || '');
    const isRateLimit = message.includes('429') || message.includes('rate limit') || message.includes('quota') || message.includes('RATE_LIMIT');
    const isNetwork = message.includes('fetch failed') || message.includes('ECONNRESET') || message.includes('network') || message.includes('NETWORK_ERROR');
    const isMalformed = error?.name === 'AI_TypeValidationError' || message.includes('schema') || message.includes('MALFORMED_RESPONSE');

    console.error('[why-you-two route error]:', { isRateLimit, isNetwork, isMalformed, message });

    if (isRateLimit) {
      return NextResponse.json(
        { error: 'RATE_LIMIT', message: 'Too many requests right now — try again in a moment.' },
        { status: 429 }
      );
    }
    if (isNetwork) {
      return NextResponse.json(
        { error: 'NETWORK_ERROR', message: "Couldn't reach the AI service." },
        { status: 503 }
      );
    }
    if (isMalformed) {
      return NextResponse.json(
        { error: 'MALFORMED_RESPONSE', message: 'Got an unexpected response structure from AI.' },
        { status: 502 }
      );
    }

    return NextResponse.json(
      { error: 'GENERATION_FAILED', message: "Couldn't generate comparison right now." },
      { status: 500 }
    );
  }
}
