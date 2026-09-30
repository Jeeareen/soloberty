'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../lib/firebase/config';
import { UserProfile } from '../types/user';

export interface ViewportBounds {
  north: number;
  south: number;
  east: number;
  west: number;
  zoom: number;
}

interface UseUserMarkersResult {
  users: UserProfile[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useUserMarkers(
  bounds: ViewportBounds | null,
  currentUid?: string | null
): UseUserMarkersResult {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Client-side cache: Map of user.uid -> UserProfile
  const userCacheRef = useRef<Map<string, UserProfile>>(new Map());
  // Set of queried bounding box keys to prevent duplicate round trips
  const queriedBoxesRef = useRef<Set<string>>(new Set());

  const fetchUsersInBounds = useCallback(async () => {
    if (!bounds) return;

    const { north, south, east, west } = bounds;

    // Grid key with ~0.5 degree bucket precision to reuse cached queries
    const boxKey = `${Math.floor(south * 2)}_${Math.floor(north * 2)}_${Math.floor(west * 2)}_${Math.floor(east * 2)}`;

    // If box was already queried, populate visible users from in-memory cache directly
    if (queriedBoxesRef.current.has(boxKey)) {
      const cachedList: UserProfile[] = [];
      userCacheRef.current.forEach((u) => {
        const coords = u.location?.coordinates;
        if (!coords || (coords.lat === 0 && coords.lng === 0)) return;
        if (currentUid && u.uid === currentUid) return;

        // Viewport containment check
        const inLat = coords.lat >= south && coords.lat <= north;
        const inLng =
          west <= east
            ? coords.lng >= west && coords.lng <= east
            : coords.lng >= west || coords.lng <= east; // crosses antimeridian

        if (inLat && inLng) {
          cachedList.push(u);
        }
      });

      setUsers(cachedList);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const usersRef = collection(db, 'users');
      // Query completed profiles directly (no composite index required)
      const q = query(
        usersRef,
        where('profileCompleted', '==', true),
        limit(150)
      );

      const snapshot = await getDocs(q);

      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as UserProfile;
        const coords = data.location?.coordinates;

        // Gracefully skip users with missing or (0,0) coordinates
        if (!coords || (coords.lat === 0 && coords.lng === 0)) return;
        if (currentUid && data.uid === currentUid) return;

        userCacheRef.current.set(data.uid, data);
      });

      queriedBoxesRef.current.add(boxKey);

      // Consolidate all users matching current viewport from cache
      const visibleUsers: UserProfile[] = [];
      userCacheRef.current.forEach((u) => {
        const coords = u.location?.coordinates;
        if (!coords || (coords.lat === 0 && coords.lng === 0)) return;
        if (currentUid && u.uid === currentUid) return;

        const inLat = coords.lat >= south && coords.lat <= north;
        const inLng =
          west <= east
            ? coords.lng >= west && coords.lng <= east
            : coords.lng >= west || coords.lng <= east;

        if (inLat && inLng) {
          visibleUsers.push(u);
        }
      });

      setUsers(visibleUsers);
    } catch (err: any) {
      console.error('Error fetching users from Firestore:', err);
      setError(err?.message || "Couldn't load users in this area.");
    } finally {
      setLoading(false);
    }
  }, [bounds, currentUid]);

  useEffect(() => {
    fetchUsersInBounds();
  }, [fetchUsersInBounds]);

  const refetch = () => {
    if (bounds) {
      const { north, south, east, west } = bounds;
      const boxKey = `${Math.floor(south * 2)}_${Math.floor(north * 2)}_${Math.floor(west * 2)}_${Math.floor(east * 2)}`;
      queriedBoxesRef.current.delete(boxKey);
      fetchUsersInBounds();
    }
  };

  return { users, loading, error, refetch };
}
