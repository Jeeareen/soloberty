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
    if (serviceAccountKey) {
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

        if (fcmTokens.length > 0) {
          await admin.messaging().sendEachForMulticast({
            tokens: fcmTokens,
            notification: {
              title: senderName ? `New message from ${senderName}` : 'New message on Soloberty',
              body: messageText,
            },
            data: {
              url: `/chat?uid=${receiverUid}`,
              conversationId: conversationId || '',
            },
          });
        }
      } catch (adminErr) {
        console.warn('[FCM Admin Push Warning]:', adminErr);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[Push Notification API Error]:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
