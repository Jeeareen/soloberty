import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SignupWizard } from '../components/Auth/SignupWizard';

// Mock Firebase config & Auth
const mockSignup = vi.fn().mockResolvedValue({ uid: 'test-uid-123' });
const mockRefreshProfileStatus = vi.fn().mockResolvedValue(true);

vi.mock('../lib/hooks/useAuth', () => ({
  useAuth: () => ({
    signup: mockSignup,
    loading: false,
    refreshProfileStatus: mockRefreshProfileStatus,
  }),
}));

vi.mock('../lib/firebase/config', () => ({
  db: {},
  auth: { currentUser: null },
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  setDoc: vi.fn().mockResolvedValue(true),
  serverTimestamp: vi.fn(() => 'TIMESTAMP'),
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  getDocs: vi.fn().mockResolvedValue({ empty: true, docs: [] }),
}));

vi.mock('firebase/auth', () => ({
  fetchSignInMethodsForEmail: vi.fn().mockResolvedValue([]),
}));

vi.mock('../lib/cloudinary', () => ({
  uploadToCloudinary: vi.fn().mockResolvedValue({
    secure_url: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
    public_id: 'sample_id',
  }),
}));

describe('SignupWizard Form Component Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. Triggers field-level validation errors tied via aria-describedby and role="alert"', async () => {
    render(<SignupWizard />);

    const continueButton = screen.getByRole('button', { name: /continue to basic info/i });
    expect(continueButton).toBeInTheDocument();

    // Attempt to submit Step 1 with empty fields
    fireEvent.click(continueButton);

    // Email error alert
    const emailAlerts = await screen.findAllByRole('alert');
    expect(emailAlerts[0]).toBeInTheDocument();
    expect(emailAlerts[0]).toHaveTextContent(/email address is required/i);

    const emailInput = screen.getByRole('textbox', { name: /email address/i });
    expect(emailInput).toHaveAttribute('aria-invalid', 'true');
    expect(emailInput).toHaveAttribute('aria-describedby', 'email-error');
  });

  it('2. Shows Registration failed toast alert with role="alert" and Retry button on Step 7 error', async () => {
    const { setDoc } = await import('firebase/firestore');
    vi.mocked(setDoc).mockRejectedValueOnce(new Error('Network connection timeout'));

    render(<SignupWizard />);

    // Fast-forward or fill wizard steps directly to reach Step 7 testing recovery
    // Fill Step 1
    fireEvent.change(screen.getByRole('textbox', { name: /email address/i }), {
      target: { value: 'testuser@example.com' },
    });
    const passwordInputs = screen.getAllByPlaceholderText('••••••••');
    fireEvent.change(passwordInputs[0], {
      target: { value: 'Password123!' },
    });
    fireEvent.change(passwordInputs[1], {
      target: { value: 'Password123!' },
    });
    fireEvent.click(screen.getByRole('button', { name: /continue to basic info/i }));

    // Step 2
    const nameInput = await screen.findByRole('textbox', { name: /full name/i });
    fireEvent.change(nameInput, { target: { value: 'Alex Morgan' } });
    fireEvent.change(screen.getByRole('spinbutton', { name: /age/i }), { target: { value: '25' } });
    fireEvent.click(screen.getByRole('button', { name: /continue to interests/i }));

    // Step 3
    fireEvent.click(await screen.findByText('Sports & Fitness'));
    fireEvent.click(screen.getByText('Music & Concerts'));
    fireEvent.click(screen.getByText('Reading & Books'));
    fireEvent.click(screen.getByRole('button', { name: /continue to bio/i }));

    // Step 4
    const bioTextarea = await screen.findByRole('textbox', { name: /your bio/i });
    fireEvent.change(bioTextarea, {
      target: { value: 'I love outdoor adventures, coffee shops, and exploring new cities.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /continue to location/i }));

    // Step 5: Switch to Exact Location tab and detect GPS location
    fireEvent.click(await screen.findByText('Exact Location'));
    fireEvent.click(await screen.findByRole('button', { name: /detect current location via gps/i }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /location detected/i })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /continue to photos/i }));

    // Step 6: Click Skip
    const skipButton = await screen.findByText(/skip \/ continue to interest images/i);
    fireEvent.click(skipButton);

    // Step 7
    const completeButton = await screen.findByRole('button', { name: /complete registration/i });
    fireEvent.click(completeButton);

    // Should display Registration failed toast alert with role="alert"
    const failureToast = await screen.findByRole('alert');
    expect(failureToast).toBeInTheDocument();
    expect(failureToast).toHaveTextContent(/registration failed/i);

    // Verify Retry button is queryable and present
    const retryButton = screen.getByRole('button', { name: /retry/i });
    expect(retryButton).toBeInTheDocument();

    // Re-mock setDoc to succeed on retry
    vi.mocked(setDoc).mockResolvedValueOnce(true as any);
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(setDoc).toHaveBeenCalledTimes(2);
    });
  });
});
