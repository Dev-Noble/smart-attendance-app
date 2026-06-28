import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Download, 
  FileText, 
  ChevronLeft,
  ChevronRight,
  Plus,
  MoreVertical,
  Camera,
  Loader2,
  Trash2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
// @ts-ignore
import 'jspdf-autotable';
import { getStudents, addStudent, deleteStudent } from '../../services/studentService';
import type { Student as StudentType } from '../../services/studentService';
import { uploadImage } from '../../services/cloudinary';
import { useAuth } from '../../context/AuthContext';
import { logActivity } from '../../services/activityService';
import './Students.css';

// Extend jsPDF types for autotable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

const Students: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [students, setStudents] = useState<StudentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [newStudent, setNewStudent] = useState({
    studentId: '',
    name: '',
    email: '',
    attendance: 100,
    status: 'active' as const,
    avatar: ''
  });

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const data = await getStudents();
      setStudents(data);
    } catch (error) {
      console.error("Error fetching students:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addStudent(newStudent);
      await logActivity(profile?.uid || 'system', profile?.name || 'Admin', 'Added Student', `Registered ${newStudent.name} (${newStudent.studentId})`, 'student');
      setShowAddModal(false);
      setNewStudent({ studentId: '', name: '', email: '', attendance: 100, status: 'active', avatar: '' });
      setImagePreview(null);
      fetchStudents();
    } catch (error) {
      console.error("Error adding student:", error);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete ${name}? This action cannot be undone.`)) return;
    
    try {
      await deleteStudent(id);
      await logActivity(profile?.uid || 'system', profile?.name || 'Admin', 'Deleted Student', `Removed ${name} from the system`, 'student');
      fetchStudents();
    } catch (error) {
      console.error("Error deleting student:", error);
      alert("Failed to delete student. You may not have permission.");
    }
  };
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const url = await uploadImage(file);
      setNewStudent(prev => ({ ...prev, avatar: url }));
      setImagePreview(url);
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Failed to upload image. Check your Cloudinary settings.");
    } finally {
      setUploading(false);
    }
  };

  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.studentId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filteredStudents);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Students");
    XLSX.writeFile(wb, "StudentAttendanceReport.xlsx");
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text("Student Attendance Report", 14, 15);
    
    const tableData = filteredStudents.map(s => [s.studentId, s.name, s.email, `${s.attendance}%`, s.status]);
    
    doc.autoTable({
      head: [['ID', 'Name', 'Email', 'Attendance', 'Status']],
      body: tableData,
      startY: 20,
    });
    
    doc.save("StudentAttendanceReport.pdf");
  };

  return (
    <div className="students-page">
      <div className="students-header">
        <div className="header-left">
          <h1>Student Directory</h1>
          <p>Manage and monitor student attendance across all courses.</p>
        </div>
        <div className="header-actions">
          <button className="btn-secondary" onClick={exportToPDF}>
            <FileText size={18} />
            PDF Report
          </button>
          <button className="btn-secondary" onClick={exportToExcel}>
            <Download size={18} />
            Export Excel
          </button>
        </div>
      </div>

      <div className="filters-bar">
        <div className="search-input-wrapper">
          <Search size={18} className="search-icon-fixed" />
          <input 
            type="text" 
            placeholder="Search by name or ID..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        {profile?.role === 'admin' && (
          <button className="add-btn" onClick={() => setShowAddModal(true)}>
            <Plus size={20} />
            <span>Add Student</span>
          </button>
        )}
      </div>

      {showAddModal && (
        <div className="modal-overlay">
          <div className="settings-card" style={{ maxWidth: '500px', width: '90%' }}>
            <div className="modal-header">
              <h2>Add New Student</h2>
              <button className="icon-btn" onClick={() => setShowAddModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAddStudent} className="login-form" style={{ marginTop: '1.5rem' }}>
              <div className="profile-upload-section" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                <div className="image-preview-container" style={{ width: 100, height: 100, borderRadius: '50%', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '2px dashed var(--border-color)', position: 'relative' }}>
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <Camera size={32} color="var(--text-tertiary)" />
                  )}
                  {uploading && (
                    <div className="upload-overlay" style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Loader2 className="animate-spin" color="white" />
                    </div>
                  )}
                </div>
                <label className="upload-label" style={{ padding: '0.5rem 1rem', background: 'var(--bg-tertiary)', borderRadius: '8px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600 }}>
                  {uploading ? 'Uploading...' : 'Choose Photo'}
                  <input type="file" hidden accept="image/*" onChange={handleImageUpload} disabled={uploading} />
                </label>
              </div>

              <div className="login-input-group">
                <label>Student Name</label>
                <input 
                  className="login-input-wrapper" 
                  style={{ padding: '0.75rem 1rem' }}
                  value={newStudent.name}
                  onChange={e => setNewStudent({...newStudent, name: e.target.value})}
                  placeholder="Full Name"
                  required
                />
              </div>
              <div className="login-input-group">
                <label>Student ID</label>
                <input 
                  className="login-input-wrapper" 
                  style={{ padding: '0.75rem 1rem' }}
                  value={newStudent.studentId}
                  onChange={e => setNewStudent({...newStudent, studentId: e.target.value})}
                  placeholder="STU001"
                  required
                />
              </div>
              <div className="login-input-group">
                <label>Email</label>
                <input 
                  type="email"
                  className="login-input-wrapper" 
                  style={{ padding: '0.75rem 1rem' }}
                  value={newStudent.email}
                  onChange={e => setNewStudent({...newStudent, email: e.target.value})}
                  placeholder="student@univ.edu"
                  required
                />
              </div>
              <button type="submit" className="login-submit-btn">Register Student</button>
            </form>
          </div>
        </div>
      )}

      <div className="students-table-card">
        {loading ? (
          <div className="loading-state">
            <div className="animate-spin" style={{ width: 40, height: 40, border: '4px solid var(--accent-primary)', borderTopColor: 'transparent', borderRadius: '50%', margin: '2rem auto' }}></div>
          </div>
        ) : (
          <table className="students-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>ID</th>
                <th>Email</th>
                <th>Attendance</th>
                <th>Status</th>
                <th>Last Seen</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student) => (
                <tr key={student.id} onClick={() => navigate(`/students/${encodeURIComponent(student.studentId)}`)} style={{ cursor: 'pointer' }}>
                  <td>
                    <div className="student-info">
                      <div className="student-avatar" style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e2e8f0', borderRadius: '50%', fontSize: '0.75rem' }}>
                        {student.avatar ? <img src={student.avatar} alt="" /> : student.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <span className="student-name">{student.name}</span>
                    </div>
                  </td>
                  <td><span className="student-id-tag">{student.studentId}</span></td>
                  <td className="student-email">{student.email}</td>
                  <td>
                    <div className="attendance-cell">
                      <div className="progress-bar">
                        <div 
                          className={`progress-fill ${student.attendance < 75 ? 'warning' : ''}`} 
                          style={{ width: `${student.attendance}%`, height: '100%', borderRadius: '4px', background: student.attendance < 75 ? '#f59e0b' : '#10b981' }}
                        ></div>
                      </div>
                      <span className="attendance-val">{student.attendance}%</span>
                    </div>
                  </td>
                  <td>
                    <span className={`status-badge ${student.status}`}>
                      {student.status.replace('-', ' ')}
                    </span>
                  </td>
                  <td className="last-seen">
                    {student.lastSeen?.toDate 
                      ? student.lastSeen.toDate().toLocaleDateString() 
                      : 'Just now'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="icon-btn" onClick={(e) => { e.stopPropagation(); }}>
                        <MoreVertical size={18} />
                      </button>
                      {profile?.role === 'admin' && (
                        <button 
                          className="icon-btn" 
                          style={{ color: 'var(--danger)' }} 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            if(student.id) handleDelete(student.id, student.name); 
                          }}
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="pagination">
          <span className="pagination-info">Showing 1 to {filteredStudents.length} of {filteredStudents.length} results</span>
          <div className="pagination-btns" style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="page-btn" disabled><ChevronLeft size={18} /></button>
            <button className="page-btn" disabled><ChevronRight size={18} /></button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Students;
