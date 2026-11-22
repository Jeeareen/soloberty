import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ShaderHero from '../components/Hero/ShaderHero';

describe('ShaderHero Fullscreen Fragment Shader Hero', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the hero headline, subheadline, and primary navigation CTAs', () => {
    render(<ShaderHero />);

    expect(
      screen.getByRole('heading', {
        name: /Freedom to Connect/i,
      })
    ).toBeInTheDocument();

    expect(
      screen.getByRole('link', { name: /Meet New People/i })
    ).toHaveAttribute('href', '/feed');

    expect(
      screen.getByRole('link', { name: /See Who's Nearby/i })
    ).toHaveAttribute('href', '/map');
  });

  it('falls back to a static gradient when forceReducedMotion is true', () => {
    render(<ShaderHero forceReducedMotion={true} />);

    expect(
      screen.getByTestId('shader-reduced-motion-fallback')
    ).toBeInTheDocument();
    expect(screen.queryByTestId('shader-hero-canvas')).not.toBeInTheDocument();
  });

  it('allows toggling reduced-motion fallback and opening the GLSL source modal & lerp controls', () => {
    localStorage.setItem('soloberty_dev_mode', 'true');
    render(<ShaderHero />);

    // Open Shader Lab drawer
    const controlsBtn = screen.getByRole('button', { name: /Shader Lab/i });
    fireEvent.click(controlsBtn);

    const slider = screen.getByLabelText(/Cursor Lerp/i);
    expect(slider).toBeInTheDocument();
    fireEvent.change(slider, { target: { value: '0.12' } });
    expect(screen.getByText(/0.120/)).toBeInTheDocument();

    // Open annotated GLSL Source modal
    const sourceBtn = screen.getByRole('button', { name: /View GLSL Source/i });
    fireEvent.click(sourceBtn);

    expect(
      screen.getByRole('dialog', {
        name: /Annotated GLSL Fragment Shader Source/i,
      })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Block 3: Lerped Hover Warp & Click-to-Ripple Waves/i)
    ).toBeInTheDocument();
  });
});
