import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword 
 } from 'firebase/auth';
import { auth } from '../../services/firebase';
import { 
  Mail, 
  Lock, 
  LogIn, 
  UserPlus, 
  AlertCircle,
  Loader2,
  GraduationCap,
  UserCircle
} from 'lucide-react';
import './Login.css';

const Login: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'admin' | 'student'>('student');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
        localStorage.setItem('pendingProfile', JSON.stringify({ name, role }));
      }

      // Check for pending attendance scan
      const pendingAttendance = localStorage.getItem('pendingAttendance');
      if (pendingAttendance) {
        navigate(`/mark/${pendingAttendance}`);
      } else {
        navigate('/');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-glass-card">
        <div className="login-header">
          <div className="login-logo">
            <GraduationCap size={40} color="var(--accent-primary)" />
            <h1>SMAS</h1>
          </div>
          <p className="login-subtitle">Student Management & Attendance System</p>
        </div>

        <div className="login-tabs">
          <button 
            className={`login-tab ${isLogin ? 'active' : ''}`}
            onClick={() => setIsLogin(true)}
          >
            Login
          </button>
          <button 
            className={`login-tab ${!isLogin ? 'active' : ''}`}
            onClick={() => setIsLogin(false)}
          >
            Register
          </button>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          {error && (
            <div className="login-error">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {!isLogin && (
            <>
              <div className="login-input-group">
                <label>Full Name</label>
                <div className="login-input-wrapper">
                  <UserCircle className="input-icon" size={20} />
                  <input 
                    type="text" 
                    placeholder="John Doe" 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    required 
                  />
                </div>
              </div>
              <div className="login-input-group">
                <label>I am a:</label>
                <div className="role-selector" style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <button 
                    type="button" 
                    className={`role-choice ${role === 'student' ? 'active' : ''}`}
                    onClick={() => setRole('student')}
                    style={{ flex: 1, padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--border-color)', background: role === 'student' ? 'var(--accent-primary)' : 'transparent', color: role === 'student' ? 'white' : 'var(--text-primary)', cursor: 'pointer', fontWeight: 600, transition: '0.2s' }}
                  >
                    Student
                  </button>
                  <button 
                    type="button" 
                    className={`role-choice ${role === 'admin' ? 'active' : ''}`}
                    onClick={() => setRole('admin')}
                    style={{ flex: 1, padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--border-color)', background: role === 'admin' ? 'var(--accent-primary)' : 'transparent', color: role === 'admin' ? 'white' : 'var(--text-primary)', cursor: 'pointer', fontWeight: 600, transition: '0.2s' }}
                  >
                    Lecturer
                  </button>
                </div>
              </div>
            </>
          )}

          <div className="login-input-group">
            <label htmlFor="email">Email Address</label>
            <div className="login-input-wrapper">
              <Mail className="input-icon" size={20} />
              <input 
                id="email"
                type="email" 
                placeholder="user@university.edu" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="login-input-group">
            <label htmlFor="password">Password</label>
            <div className="login-input-wrapper">
              <Lock className="input-icon" size={20} />
              <input 
                id="password"
                type="password" 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button className="login-submit-btn" disabled={loading}>
            {loading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : isLogin ? (
              <>
                <LogIn size={20} />
                <span>Sign In</span>
              </>
            ) : (
              <>
                <UserPlus size={20} />
                <span>Create Account</span>
              </>
            )}
          </button>
        </form>

        <div className="login-footer">
          <p>
            {isLogin 
              ? "Don't have an account?" 
              : "Already have an account?"}
            <button onClick={() => setIsLogin(!isLogin)}>
              {isLogin ? "Register now" : "Login instead"}
            </button>
          </p>
        </div>
      </div>
      
      <div className="login-bg-decoration">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
      </div>
    </div>
  );
};

export default Login;
