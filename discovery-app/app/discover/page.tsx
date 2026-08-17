import React from 'react';
import DiscoveryChat from '../../components/DiscoveryChat';

export const metadata = {
  title: 'Discover Soloberty Scout | Soloberty',
  description: 'Use Soloberty Scout to express what kind of matches, hobbies, and social connections you are looking for.',
};

export default function DiscoverPage() {
  return (
    <main className="min-h-[calc(100vh-60px)] bg-slate-100/60 dark:bg-black py-3 sm:py-6 px-2 sm:px-6 lg:px-8 w-full max-w-full overflow-x-hidden transition-colors duration-200">
      <div className="max-w-4xl mx-auto space-y-3 sm:space-y-6 w-full min-w-0">
        {/* Page Header */}
        <div className="text-center space-y-1 sm:space-y-2 px-2">
          <h1 className="text-2xl sm:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            Discover Your Vibe
          </h1>
          <p className="text-xs sm:text-base text-gray-600 dark:text-slate-300 max-w-xl mx-auto">
            Describe what you’re looking for in natural language — Soloberty Scout will guide your discovery experience on Soloberty.
          </p>
        </div>

        {/* AI Streaming Chat Interface */}
        <DiscoveryChat />
      </div>
    </main>
  );
}
