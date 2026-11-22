import { NextResponse } from 'next/server';
import type { AppEvent, EventCategory } from '../../../types/event';
import { MOCK_TICKETMASTER_EVENTS } from '../../../lib/events/mockEvents';

export const maxDuration = 15;

function mapTicketmasterCategory(segment?: string, genre?: string): EventCategory {
  const s = (segment || '').toLowerCase();
  const g = (genre || '').toLowerCase();
  if (s.includes('music') || g.includes('music') || g.includes('rock') || g.includes('jazz')) {
    return 'Music';
  }
  if (s.includes('sport') || g.includes('sport') || g.includes('outdoor')) {
    return 'Sports & Outdoors';
  }
  if (s.includes('art') || s.includes('theatre') || s.includes('film') || g.includes('art')) {
    return 'Arts & Culture';
  }
  if (g.includes('food') || g.includes('drink') || g.includes('culinary')) {
    return 'Food & Drink';
  }
  if (g.includes('tech') || g.includes('business') || g.includes('conference')) {
    return 'Tech & Networking';
  }
  return 'Social';
}

function filterFallbackEvents(keyword: string, category: string): AppEvent[] {
  return MOCK_TICKETMASTER_EVENTS.filter((ev) => {
    if (category && category !== 'All' && ev.category !== category) {
      return false;
    }
    if (keyword) {
      const q = keyword.toLowerCase();
      const haystack = `${ev.title} ${ev.description} ${ev.venue} ${ev.city} ${ev.category}`.toLowerCase();
      return haystack.includes(q);
    }
    return true;
  });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');
  const radius = searchParams.get('radius') || '50';
  const keyword = (searchParams.get('keyword') || '').trim().slice(0, 100);
  const category = (searchParams.get('category') || '').trim();

  const apiKey = process.env.TICKETMASTER_API_KEY;

  if (!apiKey) {
    return NextResponse.json({
      events: filterFallbackEvents(keyword, category),
      source: 'mock',
    });
  }

  try {
    const params = new URLSearchParams({
      apikey: apiKey,
      size: '20',
      sort: 'date,asc',
    });

    if (lat && lng) {
      const latNum = parseFloat(lat);
      const lngNum = parseFloat(lng);
      if (!isNaN(latNum) && !isNaN(lngNum)) {
        params.set('latlong', `${latNum.toFixed(4)},${lngNum.toFixed(4)}`);
        params.set('radius', radius);
        params.set('unit', 'km');
      }
    }

    if (keyword) {
      params.set('keyword', keyword);
    }

    const res = await fetch(
      `https://app.ticketmaster.com/discovery/v2/events.json?${params.toString()}`,
      { next: { revalidate: 300 } }
    );

    if (!res.ok) {
      console.warn(`[Events API] Ticketmaster responded ${res.status}, using mock fallback`);
      return NextResponse.json({
        events: filterFallbackEvents(keyword, category),
        source: 'mock',
      });
    }

    const data = await res.json();
    const rawEvents = data?._embedded?.events;

    if (!Array.isArray(rawEvents) || rawEvents.length === 0) {
      return NextResponse.json({
        events: filterFallbackEvents(keyword, category),
        source: 'mock',
      });
    }

    const normalized: AppEvent[] = [];
    for (const item of rawEvents) {
      const venue = item?._embedded?.venues?.[0];
      const vLat = parseFloat(venue?.location?.latitude);
      const vLng = parseFloat(venue?.location?.longitude);
      if (isNaN(vLat) || isNaN(vLng)) continue;

      const classification = item?.classifications?.[0];
      const mappedCategory = mapTicketmasterCategory(
        classification?.segment?.name,
        classification?.genre?.name
      );

      if (category && category !== 'All' && mappedCategory !== category) {
        continue;
      }

      const cityParts = [venue?.city?.name, venue?.country?.countryCode].filter(Boolean);
      const bestImage = Array.isArray(item?.images)
        ? item.images.find((img: any) => img.ratio === '16_9' && img.width >= 600)?.url ||
          item.images[0]?.url
        : undefined;

      normalized.push({
        id: `tm-${item.id}`,
        source: 'ticketmaster',
        title: item.name || 'Untitled Event',
        description:
          item.info ||
          item.pleaseNote ||
          `${mappedCategory} event at ${venue?.name || 'local venue'}.`,
        date:
          item?.dates?.start?.dateTime ||
          (item?.dates?.start?.localDate
            ? `${item.dates.start.localDate}T19:00:00Z`
            : new Date().toISOString()),
        venue: venue?.name || 'Local Venue',
        city: cityParts.join(', ') || 'Nearby',
        coordinates: { lat: vLat, lng: vLng },
        category: mappedCategory,
        imageUrl: bestImage,
        url: item.url,
        attendees: [],
      });
    }

    if (normalized.length === 0) {
      return NextResponse.json({
        events: filterFallbackEvents(keyword, category),
        source: 'mock',
      });
    }

    return NextResponse.json({
      events: normalized,
      source: 'ticketmaster',
    });
  } catch (err) {
    console.error('[Events API Error]:', err);
    return NextResponse.json({
      events: filterFallbackEvents(keyword, category),
      source: 'mock',
    });
  }
}

