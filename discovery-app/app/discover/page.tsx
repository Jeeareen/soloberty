import React from 'react';
import DiscoveryChat from '../../components/DiscoveryChat';

export const metadata = {
  title: 'Discover Soloberty Scout | Soloberty',
  description: 'Use Soloberty Scout to express what kind of matches, hobbies, and social connections you are looking for.',
};

export default function DiscoverPage() {
  return (
    <main className="h-[calc(100vh-56px-60px)] md:h-[calc(100vh-64px)] bg-[#F8FAFC] dark:bg-[#090D16] w-full max-w-full overflow-hidden transition-colors duration-200 flex flex-col justify-center items-center">
      <div className="w-full h-full flex flex-col justify-center">
        <DiscoveryChat />
      </div>
    </main>
  );
}
