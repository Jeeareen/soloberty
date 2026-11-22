'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  MapPin,
  Users,
  ExternalLink,
  Sparkles,
  Check,
  Ticket,
  Pencil,
  Trash2,
  Share2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
} from 'lucide-react';
import type { AppEvent, EventCategory } from '../../types/event';

const CATEGORY_GRADIENTS: Record<EventCategory, string> = {
  Music: 'from-violet-600 to-indigo-600',
  'Arts & Culture': 'from-amber-500 to-orange-600',
  'Sports & Outdoors': 'from-emerald-500 to-teal-600',
  'Food & Drink': 'from-rose-500 to-pink-600',
  'Tech & Networking': 'from-sky-500 to-blue-700',
  Social: 'from-[#007ABB] to-[#CC5500]',
};

interface EventCardProps {
  event: AppEvent;
  priority?: boolean;
  aiReason?: string;
  currentUserId?: string;
  userCoords?: { lat: number; lng: number } | null;
  onToggleRsvp?: (event: AppEvent) => void;
  onShare?: (event: AppEvent) => void;
  onEdit?: (event: AppEvent) => void;
  onDelete?: (event: AppEvent) => void;
  rsvpBusy?: boolean;
  deleteBusy?: boolean;
}

export const EventCard: React.FC<EventCardProps> = ({
  event,
  priority = false,
  aiReason,
  currentUserId,
  userCoords,
  onToggleRsvp,
  onShare,
  onEdit,
  onDelete,
  rsvpBusy,
  deleteBusy,
}) => {
  const router = useRouter();
  const [showAttendees, setShowAttendees] = useState(false);
  const [attendeesPage, setAttendeesPage] = useState(0);
  const attendeesRef = useRef<HTMLDivElement | null>(null);
  const isGoing = Boolean(currentUserId && event.attendees.includes(currentUserId));
  const ATTENDEES_PER_PAGE = 5;
  const totalAttendeePages = Math.max(1, Math.ceil(event.attendees.length / ATTENDEES_PER_PAGE));
  const safeAttendeePage = Math.min(attendeesPage, totalAttendeePages - 1);

  useEffect(() => {
    if (!showAttendees) return;
    const handleOutside = (e: MouseEvent) => {
      if (attendeesRef.current && !attendeesRef.current.contains(e.target as Node)) {
        setShowAttendees(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowAttendees(false);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showAttendees]);
  const isOwner = Boolean(
    currentUserId && event.source === 'community' && event.hostId === currentUserId
  );

  const formattedDate = React.useMemo(() => {
    try {
      const d = new Date(event.date);
      return d.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return event.date;
    }
  }, [event.date]);

  const handleLocationClick = () => {
    const params = new URLSearchParams({
      mode: 'events',
      eventId: event.id,
      lat: String(event.coordinates.lat),
      lng: String(event.coordinates.lng),
      zoom: '14',
    });
    if (userCoords && (userCoords.lat !== 0 || userCoords.lng !== 0)) {
      params.set('fromLat', String(userCoords.lat));
      params.set('fromLng', String(userCoords.lng));
    }
    router.push(`/map?${params.toString()}`);
  };

  return (
    <article
      className={`group relative flex flex-col rounded-2xl bg-white dark:bg-slate-900 border transition-all duration-200 shadow-sm hover:shadow-xl ${
        aiReason
          ? 'border-[#007ABB] dark:border-[#66C2FF] ring-2 ring-[#007ABB]/20'
          : 'border-slate-200/80 dark:border-slate-800'
      }`}
    >
      {/* Card Header Banner */}
      <div
        className={`relative h-36 w-full rounded-t-2xl bg-gradient-to-br ${
          CATEGORY_GRADIENTS[event.category] || CATEGORY_GRADIENTS.Social
        } overflow-hidden`}
      >
        {event.imageUrl && (
          <img
            src={event.imageUrl}
            alt={event.title}
            loading={priority ? 'eager' : 'lazy'}
            fetchPriority={priority ? 'high' : 'auto'}
            decoding={priority ? 'sync' : 'async'}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/20 to-transparent" />

        {/* Top badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
          <span className="px-2.5 py-1 rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md text-[11px] font-extrabold text-slate-900 dark:text-white shadow-sm">
            {event.category}
          </span>
          <span
            className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider backdrop-blur-md shadow-sm ${
              event.source === 'community'
                ? 'bg-[#CC5500] text-white'
                : 'bg-slate-900/80 text-white'
            }`}
          >
            {event.source === 'community' ? 'Community' : 'Ticketmaster'}
          </span>
        </div>

        {/* Date pill */}
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5 text-white text-xs font-bold drop-shadow">
          <Calendar className="w-3.5 h-3.5" />
          <span>{formattedDate}</span>
        </div>
      </div>

      {/* Card Body */}
      <div className="flex flex-col flex-1 p-4 space-y-3">
        {aiReason && (
          <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-[#007ABB]/10 dark:bg-[#007ABB]/20 border border-[#007ABB]/25 text-xs text-[#005B8F] dark:text-[#B8E7FF] font-semibold">
            <Sparkles className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>{aiReason}</span>
          </div>
        )}

        <div>
          <h3 className="text-base font-extrabold font-heading text-slate-900 dark:text-white line-clamp-1">
            {event.title}
          </h3>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
            {event.description}
          </p>
        </div>

        {/* Clickable Location Tag -> Navigates to /map and flies to event */}
        <div>
          <button
            type="button"
            onClick={handleLocationClick}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-[#007ABB]/10 dark:bg-slate-800 dark:hover:bg-[#007ABB]/20 text-slate-700 hover:text-[#007ABB] dark:text-slate-300 dark:hover:text-[#B8E7FF] text-xs font-bold transition-colors cursor-pointer max-w-full"
            title="View on Map"
          >
            <MapPin className="w-3.5 h-3.5 shrink-0 text-[#CC5500] dark:text-[#FF8533]" />
            <span className="truncate">
              {event.venue} · {event.city}
            </span>
          </button>
        </div>

        {/* Footer Actions */}
        <div className="relative mt-auto pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
          {event.source === 'community' ? (
            <>
              <div ref={attendeesRef}>
                <button
                  type="button"
                  onClick={() => {
                    setShowAttendees((prev) => {
                      if (!prev) setAttendeesPage(0);
                      return !prev;
                    });
                  }}
                  aria-expanded={showAttendees}
                  aria-label="Toggle participating users list"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>{event.attendees.length} going</span>
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700">
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-transform duration-200 ${
                        showAttendees ? '' : 'rotate-180'
                      }`}
                    />
                  </span>
                </button>

                {showAttendees && (
                  <div className="absolute inset-x-0 bottom-full mb-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl p-2.5 z-30 space-y-2">
                    {event.attendees.length === 0 ? (
                      <p className="text-[11px] text-slate-400 dark:text-slate-500">
                        No one has joined yet.
                      </p>
                    ) : (
                      <>
                        <ul className="flex flex-col gap-1.5">
                          {[...event.attendees]
                            .sort((a, b) => {
                              if (a === event.hostId) return -1;
                              if (b === event.hostId) return 1;
                              return 0;
                            })
                            .slice(
                              safeAttendeePage * ATTENDEES_PER_PAGE,
                              (safeAttendeePage + 1) * ATTENDEES_PER_PAGE
                            )
                            .map((uid) => {
                              const isHost = Boolean(event.hostId && uid === event.hostId);
                              const displayName =
                                event.attendeeNames?.[uid] ||
                                (isHost && event.hostName
                                  ? event.hostName
                                  : 'Soloberty Member');
                              return (
                                <li key={uid}>
                                  {isHost && uid !== currentUserId ? (
                                    <Link
                                      href={`/chat?name=${encodeURIComponent(
                                        displayName
                                      )}&uid=${encodeURIComponent(uid)}`}
                                      title={`Ask ${displayName} about this event`}
                                      className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-[#CC5500] hover:bg-[#B34A00] text-white text-[11px] font-semibold transition-colors"
                                    >
                                      <span className="truncate">{displayName}</span>
                                      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold shrink-0 opacity-95">
                                        <MessageSquare className="w-3 h-3" />
                                        <span>Ask the event host</span>
                                      </span>
                                    </Link>
                                  ) : (
                                    <div
                                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold truncate ${
                                        isHost
                                          ? 'bg-[#CC5500] text-white'
                                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
                                      }`}
                                    >
                                      {displayName}
                                    </div>
                                  )}
                                </li>
                              );
                            })}
                        </ul>

                        {totalAttendeePages > 1 && (
                          <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 dark:border-slate-800">
                            <button
                              type="button"
                              disabled={safeAttendeePage === 0}
                              onClick={() => setAttendeesPage((p) => Math.max(0, p - 1))}
                              aria-label="Previous attendees page"
                              className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                            >
                              <ChevronLeft className="w-3.5 h-3.5" />
                            </button>
                            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                              {safeAttendeePage + 1} / {totalAttendeePages}
                            </span>
                            <button
                              type="button"
                              disabled={safeAttendeePage >= totalAttendeePages - 1}
                              onClick={() =>
                                setAttendeesPage((p) =>
                                  Math.min(totalAttendeePages - 1, p + 1)
                                )
                              }
                              aria-label="Next attendees page"
                              className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                            >
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                {isOwner && (
                  <>
                    <button
                      type="button"
                      onClick={() => onEdit?.(event)}
                      aria-label={`Edit ${event.title}`}
                      title="Edit event"
                      className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={deleteBusy}
                      onClick={() => onDelete?.(event)}
                      aria-label={`Delete ${event.title}`}
                      title="Delete event"
                      className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => onShare?.(event)}
                  aria-label={`Share ${event.title} in chat`}
                  title="Share in Chat"
                  className="p-1.5 rounded-xl bg-slate-100 hover:bg-[#007ABB]/10 dark:bg-slate-800 dark:hover:bg-[#007ABB]/20 text-slate-700 hover:text-[#007ABB] dark:text-slate-200 dark:hover:text-[#B8E7FF] transition-colors cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={rsvpBusy || isOwner}
                  onClick={() => {
                    if (!isOwner) onToggleRsvp?.(event);
                  }}
                  title={isOwner ? 'As the creator, you are attending this event' : undefined}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all ${
                    isOwner
                      ? 'bg-[#CC5500] text-white cursor-default opacity-95'
                      : isGoing
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95 cursor-pointer disabled:opacity-60'
                        : 'bg-[#007ABB] hover:bg-[#00669E] text-white active:scale-95 cursor-pointer disabled:opacity-60'
                  }`}
                >
                  {(isGoing || isOwner) && <Check className="w-3.5 h-3.5" />}
                  <span>{isOwner ? 'Host' : isGoing ? 'Going' : "I'm Going"}</span>
                </button>
              </div>
            </>
          ) : (
            <>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                <Ticket className="w-3.5 h-3.5" />
                Featured Event
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onShare?.(event)}
                  aria-label={`Share ${event.title} in chat`}
                  title="Share in Chat"
                  className="p-1.5 rounded-xl bg-slate-100 hover:bg-[#007ABB]/10 dark:bg-slate-800 dark:hover:bg-[#007ABB]/20 text-slate-700 hover:text-[#007ABB] dark:text-slate-200 dark:hover:text-[#B8E7FF] transition-colors cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" />
                </button>
                {event.url && (
                  <a
                    href={event.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-200 text-white dark:text-slate-900 text-xs font-extrabold inline-flex items-center gap-1.5 transition-all active:scale-95"
                  >
                    <span>Tickets</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </article>
  );
};
