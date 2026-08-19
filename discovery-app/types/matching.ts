// types/matching.ts

export type CardState = 'past' | 'active' | 'preview' | 'hidden';
export type SwipeDirection = 'left' | 'right';

export interface MatchCard {
  id: string;
  uid: string;
  name: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  bio: string;
  interests: string[];
  location: {
    city: string;
  };
  avatarUrl: string;
  interestImages: { slot: number; url: string }[];
}

export interface SwipeAction {
  direction: SwipeDirection;
  cardId: string;
  previousIndex: number;
}

export interface MatchStackProps {
  cards?: MatchCard[];
  onComplete?: () => void;
}