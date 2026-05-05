import { db } from './firebase';
import { collection, addDoc, serverTimestamp, query, orderBy, limit, getDocs } from 'firebase/firestore';

export interface ActivityLog {
  id?: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  type: 'attendance' | 'student' | 'system' | 'auth';
  timestamp: any;
}

export const logActivity = async (
  userId: string, 
  userName: string, 
  action: string, 
  details: string, 
  type: ActivityLog['type']
) => {
  try {
    await addDoc(collection(db, 'activities'), {
      userId,
      userName,
      action,
      details,
      type,
      timestamp: serverTimestamp()
    });
  } catch (error) {
    console.error("Failed to log activity:", error);
  }
};

export const getRecentActivities = async (maxCount: number = 10): Promise<ActivityLog[]> => {
  try {
    const q = query(
      collection(db, 'activities'), 
      orderBy('timestamp', 'desc'), 
      limit(maxCount)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ActivityLog[];
  } catch (error) {
    console.error("Error fetching activities:", error);
    return [];
  }
};
