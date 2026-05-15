import React, { useState, useEffect } from 'react';
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  query,
  orderBy,
  where
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import { logActivity } from '../../services/activityService';
import {
  Shield,
  Trash2,
  UserCog,
  Loader2,
  Search,
  Users,
  GraduationCap,
  BookOpen,
  AlertTriangle
} from 'lucide-react';
import './AdminPanel.css';

interface AppUser {
  uid: string;
  email: string;
  name: string;
  role: 'admin' | 'lecturer' | 'student';
  createdAt: any;
  studentId?: string;
}

const ROLES = ['admin', 'lecturer', 'student'] as const;

const AdminPanel: React.FC = () => {
  const { profile } = useAuth();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AppUser | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({ uid: d.id, ...d.data() } as AppUser));
      setUsers(data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (uid: string, newRole: AppUser['role']) => {
    if (uid === profile?.uid) {
      alert("You cannot change your own role.");
      return;
    }
    setActionLoading(uid + '_role');
    try {
      await updateDoc(doc(db, 'users', uid), { role: newRole });
      await logActivity(profile?.uid || '', profile?.name || 'Admin', 'Changed Role', `User ${uid} role changed to ${newRole}`, 'system');
      setUsers(prev => prev.map(u => u.uid === uid ? { ...u, role: newRole } : u));
    } catch (error) {
      console.error('Failed to change role:', error);
      alert('Failed to update role. Check your permissions.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUser = async (user: AppUser) => {
    if (user.uid === profile?.uid) {
      alert("You cannot delete your own account.");
      return;
    }
    setActionLoading(user.uid + '_delete');
    try {
      // 1. Delete from `users` collection
      await deleteDoc(doc(db, 'users', user.uid));

      // 2. Delete from `students` collection (if exists, matched by email)
      const studentQuery = query(collection(db, 'students'), where('email', '==', user.email));
      const studentSnap = await getDocs(studentQuery);
      for (const studentDoc of studentSnap.docs) {
        await deleteDoc(doc(db, 'students', studentDoc.id));
      }

      await logActivity(profile?.uid || '', profile?.name || 'Admin', 'Deleted User', `Removed user ${user.name} (${user.email})`, 'system');
      setUsers(prev => prev.filter(u => u.uid !== user.uid));
      setConfirmDelete(null);
    } catch (error) {
      console.error('Failed to delete user:', error);
      alert('Failed to delete user data. Check your Firestore permissions.');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredUsers = users.filter(u =>
    u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.uid.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: users.length,
    admins: users.filter(u => u.role === 'admin').length,
    lecturers: users.filter(u => u.role === 'lecturer').length,
    students: users.filter(u => u.role === 'student').length,
  };

  const roleIcon = (role: string) => {
    if (role === 'admin') return <Shield size={14} />;
    if (role === 'lecturer') return <BookOpen size={14} />;
    return <GraduationCap size={14} />;
  };

  if (!profile || profile.role !== 'admin') {
    return (
      <div className="admin-panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-tertiary)' }}>
          <Shield size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
          <h2>Access Denied</h2>
          <p>Only administrators can access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-panel">
      {/* Confirm Delete Modal */}
      {confirmDelete && (
        <div className="admin-modal-overlay">
          <div className="admin-confirm-card">
            <div className="admin-confirm-icon">
              <AlertTriangle size={32} color="#ef4444" />
            </div>
            <h3>Delete User</h3>
            <p>
              Are you sure you want to permanently delete <strong>{confirmDelete.name}</strong>?
            </p>
            <p className="admin-confirm-sub">
              This will remove their data from the <strong>users</strong> and <strong>students</strong> collections. Their Firebase Auth account must be deleted separately from the Firebase Console.
            </p>
            <div className="admin-confirm-actions">
              <button
                className="admin-btn admin-btn-ghost"
                onClick={() => setConfirmDelete(null)}
                disabled={actionLoading !== null}
              >
                Cancel
              </button>
              <button
                className="admin-btn admin-btn-danger"
                onClick={() => handleDeleteUser(confirmDelete)}
                disabled={actionLoading !== null}
              >
                {actionLoading === confirmDelete.uid + '_delete' ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Trash2 size={16} />
                )}
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="admin-header">
        <div>
          <h1><Shield size={24} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />Admin Panel</h1>
          <p>Manage all user accounts, roles, and data across the system.</p>
        </div>
      </div>

      {/* Stats */}
      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <Users size={20} className="stat-icon" />
          <div>
            <span className="stat-number">{stats.total}</span>
            <span className="stat-label">Total Users</span>
          </div>
        </div>
        <div className="admin-stat-card">
          <Shield size={20} className="stat-icon admin" />
          <div>
            <span className="stat-number">{stats.admins}</span>
            <span className="stat-label">Admins</span>
          </div>
        </div>
        <div className="admin-stat-card">
          <BookOpen size={20} className="stat-icon lecturer" />
          <div>
            <span className="stat-number">{stats.lecturers}</span>
            <span className="stat-label">Lecturers</span>
          </div>
        </div>
        <div className="admin-stat-card">
          <GraduationCap size={20} className="stat-icon student" />
          <div>
            <span className="stat-number">{stats.students}</span>
            <span className="stat-label">Students</span>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="admin-search-bar">
        <Search size={18} className="admin-search-icon" />
        <input
          type="text"
          placeholder="Search by name, email, or UID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="admin-table-card">
        {loading ? (
          <div className="admin-loading">
            <Loader2 size={32} className="animate-spin" />
            <p>Loading users...</p>
          </div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>User</th>
                <th>UID</th>
                <th>Role</th>
                <th>Change Role</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(user => (
                <tr key={user.uid} className={user.uid === profile.uid ? 'current-user-row' : ''}>
                  <td>
                    <div className="admin-user-info">
                      <div className="admin-avatar">
                        {user.name?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <div className="admin-user-name">
                          {user.name}
                          {user.uid === profile.uid && <span className="you-badge">You</span>}
                        </div>
                        <div className="admin-user-email">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="admin-uid">{user.uid}</span>
                  </td>
                  <td>
                    <span className={`admin-role-badge ${user.role}`}>
                      {roleIcon(user.role)}
                      {user.role}
                    </span>
                  </td>
                  <td>
                    <div className="admin-role-select-wrapper">
                      <UserCog size={14} className="role-select-icon" />
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.uid, e.target.value as AppUser['role'])}
                        disabled={user.uid === profile.uid || actionLoading === user.uid + '_role'}
                        className="admin-role-select"
                      >
                        {ROLES.map(r => (
                          <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                        ))}
                      </select>
                      {actionLoading === user.uid + '_role' && (
                        <Loader2 size={14} className="animate-spin" style={{ marginLeft: '0.5rem' }} />
                      )}
                    </div>
                  </td>
                  <td>
                    <button
                      className="admin-delete-btn"
                      onClick={() => setConfirmDelete(user)}
                      disabled={user.uid === profile.uid || actionLoading !== null}
                      title={user.uid === profile.uid ? "Cannot delete your own account" : "Delete user data"}
                    >
                      <Trash2 size={16} />
                      Delete Data
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && filteredUsers.length === 0 && (
          <div className="admin-empty">
            <Users size={40} />
            <p>No users found.</p>
          </div>
        )}
      </div>

      <div className="admin-notice">
        <AlertTriangle size={14} />
        <span>
          <strong>Note:</strong> Deleting user data here removes their Firestore records only. To fully revoke access, also delete their account in the <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer">Firebase Console → Authentication</a>.
        </span>
      </div>
    </div>
  );
};

export default AdminPanel;
