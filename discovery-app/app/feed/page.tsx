import { FeedClient } from './FeedClient';
import type { MatchCard } from '../../types/matching';

// Minimal Firestore REST value decoder for SSR public profile cards
function decodeFirestoreValue(val: any): any {
  if (!val || typeof val !== 'object') return undefined;
  if ('stringValue' in val) return val.stringValue;
  if ('integerValue' in val) return Number(val.integerValue);
  if ('doubleValue' in val) return Number(val.doubleValue);
  if ('booleanValue' in val) return Boolean(val.booleanValue);
  if ('nullValue' in val) return null;
  if ('arrayValue' in val) {
    return Array.isArray(val.arrayValue?.values)
      ? val.arrayValue.values.map(decodeFirestoreValue)
      : [];
  }
  if ('mapValue' in val) {
    const out: Record<string, any> = {};
    const fields = val.mapValue?.fields || {};
    for (const [k, v] of Object.entries(fields)) {
      out[k] = decodeFirestoreValue(v);
    }
    return out;
  }
  return undefined;
}

async function fetchInitialFeedCards(): Promise<MatchCard[]> {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId || projectId === 'soloberty-demo') return [];

  try {
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users?pageSize=30`;
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) return [];

    const json = await res.json();
    const docs = Array.isArray(json?.documents) ? json.documents : [];
    const cards: MatchCard[] = [];

    for (const doc of docs) {
      const fields = doc?.fields;
      if (!fields) continue;
      const data: Record<string, any> = {};
      for (const [k, v] of Object.entries(fields)) {
        data[k] = decodeFirestoreValue(v);
      }

      if (!data.profileCompleted) continue;

      const docId = typeof doc.name === 'string' ? doc.name.split('/').pop() || '' : '';
      const uid = data.uid || docId;
      if (!uid) continue;

      const rawInterestImages = Array.isArray(data.interestImages) ? data.interestImages : [];

      cards.push({
        id: uid,
        uid,
        name: data.name || 'Anonymous',
        age: typeof data.age === 'number' ? data.age : 25,
        gender: data.gender || 'other',
        bio: data.bio || '',
        interests: Array.isArray(data.interests) ? data.interests : [],
        location: {
          city: data.location?.city || 'Vienna, AT',
          coordinates: data.location?.coordinates,
        },
        avatarUrl: data.avatarUrl || data.profilePhoto?.url || '',
        interestImages: rawInterestImages
          .filter((img: any) => img && typeof img.url === 'string')
          .map((img: any, idx: number) => ({
            slot: typeof img.slot === 'number' ? img.slot : idx + 1,
            url: img.url,
          })),
      });
    }

    return cards;
  } catch {
    return [];
  }
}

export default async function FeedPage() {
  const initialCards = await fetchInitialFeedCards();
  return <FeedClient initialCards={initialCards} />;
}
