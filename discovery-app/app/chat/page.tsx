'use client';

import React, { useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { AnimatePresence } from 'motion/react';
import { MessageSquare, Trash2 } from 'lucide-react';
import { collection, query, orderBy, getDocs, limit, where } from 'firebase/firestore';
import { db } from '../../lib/firebase/config';
import { useProfiles } from '../../hooks/useProfiles';
import { useAuth } from '../../lib/hooks/useAuth';
import { useUnreadMessages } from '../../hooks/useUnreadMessages';
import dynamic from 'next/dynamic';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { tsToMillis, clearConversationForUser } from '../../lib/chatUtils';

const IndividualChat = dynamic(
  () => import('../../components/Chat/IndividualChat').then((m) => m.IndividualChat),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[calc(100vh-56px-60px)] md:h-[calc(100vh-56px)] items-center justify-center bg-slate-50 dark:bg-[#090D16]">
        <div className="w-8 h-8 border-4 border-[#007ABB] border-t-transparent rounded-full animate-spin" />
      </div>
    ),
  }
);

function ChatList() {
  const { user: authUser, loading: authLoading } = useAuth();
  const { profiles, loading: profilesLoading } = useProfiles();
  const { unreadMap } = useUnreadMessages();
  const router = useRouter();

  const [chatItems, setChatItems] = React.useState<any[]>([]);
  const [loadingChats, setLoadingChats] = React.useState(true);

  // Fetch real latest messages from Firestore for each conversation
  useEffect(() => {
    let isMounted = true;

    async function loadLatestMessages() {
      // Wait for auth to settle
      if (authLoading) return;

      setLoadingChats(true);
      try {
        const currentAuthUid = authUser?.uid || auth.currentUser?.uid || 'guest';
        const conversationsMap = new Map<string, any>();

        // 1. Query standard 'conversations' collection where current user is a participant
        if (currentAuthUid && currentAuthUid !== 'guest') {
          try {
            const convsRef = collection(db, 'conversations');
            // Query without composite orderBy to avoid needing a Firestore composite index
            const q = query(convsRef, where('participants', 'array-contains', currentAuthUid));
            const convSnap = await getDocs(q);
            for (const docSnap of convSnap.docs) {
              const data = docSnap.data();
              const participants: string[] = data.participants || [];
              const otherUid = participants.find((id) => id !== currentAuthUid);
              if (!otherUid) continue;

              let lastTimestamp = tsToMillis(data.updatedAt);

              // Hidden for me if I cleared it and nothing newer has arrived since
              const myClearedAt = tsToMillis(data.clearedAt?.[currentAuthUid]);
              if (myClearedAt && myClearedAt >= lastTimestamp) {
                continue;
              }

              // Lookup profile details
              const profile = profiles.find((p) => p.uid === otherUid);
              const participantDetails = data.participantDetails?.[otherUid] || {};

              conversationsMap.set(otherUid, {
                uid: otherUid,
                name: profile?.name || participantDetails.name || 'Member',
                age: profile?.age || participantDetails.age || 25,
                bio: profile?.bio || participantDetails.bio || '',
                interests: profile?.interests || participantDetails.interests || [],
                lastMessage: data.lastMessage || 'New conversation',
                lastTimestamp,
                isCleared: false,
                avatarColor: 'bg-[#E8F4FC] text-[#007ABB]',
              });
            }
          } catch (err) {
            console.warn('[Conversations Query Warning]:', err);
          }
        }

        // (legacy chats/* fallback removed)

        // Convert map values to array and compute formatted relative time
        const updated = Array.from(conversationsMap.values()).map((item) => {
          let formattedTime = item.isCleared ? 'Cleared' : 'New';
          if (item.lastTimestamp > 0) {
            const diffMs = Date.now() - item.lastTimestamp;
            const diffSec = Math.floor(diffMs / 1000);
            const diffMin = Math.floor(diffSec / 60);
            const diffHour = Math.floor(diffMin / 60);
            const diffDay = Math.floor(diffHour / 24);

            if (diffSec < 45) {
              formattedTime = 'Just now';
            } else if (diffMin < 60) {
              formattedTime = `${Math.max(1, diffMin)}m ago`;
            } else if (diffHour < 24) {
              formattedTime = `${diffHour}h ago`;
            } else {
              formattedTime = `${diffDay}d ago`;
            }
          }
          return {
            ...item,
            time: formattedTime,
          };
        });

        // Sort chat items in descending order (most recently active chat first)
        updated.sort((a: any, b: any) => b.lastTimestamp - a.lastTimestamp);

        if (isMounted) {
          setChatItems(updated);
        }
      } catch (err) {
        console.warn('[ChatList Load Error]:', err);
      } finally {
        if (isMounted) {
          setLoadingChats(false);
        }
      }
    }

    if (!profilesLoading && !authLoading) {
      loadLatestMessages();
    }

    return () => {
      isMounted = false;
    };
  }, [profiles, profilesLoading, authUser?.uid, authLoading]);

  const [showClearConfirmModal, setShowClearConfirmModal] = React.useState(false);
  const clearAllModalRef = React.useRef<HTMLDivElement>(null);
  useFocusTrap(showClearConfirmModal, clearAllModalRef, () => setShowClearConfirmModal(false));

  // Clear every conversation for the current user only
  const handleClearAllHistory = async () => {
    setShowClearConfirmModal(false);
    setLoadingChats(true);
    try {
      const myUid = authUser?.uid || auth.currentUser?.uid;
      if (myUid) {
        for (const item of chatItems) {
          const convId = [myUid, item.uid].sort().join('_');
          await clearConversationForUser(convId, myUid);
        }
      }
      // Cleared conversations disappear from my list
      setChatItems([]);
    } catch (e) {
      console.error('Error clearing chat history:', e);
    } finally {
      setLoadingChats(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-56px-60px)] md:h-[calc(100vh-64px)] w-full max-w-full bg-[#F8FAFC] dark:bg-[#090D16]">
      {/* Header */}
      <header className="h-16 flex items-center justify-between px-5 bg-white dark:bg-[#0F172A] border-b border-slate-200 dark:border-slate-800 shrink-0">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">Messages</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">Your active conversations</p>
        </div>
        <button
          type="button"
          onClick={() => setShowClearConfirmModal(true)}
          className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-300 text-xs font-bold rounded-xl border border-rose-200 dark:border-rose-800 transition-colors cursor-pointer flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Clear All</span>
        </button>
      </header>

      {/* Confirmation Modal for Clear All */}
      <AnimatePresence>
        {showClearConfirmModal && (
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-in fade-in duration-200"
            onClick={() => setShowClearConfirmModal(false)}
          >
            <div
              ref={clearAllModalRef}
              role="dialog"
              aria-modal="true"
              aria-label="Clear All Conversations"
              tabIndex={-1}
              className="relative w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 text-slate-900 dark:text-slate-100 shadow-2xl space-y-4 focus:outline-none"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
                <div className="p-2.5 bg-rose-100 dark:bg-rose-950/60 rounded-xl">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold font-heading">Clear All Conversations?</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">This action cannot be undone.</p>
                </div>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Are you sure you want to permanently delete all messages and active chat conversations?
              </p>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowClearConfirmModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleClearAllHistory}
                  className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md transition-colors cursor-pointer"
                >
                  Clear All
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {profilesLoading || authLoading || loadingChats ? (
          <div className="flex justify-center items-center h-48">
            <div className="w-8 h-8 border-4 border-[#007ABB] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : chatItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center px-4 space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No active conversations yet</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs">
                Start chatting with your matches from the Feed or Discover page to see them here!
              </p>
            </div>
          </div>
        ) : (
          chatItems.map((chatItem, idx) => (
            <button
              type="button"
              key={idx}
              onClick={() => {
                router.push(
                  `/chat?name=${encodeURIComponent(chatItem.name)}&age=${chatItem.age}&bio=${encodeURIComponent(chatItem.bio)}&interests=${encodeURIComponent(chatItem.interests.join(','))}&uid=${chatItem.uid}&from=chatlist`
                );
              }}
              className="w-full text-left p-4 bg-white dark:bg-[#0F172A] hover:bg-slate-100 dark:hover:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 rounded-2xl cursor-pointer transition-all flex items-center gap-3.5 shadow-sm active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007ABB]"
            >
              <div className={`w-12 h-12 rounded-full ${chatItem.avatarColor} flex items-center justify-center font-bold text-base shrink-0 shadow-inner`}>
                {chatItem.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {chatItem.name}, {chatItem.age}
                  </h2>
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">{chatItem.time}</span>
                    {(unreadMap[chatItem.uid] ?? 0) > 0 && (
                      <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-extrabold text-white bg-red-500 rounded-full shadow-sm opacity-100">
                        {unreadMap[chatItem.uid]}
                      </span>
                    )}
                  </div>
                </div>
                <p className={`text-xs truncate ${chatItem.isCleared ? 'text-slate-400 italic font-normal' : 'text-slate-500 dark:text-slate-400 font-medium'}`}>
                  {chatItem.lastMessage}
                </p>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function ChatContent() {
  const searchParams = useSearchParams();
  const rawParamName = searchParams.get('name');

  if (!rawParamName) {
    return <ChatList />;
  }

  return <IndividualChat rawParamName={rawParamName} searchParams={searchParams} />;
}


export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col h-[calc(100vh-56px-60px)] md:h-[calc(100vh-56px)] bg-slate-50 dark:bg-[#090D16] text-slate-900 dark:text-white transition-colors duration-200">
          <header className="h-16 px-5 bg-white dark:bg-[#0F172A] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 shadow-sm">
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">Messages</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">Your active conversations</p>
            </div>
          </header>
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-[#007ABB] border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      }
    >
      <ChatContent />
    </Suspense>
  );
}
