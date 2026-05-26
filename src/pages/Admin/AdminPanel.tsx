import React, { useState, useEffect } from 'react';
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  setDoc,
  query,
  orderBy,
  where
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import { logActivity } from '../../services/activityService';
import {
  getDepartments,
  addDepartment,
  deleteDepartment,
  getLevels,
  addLevel,
  deleteLevel,
  getAllCoursesAdmin,
  createCourseAdmin,
  deleteCourse,
  type Department,
  type Level,
  type Course
} from '../../services/courseService';
import {
  Shield,
  Trash2,
  UserCog,
  Loader2,
  Search,
  Users,
  GraduationCap,
  BookOpen,
  AlertTriangle,
  Plus,
  Layers,
  Bookmark,
  RotateCcw,
  CheckCircle2
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

type AdminTab = 'users' | 'departments' | 'levels' | 'courses' | 'reset';

const AdminPanel: React.FC = () => {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('users');

  // Core loading states
  const [users, setUsers] = useState<AppUser[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AppUser | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetDone, setResetDone] = useState(false);
  const [resetStats, setResetStats] = useState<{ sessions: number; activities: number } | null>(null);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');

  // Form States
  const [deptForm, setDeptForm] = useState({ name: '', code: '' });
  const [levelForm, setLevelForm] = useState({ name: '' });
  const [courseForm, setCourseForm] = useState({ code: '', title: '', departmentId: '', levelId: '' });

  useEffect(() => {
    fetchInitialData();
  }, [activeTab]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'users') {
        const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        const data = snap.docs.map(d => ({ uid: d.id, ...d.data() } as AppUser));
        setUsers(data);
      } else if (activeTab === 'departments') {
        const data = await getDepartments();
        setDepartments(data);
      } else if (activeTab === 'levels') {
        const data = await getLevels();
        setLevels(data);
      } else if (activeTab === 'courses') {
        const [courseData, deptData, lvlData] = await Promise.all([
          getAllCoursesAdmin(),
          getDepartments(),
          getLevels()
        ]);
        setCourses(courseData);
        setDepartments(deptData);
        setLevels(lvlData);
      }
    } catch (error) {
      console.error(`Failed to fetch data for tab ${activeTab}:`, error);
    } finally {
      setLoading(false);
    }
  };

  // --- Users Handlers ---
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
      await deleteDoc(doc(db, 'users', user.uid));
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
      alert('Failed to delete user data.');
    } finally {
      setActionLoading(null);
    }
  };

  // --- Departments Handlers ---
  const handleAddDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptForm.name || !deptForm.code) return;
    setActionLoading('add_dept');
    try {
      await addDepartment(deptForm.name.trim(), deptForm.code.trim().toUpperCase());
      setDeptForm({ name: '', code: '' });
      const data = await getDepartments();
      setDepartments(data);
      await logActivity(profile?.uid || '', profile?.name || 'Admin', 'Added Department', `Department: ${deptForm.name}`, 'system');
    } catch (error) {
      console.error('Failed to add department:', error);
      alert('Failed to add department.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteDept = async (id: string, name: string) => {
    if (!window.confirm(`Delete department "${name}"? Courses associated with this department will need reassignment.`)) return;
    setActionLoading(id + '_del_dept');
    try {
      await deleteDepartment(id);
      setDepartments(prev => prev.filter(d => d.id !== id));
      await logActivity(profile?.uid || '', profile?.name || 'Admin', 'Deleted Department', `Department: ${name}`, 'system');
    } catch (error) {
      console.error('Failed to delete department:', error);
      alert('Failed to delete department.');
    } finally {
      setActionLoading(null);
    }
  };

  // --- Levels Handlers ---
  const handleAddLevel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!levelForm.name) return;
    setActionLoading('add_level');
    try {
      await addLevel(levelForm.name.trim());
      setLevelForm({ name: '' });
      const data = await getLevels();
      setLevels(data);
      await logActivity(profile?.uid || '', profile?.name || 'Admin', 'Added Level', `Level: ${levelForm.name}`, 'system');
    } catch (error) {
      console.error('Failed to add level:', error);
      alert('Failed to add academic level.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteLevel = async (id: string, name: string) => {
    if (!window.confirm(`Delete level "${name}"?`)) return;
    setActionLoading(id + '_del_level');
    try {
      await deleteLevel(id);
      setLevels(prev => prev.filter(l => l.id !== id));
      await logActivity(profile?.uid || '', profile?.name || 'Admin', 'Deleted Level', `Level: ${name}`, 'system');
    } catch (error) {
      console.error('Failed to delete level:', error);
      alert('Failed to delete level.');
    } finally {
      setActionLoading(null);
    }
  };

  // --- Courses Handlers ---
  const handleAddCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    const { code, title, departmentId, levelId } = courseForm;
    if (!code || !title || !departmentId || !levelId) {
      alert('Please fill out all course details.');
      return;
    }
    setActionLoading('add_course');
    try {
      await createCourseAdmin({
        code: code.trim().toUpperCase(),
        title: title.trim(),
        departmentId,
        levelId
      });
      setCourseForm({ code: '', title: '', departmentId: '', levelId: '' });
      const data = await getAllCoursesAdmin();
      setCourses(data);
      await logActivity(profile?.uid || '', profile?.name || 'Admin', 'Added Course', `Course: ${code}`, 'system');
    } catch (error) {
      console.error('Failed to add course:', error);
      alert('Failed to add course.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteCourse = async (id: string, code: string) => {
    if (!window.confirm(`Delete course "${code}"?`)) return;
    setActionLoading(id + '_del_course');
    try {
      await deleteCourse(id);
      setCourses(prev => prev.filter(c => c.id !== id));
      await logActivity(profile?.uid || '', profile?.name || 'Admin', 'Deleted Course', `Course: ${code}`, 'system');
    } catch (error) {
      console.error('Failed to delete course:', error);
      alert('Failed to delete course.');
    } finally {
      setActionLoading(null);
    }
  };

  // --- Reset System Handler ---
  const handleResetSystem = async () => {
    setActionLoading('reset');
    setResetDone(false);
    try {
      // 1. Delete all sessions
      const sessionsSnap = await getDocs(collection(db, 'sessions'));
      let sessionCount = 0;
      for (const d of sessionsSnap.docs) {
        await deleteDoc(doc(db, 'sessions', d.id));
        sessionCount++;
      }

      // 2. Delete all activity logs
      const activitiesSnap = await getDocs(collection(db, 'activities'));
      let activityCount = 0;
      for (const d of activitiesSnap.docs) {
        await deleteDoc(doc(db, 'activities', d.id));
        activityCount++;
      }

      // 3. Reset system/status (clear active session)
      await setDoc(doc(db, 'system', 'status'), {
        activeSessionId: null,
        updatedAt: new Date()
      });

      setResetStats({ sessions: sessionCount, activities: activityCount });
      setResetDone(true);
      setShowResetConfirm(false);
      await logActivity(
        profile?.uid || '',
        profile?.name || 'Admin',
        'System Reset',
        `Cleared ${sessionCount} sessions and ${activityCount} activity logs`,
        'system'
      );
    } catch (error) {
      console.error('Reset failed:', error);
      alert('Reset failed. Check your permissions.');
    } finally {
      setActionLoading(null);
    }
  };

  // Filters for User search
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
              This will remove their data from the <strong>users</strong> and <strong>students</strong> collections.
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
          <p>Configure academic departments, courses, levels, and user accounts.</p>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="admin-tabs">
        <button className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>
          <Users size={16} style={{ verticalAlign: 'middle', marginRight: '0.4rem' }} />
          Users
        </button>
        <button className={`admin-tab ${activeTab === 'departments' ? 'active' : ''}`} onClick={() => setActiveTab('departments')}>
          <Layers size={16} style={{ verticalAlign: 'middle', marginRight: '0.4rem' }} />
          Departments
        </button>
        <button className={`admin-tab ${activeTab === 'levels' ? 'active' : ''}`} onClick={() => setActiveTab('levels')}>
          <Bookmark size={16} style={{ verticalAlign: 'middle', marginRight: '0.4rem' }} />
          Academic Levels
        </button>
        <button className={`admin-tab ${activeTab === 'courses' ? 'active' : ''}`} onClick={() => setActiveTab('courses')}>
          <BookOpen size={16} style={{ verticalAlign: 'middle', marginRight: '0.4rem' }} />
          Courses
        </button>
        <button className={`admin-tab danger-tab ${activeTab === 'reset' ? 'active' : ''}`} onClick={() => { setActiveTab('reset'); setResetDone(false); setResetStats(null); }}>
          <RotateCcw size={16} style={{ verticalAlign: 'middle', marginRight: '0.4rem' }} />
          Reset System
        </button>
      </div>

      <div className="admin-tab-content">
        {/* --- USERS TAB --- */}
        {activeTab === 'users' && (
          <>
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
          </>
        )}

        {/* --- DEPARTMENTS TAB --- */}
        {activeTab === 'departments' && (
          <div className="admin-grid-two-cols">
            {/* Add Department Form */}
            <div className="admin-form-card">
              <h3><Plus size={18} /> Add New Department</h3>
              <form onSubmit={handleAddDept}>
                <div className="admin-form-group">
                  <label>Department Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Computer Science"
                    value={deptForm.name}
                    onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                  />
                </div>
                <div className="admin-form-group">
                  <label>Department Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CSC"
                    value={deptForm.code}
                    onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value })}
                  />
                </div>
                <button
                  type="submit"
                  className="admin-submit-btn"
                  disabled={actionLoading === 'add_dept'}
                >
                  {actionLoading === 'add_dept' ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                  Add Department
                </button>
              </form>
            </div>

            {/* Department List */}
            <div className="admin-table-card">
              {loading ? (
                <div className="admin-loading">
                  <Loader2 size={32} className="animate-spin" />
                  <p>Loading departments...</p>
                </div>
              ) : departments.length === 0 ? (
                <div className="admin-empty">
                  <Layers size={40} />
                  <p>No departments added yet.</p>
                </div>
              ) : (
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Department Name</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {departments.map(dept => (
                      <tr key={dept.id}>
                        <td>
                          <span style={{ fontWeight: 'bold', letterSpacing: '0.5px' }} className="student-id-tag">{dept.code}</span>
                        </td>
                        <td>
                          <span style={{ fontWeight: 600 }}>{dept.name}</span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            className="admin-delete-btn"
                            onClick={() => dept.id && handleDeleteDept(dept.id, dept.name)}
                            disabled={actionLoading !== null}
                          >
                            {actionLoading === dept.id + '_del_dept' ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <Trash2 size={14} />
                            )}
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* --- ACADEMIC LEVELS TAB --- */}
        {activeTab === 'levels' && (
          <div className="admin-grid-two-cols">
            {/* Add Level Form */}
            <div className="admin-form-card">
              <h3><Plus size={18} /> Add New Level</h3>
              <form onSubmit={handleAddLevel}>
                <div className="admin-form-group">
                  <label>Level Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 100 Level"
                    value={levelForm.name}
                    onChange={(e) => setLevelForm({ name: e.target.value })}
                  />
                </div>
                <button
                  type="submit"
                  className="admin-submit-btn"
                  disabled={actionLoading === 'add_level'}
                >
                  {actionLoading === 'add_level' ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                  Add Level
                </button>
              </form>
            </div>

            {/* Level List */}
            <div className="admin-table-card">
              {loading ? (
                <div className="admin-loading">
                  <Loader2 size={32} className="animate-spin" />
                  <p>Loading academic levels...</p>
                </div>
              ) : levels.length === 0 ? (
                <div className="admin-empty">
                  <Bookmark size={40} />
                  <p>No academic levels added yet.</p>
                </div>
              ) : (
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Level Name</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {levels.map(lvl => (
                      <tr key={lvl.id}>
                        <td>
                          <span style={{ fontWeight: 600 }}>{lvl.name}</span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            className="admin-delete-btn"
                            onClick={() => lvl.id && handleDeleteLevel(lvl.id, lvl.name)}
                            disabled={actionLoading !== null}
                          >
                            {actionLoading === lvl.id + '_del_level' ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <Trash2 size={14} />
                            )}
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* --- COURSES TAB --- */}
        {activeTab === 'courses' && (
          <div className="admin-grid-two-cols">
            {/* Add Course Form */}
            <div className="admin-form-card">
              <h3><Plus size={18} /> Add New Course</h3>
              <form onSubmit={handleAddCourse}>
                <div className="admin-form-group">
                  <label>Course Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CSC301"
                    value={courseForm.code}
                    onChange={(e) => setCourseForm({ ...courseForm, code: e.target.value })}
                  />
                </div>
                <div className="admin-form-group">
                  <label>Course Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Web Development"
                    value={courseForm.title}
                    onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
                  />
                </div>
                <div className="admin-form-group">
                  <label>Department</label>
                  <select
                    required
                    value={courseForm.departmentId}
                    onChange={(e) => setCourseForm({ ...courseForm, departmentId: e.target.value })}
                  >
                    <option value="">Select Department</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                    ))}
                  </select>
                </div>
                <div className="admin-form-group">
                  <label>Academic Level</label>
                  <select
                    required
                    value={courseForm.levelId}
                    onChange={(e) => setCourseForm({ ...courseForm, levelId: e.target.value })}
                  >
                    <option value="">Select Level</option>
                    {levels.map(l => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                </div>
                <button
                  type="submit"
                  className="admin-submit-btn"
                  disabled={actionLoading === 'add_course' || departments.length === 0 || levels.length === 0}
                >
                  {actionLoading === 'add_course' ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                  Add Course
                </button>
              </form>
            </div>

            {/* Courses List */}
            <div className="admin-table-card">
              {loading ? (
                <div className="admin-loading">
                  <Loader2 size={32} className="animate-spin" />
                  <p>Loading courses...</p>
                </div>
              ) : courses.length === 0 ? (
                <div className="admin-empty">
                  <BookOpen size={40} />
                  <p>No courses added yet.</p>
                </div>
              ) : (
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Title</th>
                      <th>Department</th>
                      <th>Level</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {courses.map(course => {
                      const dept = departments.find(d => d.id === course.departmentId);
                      const lvl = levels.find(l => l.id === course.levelId);
                      return (
                        <tr key={course.id}>
                          <td>
                            <span style={{ fontWeight: 'bold' }} className="student-id-tag">{course.code}</span>
                          </td>
                          <td>
                            <span style={{ fontWeight: 600 }}>{course.title}</span>
                          </td>
                          <td>
                            <span>{dept ? `${dept.code}` : 'Unknown'}</span>
                          </td>
                          <td>
                            <span>{lvl ? lvl.name : 'Unknown'}</span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              className="admin-delete-btn"
                              onClick={() => course.id && handleDeleteCourse(course.id, course.code)}
                              disabled={actionLoading !== null}
                            >
                              {actionLoading === course.id + '_del_course' ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <Trash2 size={14} />
                              )}
                              Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* --- RESET SYSTEM TAB --- */}
        {activeTab === 'reset' && (
          <div className="admin-reset-zone">
            <div className="admin-reset-icon-wrap">
              <RotateCcw size={48} className="admin-reset-icon" />
            </div>
            <h2>Reset Attendance System</h2>
            <p className="admin-reset-desc">
              This will permanently delete <strong>all attendance sessions</strong> and <strong>all activity logs</strong>,
              and clear any active session. Student and lecturer accounts, courses, departments, and levels are <strong>not affected</strong>.
            </p>
            <p className="admin-reset-desc" style={{ color: 'var(--color-danger, #ef4444)', fontWeight: 600 }}>
              ⚠ This action cannot be undone.
            </p>

            {resetDone && resetStats && (
              <div className="admin-reset-success">
                <CheckCircle2 size={20} />
                <span>
                  Reset complete — {resetStats.sessions} session{resetStats.sessions !== 1 ? 's' : ''} and{' '}
                  {resetStats.activities} activity log{resetStats.activities !== 1 ? 's' : ''} deleted.
                </span>
              </div>
            )}

            {!showResetConfirm ? (
              <button
                className="admin-reset-btn"
                onClick={() => setShowResetConfirm(true)}
                disabled={actionLoading === 'reset'}
              >
                <RotateCcw size={18} />
                Reset All Attendance & Sessions
              </button>
            ) : (
              <div className="admin-reset-confirm-box">
                <p>Type <strong>RESET</strong> to confirm:</p>
                <ResetConfirmInput onConfirm={handleResetSystem} onCancel={() => setShowResetConfirm(false)} loading={actionLoading === 'reset'} />
              </div>
            )}

            <div className="admin-reset-info">
              <strong>What gets cleared:</strong>
              <ul>
                <li>✓ All attendance sessions (past and present)</li>
                <li>✓ All activity logs</li>
                <li>✓ Active session state (system/status)</li>
              </ul>
              <strong>What is preserved:</strong>
              <ul>
                <li>✓ All user accounts</li>
                <li>✓ All student profiles and course registrations</li>
                <li>✓ Departments, levels, and courses</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {activeTab === 'users' && (

        <div className="admin-notice" style={{ marginTop: '2rem' }}>
          <AlertTriangle size={14} />
          <span>
            <strong>Note:</strong> Deleting user data here removes their Firestore records only. To fully revoke access, also delete their account in the <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer">Firebase Console → Authentication</a>.
          </span>
        </div>
      )}
    </div>
  );
};

// Small inline component to handle the typed confirmation
const ResetConfirmInput: React.FC<{
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}> = ({ onConfirm, onCancel, loading }) => {
  const [val, setVal] = React.useState('');
  return (
    <div className="admin-reset-typed-confirm">
      <input
        type="text"
        placeholder="Type RESET here"
        value={val}
        onChange={e => setVal(e.target.value)}
        autoFocus
      />
      <div className="admin-confirm-actions">
        <button className="admin-btn admin-btn-ghost" onClick={onCancel} disabled={loading}>
          Cancel
        </button>
        <button
          className="admin-btn admin-btn-danger"
          onClick={onConfirm}
          disabled={val.trim() !== 'RESET' || loading}
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <RotateCcw size={16} />}
          Confirm Reset
        </button>
      </div>
    </div>
  );
};

export default AdminPanel;
