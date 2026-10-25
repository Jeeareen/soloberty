'use client';

import React, { useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useChat } from '@ai-sdk/react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, ArrowLeft, Sparkles, AlertTriangle, RefreshCw, MessageSquare, X, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { collection, addDoc, query, orderBy, getDocs, limit, deleteDoc, serverTimestamp, doc, setDoc, updateDoc, where, getDoc } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase/config';
import { useProfiles } from '../../hooks/useProfiles';
import { useAuth } from '../../lib/hooks/useAuth';
import { UserDetailModal } from '../../components/Map/UserDetailModal';
import type { UserProfile } from '../../types/user';

interface ToolInvocationBlockProps {
  toolInvocation: any;
  name: string;
  interests: string[];
  setInput: (value: string) => void;
  reload: () => void;
}

export function ToolInvocationBlock({
  toolInvocation,
  name,
  interests,
  setInput,
  reload,
}: ToolInvocationBlockProps) {
  const { state } = toolInvocation;
  const [showResult, setShowResult] = React.useState(false);
  const [isRetrying, setIsRetrying] = React.useState(false);

  const handleRetry = async () => {
    if (isRetrying) return;
    setIsRetrying(true);
    try {
      await reload();
    } catch (e) {
      console.warn('[ToolInvocationBlock Retry Error]:', e);
    } finally {
      setTimeout(() => setIsRetrying(false), 1000);
    }
  };

  React.useEffect(() => {
    if (state === 'result') {
      const timer = setTimeout(() => {
        setShowResult(true);
      }, 1100);
      return () => clearTimeout(timer);
    }
  }, [state]);

  // State 1 — Streaming (state === 'partial-call')
  if (state === 'partial-call') {
    return (
      <div className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#B8E7FF]/40 dark:bg-slate-800/80 text-[#00AAFF] dark:text-[#B8E7FF] text-xs font-semibold my-2 border border-[#00AAFF]/20 shadow-sm">
        <span>Scout is generating icebreakers</span>
        <span className="inline-flex items-center gap-0.5 ml-0.5">
          <motion.span
            animate={{ opacity: [0.2, 1, 0.2] }}
            transition={{ repeat: Infinity, duration: 1.2, delay: 0 }}
            className="w-1 h-1 rounded-full bg-[#00AAFF] dark:bg-[#B8E7FF]"
          />
          <motion.span
            animate={{ opacity: [0.2, 1, 0.2] }}
            transition={{ repeat: Infinity, duration: 1.2, delay: 0.2 }}
            className="w-1 h-1 rounded-full bg-[#00AAFF] dark:bg-[#B8E7FF]"
          />
          <motion.span
            animate={{ opacity: [0.2, 1, 0.2] }}
            transition={{ repeat: Infinity, duration: 1.2, delay: 0.4 }}
            className="w-1 h-1 rounded-full bg-[#00AAFF] dark:bg-[#B8E7FF]"
          />
        </span>
      </div>
    );
  }

  // State 2 — Input available (state === 'call' OR state === 'result' during the 1.1s display window)
  if (state === 'call' || (state === 'result' && !showResult)) {
    const args = toolInvocation.args || {};
    const interestsList: string[] = Array.isArray(args.interests) && args.interests.length > 0 ? args.interests : interests;

    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="my-2 p-3.5 bg-sky-50 dark:bg-slate-800/90 border border-sky-200 dark:border-slate-700 rounded-2xl space-y-2 text-xs"
      >
        <div className="flex items-center gap-2 font-bold text-sky-900 dark:text-sky-200">
          <Sparkles className="w-4 h-4 text-[#00AAFF]" />
          <span>Finding questions for {args.name || name}</span>
        </div>
        {interestsList.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {interestsList.map((interest, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 bg-slate-200/70 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-md text-[11px] font-medium"
              >
                #{interest}
              </span>
            ))}
          </div>
        )}
      </motion.div>
    );
  }

  // State 3 — Output available (state === 'result' after 1.1s display window)
  if (state === 'result' && showResult) {
    const result = toolInvocation.result;
    const questions: string[] = result?.questions || [];

    if (questions.length > 0) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="my-2 p-4 bg-white dark:bg-[#0F172A] border-l-4 border-l-emerald-500 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-3"
        >
          <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <span>Try one of these to start the conversation</span>
            <span className="text-sm">👋</span>
          </h3>
          <div className="space-y-2">
            {questions.map((question, idx) => (
              <motion.button
                key={idx}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: idx * 0.1 }}
                type="button"
                onClick={() => setInput(question)}
                className="w-full text-left p-3 bg-slate-50 dark:bg-slate-800/60 hover:bg-[#B8E7FF]/30 dark:hover:bg-slate-700/60 border border-slate-200 dark:border-slate-700/60 hover:border-[#00AAFF]/40 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-200 transition-all cursor-pointer group flex items-start justify-between gap-2 active:scale-[0.99]"
              >
                <span>{question}</span>
                <MessageSquare className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#00AAFF] shrink-0 mt-0.5" />
              </motion.button>
            ))}
          </div>
        </motion.div>
      );
    }
  }

  // State 4 — Error
  const errorMessage =
    toolInvocation?.error?.message ||
    toolInvocation?.error ||
    "Couldn't generate suggestions right now.";

  return (
    <div className="my-2 p-3.5 bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/40 rounded-2xl flex items-center justify-between text-xs text-amber-900 dark:text-amber-200 shadow-sm">
      <div className="flex items-center gap-2">
        <RefreshCw className={`w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 ${isRetrying ? 'animate-spin' : ''}`} />
        <span>{typeof errorMessage === 'string' ? errorMessage : "Couldn't generate suggestions right now."}</span>
      </div>
      <button
        type="button"
        disabled={isRetrying}
        onClick={handleRetry}
        className="flex items-center gap-1 px-2.5 py-1 bg-amber-100 dark:bg-amber-900/50 hover:bg-amber-200 dark:hover:bg-amber-800/60 disabled:opacity-50 disabled:cursor-not-allowed text-amber-900 dark:text-amber-100 rounded-lg font-bold transition-colors cursor-pointer shrink-0 ml-2"
      >
        <RefreshCw className={`w-3 h-3 ${isRetrying ? 'animate-spin' : ''}`} />
        {isRetrying ? 'Retrying...' : 'Retry'}
      </button>
    </div>
  );
}

