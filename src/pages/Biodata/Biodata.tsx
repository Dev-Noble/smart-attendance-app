import React, { useState, useEffect } from 'react';
import { 
  User, 
  Hash,
  Book,
  Phone,
  MapPin,
  Save,
  Loader2,
  Fingerprint,
  Shield,
  CheckCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { logActivity } from '../../services/activityService';
import { syncStudentBiodata } from '../../services/studentService';
import { registerBiometrics } from '../../utils/webauthn';
import './Biodata.css';

const Biodata: React.FC = () => {
  const { profile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    studentId: '',
    major: '',
    phone: '',
    address: ''
  });

  const [registeredFingerprint, setRegisteredFingerprint] = useState<string>('');
  
  const [isEnrolling, setIsEnrolling] = useState(false);

  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || '',
        studentId: profile.studentId || '',
        major: (profile as any).major || '',
        phone: (profile as any).phone || '',
        address: (profile as any).address || ''
      });
      if ((profile as any).registeredFingerprint) {
        setRegisteredFingerprint((profile as any).registeredFingerprint);
      }
    }
  }, [profile]);

  // ─── Fingerprint Scanning Logic (Instant Click/Tap Trigger) ──────────────
  const triggerEnrollment = async () => {
    if (saving || isEnrolling) return;

    if (!formData.name || !formData.studentId) {
      alert("Please fill in your Full Name and Student ID first so we can enroll your biometric credentials.");
      return;
    }

    setIsEnrolling(true);
    try {
      console.log("[WebAuthn] Initiating instant biometric registration...");
      const email = (profile as any).email || profile?.name || '';
      const result = await registerBiometrics(formData.studentId, formData.name, email);
      
      setRegisteredFingerprint(result.token);
      alert('Hardware biometrics (Touch ID / Face ID / Windows Hello) enrolled successfully!');
    } catch (err: any) {
      console.error('Biometric registration failed:', err);
      // Keep it user-friendly
      if (err.name === 'NotAllowedError') {
        alert('Biometric registration was cancelled or timed out.');
      } else {
        alert(`Registration failed: ${err.message || err}`);
      }
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleSave = async () => {
    if (!profile) return;
    
    if (!formData.studentId) {
      alert("Student ID is required.");
      return;
    }
    if (!registeredFingerprint) {
      alert("Please register your Primary Device Fingerprint.");
      return;
    }

    setSaving(true);
    try {
      // 1. Update the user profile document
      const userRef = doc(db, 'users', profile.uid);
      await updateDoc(userRef, {
        name: formData.name,
        studentId: formData.studentId,
        major: formData.major,
        phone: formData.phone,
        address: formData.address,
        registeredFingerprint
      });

      // 2. Sync to the students collection for attendance verification
      await syncStudentBiodata(profile.email, formData.name, formData.studentId, registeredFingerprint);

      await logActivity(profile.uid, profile.name, 'Updated Biodata', 'Completed student registration profile', 'student');
      alert('Biodata updated successfully!');
    } catch (error) {
      console.error("Error updating biodata:", error);
      alert('Failed to update biodata.');
    } finally {
      setSaving(false);
    }
  };

  if (!profile || profile.role !== 'student') return null;

  return (
    <div className="biodata-page" style={{ padding: '2rem' }}>
      <div className="header-section" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>Student Biodata</h1>
          <p style={{ color: 'var(--text-tertiary)' }}>Complete your student profile to mark attendance and register for courses.</p>
        </div>
        <button 
          className="add-btn" 
          onClick={handleSave} 
          disabled={saving}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--accent-primary)', color: 'white', padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
        >
          {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
          {saving ? 'Saving...' : 'Save Biodata'}
        </button>
      </div>

      <div className="biodata-card" style={{ background: 'var(--bg-secondary)', borderRadius: '15px', padding: '2rem', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', fontSize: '1.25rem' }}>
          <User size={20} /> Personal Information
        </h3>
        
        <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Full Name</label>
            <div style={{ position: 'relative' }}>
              <User size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
              <input 
                type="text" 
                value={formData.name} 
                onChange={(e) => setFormData({...formData, name: e.target.value})} 
                style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)' }}
              />
            </div>
          </div>

          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Student ID (Matric Number) <span style={{color: 'red'}}>*</span></label>
            <div style={{ position: 'relative' }}>
              <Hash size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
              <input 
                type="text" 
                placeholder="e.g. STU001" 
                value={formData.studentId} 
                onChange={(e) => setFormData({...formData, studentId: e.target.value})}
                style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)' }}
              />
            </div>
          </div>

          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Major / Course of Study</label>
            <div style={{ position: 'relative' }}>
              <Book size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
              <input 
                type="text" 
                placeholder="e.g. Computer Science" 
                value={formData.major} 
                onChange={(e) => setFormData({...formData, major: e.target.value})}
                style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)' }}
              />
            </div>
          </div>

          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Phone Number</label>
            <div style={{ position: 'relative' }}>
              <Phone size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
              <input 
                type="tel" 
                placeholder="+1 234 567 8900" 
                value={formData.phone} 
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)' }}
              />
            </div>
          </div>

          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', gridColumn: '1 / -1' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Residential Address</label>
            <div style={{ position: 'relative' }}>
              <MapPin size={16} style={{ position: 'absolute', left: 12, top: '14px', color: 'var(--text-tertiary)' }} />
              <textarea 
                placeholder="Enter your current residential address" 
                value={formData.address} 
                onChange={(e) => setFormData({...formData, address: e.target.value})}
                style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', minHeight: '100px', resize: 'vertical' }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="biodata-card" style={{ background: 'var(--bg-secondary)', borderRadius: '15px', padding: '2rem', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', marginTop: '2rem' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', fontSize: '1.25rem' }}>
          <Shield size={20} /> Device Registration <span style={{color: 'red'}}>*</span>
        </h3>
        
        <p style={{ color: 'var(--text-tertiary)', marginBottom: '2rem', lineHeight: 1.6 }}>
          Register your primary device. Attendance marking will <strong>only</strong> be allowed from this exact browser and device combination to prevent impersonation.
        </p>

        {/* Current registration status */}
        {registeredFingerprint && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.5rem', background: 'var(--bg-tertiary)', borderRadius: '10px', marginBottom: '1.5rem' }}>
            <CheckCircle size={24} color="var(--success)" style={{ flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ color: 'var(--success)', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.25rem' }}>Device Currently Registered</p>
              <code style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: 'var(--text-tertiary)', wordBreak: 'break-all' }}>
                {registeredFingerprint.substring(0, 24)}...
              </code>
            </div>
          </div>
        )}

        {/* Modern Step-by-Step Instructions + Button */}
        <div style={{ padding: '1.5rem', background: 'var(--bg-tertiary)', borderRadius: '12px', textAlign: 'left' }}>
          <h4 style={{ fontWeight: 600, marginBottom: '0.75rem', fontSize: '0.95rem', color: 'var(--text-secondary)' }}>How to complete registration:</h4>
          <ol style={{ paddingLeft: '1.25rem', fontSize: '0.85rem', color: 'var(--text-tertiary)', lineHeight: 1.7, marginBottom: '1.5rem' }}>
            <li style={{ marginBottom: '0.4rem' }}>Click the <strong>"Start Device Registration"</strong> button below.</li>
            <li style={{ marginBottom: '0.4rem' }}>Your browser will display a secure system prompt (Windows Hello / Touch ID).</li>
            <li style={{ marginBottom: '0.4rem' }}>Place your finger on your laptop or phone's <strong>physical fingerprint reader</strong> (or look at the camera).</li>
            <li>Once completed successfully, click the main <strong>"Save Biodata"</strong> button to save your profile.</li>
          </ol>

          <button
            type="button"
            onClick={triggerEnrollment}
            disabled={saving || isEnrolling}
            style={{
              width: '100%',
              padding: '0.85rem',
              borderRadius: '8px',
              border: 'none',
              background: isEnrolling ? 'var(--bg-secondary)' : 'var(--accent-primary)',
              color: isEnrolling ? 'var(--text-secondary)' : '#fff',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: (saving || isEnrolling) ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s ease',
              boxShadow: isEnrolling ? 'none' : '0 4px 6px rgba(99, 102, 241, 0.15)'
            }}
          >
            {isEnrolling ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                <span>Waiting for Physical Device Scan...</span>
              </>
            ) : (
              <>
                <Fingerprint size={18} />
                <span>{registeredFingerprint ? 'Re-register Biometric Device' : 'Start Device Registration'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Biodata;
