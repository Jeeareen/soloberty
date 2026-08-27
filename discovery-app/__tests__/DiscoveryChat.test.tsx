import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DiscoveryChat } from '../components/DiscoveryChat';

// Mock @ai-sdk/react
const mockAppend = vi.fn();
const mockReload = vi.fn();
const mockStop = vi.fn();
const mockSendMessage = vi.fn();

let mockChatState = {
  messages: [] as any[],
  input: '',
  handleInputChange: vi.fn(),
  handleSubmit: vi.fn(),
  sendMessage: mockSendMessage,
  isLoading: false,
  error: undefined as Error | undefined,
  reload: mockReload,
  stop: mockStop,
  append: mockAppend,
  setMessages: vi.fn(),
};

vi.mock('@ai-sdk/react', () => ({
  useChat: () => mockChatState,
}));

describe('DiscoveryChat Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockChatState = {
      messages: [],
      input: '',
      handleInputChange: vi.fn(),
      handleSubmit: vi.fn(),
      sendMessage: mockSendMessage,
      isLoading: false,
      error: undefined,
      reload: mockReload,
      stop: mockStop,
      append: mockAppend,
      setMessages: vi.fn(),
    };
  });

  it('1. Renders empty state with suggested prompts queryable by role', () => {
    render(<DiscoveryChat />);
    expect(screen.getByRole('heading', { level: 3, name: /welcome to soloberty scout/i })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /chat input message/i })).toBeInTheDocument();
  });

  it('2. Renders pending / loading state when assistant is processing', () => {
    (mockChatState as any).status = 'streaming';
    mockChatState.messages = [
      { id: '1', role: 'user', content: 'Find travel buddies in Vienna' },
    ];
    render(<DiscoveryChat />);

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('3. Renders streaming response message text content', () => {
    (mockChatState as any).status = 'streaming';
    mockChatState.messages = [
      { id: '1', role: 'user', content: 'Find travel buddies' },
      { id: '2', role: 'assistant', content: 'Here are 3 great travel partners in Vienna:' },
    ];
    render(<DiscoveryChat />);

    expect(screen.getByText(/here are 3 great travel partners in vienna/i)).toBeInTheDocument();
  });

  it('4. Renders error state with role="alert" and a retry button', () => {
    mockChatState.error = new Error('Failed to generate response');
    render(<DiscoveryChat />);

    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent(/failed to generate response/i);

    const retryButton = screen.getByRole('button', { name: /retry/i });
    expect(retryButton).toBeInTheDocument();
    fireEvent.click(retryButton);
    expect(mockReload).toHaveBeenCalledTimes(1);
  });
});
