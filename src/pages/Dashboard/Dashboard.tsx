import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserCheck, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight,
  AlertTriangle,
  MoreVertical,
  Clock
} from 'lucide-react';
import { 
  AreaChart,
  Area,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getStudents } from '../../services/studentService';
import type { Student } from '../../services/studentService';
import { getAllSessions } from '../../services/attendanceService';
import type { AttendanceSession } from '../../services/attendanceService';
import { getRecentActivities } from '../../services/activityService';
import type { ActivityLog } from '../../services/activityService';
import './Dashboard.css';

const Dashboard: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [studentData, sessionData, activityData] = await Promise.all([
          getStudents(),
          getAllSessions(),
          getRecentActivities(5)
        ]);
        setStudents(studentData);
        setSessions(sessionData);
        setActivities(activityData);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Calculate real metrics
  const totalStudentsCount = students.length;
  const atRiskCount = students.filter(s => s.status === 'at-risk').length;
  
  const avgAttendance = sessions.length > 0 
    ? Math.round((sessions.reduce((acc, s) => acc + (s.studentsPresent?.length || 0), 0) / (sessions.length * (totalStudentsCount || 100))) * 100) 
    : 0;

  // Generate chart data
  const attendanceTrends = sessions.slice(0, 7).reverse().map(s => ({
    name: s.startTime?.toDate ? s.startTime.toDate().toLocaleDateString([], { weekday: 'short' }) : 'Session',
    value: Math.round(((s.studentsPresent?.length || 0) / (totalStudentsCount || 1)) * 100)
  }));

  const distributionData = [
    { name: 'Active', value: students.filter(s => s.status === 'active').length, color: '#10b981' },
    { name: 'At Risk', value: atRiskCount, color: '#f59e0b' },
    { name: 'Inactive', value: students.filter(s => s.status === 'inactive').length, color: '#0a3d91' },
  ].filter(d => d.value > 0);

  if (loading) {
    return (
      <div className="loading-state" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
        <div className="animate-spin" style={{ width: 50, height: 50, border: '5px solid var(--accent-primary)', borderTopColor: 'transparent', borderRadius: '50%' }}></div>
      </div>
    );
  }

  // Student Dashboard View
  if (profile?.role === 'student') {
    const myStudentData = students.find(s => s.email === profile.email);
    const mySessions = sessions.filter(s => s.studentsPresent?.includes(myStudentData?.studentId || ''));
    const attendancePercent = myStudentData?.attendance || 0;

    return (
      <div className="dashboard-wrapper">
        <div className="dashboard-header-flex">
          <div>
            <h1>Welcome, {profile.name}</h1>
            <p>Track your academic progress and attendance here.</p>
          </div>
          <div className="quick-actions">
            <button className="add-btn" onClick={() => navigate('/attendance')}>
              <UserCheck size={18} />
              Mark Attendance
            </button>
          </div>
        </div>

        <div className="dashboard-grid">
          <div className="stat-card">
            <div className="stat-header">
              <div className="stat-icon" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' }}>
                <TrendingUp size={20} />
              </div>
            </div>
            <span className="stat-value">{attendancePercent}%</span>
            <span className="stat-label">Overall Attendance</span>
          </div>
          <div className="stat-card">
            <div className="stat-header">
              <div className="stat-icon" style={{ backgroundColor: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-primary)' }}>
                <UserCheck size={20} />
              </div>
            </div>
            <span className="stat-value">{mySessions.length}</span>
            <span className="stat-label">Sessions Attended</span>
          </div>
        </div>

        <div className="risk-section" style={{ marginTop: '2rem' }}>
          <div className="chart-header">
            <h3 className="chart-title">Your Recent Sessions</h3>
          </div>
          <div className="students-table-card" style={{ background: 'transparent', boxShadow: 'none', border: 'none', padding: 0 }}>
            <table className="students-table">
              <thead>
                <tr>
                  <th>Course</th>
                  <th>Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {mySessions.slice(0, 5).map((session) => (
                  <tr key={session.id}>
                    <td>{session.courseCode} - {session.courseName}</td>
                    <td>{session.startTime?.toDate ? session.startTime.toDate().toLocaleDateString() : 'Recent'}</td>
                    <td><span className="status-badge active">Present</span></td>
                  </tr>
                ))}
                {mySessions.length === 0 && (
                  <tr>
                    <td colSpan={3} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-tertiary)' }}>No sessions recorded yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-wrapper">
      <div className="dashboard-header-flex">
        <div>
          <h1>Welcome back, Lecturer</h1>
          <p>Here's what's happening with your classes today.</p>
        </div>
        <div className="quick-actions">
          <button className="add-btn" onClick={() => navigate('/attendance')}>
            <UserCheck size={18} />
            Start Session
          </button>
          <button className="btn-secondary" onClick={() => navigate('/students')}>
            <Users size={18} />
            View Students
          </button>
        </div>
      </div>
      <div className="dashboard-grid">
        <div className="stat-card">
          <div className="stat-header">
            <div className="stat-icon" style={{ backgroundColor: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-primary)' }}>
              <Users size={20} />
            </div>
            <span className="stat-trend trend-up">
              <ArrowUpRight size={14} /> {totalStudentsCount > 0 ? '+100%' : '0%'}
            </span>
          </div>
          <span className="stat-value">{totalStudentsCount}</span>
          <span className="stat-label">Total Students</span>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <div className="stat-icon" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' }}>
              <UserCheck size={20} />
            </div>
            <span className="stat-trend trend-up">
              <ArrowUpRight size={14} /> {avgAttendance}%
            </span>
          </div>
          <span className="stat-value">{avgAttendance}%</span>
          <span className="stat-label">Avg. Attendance</span>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <div className="stat-icon" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)' }}>
              <AlertTriangle size={20} />
            </div>
            <span className={`stat-trend ${atRiskCount > 0 ? 'trend-down' : 'trend-up'}`}>
              {atRiskCount > 0 ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />} {atRiskCount}
            </span>
          </div>
          <span className="stat-value">{atRiskCount}</span>
          <span className="stat-label">At Risk Students</span>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <div className="stat-icon" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: 'var(--info)' }}>
              <TrendingUp size={20} />
            </div>
          </div>
          <span className="stat-value">{sessions.length}</span>
          <span className="stat-label">Total Sessions</span>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-container">
          <div className="chart-header">
            <h3 className="chart-title">Attendance Trends (%)</h3>
            <button className="icon-btn"><MoreVertical size={18} /></button>
          </div>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <AreaChart data={attendanceTrends.length > 0 ? attendanceTrends : [{name: 'No Data', value: 0}]}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent-primary)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--accent-primary)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-tertiary)', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-tertiary)', fontSize: 12 }} domain={[0, 100]} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }} />
                <Area type="monotone" dataKey="value" stroke="var(--accent-primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-container">
          <div className="chart-header">
            <h3 className="chart-title">Status Distribution</h3>
          </div>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={distributionData.length > 0 ? distributionData : [{name: 'No Students', value: 1, color: 'var(--bg-tertiary)'}]}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {distributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                  {distributionData.length === 0 && <Cell fill="var(--bg-tertiary)" />}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="dashboard-footer-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '2rem' }}>
        <div className="risk-section">
          <div className="chart-header">
            <h3 className="chart-title">Students Needing Attention</h3>
            <button className="icon-btn"><TrendingUp size={18} /></button>
          </div>
          <div className="risk-list">
            {students.filter(s => s.status === 'at-risk').slice(0, 5).map((student) => (
              <div key={student.id} className="risk-item" onClick={() => navigate(`/students/${student.studentId}`)} style={{ cursor: 'pointer' }}>
                <div className="student-info">
                  <div className="student-avatar" style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e2e8f0', borderRadius: '50%' }}>
                    {student.avatar ? <img src={student.avatar} alt="" /> : student.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className="student-details">
                    <span className="student-name">{student.name}</span>
                    <span className="student-id">{student.studentId}</span>
                  </div>
                </div>
                <span className={`attendance-pill ${student.attendance < 60 ? 'pill-danger' : 'pill-warning'}`}>
                  {student.attendance}% Attendance
                </span>
              </div>
            ))}
            {students.filter(s => s.status === 'at-risk').length === 0 && (
              <p style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '2rem' }}>All students are currently on track!</p>
            )}
          </div>
        </div>

        <div className="risk-section">
          <div className="chart-header">
            <h3 className="chart-title">Recent Activity</h3>
            <button className="icon-btn"><Clock size={18} /></button>
          </div>
          <div className="activity-list">
            {activities.map((activity) => (
              <div key={activity.id} className="activity-item">
                <div className="activity-icon-sm" style={{ 
                  width: 32, 
                  height: 32, 
                  borderRadius: '8px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  background: activity.type === 'attendance' ? 'rgba(16, 185, 129, 0.1)' : activity.type === 'student' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                  color: activity.type === 'attendance' ? 'var(--success)' : activity.type === 'student' ? 'var(--accent-primary)' : 'var(--warning)'
                }}>
                  {activity.type === 'attendance' ? <UserCheck size={16} /> : activity.type === 'student' ? <Users size={16} /> : <AlertTriangle size={16} />}
                </div>
                <div className="activity-details">
                  <p className="activity-text"><strong>{activity.userName}</strong> {activity.action.toLowerCase()}</p>
                  <p className="activity-meta">{activity.details} • {activity.timestamp?.toDate ? activity.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}</p>
                </div>
              </div>
            ))}
            {activities.length === 0 && (
              <p style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '2rem' }}>No recent activity found.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
