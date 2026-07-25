// src/components/MatchStack.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MatchStack } from './MatchStack';
import type { MatchCard } from '../types/matching';

// Mock matchMedia for Framer Motion's useReducedMotion hook
beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
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
  it('1. Renders the initial layout with active and preview cards', () => {
    render(<MatchStack cards={mockCards} />);
    
    // Active card
    expect(screen.getByText('Alice')).toBeVisible();
    // Preview card
    expect(screen.getByText('Bob')).toBeInTheDocument();
    // Past card should not exist yet
    expect(screen.queryByText('Eve')).not.toBeInTheDocument();
  });

  it('2 & 9. Keyboard Nav: Right swipe removes card and loads next', async () => {
    render(<MatchStack cards={mockCards} />);
    
    const activeCard = screen.getByRole('button', { name: /Alice/i });
    activeCard.focus();
    expect(activeCard).toHaveFocus();
    
    // Swipe Right
    fireEvent.keyDown(activeCard, { key: 'ArrowRight' });
    
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /Alice/i })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Bob/i })).toBeInTheDocument();
    });
  });

  it('3 & 4. Left swipe decrements limit, disables after 3', async () => {
    render(<MatchStack cards={mockCards} />);
    
    // 1st left swipe
    fireEvent.keyDown(screen.getByRole('button', { name: /Alice/i }), { key: 'ArrowLeft' });
    // 2nd left swipe
    fireEvent.keyDown(screen.getByRole('button', { name: /Bob/i }), { key: 'ArrowLeft' });
    // 3rd left swipe
    fireEvent.keyDown(screen.getByRole('button', { name: /Charlie/i }), { key: 'ArrowLeft' });
    
    // Active should now be Diana
    const dianaCard = await screen.findByRole('button', { name: /Diana/i });
    expect(dianaCard).toBeInTheDocument();
    
    // 4th left swipe (should be blocked)
    fireEvent.keyDown(dianaCard, { key: 'ArrowLeft' });
    
    // Tooltip should appear
    expect(screen.getByRole('alert')).toHaveTextContent(/You've passed on 3/i);
    // Diana should STILL be the active card
    expect(screen.getByRole('button', { name: /Diana/i })).toBeInTheDocument();
  });

  it('5 & 6. Undo reverts action, but only once per session', async () => {
    render(<MatchStack cards={mockCards} />);
    
    // Swipe right on Alice
    fireEvent.keyDown(screen.getByRole('button', { name: /Alice/i }), { key: 'ArrowRight' });
    await screen.findByRole('button', { name: /Bob/i });
    
    // Click Undo
    const undoButton = screen.getByRole('button', { name: 'Undo' });
    expect(undoButton).not.toBeDisabled();
    fireEvent.click(undoButton);
    
    // Alice returns
    expect(await screen.findByRole('button', { name: /Alice/i })).toBeInTheDocument();
    
    // Undo becomes disabled
    expect(undoButton).toBeDisabled();
  });

  it('7 & 8. Tap to expand, Esc/swipe down to collapse', async () => {
    render(<MatchStack cards={mockCards} />);
    
    // Tap Space to expand
    const activeCard = screen.getByRole('button', { name: /Alice/i });
    fireEvent.keyDown(activeCard, { key: ' ' });
    
    // Dialog opens, shows details
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText('Loves React')).toBeInTheDocument();
    
    // Press Escape to close
    fireEvent.keyDown(dialog, { key: 'Escape' });
    
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('11. Shows empty state when out of cards', async () => {
    render(<MatchStack cards={[mockCards[0]]} />); // Only 1 card
    
    // Swipe it away
    fireEvent.keyDown(screen.getByRole('button', { name: /Alice/i }), { key: 'ArrowRight' });
    
    expect(await screen.findByRole('status')).toHaveTextContent(/No more profiles/i);
  });
});