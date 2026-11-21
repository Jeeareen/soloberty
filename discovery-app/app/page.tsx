import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import HomeGate from './HomeGate';

export const metadata: Metadata = {
  title: 'Soloberty — Freedom to Connect',
  description:
    'Discover people who share your passions, explore local events and users nearby, and spark effortless chats with AI match insights and icebreakers.',
};

export default async function Home() {
  const cookieStore = await cookies();
  if (cookieStore.get('soloberty_auth')?.value === '1') {
    redirect('/feed');
  }

  return <HomeGate />;
}
