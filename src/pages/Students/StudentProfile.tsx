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
  Download,
  MessageSquare,
  Send,
  Loader2
} from 'lucide-react';
import { getStudentByStudentId } from '../../services/studentService';
import type { Student } from '../../services/studentService';
import { getAllSessions } from '../../services/attendanceService';
import type { AttendanceSession } from '../../services/attendanceService';
import { sendSMS } from '../../services/smsService';
import { useAuth } from '../../context/AuthContext';
import './Students.css';

const StudentProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [student, setStudent] = useState<Student | null>(null);
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [loading, setLoading] = useState(true);

  // SMS Modal States
  const [showSmsModal, setShowSmsModal] = useState(false);
  const [smsBody, setSmsBody] = useState('');
  const [sendingSms, setSendingSms] = useState(false);

  const handleSendSms = async () => {
    if (!student?.phone) {
      alert('This student does not have a registered phone number.');
      return;
    }
    if (!smsBody.trim()) {
      alert('Please enter message text.');
      return;
    }
    setSendingSms(true);
    try {
      const res = await sendSMS(student.phone, smsBody.trim());
      if (res.status === 'success') {
        alert('SMS sent successfully!');
        setShowSmsModal(false);
        setSmsBody('');
      } else {
        const errorMsg = res.error?.message || res.message || JSON.stringify(res);
        alert(`Failed to send SMS: ${errorMsg}`);
      }
    } catch (err: any) {
      console.error('Error sending SMS:', err);
      alert('Failed to send SMS due to a network error.');
    } finally {
      setSendingSms(false);
    }
  };

  useEffect(() => {
    const fetchStudentData = async () => {
      if (!id) return;
      try {
        const decodedId = decodeURIComponent(id);
        const studentData = await getStudentByStudentId(decodedId);
        if (studentData) {
          setStudent(studentData);
          const allSessions = await getAllSessions();
          // Filter sessions where this student was present
          const studentSessions = allSessions.filter(s => 
            s.studentsPresent?.includes(decodedId)
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
        <div className="header-actions" style={{ display: 'flex', gap: '0.75rem' }}>
          {(profile?.role === 'admin' || profile?.role === 'lecturer') && (
            <button 
              className="btn-secondary" 
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent-primary)', borderColor: 'var(--accent-primary)' }}
              onClick={() => setShowSmsModal(true)}
              disabled={!student.phone}
              title={student.phone ? 'Send SMS notification to student' : 'No phone number registered'}
            >
              <MessageSquare size={18} />
              Send SMS Alert
            </button>
          )}
          <button className="add-btn">
            <Download size={18} /> Export Report
          </button>
        </div>
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
                <span>{student.phone || 'N/A'}</span>
              </div>
              <div className="info-item">
                <MapPin size={16} />
                <span>{student.address || 'N/A'}</span>
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

      {/* SMS Sending Modal */}
      {showSmsModal && (
        <div className="admin-modal-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, padding: '1rem' }}>
          <div className="admin-confirm-card" style={{ maxWidth: '480px', width: '100%', padding: '2rem', background: 'var(--bg-secondary)', borderRadius: '15px', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--accent-primary)' }}>
              <MessageSquare size={24} />
              <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Send SMS Alert</h3>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', marginBottom: '1.5rem' }}>
              Send a direct SMS notification to <strong>{student.name}</strong> at <strong>{student.phone}</strong>.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Message Content</label>
              <textarea
                value={smsBody}
                onChange={(e) => setSmsBody(e.target.value)}
                placeholder="Type your alert message here..."
                maxLength={160}
                style={{ width: '100%', minHeight: '100px', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', resize: 'vertical', fontSize: '0.9rem', fontFamily: 'inherit' }}
              />
              <div style={{ textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                {smsBody.length}/160 characters (1 segment)
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button 
                type="button" 
                className="admin-btn admin-btn-ghost" 
                onClick={() => { setShowSmsModal(false); setSmsBody(''); }}
                disabled={sendingSms}
                style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={handleSendSms}
                disabled={sendingSms || !smsBody.trim()}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1.25rem', borderRadius: '8px', border: 'none', background: 'var(--accent-primary)', color: 'white', fontWeight: 600, cursor: (sendingSms || !smsBody.trim()) ? 'not-allowed' : 'pointer', opacity: (sendingSms || !smsBody.trim()) ? 0.7 : 1 }}
              >
                {sendingSms ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                {sendingSms ? 'Sending...' : 'Send SMS'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentProfile;
