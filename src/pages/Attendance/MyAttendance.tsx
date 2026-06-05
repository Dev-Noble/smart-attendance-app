import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Calendar,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
  TrendingUp
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getStudentCourses } from '../../services/courseService';
import type { Course } from '../../services/courseService';
import { getAllSessions } from '../../services/attendanceService';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import './MyAttendance.css';

interface CourseAttendance {
  course: Course;
  totalSessions: number;
  attended: number;
  percentage: number;
  sessions: {
    id: string;
    date: string;
    time: string;
    present: boolean;
  }[];
}

const MyAttendance: React.FC = () => {
  const { profile } = useAuth();
  const [courseAttendance, setCourseAttendance] = useState<CourseAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.email) {
      loadAttendanceData();
    }
  }, [profile]);

  const loadAttendanceData = async () => {
    if (!profile?.email) return;
    setLoading(true);

    try {
      // Get student's enrolled courses
      const courses = await getStudentCourses(profile.email);

      // Get student's studentId
      const studentQuery = query(collection(db, 'students'), where('email', '==', profile.email));
      const studentSnap = await getDocs(studentQuery);
      const studentId = studentSnap.empty ? '' : studentSnap.docs[0].data().studentId || '';

      if (!studentId || courses.length === 0) {
        setCourseAttendance([]);
        setLoading(false);
        return;
      }

      // Get all sessions
      const allSessions = await getAllSessions();

      // Build per-course attendance data
      const data: CourseAttendance[] = courses.map(course => {
        const courseSessions = allSessions.filter(s => s.courseId === course.id);
        const attended = courseSessions.filter(s =>
          (s.studentsPresent || []).includes(studentId)
        ).length;
        const totalSessions = courseSessions.length;
        const percentage = totalSessions > 0 ? Math.round((attended / totalSessions) * 100) : 0;

        const sessionDetails = courseSessions.map(s => {
          const date = s.startTime?.toDate
            ? s.startTime.toDate()
            : new Date();
          return {
            id: s.id || '',
            date: date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
            time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            present: (s.studentsPresent || []).includes(studentId)
          };
        });

        return {
          course,
          totalSessions,
          attended,
          percentage,
          sessions: sessionDetails
        };
      });

      setCourseAttendance(data);
    } catch (err) {
      console.error('Failed to load attendance data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getPercentColor = (pct: number) => {
    if (pct >= 75) return 'var(--success, #10b981)';
    if (pct >= 50) return 'var(--warning, #f59e0b)';
    return 'var(--danger, #ef4444)';
  };

  const getStatusLabel = (pct: number) => {
    if (pct >= 75) return 'On Track';
    if (pct >= 50) return 'At Risk';
    return 'Critical';
  };

  // Overall stats
  const overallTotal = courseAttendance.reduce((a, c) => a + c.totalSessions, 0);
  const overallAttended = courseAttendance.reduce((a, c) => a + c.attended, 0);
  const overallPercentage = overallTotal > 0 ? Math.round((overallAttended / overallTotal) * 100) : 0;

  if (loading) {
    return (
      <div className="my-attendance-page">
        <div className="my-attendance-loading">
          <Loader2 size={40} className="animate-spin" />
          <p>Loading your attendance records...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="my-attendance-page">
      <div className="my-attendance-header">
        <div>
          <h1>My Attendance</h1>
          <p>Track your attendance across all enrolled courses</p>
        </div>
      </div>

      {/* Overall Stats */}
      <div className="ma-stats-grid">
        <div className="ma-stat-card">
          <div className="ma-stat-icon" style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-primary)' }}>
            <BookOpen size={22} />
          </div>
          <div className="ma-stat-info">
            <span className="ma-stat-value">{courseAttendance.length}</span>
            <span className="ma-stat-label">Courses Enrolled</span>
          </div>
        </div>
        <div className="ma-stat-card">
          <div className="ma-stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' }}>
            <CheckCircle size={22} />
          </div>
          <div className="ma-stat-info">
            <span className="ma-stat-value">{overallAttended} / {overallTotal}</span>
            <span className="ma-stat-label">Sessions Attended</span>
          </div>
        </div>
        <div className="ma-stat-card">
          <div className="ma-stat-icon" style={{ background: `${getPercentColor(overallPercentage)}15`, color: getPercentColor(overallPercentage) }}>
            <TrendingUp size={22} />
          </div>
          <div className="ma-stat-info">
            <span className="ma-stat-value" style={{ color: getPercentColor(overallPercentage) }}>{overallPercentage}%</span>
            <span className="ma-stat-label">Overall Attendance</span>
          </div>
        </div>
      </div>

      {/* Per-Course Cards */}
      {courseAttendance.length === 0 ? (
        <div className="ma-empty">
          <BookOpen size={48} color="var(--text-tertiary)" />
          <h3>No Courses Found</h3>
          <p>Register for courses to start tracking your attendance.</p>
        </div>
      ) : (
        <div className="ma-course-list">
          {courseAttendance.map(ca => {
            const isExpanded = expandedCourse === ca.course.id;
            return (
              <div key={ca.course.id} className={`ma-course-card ${isExpanded ? 'expanded' : ''}`}>
                <div
                  className="ma-course-header"
                  onClick={() => setExpandedCourse(isExpanded ? null : (ca.course.id || null))}
                >
                  <div className="ma-course-info">
                    <div className="ma-course-code">{ca.course.code}</div>
                    <div className="ma-course-title">{ca.course.title}</div>
                  </div>

                  <div className="ma-course-stats">
                    <div className="ma-progress-section">
                      <div className="ma-progress-text">
                        <span className="ma-progress-pct" style={{ color: getPercentColor(ca.percentage) }}>
                          {ca.percentage}%
                        </span>
                        <span className="ma-progress-detail">
                          {ca.attended}/{ca.totalSessions} sessions
                        </span>
                      </div>
                      <div className="ma-progress-bar">
                        <div
                          className="ma-progress-fill"
                          style={{
                            width: `${ca.percentage}%`,
                            background: getPercentColor(ca.percentage)
                          }}
                        />
                      </div>
                    </div>

                    <span className="ma-status-badge" style={{
                      background: `${getPercentColor(ca.percentage)}15`,
                      color: getPercentColor(ca.percentage)
                    }}>
                      {getStatusLabel(ca.percentage)}
                    </span>

                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="ma-session-list">
                    {ca.sessions.length === 0 ? (
                      <div className="ma-no-sessions">
                        <Calendar size={20} />
                        <span>No sessions held yet for this course.</span>
                      </div>
                    ) : (
                      <table className="ma-session-table">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Time</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ca.sessions.map(s => (
                            <tr key={s.id}>
                              <td>{s.date}</td>
                              <td>{s.time}</td>
                              <td>
                                {s.present ? (
                                  <span className="ma-present-badge">
                                    <CheckCircle size={14} /> Present
                                  </span>
                                ) : (
                                  <span className="ma-absent-badge">
                                    <XCircle size={14} /> Absent
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyAttendance;
