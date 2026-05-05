import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  doc, 
  query, 
  where,
  serverTimestamp,
  getDoc,
  arrayUnion
} from 'firebase/firestore';
import { db } from './firebase';

export interface Course {
  id?: string;
  code: string;
  title: string;
  lecturerId: string;
  joinCode: string;
  createdAt: any;
}

export const createCourse = async (courseData: Omit<Course, 'id' | 'createdAt'>) => {
  const docRef = await addDoc(collection(db, 'courses'), {
    ...courseData,
    createdAt: serverTimestamp()
  });
  return docRef.id;
};

export const getLecturerCourses = async (lecturerId: string) => {
  const q = query(collection(db, 'courses'), where('lecturerId', '==', lecturerId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Course[];
};

export const joinCourse = async (email: string, joinCode: string): Promise<{ success: boolean; message: string }> => {
  // Find the course by join code
  const q = query(collection(db, 'courses'), where('joinCode', '==', joinCode));
  const querySnapshot = await getDocs(q);
  
  if (querySnapshot.empty) {
    return { success: false, message: 'Invalid course join code.' };
  }

  const courseDoc = querySnapshot.docs[0];
  const courseId = courseDoc.id;

  // Find the student record by email
  const studentQuery = query(collection(db, 'students'), where('email', '==', email));
  const studentSnapshot = await getDocs(studentQuery);

  if (studentSnapshot.empty) {
    return { success: false, message: 'Student profile not found. Please complete your Biodata first.' };
  }

  const studentDoc = studentSnapshot.docs[0];
  
  // Update student courses array
  await updateDoc(doc(db, 'students', studentDoc.id), {
    courses: arrayUnion(courseId)
  });

  return { success: true, message: `Successfully registered for ${courseDoc.data().code}` };
};

export const getStudentCourses = async (email: string) => {
  const studentQuery = query(collection(db, 'students'), where('email', '==', email));
  const studentSnapshot = await getDocs(studentQuery);

  if (studentSnapshot.empty) return [];

  const studentData = studentSnapshot.docs[0].data();
  const courseIds = studentData.courses || [];

  if (courseIds.length === 0) return [];

  // Fetch course details
  const courses: Course[] = [];
  for (const id of courseIds) {
    const courseRef = doc(db, 'courses', id);
    const courseSnap = await getDoc(courseRef);
    if (courseSnap.exists()) {
      courses.push({ id: courseSnap.id, ...courseSnap.data() } as Course);
    }
  }

  return courses;
};
