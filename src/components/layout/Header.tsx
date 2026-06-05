import React, { useState, useEffect, useRef } from 'react';
import { Moon, Sun, Bell, Search, Menu, BookOpen, CheckCircle, ShieldCheck, Info } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../context/AuthContext';
import { 
  subscribeToNotifications, 
  markNotificationRead, 
  markAllNotificationsRead 
} from '../../services/notificationService';
import './Layout.css';

interface HeaderProps {
  onMenuClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { theme, toggleTheme } = useTheme();
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!profile?.uid) return;

    const unsubscribe = subscribeToNotifications(profile.uid, (data) => {
      setNotifications(data);
    });

    return () => unsubscribe();
  }, [profile?.uid]);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAllRead = async () => {
    if (!profile?.uid) return;
    try {
      await markAllNotificationsRead(profile.uid);
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      await markNotificationRead(id);
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'session':
        return <BookOpen size={16} />;
      case 'attendance':
        return <CheckCircle size={16} />;
      case 'approval':
        return <ShieldCheck size={16} />;
      default:
        return <Info size={16} />;
    }
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return 'Just now';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <header className="header glass">
      <div className="header-left">
        <button className="mobile-menu-btn" onClick={onMenuClick}>
          <Menu size={24} />
        </button>
        <div className="header-search">
          <Search size={18} className="search-icon" />
          <input type="text" placeholder="Search students, sessions..." />
        </div>
      </div>

      <div className="header-actions">
        <button className="icon-btn" onClick={toggleTheme} title="Toggle Theme">
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </button>
        
        {/* Real-time Notification Dropdown */}
        <div className="notification-container" ref={dropdownRef} style={{ position: 'relative' }}>
          <button className="icon-btn" onClick={() => setIsOpen(!isOpen)} title="Notifications">
            <Bell size={20} />
            {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
          </button>

          {isOpen && (
            <div className="notification-dropdown">
              <div className="notification-dropdown-header">
                <h3>Notifications</h3>
                {unreadCount > 0 && (
                  <button className="mark-all-btn" onClick={handleMarkAllRead}>
                    Mark all read
                  </button>
                )}
              </div>
              
              <div className="notification-dropdown-list">
                {notifications.length === 0 ? (
                  <div className="notification-dropdown-empty">
                    <Bell size={32} />
                    <p>No notifications yet</p>
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div 
                      key={notif.id} 
                      className={`notification-dropdown-item ${!notif.read ? 'unread' : ''}`}
                      onClick={() => handleMarkRead(notif.id)}
                    >
                      <div className={`notification-dropdown-icon ${notif.type}`}>
                        {getNotificationIcon(notif.type)}
                      </div>
                      <div className="notification-dropdown-content">
                        <div className="notification-dropdown-item-header">
                          <span className="notification-dropdown-title">{notif.title}</span>
                          {!notif.read && <span className="notification-dropdown-dot"></span>}
                        </div>
                        <p className="notification-dropdown-msg">{notif.message}</p>
                        <span className="notification-dropdown-time">{formatTime(notif.createdAt)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="user-profile">
          <div className="user-info">
            <span className="user-name">{profile?.name || 'User'}</span>
            <span className="user-role">{profile?.role ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1) : 'Lecturer'}</span>
          </div>
          <div className="user-avatar">
            {profile?.name?.[0].toUpperCase() || 'U'}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;

