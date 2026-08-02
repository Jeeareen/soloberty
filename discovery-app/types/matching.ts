// types/matching.ts

export type CardState = 'past' | 'active' | 'preview' | 'hidden';
export type SwipeDirection = 'left' | 'right';

export interface MatchCard {
  id: string;
  name: string;
  summary: string;
  details?: string;
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