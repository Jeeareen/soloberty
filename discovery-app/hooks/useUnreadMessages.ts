'use client';

import { useState, useEffect, useRef } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../lib/firebase/config';
import { useAuth } from '../lib/hooks/useAuth';
import { useNotification } from '../lib/context/NotificationContext';

function tsToMillis(t: any): number {
  if (!t) return 0;
  if (typeof t.toMillis === 'function') return t.toMillis();
  if (typeof t.seconds === 'number') return t.seconds * 1000;
  if (t instanceof Date) return t.getTime();
  return 0;
}

export function useUnreadMessages() {
  const { user, loading: authLoading } = useAuth();
  const { notifyNewMessage } = useNotification();
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [unreadMap, setUnreadMap] = useState<Record<string, number>>({});
  const prevMapRef = useRef<Record<string, number>>({});
  const lastNotifiedTimeRef = useRef<Record<string, number>>({});
  const isFirstLoadRef = useRef(true);

  useEffect(() => {
    if (authLoading) return;
    const currentUid = user?.uid || auth.currentUser?.uid;
    if (!currentUid || currentUid === 'guest') {
      setUnreadCount(0);
      setUnreadMap({});
      return;
    }

    try {
      const convsRef = collection(db, 'conversations');
      const q = query(convsRef, where('participants', 'array-contains', currentUid));

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          let totalUnread = 0;
          const map: Record<string, number> = {};

          snapshot.docs.forEach((docSnap) => {
            const data = docSnap.data();
            const participants: string[] = data.participants || [];
            const otherUid = participants.find((id) => id !== currentUid);
            if (!otherUid) return;

            const lastTimestamp = tsToMillis(data.updatedAt);
            const myClearedAt = tsToMillis(data.clearedAt?.[currentUid]);
            if (myClearedAt && myClearedAt >= lastTimestamp) return;

            // Check unread count for current user
            const count = data.unreadCount?.[currentUid];
            let activeUnread = 0;
            if (typeof count === 'number' && count > 0) {
              activeUnread = count;
            } else {
              // Fallback based on lastReadAt timestamp
              const lastReadAt = tsToMillis(data.lastReadAt?.[currentUid]);
              if (lastTimestamp > 0 && lastTimestamp > lastReadAt && data.lastSenderUid && data.lastSenderUid !== currentUid) {
                activeUnread = 1;
              }
            }

            if (activeUnread > 0) {
              map[otherUid] = activeUnread;
              totalUnread += activeUnread;

              // If a new message arrived from this contact:
              // Check if its timestamp is newer than what we previously notified or if unreadCount grew
              const lastNotified = lastNotifiedTimeRef.current[otherUid] || 0;
              const prevCount = prevMapRef.current[otherUid] || 0;
              const isNewMessage = (lastTimestamp > 0 && lastTimestamp > lastNotified) || activeUnread > prevCount;

              if (!isFirstLoadRef.current && isNewMessage && data.lastSenderUid === otherUid) {
                lastNotifiedTimeRef.current[otherUid] = lastTimestamp || Date.now();
                const senderDetails = data.participantDetails?.[otherUid] || {};
                notifyNewMessage({
                  id: `${otherUid}_${lastTimestamp || Date.now()}`,
                  senderName: senderDetails.name || 'Match',
                  senderUid: otherUid,
                  messageText: data.lastMessage || 'Sent you a new message',
                  avatarUrl: senderDetails.avatarUrl,
                  url: `/chat?name=${encodeURIComponent(senderDetails.name || 'Member')}&uid=${otherUid}`,
                });
              }
            }
          });

          // Seed lastNotifiedTime on first snapshot so existing messages aren't blasted
          if (isFirstLoadRef.current) {
            snapshot.docs.forEach((docSnap) => {
              const data = docSnap.data();
              const other = (data.participants || []).find((id: string) => id !== currentUid);
              if (other) {
                lastNotifiedTimeRef.current[other] = tsToMillis(data.updatedAt) || Date.now();
              }
            });
          }

          prevMapRef.current = map;
          isFirstLoadRef.current = false;
          setUnreadCount(totalUnread);
          setUnreadMap(map);
        },
        (error) => {
          console.warn('[useUnreadMessages Warning]:', error);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.warn('[useUnreadMessages Error]:', err);
    }
  }, [user?.uid, authLoading]);

  return { unreadCount, unreadMap };
}
