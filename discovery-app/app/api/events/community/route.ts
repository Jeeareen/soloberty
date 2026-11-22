import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import type { AppEvent, EventCategory } from '../../../../types/event';

export const maxDuration = 15;

const EVENTS_COLLECTION = 'events';

function getAdminDb() {
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountKey) {
    return null;
  }

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

export async function GET() {
  try {
    const db = getAdminDb();
    if (!db) {
      return NextResponse.json({ events: [] });
    }

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

    // Resolve attendee UIDs to display names in a single batched Firestore read
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
      } catch (lookupErr) {
        console.warn('[Community Events] Could not resolve attendee names:', lookupErr);
      }
    }

    const enrichedEvents = events.map((ev) => {
      const attendeeNames: Record<string, string> = {};
      for (const uid of ev.attendees) {
        attendeeNames[uid] =
          uidNameMap.get(uid) ||
          (uid === ev.hostId && ev.hostName ? ev.hostName : 'Soloberty Member');
      }
      return { ...ev, attendeeNames };
    });

    return NextResponse.json({ events: enrichedEvents });
  } catch (err) {
    console.error('[Community Events GET Error]:', err);
    return NextResponse.json({ events: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = getAdminDb();
    if (!db) {
      return NextResponse.json(
        { error: 'Server Firestore credentials are not configured.' },
        { status: 503 }
      );
    }

    const body = await req.json();
    const title = typeof body.title === 'string' ? body.title.trim().slice(0, 100) : '';
    const venue = typeof body.venue === 'string' ? body.venue.trim().slice(0, 80) : '';
    const city = typeof body.city === 'string' ? body.city.trim().slice(0, 60) : 'Nearby';
    const description =
      typeof body.description === 'string' ? body.description.trim().slice(0, 350) : '';
    const date = typeof body.date === 'string' ? body.date : '';
    const category = (body.category as EventCategory) || 'Social';
    const imageUrl =
      typeof body.imageUrl === 'string' && body.imageUrl.trim().startsWith('http')
        ? body.imageUrl.trim().slice(0, 500)
        : '';
    const hostId = typeof body.hostId === 'string' ? body.hostId.trim().slice(0, 128) : '';
    const hostName =
      typeof body.hostName === 'string' ? body.hostName.trim().slice(0, 80) : 'Community Host';
    const lat = Number(body.coordinates?.lat);
    const lng = Number(body.coordinates?.lng);

    if (!title || !venue || !date || !hostId || isNaN(lat) || isNaN(lng)) {
      return NextResponse.json(
        { error: 'Please fill in all required event fields and pin a valid location.' },
        { status: 400 }
      );
    }

    const payload = {
      source: 'community' as const,
      title,
      description: description || `Community ${category.toLowerCase()} meetup at ${venue}.`,
      date,
      venue,
      city: city || 'Nearby',
      coordinates: { lat, lng },
      category,
      ...(imageUrl ? { imageUrl } : {}),
      hostId,
      hostName,
      attendees: [hostId],
      createdAt: new Date().toISOString(),
    };

    const docRef = await db.collection(EVENTS_COLLECTION).add(payload);

    return NextResponse.json(
      {
        event: {
          id: docRef.id,
          ...payload,
          attendeeNames: { [hostId]: hostName },
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('[Community Events POST Error]:', err);
    return NextResponse.json(
      { error: 'Failed to publish community event. Please try again.' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const db = getAdminDb();
    if (!db) {
      return NextResponse.json(
        { error: 'Server Firestore credentials are not configured.' },
        { status: 503 }
      );
    }

    const body = await req.json();
    const eventId = typeof body.eventId === 'string' ? body.eventId.trim() : '';
    const uid = typeof body.uid === 'string' ? body.uid.trim() : '';
    const currentlyGoing = Boolean(body.currentlyGoing);

    if (!eventId || !uid) {
      return NextResponse.json({ error: 'Missing eventId or uid.' }, { status: 400 });
    }

    const docRef = db.collection(EVENTS_COLLECTION).doc(eventId);
    if (currentlyGoing) {
      const snap = await docRef.get();
      if (snap.exists && snap.data()?.hostId === uid) {
        return NextResponse.json(
          { error: 'As the event creator, your attendance is mandatory.' },
          { status: 400 }
        );
      }
    }

    await docRef.update({
      attendees: currentlyGoing ? FieldValue.arrayRemove(uid) : FieldValue.arrayUnion(uid),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[Community Events PATCH Error]:', err);
    return NextResponse.json({ error: 'Failed to update RSVP.' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const db = getAdminDb();
    if (!db) {
      return NextResponse.json(
        { error: 'Server Firestore credentials are not configured.' },
        { status: 503 }
      );
    }

    const body = await req.json();
    const eventId = typeof body.eventId === 'string' ? body.eventId.trim() : '';
    const hostId = typeof body.hostId === 'string' ? body.hostId.trim() : '';
    const title = typeof body.title === 'string' ? body.title.trim().slice(0, 100) : '';
    const venue = typeof body.venue === 'string' ? body.venue.trim().slice(0, 80) : '';
    const city = typeof body.city === 'string' ? body.city.trim().slice(0, 60) : 'Nearby';
    const description =
      typeof body.description === 'string' ? body.description.trim().slice(0, 350) : '';
    const date = typeof body.date === 'string' ? body.date : '';
    const category = (body.category as EventCategory) || 'Social';
    const imageUrl =
      typeof body.imageUrl === 'string' && body.imageUrl.trim().startsWith('http')
        ? body.imageUrl.trim().slice(0, 500)
        : '';
    const lat = Number(body.coordinates?.lat);
    const lng = Number(body.coordinates?.lng);

    if (!eventId || !hostId || !title || !venue || !date || isNaN(lat) || isNaN(lng)) {
      return NextResponse.json(
        { error: 'Missing required fields to update event.' },
        { status: 400 }
      );
    }

    const docRef = db.collection(EVENTS_COLLECTION).doc(eventId);
    const snap = await docRef.get();
    if (!snap.exists) {
      return NextResponse.json({ error: 'Event not found.' }, { status: 404 });
    }
    const existing = snap.data();
    if (existing?.hostId !== hostId) {
      return NextResponse.json(
        { error: 'Only the event creator can edit this event.' },
        { status: 403 }
      );
    }

    const updates = {
      title,
      description: description || `Community ${category.toLowerCase()} meetup at ${venue}.`,
      date,
      venue,
      city: city || 'Nearby',
      coordinates: { lat, lng },
      category,
      imageUrl: imageUrl || '',
    };

    await docRef.update(updates);

    return NextResponse.json({
      event: {
        id: eventId,
        source: 'community' as const,
        hostId: existing.hostId,
        hostName: existing.hostName || 'Community Host',
        attendees: Array.isArray(existing.attendees) ? existing.attendees : [],
        createdAt: existing.createdAt,
        ...updates,
        imageUrl: imageUrl || undefined,
      },
    });
  } catch (err) {
    console.error('[Community Events PUT Error]:', err);
    return NextResponse.json({ error: 'Failed to update event.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const db = getAdminDb();
    if (!db) {
      return NextResponse.json(
        { error: 'Server Firestore credentials are not configured.' },
        { status: 503 }
      );
    }

    const body = await req.json();
    const eventId = typeof body.eventId === 'string' ? body.eventId.trim() : '';
    const hostId = typeof body.hostId === 'string' ? body.hostId.trim() : '';

    if (!eventId || !hostId) {
      return NextResponse.json({ error: 'Missing eventId or hostId.' }, { status: 400 });
    }

    const docRef = db.collection(EVENTS_COLLECTION).doc(eventId);
    const snap = await docRef.get();
    if (!snap.exists) {
      return NextResponse.json({ error: 'Event not found.' }, { status: 404 });
    }
    if (snap.data()?.hostId !== hostId) {
      return NextResponse.json(
        { error: 'Only the event creator can delete this event.' },
        { status: 403 }
      );
    }

    await docRef.delete();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[Community Events DELETE Error]:', err);
    return NextResponse.json({ error: 'Failed to delete event.' }, { status: 500 });
  }
}
