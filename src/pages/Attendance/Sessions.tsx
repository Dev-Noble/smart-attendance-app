import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Users, 
  Clock, 
  ChevronRight, 
  Search, 
  Filter,
  Download
} from 'lucide-react';
import { getAllSessions } from '../../services/attendanceService';
import type { AttendanceSession } from '../../services/attendanceService';
import { getStudents } from '../../services/studentService';
import './Attendance.css';

const Sessions: React.FC = () => {
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sessionData, studentData] = await Promise.all([
          getAllSessions(),
          getStudents()
        ]);
        setSessions(sessionData);
        setTotalStudents(studentData.length);
      } catch (error) {
        console.error("Error fetching sessions:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredSessions = sessions.filter(s => 
    'CS101'.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.startTime?.toDate().toLocaleDateString().includes(searchTerm)
  );

  return (
    <div className="sessions-page">
      <div className="students-header">
        <div className="header-left">
          <h1>Attendance History</h1>
          <p>Review and manage past lecture attendance records.</p>
        </div>
        <div className="header-actions">
          <button className="page-btn">
            <Download size={18} /> Export All
          </button>
        </div>
      </div>

      <div className="students-controls">
        <div className="search-bar">
          <Search size={20} className="search-icon" />
          <input 
            type="text" 
            placeholder="Search by course or date..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="filter-btn">
          <Filter size={18} /> Filter
        </button>
      </div>

      <div className="sessions-list">
        {loading ? (
          <div className="loading-spinner"></div>
        ) : (
          <div className="sessions-grid">
            {filteredSessions.map((session) => (
              <div key={session.id} className="session-card">
                <div className="session-card-header">
                  <div className="session-icon-bg">
                    <Calendar size={24} />
                  </div>
                  <div className="session-title-group">
                    <h3>Computer Science (CS101)</h3>
                    <span className="session-date">
                      {session.startTime?.toDate().toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </span>
                  </div>
                </div>

                <div className="session-card-body">
                  <div className="session-stat">
                    <Users size={18} />
                    <span>{session.studentsPresent?.length || 0} / {totalStudents} Present</span>
                  </div>
                  <div className="session-stat">
                    <Clock size={18} />
                    <span>Started {session.startTime?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="attendance-progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ width: `${Math.round(((session.studentsPresent?.length || 0) / (totalStudents || 1)) * 100)}%` }}
                    ></div>
                  </div>
                </div>

                <div className="session-card-footer">
                  <button className="view-details-btn">
                    View Full Details
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Sessions;
