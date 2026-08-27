import '@testing-library/jest-dom';
import { beforeEach, vi } from 'vitest';

beforeEach(() => {
  if (typeof window !== 'undefined') {
    sessionStorage.clear();
  }
});

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock window.scrollTo
Object.defineProperty(window, 'scrollTo', {
  value: vi.fn(),
  writable: true,
});

// Mock global fetch for nominatim reverse geocoding
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: async () => ({
    address: { city: 'Vienna', country: 'Austria', country_code: 'at' },
  }),
} as any);

// Mock navigator.geolocation
Object.defineProperty(navigator, 'geolocation', {
  value: {
    getCurrentPosition: vi.fn((success) =>
      success({
        coords: { latitude: 48.2082, longitude: 16.3738 },
      })
    ),
  },
  writable: true,
});
