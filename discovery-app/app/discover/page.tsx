import React from 'react';
import DiscoveryChat from '../../components/DiscoveryChat';

export const metadata = {
  title: 'Discover AI Concierge | Solibero',
  description: 'Use Solibero AI Assistant to express what kind of matches, hobbies, and social connections you are looking for.',
};

export default function DiscoverPage() {
  return (
    <main className="min-h-screen bg-slate-100/60 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
            Discover Your Vibe
          </h1>
          <p className="text-base text-gray-600 max-w-xl mx-auto">
            Describe what you’re looking for in natural language — our AI Concierge will guide your discovery experience on Solibero.
          </p>
        </div>

        {/* AI Streaming Chat Interface */}
        <DiscoveryChat />
      </div>
    </main>
  );
}
