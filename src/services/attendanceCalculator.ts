import { db } from './firebase';
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  query,
  where
} from 'firebase/firestore';
import type { Student } from './studentService';

/**
 * Recalculate attendance percentage and auto-classify status for all students
 * enrolled in a specific course. Call this when a session ends.
 */
export const recalculateForCourse = async (courseId: string): Promise<void> => {
  try {
    // 1. Get all students enrolled in this course
    const studentQuery = query(
      collection(db, 'students'),
      where('courses', 'array-contains', courseId)
    );
    const studentSnap = await getDocs(studentQuery);
    if (studentSnap.empty) return;

    // 2. Get all sessions for this course
    const sessionQuery = query(
      collection(db, 'sessions'),
      where('courseId', '==', courseId)
    );
    const sessionSnap = await getDocs(sessionQuery);
    const sessions = sessionSnap.docs.map(d => d.data());
    const totalSessions = sessions.length;

    if (totalSessions === 0) return;

    // 3. For each student, count how many sessions they attended
    for (const studentDoc of studentSnap.docs) {
      const student = studentDoc.data() as Student;
      const studentId = student.studentId;

      let sessionsAttended = 0;
      for (const session of sessions) {
        if ((session.studentsPresent || []).includes(studentId)) {
          sessionsAttended++;
        }
      }

      const percentage = Math.round((sessionsAttended / totalSessions) * 100);

      // Auto-classify status
      let status: 'active' | 'at-risk' | 'inactive';
      if (percentage >= 75) {
        status = 'active';
      } else if (percentage >= 50) {
        status = 'at-risk';
      } else {
        status = 'inactive';
      }

      // 4. Update student document
      await updateDoc(doc(db, 'students', studentDoc.id), {
        attendance: percentage,
        status
      });
    }
  } catch (error) {
    console.error('Failed to recalculate attendance for course:', courseId, error);
  }
};

/**
 * Recalculate attendance for a single student across ALL their enrolled courses.
 */
export const recalculateForStudent = async (studentEmail: string): Promise<void> => {
  try {
    const studentQuery = query(
      collection(db, 'students'),
      where('email', '==', studentEmail)
    );
    const studentSnap = await getDocs(studentQuery);
    if (studentSnap.empty) return;

    const studentDoc = studentSnap.docs[0];
    const student = studentDoc.data() as Student;
    const enrolledCourses: string[] = student.courses || [];
    const studentId = student.studentId;

    if (enrolledCourses.length === 0 || !studentId) return;

    let totalSessions = 0;
    let totalAttended = 0;

    for (const courseId of enrolledCourses) {
      const sessionQuery = query(
        collection(db, 'sessions'),
        where('courseId', '==', courseId)
      );
      const sessionSnap = await getDocs(sessionQuery);

      for (const sessDoc of sessionSnap.docs) {
        const session = sessDoc.data();
        totalSessions++;
        if ((session.studentsPresent || []).includes(studentId)) {
          totalAttended++;
        }
      }
    }

    const percentage = totalSessions > 0 ? Math.round((totalAttended / totalSessions) * 100) : 0;

    let status: 'active' | 'at-risk' | 'inactive';
    if (percentage >= 75) {
      status = 'active';
    } else if (percentage >= 50) {
      status = 'at-risk';
    } else {
      status = 'inactive';
    }

    await updateDoc(doc(db, 'students', studentDoc.id), {
      attendance: percentage,
      status
    });
  } catch (error) {
    console.error('Failed to recalculate attendance for student:', studentEmail, error);
  }
};
