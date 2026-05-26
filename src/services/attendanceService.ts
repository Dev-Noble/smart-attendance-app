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
  courseId: string;               // Global course document ID
  courseCode: string;             // Course code (e.g. CSC301)
  courseName: string;             // Course title
  startTime: any;
  endTime?: any;
  isActive: boolean;
  studentsPresent: string[];      // List of student IDs
  deviceFingerprints: string[];   // One fingerprint per device — blocks impersonation
  lecturerLocation?: {            // GPS captured when session starts
    lat: number;
    lng: number;
  };
  allowedRadius: number;          // Metres student must be within (default 100)
}

export const createAttendanceSession = async (
  lecturerId: string,
  courseId: string,
  courseCode: string,
  courseName: string,
  lecturerLocation?: { lat: number; lng: number },
  allowedRadius: number = 100
) => {
  const sessionData: AttendanceSession = {
    lecturerId,
    courseId,
    courseCode,
    courseName,
    startTime: serverTimestamp(),
    isActive: true,
    studentsPresent: [],
    deviceFingerprints: [],
    lecturerLocation,
    allowedRadius
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
