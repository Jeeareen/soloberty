import React from 'react';
import ProfileEditor from '../../components/Profile/ProfileEditor';

export const metadata = {
  title: 'My Profile | Soloberty',
  description: 'View and manage your Soloberty member profile and social preferences.',
};

export default function ProfilePage() {
  return (
    <main className="min-h-screen bg-[#F8FAFC] dark:bg-[#090D16] pt-3 sm:pt-5 pb-8 sm:pb-12 px-4 sm:px-8 transition-colors duration-200 overflow-x-clip w-full max-w-full">
      <ProfileEditor />
    </main>
  );
}
