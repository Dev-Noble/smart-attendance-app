import React, { useState, useEffect } from 'react';
import { 
  Users, 
  QrCode, 
  Play, 
  Square, 
  Clock, 
  CheckCircle,
  AlertCircle,
  Loader2 
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { doc, updateDoc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/firebase';
import { createAttendanceSession, endAttendanceSession, subscribeToSession } from '../../services/attendanceService';
import { getStudentByStudentId, getStudents } from '../../services/studentService';
import { logActivity } from '../../services/activityService';
import './Attendance.css';

interface ScannedStudent {
  id?: string;
  name: string;
  studentId: string;
  timestamp: Date;
}

const Attendance: React.FC = () => {
  const { profile } = useAuth();
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [timeLeft, setTimeLeft] = useState(1200); // 20 minutes
  const [scannedStudents, setScannedStudents] = useState<ScannedStudent[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchStudents();
    
    // Listen for active sessions (for students)
    const q = onSnapshot(doc(db, 'system', 'status'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.activeSessionId) {
          setSessionId(data.activeSessionId);
          setIsSessionActive(true);
        } else {
          setIsSessionActive(false);
          setSessionId('');
        }
      }
    });

    return () => q();
  }, []);

  const fetchStudents = async () => {
    const data = await getStudents();
    setStudents(data);
  };

  useEffect(() => {
    let unsubscribe: () => void;

    if (sessionId && (profile?.role === 'admin' || profile?.role === 'lecturer')) {
      unsubscribe = subscribeToSession(sessionId, async (sessionData) => {
        if (sessionData.studentsPresent) {
          const studentPromises = sessionData.studentsPresent.map((id: string) => 
            getStudentByStudentId(id)
          );
          const studentData = await Promise.all(studentPromises);
          
          setScannedStudents(studentData.filter(s => s !== null).map(s => ({
            id: s.id,
            name: s.name,
            studentId: s.studentId,
            timestamp: new Date()
          })));
        }
      });
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [sessionId, profile]);

  useEffect(() => {
    let timer: any;
    if (isSessionActive && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && (profile?.role === 'admin' || profile?.role === 'lecturer')) {
      stopSession();
    }
    return () => clearInterval(timer);
  }, [isSessionActive, timeLeft, profile]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startSession = async () => {
    if (!profile) return;
    try {
      const newSessionId = await createAttendanceSession(profile.uid, 'CS101');
      // Update global system status so students see the session
      await setDoc(doc(db, 'system', 'status'), { activeSessionId: newSessionId }, { merge: true });
      await logActivity(profile.uid, profile.name, 'Started Session', 'Course: CS101', 'attendance');
      setSessionId(newSessionId);
      setIsSessionActive(true);
      setTimeLeft(1200);
    } catch (error) {
      console.error("Error starting session:", error);
    }
  };

  const stopSession = async () => {
    if (sessionId) {
      await endAttendanceSession(sessionId);
      await setDoc(doc(db, 'system', 'status'), { activeSessionId: null }, { merge: true });
      await logActivity(profile?.uid || 'system', profile?.name || 'Lecturer', 'Ended Session', 'Course: CS101', 'attendance');
    }
    setIsSessionActive(false);
    setSessionId('');
  };

  const handleStudentScan = async (studentId: string) => {
    if (!sessionId) {
      alert("No active session found.");
      return;
    }
    setSaving(true);
    try {
      const sessionRef = doc(db, 'sessions', sessionId);
      const sessionSnap = await getDoc(sessionRef);
      if (sessionSnap.exists()) {
        const currentPresent = sessionSnap.data().studentsPresent || [];
        if (!currentPresent.includes(studentId)) {
          await updateDoc(sessionRef, {
            studentsPresent: [...currentPresent, studentId]
          });
          await logActivity(profile?.uid || 'system', profile?.name || 'Student', 'Marked Attendance', `Joined session ${sessionId}`, 'attendance');
          alert("Attendance marked successfully!");
        } else {
          alert("You have already marked your attendance for this session.");
        }
      }
    } catch (error) {
      console.error("Error marking attendance:", error);
      alert("Failed to mark attendance. Ensure the session is still active.");
    } finally {
      setSaving(false);
    }
  };

  if (!profile) return null;

  return (
    <div className="attendance-page">
      <div className="attendance-header">
        <h1>{profile.role === 'student' ? 'Mark Attendance' : 'Attendance Session'}</h1>
        <p>{profile.role === 'student' ? 'CS101 - Introduction to Computer Science' : 'Generate and monitor the lecture QR code'}</p>
      </div>

      <div className="attendance-container">
        {profile.role === 'student' ? (
          <div className="qr-card" style={{ maxWidth: '400px', margin: '0 auto', textAlign: 'center' }}>
            <div className="student-info-preview" style={{ padding: '2rem 1rem', background: 'var(--bg-tertiary)', borderRadius: '15px', marginBottom: '2rem' }}>
              <div className="student-avatar" style={{ width: 80, height: 80, background: 'var(--accent-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', margin: '0 auto 1.5rem', fontSize: '2rem', fontWeight: 600 }}>
                {profile.name[0].toUpperCase()}
              </div>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{profile.name}</h2>
              <p style={{ color: 'var(--text-tertiary)' }}>{profile.studentId || 'No Student ID Set'}</p>
            </div>

            {isSessionActive ? (
              <>
                {!profile.studentId ? (
                  <div className="warning-alert" style={{ marginBottom: '2rem', padding: '1rem', background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '10px', color: '#92400e', display: 'flex', gap: '0.5rem', alignItems: 'center', textAlign: 'left' }}>
                    <AlertCircle size={20} />
                    <p style={{ fontSize: '0.875rem' }}>Please set your <strong>Student ID</strong> in Settings before you can mark attendance.</p>
                  </div>
                ) : (
                  <button 
                    className="start-btn" 
                    disabled={saving}
                    style={{ width: '100%', height: '60px', borderRadius: '15px', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                    onClick={() => handleStudentScan(profile.studentId || '')}
                  >
                    {saving ? <Loader2 className="animate-spin" size={24} /> : <CheckCircle size={24} />}
                    {saving ? 'Marking...' : 'Confirm My Attendance'}
                  </button>
                )}
                <p className="qr-hint" style={{ marginTop: '1.5rem' }}>Session is currently active. Click the button above to register.</p>
              </>
            ) : (
              <div className="no-session-state">
                <Clock size={48} color="var(--text-tertiary)" style={{ marginBottom: '1rem' }} />
                <h3>No Active Session</h3>
                <p>Wait for your lecturer to start the session.</p>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="qr-section">
              <div className="qr-card">
                <div className={`qr-placeholder ${isSessionActive ? 'active' : ''}`}>
                  {isSessionActive ? (
                    <QRCodeCanvas 
                      value={`${window.location.origin}/mark/${sessionId}`} 
                      size={200}
                      level="H"
                      includeMargin={true}
                    />
                  ) : (
                    <QrCode size={80} color="var(--text-tertiary)" strokeWidth={1} />
                  )}
                </div>
                
                <div className="session-timer">
                  {formatTime(timeLeft)}
                </div>

                <div className="session-controls">
                  {!isSessionActive ? (
                    <button className="start-btn" onClick={startSession}>
                      <Play size={20} fill="currentColor" />
                      Start Session
                    </button>
                  ) : (
                    <button className="stop-btn" onClick={stopSession}>
                      <Square size={20} fill="currentColor" />
                      Stop Session
                    </button>
                  )}
                </div>
                
                <p className="qr-hint">
                  {isSessionActive 
                    ? "Students can now scan the code to mark attendance." 
                    : "Generate a new QR code to start the lecture attendance."}
                </p>
              </div>

              <div className="stat-card">
                <div className="stat-header">
                  <span className="stat-label">Session Summary</span>
                  <Users size={18} />
                </div>
                <div className="summary-stats">
                  <div className="stat-item">
                    <span className="stat-value">{scannedStudents.length}</span>
                    <span className="stat-label">Present</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-value">{students.length}</span>
                    <span className="stat-label">Total Students</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="list-section">
              <div className="section-header">
                <h3>Live Feed</h3>
                <span className="live-indicator">
                  <span className="pulse"></span>
                  Live
                </span>
              </div>

              <div className="scanned-list">
                {scannedStudents.length > 0 ? (
                  scannedStudents.map((student, index) => (
                    <div key={student.id || index} className="scanned-item">
                      <div className="scanned-info">
                        <span className="scanned-name">{student.name}</span>
                        <span className="scanned-id">{student.studentId}</span>
                      </div>
                      <span className="scanned-time">
                        {student.timestamp?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="empty-state">
                    <p>No students have joined yet.</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Attendance;
