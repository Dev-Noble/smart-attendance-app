import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { CheckCircle, Loader2, AlertCircle, LogIn } from 'lucide-react';
import { logActivity } from '../../services/activityService';
import './Attendance.css';

const MarkAttendance: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'already-marked'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (authLoading) return;

    if (!profile) {
      // Store the session ID in local storage so we can mark attendance after login
      if (sessionId) localStorage.setItem('pendingAttendance', sessionId);
      setStatus('error');
      setMessage('You need to be logged in to mark attendance.');
      return;
    }

    if (profile.role !== 'student') {
      setStatus('error');
      setMessage('Only student accounts can mark attendance via this link.');
      return;
    }

    if (!profile.studentId) {
      setStatus('error');
      setMessage('Please set your Student ID in Settings before marking attendance.');
      return;
    }

    handleMarking();
  }, [profile, authLoading, sessionId]);

  const handleMarking = async () => {
    if (!sessionId || !profile?.studentId) return;

    try {
      const sessionRef = doc(db, 'sessions', sessionId);
      const sessionSnap = await getDoc(sessionRef);

      if (!sessionSnap.exists()) {
        setStatus('error');
        setMessage('This attendance session does not exist or has expired.');
        return;
      }

      if (sessionSnap.data().status === 'ended') {
        setStatus('error');
        setMessage('This session has already ended.');
        return;
      }

      const presentList = sessionSnap.data().studentsPresent || [];
      if (presentList.includes(profile.studentId)) {
        setStatus('already-marked');
        setMessage('You have already marked your attendance for this session.');
        return;
      }

      // Add student to session
      await updateDoc(sessionRef, {
        studentsPresent: arrayUnion(profile.studentId)
      });

      // Log the activity
      await logActivity(profile.uid, profile.name, 'Marked Attendance', `Joined session via QR code`, 'attendance');

      setStatus('success');
      setMessage('Attendance successfully recorded!');
      
      // Clear pending attendance if it exists
      localStorage.removeItem('pendingAttendance');
    } catch (error) {
      console.error("Error marking attendance:", error);
      setStatus('error');
      setMessage('Failed to mark attendance. Please try again or contact your lecturer.');
    }
  };

  if (authLoading || status === 'loading') {
    return (
      <div className="attendance-page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <Loader2 className="animate-spin" size={48} color="var(--accent-primary)" />
        <p style={{ marginTop: '1rem' }}>Processing your attendance...</p>
      </div>
    );
  }

  return (
    <div className="attendance-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', padding: '1rem' }}>
      <div className="qr-card" style={{ maxWidth: '400px', width: '100%', textAlign: 'center', padding: '3rem 2rem' }}>
        {status === 'success' && <CheckCircle size={64} color="var(--success)" style={{ margin: '0 auto 1.5rem' }} />}
        {status === 'already-marked' && <CheckCircle size={64} color="var(--accent-primary)" style={{ margin: '0 auto 1.5rem' }} />}
        {status === 'error' && <AlertCircle size={64} color="var(--danger)" style={{ margin: '0 auto 1.5rem' }} />}

        <h2 style={{ marginBottom: '1rem', fontSize: '1.75rem' }}>
          {status === 'success' ? 'Success!' : status === 'already-marked' ? 'Already Done' : 'Attendance Error'}
        </h2>
        
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', lineHeight: 1.6 }}>{message}</p>

        {status === 'error' && !profile ? (
          <button className="add-btn" style={{ width: '100%' }} onClick={() => navigate('/login')}>
            <LogIn size={20} />
            Login to Continue
          </button>
        ) : (
          <button className="btn-secondary" style={{ width: '100%' }} onClick={() => navigate('/')}>
            Go to Dashboard
          </button>
        )}
      </div>
    </div>
  );
};

export default MarkAttendance;
