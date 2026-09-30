'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '../../lib/hooks/useAuth';
import { db } from '../../lib/firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import { UserProfile } from '../../types/user';
import { useUserMarkers, ViewportBounds } from '../../hooks/useUserMarkers';
import { DistanceFilter, DistanceOption } from '../../components/Map/DistanceFilter';
import { UserPreviewCard } from '../../components/Map/UserPreviewCard';
import { Loader2, AlertCircle, RefreshCw, MapPin } from 'lucide-react';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { calculateDistanceKm, COUNTRY_CENTERS, extractCountryCode } from '../../lib/mapUtils';

// Leaflet requires window/DOM, so dynamically import MapCanvas with ssr: false
const MapCanvas = dynamic(
  () => import('../../components/Map/MapCanvas').then((mod) => mod.MapCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full flex-col items-center justify-center bg-slate-50 dark:bg-[#090D16] text-slate-500 space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#00AAFF]" />
        <p className="text-sm font-semibold">Loading Map Canvas...</p>
      </div>
    ),
  }
);

// Fallback coordinate: Vienna, AT
const DEFAULT_CENTER = { lat: 48.2082, lng: 16.3738 };
const DEFAULT_ZOOM = 12;

function MapPageContent() {
  const { user, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();

  // Check if URL specifies target coordinates/zoom (e.g. from MatchCard location tap)
  const queryLat = searchParams.get('lat');
  const queryLng = searchParams.get('lng');
  const queryZoom = searchParams.get('zoom');
  const queryCity = searchParams.get('city');
  const queryUid = searchParams.get('uid');
  const queryName = searchParams.get('name');

  const targetCoords = useMemo(() => {
    if (queryLat && queryLng) {
      const lat = parseFloat(queryLat);
      const lng = parseFloat(queryLng);
      if (!isNaN(lat) && !isNaN(lng)) {
        return { lat, lng };
      }
    }
    if (queryCity) {
      const countryCode = extractCountryCode(decodeURIComponent(queryCity));
      if (COUNTRY_CENTERS[countryCode]) {
        return { lat: COUNTRY_CENTERS[countryCode].lat, lng: COUNTRY_CENTERS[countryCode].lng };
      }
    }
    return null;
  }, [queryLat, queryLng, queryCity]);

  const targetZoom = useMemo(() => {
    if (queryZoom) {
      const z = parseInt(queryZoom, 10);
      if (!isNaN(z) && z >= 2 && z <= 18) return z;
    }
    return 12;
  }, [queryZoom]);

  // Current logged in user coordinates state
  const [currentUserLocation, setCurrentUserLocation] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [initialCenter, setInitialCenter] = useState<{ lat: number; lng: number }>(DEFAULT_CENTER);
  const [initialZoomLevel, setInitialZoomLevel] = useState<number>(12);
  const [locatingUser, setLocatingUser] = useState<boolean>(true);

  // Filter & Viewport states
  const [distanceFilter, setDistanceFilter] = useState<DistanceOption>('any');
  const [viewportBounds, setViewportBounds] = useState<ViewportBounds | null>(null);

  // Preview Card state
  const [selectedUsers, setSelectedUsers] = useState<UserProfile[]>([]);
  const [selectedTitle, setSelectedTitle] = useState<string>('');
  const [previewIndex, setPreviewIndex] = useState<number>(0);

  // Wait for auth to resolve before determining initial user location
  useEffect(() => {
    let isMounted = true;

    async function loadCurrentLocation() {
      // While auth state is still resolving on page refresh/initial load, wait
      if (authLoading) return;

      if (user?.uid) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data() as UserProfile;
            const coords = data.location?.coordinates;
            if (coords && (coords.lat !== 0 || coords.lng !== 0)) {
              if (isMounted) {
                setCurrentUserLocation(coords);
                setInitialCenter(coords);
                setLocatingUser(false);
                return;
              }
            }
          }
        } catch (e) {
          console.warn('Error reading current user location from Firestore:', e);
        }
      }

      // Check browser geolocation as fallback
      if (typeof window !== 'undefined' && 'geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            if (isMounted) {
              const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
              setCurrentUserLocation(coords);
              setInitialCenter(coords);
              setLocatingUser(false);
            }
          },
          () => {
            if (isMounted) {
              setInitialCenter(DEFAULT_CENTER);
              setLocatingUser(false);
            }
          },
          { timeout: 4000 }
        );
      } else {
        if (isMounted) {
          setInitialCenter(DEFAULT_CENTER);
          setLocatingUser(false);
        }
      }
    }

    loadCurrentLocation();

    return () => {
      isMounted = false;
    };
  }, [user?.uid, authLoading]);

  // Hook to fetch and cache user profiles falling in the visible bounds
  const { users, loading, error, refetch } = useUserMarkers(viewportBounds, user?.uid);

  // Filter by distance for visible user count
  const visibleCount = useMemo(() => {
    if (distanceFilter === 'any' || !currentUserLocation) {
      return users.length;
    }
    return users.filter((u) => {
      const coords = u.location?.coordinates;
      if (!coords) return false;
      return calculateDistanceKm(currentUserLocation, coords) <= distanceFilter;
    }).length;
  }, [users, currentUserLocation, distanceFilter]);

  const handleSelectClusterOrUser = useCallback((selected: UserProfile[], title: string) => {
    setSelectedUsers(selected);
    setSelectedTitle(title);
    setPreviewIndex(0);
  }, []);

  const handleClosePreview = useCallback(() => {
    setSelectedUsers([]);
    setSelectedTitle('');
    setPreviewIndex(0);
  }, []);

  const handlePrev = useCallback(() => {
    setPreviewIndex((prev) => Math.max(0, prev - 3));
  }, []);

  const handleNext = useCallback(() => {
    setPreviewIndex((prev) => prev + 3);
  }, []);

  // When arriving from a matchcard (queryUid present), automatically select target user and display their preview card
  const hasAutoSelectedRef = useRef(false);
  useEffect(() => {
    if (!queryUid || hasAutoSelectedRef.current) return;

    async function loadTargetUserPreview() {
      // 1. Try finding in loaded users
      const foundInList = users.find((u) => u.uid === queryUid);
      if (foundInList) {
        hasAutoSelectedRef.current = true;
        // Delay slightly so preview card pops up smoothly as the flight reaches target
        setTimeout(() => {
          setSelectedUsers([foundInList]);
          setSelectedTitle(foundInList.name || 'Member Details');
        }, 1200);
        return;
      }

      // 2. Fetch directly from Firestore if not yet in current viewport query
      try {
        const docSnap = await getDoc(doc(db, 'users', queryUid));
        if (docSnap.exists()) {
          const profileData = docSnap.data() as UserProfile;
          hasAutoSelectedRef.current = true;
          setTimeout(() => {
            setSelectedUsers([profileData]);
            setSelectedTitle(profileData.name || 'Member Details');
          }, 1200);
        }
      } catch (err) {
        console.warn('Could not auto-fetch target user profile:', err);
      }
    }

    loadTargetUserPreview();
  }, [queryUid, users]);

  return (
    <div className="relative w-full h-[calc(100vh-56px-60px)] md:h-[calc(100vh-56px)] overflow-hidden bg-[#F8FAFC] dark:bg-[#090D16]">
      {/* Top Distance Filter Bar */}
      <DistanceFilter
        selectedDistance={distanceFilter}
        onChange={setDistanceFilter}
      />

      {/* Map Canvas */}
      {!locatingUser && (
        <MapCanvas
          initialCenter={initialCenter}
          initialZoom={initialZoomLevel}
          targetLocation={targetCoords ? { lat: targetCoords.lat, lng: targetCoords.lng, zoom: targetZoom } : null}
          users={users}
          currentUserLocation={currentUserLocation}
          distanceFilter={distanceFilter}
          onBoundsChange={setViewportBounds}
          onSelectClusterOrUser={handleSelectClusterOrUser}
        />
      )}

      {/* Loading Indicator Pill (Bottom Left) */}
      {loading && (
        <div className="absolute bottom-24 md:bottom-6 left-4 z-[999] flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-lg text-xs font-bold text-slate-700 dark:text-slate-200">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-[#00AAFF]" />
          <span>Searching area...</span>
        </div>
      )}

      {/* Error Card Overlay with Retry */}
      {error && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[1000] w-[calc(100%-2rem)] max-w-sm">
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-200 shadow-xl text-xs font-bold gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={refetch}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-rose-600 hover:bg-rose-700 text-white shrink-0 cursor-pointer shadow-sm transition-all active:scale-95"
            >
              <RefreshCw className="w-3 h-3" />
              Retry
            </button>
          </div>
        </div>
      )}

      {/* User / Cluster Preview Bottom Sheet */}
      <UserPreviewCard
        users={selectedUsers}
        clusterTitle={selectedTitle}
        currentIndex={previewIndex}
        onPrev={handlePrev}
        onNext={handleNext}
        onClose={handleClosePreview}
      />
    </div>
  );
}

export default function MapPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full w-full flex-col items-center justify-center bg-slate-50 dark:bg-[#090D16] text-slate-500 space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#00AAFF]" />
          <p className="text-sm font-semibold">Loading Map...</p>
        </div>
      }
    >
      <MapPageContent />
    </Suspense>
  );
}
