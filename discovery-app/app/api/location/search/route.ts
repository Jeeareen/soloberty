import { NextRequest, NextResponse } from 'next/server';

const NON_CITY_KEYWORDS = [
  'museum',
  'stadium',
  'stadyum',
  'stadyumu',
  'stade',
  'hotel',
  'park',
  'station',
  'istasyonu',
  'airport',
  'havalimani',
  'university',
  'universitesi',
  'school',
  'okulu',
  'hospital',
  'hastanesi',
  'mall',
  'center',
  'centre',
  'merkezi',
  'resort',
  'square',
  'street',
  'caddesi',
  'sokak',
  'bulvari',
  'boulevard',
  'arena',
  'bank',
  'shop',
  'store',
  'theater',
  'tiyatro',
];

function isBlacklisted(name: string): boolean {
  const lower = name.toLowerCase();
  return NON_CITY_KEYWORDS.some((kw) => lower.includes(kw));
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q')?.trim() || '';

  if (!query || query.length < 2) {
    return NextResponse.json({ suggestions: [] });
  }

  // 1. Try Photon Geocoding API strictly requesting city / town / place tags
  try {
    const photonRes = await fetch(
      `https://photon.komoot.io/api/?q=${encodeURIComponent(
        query
      )}&osm_tag=place:city&osm_tag=place:town&osm_tag=place:village&limit=12`,
      {
        headers: {
          'User-Agent': 'SolobertyApp/1.0 (contact@soloberty.app)',
          'Accept-Language': 'en',
        },
      }
    );

    if (photonRes.ok) {
      const data = await photonRes.json();
      if (data.features && data.features.length > 0) {
        const suggestions: { city: string; country: string; code: string; lat: number; lng: number }[] = [];
        data.features.forEach((f: any) => {
          const props = f.properties || {};
          const cityName = props.name;
          const code = (props.countrycode || '').toUpperCase();
          const country = props.country || '';
          const osmKey = props.osm_key;
          const coords = f.geometry?.coordinates || [0, 0];

          const isPoi = ['tourism', 'amenity', 'leisure', 'building', 'historic', 'shop', 'sport'].includes(
            osmKey
          );

          if (cityName && code && !isPoi && !isBlacklisted(cityName)) {
            if (
              !suggestions.some(
                (s) => s.city.toLowerCase() === cityName.toLowerCase() && s.code === code
              )
            ) {
              suggestions.push({
                city: cityName,
                country,
                code,
                lat: coords[1] || 0,
                lng: coords[0] || 0,
              });
            }
          }
        });

        if (suggestions.length > 0) {
          return NextResponse.json({ suggestions: suggestions.slice(0, 7) });
        }
      }
    }
  } catch (err) {
    console.warn('[Location API] Photon fetch error:', err);
  }

  // 2. Fallback: Query OpenStreetMap Nominatim with place filtering
  try {
    const osmRes = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        query
      )}&addressdetails=1&featuretype=settlement&limit=10`,
      {
        headers: {
          'User-Agent': 'SolobertyApp/1.0 (contact@soloberty.app)',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      }
    );

    if (osmRes.ok) {
      const data = await osmRes.json();
      const suggestions: { city: string; country: string; code: string; lat: number; lng: number }[] = [];

      data.forEach((item: any) => {
        const address = item.address || {};
        const cityName =
          address.city ||
          address.town ||
          address.village ||
          address.municipality ||
          item.name ||
          (item.display_name ? item.display_name.split(',')[0].trim() : '');

        const code = (address.country_code || '').toUpperCase();
        const country = address.country || '';
        const itemClass = item.class;

        const isPoi = ['tourism', 'amenity', 'leisure', 'building', 'historic', 'shop', 'sport'].includes(
          itemClass
        );

        if (cityName && code && cityName.length > 1 && !isPoi && !isBlacklisted(cityName)) {
          if (
            !suggestions.some(
              (s) => s.city.toLowerCase() === cityName.toLowerCase() && s.code === code
            )
          ) {
            suggestions.push({
              city: cityName,
              country,
              code,
              lat: parseFloat(item.lat || 0),
              lng: parseFloat(item.lon || 0),
            });
          }
        }
      });

      return NextResponse.json({ suggestions: suggestions.slice(0, 7) });
    }
  } catch (err) {
    console.error('[Location API] Nominatim fetch error:', err);
  }

  return NextResponse.json({ suggestions: [] });
}
