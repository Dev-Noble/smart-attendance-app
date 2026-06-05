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
  phone?: string;
  address?: string;
  courses?: string[]; // Array of course IDs the student is enrolled in
  registeredFingerprint?: string; // Stored hardware fingerprint for attendance
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

export const getStudentsByCourse = async (courseId: string): Promise<Student[]> => {
  const q = query(collection(db, 'students'), where('courses', 'array-contains', courseId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(d => ({
    id: d.id,
    ...d.data()
  })) as Student[];
};

export const syncStudentBiodata = async (
  email: string,
  name: string,
  studentId: string,
  departmentId: string,
  levelId: string,
  phone?: string,
  address?: string,
  registeredFingerprint?: string
) => {
  const q = query(collection(db, 'students'), where('email', '==', email));
  const querySnapshot = await getDocs(q);
  
  if (!querySnapshot.empty) {
    const studentDoc = querySnapshot.docs[0];
    const updatePayload: any = {
      name,
      studentId,
      departmentId,
      levelId,
      lastSeen: serverTimestamp()
    };
    if (phone) updatePayload.phone = phone;
    if (address) updatePayload.address = address;
    if (registeredFingerprint) {
      updatePayload.registeredFingerprint = registeredFingerprint;
    }
    await updateDoc(doc(db, 'students', studentDoc.id), updatePayload);
  } else {
    const newStudent: any = {
      name,
      email,
      studentId,
      departmentId,
      levelId,
      attendance: 0,
      status: 'active',
      courses: [],
      lastSeen: serverTimestamp()
    };
    if (phone) newStudent.phone = phone;
    if (address) newStudent.address = address;
    if (registeredFingerprint) {
      newStudent.registeredFingerprint = registeredFingerprint;
    }
    await addDoc(collection(db, 'students'), newStudent);
  }
};
