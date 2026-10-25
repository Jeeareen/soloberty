'use client';

// Helper to check if browser notifications are supported
export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

// Check current notification permission ('default' | 'granted' | 'denied')
export function getNotificationPermission(): NotificationPermission {
  if (!isNotificationSupported()) return 'denied';
  return Notification.permission;
}

// Request permission and register service worker
export async function requestNotificationPermission(): Promise<boolean> {
  if (!isNotificationSupported()) return false;

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      if ('serviceWorker' in navigator) {
        try {
          await navigator.serviceWorker.register('/sw.js');
        } catch (swErr) {
          console.warn('[ServiceWorker registration warning]:', swErr);
        }
      }
      return true;
    }
    return false;
  } catch (err) {
    console.error('[Notification permission request failed]:', err);
    return false;
  }
}

// Obtain FCM Device Token and register to current user profile in Firestore
export async function registerFcmToken(uid?: string): Promise<string | null> {
  if (!uid || uid === 'guest' || !isNotificationSupported() || Notification.permission !== 'granted') {
    return null;
  }

  try {
    const { getFirebaseMessaging, db } = await import('./firebase/config');
    const messaging = await getFirebaseMessaging();
    if (!messaging) return null;

    const { getToken } = await import('firebase/messaging');
    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

    let registration: ServiceWorkerRegistration | undefined;
    if ('serviceWorker' in navigator) {
      registration = await navigator.serviceWorker.ready;
    }

    const token = await getToken(messaging, {
      vapidKey: vapidKey || undefined,
      serviceWorkerRegistration: registration,
    });

    if (token) {
      const { doc, setDoc, arrayUnion } = await import('firebase/firestore');
      const userRef = doc(db, 'users', uid);
      await setDoc(
        userRef,
        {
          fcmTokens: arrayUnion(token),
        },
        { merge: true }
      );
      return token;
    }
    return null;
  } catch (err) {
    console.warn('[FCM Token Registration Warning]:', err);
    return null;
  }
}

// Trigger a system notification (via ServiceWorker showNotification if available, or fallback to new Notification)
export async function triggerSystemNotification(title: string, options?: NotificationOptions & { url?: string }) {
  if (!isNotificationSupported() || Notification.permission !== 'granted') return;

  const url = options?.url || '/chat';
  const icon = options?.icon || '/Soloberty.svg';

  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      if (registration && registration.showNotification) {
        await registration.showNotification(title, {
          body: options?.body || '',
          icon,
          badge: '/Soloberty.svg',
          data: { url },
          ...options,
        });
        return;
      }
    }

    // Direct fallback
    const n = new Notification(title, {
      body: options?.body || '',
      icon,
      ...options,
    });
    n.onclick = () => {
      window.focus();
      window.location.href = url;
    };
  } catch (e) {
    console.warn('[triggerSystemNotification warning]:', e);
  }
}
