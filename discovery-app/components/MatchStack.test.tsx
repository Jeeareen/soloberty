// components/MatchStack.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MatchStack } from './MatchStack';
import type { MatchCard } from '../types/matching';
import { vi } from 'vitest';

// Mock matchMedia for Framer Motion's useReducedMotion hook
beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

const mockCards: MatchCard[] = [
  { id: '1', name: 'Alice', summary: 'Dev', details: 'Loves React' },
  { id: '2', name: 'Bob', summary: 'Designer', details: 'Figma pro' },
  { id: '3', name: 'Charlie', summary: 'PM', details: 'Jira master' },
  { id: '4', name: 'Diana', summary: 'QA', details: 'Breaks things' },
  { id: '5', name: 'Eve', summary: 'DevOps', details: 'AWS certified' },
];

describe('MatchStack Component', () => {
  it('1. Renders initial layout with active (Alice) and preview (Bob) card, but no past card', async () => {
    render(<MatchStack cards={mockCards} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Alice/i })).toBeVisible();
    });
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.queryByText('Eve')).not.toBeInTheDocument();
  });

  it('2. Right swipe rejects current card and advances to next card', async () => {
    render(<MatchStack cards={mockCards} />);

    const activeCard = screen.getByRole('button', { name: /Alice/i });
    fireEvent.keyDown(activeCard, { key: 'ArrowRight' });

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /Alice/i })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Bob/i })).toBeInTheDocument();
    });
  });

  it('3. Left swipe acts as Undo after a right swipe, restoring previous card', async () => {
    render(<MatchStack cards={mockCards} />);

    // Right swipe on Alice -> advances to Bob
    fireEvent.keyDown(screen.getByRole('button', { name: /Alice/i }), { key: 'ArrowRight' });
    const bobCard = await screen.findByRole('button', { name: /Bob/i });

    // Left swipe on Bob -> Undo back to Alice
    fireEvent.keyDown(bobCard, { key: 'ArrowLeft' });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Alice/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Bob/i })).not.toBeInTheDocument();
    });
  });

  it('4. Swiping right multiple times allows right swipe undo (restoring 1 card)', async () => {
    render(<MatchStack cards={mockCards} />);

    // Swipe right 4 times: Alice -> Bob -> Charlie -> Diana -> Eve
    for (const cardName of ['Alice', 'Bob', 'Charlie', 'Diana']) {
      const activeCard = await screen.findByRole('button', { name: new RegExp(cardName, 'i') });
      fireEvent.keyDown(activeCard, { key: 'ArrowRight' });
    }

    // Now on Eve (card #5)
    const eveCard = await screen.findByRole('button', { name: /Eve/i });
    expect(eveCard).toBeInTheDocument();

    // 1st Left swipe (Undo): goes back to Diana (card #4)
    fireEvent.keyDown(eveCard, { key: 'ArrowLeft' });
    const dianaCard = await screen.findByRole('button', { name: /Diana/i });
    expect(dianaCard).toBeInTheDocument();

    // 2nd Left swipe attempt: MUST BE BLOCKED! Stays on Diana (card #4)
    fireEvent.keyDown(dianaCard, { key: 'ArrowLeft' });
    expect(screen.getByRole('button', { name: /Diana/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Charlie/i })).not.toBeInTheDocument();
  });

  it('5. Tap / Space / Enter flips card around Y axis to reveal profile details', async () => {
    render(<MatchStack cards={mockCards} />);

    const activeCard = screen.getByRole('button', { name: /Alice/i });
    expect(screen.getByText('Loves React')).toBeInTheDocument();

    // Click flips card to back
    fireEvent.click(activeCard);
    expect(screen.getByText('Tap card to flip back')).toBeInTheDocument();
  });

  it('6. Reaching end of cards displays empty status state', async () => {
    render(<MatchStack cards={[mockCards[0]]} />); // Only 1 card

    fireEvent.keyDown(screen.getByRole('button', { name: /Alice/i }), { key: 'ArrowRight' });

    expect(await screen.findByRole('status')).toHaveTextContent(/No more profiles/i);
  });
});