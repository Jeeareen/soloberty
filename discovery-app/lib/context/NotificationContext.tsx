'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, X } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import {
  isNotificationSupported,
  requestNotificationPermission,
  triggerSystemNotification,
  registerFcmToken,
  ensureMessagingServiceWorker,
} from '../notifications';
import { useAuth } from '../hooks/useAuth';

export interface InAppNotification {
  id: string;
  senderName: string;
  senderUid: string;
  messageText: string;
  avatarUrl?: string;
  url?: string;
}

interface NotificationContextType {
  notificationsEnabled: boolean;
  toggleNotifications: () => Promise<void>;
  notifyNewMessage: (notification: InAppNotification) => void;
}

const NotificationContext = createContext<NotificationContextType>({
  notificationsEnabled: true,
  toggleNotifications: async () => { },
  notifyNewMessage: () => { },
});

export const useNotification = () => useContext(NotificationContext);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(true);
  const [activeBanner, setActiveBanner] = useState<InAppNotification | null>(null);
  const isDraggingRef = useRef<boolean>(false);

  // Initialize preference from localStorage & register service worker if already granted
  useEffect(() => {
    try {
      const stored = localStorage.getItem('soloberty_notifications_enabled');
      const isEnabled = stored !== null ? stored === 'true' : true;
      setNotificationsEnabled(isEnabled);

      if (isEnabled && isNotificationSupported() && Notification.permission === 'granted' && 'serviceWorker' in navigator) {
        if (user?.uid) {
          registerFcmToken(user.uid).catch(() => { });
        } else {
          ensureMessagingServiceWorker().catch(() => { });
        }
      }
    } catch (e) {
      console.warn('[NotificationProvider init error]:', e);
    }
  }, [user?.uid]);

  const toggleNotifications = useCallback(async () => {
    if (!notificationsEnabled) {
      const granted = await requestNotificationPermission();
      setNotificationsEnabled(true);
      localStorage.setItem('soloberty_notifications_enabled', 'true');
      if (granted && user?.uid) {
        registerFcmToken(user.uid).catch(() => { });
      }
    } else {
      setNotificationsEnabled(false);
      localStorage.setItem('soloberty_notifications_enabled', 'false');
    }
  }, [notificationsEnabled, user?.uid]);

  const notifyNewMessage = useCallback(
    (notif: InAppNotification) => {
      if (!notificationsEnabled) return;

      // 1. If document is hidden/backgrounded, send OS/browser system notification
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
        triggerSystemNotification(`New message from ${notif.senderName}`, {
          body: notif.messageText,
          icon: notif.avatarUrl || '/Soloberty.svg',
          url: notif.url || `/chat?name=${encodeURIComponent(notif.senderName)}&uid=${notif.senderUid}`,
        });
        return;
      }

      // 2. If app is active and user is NOT inside this specific chat right now, show in-app banner
      const isCurrentlyInThisChat = pathname === '/chat' && window.location.search.includes(notif.senderUid);
      if (!isCurrentlyInThisChat) {
        setActiveBanner(notif);
      }
    },
    [notificationsEnabled, pathname]
  );

  // Auto-dismiss in-app banner after 5.5 seconds
  useEffect(() => {
    if (!activeBanner) return;
    const timer = setTimeout(() => {
      setActiveBanner(null);
    }, 5500);
    return () => clearTimeout(timer);
  }, [activeBanner]);

  return (
    <NotificationContext.Provider
      value={{
        notificationsEnabled,
        toggleNotifications,
        notifyNewMessage,
      }}
    >
      {children}

      {/* Floating In-App Banner Notification */}
      <AnimatePresence>
        {activeBanner && (
          <motion.div
            key={activeBanner.id}
            initial={{ opacity: 0, scale: 0.9, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: -6, transition: { duration: 0.1 } }}
            transition={{
              type: 'spring',
              stiffness: 600,
              damping: 24,
              mass: 0.5,
            }}
            style={{ transformOrigin: 'top right' }}
            drag="x"
            dragDirectionLock
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.8}
            dragSnapToOrigin
            dragTransition={{
              bounceStiffness: 600,
              bounceDamping: 24,
            }}
            whileDrag={{
              scale: 0.98,
              cursor: 'grabbing',
            }}
            onDragStart={() => {
              isDraggingRef.current = true;
            }}
            onDragEnd={(_, info) => {
              const offsetX = info.offset.x;
              const velocityX = info.velocity.x;
              // Sliding left or right discards the banner
              if (Math.abs(offsetX) > 60 || Math.abs(velocityX) > 400) {
                setActiveBanner(null);
              }
              setTimeout(() => {
                isDraggingRef.current = false;
              }, 150);
            }}
            className="fixed top-18 right-4 left-4 sm:left-auto sm:w-96 z-[9999] p-3.5 bg-white/95 dark:bg-[#0F172A]/95 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex items-center gap-3 cursor-grab group touch-pan-y select-none"
            onClick={() => {
              if (isDraggingRef.current) return;
              const target = activeBanner.url || `/chat?name=${encodeURIComponent(activeBanner.senderName)}&uid=${activeBanner.senderUid}`;
              setActiveBanner(null);
              router.push(target);
            }}
          >
            {/* Avatar or Icon */}
            <div className="w-10 h-10 rounded-full bg-[#00AAFF] dark:bg-[#B8E7FF] text-white dark:text-slate-900 flex items-center justify-center font-bold text-sm shrink-0 shadow-md overflow-hidden">
              {activeBanner.avatarUrl ? (
                <img src={activeBanner.avatarUrl} alt={activeBanner.senderName} className="w-full h-full object-cover" />
              ) : (
                activeBanner.senderName.charAt(0) || <MessageSquare className="w-5 h-5" />
              )}
            </div>

            {/* Message Details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {activeBanner.senderName}
                </span>
                <span className="text-[10px] text-[#00AAFF] dark:text-[#B8E7FF] font-semibold">Just now</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 truncate">
                {activeBanner.messageText}
              </p>
            </div>

            {/* Close button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActiveBanner(null);
              }}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </NotificationContext.Provider>
  );
};
