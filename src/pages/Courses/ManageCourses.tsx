import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { createCourse, getLecturerCourses } from '../../services/courseService';
import type { Course } from '../../services/courseService';
import { logActivity } from '../../services/activityService';
import { Loader2, Plus, Copy, Check } from 'lucide-react';
import './Courses.css';

const ManageCourses: React.FC = () => {
  const { profile } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    code: '',
    title: ''
  });

  useEffect(() => {
    if (profile?.uid) {
      loadCourses();
    }
  }, [profile]);

  const loadCourses = async () => {
    if (!profile) return;
    try {
      const data = await getLecturerCourses(profile.uid);
      setCourses(data);
    } catch (error) {
      console.error("Failed to load courses", error);
    } finally {
      setLoading(false);
    }
  };

  const generateJoinCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setCreating(true);

    try {
      const joinCode = generateJoinCode();
      await createCourse({
        code: formData.code,
        title: formData.title,
        lecturerId: profile.uid,
        joinCode
      });
      await logActivity(profile.uid, profile.name, 'Created Course', `Course: ${formData.code}`, 'system');
      setFormData({ code: '', title: '' });
      await loadCourses();
      alert(`Course created successfully! The join code is ${joinCode}`);
    } catch (error) {
      console.error("Error creating course:", error);
      alert("Failed to create course.");
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  if (!profile || (profile.role !== 'lecturer' && profile.role !== 'admin')) return null;

  return (
    <div className="courses-page" style={{ padding: '2rem' }}>
      <div className="header-section" style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>Manage Courses</h1>
        <p style={{ color: 'var(--text-tertiary)' }}>Create courses and share the join codes with your students.</p>
      </div>

      <div className="courses-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
        
        {/* Create Course Form */}
        <div className="create-course-card" style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '15px', height: 'fit-content' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <Plus size={20} /> Create New Course
          </h3>
          <form onSubmit={handleCreateCourse} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Course Code</label>
              <input 
                type="text" 
                required
                placeholder="e.g. CS101" 
                value={formData.code}
                onChange={(e) => setFormData({...formData, code: e.target.value})}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)' }}
              />
            </div>
            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Course Title</label>
              <input 
                type="text" 
                required
                placeholder="e.g. Introduction to Computer Science" 
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)' }}
              />
            </div>
            <button 
              type="submit" 
              disabled={creating}
              style={{ background: 'var(--accent-primary)', color: 'white', padding: '0.75rem', borderRadius: '8px', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}
            >
              {creating ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
              {creating ? 'Creating...' : 'Create Course'}
            </button>
          </form>
        </div>

        {/* Course List */}
        <div className="course-list">
          <h3 style={{ marginBottom: '1.5rem' }}>Your Courses</h3>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}><Loader2 className="animate-spin" /></div>
          ) : courses.length === 0 ? (
            <div style={{ background: 'var(--bg-secondary)', padding: '2rem', borderRadius: '15px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
              No courses created yet.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '1rem' }}>
              {courses.map(course => (
                <div key={course.id} className="course-card" style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>{course.code}</h4>
                    <p style={{ color: 'var(--text-tertiary)', fontSize: '0.9rem' }}>{course.title}</p>
                  </div>
                  <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>JOIN CODE</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-primary)', padding: '0.5rem 1rem', borderRadius: '8px', fontWeight: 'bold', fontFamily: 'monospace', letterSpacing: '2px' }}>
                        {course.joinCode}
                        <button 
                          onClick={() => handleCopy(course.joinCode)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-primary)' }}
                        >
                          {copiedCode === course.joinCode ? <Check size={16} color="var(--success)" /> : <Copy size={16} />}
                        </button>
                      </div>
                    </div>
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

export default ManageCourses;
