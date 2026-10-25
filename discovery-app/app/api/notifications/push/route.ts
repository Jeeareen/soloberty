import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { receiverUid, senderName, messageText, conversationId } = body;

    if (!receiverUid || !messageText) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // In local development or client environments without server service account credentials,
    // this route accepts the payload gracefully and prepares for Firebase Admin FCM push.
    // If FIREBASE_SERVICE_ACCOUNT_KEY is configured in env:
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!serviceAccountKey) {
      console.warn('[FCM Push]: FIREBASE_SERVICE_ACCOUNT_KEY is missing from environment variables.');
    } else {
      try {
        const admin = await import('firebase-admin');
        if (!admin.apps.length) {
          const serviceAccount = JSON.parse(serviceAccountKey);
          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
          });
        }

        // Fetch receiver's FCM tokens from Firestore
        const db = admin.firestore();
        const userDoc = await db.collection('users').doc(receiverUid).get();
        const fcmTokens: string[] = userDoc.data()?.fcmTokens || [];

        console.log(`[FCM Push]: Found ${fcmTokens.length} token(s) for user ${receiverUid}`);

        if (fcmTokens.length > 0) {
          const title = senderName ? `New message from ${senderName}` : 'New message on Soloberty';
          const targetUrl = `/chat?uid=${receiverUid}`;

          const response = await admin.messaging().sendEachForMulticast({
            tokens: fcmTokens,
            notification: {
              title,
              body: messageText,
            },
            data: {
              title,
              body: messageText,
              url: targetUrl,
              conversationId: conversationId || '',
            },
            webpush: {
              notification: {
                title,
                body: messageText,
                icon: '/Soloberty.svg',
                badge: '/Soloberty.svg',
              },
              fcmOptions: {
                link: targetUrl,
              },
            },
          });

          console.log(`[FCM Push Success]: Sent: ${response.successCount}, Failed: ${response.failureCount}`);
          if (response.failureCount > 0) {
            response.responses.forEach((resp, idx) => {
              if (!resp.success) {
                console.error(`[FCM Push Failed token ${idx}]:`, resp.error);
              }
            });
          }
        }
      } catch (adminErr) {
        console.error('[FCM Admin Push Error]:', adminErr);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[Push Notification API Error]:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
