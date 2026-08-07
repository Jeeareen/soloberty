'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useChat } from '@ai-sdk/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Sparkles,
  Send,
  Square,
  ArrowDown,
  Bot,
  User,
  RotateCcw,
  Compass,
  Lightbulb,
} from 'lucide-react';

/**
 * Helper to safely sanitize streaming markdown.
 * If the assistant's message ends with an unclosed code block fence (odd number of ```),
 * this appends a closing ``` during rendering to avoid breaking visual code blocks mid-stream.
 */
function sanitizeStreamMarkdown(text: string): string {
  if (!text) return '';
  const fenceMatches = text.match(/```/g);
  if (fenceMatches && fenceMatches.length % 2 !== 0) {
    return text + '\n```';
  }
  return text;
}

/**
 * Helper to extract readable text content from AI SDK v7 UIMessage parts or content.
 */
function getMessageText(msg: any): string {
  if (typeof msg?.content === 'string' && msg.content) {
    return msg.content;
  }
  if (Array.isArray(msg?.parts)) {
    return msg.parts
      .filter((p: any) => p.type === 'text' && typeof p.text === 'string')
      .map((p: any) => p.text)
      .join('');
  }
  return '';
}

// Initial prompt suggestions for fast user interaction
const SUGGESTED_PROMPTS = [
  'Looking for coffee lovers & indie music fans ☕🎵',
  'Find tech founders who love weekend hiking 🥾⛰️',
  'Vibe check for cozy brunch & photography lovers 📸🥞',
  'Find creative designers who love art galleries 🎨✨',
];

