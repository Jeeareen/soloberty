import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ScoutBioButton } from '../components/Auth/ScoutBioButton';

describe('ScoutBioButton Component (Tool Result Component)', () => {
  it('1. Renders idle state with Generate button text and Sparkles icon', () => {
    render(<ScoutBioButton onClick={vi.fn()} />);
    const button = screen.getByRole('button', { name: /auto-generate/i });
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();
  });

  it('2. Renders loading state when generator is active', () => {
    render(<ScoutBioButton onClick={vi.fn()} overrideState="loading" />);
    const textElement = screen.getByText(/scout is drafting/i);
    expect(textElement).toBeInTheDocument();
  });

  it('3. Triggers onClick handler when clicked', () => {
    const handleClick = vi.fn();
    render(<ScoutBioButton onClick={handleClick} />);
    const button = screen.getByRole('button', { name: /auto-generate/i });
    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
