export type EventSource = 'ticketmaster' | 'community';

export type EventCategory =
  | 'Music'
  | 'Arts & Culture'
  | 'Sports & Outdoors'
  | 'Food & Drink'
  | 'Tech & Networking'
  | 'Social';

export const EVENT_CATEGORIES: EventCategory[] = [
  'Music',
  'Arts & Culture',
  'Sports & Outdoors',
  'Food & Drink',
  'Tech & Networking',
  'Social',
];

export interface AppEvent {
  id: string;
  source: EventSource;
  title: string;
  description: string;
  /** ISO 8601 date-time string */
  date: string;
  venue: string;
  city: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  category: EventCategory;
  imageUrl?: string;
  url?: string;
  hostId?: string;
  hostName?: string;
  attendees: string[];
  attendeeNames?: Record<string, string>;
  createdAt?: string;
}

export interface EventRecommendation {
  id: string;
  reason: string;
}

