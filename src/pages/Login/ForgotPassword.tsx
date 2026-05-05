import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './Login.css';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const { resetPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await resetPassword(email);
      setSuccess(true);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card glass">
          <div className="login-header">
            <Link to="/login" className="back-link">
              <ArrowLeft size={20} />
              Back to Login
            </Link>
            <h1>Reset Password</h1>
            <p>Enter your email and we'll send you instructions to reset your password.</p>
          </div>

          {success ? (
            <div className="success-state" style={{ textAlign: 'center', padding: '2rem 0' }}>
              <CheckCircle2 size={64} color="var(--success)" style={{ margin: '0 auto 1.5rem' }} />
              <h2 style={{ color: 'var(--success)', marginBottom: '1rem' }}>Email Sent!</h2>
              <p style={{ color: 'var(--text-secondary)' }}>
                Please check your inbox at <strong>{email}</strong> for the reset link.
              </p>
              <Link to="/login" className="login-submit-btn" style={{ display: 'block', marginTop: '2rem', textDecoration: 'none', textAlign: 'center' }}>
                Return to Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="login-form">
              {error && <div className="error-message">{error}</div>}
              
              <div className="login-input-group">
                <label>Email Address</label>
                <div className="login-input-wrapper">
                  <Mail className="input-icon" size={20} />
                  <input 
                    type="email" 
                    placeholder="name@university.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required 
                  />
                </div>
              </div>

              <button type="submit" className="login-submit-btn" disabled={loading}>
                {loading ? <Loader2 className="animate-spin" /> : 'Send Reset Link'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
