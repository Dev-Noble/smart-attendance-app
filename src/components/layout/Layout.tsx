import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/firebase';
import { doc, onSnapshot, getDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { AlertCircle, ArrowRight } from 'lucide-react';
import './Layout.css';

const Layout: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [activeSession, setActiveSession] = useState<{ id: string; code: string; title: string } | null>(null);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  useEffect(() => {
    if (!profile || profile.role !== 'student') {
      setActiveSession(null);
      return;
    }

    let unsubscribeStatus: (() => void) | undefined;

    const setupBannerCheck = async () => {
      try {
        // Fetch student's course IDs
        const studentQuery = query(collection(db, 'students'), where('email', '==', profile.email));
        const studentSnapshot = await getDocs(studentQuery);
        let studentCourseIds: string[] = [];
        if (!studentSnapshot.empty) {
          studentCourseIds = studentSnapshot.docs[0].data().courses || [];
        }

        // Listen to system activeSessionId
        unsubscribeStatus = onSnapshot(doc(db, 'system', 'status'), async (snap) => {
          if (snap.exists()) {
            const statusData = snap.data();
            const activeSessionId = statusData.activeSessionId;

            if (activeSessionId) {
              const sessionSnap = await getDoc(doc(db, 'sessions', activeSessionId));
              if (sessionSnap.exists()) {
                const sessionData = sessionSnap.data();
                const sessionCourseId = sessionData.courseId || '';

                if (studentCourseIds.includes(sessionCourseId)) {
                  setActiveSession({
                    id: activeSessionId,
                    code: sessionData.courseCode || sessionData.courseId || '',
                    title: sessionData.courseName || ''
                  });
                  return;
                }
              }
            }
            setActiveSession(null);
          }
        });
      } catch (err) {
        console.error("Error checking banner active session:", err);
      }
    };

    setupBannerCheck();

    return () => {
      if (unsubscribeStatus) unsubscribeStatus();
    };
  }, [profile]);

  return (
    <div className="layout-container">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="main-content">
        <Header onMenuClick={toggleSidebar} />
        {activeSession && (
          <div className="active-session-banner">
            <div className="banner-content">
              <span className="banner-pulse"></span>
              <AlertCircle size={18} className="banner-icon" />
              <span>
                <strong>Active Attendance:</strong> {activeSession.code} - {activeSession.title} session is active!
              </span>
            </div>
            <button className="banner-btn" onClick={() => navigate('/attendance')}>
              Mark Now <ArrowRight size={14} />
            </button>
          </div>
        )}
        <main className="page-content fade-in">
          <Outlet />
        </main>
      </div>
      {isSidebarOpen && <div className="sidebar-overlay" onClick={toggleSidebar}></div>}
    </div>
  );
};

export default Layout;
