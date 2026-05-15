import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  UserCheck, 
  History,
  Users, 
  Settings, 
  LogOut,
  GraduationCap,
  X,
  BookOpen,
  FileText,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './Layout.css';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { logout, profile } = useAuth();
  
  const navItems = [
    { icon: <LayoutDashboard size={20} />, label: 'Dashboard', path: '/', roles: ['admin', 'lecturer', 'student'] },
    { icon: <BookOpen size={20} />, label: 'My Courses', path: '/courses/register', roles: ['student'] },
    { icon: <BookOpen size={20} />, label: 'Manage Courses', path: '/courses/manage', roles: ['admin', 'lecturer'] },
    { icon: <UserCheck size={20} />, label: 'Attendance', path: '/attendance', roles: ['admin', 'lecturer', 'student'] },
    { icon: <History size={20} />, label: 'History', path: '/sessions', roles: ['admin', 'lecturer'] },
    { icon: <Users size={20} />, label: 'Students', path: '/students', roles: ['admin', 'lecturer'] },
    { icon: <FileText size={20} />, label: 'Biodata', path: '/biodata', roles: ['student'] },
    { icon: <Settings size={20} />, label: 'Settings', path: '/settings', roles: ['admin', 'lecturer', 'student'] },
    { icon: <ShieldCheck size={20} />, label: 'Admin Panel', path: '/admin', roles: ['admin'] },
  ];

  const filteredItems = navItems.filter(item => 
    !profile || item.roles.includes(profile.role)
  );

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-logo">
        <GraduationCap size={32} className="logo-icon" />
        <span>SMAS</span>
        <button className="mobile-close" onClick={onClose}>
          <X size={24} />
        </button>
      </div>
      
      <nav className="sidebar-nav">
        {filteredItems.map((item) => (
          <NavLink 
            key={item.path} 
            to={item.path} 
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={onClose}
          >
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button className="logout-btn" onClick={logout}>
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
