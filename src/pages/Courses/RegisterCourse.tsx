import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getStudentCourses, joinCourse } from '../../services/courseService';
import type { Course } from '../../services/courseService';
import { logActivity } from '../../services/activityService';
import { Loader2, LogIn, Book, CheckCircle } from 'lucide-react';
import './Courses.css';

const RegisterCourse: React.FC = () => {
  const { profile } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [joinCode, setJoinCode] = useState('');

  useEffect(() => {
    if (profile?.email) {
      loadCourses();
    }
  }, [profile]);

  const loadCourses = async () => {
    if (!profile) return;
    try {
      const data = await getStudentCourses(profile.email);
      setCourses(data);
    } catch (error) {
      console.error("Failed to load enrolled courses", error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !joinCode.trim()) return;
    
    setJoining(true);
    try {
      const result = await joinCourse(profile.email, joinCode.trim().toUpperCase());
      if (result.success) {
        await logActivity(profile.uid, profile.name, 'Enrolled in Course', `Used join code ${joinCode}`, 'student');
        alert(result.message);
        setJoinCode('');
        await loadCourses();
      } else {
        alert(result.message);
      }
    } catch (error) {
      console.error("Error joining course:", error);
      alert("An error occurred while trying to join the course.");
    } finally {
      setJoining(false);
    }
  };

  if (!profile || profile.role !== 'student') return null;

  return (
    <div className="courses-page" style={{ padding: '2rem' }}>
      <div className="header-section" style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>My Courses</h1>
        <p style={{ color: 'var(--text-tertiary)' }}>Register for new courses and view your current enrollments.</p>
      </div>

      <div className="courses-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
        
        {/* Join Course Form */}
        <div className="create-course-card" style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '15px', height: 'fit-content' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <LogIn size={20} /> Join a Course
          </h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-tertiary)', marginBottom: '1.5rem' }}>
            Ask your lecturer for the 6-character Join Code to enroll in their course.
          </p>
          <form onSubmit={handleJoinCourse} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <input 
                type="text" 
                required
                placeholder="e.g. X7B9A2" 
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                maxLength={6}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', textTransform: 'uppercase', letterSpacing: '2px', textAlign: 'center', fontWeight: 'bold', fontSize: '1.2rem' }}
              />
            </div>
            <button 
              type="submit" 
              disabled={joining || joinCode.length < 6}
              style={{ background: 'var(--accent-primary)', color: 'white', padding: '0.75rem', borderRadius: '8px', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', opacity: joinCode.length < 6 ? 0.5 : 1 }}
            >
              {joining ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
              {joining ? 'Verifying...' : 'Enroll Now'}
            </button>
          </form>
        </div>

        {/* Enrolled Courses */}
        <div className="course-list">
          <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Book size={20} /> Enrolled Courses
          </h3>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}><Loader2 className="animate-spin" /></div>
          ) : courses.length === 0 ? (
            <div style={{ background: 'var(--bg-secondary)', padding: '3rem 2rem', borderRadius: '15px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
              <Book size={48} style={{ opacity: 0.2, margin: '0 auto 1rem' }} />
              <p>You haven't enrolled in any courses yet.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1.5rem' }}>
              {courses.map(course => (
                <div key={course.id} className="course-card" style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '15px', borderTop: '4px solid var(--accent-primary)' }}>
                  <h4 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>{course.code}</h4>
                  <p style={{ color: 'var(--text-tertiary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>{course.title}</p>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <span style={{ fontSize: '0.75rem', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', padding: '0.25rem 0.5rem', borderRadius: '4px', fontWeight: 'bold' }}>Enrolled</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RegisterCourse;
