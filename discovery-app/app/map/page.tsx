'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '../../lib/hooks/useAuth';
import type { UserProfile } from '../../types/user';
import type { AppEvent } from '../../types/event';
import { fetchCommunityEvents } from '../../lib/events/firestoreEvents';
import { useUserMarkers, type ViewportBounds } from '../../hooks/useUserMarkers';
import { DistanceFilter, type DistanceOption } from '../../components/Map/DistanceFilter';
import {
  Loader2,
  AlertCircle,
  RefreshCw,
  MapPin,
  SlidersHorizontal,
  Navigation,
  X,
  Users,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { COUNTRY_CENTERS, extractCountryCode } from '../../lib/mapUtils';

const UserPreviewCard = dynamic(
  () => import('../../components/Map/UserPreviewCard').then((mod) => mod.UserPreviewCard),
  { ssr: false }
);

const UserDetailModal = dynamic(
  () => import('../../components/Map/UserDetailModal').then((mod) => mod.UserDetailModal),
  { ssr: false }
);

const MapLoadingPill = () => (
  <div className="relative flex h-full w-full pointer-events-none">
    <div className="absolute bottom-4 md:bottom-6 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-lg text-xs font-bold text-slate-700 dark:text-slate-200">
      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#007ABB]" />
      <span>Loading Map...</span>
    </div>
  </div>
);

// Leaflet requires window/DOM, so dynamically import MapCanvas with ssr: false
const MapCanvas = dynamic(
  () => import('../../components/Map/MapCanvas').then((mod) => mod.MapCanvas),
  {
    ssr: false,
    loading: () => <MapLoadingPill />,
  }
);

// Fallback coordinate: Vienna, AT
const DEFAULT_CENTER = { lat: 48.2082, lng: 16.3738 };

function MapPageContent() {
  const { user, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();

  // Check if URL specifies target coordinates/zoom (e.g. from MatchCard or EventCard location tap)
  const queryLat = searchParams.get('lat');
  const queryLng = searchParams.get('lng');
  const queryZoom = searchParams.get('zoom');
  const queryCity = searchParams.get('city');
  const queryUid = searchParams.get('uid');
  const queryMode = searchParams.get('mode');
  const queryEventId = searchParams.get('eventId');
  const queryFromLat = searchParams.get('fromLat');
  const queryFromLng = searchParams.get('fromLng');

  const queryFromCoords = useMemo(() => {
    if (queryFromLat && queryFromLng) {
      const lat = parseFloat(queryFromLat);
      const lng = parseFloat(queryFromLng);
      if (!isNaN(lat) && !isNaN(lng)) {
        return { lat, lng };
      }
    }
    return null;
  }, [queryFromLat, queryFromLng]);

  // People | Events toggle state
  const [mapMode, setMapMode] = useState<'people' | 'events'>(
    queryMode === 'events' ? 'events' : 'people'
  );
  const [mapEvents, setMapEvents] = useState<AppEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [selectedEvents, setSelectedEvents] = useState<AppEvent[]>([]);
  const [selectedEventTitle, setSelectedEventTitle] = useState<string>('');
  const [activeEventDetail, setActiveEventDetail] = useState<AppEvent | null>(null);
  const [eventListPage, setEventListPage] = useState<number>(0);

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
  const [initialLocationReady, setInitialLocationReady] = useState<boolean>(Boolean(queryFromCoords));
  const [manualLocationTarget, setManualLocationTarget] = useState<{
    lat: number;
    lng: number;
    zoom: number;
  } | null>(null);
  const initialZoomLevel = 12;

  // Filter & Viewport states
  const [distanceFilter, setDistanceFilter] = useState<DistanceOption>('any');
  const [viewportBounds, setViewportBounds] = useState<ViewportBounds | null>(null);

  // Preview Card state
  const [selectedUsers, setSelectedUsers] = useState<UserProfile[]>([]);
  const [selectedTitle, setSelectedTitle] = useState<string>('');
  const [previewIndex, setPreviewIndex] = useState<number>(0);

  // Detailed MatchCard Modal state
  const [detailedUser, setDetailedUser] = useState<UserProfile | null>(null);

  // Location permission / map intro modal state for unlogged users
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const [locationGranted, setLocationGranted] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [requestingLocation, setRequestingLocation] = useState(false);

  const dismissMapIntro = useCallback(() => {
    setShowLocationPrompt(false);
    setLocationError(null);
    try {
      localStorage.setItem('soloberty_map_intro_seen', '1');
    } catch {
      // ignore storage errors
    }
  }, []);

  const requestBrowserLocation = useCallback(() => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      setLocationError('Geolocation is not supported by your browser.');
      return;
    }
    setLocationError(null);
    setRequestingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const detected = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setCurrentUserLocation(detected);
        setManualLocationTarget({ ...detected, zoom: initialZoomLevel });
        setLocationGranted(true);
        setRequestingLocation(false);
        dismissMapIntro();
      },
      (err) => {
        setRequestingLocation(false);
        if (err.code === 1) {
          setLocationError(
            'Location is blocked in your browser. Click the lock/tune icon next to the URL to allow location access.'
          );
        } else {
          setLocationError('Could not detect your location. Please try again.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [dismissMapIntro]);

  // Wait for auth to resolve before determining initial user location
  useEffect(() => {
    let isMounted = true;

    async function loadCurrentLocation() {
      // While auth state is still resolving on page refresh/initial load, wait
      if (authLoading) return;

      if (user?.uid) {
        setShowLocationPrompt(false);
        const cacheKey = `soloberty_user_coords_${user.uid}`;
        try {
          const cached = localStorage.getItem(cacheKey);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (
              parsed &&
              typeof parsed.lat === 'number' &&
              typeof parsed.lng === 'number' &&
              (parsed.lat !== 0 || parsed.lng !== 0)
            ) {
              if (isMounted) {
                setCurrentUserLocation(parsed);
                setInitialLocationReady(true);
              }
            }
          }
        } catch {
          // ignore cache errors
        }

        try {
          const [{ doc, getDoc }, { db }] = await Promise.all([
            import('firebase/firestore'),
            import('../../lib/firebase/config'),
          ]);
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data() as UserProfile;
            const coords = data.location?.coordinates;
            if (coords && (coords.lat !== 0 || coords.lng !== 0)) {
              try {
                localStorage.setItem(cacheKey, JSON.stringify(coords));
              } catch {
                // ignore storage errors
              }
              if (isMounted) {
                setCurrentUserLocation(coords);
              }
            }
          }
        } catch (e) {
          console.warn('Error reading current user location from Firestore:', e);
        } finally {
          if (isMounted) {
            setInitialLocationReady(true);
          }
        }
        return;
      }

      // Unlogged user: open directly at Vienna immediately
      if (isMounted) {
        setInitialLocationReady(true);
      }

      // Unlogged user: show one-time map intro & check geolocation permission
      let hasSeenIntro = false;
      try {
        hasSeenIntro = localStorage.getItem('soloberty_map_intro_seen') === '1';
      } catch {
        hasSeenIntro = false;
      }

      if (typeof window !== 'undefined' && 'geolocation' in navigator) {
        try {
          if (navigator.permissions?.query) {
            const status = await navigator.permissions.query({
              name: 'geolocation' as PermissionName,
            });
            if (!isMounted) return;
            if (status.state === 'granted') {
              setLocationGranted(true);
              navigator.geolocation.getCurrentPosition(
                (pos) => {
                  if (isMounted) {
                    setCurrentUserLocation({
                      lat: pos.coords.latitude,
                      lng: pos.coords.longitude,
                    });
                  }
                },
                () => { },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
              );
              if (!hasSeenIntro) {
                setShowLocationPrompt(true);
              }
              return;
            }
          }
        } catch {
          // Permissions API not supported; fall through to prompt
        }
      }

      if (isMounted && !hasSeenIntro) {
        setShowLocationPrompt(true);
      }
    }

    loadCurrentLocation();

    return () => {
      isMounted = false;
    };
  }, [user?.uid, authLoading]);

  // Hook to fetch and cache user profiles falling in the visible bounds
  const { users, loading, error, refetch } = useUserMarkers(viewportBounds, user?.uid);

  // Sync mode if URL queryMode changes
  useEffect(() => {
    if (queryMode === 'events') {
      setMapMode('events');
    } else if (queryMode === 'people') {
      setMapMode('people');
    }
  }, [queryMode]);

  // Fetch events when in events mode
  useEffect(() => {
    if (mapMode !== 'events') return;
    let active = true;
    async function loadEvents() {
      setEventsLoading(true);
      try {
        const center = targetCoords || currentUserLocation || DEFAULT_CENTER;
        const [tmRes, commList] = await Promise.all([
          fetch(`/api/events?lat=${center.lat}&lng=${center.lng}&radius=50`)
            .then((r) => (r.ok ? r.json() : { events: [] }))
            .catch(() => ({ events: [] })),
          fetchCommunityEvents(),
        ]);
        if (!active) return;
        const combined = [
          ...commList,
          ...(Array.isArray(tmRes?.events) ? tmRes.events : []),
        ];
        setMapEvents(combined);
      } finally {
        if (active) setEventsLoading(false);
      }
    }
    loadEvents();
    return () => {
      active = false;
    };
  }, [mapMode, currentUserLocation?.lat, currentUserLocation?.lng, targetCoords?.lat, targetCoords?.lng]);

  // Auto-select focused event when arriving from an EventCard location tag
  const hasAutoSelectedEventRef = useRef(false);
  useEffect(() => {
    if (!queryEventId || hasAutoSelectedEventRef.current || mapEvents.length === 0) return;
    const match = mapEvents.find((ev) => ev.id === queryEventId);
    if (match) {
      hasAutoSelectedEventRef.current = true;
      setTimeout(() => {
        setSelectedEvents([match]);
        setSelectedEventTitle(match.title);
      }, 1200);
    }
  }, [queryEventId, mapEvents]);

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
    setPreviewIndex((prev) => Math.max(0, prev - 2));
  }, []);

  const handleNext = useCallback(() => {
    setPreviewIndex((prev) => prev + 2);
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
    <div className="relative z-10 w-full h-full">
      <h1 className="sr-only">Soloberty Member Map</h1>
      {/* Top Distance Filter Bar */}
      <DistanceFilter
        selectedDistance={distanceFilter}
        onChange={setDistanceFilter}
      />

      {/* People | Events Toggle Pill */}
      <div className="absolute top-[74px] left-1/2 -translate-x-1/2 z-[1000] pointer-events-auto">
        <div className="inline-flex items-center p-1 rounded-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-700 shadow-lg">
          <button
            type="button"
            onClick={() => {
              setMapMode('people');
              setSelectedEvents([]);
              setSelectedEventTitle('');
              setActiveEventDetail(null);
            }}
            className={`relative inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-extrabold transition-colors cursor-pointer ${
              mapMode === 'people'
                ? 'text-white'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {mapMode === 'people' && (
              <motion.span
                layoutId="activeMapModePill"
                transition={{
                  type: 'spring',
                  stiffness: 500,
                  damping: 32,
                  mass: 0.7,
                }}
                className="absolute inset-0 rounded-full bg-[#007ABB] shadow-sm"
              />
            )}
            <Users className="relative z-10 w-3.5 h-3.5" />
            <span className="relative z-10">People</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMapMode('events');
              handleClosePreview();
            }}
            className={`relative inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-extrabold transition-colors cursor-pointer ${
              mapMode === 'events'
                ? 'text-white'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {mapMode === 'events' && (
              <motion.span
                layoutId="activeMapModePill"
                transition={{
                  type: 'spring',
                  stiffness: 500,
                  damping: 32,
                  mass: 0.7,
                }}
                className="absolute inset-0 rounded-full bg-[#CC5500] shadow-sm"
              />
            )}
            <Calendar className="relative z-10 w-3.5 h-3.5" />
            <span className="relative z-10">Events</span>
          </button>
        </div>
      </div>

      {/* Map Canvas (opens directly at user's location when signed in, or Vienna when unlogged) */}
      {initialLocationReady ? (
        <MapCanvas
          initialCenter={
            queryFromCoords || (user && currentUserLocation ? currentUserLocation : DEFAULT_CENTER)
          }
          initialZoom={initialZoomLevel}
          targetLocation={
            targetCoords
              ? { lat: targetCoords.lat, lng: targetCoords.lng, zoom: targetZoom }
              : manualLocationTarget
          }
          users={users}
          events={mapEvents}
          mode={mapMode}
          currentUserLocation={currentUserLocation}
          distanceFilter={distanceFilter}
          onBoundsChange={setViewportBounds}
          onSelectClusterOrUser={handleSelectClusterOrUser}
          onSelectEvents={(evs, title) => {
            setSelectedEvents(evs);
            setSelectedEventTitle(title);
            setActiveEventDetail(null);
            setEventListPage(0);
          }}
        />
      ) : (
        <MapLoadingPill />
      )}

      {/* Loading Indicator Pill (Bottom Left) */}
      {(loading || eventsLoading) && (
        <div className="absolute bottom-4 md:bottom-6 left-4 z-[999] flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-lg text-xs font-bold text-slate-700 dark:text-slate-200">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-[#007ABB]" />
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

      {/* User / Cluster Preview Bottom Sheet (lazy-loaded only when opened) */}
      {selectedUsers.length > 0 && (
        <UserPreviewCard
          users={selectedUsers}
          clusterTitle={selectedTitle}
          currentIndex={previewIndex}
          onPrev={handlePrev}
          onNext={handleNext}
          onClose={handleClosePreview}
          onSelectUser={(u) => setDetailedUser(u)}
          pauseFocusTrap={Boolean(detailedUser)}
        />
      )}

      {/* Selected Event(s) Bottom Preview Card / Cluster List */}
      {selectedEvents.length > 0 && mapMode === 'events' && (
        <div className="absolute bottom-4 md:bottom-6 left-1/2 -translate-x-1/2 z-[1050] w-[calc(100%-2rem)] max-w-md">
          <div className="rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-700 shadow-2xl p-4 space-y-3">
            {activeEventDetail || selectedEvents.length === 1 ? (
              (() => {
                const ev = activeEventDetail || selectedEvents[0];
                const canReturnToList = Boolean(activeEventDetail && selectedEvents.length > 1);
                return (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-[#CC5500]/15 text-[#CC5500] dark:text-[#FF8533]">
                            {ev.category}
                          </span>
                          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                            {ev.source === 'community' ? 'Community' : 'Ticketmaster'}
                          </span>
                        </div>
                        <h3 className="text-base font-extrabold font-heading text-slate-900 dark:text-white truncate">
                          {ev.title}
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (canReturnToList) {
                            setActiveEventDetail(null);
                          } else {
                            setSelectedEvents([]);
                            setSelectedEventTitle('');
                            setActiveEventDetail(null);
                          }
                        }}
                        aria-label={canReturnToList ? 'Back to events list' : 'Close event preview'}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                      {ev.description}
                    </p>

                    <div className="flex items-center justify-between gap-2 pt-1 text-xs">
                      <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-semibold truncate">
                        <MapPin className="w-3.5 h-3.5 text-[#CC5500] shrink-0" />
                        <span className="truncate">
                          {ev.venue} · {ev.city}
                        </span>
                      </div>
                      <Link
                        href={`/discover?eventId=${encodeURIComponent(ev.id)}`}
                        className="px-3 py-1.5 rounded-xl bg-[#007ABB] hover:bg-[#00669E] text-white font-extrabold inline-flex items-center gap-1 transition-colors shrink-0"
                      >
                        <span>See Event</span>
                      </Link>
                    </div>
                  </>
                );
              })()
            ) : (
              <>
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-6 h-6 rounded-full bg-[#CC5500] text-white text-xs font-black flex items-center justify-center shrink-0">
                      {selectedEvents.length}
                    </span>
                    <h3 className="text-sm font-extrabold font-heading text-slate-900 dark:text-white truncate">
                      {selectedEventTitle || `${selectedEvents.length} Events Nearby`}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedEvents([]);
                      setSelectedEventTitle('');
                      setActiveEventDetail(null);
                    }}
                    aria-label="Close events list"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2">
                  {selectedEvents
                    .slice(eventListPage * 2, eventListPage * 2 + 2)
                    .map((ev) => (
                      <div
                        key={ev.id}
                        className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/70 dark:border-slate-700/70 flex items-center justify-between gap-2.5"
                      >
                        <button
                          type="button"
                          onClick={() => setActiveEventDetail(ev)}
                          className="min-w-0 flex-1 text-left cursor-pointer"
                        >
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider bg-[#CC5500]/15 text-[#CC5500] dark:text-[#FF8533]">
                              {ev.category}
                            </span>
                            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                              {ev.source === 'community' ? 'Community' : 'Ticketmaster'}
                            </span>
                          </div>
                          <p className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                            {ev.title}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {ev.venue} · {ev.city}
                          </p>
                        </button>

                        <Link
                          href={`/discover?eventId=${encodeURIComponent(ev.id)}`}
                          className="px-2.5 py-1.5 rounded-xl bg-[#007ABB] hover:bg-[#00669E] text-white text-[11px] font-extrabold inline-flex items-center gap-1 shrink-0"
                        >
                          <span>See Event</span>
                        </Link>
                      </div>
                    ))}
                </div>

                {selectedEvents.length > 2 && (
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      disabled={eventListPage === 0}
                      onClick={() => setEventListPage((p) => Math.max(0, p - 1))}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>Prev</span>
                    </button>
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                      Page {eventListPage + 1} of {Math.ceil(selectedEvents.length / 2)}
                    </span>
                    <button
                      type="button"
                      disabled={(eventListPage + 1) * 2 >= selectedEvents.length}
                      onClick={() =>
                        setEventListPage((p) =>
                          (p + 1) * 2 < selectedEvents.length ? p + 1 : p
                        )
                      }
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <span>Next</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Detailed MatchCard Modal (lazy-loaded only when opened) */}
      {detailedUser && (
        <UserDetailModal
          user={detailedUser}
          onClose={() => setDetailedUser(null)}
        />
      )}

      {/* Location Permission & Map Intro Modal for Unlogged Users (matches Match Feed tips design) */}
      <AnimatePresence>
        {showLocationPrompt && !user && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[2100] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4"
            onClick={dismissMapIntro}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 12 }}
              transition={{ type: 'spring', stiffness: 450, damping: 28 }}
              className="relative w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 text-slate-900 dark:text-slate-100 shadow-2xl space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h2 className="text-base font-extrabold font-heading">
                  How Map Works
                </h2>
                <button
                  type="button"
                  onClick={dismissMapIntro}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  aria-label="Close guide"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <ul className="space-y-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                <li className="flex items-start gap-2.5">
                  <SlidersHorizontal className="w-4 h-4 text-[#007ABB] dark:text-[#B8E7FF] shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-slate-900 dark:text-white">Use the km radius filter</strong>{' '}
                    at the top to adjust your search area.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-[#007ABB] dark:text-[#B8E7FF] shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-slate-900 dark:text-white">Tap any pin or cluster</strong>{' '}
                    to preview profiles and start a chat.
                  </span>
                </li>
                {!locationGranted && (
                  <li className="flex items-start gap-2.5">
                    <Navigation className="w-4 h-4 text-[#CC5500] dark:text-[#FF8533] shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-slate-900 dark:text-white">Allow location</strong>{' '}
                      below to center the map on your neighborhood.
                    </span>
                  </li>
                )}
              </ul>

              {locationError && (
                <p className="text-[11px] font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/60 rounded-xl px-3 py-2 leading-relaxed">
                  {locationError}
                </p>
              )}

              {locationGranted ? (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={dismissMapIntro}
                    className="w-full py-2.5 px-4 bg-[#007ABB] hover:bg-[#0088CC] text-white dark:bg-[#B8E7FF] dark:hover:bg-[#99D8FF] dark:text-slate-900 text-xs sm:text-sm font-extrabold rounded-xl shadow-md shadow-[#007ABB]/20 transition-all active:scale-95 cursor-pointer"
                  >
                    Got it, let&apos;s explore
                  </button>
                </div>
              ) : (
                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={dismissMapIntro}
                    className="flex-1 py-2.5 px-3 text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                  >
                    Not Now
                  </button>
                  <button
                    type="button"
                    disabled={requestingLocation}
                    onClick={requestBrowserLocation}
                    className="flex-1 py-2.5 px-3 bg-[#007ABB] hover:bg-[#0088CC] text-white dark:bg-[#B8E7FF] dark:hover:bg-[#99D8FF] dark:text-slate-900 text-xs sm:text-sm font-extrabold rounded-xl shadow-md shadow-[#007ABB]/20 flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-60 cursor-pointer"
                  >
                    {requestingLocation ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <MapPin className="w-4 h-4 shrink-0" />
                    )}
                    <span>Allow Location</span>
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function MapPage() {
  return (
    <div className="relative w-full h-[calc(100vh-56px-60px)] md:h-[calc(100vh-56px)] overflow-hidden bg-[#F8FAFC] dark:bg-[#090D16]">
      {/* Full-bleed frosted map preview backdrop behind Leaflet for fast LCP & clean loading state */}
      <div
        className="absolute inset-0 z-0 pointer-events-none select-none overflow-hidden"
        aria-hidden="true"
      >
        <img
          src="/map-preview-vienna.webp"
          alt=""
          width={360}
          height={360}
          loading="eager"
          decoding="sync"
          fetchPriority="high"
          className="w-full h-full object-cover blur-[2px] opacity-55 dark:opacity-35 scale-105"
        />
      </div>

      <Suspense fallback={<MapLoadingPill />}>
        <MapPageContent />
      </Suspense>
    </div>
  );
}
