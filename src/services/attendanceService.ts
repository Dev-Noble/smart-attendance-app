import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  onSnapshot, 
  query,
  getDocs,
  orderBy,
  serverTimestamp,
  arrayUnion
} from 'firebase/firestore';
import { db } from './firebase';

export interface AttendanceSession {
  id?: string;
  lecturerId: string;
  courseId: string;
  startTime: any;
  endTime?: any;
  isActive: boolean;
  studentsPresent: string[]; // List of student IDs
}

export const createAttendanceSession = async (lecturerId: string, courseId: string) => {
  const sessionData: AttendanceSession = {
    lecturerId,
    courseId,
    startTime: serverTimestamp(),
    isActive: true,
    studentsPresent: []
  };

  const docRef = await addDoc(collection(db, 'sessions'), sessionData);
  return docRef.id;
};

export const endAttendanceSession = async (sessionId: string) => {
  const sessionRef = doc(db, 'sessions', sessionId);
  await updateDoc(sessionRef, {
    isActive: false,
    endTime: serverTimestamp()
  });
};

export const markStudentPresent = async (sessionId: string, studentId: string) => {
  const sessionRef = doc(db, 'sessions', sessionId);
  await updateDoc(sessionRef, {
    studentsPresent: arrayUnion(studentId)
  });
};

export const subscribeToSession = (sessionId: string, callback: (session: any) => void) => {
  const sessionRef = doc(db, 'sessions', sessionId);
  return onSnapshot(sessionRef, (snapshot) => {
    if (snapshot.exists()) {
      callback({ id: snapshot.id, ...snapshot.data() });
    }
  });
};

export const getAllSessions = async () => {
  const q = query(collection(db, 'sessions'), orderBy('startTime', 'desc'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as AttendanceSession[];
};
