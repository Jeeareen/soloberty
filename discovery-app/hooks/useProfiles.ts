import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../lib/firebase/config';
import type { UserProfile } from '../types/user';

export function useProfiles() {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchProfiles() {
      setLoading(true);
      setError(null);

      try {
        const currentUid = auth.currentUser?.uid;
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('profileCompleted', '==', true));
        const querySnapshot = await getDocs(q);

        const fetchedProfiles: UserProfile[] = [];
        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data() as UserProfile;
          // Exclude currently logged-in user
          if (!currentUid || data.uid !== currentUid) {
            fetchedProfiles.push(data);
          }
        });

        if (isMounted) {
          setProfiles(fetchedProfiles);
        }
      } catch (err) {
        console.error('Error fetching profiles from Firestore:', err);
        if (isMounted) {
          setError('Couldn\'t load profiles. Pull to refresh.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchProfiles();

    return () => {
      isMounted = false;
    };
  }, []);

  return { profiles, loading, error };
}
