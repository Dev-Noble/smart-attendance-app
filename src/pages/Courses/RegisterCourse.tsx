import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  getStudentCourses as _getStudentCourses,
  updateStudentCourses, 
  getCoursesByDeptAndLevel,
  type Course
} from '../../services/courseService';
import { logActivity } from '../../services/activityService';
import { db } from '../../services/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Loader2, Book, Check, Plus, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './Courses.css';

const RegisterCourse: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [registeringId, setRegisteringId] = useState<string | null>(null);
  const [hasProfile, setHasProfile] = useState(false);

  useEffect(() => {
    if (profile?.email) {
      loadCourses();
    }
  }, [profile]);

  const loadCourses = async () => {
    if (!profile) return;
    try {
      // Fetch student document to get department, level and registered courses
      const studentQuery = query(collection(db, 'students'), where('email', '==', profile.email));
      const studentSnapshot = await getDocs(studentQuery);
      
      if (studentSnapshot.empty) {
        setHasProfile(false);
        setLoading(false);
        return;
      }
      
      const studentData = studentSnapshot.docs[0].data();
      const enrolledIds: string[] = studentData.courses || [];
      setEnrolledCourseIds(enrolledIds);
      
      const deptId = studentData.departmentId || '';
      const lvlId = studentData.levelId || '';
      
      if (deptId && lvlId) {
        setHasProfile(true);
        const available = await getCoursesByDeptAndLevel(deptId, lvlId);
        setAvailableCourses(available);
      } else {
        setHasProfile(false);
      }
    } catch (error) {
      console.error("Failed to load courses", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleCourse = async (courseId: string) => {
    if (!profile) return;
    
    const isEnrolled = enrolledCourseIds.includes(courseId);
    const updatedIds = isEnrolled 
      ? enrolledCourseIds.filter(id => id !== courseId)
      : [...enrolledCourseIds, courseId];
      
    setRegisteringId(courseId);
    try {
      const res = await updateStudentCourses(profile.email, updatedIds);
      if (res.success) {
        setEnrolledCourseIds(updatedIds);
        await logActivity(
          profile.uid, 
          profile.name, 
          isEnrolled ? 'Unregistered Course' : 'Registered Course', 
          `Course ID: ${courseId}`, 
          'student'
        );
      } else {
        alert(res.message);
      }
    } catch (error) {
      console.error("Failed to toggle course registration:", error);
      alert("Failed to update course registration.");
    } finally {
      setRegisteringId(null);
    }
  };

  if (!profile || profile.role !== 'student') return null;

  return (
    <div className="courses-page" style={{ padding: '2rem' }}>
      <div className="header-section" style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>Course Registration</h1>
        <p style={{ color: 'var(--text-tertiary)' }}>Click on the courses you have to register or unregister.</p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
          <Loader2 className="animate-spin" size={36} color="var(--accent-primary)" />
        </div>
      ) : !hasProfile ? (
        <div style={{ background: 'var(--bg-secondary)', padding: '3rem 2rem', borderRadius: '15px', textAlign: 'center', maxWidth: '500px', margin: '2rem auto' }}>
          <AlertCircle size={48} color="var(--warning)" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ marginBottom: '0.5rem' }}>Profile Incomplete</h3>
          <p style={{ color: 'var(--text-tertiary)', marginBottom: '1.5rem', fontSize: '0.95rem', lineHeight: 1.6 }}>
            Please complete your Biodata profile and select your Department and Academic Level before registering for courses.
          </p>
          <button 
            className="add-btn" 
            onClick={() => navigate('/biodata')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', margin: '0 auto' }}
          >
            Go to Biodata
          </button>
        </div>
      ) : (
        <div className="course-list-full">
          <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Book size={20} /> Available Courses for Your Level
          </h3>
          
          {availableCourses.length === 0 ? (
            <div style={{ background: 'var(--bg-secondary)', padding: '3rem 2rem', borderRadius: '15px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
              <Book size={48} style={{ opacity: 0.2, margin: '0 auto 1rem' }} />
              <p>No courses are registered under your department and level yet. Please check back later or contact your administrator.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
              {availableCourses.map(course => {
                const isEnrolled = enrolledCourseIds.includes(course.id || '');
                const isProcessing = registeringId === course.id;
                
                return (
                  <div 
                    key={course.id} 
                    onClick={() => course.id && !isProcessing && handleToggleCourse(course.id)}
                    style={{ 
                      background: isEnrolled ? 'rgba(99, 102, 241, 0.05)' : 'var(--bg-secondary)', 
                      padding: '1.5rem', 
                      borderRadius: '15px', 
                      border: isEnrolled ? '2px solid var(--accent-primary)' : '2px solid var(--border-color)',
                      cursor: isProcessing ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s ease',
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      boxShadow: isEnrolled ? '0 4px 12px rgba(99, 102, 241, 0.1)' : 'none'
                    }}
                    className="clickable-course-card"
                  >
                    <div>
                      <span 
                        style={{ 
                          fontSize: '0.75rem', 
                          fontWeight: 'bold', 
                          background: isEnrolled ? 'var(--accent-primary)' : 'var(--bg-tertiary)', 
                          color: isEnrolled ? 'white' : 'var(--text-secondary)',
                          padding: '0.25rem 0.5rem', 
                          borderRadius: '4px',
                          display: 'inline-block',
                          marginBottom: '0.75rem',
                          textTransform: 'uppercase'
                        }}
                      >
                        {course.code}
                      </span>
                      <h4 style={{ fontSize: '1.15rem', marginBottom: '0.5rem', fontWeight: 700 }}>{course.title}</h4>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                      {isProcessing ? (
                        <Loader2 className="animate-spin" size={20} color="var(--accent-primary)" />
                      ) : isEnrolled ? (
                        <span 
                          style={{ 
                            fontSize: '0.8rem', 
                            color: 'var(--success)', 
                            fontWeight: 600, 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '0.25rem' 
                          }}
                        >
                          <Check size={16} /> Enrolled
                        </span>
                      ) : (
                        <span 
                          style={{ 
                            fontSize: '0.8rem', 
                            color: 'var(--text-tertiary)', 
                            fontWeight: 500, 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '0.25rem' 
                          }}
                        >
                          <Plus size={16} /> Click to Register
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RegisterCourse;