export const DiscoveryChat: React.FC = () => {
  // Local input state for full control across AI SDK versions
  const [input, setInput] = useState('');

  const {
    messages,
    sendMessage,
    status,
    stop,
    setMessages,
  } = useChat();

  const isLoading = status === 'submitted' || status === 'streaming';

  const scrollRef = useRef<HTMLDivElement>(null);
  const touchStartTopRef = useRef(0);
  const userScrolledUpGestureRef = useRef(false);

  const [isAutoScrolling, setIsAutoScrolling] = useState(true);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  // Auto-scroll helper
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (scrollRef.current) {
      userScrolledUpGestureRef.current = false;
      setIsAutoScrolling(true);
      setIsAtBottom(true);
      setUnreadCount(0);
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior,
      });
    }
  }, []);

  // Detect user manual scroll interactions
  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    if (e.deltaY < 0) {
      // User scrolled UP using mouse wheel
      userScrolledUpGestureRef.current = true;
      setIsAutoScrolling(false);
      setIsAtBottom(false);
    }
  }, []);

  const handleTouchStart = useCallback(() => {
    if (scrollRef.current) {
      touchStartTopRef.current = scrollRef.current.scrollTop;
    }
  }, []);

  const handleTouchMove = useCallback(() => {
    if (scrollRef.current) {
      if (scrollRef.current.scrollTop < touchStartTopRef.current - 5) {
        userScrolledUpGestureRef.current = true;
        setIsAutoScrolling(false);
        setIsAtBottom(false);
      }
    }
  }, []);

  // Monitor user scrolling position
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    // Tight threshold check (10px buffer for absolute bottom)
    const distanceFromBottom = el.scrollHeight - Math.ceil(el.scrollTop) - el.clientHeight;
    const atBottom = distanceFromBottom < 10;

    if (atBottom && !userScrolledUpGestureRef.current) {
      setIsAtBottom(true);
      setIsAutoScrolling(true);
      setUnreadCount(0);
    } else if (!atBottom) {
      setIsAtBottom(false);
      userScrolledUpGestureRef.current = false;
    }
  }, []);

  // Auto scroll effect on message changes or streaming tokens
  useEffect(() => {
    if (isAutoScrolling) {
      const el = scrollRef.current;
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
    } else if (isLoading) {
      setUnreadCount((prev) => prev + 1);
    }
  }, [messages, isLoading, isAutoScrolling]);

  // Handle clicking a suggestion chip
  const handleSelectSuggestion = (promptText: string) => {
    setInput(promptText);
  };

  // Submission handler
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmedInput = input.trim();
    if (!trimmedInput || isLoading) return;

    setInput('');
    sendMessage({ text: trimmedInput });
    scrollToBottom('smooth');
  };

  // Stop generation handler
  const handleStop = () => {
    stop();
  };

  // Reset conversation
  const handleClear = () => {
    setMessages([]);
    setInput('');
  };

  const lastMessage = messages[messages.length - 1];
  const lastMessageText = getMessageText(lastMessage);
  const isAssistantThinking =
    isLoading &&
    (messages.length === 0 ||
      lastMessage?.role === 'user' ||
      (lastMessage?.role === 'assistant' && !lastMessageText));

  return (
    <div className="flex flex-col h-[calc(100vh-170px)] sm:h-[650px] min-h-[480px] max-h-[88vh] w-full max-w-3xl mx-auto bg-white border border-gray-200 rounded-xl sm:rounded-2xl shadow-xl overflow-hidden min-w-0 max-w-full font-sans transition-all duration-200">
      {/* Header */}
      <header className="flex items-center justify-between px-3 sm:px-5 py-2.5 sm:py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-sm w-full min-w-0 gap-2">
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
          <div className="p-1.5 sm:p-2 bg-white/15 rounded-xl backdrop-blur-md border border-white/20 shrink-0">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-300 animate-pulse" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm sm:text-base font-bold tracking-tight flex items-center gap-1.5 truncate">
              Solibero Concierge
              <span className="text-[9px] sm:text-[10px] bg-white/20 text-white px-1.5 sm:px-2 py-0.5 rounded-full font-medium tracking-wide uppercase shrink-0">
                AI Discovery
              </span>
            </h2>
            <p className="text-[11px] sm:text-xs text-blue-100/90 font-normal truncate">
              Describe your ideal match, vibe, or hobbies
            </p>
          </div>
        </div>

        {messages.length > 0 && (
          <button
            onClick={handleClear}
            title="Reset Chat"
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs font-semibold bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors border border-white/15 shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        )}
      </header>

      {/* Messages Scroll Area Wrapper */}
      <div className="relative flex-1 min-h-0 overflow-hidden bg-slate-50/50 w-full max-w-full min-w-0">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          onWheel={handleWheel}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          className="h-full overflow-y-auto overflow-x-hidden p-4 sm:p-6 space-y-5 [overflow-anchor:none] [scrollbar-gutter:stable] w-full max-w-full min-w-0"
        >
          {/* Welcome State */}
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center min-h-[320px] text-center p-6 bg-white rounded-2xl border border-dashed border-gray-200 shadow-sm my-auto">
              <div className="w-14 h-14 bg-gradient-to-tr from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-md mb-4">
                <Compass className="w-8 h-8 animate-spin-slow" />
              </div>
              <h3 className="text-lg font-bold text-gray-800">
                Welcome to Solibero AI Concierge!
              </h3>
              <p className="text-sm text-gray-500 max-w-md mt-1 mb-6 leading-relaxed">
                Describe who or what you are looking for in natural language. I'll help you explore matching profiles, shared interests, and discovery ideas!
              </p>

              {/* Suggestion Chips */}
              <div className="w-full max-w-lg space-y-2">
                <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-500" /> Try asking:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                  {SUGGESTED_PROMPTS.map((prompt, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSelectSuggestion(prompt)}
                      className="p-3 text-xs text-gray-700 bg-slate-100/80 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 border border-slate-200/80 rounded-xl transition-all duration-150 font-medium active:scale-[0.98]"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Message Stream List */}
          {messages.map((msg, index) => {
            const isUser = msg.role === 'user';
            const isLastMessage = index === messages.length - 1;
            const isStreamingThisMessage = isLastMessage && isLoading && !isUser;
            const textContent = getMessageText(msg);

            return (
              <div
                key={msg.id || index}
                className={`flex gap-3 max-w-[88%] sm:max-w-[82%] min-w-0 max-w-full ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto flex-row'
                  }`}
              >
                {/* Avatar */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm text-xs font-bold ${isUser
                      ? 'bg-blue-600 text-white'
                      : 'bg-gradient-to-tr from-indigo-500 to-purple-600 text-white'
                    }`}
                >
                  {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                {/* Bubble Content */}
                <div
                  className={`rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm transition-all min-w-0 max-w-full overflow-hidden ${isUser
                      ? 'bg-blue-600 text-white rounded-tr-none'
                      : 'bg-white text-gray-800 border border-gray-200/80 rounded-tl-none'
                    }`}
                >
                  {isUser ? (
                    <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] [word-break:break-word] min-w-0 max-w-full">{textContent}</p>
                  ) : (
                    <div className="prose prose-sm max-w-none text-gray-800 dark:prose-invert break-words [overflow-wrap:anywhere] [word-break:break-word] min-w-0 max-w-full overflow-hidden">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          strong: ({ children }) => (
                            <strong className="font-bold text-gray-900">{children}</strong>
                          ),
                          b: ({ children }) => (
                            <strong className="font-bold text-gray-900">{children}</strong>
                          ),
                          a: ({ href, children, ...props }: any) => (
                            <a
                              href={href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 underline font-medium break-all"
                              {...props}
                            >
                              {children || href}
                            </a>
                          ),
                          code: ({ node, inline, className, children, ...props }: any) => {
                            const isInline = inline ?? (!className || !String(className).includes('language-'));
                            return isInline ? (
                              <code
                                className="bg-slate-100 text-slate-900 px-1.5 py-0.5 rounded text-xs font-mono font-semibold border border-slate-200 inline break-all"
                                {...props}
                              >
                                {children}
                              </code>
                            ) : (
                              <pre className="bg-slate-900 text-slate-100 p-3 rounded-xl overflow-x-auto max-w-full my-2 text-xs font-mono break-all whitespace-pre-wrap min-w-0">
                                <code className={className} {...props}>
                                  {children}
                                </code>
                              </pre>
                            );
                          },
                          blockquote: ({ children }) => (
                            <blockquote className="border-l-4 border-indigo-500 pl-4 py-2 my-2 bg-slate-100/70 text-gray-800 rounded-r-lg font-medium [&_p]:before:content-none [&_p]:after:content-none [&_p]:before:hidden [&_p]:after:hidden">
                              {children}
                            </blockquote>
                          ),
                        }}
                      >
                        {sanitizeStreamMarkdown(textContent)}
                      </ReactMarkdown>
                      {isStreamingThisMessage && (
                        <span className="inline-block w-1.5 h-4 ml-1 bg-indigo-500 animate-pulse align-middle" />
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Smooth Thinking Indicator (Before First Token) */}
          {isAssistantThinking && (
            <div className="flex gap-3 mr-auto max-w-[88%] sm:max-w-[82%] items-center">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <Bot className="w-4 h-4 animate-bounce" />
              </div>
              <div className="bg-white border border-gray-200/80 rounded-2xl rounded-tl-none px-4 py-3 text-sm text-gray-500 shadow-sm flex items-center space-x-2">
                <span className="text-xs font-medium text-indigo-600">
                  Solibero Concierge is thinking
                </span>
                <div className="flex space-x-1 items-center">
                  <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-ping" />
                  <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-ping delay-150" />
                  <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-ping delay-300" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Floating "Jump to Latest" Affordance (Positioned absolutely over wrapper to avoid scrollHeight shifts) */}
        {!isAutoScrolling && !isAtBottom && (
          <button
            onClick={() => scrollToBottom('smooth')}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-full shadow-lg transition-all duration-200 animate-fade-in hover:scale-105 active:scale-95 border border-white/20 pointer-events-auto"
          >
            <ArrowDown className="w-3.5 h-3.5 animate-bounce" />
            Jump to latest
            {unreadCount > 0 && (
              <span className="bg-white text-indigo-600 text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                {unreadCount}
              </span>
            )}
          </button>
        )}
      </div>

      {/* Input Footer */}
      <footer className="p-3 sm:p-4 bg-white border-t border-gray-200">
        <form onSubmit={onSubmit} className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              isLoading
                ? 'AI response is streaming...'
                : 'Ask AI Concierge (e.g. Find workout buddies who love sushi)'
            }
            className="flex-1 px-4 py-2.5 text-sm bg-slate-100/90 text-gray-800 placeholder-gray-400 rounded-xl border border-transparent focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
          />

          {isLoading ? (
            <button
              type="button"
              onClick={handleStop}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-sm font-semibold rounded-xl transition-all shadow-sm"
              title="Stop generating response"
            >
              <Square className="w-4 h-4 fill-white" />
              <span className="hidden sm:inline">Stop</span>
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 text-white text-sm font-semibold rounded-xl transition-all shadow-sm"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Send</span>
            </button>
          )}
        </form>
      </footer>
    </div>
  );
};

export default DiscoveryChat;
