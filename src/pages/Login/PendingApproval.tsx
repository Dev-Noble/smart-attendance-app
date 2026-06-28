import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { ShieldAlert, LogOut, Clock } from 'lucide-react';
import './Login.css';

const PendingApproval: React.FC = () => {
  const { profile, logout } = useAuth();

  return (
    <div className="login-container">
      <div className="login-glass-card" style={{ maxWidth: '480px', padding: '3rem 2rem' }}>
        <div className="login-header">
          <div className="login-logo">
            <img src="https://upload.wikimedia.org/wikipedia/en/c/cb/Crawford_University_logo.png" alt="Crawford University Logo" style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
            <h1>SMAS</h1>
          </div>
          <p className="login-subtitle">Student Management & Attendance System</p>
        </div>

        <div style={{ textAlign: 'center', margin: '2rem 0' }}>
          <div style={{ 
            width: 80, 
            height: 80, 
            borderRadius: '50%', 
            background: 'rgba(245, 158, 11, 0.1)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            margin: '0 auto 1.5rem',
            animation: 'pulse 2s infinite'
          }}>
            <Clock size={40} color="var(--warning)" />
          </div>

          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.75rem' }}>Account Review Pending</h2>
          
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.925rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
            Hello, <strong style={{ color: 'var(--text-primary)' }}>{profile?.name || 'Lecturer'}</strong> ({profile?.email}). 
            Your registration as a <strong>Lecturer</strong> has been recorded.
          </p>

          <div style={{ 
            background: 'var(--bg-tertiary)', 
            padding: '1.25rem', 
            borderRadius: '12px', 
            border: '1px solid var(--border-color)', 
            textAlign: 'left',
            marginBottom: '2rem'
          }}>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              <ShieldAlert size={16} color="var(--warning)" />
              Verification Notice
            </h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
              To prevent unauthorized faculty access, all Lecturer accounts must be approved by a system administrator. Please contact the ICT department or your faculty dean to verify and unlock your account.
            </p>
          </div>
        </div>

        <button 
          onClick={logout}
          style={{ 
            width: '100%', 
            padding: '0.85rem', 
            borderRadius: '10px', 
            background: 'transparent', 
            border: '1px solid var(--border-color)', 
            color: 'var(--danger)', 
            fontWeight: 600, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '0.5rem', 
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          className="btn-secondary"
        >
          <LogOut size={18} />
          Sign Out of Account
        </button>
      </div>

      <div className="login-bg-decoration">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
      </div>
    </div>
  );
};

export default PendingApproval;