// Convert a Firestore Timestamp / Date / {seconds} into epoch millis (0 if missing)
function tsToMillis(t: any): number {
  if (!t) return 0;
  if (typeof t.toMillis === 'function') return t.toMillis();
  if (typeof t.seconds === 'number') return t.seconds * 1000;
  if (t instanceof Date) return t.getTime();
  return 0;
}

// Clear a conversation for ONE user. Messages stay in the database (hidden for this
// user via clearedAt[uid]) until every participant has cleared it; then it is deleted.
async function clearConversationForUser(conversationId: string, myUid: string): Promise<'hidden' | 'deleted'> {
  const convRef = doc(db, 'conversations', conversationId);
  try {
    await updateDoc(convRef, { [`clearedAt.${myUid}`]: serverTimestamp() });
  } catch (e: any) {
    if (e?.code === 'not-found') return 'deleted';
    throw e;
  }

  const snap = await getDoc(convRef);
  if (!snap.exists()) return 'deleted';
  const data = snap.data();
  const participants: string[] = data.participants || [];
  const lastActivity = tsToMillis(data.updatedAt);

  const everyoneCleared = participants.every((p) => {
    // My own marker may still be a pending server timestamp -> treat as now
    const clearedAt = p === myUid ? tsToMillis(data.clearedAt?.[p]) || Date.now() : tsToMillis(data.clearedAt?.[p]);
    return clearedAt > 0 && clearedAt >= lastActivity;
  });

  if (!everyoneCleared) return 'hidden';

  const msgs = await getDocs(collection(db, 'conversations', conversationId, 'messages'));
  for (const m of msgs.docs) {
    await deleteDoc(m.ref);
  }
  await deleteDoc(convRef);
  return 'deleted';
}

