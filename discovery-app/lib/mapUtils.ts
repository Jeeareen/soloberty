// Utilities for Map geometry, distance calculations, and clustering

export interface LatLng {
  lat: number;
  lng: number;
}

/**
 * Calculates Haversine distance in kilometers between two points
 */
export function calculateDistanceKm(point1: LatLng, point2: LatLng): number {
  const R = 6371; // Earth radius in km
  const dLat = ((point2.lat - point1.lat) * Math.PI) / 180;
  const dLon = ((point2.lng - point1.lng) * Math.PI) / 180;
  const lat1 = (point1.lat * Math.PI) / 180;
  const lat2 = (point2.lat * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Approximate country center coordinates for common codes and fallback countries
 */
export const COUNTRY_CENTERS: Record<string, LatLng & { name: string }> = {
  AT: { name: 'Austria', lat: 47.5162, lng: 14.5501 },
  DE: { name: 'Germany', lat: 51.1657, lng: 10.4515 },
  CH: { name: 'Switzerland', lat: 46.8182, lng: 8.2275 },
  FR: { name: 'France', lat: 46.2276, lng: 2.2137 },
  IT: { name: 'Italy', lat: 41.8719, lng: 12.5674 },
  ES: { name: 'Spain', lat: 40.4637, lng: -3.7492 },
  GB: { name: 'United Kingdom', lat: 55.3781, lng: -3.436 },
  UK: { name: 'United Kingdom', lat: 55.3781, lng: -3.436 },
  US: { name: 'United States', lat: 37.0902, lng: -95.7129 },
  CA: { name: 'Canada', lat: 56.1304, lng: -106.3468 },
  AU: { name: 'Australia', lat: -25.2744, lng: 133.7751 },
  NL: { name: 'Netherlands', lat: 52.1326, lng: 5.2913 },
  BE: { name: 'Belgium', lat: 50.5039, lng: 4.4699 },
  SE: { name: 'Sweden', lat: 60.1282, lng: 18.6435 },
  NO: { name: 'Norway', lat: 60.472, lng: 8.4689 },
  DK: { name: 'Denmark', lat: 56.2639, lng: 9.5018 },
  PL: { name: 'Poland', lat: 51.9194, lng: 19.1451 },
  CZ: { name: 'Czech Republic', lat: 49.8175, lng: 15.473 },
  SK: { name: 'Slovakia', lat: 48.669, lng: 19.699 },
  HU: { name: 'Hungary', lat: 47.1625, lng: 19.5033 },
  TR: { name: 'Turkey', lat: 38.9637, lng: 35.2433 },
};

/**
 * Approximate continent center coordinates and country-to-continent mapping
 */
export const CONTINENT_CENTERS: Record<string, LatLng & { name: string }> = {
  EU: { name: 'Europe', lat: 50.0, lng: 10.0 },
  NA: { name: 'North America', lat: 40.0, lng: -100.0 },
  SA: { name: 'South America', lat: -15.0, lng: -60.0 },
  AS: { name: 'Asia', lat: 35.0, lng: 100.0 },
  AF: { name: 'Africa', lat: 2.0, lng: 20.0 },
  OC: { name: 'Oceania', lat: -25.0, lng: 135.0 },
};

export const COUNTRY_TO_CONTINENT: Record<string, string> = {
  AT: 'EU',
  DE: 'EU',
  CH: 'EU',
  FR: 'EU',
  IT: 'EU',
  ES: 'EU',
  GB: 'EU',
  UK: 'EU',
  NL: 'EU',
  BE: 'EU',
  SE: 'EU',
  NO: 'EU',
  DK: 'EU',
  PL: 'EU',
  CZ: 'EU',
  SK: 'EU',
  HU: 'EU',
  IE: 'EU',
  PT: 'EU',
  GR: 'EU',
  FI: 'EU',
  RO: 'EU',
  BG: 'EU',
  HR: 'EU',
  RS: 'EU',
  TR: 'EU',
  TUR: 'EU',
  US: 'NA',
  CA: 'NA',
  MX: 'NA',
  BR: 'SA',
  AR: 'SA',
  CL: 'SA',
  CO: 'SA',
  AU: 'OC',
  NZ: 'OC',
  CN: 'AS',
  JP: 'AS',
  KR: 'AS',
  IN: 'AS',
  ID: 'AS',
  TH: 'AS',
  VN: 'AS',
  SG: 'AS',
  MY: 'AS',
  PH: 'AS',
  ZA: 'AF',
  EG: 'AF',
  NG: 'AF',
  KE: 'AF',
  MA: 'AF',
};

export function getContinentFromCountry(countryCode: string): string {
  return COUNTRY_TO_CONTINENT[countryCode.toUpperCase()] || 'EU';
}

/**
 * Parses country code from location.city string (e.g. "Vienna, AT" -> "AT", "Istanbul, Turkey" -> "TR")
 */
export function extractCountryCode(cityStr?: string): string {
  if (!cityStr) return 'AT';
  const parts = cityStr.split(',');
  const last = (parts.length > 1 ? parts[parts.length - 1] : cityStr).trim().toUpperCase();

  if (last === 'TURKEY' || last === 'TÜRKIYE' || last === 'TURKIYE' || last === 'TR' || last === 'TUR') {
    return 'TR';
  }
  return last;
}


