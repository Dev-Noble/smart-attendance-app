import { db } from './firebase';
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  doc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';

export interface Notification {
  id?: string;
  userId: string;
  title: string;
  message: string;
  type: 'session' | 'attendance' | 'system' | 'approval';
  read: boolean;
  createdAt: any;
}

/**
 * Create a notification for a specific user.
 */
export const addNotification = async (
  userId: string,
  title: string,
  message: string,
  type: Notification['type'] = 'system'
): Promise<string> => {
  const docRef = await addDoc(collection(db, 'notifications'), {
    userId,
    title,
    message,
    type,
    read: false,
    createdAt: serverTimestamp()
  });
  return docRef.id;
};

/**
 * Create notifications for multiple users at once (e.g., all enrolled students).
 */
export const addBulkNotifications = async (
  userIds: string[],
  title: string,
  message: string,
  type: Notification['type'] = 'session'
): Promise<void> => {
  // Firestore batches are limited to 500 writes
  const batchSize = 450;
  for (let i = 0; i < userIds.length; i += batchSize) {
    const batch = writeBatch(db);
    const chunk = userIds.slice(i, i + batchSize);
    for (const uid of chunk) {
      const ref = doc(collection(db, 'notifications'));
      batch.set(ref, {
        userId: uid,
        title,
        message,
        type,
        read: false,
        createdAt: serverTimestamp()
      });
    }
    await batch.commit();
  }
};

/**
 * Get notifications for a user, newest first.
 */
export const getUserNotifications = async (
  userId: string,
  maxCount: number = 20
): Promise<Notification[]> => {
  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(maxCount)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() })) as Notification[];
};

/**
 * Subscribe to real-time notification updates for a user.
 */
export const subscribeToNotifications = (
  userId: string,
  callback: (notifications: Notification[]) => void,
  maxCount: number = 20
): (() => void) => {
  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(maxCount)
  );
  return onSnapshot(q, (snap) => {
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Notification[];
    callback(data);
  });
};

/**
 * Mark a single notification as read.
 */
export const markNotificationRead = async (notifId: string): Promise<void> => {
  await updateDoc(doc(db, 'notifications', notifId), { read: true });
};

/**
 * Mark all notifications as read for a user.
 */
export const markAllNotificationsRead = async (userId: string): Promise<void> => {
  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', userId),
    where('read', '==', false)
  );
  const snap = await getDocs(q);
  const batch = writeBatch(db);
  snap.docs.forEach(d => {
    batch.update(d.ref, { read: true });
  });
  await batch.commit();
};

/**
 * Create notifications for multiple users by their emails.
 */
export const addBulkNotificationsByEmails = async (
  emails: string[],
  title: string,
  message: string,
  type: Notification['type'] = 'session'
): Promise<void> => {
  if (emails.length === 0) return;

  // Find UIDs for these emails
  // Since Firestore 'in' query supports up to 30 elements, we chunk the emails by 30
  const chunkedEmails: string[][] = [];
  const chunkSize = 30;
  for (let i = 0; i < emails.length; i += chunkSize) {
    chunkedEmails.push(emails.slice(i, i + chunkSize));
  }

  const uids: string[] = [];
  for (const chunk of chunkedEmails) {
    const q = query(collection(db, 'users'), where('email', 'in', chunk));
    const snap = await getDocs(q);
    snap.docs.forEach(d => {
      uids.push(d.id); // doc.id is the user's auth UID
    });
  }

  if (uids.length > 0) {
    await addBulkNotifications(uids, title, message, type);
  }
};

