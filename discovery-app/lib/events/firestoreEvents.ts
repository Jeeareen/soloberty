import type { AppEvent, EventCategory } from '../../types/event';

export async function fetchCommunityEvents(): Promise<AppEvent[]> {
  try {
    const res = await fetch('/api/events/community', { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.events) ? data.events : [];
  } catch (err) {
    console.warn('[Community Events] Could not fetch community events:', err);
    return [];
  }
}

export interface CreateCommunityEventInput {
  title: string;
  description: string;
  date: string;
  venue: string;
  city: string;
  coordinates: { lat: number; lng: number };
  category: EventCategory;
  imageUrl?: string;
  hostId: string;
  hostName: string;
}

export async function createCommunityEvent(
  input: CreateCommunityEventInput
): Promise<AppEvent> {
  const res = await fetch('/api/events/community', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  const data = await res.json();
  if (!res.ok || !data?.event) {
    throw new Error(data?.error || 'Could not create event.');
  }

  return data.event as AppEvent;
}

export async function toggleEventRsvp(
  eventId: string,
  uid: string,
  currentlyGoing: boolean
): Promise<void> {
  const res = await fetch('/api/events/community', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ eventId, uid, currentlyGoing }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || 'Could not update RSVP.');
  }
}

export interface UpdateCommunityEventInput {
  eventId: string;
  hostId: string;
  title: string;
  description: string;
  date: string;
  venue: string;
  city: string;
  coordinates: { lat: number; lng: number };
  category: EventCategory;
  imageUrl?: string;
}

export async function updateCommunityEvent(
  input: UpdateCommunityEventInput
): Promise<AppEvent> {
  const res = await fetch('/api/events/community', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  const data = await res.json();
  if (!res.ok || !data?.event) {
    throw new Error(data?.error || 'Could not update event.');
  }

  return data.event as AppEvent;
}

export async function deleteCommunityEvent(eventId: string, hostId: string): Promise<void> {
  const res = await fetch('/api/events/community', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ eventId, hostId }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || 'Could not delete event.');
  }
}
