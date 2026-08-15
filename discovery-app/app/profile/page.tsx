import React from 'react';
import ProfileEditor from '../../components/Profile/ProfileEditor';

export const metadata = {
  title: 'My Profile | Soloberty',
  description: 'View and manage your Soloberty member profile and social preferences.',
};

export default function ProfilePage() {
  return (
    <main className="min-h-screen bg-slate-50/60 pb-16 px-4">
      <ProfileEditor />
    </main>
  );
}
