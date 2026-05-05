import React from 'react';
import { Moon, Sun, Bell, Search, Menu } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../context/AuthContext';
import './Layout.css';

interface HeaderProps {
  onMenuClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { theme, toggleTheme } = useTheme();
  const { profile } = useAuth();

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
        
        <button className="icon-btn" title="Notifications">
          <Bell size={20} />
          <span className="notification-badge"></span>
        </button>

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
