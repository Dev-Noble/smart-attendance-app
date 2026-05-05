import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  Clock,
  Download
} from 'lucide-react';
import { getStudentByStudentId } from '../../services/studentService';
import type { Student } from '../../services/studentService';
import { getAllSessions } from '../../services/attendanceService';
import type { AttendanceSession } from '../../services/attendanceService';
import './Students.css';

const StudentProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [student, setStudent] = useState<Student | null>(null);
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStudentData = async () => {
      if (!id) return;
      try {
        const studentData = await getStudentByStudentId(id);
        if (studentData) {
          setStudent(studentData);
          const allSessions = await getAllSessions();
          // Filter sessions where this student was present
          const studentSessions = allSessions.filter(s => 
            s.studentsPresent?.includes(id)
          );
          setSessions(studentSessions);
        }
      } catch (error) {
        console.error("Error fetching student profile:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStudentData();
  }, [id]);

  if (loading) {
    return <div className="loading-spinner"></div>;
  }

  if (!student) {
    return (
      <div className="error-state">
        <h2>Student Not Found</h2>
        <button onClick={() => navigate('/students')} className="btn-secondary">
          <ArrowLeft size={18} /> Back to Students
        </button>
      </div>
    );
  }

  return (
    <div className="student-profile-page">
      <div className="students-header">
        <div className="header-left">
          <button onClick={() => navigate(-1)} className="back-btn">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1>Student Profile</h1>
            <p>Viewing detailed records for {student.name}</p>
          </div>
        </div>
        <button className="add-btn">
          <Download size={18} /> Export Report
        </button>
      </div>

      <div className="profile-grid">
        <div className="profile-sidebar">
          <div className="profile-card info-card">
            <div className="profile-avatar-large">
              {student.avatar ? (
                <img src={student.avatar} alt={student.name} />
              ) : (
                student.name.split(' ').map(n => n[0]).join('')
              )}
            </div>
            <h2 className="profile-name">{student.name}</h2>
            <span className="profile-id">{student.studentId}</span>
            <span className={`status-pill pill-${student.status}`}>
              {student.status.charAt(0).toUpperCase() + student.status.slice(1)}
            </span>

            <div className="info-list">
              <div className="info-item">
                <Mail size={16} />
                <span>{student.email || 'N/A'}</span>
              </div>
              <div className="info-item">
                <Phone size={16} />
                <span>+234 800 123 4567</span>
              </div>
              <div className="info-item">
                <MapPin size={16} />
                <span>Lagos, Nigeria</span>
              </div>
              <div className="info-item">
                <Calendar size={16} />
                <span>Joined Sept 2025</span>
              </div>
            </div>
          </div>

          <div className="profile-card stats-mini-card">
            <h3>Attendance Rate</h3>
            <div className="attendance-gauge">
              <div className="gauge-circle" style={{ '--percentage': `${student.attendance}%` } as any}>
                <span className="gauge-value">{student.attendance}%</span>
              </div>
            </div>
            <div className="gauge-stats">
              <div className="gauge-stat">
                <span className="label">Present</span>
                <span className="value">{sessions.length}</span>
              </div>
              <div className="gauge-stat">
                <span className="label">Absent</span>
                <span className="value">4</span>
              </div>
            </div>
          </div>
        </div>

        <div className="profile-main">
          <div className="profile-card attendance-history">
            <h3>Attendance History</h3>
            <div className="history-list">
              {sessions.length > 0 ? (
                sessions.map((session) => (
                  <div key={session.id} className="history-item">
                    <div className="session-info">
                      <div className="session-icon">
                        <CheckCircle2 size={18} color="var(--success)" />
                      </div>
                      <div>
                        <span className="session-name">Computer Science (CS101)</span>
                        <span className="session-date">
                          {session.startTime?.toDate().toLocaleDateString()} at {session.startTime?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                    <div className="session-meta">
                      <span className="status-badge present">Present</span>
                      <Clock size={14} />
                      <span>On Time</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-history">
                  <XCircle size={40} />
                  <p>No attendance records found for this student.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentProfile;
