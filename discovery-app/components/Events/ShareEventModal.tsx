'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  X,
  Send,
  Check,
  Search,
  Loader2,
  Calendar,
  MapPin,
  MessageSquare,
  Share2,
} from 'lucide-react';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  addDoc,
  serverTimestamp,
  increment,
} from 'firebase/firestore';
import { db } from '../../lib/firebase/config';
import { useProfiles } from '../../hooks/useProfiles';
import type { AppEvent } from '../../types/event';

interface FriendItem {
  uid: string;
  name: string;
  city?: string;
  avatarUrl?: string;
  isRecentChat: boolean;
}

interface ShareEventModalProps {
  event: AppEvent | null;
  onClose: () => void;
  user: { uid: string; displayName?: string | null; email?: string | null } | null;
}

export const ShareEventModal: React.FC<ShareEventModalProps> = ({
  event,
  onClose,
  user,
}) => {
  const router = useRouter();
  const { profiles } = useProfiles();

  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [note, setNote] = useState('');
  const [sendingUid, setSendingUid] = useState<string | null>(null);
  const [sentUids, setSentUids] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!event) return;
    setSearchTerm('');
    setNote('');
    setSentUids(new Set());
    setError(null);

    if (!user?.uid) return;
    let active = true;

    async function loadChatFriends() {
      setLoadingFriends(true);
      try {
        const recentMap = new Map<string, FriendItem>();

        try {
          const q = query(
            collection(db, 'conversations'),
            where('participants', 'array-contains', user!.uid)
          );
          const snap = await getDocs(q);
          snap.forEach((docSnap) => {
            const data = docSnap.data();
            const participants: string[] = data.participants || [];
            const otherUid = participants.find((id) => id !== user!.uid);
            if (!otherUid) return;

            const profile = profiles.find((p) => p.uid === otherUid);
            const details = data.participantDetails?.[otherUid] || {};
            recentMap.set(otherUid, {
              uid: otherUid,
              name: profile?.name || details.name || 'Member',
              city: profile?.location?.city,
              avatarUrl: profile?.avatarUrl,
              isRecentChat: true,
            });
          });
        } catch (err) {
          console.warn('[ShareEventModal] Could not load conversations:', err);
        }

        // Also include other discoverable profiles so user can share even with no prior chats
        for (const p of profiles) {
          if (!p.uid || p.uid === user!.uid || recentMap.has(p.uid)) continue;
          recentMap.set(p.uid, {
            uid: p.uid,
            name: p.name || 'Member',
            city: p.location?.city,
            avatarUrl: p.avatarUrl,
            isRecentChat: false,
          });
        }

        if (active) {
          const sorted = Array.from(recentMap.values()).sort((a, b) => {
            if (a.isRecentChat !== b.isRecentChat) return a.isRecentChat ? -1 : 1;
            return a.name.localeCompare(b.name);
          });
          setFriends(sorted);
        }
      } finally {
        if (active) setLoadingFriends(false);
      }
    }

    loadChatFriends();
    return () => {
      active = false;
    };
  }, [event, user?.uid, profiles]);

  const filteredFriends = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return friends;
    return friends.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        (f.city && f.city.toLowerCase().includes(q))
    );
  }, [friends, searchTerm]);

  if (!event) return null;

  const formattedDate = (() => {
    try {
      return new Date(event.date).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return event.date;
    }
  })();

  const handleSendToFriend = async (friend: FriendItem) => {
    if (!user?.uid) {
      setError('Please sign in to share events in chat.');
      return;
    }

    setSendingUid(friend.uid);
    setError(null);

    try {
      const conversationId = [user.uid, friend.uid].sort().join('_');
      const participants = [user.uid, friend.uid].sort();
      const customNote = note.trim() ? `${note.trim()}\n\n` : '';
      const messageText = `${customNote}🎉 Event Invite: ${event.title}\n📅 ${formattedDate}\n📍 ${event.venue} · ${event.city}`;

      const convRef = doc(db, 'conversations', conversationId);
      await setDoc(
        convRef,
        {
          participants,
          lastMessage: `🎉 Shared event: ${event.title}`,
          lastSenderUid: user.uid,
          updatedAt: serverTimestamp(),
          [`unreadCount.${friend.uid}`]: increment(1),
          participantDetails: {
            [friend.uid]: { name: friend.name },
            [user.uid]: {
              name: user.displayName || user.email?.split('@')[0] || 'Member',
            },
          },
        },
        { merge: true }
      );

      await addDoc(collection(db, 'conversations', conversationId, 'messages'), {
        role: 'user',
        content: messageText,
        sharedEvent: {
          id: event.id,
          title: event.title,
          date: formattedDate,
          venue: event.venue,
          city: event.city,
          category: event.category,
          lat: event.coordinates.lat,
          lng: event.coordinates.lng,
        },
        senderUid: user.uid,
        receiverUid: friend.uid,
        createdAt: serverTimestamp(),
      });

      fetch('/api/notifications/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiverUid: friend.uid,
          senderUid: user.uid,
          senderName: user.displayName || user.email?.split('@')[0] || 'A Friend',
          messageText: `Shared an event: ${event.title}`,
          conversationId,
        }),
      }).catch(() => {});

      setSentUids((prev) => new Set(prev).add(friend.uid));
    } catch (err: any) {
      console.error('[Share Event Error]:', err);
      setError(err?.message || 'Could not share event. Please try again.');
    } finally {
      setSendingUid(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[2100] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4 max-h-[88vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#007ABB]/10 dark:bg-[#007ABB]/20 flex items-center justify-center text-[#007ABB] dark:text-[#B8E7FF]">
              <Share2 className="w-4 h-4" />
            </div>
            <h2 className="text-base font-extrabold font-heading text-slate-900 dark:text-white">
              Share Event in Chat
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close share modal"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Event Preview Strip */}
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/80 space-y-1">
          <p className="text-xs font-extrabold text-slate-900 dark:text-white line-clamp-1">
            {event.title}
          </p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            <span className="inline-flex items-center gap-1">
              <Calendar className="w-3 h-3 text-[#007ABB]" />
              {formattedDate}
            </span>
            <span className="inline-flex items-center gap-1 truncate">
              <MapPin className="w-3 h-3 text-[#CC5500]" />
              {event.venue}
            </span>
          </div>
        </div>

        {!user ? (
          <div className="py-6 text-center space-y-2">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Sign in to share events with your friends in Chat.
            </p>
            <button
              type="button"
              onClick={() => {
                onClose();
                router.push('/auth/login');
              }}
              className="px-4 py-2 rounded-xl bg-[#007ABB] text-white text-xs font-extrabold cursor-pointer"
            >
              Sign In
            </button>
          </div>
        ) : (
          <>
            {error && (
              <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-xs font-semibold text-rose-700 dark:text-rose-200">
                {error}
              </div>
            )}

            {/* Optional Note */}
            <input
              type="text"
              maxLength={140}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a message (optional), e.g. 'Want to go together?'"
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#007ABB]"
            />

            {/* Friend Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search friends..."
                className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#007ABB]"
              />
            </div>

            {/* Friends List */}
            <div className="flex-1 overflow-y-auto space-y-1.5 min-h-[140px] max-h-60 pr-0.5">
              {loadingFriends ? (
                <div className="flex items-center justify-center py-8 text-xs text-slate-500">
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Loading friends...
                </div>
              ) : filteredFriends.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center text-xs text-slate-500 dark:text-slate-400 gap-1.5">
                  <MessageSquare className="w-5 h-5 text-slate-400" />
                  <span>No matching friends found.</span>
                </div>
              ) : (
                filteredFriends.map((friend) => {
                  const isSent = sentUids.has(friend.uid);
                  const isSending = sendingUid === friend.uid;
                  return (
                    <div
                      key={friend.uid}
                      className="flex items-center justify-between gap-2.5 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-[#E8F4FC] dark:bg-slate-800 text-[#005E91] dark:text-[#B8E7FF] font-extrabold text-xs flex items-center justify-center shrink-0 overflow-hidden">
                          {friend.avatarUrl ? (
                            <img
                              src={friend.avatarUrl}
                              alt={friend.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            friend.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {friend.name}
                          </p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                            {friend.isRecentChat ? 'Recent chat' : friend.city || 'Member'}
                          </p>
                        </div>
                      </div>

                      {isSent ? (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[11px] font-extrabold">
                            <Check className="w-3 h-3" />
                            Sent
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              router.push(
                                `/chat?name=${encodeURIComponent(friend.name)}&uid=${encodeURIComponent(
                                  friend.uid
                                )}`
                              );
                            }}
                            className="px-2.5 py-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[11px] font-extrabold cursor-pointer"
                          >
                            Open
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={isSending}
                          onClick={() => handleSendToFriend(friend)}
                          className="px-3 py-1.5 rounded-xl bg-[#007ABB] hover:bg-[#00669E] text-white text-xs font-extrabold inline-flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-60 active:scale-95 transition-all"
                        >
                          {isSending ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Send className="w-3 h-3" />
                          )}
                          <span>Send</span>
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
