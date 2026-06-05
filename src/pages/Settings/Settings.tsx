import React, { useState, useEffect } from 'react';
import { 
  User, 
  Globe, 
  Mail,
  Camera,
  LogOut,
  Save,
  Loader2,
  Trash2,
  Hash,
  Phone,
  MapPin,
  MessageSquare
} from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { logActivity } from '../../services/activityService';
import { syncStudentBiodata } from '../../services/studentService';
import { getBalance } from '../../services/smsService';
import './Settings.css';

const Settings: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { profile, logout } = useAuth();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    studentId: '',
    phone: '',
    address: ''
  });

  // Admin SMS Balance States
  const [smsBalance, setSmsBalance] = useState<string | null>(null);
  const [smsLoading, setSmsLoading] = useState(false);

  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || '',
        studentId: profile.studentId || '',
        phone: (profile as any).phone || '',
        address: (profile as any).address || ''
      });
    }
  }, [profile]);

  useEffect(() => {
    if (profile?.role === 'admin') {
      const fetchBalance = async () => {
        setSmsLoading(true);
        try {
          const res = await getBalance();
          if (res.status === 'success' && res.data) {
            setSmsBalance(res.data.formatted);
          } else {
            setSmsBalance('Error loading balance');
          }
        } catch (err) {
          setSmsBalance('API Connection Error');
        } finally {
          setSmsLoading(false);
        }
      };
      fetchBalance();
    }
  }, [profile]);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const userRef = doc(db, 'users', profile.uid);
      const updatePayload: any = {
        name: formData.name,
        studentId: formData.studentId,
        phone: formData.phone,
        address: formData.address
      };
      await updateDoc(userRef, updatePayload);

      // If user is a student, sync to the students collection
      if (profile.role === 'student') {
        await syncStudentBiodata(
          profile.email,
          formData.name,
          formData.studentId,
          (profile as any).departmentId || '',
          (profile as any).levelId || '',
          formData.phone,
          formData.address,
          (profile as any).registeredFingerprint || ''
        );
      }

      await logActivity(profile.uid, profile.name, 'Updated Profile', 'Changed personal information', 'system');
      alert('Profile updated successfully!');
    } catch (error) {
      console.error("Error updating profile:", error);
      alert('Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  if (!profile) return null;

  return (
    <div className="settings-page">
      <div className="students-header">
        <div className="header-left">
          <h1>Settings</h1>
          <p>Update your personal information and application preferences.</p>
        </div>
        <div className="header-actions">
          <button className="add-btn" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            {saving ? 'Saving...' : 'Save All Changes'}
          </button>
        </div>
      </div>

      <div className="settings-container">
        <div className="settings-card">
          <h3><User size={20} /> Personal Profile</h3>
          <div className="settings-form">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1rem' }}>
              <div className="user-avatar" style={{ width: 80, height: 80, fontSize: '1.5rem' }}>
                {profile?.name?.[0].toUpperCase() || 'U'}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <button className="btn-secondary">
                  <Camera size={16} />
                  Change Photo
                </button>
                <span className="settings-description">JPG, GIF or PNG. Max size of 800K</span>
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label>Full Name</label>
                <input 
                  type="text" 
                  value={formData.name} 
                  onChange={(e) => setFormData({...formData, name: e.target.value})} 
                />
              </div>
              <div className="form-group">
                <label>System Role</label>
                <input type="text" value={profile?.role.toUpperCase()} disabled style={{ backgroundColor: 'var(--bg-tertiary)', cursor: 'not-allowed' }} />
              </div>
            </div>

            {profile?.role === 'student' && (
              <div className="form-group">
                <label>Student ID (Matric Number)</label>
                <div style={{ position: 'relative' }}>
                  <Hash size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                  <input 
                    type="text" 
                    placeholder="e.g. STU001" 
                    value={formData.studentId} 
                    onChange={(e) => setFormData({...formData, studentId: e.target.value})}
                    style={{ paddingLeft: '2.5rem' }}
                  />
                </div>
              </div>
            )}

            <div className="form-group">
              <label>Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                <input type="email" value={profile?.email || ''} disabled style={{ paddingLeft: '2.5rem', cursor: 'not-allowed', backgroundColor: 'var(--bg-tertiary)' }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label>Phone Number</label>
                <div style={{ position: 'relative' }}>
                  <Phone size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                  <input 
                    type="tel" 
                    placeholder="+234 800 123 4567"
                    value={formData.phone} 
                    onChange={(e) => setFormData({...formData, phone: e.target.value})} 
                    style={{ paddingLeft: '2.5rem' }}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Residential Address</label>
                <div style={{ position: 'relative' }}>
                  <MapPin size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                  <input 
                    type="text" 
                    placeholder="Lagos, Nigeria"
                    value={formData.address} 
                    onChange={(e) => setFormData({...formData, address: e.target.value})} 
                    style={{ paddingLeft: '2.5rem' }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="settings-card">
          <h3><Globe size={20} /> App Preferences</h3>
          <div className="settings-list">
            <div className="settings-row">
              <div className="settings-info">
                <span className="settings-label">Dark Mode</span>
                <span className="settings-description">Toggle between light and dark themes.</span>
              </div>
              <label className="switch">
                <input type="checkbox" checked={theme === 'dark'} onChange={toggleTheme} />
                <span className="slider"></span>
              </label>
            </div>
          </div>
        </div>

        {profile?.role === 'admin' && (
          <div className="settings-card">
            <h3><MessageSquare size={20} /> SMS Gateway Configuration</h3>
            <div className="settings-list" style={{ marginTop: '1rem' }}>
              <div className="settings-row">
                <div className="settings-info">
                  <span className="settings-label">SMS Provider</span>
                  <span className="settings-description">Active API endpoint for bulk messaging services.</span>
                </div>
                <span className="student-id-tag" style={{ background: 'var(--bg-tertiary)', padding: '0.4rem 0.8rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold', border: 'none', color: 'var(--text-secondary)' }}>
                  BulkSMS Nigeria v2
                </span>
              </div>
              
              <div className="settings-row">
                <div className="settings-info">
                  <span className="settings-label">API Mode</span>
                  <span className="settings-description">Toggle sandbox simulation or real production delivery in environment variables.</span>
                </div>
                <span className={`status-pill pill-${import.meta.env.VITE_BULKSMS_MODE === 'production' ? 'active' : 'inactive'}`} style={{ textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 'bold' }}>
                  {import.meta.env.VITE_BULKSMS_MODE || 'sandbox'}
                </span>
              </div>
              
              <div className="settings-row">
                <div className="settings-info">
                  <span className="settings-label">Wallet Balance</span>
                  <span className="settings-description">Current credits available for sending notifications.</span>
                </div>
                {smsLoading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <span style={{ fontWeight: 'bold', color: smsBalance?.includes('Error') || smsBalance?.includes('Connection') ? 'var(--danger)' : 'var(--success)', fontSize: '1.1rem' }}>
                    {smsBalance || '₦0.00'}
                  </span>
                )}
              </div>
              
              <div className="settings-row">
                <div className="settings-info">
                  <span className="settings-label">Sender ID</span>
                  <span className="settings-description">ID displayed on recipient mobile devices (Max 11 chars).</span>
                </div>
                <code style={{ background: 'var(--bg-tertiary)', padding: '0.25rem 0.6rem', borderRadius: '4px', fontFamily: 'monospace', color: 'var(--accent-primary)', fontSize: '0.85rem' }}>
                  {import.meta.env.VITE_BULKSMS_SENDER_ID || 'SMAS'}
                </code>
              </div>
            </div>
          </div>
        )}

        {profile?.role === 'admin' && (
          <div className="settings-card danger-zone">
            <h3><Trash2 size={20} color="var(--danger)" /> Danger Zone</h3>
            <p className="settings-description">These actions are destructive and cannot be reversed.</p>
            <div className="settings-list" style={{ marginTop: '1rem' }}>
              <div className="settings-row">
                <div className="settings-info">
                  <span className="settings-label">Reset All Data</span>
                  <span className="settings-description">Wipe all students and attendance sessions.</span>
                </div>
                <button className="btn-secondary" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}>Reset</button>
              </div>
            </div>
          </div>
        )}

        <div className="settings-card" style={{ border: 'none', background: 'transparent', boxShadow: 'none' }}>
          <button className="btn-secondary" onClick={logout} style={{ width: '100%', justifyContent: 'center', height: '50px', gap: '0.5rem', color: 'var(--danger)' }}>
            <LogOut size={20} />
            Sign Out of Account
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
