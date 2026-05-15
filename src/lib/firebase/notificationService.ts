import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  limit,
  writeBatch,
  getDocs,
  where,
  Timestamp,
  onSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import type { AppNotification, NotificationType } from '@/types';

const notificationsCol = (firebaseId: string) =>
  collection(db, 'users', firebaseId, 'notifications');

// ─── Tiempo real ────────────────────────────────────────────────────────────

export function subscribeToNotifications(
  firebaseId: string,
  callback: (notifications: AppNotification[]) => void
): Unsubscribe {
  const q = query(notificationsCol(firebaseId), orderBy('createdAt', 'desc'), limit(50));

  return onSnapshot(q, (snapshot) => {
    const notifications: AppNotification[] = snapshot.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<AppNotification, 'id'>),
    }));
    callback(notifications);
  });
}

// ─── Escritura ───────────────────────────────────────────────────────────────

export async function createNotification(
  firebaseId: string,
  data: {
    type: NotificationType;
    title: string;
    message: string;
    data?: Record<string, unknown>;
  }
): Promise<string> {
  const ref = await addDoc(notificationsCol(firebaseId), {
    ...data,
    read: false,
    createdAt: Timestamp.now(),
  });
  return ref.id;
}

export async function markAsRead(firebaseId: string, notificationId: string): Promise<void> {
  await updateDoc(doc(db, 'users', firebaseId, 'notifications', notificationId), {
    read: true,
  });
}

export async function markAllAsRead(firebaseId: string): Promise<void> {
  const q = query(notificationsCol(firebaseId), where('read', '==', false));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return;

  const batch = writeBatch(db);
  snapshot.docs.forEach((d) => batch.update(d.ref, { read: true }));
  await batch.commit();
}

export async function deleteNotification(firebaseId: string, notificationId: string): Promise<void> {
  await deleteDoc(doc(db, 'users', firebaseId, 'notifications', notificationId));
}

export async function deleteAllNotifications(firebaseId: string): Promise<void> {
  const snapshot = await getDocs(notificationsCol(firebaseId));
  if (snapshot.empty) return;

  const batch = writeBatch(db);
  snapshot.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
}
