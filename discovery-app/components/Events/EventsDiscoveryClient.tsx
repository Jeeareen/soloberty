'use client';

import React, { useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Sparkles,
  Search,
  Loader2,
  X,
  Compass,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../lib/hooks/useAuth';
import {
  EVENT_CATEGORIES,
  type AppEvent,
  type EventCategory,
  type EventRecommendation,
} from '../../types/event';
import {
  fetchCommunityEvents,
  toggleEventRsvp,
  deleteCommunityEvent,
} from '../../lib/events/firestoreEvents';
import { EventCard } from './EventCard';

const CreateEventModal = dynamic(
  () => import('./CreateEventModal').then((mod) => mod.CreateEventModal),
  { ssr: false }
);

const ShareEventModal = dynamic(
  () => import('./ShareEventModal').then((mod) => mod.ShareEventModal),
  { ssr: false }
);

const DEFAULT_COORDS = { lat: 48.2082, lng: 16.3738 };
const EVENTS_PER_PAGE = 15;

interface EventsDiscoveryClientProps {
  initialEvents?: AppEvent[];
  initialCommunityEvents?: AppEvent[];
}

export const EventsDiscoveryClient: React.FC<EventsDiscoveryClientProps> = ({
  initialEvents = [],
  initialCommunityEvents = [],
}) => {
  const { user } = useAuth();
  const router = useRouter();
  const [focusedEventId, setFocusedEventId] = useState<string | null>(null);
  const [focusedFrom, setFocusedFrom] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    setFocusedEventId(params.get('eventId'));
    setFocusedFrom(params.get('from'));
  }, []);
  const [ticketmasterEvents, setTicketmasterEvents] = useState<AppEvent[]>(initialEvents);
  const [communityEvents, setCommunityEvents] = useState<AppEvent[]>(initialCommunityEvents);
  const [loading, setLoading] = useState(
    initialEvents.length === 0 && initialCommunityEvents.length === 0
  );
  const [userCoords, setUserCoords] = useState(DEFAULT_COORDS);
  const [userInterests, setUserInterests] = useState<string[]>([]);

  // Filters & Pagination
  const [selectedCategory, setSelectedCategory] = useState<'All' | EventCategory>('All');
  const [selectedSource, setSelectedSource] = useState<
    'all' | 'community' | 'ticketmaster' | 'mine'
  >('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Create / Edit / Delete / Share modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<AppEvent | null>(null);
  const [sharingEvent, setSharingEvent] = useState<AppEvent | null>(null);
  const [rsvpBusyId, setRsvpBusyId] = useState<string | null>(null);
  const [deleteBusyId, setDeleteBusyId] = useState<string | null>(null);

  // AI Event Finder state
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiRecommendations, setAiRecommendations] = useState<EventRecommendation[]>([]);
  const [aiError, setAiError] = useState<string | null>(null);

  // Load user coordinates & interests if signed in
  useEffect(() => {
    if (!user?.uid) return;
    let active = true;
    (async () => {
      try {
        const [{ doc, getDoc }, { db }] = await Promise.all([
          import('firebase/firestore'),
          import('../../lib/firebase/config'),
        ]);
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (!active || !snap.exists()) return;
        const data = snap.data();
        if (data?.location?.coordinates?.lat && data?.location?.coordinates?.lng) {
          setUserCoords(data.location.coordinates);
        }
        if (Array.isArray(data?.interests)) {
          setUserInterests(data.interests);
        }
      } catch {
        // ignore profile read errors
      }
    })();
    return () => {
      active = false;
    };
  }, [user?.uid]);

  // Fetch Ticketmaster + Firestore community events without wiping SSR initialEvents
  useEffect(() => {
    let active = true;
    async function loadAll() {
      if (initialEvents.length === 0) {
        setLoading(true);
      }
      try {
        const [tmRes, commList] = await Promise.all([
          fetch(`/api/events?lat=${userCoords.lat}&lng=${userCoords.lng}&radius=50`)
            .then((r) => (r.ok ? r.json() : { events: [] }))
            .catch(() => ({ events: [] })),
          fetchCommunityEvents(),
        ]);
        if (!active) return;
        if (Array.isArray(tmRes?.events) && tmRes.events.length > 0) {
          setTicketmasterEvents(tmRes.events);
        }
        setCommunityEvents(commList);
      } finally {
        if (active) setLoading(false);
      }
    }
    loadAll();
    return () => {
      active = false;
    };
  }, [userCoords.lat, userCoords.lng, initialEvents.length]);

  const allEvents = useMemo(() => {
    const combined = [...communityEvents, ...ticketmasterEvents];
    return combined.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [communityEvents, ticketmasterEvents]);

  const aiReasonMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const rec of aiRecommendations) {
      map.set(rec.id, rec.reason);
    }
    return map;
  }, [aiRecommendations]);

  const myEventsCount = useMemo(() => {
    if (!user?.uid) return 0;
    return communityEvents.filter((ev) => ev.hostId === user.uid).length;
  }, [communityEvents, user?.uid]);

  const displayedEvents = useMemo(() => {
    if (focusedEventId) {
      const focused = allEvents.find((ev) => ev.id === focusedEventId);
      if (focused) {
        return [focused];
      }
    }

    const list = allEvents.filter((ev) => {
      if (selectedCategory !== 'All' && ev.category !== selectedCategory) return false;
      if (selectedSource === 'mine') {
        return Boolean(user?.uid && ev.source === 'community' && ev.hostId === user.uid);
      }
      if (selectedSource !== 'all' && ev.source !== selectedSource) return false;
      return true;
    });

    if (aiRecommendations.length > 0) {
      const recIds = new Set(aiRecommendations.map((r) => r.id));
      const matched = list.filter((ev) => recIds.has(ev.id));
      if (matched.length > 0) {
        return matched;
      }
    }
    return list;
  }, [allEvents, selectedCategory, selectedSource, aiRecommendations, focusedEventId, user?.uid]);

  // Reset to page 1 when filters or AI results change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, selectedSource, aiRecommendations]);

  const totalPages = Math.max(1, Math.ceil(displayedEvents.length / EVENTS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);

  const paginatedEvents = useMemo(() => {
    const start = (safePage - 1) * EVENTS_PER_PAGE;
    return displayedEvents.slice(start, start + EVENTS_PER_PAGE);
  }, [displayedEvents, safePage]);

  const goToPage = (page: number) => {
    const clamped = Math.max(1, Math.min(totalPages, page));
    setCurrentPage(clamped);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const runAiSearch = async (promptOverride?: string) => {
    const queryText = typeof promptOverride === 'string' ? promptOverride : aiPrompt;
    if (allEvents.length === 0) return;

    setAiLoading(true);
    setAiError(null);
    try {
      const res = await fetch('/api/events/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: queryText,
          userInterests,
          events: allEvents.map((e) => ({
            id: e.id,
            title: e.title,
            category: e.category,
            venue: e.venue,
            city: e.city,
            date: e.date,
            description: e.description,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAiError(data?.error || 'Could not get recommendations.');
        return;
      }
      setAiSummary(data.summary || null);
      setAiRecommendations(Array.isArray(data.recommendations) ? data.recommendations : []);
    } catch {
      setAiError('Network error while contacting Scout AI.');
    } finally {
      setAiLoading(false);
    }
  };

  const clearAiFilter = () => {
    setAiPrompt('');
    setAiSummary(null);
    setAiRecommendations([]);
    setAiError(null);
  };

  const handleToggleRsvp = async (event: AppEvent) => {
    if (!user?.uid) {
      alert('Please sign in to RSVP to community events.');
      return;
    }
    const currentlyGoing = event.attendees.includes(user.uid);
    setRsvpBusyId(event.id);
    try {
      await toggleEventRsvp(event.id, user.uid, currentlyGoing);
      setCommunityEvents((prev) =>
        prev.map((ev) => {
          if (ev.id !== event.id) return ev;
          const nextAttendees = currentlyGoing
            ? ev.attendees.filter((id) => id !== user.uid)
            : [...ev.attendees, user.uid];
          const nextNames = { ...(ev.attendeeNames || {}) };
          if (currentlyGoing) {
            delete nextNames[user.uid];
          } else {
            nextNames[user.uid] =
              user.displayName || user.email?.split('@')[0] || 'You';
          }
          return { ...ev, attendees: nextAttendees, attendeeNames: nextNames };
        })
      );
    } catch (err) {
      console.error('RSVP toggle failed:', err);
    } finally {
      setRsvpBusyId(null);
    }
  };

  const handleDeleteEvent = async (event: AppEvent) => {
    if (!user?.uid) return;
    const confirmed = window.confirm(`Delete "${event.title}"? This will remove it from Discover and the Map.`);
    if (!confirmed) return;

    setDeleteBusyId(event.id);
    try {
      await deleteCommunityEvent(event.id, user.uid);
      setCommunityEvents((prev) => prev.filter((ev) => ev.id !== event.id));
    } catch (err: any) {
      console.error('Delete event failed:', err);
      alert(err?.message || 'Could not delete event.');
    } finally {
      setDeleteBusyId(null);
    }
  };

  return (
    <div className="w-full max-w-6xl ml-[max(0px,calc((100vw-72rem)/2))] px-4 sm:px-6 pt-6 pb-24 md:pb-12 space-y-6 min-h-[calc(100vh-56px)]">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-2 sm:gap-4">
        <h1 className="inline-flex items-center gap-2 sm:gap-2.5 text-xl sm:text-3xl font-extrabold font-heading text-slate-900 dark:text-white min-w-0">
          <Compass className="w-6 h-6 sm:w-8 sm:h-8 shrink-0" />
          <span className="truncate">Discover Events</span>
        </h1>

        <button
          type="button"
          onClick={() => {
            setEditingEvent(null);
            setIsCreateOpen(true);
          }}
          className="inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-2xl bg-[#CC5500] hover:bg-[#B34A00] text-white text-xs sm:text-sm font-extrabold shadow-lg shadow-[#CC5500]/20 transition-all active:scale-95 cursor-pointer shrink-0 whitespace-nowrap"
        >
          <Plus className="w-4 h-4 shrink-0" />
          <span>Create Event</span>
        </button>
      </div>

      {/* Scout AI Event Finder Bar */}
      <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 shadow-sm space-y-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            runAiSearch();
          }}
          className="flex flex-col sm:flex-row gap-2.5"
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              maxLength={300}
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="Ask Scout AI: e.g. 'chill live music this weekend' or 'outdoor sports'..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#007ABB]"
            />
          </div>

          <div className="flex items-stretch gap-2">
            <button
              type="submit"
              disabled={aiLoading || loading}
              className="flex-1 sm:flex-none px-3 sm:px-4 py-2.5 rounded-xl bg-[#007ABB] hover:bg-[#00669E] text-white text-xs font-extrabold inline-flex items-center justify-center gap-1.5 whitespace-nowrap transition-all active:scale-95 disabled:opacity-60 cursor-pointer"
            >
              {aiLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
              ) : (
                <Search className="w-3.5 h-3.5 shrink-0" />
              )}
              <span>Find Events</span>
            </button>

            <button
              type="button"
              disabled={aiLoading || loading}
              onClick={() => {
                setAiPrompt('');
                runAiSearch('');
              }}
              className="flex-1 sm:flex-none px-3 sm:px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-xs font-bold inline-flex items-center justify-center gap-1.5 whitespace-nowrap transition-all cursor-pointer disabled:opacity-60"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#CC5500] dark:text-[#FF8533] shrink-0" />
              <span>Recommend for me</span>
            </button>
          </div>
        </form>

        {aiError && (
          <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">{aiError}</p>
        )}

        {aiSummary && (
          <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-[#007ABB]/10 dark:bg-[#007ABB]/20 border border-[#007ABB]/20 text-xs font-semibold text-[#005B8F] dark:text-[#B8E7FF]">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>{aiSummary}</span>
            </div>
            <button
              type="button"
              onClick={clearAiFilter}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-[#007ABB]/15 shrink-0 font-bold cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Show all</span>
            </button>
          </div>
        )}
      </section>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
          {(['All', ...EVENT_CATEGORIES] as const).map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`relative h-9 px-3.5 rounded-full text-xs font-bold whitespace-nowrap inline-flex items-center justify-center transition-all duration-200 active:scale-95 cursor-pointer border ${
                  isSelected
                    ? 'bg-slate-900 dark:bg-white border-transparent text-white dark:text-slate-900 shadow-sm'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        <div className="inline-flex items-center flex-nowrap h-9 w-full sm:w-auto justify-between sm:justify-start p-1 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 self-start sm:self-center shrink-0">
          {(
            [
              { id: 'all', label: 'All' },
              { id: 'community', label: 'Community' },
              { id: 'ticketmaster', label: 'Ticketmaster' },
              { id: 'mine', label: `My Events (${myEventsCount})` },
            ] as const
          ).map((tab) => {
            const isSelected = selectedSource === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedSource(tab.id)}
                className={`relative h-7 px-2.5 sm:px-3 rounded-full text-[11px] sm:text-xs font-bold inline-flex items-center justify-center transition-all duration-200 active:scale-95 cursor-pointer whitespace-nowrap ${
                  isSelected
                    ? 'bg-[#007ABB] text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Focused Event Banner when navigated from Map or Chat "See Event" */}
      {focusedEventId && (
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-2xl bg-[#007ABB]/10 dark:bg-[#007ABB]/20 border border-[#007ABB]/25 text-xs font-bold text-[#005B8F] dark:text-[#B8E7FF]">
          <span>
            {focusedFrom === 'chat'
              ? 'Showing selected event from Chat'
              : 'Showing selected event from Map'}
          </span>
          <button
            type="button"
            onClick={() => {
              setFocusedEventId(null);
              setFocusedFrom(null);
              router.push('/discover');
            }}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/80 dark:bg-slate-900/80 hover:bg-white dark:hover:bg-slate-900 text-[#007ABB] dark:text-[#B8E7FF] font-extrabold cursor-pointer shadow-sm whitespace-nowrap shrink-0"
          >
            <X className="w-3.5 h-3.5 shrink-0" />
            <span>Show all events</span>
          </button>
        </div>
      )}

      {/* Events Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div
              key={n}
              className="h-80 rounded-2xl bg-slate-200/70 dark:bg-slate-800/70 animate-pulse"
            />
          ))}
        </div>
      ) : displayedEvents.length === 0 ? (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-10 text-center space-y-3">
          <Calendar className="w-8 h-8 mx-auto text-slate-400" />
          <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
            No events match these filters yet.
          </p>
          <button
            type="button"
            onClick={() => {
              setSelectedCategory('All');
              setSelectedSource('all');
              clearAiFilter();
            }}
            className="px-4 py-2 rounded-xl bg-[#007ABB] text-white text-xs font-extrabold cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {paginatedEvents.map((ev, idx) => (
              <EventCard
                key={ev.id}
                event={ev}
                priority={idx === 0}
                aiReason={aiReasonMap.get(ev.id)}
                currentUserId={user?.uid}
                userCoords={userCoords}
                onToggleRsvp={handleToggleRsvp}
                onShare={(target) => setSharingEvent(target)}
                onEdit={(target) => {
                  setEditingEvent(target);
                  setIsCreateOpen(true);
                }}
                onDelete={handleDeleteEvent}
                rsvpBusy={rsvpBusyId === ev.id}
                deleteBusy={deleteBusyId === ev.id}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <nav
              aria-label="Events pagination"
              className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-slate-800"
            >
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Showing {(safePage - 1) * EVENTS_PER_PAGE + 1}–
                {Math.min(safePage * EVENTS_PER_PAGE, displayedEvents.length)} of{' '}
                {displayedEvents.length} events
              </p>

              <div className="inline-flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => goToPage(safePage - 1)}
                  disabled={safePage <= 1}
                  aria-label="Previous page"
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Prev</span>
                </button>

                <div className="inline-flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => goToPage(pageNum)}
                      aria-current={pageNum === safePage ? 'page' : undefined}
                      className={`min-w-8 h-8 px-2 rounded-xl text-xs font-extrabold transition-colors cursor-pointer ${pageNum === safePage
                        ? 'bg-[#007ABB] text-white shadow-sm'
                        : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                    >
                      {pageNum}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => goToPage(safePage + 1)}
                  disabled={safePage >= totalPages}
                  aria-label="Next page"
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </nav>
          )}
        </>
      )}

      {/* Create / Edit Event Modal (lazy-loaded only when opened) */}
      {isCreateOpen && (
        <CreateEventModal
          isOpen={isCreateOpen}
          editingEvent={editingEvent}
          onClose={() => {
            setIsCreateOpen(false);
            setEditingEvent(null);
          }}
          onCreated={(created) => setCommunityEvents((prev) => [created, ...prev])}
          onUpdated={(updated) =>
            setCommunityEvents((prev) =>
              prev.map((ev) => (ev.id === updated.id ? updated : ev))
            )
          }
          defaultCoords={userCoords}
          user={user}
        />
      )}

      {/* Share Event in Chat Modal (lazy-loaded only when opened) */}
      {sharingEvent && (
        <ShareEventModal
          event={sharingEvent}
          onClose={() => setSharingEvent(null)}
          user={user}
        />
      )}
    </div>
  );
};
