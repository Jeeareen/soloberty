import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/discover',
}));

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import SolobertyLogo from '../components/SolobertyLogo';
import { AuthSwitch } from '../components/Auth/AuthSwitch';
import { DistanceFilter } from '../components/Map/DistanceFilter';
import { EventCard } from '../components/Events/EventCard';
import { DateTimePicker } from '../components/Events/DateTimePicker';
import { UserPreviewCard } from '../components/Map/UserPreviewCard';
import { Step1Credentials } from '../components/Auth/steps/Step1Credentials';
import { Step2BasicInfo } from '../components/Auth/steps/Step2BasicInfo';
import { Step3Interests } from '../components/Auth/steps/Step3Interests';

describe('Core UI Component Render & Interaction Suite', () => {
  it('renders SolobertyLogo SVG', () => {
    const { container } = render(<SolobertyLogo className="w-8 h-8" />);
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('renders AuthSwitch with Login and Sign Up links', () => {
    render(<AuthSwitch activeTab="login" />);
    expect(screen.getByText(/log in/i)).toBeTruthy();
    expect(screen.getByText(/sign up/i)).toBeTruthy();
  });

  it('renders DistanceFilter options and triggers onChange', () => {
    const onChange = vi.fn();
    render(<DistanceFilter selectedDistance="any" onChange={onChange} />);
    const btn25 = screen.getByRole('button', { name: '25 km' });
    fireEvent.click(btn25);
    expect(onChange).toHaveBeenCalledWith(25);
  });

  it('renders EventCard with title, venue, and host badge', () => {
    render(
      <EventCard
        event={{
          id: 'ev-1',
          source: 'community',
          title: 'Vienna Coffee & Code',
          description: 'Casual morning meetup.',
          date: new Date('2026-12-01T10:00:00Z').toISOString(),
          venue: 'MQ Courtyard',
          city: 'Vienna, AT',
          coordinates: { lat: 48.2032, lng: 16.3589 },
          category: 'Tech & Networking',
          hostId: 'u-1',
          hostName: 'Mustafa',
          attendees: ['u-1'],
        }}
        currentUserId="u-1"
      />
    );
    expect(screen.getByText('Vienna Coffee & Code')).toBeTruthy();
    expect(screen.getByText(/MQ Courtyard/i)).toBeTruthy();
    expect(screen.getByText('Host')).toBeTruthy();
  });

  it('renders DateTimePicker and opens calendar popover on click', () => {
    const onChange = vi.fn();
    render(<DateTimePicker value="2026-12-01T18:00" onChange={onChange} />);
    const trigger = screen.getByRole('button');
    fireEvent.click(trigger);
    expect(screen.getByRole('button', { name: /apply/i })).toBeTruthy();
  });

  it('renders UserPreviewCard with member name and city', () => {
    render(
      <UserPreviewCard
        users={[
          {
            uid: 'u-2',
            email: 'alex@example.com',
            name: 'Alex',
            age: 26,
            gender: 'male',
            bio: 'Loves hiking and coffee.',
            interests: ['hiking'],
            location: {
              type: 'approximate',
              city: 'Vienna, AT',
              coordinates: { lat: 48.2082, lng: 16.3738 },
            },
            avatarUrl: '',
            interestImages: [],
            profileCompleted: true,
          },
        ]}
        currentIndex={0}
        onPrev={vi.fn()}
        onNext={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByText(/Alex/i)).toBeTruthy();
    expect(screen.getByText(/Member Preview/i)).toBeTruthy();
  });

  it('renders Step1Credentials form inputs', () => {
    render(
      <Step1Credentials
        formData={{ email: '', password: '', confirmPassword: '' }}
        setFormData={vi.fn()}
        emailExists={false}
        setEmailExists={vi.fn()}
        loading={false}
        onSubmit={vi.fn((e) => e.preventDefault())}
        renderErrorAlert={() => null}
      />
    );
    expect(screen.getByPlaceholderText(/you@example.com/i)).toBeTruthy();
  });

  it('renders Step2BasicInfo form inputs', () => {
    render(
      <Step2BasicInfo
        formData={{ name: 'Mustafa', age: '22', gender: 'male' }}
        setFormData={vi.fn()}
        onNext={vi.fn()}
        renderErrorAlert={() => null}
      />
    );
    expect(screen.getByDisplayValue('Mustafa')).toBeTruthy();
  });

  it('renders Step3Interests interest pills', () => {
    render(
      <Step3Interests
        interests={['hiking']}
        onToggleInterest={vi.fn()}
        onNext={vi.fn()}
        renderErrorAlert={() => null}
      />
    );
    expect(screen.getByText(/Outdoor Hiking/i)).toBeTruthy();
  });
});
