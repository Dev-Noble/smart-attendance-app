import React, { useState, useEffect } from 'react';
import { 
  Users, 
  QrCode, 
  Play, 
  Square, 
  Clock, 
  CheckCircle,
  AlertCircle,
  Loader2,
  MapPin,
  Shield,
  SlidersHorizontal
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { doc, updateDoc, getDoc, onSnapshot, setDoc, arrayUnion } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/firebase';
import { createAttendanceSession, endAttendanceSession, subscribeToSession } from '../../services/attendanceService';
import { getStudentByStudentId, getStudents } from '../../services/studentService';
import { getLecturerCourses } from '../../services/courseService';
import type { Course } from '../../services/courseService';
import { logActivity } from '../../services/activityService';
import { getDeviceFingerprint } from '../../utils/deviceFingerprint';
import { getCurrentPosition, getDistanceMeters } from '../../utils/geolocation';
import type { GeoCoords } from '../../utils/geolocation';
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
  const [timeLeft, setTimeLeft] = useState(1200);
  const [scannedStudents, setScannedStudents] = useState<ScannedStudent[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [lecturerCourses, setLecturerCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [activeCourseInfo, setActiveCourseInfo] = useState<{code: string, title: string} | null>(null);

  // Security state
  const [allowedRadius, setAllowedRadius] = useState(100);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [locationStatus, setLocationStatus] = useState<string>('');
  const [securityError, setSecurityError] = useState<string>('');
  const [attendanceStatus, setAttendanceStatus] = useState<'idle' | 'success' | 'error' | 'already-marked'>('idle');

  useEffect(() => {
    fetchStudents();

    const q = onSnapshot(doc(db, 'system', 'status'), async (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.activeSessionId) {
          setSessionId(data.activeSessionId);
          setIsSessionActive(true);

          const sessionSnap = await getDoc(doc(db, 'sessions', data.activeSessionId));
          if (sessionSnap.exists()) {
            const sessionData = sessionSnap.data();
            setActiveCourseInfo({
              code: sessionData.courseId || '',
              title: sessionData.courseName || ''
            });
          }
        } else {
          setIsSessionActive(false);
          setSessionId('');
          setActiveCourseInfo(null);
          setAttendanceStatus('idle');
          setSecurityError('');
        }
      }
    });

    if (profile?.role === 'lecturer' || profile?.role === 'admin') {
      loadLecturerCourses();
    }

    return () => q();
  }, [profile]);

  const loadLecturerCourses = async () => {
    if (!profile) return;
    const data = await getLecturerCourses(profile.uid);
    setLecturerCourses(data);
    if (data.length > 0) setSelectedCourseId(data[0].id || '');
  };

  const fetchStudents = async () => {
    const data = await getStudents();
    setStudents(data);
  };

  useEffect(() => {
    let unsubscribe: () => void;

    if (sessionId && (profile?.role === 'admin' || profile?.role === 'lecturer')) {
      unsubscribe = subscribeToSession(sessionId, async (sessionData) => {
        if (sessionData.studentsPresent) {
          const studentData = await Promise.all(
            sessionData.studentsPresent.map((id: string) => getStudentByStudentId(id))
          );
          setScannedStudents(
            studentData.filter(s => s !== null).map(s => ({
              id: s.id, name: s.name, studentId: s.studentId, timestamp: new Date()
            }))
          );
        }
      });
    }

    return () => { if (unsubscribe) unsubscribe(); };
  }, [sessionId, profile]);

  useEffect(() => {
    let timer: any;
    if (isSessionActive && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
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

  // ─── LECTURER: Start Session with GPS ────────────────────────────────────────
  const startSession = async () => {
    if (!profile || !selectedCourseId) {
      if (!selectedCourseId) alert('Please select a course first.');
      return;
    }

    const selectedCourse = lecturerCourses.find(c => c.id === selectedCourseId);
    if (!selectedCourse) return;

    setGettingLocation(true);
    setLocationStatus('Getting your classroom location...');
    let lecturerLocation: GeoCoords | undefined;

    try {
      lecturerLocation = await getCurrentPosition();
      setLocationStatus(`📍 Location captured (${lecturerLocation.lat.toFixed(4)}, ${lecturerLocation.lng.toFixed(4)})`);
    } catch (err: any) {
      // Location is optional for lecturer — warn but allow session to start
      setLocationStatus('⚠️ Location not captured. Geolocation check will be disabled.');
    } finally {
      setGettingLocation(false);
    }

    try {
      const newSessionId = await createAttendanceSession(
        profile.uid,
        selectedCourse.code,
        selectedCourse.title,
        lecturerLocation,
        allowedRadius
      );
      await setDoc(doc(db, 'system', 'status'), { activeSessionId: newSessionId }, { merge: true });
      await logActivity(profile.uid, profile.name, 'Started Session', `Course: ${selectedCourse.code}`, 'attendance');
      setSessionId(newSessionId);
      setIsSessionActive(true);
      setTimeLeft(1200);
      setActiveCourseInfo({ code: selectedCourse.code, title: selectedCourse.title });
    } catch (error) {
      console.error('Error starting session:', error);
      alert('Failed to start session. Please try again.');
    }
  };

  const stopSession = async () => {
    if (sessionId) {
      await endAttendanceSession(sessionId);
      await setDoc(doc(db, 'system', 'status'), { activeSessionId: null }, { merge: true });
      await logActivity(profile?.uid || 'system', profile?.name || 'Lecturer', 'Ended Session', `Course: ${activeCourseInfo?.code || 'Unknown'}`, 'attendance');
    }
    setIsSessionActive(false);
    setSessionId('');
    setActiveCourseInfo(null);
    setLocationStatus('');
  };

  // ─── STUDENT: Mark Attendance with Security Checks ──────────────────────────
  const handleStudentScan = async (studentId: string) => {
    if (!sessionId) {
      setSecurityError('No active session found.');
      return;
    }

    setSaving(true);
    setSecurityError('');

    try {
      const sessionRef = doc(db, 'sessions', sessionId);
      const sessionSnap = await getDoc(sessionRef);

      if (!sessionSnap.exists()) {
        setSecurityError('Session not found or has expired.');
        setSaving(false);
        return;
      }

      const sessionData = sessionSnap.data();

      // ── Check 1: Already marked? ──────────────────────────────────────────
      if ((sessionData.studentsPresent || []).includes(studentId)) {
        setAttendanceStatus('already-marked');
        setSaving(false);
        return;
      }

      // ── Check 2: Device Fingerprint ───────────────────────────────────────
      const fingerprint = await getDeviceFingerprint();
      const usedFingerprints: string[] = sessionData.deviceFingerprints || [];
      if (usedFingerprints.includes(fingerprint)) {
        setSecurityError('🚫 This device has already been used to mark attendance in this session. Attendance cannot be marked for multiple accounts from the same device.');
        setAttendanceStatus('error');
        setSaving(false);
        return;
      }

      // ── Check 3: Geolocation Radius ───────────────────────────────────────
      if (sessionData.lecturerLocation) {
        try {
          const studentLocation = await getCurrentPosition();
          const distance = getDistanceMeters(sessionData.lecturerLocation, studentLocation);
          const radius = sessionData.allowedRadius ?? 100;

          if (distance > radius) {
            setSecurityError(`📍 You are ${Math.round(distance)}m away from the classroom. You must be within ${radius}m to mark attendance. Please move closer and try again.`);
            setAttendanceStatus('error');
            setSaving(false);
            return;
          }
        } catch (geoErr: any) {
          setSecurityError(`📍 ${geoErr.message}`);
          setAttendanceStatus('error');
          setSaving(false);
          return;
        }
      }

      // ── All checks passed — record attendance ──────────────────────────────
      await updateDoc(sessionRef, {
        studentsPresent: arrayUnion(studentId),
        deviceFingerprints: arrayUnion(fingerprint)
      });

      await logActivity(
        profile?.uid || 'system',
        profile?.name || 'Student',
        'Marked Attendance',
        `Joined session ${sessionId}`,
        'attendance'
      );

      setAttendanceStatus('success');

    } catch (error) {
      console.error('Error marking attendance:', error);
      setSecurityError('Failed to mark attendance. Please try again.');
      setAttendanceStatus('error');
    } finally {
      setSaving(false);
    }
  };

  if (!profile) return null;

  return (
    <div className="attendance-page">
      <div className="attendance-header">
        <h1>{profile.role === 'student' ? 'Mark Attendance' : 'Attendance Session'}</h1>
        <p>{isSessionActive && activeCourseInfo
          ? `${activeCourseInfo.code} - ${activeCourseInfo.title}`
          : profile.role === 'student'
            ? 'Wait for a session to start'
            : 'Generate and monitor the lecture QR code'
        }</p>
      </div>

      <div className="attendance-container">
        {/* ── STUDENT VIEW ─────────────────────────────────────────────────── */}
        {profile.role === 'student' ? (
          <div className="qr-card" style={{ maxWidth: '420px', margin: '0 auto', textAlign: 'center' }}>
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
                    <p style={{ fontSize: '0.875rem' }}>Please set your <strong>Student ID</strong> in your Biodata before marking attendance.</p>
                  </div>
                ) : attendanceStatus === 'success' ? (
                  <div style={{ textAlign: 'center' }}>
                    <CheckCircle size={56} color="var(--success)" style={{ margin: '0 auto 1rem' }} />
                    <h3 style={{ color: 'var(--success)', marginBottom: '0.5rem' }}>Attendance Recorded!</h3>
                    <p style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>Your presence has been successfully logged.</p>
                  </div>
                ) : attendanceStatus === 'already-marked' ? (
                  <div style={{ textAlign: 'center' }}>
                    <CheckCircle size={56} color="var(--accent-primary)" style={{ margin: '0 auto 1rem' }} />
                    <h3 style={{ marginBottom: '0.5rem' }}>Already Marked</h3>
                    <p style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>You've already marked attendance for this session.</p>
                  </div>
                ) : (
                  <>
                    {securityError && (
                      <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', color: '#ef4444', fontSize: '0.875rem', textAlign: 'left' }}>
                        {securityError}
                      </div>
                    )}
                    <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'var(--bg-tertiary)', borderRadius: '10px', display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                      <Shield size={14} color="var(--accent-primary)" />
                      <span>Your device & location will be verified</span>
                    </div>
                    <button
                      className="start-btn"
                      disabled={saving}
                      style={{ width: '100%', height: '60px', borderRadius: '15px', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                      onClick={() => handleStudentScan(profile.studentId || '')}
                    >
                      {saving ? <Loader2 className="animate-spin" size={24} /> : <CheckCircle size={24} />}
                      {saving ? 'Verifying...' : 'Confirm My Attendance'}
                    </button>
                    <p className="qr-hint" style={{ marginTop: '1.5rem' }}>Session is active. Click above to register your presence.</p>
                  </>
                )}
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
          /* ── LECTURER/ADMIN VIEW ─────────────────────────────────────────── */
          <>
            <div className="qr-section">
              <div className="qr-card">
                <div className={`qr-placeholder ${isSessionActive ? 'active' : ''}`}>
                  {isSessionActive ? (
                    <QRCodeCanvas
                      value={`${window.location.origin}/mark/${sessionId}`}
                      size={200} level="H" includeMargin={true}
                    />
                  ) : (
                    <QrCode size={80} color="var(--text-tertiary)" strokeWidth={1} />
                  )}
                </div>

                <div className="session-timer">{formatTime(timeLeft)}</div>

                <div className="session-controls">
                  {!isSessionActive ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
                      {/* Course Select */}
                      <div className="form-group" style={{ textAlign: 'left' }}>
                        <label style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', display: 'block' }}>Select Course</label>
                        <select
                          value={selectedCourseId}
                          onChange={(e) => setSelectedCourseId(e.target.value)}
                          style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                        >
                          {lecturerCourses.length === 0
                            ? <option value="">No courses available</option>
                            : lecturerCourses.map(c => (
                              <option key={c.id} value={c.id}>{c.code} - {c.title}</option>
                            ))
                          }
                        </select>
                      </div>

                      {/* Radius Slider */}
                      <div className="form-group" style={{ textAlign: 'left' }}>
                        <label style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <SlidersHorizontal size={14} />
                          Allowed Radius: <strong>{allowedRadius}m</strong>
                        </label>
                        <input
                          type="range" min={20} max={500} step={10}
                          value={allowedRadius}
                          onChange={(e) => setAllowedRadius(Number(e.target.value))}
                          style={{ width: '100%' }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
                          <span>20m (tight)</span><span>500m (wide)</span>
                        </div>
                      </div>

                      {/* Location status */}
                      {locationStatus && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', padding: '0.5rem 0.75rem', background: 'var(--bg-tertiary)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <MapPin size={12} />
                          {locationStatus}
                        </div>
                      )}

                      <button
                        className="start-btn"
                        onClick={startSession}
                        disabled={lecturerCourses.length === 0 || gettingLocation}
                      >
                        {gettingLocation
                          ? <><Loader2 size={20} className="animate-spin" /> Getting location...</>
                          : <><Play size={20} fill="currentColor" /> Start Session</>
                        }
                      </button>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-tertiary)', justifyContent: 'center' }}>
                        <Shield size={12} color="var(--accent-primary)" />
                        Device fingerprint + geolocation checks enabled
                      </div>
                    </div>
                  ) : (
                    <button className="stop-btn" onClick={stopSession}>
                      <Square size={20} fill="currentColor" />
                      Stop Session
                    </button>
                  )}
                </div>

                <p className="qr-hint">
                  {isSessionActive
                    ? 'Students can now scan the code to mark attendance.'
                    : 'Generate a new QR code to start the lecture attendance.'}
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
                {isSessionActive && (
                  <div style={{ marginTop: '1rem', padding: '0.6rem', background: 'var(--bg-tertiary)', borderRadius: '8px', fontSize: '0.75rem', color: 'var(--text-tertiary)', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                    <Shield size={12} color="var(--accent-primary)" />
                    Radius: {allowedRadius}m · Fingerprint: ON
                  </div>
                )}
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
