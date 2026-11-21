'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../lib/hooks/useAuth';
import ShaderHero from '../components/Hero/ShaderHero';

export default function HomeGate() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace('/feed');
    }
  }, [user, loading, router]);

  return <ShaderHero isAuthenticated={Boolean(user)} />;
}
