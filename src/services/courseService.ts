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
  arrayUnion,
  deleteDoc,
  orderBy
} from 'firebase/firestore';
import { db } from './firebase';

export interface Course {
  id?: string;
  code: string;
  title: string;
  departmentId: string;
  levelId: string;
  createdAt: any;
}

export interface Department {
  id?: string;
  name: string;
  code: string;
  createdAt: any;
}

export interface Level {
  id?: string;
  name: string;
  createdAt: any;
}

// --- Admin Departments API ---
export const getDepartments = async (): Promise<Department[]> => {
  const q = query(collection(db, 'departments'), orderBy('name', 'asc'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Department[];
};

export const addDepartment = async (name: string, code: string): Promise<string> => {
  const docRef = await addDoc(collection(db, 'departments'), {
    name,
    code,
    createdAt: serverTimestamp()
  });
  return docRef.id;
};

export const deleteDepartment = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, 'departments', id));
};

// --- Admin Levels API ---
export const getLevels = async (): Promise<Level[]> => {
  const q = query(collection(db, 'levels'), orderBy('name', 'asc'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Level[];
};

export const addLevel = async (name: string): Promise<string> => {
  const docRef = await addDoc(collection(db, 'levels'), {
    name,
    createdAt: serverTimestamp()
  });
  return docRef.id;
};

export const deleteLevel = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, 'levels', id));
};

// --- Admin / Global Courses API ---
export const getAllCoursesAdmin = async (): Promise<Course[]> => {
  const q = query(collection(db, 'courses'), orderBy('code', 'asc'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Course[];
};

export const createCourseAdmin = async (courseData: Omit<Course, 'id' | 'createdAt'>): Promise<string> => {
  const docRef = await addDoc(collection(db, 'courses'), {
    ...courseData,
    createdAt: serverTimestamp()
  });
  return docRef.id;
};

export const deleteCourse = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, 'courses', id));
};

export const getCoursesByDeptAndLevel = async (departmentId: string, levelId: string): Promise<Course[]> => {
  const q = query(
    collection(db, 'courses'),
    where('departmentId', '==', departmentId),
    where('levelId', '==', levelId)
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Course[];
};

export const getCoursesByDept = async (departmentId: string): Promise<Course[]> => {
  const q = query(
    collection(db, 'courses'),
    where('departmentId', '==', departmentId)
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Course[];
};

// --- Lecturer Course Teaching Association ---
export const getLecturerCourses = async (lecturerId: string): Promise<Course[]> => {
  const userRef = doc(db, 'users', lecturerId);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) return [];

  const userData = userSnap.data();
  const courseIds = userData.courses || [];
  if (courseIds.length === 0) return [];

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

export const updateLecturerCourses = async (uid: string, courseIds: string[], departmentId?: string) => {
  const userRef = doc(db, 'users', uid);
  const updateData: any = { courses: courseIds };
  if (departmentId) {
    updateData.departmentId = departmentId;
  }
  await updateDoc(userRef, updateData);
};

// --- Student Course Registration API ---
export const updateStudentCourses = async (email: string, courseIds: string[]): Promise<{ success: boolean; message: string }> => {
  const studentQuery = query(collection(db, 'students'), where('email', '==', email));
  const studentSnapshot = await getDocs(studentQuery);

  if (studentSnapshot.empty) {
    return { success: false, message: 'Student profile not found. Please complete your Biodata first.' };
  }

  const studentDoc = studentSnapshot.docs[0];
  await updateDoc(doc(db, 'students', studentDoc.id), {
    courses: courseIds
  });

  return { success: true, message: 'Courses registered successfully!' };
};

export const joinCourse = async (email: string, joinCode: string): Promise<{ success: boolean; message: string }> => {
  // Legacy / backup functionality
  const q = query(collection(db, 'courses'), where('joinCode', '==', joinCode));
  const querySnapshot = await getDocs(q);
  
  if (querySnapshot.empty) {
    return { success: false, message: 'Invalid course join code.' };
  }

  const courseDoc = querySnapshot.docs[0];
  const courseId = courseDoc.id;

  const studentQuery = query(collection(db, 'students'), where('email', '==', email));
  const studentSnapshot = await getDocs(studentQuery);

  if (studentSnapshot.empty) {
    return { success: false, message: 'Student profile not found. Please complete your Biodata first.' };
  }

  const studentDoc = studentSnapshot.docs[0];
  
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
