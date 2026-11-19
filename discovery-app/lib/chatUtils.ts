import { collection, getDocs, deleteDoc, serverTimestamp, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from './firebase/config';

// Convert a Firestore Timestamp / Date / {seconds} into epoch millis (0 if missing)
export function tsToMillis(t: any): number {
  if (!t) return 0;
  if (typeof t.toMillis === 'function') return t.toMillis();
  if (typeof t.seconds === 'number') return t.seconds * 1000;
  if (t instanceof Date) return t.getTime();
  return 0;
}

// Clear a conversation for ONE user. Messages stay in the database (hidden for this
// user via clearedAt[uid]) until every participant has cleared it; then it is deleted.
export async function clearConversationForUser(conversationId: string, myUid: string): Promise<'hidden' | 'deleted'> {
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
