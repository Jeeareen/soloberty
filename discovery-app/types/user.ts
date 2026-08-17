import { Timestamp, FieldValue } from 'firebase/firestore';

export interface Interest {
  id: string;
  name: string;
  icon: string; // Emoji or Lucide icon name
  category: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  profileCompleted?: boolean;
  name: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  bio: string;
  interests: string[]; // Array of 3 interest IDs
  location: {
    type: 'exact' | 'approximate';
    city: string;
    coordinates: {
      lat: number;
      lng: number;
    };
  };
  avatarUrl?: string;
  avatarPublicId?: string;
  profilePhoto?: {
    url: string;
    publicId?: string;
    uploadedAt?: string | Timestamp | FieldValue;
  };
  interestImages?: Array<{
    slot?: number;
    url: string;
    publicId?: string;
    uploadedAt?: string | Timestamp | FieldValue;
  }>;
  createdAt?: string | Timestamp | FieldValue;
  updatedAt?: string | Timestamp | FieldValue;
}

export const PREDEFINED_INTERESTS: Interest[] = [
  { id: 'sports', name: 'Sports & Fitness', icon: '⚽', category: 'Physical' },
  { id: 'music', name: 'Music & Concerts', icon: '🎵', category: 'Arts' },
  { id: 'reading', name: 'Reading & Books', icon: '📚', category: 'Intellectual' },
  { id: 'gaming', name: 'Gaming & Esports', icon: '🎮', category: 'Entertainment' },
  { id: 'travel', name: 'Travel & Exploring', icon: '✈️', category: 'Lifestyle' },
  { id: 'cooking', name: 'Cooking & Foodie', icon: '🍳', category: 'Lifestyle' },
  { id: 'art', name: 'Art & Design', icon: '🎨', category: 'Arts' },
  { id: 'photography', name: 'Photography', icon: '📸', category: 'Arts' },
  { id: 'tech', name: 'Tech & Coding', icon: '💻', category: 'Intellectual' },
  { id: 'outdoor', name: 'Outdoor Hiking', icon: '🥾', category: 'Physical' },
  { id: 'coffee', name: 'Coffee & Podcasts', icon: '☕', category: 'Lifestyle' },
  { id: 'cinema', name: 'Movies & Cinema', icon: '🎬', category: 'Entertainment' },
];
