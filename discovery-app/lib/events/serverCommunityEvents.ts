import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import type { AppEvent, EventCategory } from '../../types/event';

const EVENTS_COLLECTION = 'events';

function getAdminDb() {
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountKey) return null;

  if (!getApps().length) {
    const serviceAccount = JSON.parse(serviceAccountKey);
    if (typeof serviceAccount.private_key === 'string') {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }
    initializeApp({
      credential: cert(serviceAccount),
    });
  }

  return getFirestore();
}

export async function fetchCommunityEventsServer(): Promise<AppEvent[]> {
  try {
    const db = getAdminDb();
    if (!db) return [];

    const snap = await db
      .collection(EVENTS_COLLECTION)
      .orderBy('date', 'asc')
      .limit(50)
      .get();

    const cutoff = Date.now() - 1000 * 60 * 60 * 12;
    const events: AppEvent[] = [];

    snap.forEach((docSnap) => {
      const data = docSnap.data();
      if (!data?.title || !data?.coordinates) return;
      const dateStr = typeof data.date === 'string' ? data.date : new Date().toISOString();
      if (new Date(dateStr).getTime() < cutoff) return;

      events.push({
        id: docSnap.id,
        source: 'community',
        title: String(data.title),
        description: String(data.description || ''),
        date: dateStr,
        venue: String(data.venue || 'Community Spot'),
        city: String(data.city || 'Nearby'),
        coordinates: {
          lat: Number(data.coordinates.lat),
          lng: Number(data.coordinates.lng),
        },
        category: (data.category as EventCategory) || 'Social',
        imageUrl: typeof data.imageUrl === 'string' && data.imageUrl ? data.imageUrl : undefined,
        hostId: data.hostId ? String(data.hostId) : undefined,
        hostName: data.hostName ? String(data.hostName) : 'Community Host',
        attendees: Array.isArray(data.attendees) ? data.attendees : [],
        createdAt: data.createdAt ? String(data.createdAt) : undefined,
      });
    });

    const uniqueUids = Array.from(
      new Set(events.flatMap((ev) => ev.attendees).filter(Boolean))
    );
    const uidNameMap = new Map<string, string>();
    if (uniqueUids.length > 0) {
      try {
        const userRefs = uniqueUids.map((uid) => db.collection('users').doc(uid));
        const userDocs = await db.getAll(...userRefs);
        userDocs.forEach((uDoc) => {
          if (uDoc.exists) {
            const uData = uDoc.data();
            if (uData?.name) {
              uidNameMap.set(uDoc.id, String(uData.name));
            }
          }
        });
      } catch {
        // ignore name lookup errors
      }
    }

    return events.map((ev) => {
      const attendeeNames: Record<string, string> = {};
      for (const uid of ev.attendees) {
        attendeeNames[uid] =
          uidNameMap.get(uid) ||
          (uid === ev.hostId && ev.hostName ? ev.hostName : 'Soloberty Member');
      }
      return { ...ev, attendeeNames };
    });
  } catch (err) {
    console.warn('[SSR Community Events Warning]:', err);
    return [];
  }
}
