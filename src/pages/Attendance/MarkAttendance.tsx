import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { CheckCircle, Loader2, AlertCircle, LogIn, Shield, Fingerprint } from 'lucide-react';
import { logActivity } from '../../services/activityService';
import { getDeviceFingerprint } from '../../utils/deviceFingerprint';
import { verifyBiometrics } from '../../utils/webauthn';
import { getCurrentPosition, getEffectiveDistance, getDistanceMeters } from '../../utils/geolocation';
import './Attendance.css';

type StatusType = 'loading' | 'success' | 'error' | 'already-marked' | 'ready-to-scan';

const MarkAttendance: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<StatusType>('loading');
  const [message, setMessage] = useState('');
  const [detail, setDetail] = useState('');
  const [deviceFingerprint, setDeviceFingerprint] = useState<string>('');

  const [isVerifying, setIsVerifying] = useState(false);



  useEffect(() => {
    if (authLoading) return;

    if (!profile) {
      if (sessionId) localStorage.setItem('pendingAttendance', sessionId);
      setStatus('error');
      setMessage('Login Required');
      setDetail('You need to be logged in to mark attendance.');
      return;
    }

    if (profile.role !== 'student') {
      setStatus('error');
      setMessage('Students Only');
      setDetail('Only student accounts can mark attendance via this link.');
      return;
    }

    if (!profile.studentId) {
      setStatus('error');
      setMessage('Student ID Missing');
      setDetail('Please complete your Biodata and set your Student ID before marking attendance.');
      return;
    }

    const loadFP = async () => {
      const fp = await getDeviceFingerprint();
      setDeviceFingerprint(fp);
    };
    loadFP();

    handleMarking();
  }, [profile, authLoading, sessionId]);

  const triggerVerification = () => {
    if (status !== 'ready-to-scan' || !deviceFingerprint || isVerifying) return;
    performDatabaseUpdate();
  };

  const [sessionRef, setSessionRef] = useState<any>(null);
  const [fingerprintToSave, setFingerprintToSave] = useState<string>('');

  const handleMarking = async () => {
    if (!sessionId || !profile?.studentId) return;

    try {
      const sessionRef = doc(db, 'sessions', sessionId);
      const sessionSnap = await getDoc(sessionRef);

      if (!sessionSnap.exists()) {
        setStatus('error');
        setMessage('Session Not Found');
        setDetail('This attendance session does not exist or has expired.');
        return;
      }

      const sessionData = sessionSnap.data();

      if (!sessionData.isActive) {
        setStatus('error');
        setMessage('Session Ended');
        setDetail('This session has already ended. Please contact your lecturer.');
        return;
      }

      // ── Check 1: Already marked ────────────────────────────────────────────
      if ((sessionData.studentsPresent || []).includes(profile.studentId)) {
        setStatus('already-marked');
        setMessage('Already Recorded');
        setDetail('Your attendance for this session has already been marked.');
        return;
      }

      // ── Check 2: Primary Device Match ────────────────────────────────────────
      const registeredFingerprint = (profile as any).registeredFingerprint;

      if (!registeredFingerprint || !registeredFingerprint.startsWith('webauthn:')) {
        setStatus('error');
        setMessage('Device Not Registered');
        setDetail('You have not registered your native biometrics. Please complete registration in Biodata first.');
        return;
      }

      // ── Check 2.1: One scan per device (Extra Safety) ──────────────────────
      const fingerprint = await getDeviceFingerprint(); // Still get browser hash for session fingerprint logs
      const usedFingerprints: string[] = sessionData.deviceFingerprints || [];

      if (usedFingerprints.includes(fingerprint) && !(sessionData.studentsPresent || []).includes(profile.studentId)) {
        setStatus('error');
        setMessage('Device Already Used');
        setDetail('This device has already been used to mark attendance in this session. You cannot mark attendance for multiple accounts from the same device.');
        return;
      }

      // ── Check 3: Geolocation Radius ────────────────────────────────────────
      if (sessionData.lecturerLocation) {
        try {
          setDetail('Verifying your location...');
          const studentLocation = await getCurrentPosition();
          const effectiveDistance = getEffectiveDistance(sessionData.lecturerLocation, studentLocation);
          const radius = sessionData.allowedRadius ?? 100;

          if (effectiveDistance > radius) {
            const lecturerAccuracy = sessionData.lecturerLocation.accuracy ?? 0;
            const studentAccuracy = studentLocation.accuracy ?? 0;

            // If either device reports low precision (> 80m accuracy), bypass geofence check to prevent false negatives
            if (lecturerAccuracy > 80 || studentAccuracy > 80) {
              console.warn("Bypassing geofence check due to low GPS precision:", { lecturerAccuracy, studentAccuracy });
            } else {
              const rawDistance = Math.round(getDistanceMeters(sessionData.lecturerLocation, studentLocation));
              setStatus('error');
              setMessage('Outside Classroom');
              setDetail(`You appear to be ~${rawDistance}m from the classroom. You must be within ${radius}m to mark attendance. Please move closer and try again.`);
              return;
            }
          }
        } catch (geoErr: any) {
          setStatus('error');
          setMessage('Location Required');
          setDetail(geoErr.message);
          return;
        }
      }

      // ── All checks passed ──────────────────────────────────────────────────
      setSessionRef(sessionRef);
      setFingerprintToSave(fingerprint);
      setStatus('ready-to-scan'); // Custom state to trigger scanner UI
      
    } catch (error) {
      console.error('Error marking attendance:', error);
      setStatus('error');
      setMessage('Something Went Wrong');
      setDetail('Failed to mark attendance. Please try again or contact your lecturer.');
    }
  };

  const performDatabaseUpdate = async () => {
    if (!sessionRef || !profile?.studentId) return;
    setStatus('loading'); // Show loader during write
    
    try {
      const registeredFingerprint = (profile as any).registeredFingerprint || '';
      
      if (!registeredFingerprint.startsWith('webauthn:')) {
        setStatus('error');
        setMessage('Biometrics Outdated');
        setDetail('Your biometric registration is outdated. Please register biometrics in Biodata.');
        return;
      }

      const email = profile.email || '';
      const verified = await verifyBiometrics(registeredFingerprint, email);
      if (!verified) {
        setStatus('error');
        setMessage('Biometric Failed');
        setDetail('Native biometric verification was denied or timed out. Please scan the correct finger.');
        return;
      }

      await updateDoc(sessionRef, {
        studentsPresent: arrayUnion(profile.studentId),
        deviceFingerprints: arrayUnion(fingerprintToSave)
      });

      await logActivity(
        profile.uid,
        profile.name,
        'Marked Attendance',
        `Joined session via QR code`,
        'attendance'
      );

      localStorage.removeItem('pendingAttendance');
      setStatus('success');
      setMessage('Attendance Recorded!');
      setDetail('Your presence has been successfully logged for this session.');
    } catch (err) {
      console.error(err);
      setStatus('error');
      setMessage('Database Error');
      setDetail('Could not record attendance. Please try again.');
    }
  };

  if (authLoading || (status === 'loading' && !sessionRef)) {
    return (
      <div className="attendance-page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '1.5rem' }}>
        <Loader2 className="animate-spin" size={48} color="var(--accent-primary)" />
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Verifying your attendance...</p>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Shield size={12} />
              <span>Checking device fingerprint...</span>
            </div>
            {deviceFingerprint && (
              <code style={{ background: 'var(--bg-tertiary)', padding: '0.1rem 0.3rem', borderRadius: '4px', fontFamily: 'monospace' }}>
                {deviceFingerprint.substring(0, 16)}...
              </code>
            )}
          </div>
        </div>
      </div>
    );
  }

  const icon = () => {
    if (status === 'success') return <CheckCircle size={64} color="var(--success)" />;
    if (status === 'already-marked') return <CheckCircle size={64} color="var(--accent-primary)" />;
    return <AlertCircle size={64} color="var(--danger)" />;
  };

  const bgColor = () => {
    if (status === 'success') return 'rgba(16,185,129,0.1)';
    if (status === 'already-marked') return 'rgba(99,102,241,0.1)';
    return 'rgba(239,68,68,0.1)';
  };

  return (
    <div className="attendance-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', padding: '1rem' }}>
      <div className="qr-card" style={{ maxWidth: '420px', width: '100%', textAlign: 'center', padding: '3rem 2rem' }}>

        <div style={{ width: 96, height: 96, borderRadius: '50%', background: bgColor(), display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
          {icon()}
        </div>

        <h2 style={{ marginBottom: '0.75rem', fontSize: '1.75rem' }}>{message || 'Ready to Verify'}</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', lineHeight: 1.7, fontSize: '0.95rem' }}>
          {status === 'ready-to-scan' ? 'Please hold your finger on the sensor below to complete verification.' : detail}
        </p>

        {status === 'ready-to-scan' && (
          <div style={{ textAlign: 'center' }}>
            <div 
              className={`scanner-container ${isVerifying ? 'active' : ''}`}
              onClick={triggerVerification}
              style={{
                cursor: isVerifying ? 'not-allowed' : 'pointer',
                opacity: isVerifying ? 0.6 : 1,
                margin: '0 auto 1.5rem',
                width: '120px',
                height: '120px',
                position: 'relative'
              }}
            >
              <div className="scanner-circle"></div>
              <div className="scan-line"></div>
              <Fingerprint className="fingerprint-icon" size={60} style={{ transition: 'transform 0.2s', transform: isVerifying ? 'scale(1.15)' : 'scale(1)' }} />
            </div>
            <span className="scanner-label" style={{ display: 'block', marginBottom: '2rem', fontWeight: 600 }}>
              {isVerifying ? 'Verifying identity...' : 'Tap to Scan & Mark Presence'}
            </span>
          </div>
        )}

        {status === 'loading' && sessionRef && (
          <div style={{ padding: '2rem 0', textAlign: 'center' }}>
            <Loader2 className="animate-spin" size={48} color="var(--accent-primary)" style={{ margin: '0 auto 1rem' }} />
            <p style={{ fontWeight: 600 }}>Verifying Fingerprint...</p>
          </div>
        )}

        {/* Security badge */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '1.5rem', padding: '0.75rem', background: 'var(--bg-tertiary)', borderRadius: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Shield size={12} color="var(--accent-primary)" />
            <span>Protected by Device Fingerprint + Geolocation</span>
          </div>
          <div style={{ opacity: 0.8, display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
            <span>Device Signature:</span>
            <code style={{ background: 'var(--bg-secondary)', padding: '0.1rem 0.3rem', borderRadius: '4px', fontFamily: 'monospace', color: 'var(--accent-primary)' }}>
              {deviceFingerprint ? `${deviceFingerprint.substring(0, 12)}...` : 'Generating...'}
            </code>
          </div>
        </div>

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
