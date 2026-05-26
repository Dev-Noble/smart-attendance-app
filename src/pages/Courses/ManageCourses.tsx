import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  getDepartments, 
  getCoursesByDept, 
  getLecturerCourses, 
  updateLecturerCourses,
  type Department,
  type Course
} from '../../services/courseService';
import { logActivity } from '../../services/activityService';
import { Loader2, BookOpen, Check, Plus, AlertCircle } from 'lucide-react';
import './Courses.css';

const ManageCourses: React.FC = () => {
  const { profile } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
  const [myCourseIds, setMyCourseIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.uid) {
      initLecturerData();
    }
  }, [profile]);

  useEffect(() => {
    if (selectedDeptId) {
      loadDeptCourses(selectedDeptId);
    } else {
      setAvailableCourses([]);
    }
  }, [selectedDeptId]);

  const initLecturerData = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const depts = await getDepartments();
      setDepartments(depts);

      // Load lecturer's currently associated courses
      const myCourses = await getLecturerCourses(profile.uid);
      const myIds = myCourses.map(c => c.id || '');
      setMyCourseIds(myIds);

      // Set initial department selection to lecturer's department if saved
      const savedDeptId = (profile as any).departmentId || '';
      if (savedDeptId) {
        setSelectedDeptId(savedDeptId);
      } else if (depts.length > 0) {
        setSelectedDeptId(depts[0].id || '');
      }
    } catch (error) {
      console.error("Failed to initialize lecturer courses data", error);
    } finally {
      setLoading(false);
    }
  };

  const loadDeptCourses = async (deptId: string) => {
    setCoursesLoading(true);
    try {
      const courses = await getCoursesByDept(deptId);
      setAvailableCourses(courses);
    } catch (error) {
      console.error("Failed to load department courses", error);
    } finally {
      setCoursesLoading(false);
    }
  };

  const handleToggleCourse = async (courseId: string) => {
    if (!profile) return;

    const isAssociated = myCourseIds.includes(courseId);
    const updatedIds = isAssociated
      ? myCourseIds.filter(id => id !== courseId)
      : [...myCourseIds, courseId];

    setSavingId(courseId);
    try {
      await updateLecturerCourses(profile.uid, updatedIds, selectedDeptId);
      setMyCourseIds(updatedIds);
      await logActivity(
        profile.uid, 
        profile.name, 
        isAssociated ? 'Deassociated Course' : 'Associated Course', 
        `Course ID: ${courseId}`, 
        'system'
      );
    } catch (error) {
      console.error("Failed to update lecturer courses:", error);
      alert("Failed to update course list.");
    } finally {
      setSavingId(null);
    }
  };

  if (!profile || (profile.role !== 'lecturer' && profile.role !== 'admin')) return null;

  return (
    <div className="courses-page" style={{ padding: '2rem' }}>
      <div className="header-section" style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>Manage My Courses</h1>
        <p style={{ color: 'var(--text-tertiary)' }}>Select your department and link the courses you are teaching to your account.</p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
          <Loader2 className="animate-spin" size={36} color="var(--accent-primary)" />
        </div>
      ) : (
        <div className="courses-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
          
          {/* Department Select & Stats */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="create-course-card" style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '15px' }}>
              <h3 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem' }}>
                Filter Department
              </h3>
              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 500 }}>Select Department</label>
                <select
                  value={selectedDeptId}
                  onChange={(e) => setSelectedDeptId(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                >
                  <option value="">Select Department</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="create-course-card" style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '15px' }}>
              <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Teaching Summary</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                  <span style={{ color: 'var(--text-tertiary)' }}>Total Associated Courses:</span>
                  <span style={{ fontWeight: 'bold' }}>{myCourseIds.length}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Courses selection */}
          <div className="course-list">
            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BookOpen size={20} /> Courses in Selected Department
            </h3>
            
            {coursesLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                <Loader2 className="animate-spin" size={24} />
              </div>
            ) : !selectedDeptId ? (
              <div style={{ background: 'var(--bg-secondary)', padding: '3rem 2rem', borderRadius: '15px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                Please select a department to view available courses.
              </div>
            ) : availableCourses.length === 0 ? (
              <div style={{ background: 'var(--bg-secondary)', padding: '3rem 2rem', borderRadius: '15px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                <AlertCircle size={40} style={{ opacity: 0.3, margin: '0 auto 1rem' }} />
                <p>No courses registered in this department yet.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '1rem' }}>
                {availableCourses.map(course => {
                  const isAssociated = myCourseIds.includes(course.id || '');
                  const isSaving = savingId === course.id;

                  return (
                    <div 
                      key={course.id} 
                      onClick={() => course.id && !isSaving && handleToggleCourse(course.id)}
                      style={{ 
                        background: isAssociated ? 'rgba(99, 102, 241, 0.05)' : 'var(--bg-secondary)', 
                        padding: '1.25rem 1.5rem', 
                        borderRadius: '15px', 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        border: isAssociated ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                        cursor: isSaving ? 'not-allowed' : 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                      className="clickable-course-row"
                    >
                      <div>
                        <span 
                          style={{ 
                            fontSize: '0.75rem', 
                            fontWeight: 'bold', 
                            background: 'var(--bg-tertiary)', 
                            color: 'var(--accent-primary)',
                            padding: '0.2rem 0.5rem', 
                            borderRadius: '4px',
                            display: 'inline-block',
                            marginBottom: '0.4rem'
                          }}
                        >
                          {course.code}
                        </span>
                        <h4 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 700 }}>{course.title}</h4>
                      </div>

                      <div>
                        {isSaving ? (
                          <Loader2 className="animate-spin" size={20} color="var(--accent-primary)" />
                        ) : isAssociated ? (
                          <span style={{ color: 'var(--success)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.9rem' }}>
                            <Check size={16} /> Teaching
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-tertiary)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.9rem' }}>
                            <Plus size={16} /> Add to My List
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageCourses;
