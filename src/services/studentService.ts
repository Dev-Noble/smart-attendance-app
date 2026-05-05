import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  doc, 
  query, 
  orderBy,
  deleteDoc,
  serverTimestamp,
  where
} from 'firebase/firestore';
import { db } from './firebase';

export interface Student {
  id?: string;
  studentId: string; // The university ID (e.g., STU001)
  name: string;
  email: string;
  attendance: number;
  status: 'active' | 'at-risk' | 'inactive';
  lastSeen: any;
  avatar?: string;
  courses?: string[]; // Array of course IDs the student is enrolled in
}

export const getStudents = async () => {
  const q = query(collection(db, 'students'), orderBy('name', 'asc'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Student[];
};

export const addStudent = async (studentData: Omit<Student, 'id' | 'lastSeen'>) => {
  const docRef = await addDoc(collection(db, 'students'), {
    ...studentData,
    lastSeen: serverTimestamp()
  });
  return docRef.id;
};

export const updateStudentStatus = async (id: string, status: Student['status']) => {
  const studentRef = doc(db, 'students', id);
  await updateDoc(studentRef, { status });
};

export const deleteStudent = async (id: string) => {
  const studentRef = doc(db, 'students', id);
  await deleteDoc(studentRef);
};
export const getStudentByStudentId = async (studentId: string) => {
  const q = query(collection(db, 'students'), where('studentId', '==', studentId));
  const querySnapshot = await getDocs(q);
  if (querySnapshot.empty) return null;
  const doc = querySnapshot.docs[0];
  return { id: doc.id, ...doc.data() } as Student;
};

export const syncStudentBiodata = async (email: string, name: string, studentId: string) => {
  // Check if student exists
  const q = query(collection(db, 'students'), where('email', '==', email));
  const querySnapshot = await getDocs(q);
  
  if (!querySnapshot.empty) {
    // Update existing
    const studentDoc = querySnapshot.docs[0];
    await updateDoc(doc(db, 'students', studentDoc.id), {
      name,
      studentId,
      lastSeen: serverTimestamp()
    });
  } else {
    // Create new
    await addDoc(collection(db, 'students'), {
      name,
      email,
      studentId,
      attendance: 0,
      status: 'active',
      courses: [],
      lastSeen: serverTimestamp()
    });
  }
};