function ChatList() {
  const { user: authUser, loading: authLoading } = useAuth();
  const { profiles, loading: profilesLoading } = useProfiles();
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
                avatarColor: 'bg-[#B8E7FF] text-[#00AAFF]',
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
          className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-300 text-xs font-bold rounded-xl border border-rose-200 dark:border-rose-800 transition-colors cursor-pointer flex items-center gap-1.5"
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
              className="relative w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 text-slate-900 dark:text-slate-100 shadow-2xl space-y-4"
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
            <div className="w-8 h-8 border-4 border-[#00AAFF] border-t-transparent rounded-full animate-spin" />
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
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: idx * 0.05 }}
              onClick={() => {
                router.push(
                  `/chat?name=${encodeURIComponent(chatItem.name)}&age=${chatItem.age}&bio=${encodeURIComponent(chatItem.bio)}&interests=${encodeURIComponent(chatItem.interests.join(','))}&uid=${chatItem.uid}&from=chatlist`
                );
              }}
              className="p-4 bg-white dark:bg-[#0F172A] hover:bg-slate-100 dark:hover:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 rounded-2xl cursor-pointer transition-all flex items-center gap-3.5 shadow-sm active:scale-[0.99]"
            >
              <div className={`w-12 h-12 rounded-full ${chatItem.avatarColor} flex items-center justify-center font-bold text-base shrink-0 shadow-inner`}>
                {chatItem.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {chatItem.name}, {chatItem.age}
                  </h3>
                  <span className="text-[11px] text-slate-400">{chatItem.time}</span>
                </div>
                <p className={`text-xs truncate ${chatItem.isCleared ? 'text-slate-400 italic font-normal' : 'text-slate-500 dark:text-slate-400 font-medium'}`}>
                  {chatItem.lastMessage}
                </p>
              </div>
            </motion.div>
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

function IndividualChat({
  rawParamName,
  searchParams,
}: {
  rawParamName: string;
  searchParams: ReturnType<typeof useSearchParams>;
}) {
  const router = useRouter();
  const name = rawParamName;
  const age = searchParams.get('age') || '';
  const bio = searchParams.get('bio') || '';
  const fromSource = searchParams.get('from'); // 'feed' or 'chatlist'
  const backTargetHref = fromSource === 'feed' ? '/feed' : '/chat';

  // Handle Escape key press to activate back button navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        router.push(backTargetHref);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router, backTargetHref]);

  const rawInterests = searchParams.get('interests');
  const interests =
    rawInterests && rawInterests.trim() !== ''
      ? rawInterests.split(',').filter(Boolean)
      : [];

  const uid = searchParams.get('uid') || '';
  const { user: authUser } = useAuth();
  const currentAuthUid = authUser?.uid || auth.currentUser?.uid;

  // State to hold detailed UserProfile and detailed modal state
  const [targetProfile, setTargetProfile] = React.useState<UserProfile | null>(null);
  const [showDetailModal, setShowDetailModal] = React.useState(false);

  // Fetch full UserProfile for this user from Firestore if uid exists
  useEffect(() => {
    let isMounted = true;
    async function fetchTargetProfile() {
      if (!uid) return;
      try {
        const userDoc = await getDoc(doc(db, 'users', uid));
        if (userDoc.exists() && isMounted) {
          setTargetProfile({ uid, ...(userDoc.data() as any) });
        }
      } catch (err) {
        console.warn('Could not fetch target profile from Firestore:', err);
      }
    }
    fetchTargetProfile();
    return () => {
      isMounted = false;
    };
  }, [uid]);

  // Fallback constructed profile using query parameters if full doc is not fetched
  const resolvedTargetProfile: UserProfile = React.useMemo(() => {
    if (targetProfile) return targetProfile;
    return {
      uid: uid || 'member',
      name: name || 'Member',
      age: age ? parseInt(age, 10) : 25,
      bio: bio || '',
      interests: interests || [],
      location: {
        city: 'Vienna, AT',
      },
    };
  }, [targetProfile, uid, name, age, bio, interests]);

  // Industry Standard: Deterministic conversation ID [uidA, uidB].sort().join('_')
  const conversationId = React.useMemo(() => {
    if (uid && currentAuthUid && uid !== currentAuthUid) {
      return [currentAuthUid, uid].sort().join('_');
    }
    return uid ? `chat_${uid}` : `${rawParamName || 'user'}-${age}-${interests.join('_')}`;
  }, [uid, currentAuthUid, rawParamName, age, interests]);

  const chat = useChat({
    api: '/api/chat',
    id: conversationId,
  });

  const [localInput, setLocalInput] = React.useState('');
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const sentTokensRef = React.useRef<Set<string>>(new Set());

  const input = chat.input !== undefined && chat.input !== null ? chat.input : localInput;

  const setInput = (val: string) => {
    if (typeof chat.setInput === 'function') {
      chat.setInput(val);
    }
    setLocalInput(val);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (typeof chat.handleInputChange === 'function') {
      chat.handleInputChange(e);
    }
    setLocalInput(e.target.value);
  };

  const chatError = chat.error;
  const status = (chat as any).status;
  const chatIsLoading = (chat as any).isLoading;
  const isLoading = chatIsLoading ?? (status === 'streaming' || status === 'submitted');
  const reloadFn = (chat as any).reload || (chat as any).regenerate || (() => { });
  const stopFn = chat.stop;

  const [isPageRetrying, setIsPageRetrying] = React.useState(false);

  const handlePageRetry = async () => {
    if (isPageRetrying) return;
    setIsPageRetrying(true);
    try {
      await reloadFn();
    } catch (e) {
      console.warn('[Page Retry Error]:', e);
    } finally {
      setTimeout(() => setIsPageRetrying(false), 1000);
    }
  };

  // Firestore persistent message storage for individual conversations
  const [dbMessages, setDbMessages] = React.useState<any[]>([]);

  // 1. Load existing persistent chat messages from Firestore on mount
  useEffect(() => {
    if (!name) return;
    let isMounted = true;

    async function loadChatHistory() {
      try {
        if (!currentAuthUid) return;

        // My personal "cleared" marker: only show messages newer than it
        const convSnap = await getDoc(doc(db, 'conversations', conversationId));
        const myClearedAt = convSnap.exists()
          ? tsToMillis(convSnap.data()?.clearedAt?.[currentAuthUid])
          : 0;

        const standardRef = collection(db, 'conversations', conversationId, 'messages');
        const snapshot = await getDocs(query(standardRef, orderBy('createdAt', 'asc')));

        const loaded: any[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (myClearedAt && tsToMillis(data.createdAt) <= myClearedAt) return;
          loaded.push({
            id: docSnap.id,
            role: data.role || 'user',
            senderUid: data.senderUid || '',
            receiverUid: data.receiverUid || '',
            content: data.content || '',
            toolInvocations: data.toolInvocations || [],
            createdAt: data.createdAt,
          });
        });

        if (isMounted && loaded.length > 0) {
          setDbMessages(loaded);
        }
      } catch (err) {
        console.warn('[Firestore Chat Load Warning]:', err);
      }
    }

    loadChatHistory();
    return () => {
      isMounted = false;
    };
  }, [conversationId, uid, name, currentAuthUid]);

  // Helper to extract text from a message (supports string content and parts)
  const getMessageText = (message: any): string => {
    if (message.content && typeof message.content === 'string') {
      return message.content;
    }
    if (Array.isArray(message.parts)) {
      return message.parts
        .filter((p: any) => p.type === 'text')
        .map((p: any) => p.text)
        .join('');
    }
    return '';
  };

  // Helper to extract tool invocations from a message
  const getToolInvocations = (message: any): any[] => {
    if (Array.isArray(message.toolInvocations) && message.toolInvocations.length > 0) {
      return message.toolInvocations;
    }
    if (Array.isArray(message.toolCalls) && message.toolCalls.length > 0) {
      return message.toolCalls.map((tc: any) => ({
        state: tc.result !== undefined ? 'result' : 'call',
        toolCallId: tc.toolCallId || tc.id,
        toolName: tc.toolName || tc.name,
        args: tc.args || tc.input || {},
        result: tc.result || tc.output,
      }));
    }
    if (Array.isArray(message.parts)) {
      const invocations: any[] = [];
      const toolResultsMap: Record<string, any> = {};

      // Handler for newer Vercel AI SDK parts format (e.g., type: "tool-suggestIcebreakers")
      message.parts.forEach((p: any) => {
        if (
          typeof p.type === 'string' &&
          p.type.startsWith('tool-') &&
          p.type !== 'tool-call' &&
          p.type !== 'tool-result' &&
          p.type !== 'tool-invocation'
        ) {
          const toolName = p.type.replace(/^tool-/, '');
          let mappedState = p.state;

          if (p.state === 'output-available') mappedState = 'result';
          else if (p.state === 'input-streaming') mappedState = 'partial-call';
          else if (p.state === 'input-available') mappedState = 'call';
          else if (p.state === 'error') mappedState = 'error';

          invocations.push({
            state: mappedState,
            toolCallId: p.toolCallId || p.id,
            toolName: p.toolName || toolName,
            args: p.input || p.args || {},
            result: p.output || p.result,
            error: p.error,
          });
        }
      });

      if (invocations.length > 0) {
        return invocations;
      }

      message.parts.forEach((p: any) => {
        if (p.type === 'tool-result' || p.type === 'tool-invocation') {
          const id = p.toolCallId || p.id;
          if (id) toolResultsMap[id] = p.result || p.output || p;
        }
      });

      message.parts.forEach((p: any) => {
        if (p.toolInvocation) {
          invocations.push(p.toolInvocation);
        } else if (p.type === 'tool-call') {
          const callId = p.toolCallId || p.id;
          const result = toolResultsMap[callId];
          invocations.push({
            state: result !== undefined ? 'result' : 'call',
            toolCallId: callId,
            toolName: p.toolName || p.name,
            args: p.args || p.input || {},
            result: result,
          });
        } else if (
          p.type === 'tool-result' &&
          !message.parts.some(
            (other: any) =>
              other.type === 'tool-call' && (other.toolCallId || other.id) === (p.toolCallId || p.id)
          )
        ) {
          invocations.push({
            state: 'result',
            toolCallId: p.toolCallId || p.id,
            toolName: p.toolName || p.name,
            result: p.result || p.output,
          });
        }
      });

      return invocations;
    }
    return [];
  };

  // Combine Firestore saved messages with in-memory Vercel AI SDK chat messages
  const rawMessages = React.useMemo(() => {
    const aiMessages = chat.messages || [];
    if (dbMessages.length === 0) return aiMessages;

    const merged = [...dbMessages];
    aiMessages.forEach((aiMsg) => {
      const aiText = getMessageText(aiMsg);
      const isAlreadySaved = merged.some((m) => {
        if (m.id === aiMsg.id) return true;
        const mText = getMessageText(m);
        return mText && aiText && mText.trim() === aiText.trim();
      });

      if (!isAlreadySaved) {
        merged.push(aiMsg);
      }
    });
    return merged;
  }, [dbMessages, chat.messages]);

  const shouldGenerateParam = searchParams.get('generate');
  const tokenParam = searchParams.get('token');

  // Single-use token validation: Check if token has already been consumed in sessionStorage
  const [isSingleUseValid, setIsSingleUseValid] = React.useState(false);

  useEffect(() => {
    if (shouldGenerateParam === 'true' && tokenParam) {
      const consumed = sessionStorage.getItem(`consumed_token_${tokenParam}`);
      if (!consumed) {
        setIsSingleUseValid(true);
      } else {
        setIsSingleUseValid(false);
      }
    } else {
      setIsSingleUseValid(false);
    }
  }, [shouldGenerateParam, tokenParam]);

  // Auto-send initial icebreaker prompt on mount ONLY if token is valid and unconsumed
  useEffect(() => {
    if (rawParamName && isSingleUseValid && tokenParam && !sentTokensRef.current.has(tokenParam)) {
      sentTokensRef.current.add(tokenParam);
      sessionStorage.setItem(`consumed_token_${tokenParam}`, 'true');

      const initialPrompt = `Suggest icebreaker questions for ${rawParamName}${age ? `, ${age} years old` : ''
        }. Bio: ${bio}. Interests: ${interests.join(', ')}`;

      try {
        if (typeof (chat as any).sendMessage === 'function') {
          (chat as any).sendMessage({ text: initialPrompt });
        } else if (typeof (chat as any).append === 'function') {
          (chat as any).append({ role: 'user', content: initialPrompt });
        }
      } catch (e) {
        console.warn('[Chat Prompt Trigger Error]:', e);
      }
    }
  }, [rawParamName, age, bio, interests, isSingleUseValid, tokenParam, chat]);

  // Scroll to bottom on new messages or tool invocations
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [rawMessages]);

  // Save new sent message to Firestore (conversations/{id} + conversations/{id}/messages)
  const saveMessageToDb = async (textMsg: string, role: string = 'user') => {
    try {
      const currentUid = authUser?.uid || auth.currentUser?.uid;
      if (!currentUid || !uid) {
        console.error('[Firestore Save Message FAILED]: missing sender or receiver uid', { currentUid, uid });
        return;
      }
      const participants = [currentUid, uid];

      // 1. Upsert parent conversation FIRST (messages rule reads its participants)
      const convDocRef = doc(db, 'conversations', conversationId);
      await setDoc(
        convDocRef,
        {
          participants,
          lastMessage: textMsg,
          lastSenderUid: currentUid,
          updatedAt: serverTimestamp(),
          participantDetails: {
            [uid]: {
              name: rawParamName || 'Member',
              age: age ? parseInt(age, 10) : 25,
              bio: bio || '',
              interests: interests || [],
            },
          },
        },
        { merge: true }
      );

      // 2. Save the message itself
      await addDoc(collection(db, 'conversations', conversationId, 'messages'), {
        role,
        content: textMsg,
        senderUid: currentUid,
        receiverUid: uid,
        createdAt: serverTimestamp(),
      });
    } catch (e) {
      console.error('[Firestore Save Message FAILED]:', e);
    }
  };

  const handleCustomSubmit = () => {
    const textToSend = input?.trim();
    if (!textToSend) return;

    const currentUid = auth.currentUser?.uid || 'guest';

    // Save user message to Firestore persistent storage
    saveMessageToDb(textToSend, 'user');

    // Update local chat message list immediately
    setDbMessages((prev) => [
      ...prev,
      {
        id: `local-${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        role: 'user',
        senderUid: currentUid,
        receiverUid: uid || '',
        content: textToSend,
        createdAt: new Date(),
      },
    ]);

    // Clear input
    setInput('');
  };

  const hasToolResults = rawMessages.some((m: any) => getToolInvocations(m).length > 0);

  const [showProfileModal, setShowProfileModal] = React.useState(false);
  const profileDropdownRef = React.useRef<HTMLDivElement>(null);

  // Close profile dropdown menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setShowProfileModal(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [showIndividualClearModal, setShowIndividualClearModal] = React.useState(false);

  const handleClearIndividualChat = async () => {
    setShowIndividualClearModal(false);
    try {
      if (currentAuthUid) {
        await clearConversationForUser(conversationId, currentAuthUid);
      }

      setDbMessages([]);
      if (typeof (chat as any).setMessages === 'function') {
        (chat as any).setMessages([]);
      }

      // Remove generate & token query params from URL so reloads don't re-trigger icebreakers
      router.replace(`/chat?name=${encodeURIComponent(rawParamName)}&age=${age}&bio=${encodeURIComponent(bio)}&interests=${encodeURIComponent(interests.join(','))}&uid=${uid}&from=${fromSource || 'chatlist'}`);
    } catch (e) {
      console.error('[Clear Individual Chat FAILED]:', e);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-56px-60px)] md:h-[calc(100vh-64px)] w-full max-w-full bg-[#F8FAFC] dark:bg-[#090D16]">
      {/* Top Navigation Header */}
      <header className="relative h-16 flex items-center justify-between gap-3 px-4 bg-white dark:bg-[#0F172A] border-b border-slate-200 dark:border-slate-800 shrink-0 z-30">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Link
            href={backTargetHref}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>

          {/* Clickable Target User Name/Bio Info Area (With dropdown container) */}
          <div ref={profileDropdownRef} className="relative flex-1 min-w-0">
            <div
              onClick={() => setShowProfileModal((prev) => !prev)}
              className="flex items-center gap-3 w-full cursor-pointer group hover:opacity-90 transition-all"
            >
              <div className="w-10 h-10 rounded-full bg-[#B8E7FF] dark:bg-slate-800 text-[#00AAFF] dark:text-[#B8E7FF] flex items-center justify-center font-bold text-sm shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                {name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-base font-bold text-slate-900 dark:text-white truncate group-hover:text-[#00AAFF] dark:group-hover:text-[#B8E7FF] transition-colors">
                  {name}{age ? `, ${age}` : ''}
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {interests.length > 0 ? interests.join(' • ') : 'Click to view profile'}
                </p>
              </div>
            </div>

            {/* Profile Dropdown Menu extending DOWN & RIGHT from user header */}
            <AnimatePresence>
              {showProfileModal && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: -8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.94, y: -6, transition: { duration: 0.1 } }}
                  transition={{
                    type: 'spring',
                    stiffness: 600,
                    damping: 24,
                    mass: 0.5,
                  }}
                  style={{ transformOrigin: 'top left' }}
                  onClick={() => {
                    setShowProfileModal(false);
                    setShowDetailModal(true);
                  }}
                  className="absolute top-full left-0 mt-3 w-72 sm:w-80 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 hover:border-[#00AAFF]/50 rounded-3xl shadow-2xl p-5 z-50 text-slate-900 dark:text-white space-y-3.5 overflow-hidden cursor-pointer group/modal active:scale-[0.99]"
                >
                  {/* User Avatar & Name */}
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-full bg-[#B8E7FF] dark:bg-slate-800 text-[#00AAFF] dark:text-[#B8E7FF] flex items-center justify-center font-extrabold text-xl shrink-0 shadow-md border-2 border-white dark:border-slate-700 overflow-hidden">
                      {resolvedTargetProfile.avatarUrl || resolvedTargetProfile.profilePhoto?.url ? (
                        <img
                          src={resolvedTargetProfile.avatarUrl || resolvedTargetProfile.profilePhoto?.url}
                          alt={name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        name.charAt(0)
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-base font-extrabold font-heading text-slate-900 dark:text-white truncate group-hover/modal:text-[#00AAFF] transition-colors">
                        {name}{age ? `, ${age}` : ''}
                      </h2>
                      <p className="text-[11px] font-semibold text-[#00AAFF] dark:text-[#B8E7FF] tracking-wide uppercase">
                        Soloberty Member
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowProfileModal(false);
                      }}
                      className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                      aria-label="Close profile menu"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Bio Section */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 rounded-2xl space-y-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                      About
                    </span>
                    <p className="text-xs font-medium text-slate-700 dark:text-slate-300 leading-relaxed">
                      {bio || `Exploring new connections and great vibes on Soloberty!`}
                    </p>
                  </div>

                  {/* Interests Section */}
                  {interests.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                        Interests
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {interests.map((interest, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-0.5 bg-[#B8E7FF]/30 dark:bg-slate-800 text-[#0088CC] dark:text-[#B8E7FF] border border-[#00AAFF]/20 dark:border-slate-700 rounded-xl text-[11px] font-bold"
                          >
                            #{interest}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* View Detailed MatchCard Hint */}
                  <div className="pt-1 text-center border-t border-slate-100 dark:border-slate-800">
                    <span className="text-[11px] font-bold text-[#00AAFF] dark:text-[#B8E7FF] group-hover/modal:underline flex items-center justify-center gap-1">
                      <span>Tap to view full MatchCard</span>
                      <span>✨</span>
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Clear Chat Button */}
        <button
          type="button"
          onClick={() => setShowIndividualClearModal(true)}
          className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-300 text-xs font-bold rounded-xl border border-rose-200 dark:border-rose-800 transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Clear Chat</span>
        </button>
      </header>

      {/* Confirmation Modal for Individual Clear Chat */}
      <AnimatePresence>
        {showIndividualClearModal && (
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-in fade-in duration-200"
            onClick={() => setShowIndividualClearModal(false)}
          >
            <div
              className="relative w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 text-slate-900 dark:text-slate-100 shadow-2xl space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
                <div className="p-2.5 bg-rose-100 dark:bg-rose-950/60 rounded-xl">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold font-heading">Clear Conversation?</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">This action cannot be undone.</p>
                </div>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Are you sure you want to delete your entire chat history with <span className="font-bold text-slate-900 dark:text-white">{name}</span>?
              </p>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowIndividualClearModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleClearIndividualChat}
                  className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md transition-colors cursor-pointer"
                >
                  Clear Chat
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* 1. Top: Message Thread (Scrollable) */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Initial Skeleton UI when generate=true is present and chat messages are empty */}
        {shouldGenerateParam === 'true' && (chat.messages || []).length === 0 && isLoading && (
          <div className="w-full max-w-[90%] my-2 p-4 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-3 animate-pulse">
            <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-2/3" />
            <div className="space-y-2 pt-1">
              <div className="h-11 bg-slate-100 dark:bg-slate-800/60 rounded-xl w-full" />
              <div className="h-11 bg-slate-100 dark:bg-slate-800/60 rounded-xl w-full" />
              <div className="h-11 bg-slate-100 dark:bg-slate-800/60 rounded-xl w-full" />
            </div>
          </div>
        )}

        {/* Empty State when no messages exist and not auto-generating */}
        {rawMessages.length === 0 && !isLoading && shouldGenerateParam !== 'true' && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4 py-12 space-y-4">
            <div className="w-12 h-12 rounded-full bg-[#B8E7FF]/40 dark:bg-slate-800 text-[#00AAFF] dark:text-[#B8E7FF] flex items-center justify-center font-bold text-lg">
              {name.charAt(0)}
            </div>
            <div className="space-y-1 max-w-xs">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Start the conversation with {name}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Say something, or go back to discover more people.
              </p>
            </div>
          </div>
        )}

        {rawMessages.map((message: any, messageIdx: number) => {
          const textContent = getMessageText(message);
          const toolInvocations = getToolInvocations(message);

          const isPromptMessage =
            textContent.startsWith('Suggest icebreaker questions for') ||
            (message.role === 'user' && textContent.includes('Suggest icebreaker questions'));

          // Check if user has sent any real chat messages yet (excluding initial prompt)
          const hasUserSentMessage = rawMessages.some(
            (m: any) =>
              m.role === 'user' &&
              getMessageText(m) &&
              !getMessageText(m).startsWith('Suggest icebreaker questions for')
          );

          // Determine if message was sent by the current user or by the other user (match)
          const currentUid = auth.currentUser?.uid;
          const isOtherUser = message.senderUid
            ? message.senderUid !== currentUid
            : (message.role === 'assistant' || message.role === 'other');
          const isOwnMessage = !isOtherUser;

          // If prompt message, do NOT render text bubble, but DO render toolInvocations!
          return (
            <div
              key={message.id || messageIdx}
              className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'}`}
            >
              {/* Message text bubble (never render prompt text) */}
              {textContent && !isPromptMessage ? (
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-sm ${isOwnMessage
                    ? 'bg-white dark:bg-[#0F172A] text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-br-none'
                    : 'bg-[#00AAFF] dark:bg-[#B8E7FF] text-white dark:text-slate-900 rounded-bl-none'
                    }`}
                >
                  {textContent}
                </div>
              ) : null}

              {/* Tool Invocations: Render State 2 -> State 3 (and hide once user sends a message) */}
              {!hasUserSentMessage &&
                toolInvocations.map((invocation: any, idx: number) => (
                  <div key={invocation.toolCallId || idx} className="w-full max-w-[90%]">
                    <ToolInvocationBlock
                      toolInvocation={invocation}
                      name={name}
                      interests={interests}
                      setInput={setInput}
                      reload={reloadFn}
                    />
                  </div>
                ))}
            </div>
          );
        })}

        {/* Page-level error card for top-level stream POST failures */}
        {chatError && !hasToolResults && !isLoading && shouldGenerateParam === 'true' && (
          <div className="w-full max-w-[90%] my-2 p-3.5 bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/40 rounded-2xl flex items-center justify-between text-xs text-amber-900 dark:text-amber-200 shadow-sm">
            <div className="flex items-center gap-2">
              <RefreshCw className={`w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 ${isPageRetrying ? 'animate-spin' : ''}`} />
              <span>Couldn't generate suggestions right now.</span>
            </div>
            <button
              type="button"
              disabled={isPageRetrying}
              onClick={handlePageRetry}
              className="flex items-center gap-1 px-2.5 py-1 bg-amber-100 dark:bg-amber-900/50 hover:bg-amber-200 dark:hover:bg-amber-800/60 disabled:opacity-50 disabled:cursor-not-allowed text-amber-900 dark:text-amber-100 rounded-lg font-bold transition-colors cursor-pointer shrink-0 ml-2"
            >
              <RefreshCw className={`w-3 h-3 ${isPageRetrying ? 'animate-spin' : ''}`} />
              {isPageRetrying ? 'Retrying...' : 'Retry'}
            </button>
          </div>
        )}

        {/* State 1: Render single thinking indicator ONLY when single-use token is valid and unconsumed, no error, and no user message sent */}
        {isSingleUseValid && !chatError && !hasToolResults && !rawMessages.some((m) => m.role === 'user' && !getMessageText(m).startsWith('Suggest icebreaker questions')) && (
          <div className="flex flex-col items-start w-full max-w-[90%]">
            <ToolInvocationBlock
              toolInvocation={{ state: 'partial-call' }}
              name={name}
              interests={interests}
              setInput={setInput}
              reload={reloadFn}
            />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 2. Bottom: Fixed Message Input Bar */}
      <div className="p-4 bg-white dark:bg-[#0F172A] border-t border-slate-200 dark:border-slate-800 shrink-0">
        <div className="flex items-center gap-2 max-w-4xl mx-auto">
          <input
            type="text"
            value={input}
            onChange={handleInputChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleCustomSubmit();
              }
            }}
            placeholder={`Message ${name}...`}
            className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00AAFF]"
          />
          <button
            type="button"
            onClick={handleCustomSubmit}
            disabled={!input?.trim()}
            className="p-3 bg-[#00AAFF] hover:bg-[#0088CC] text-white rounded-xl shadow-md shadow-[#00AAFF]/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Detailed MatchCard Modal */}
      <UserDetailModal
        user={showDetailModal ? resolvedTargetProfile : null}
        onClose={() => setShowDetailModal(false)}
      />
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[calc(100vh-60px)] items-center justify-center bg-slate-50 dark:bg-[#090D16]">
          <div className="w-8 h-8 border-4 border-[#00AAFF] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <ChatContent />
    </Suspense>
  );
}
