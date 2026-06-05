import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Home, ArrowLeft } from 'lucide-react';
import './NotFound.css';

const NotFound: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="notfound-container">
      <div className="notfound-card">
        <div className="notfound-icon-ring">
          <MapPin size={40} />
        </div>
        
        <h1 className="notfound-code">404</h1>
        <h2 className="notfound-title">Page Not Found</h2>
        <p className="notfound-desc">
          The page you're looking for doesn't exist or has been moved.
        </p>

        <div className="notfound-actions">
          <button className="notfound-btn primary" onClick={() => navigate('/')}>
            <Home size={18} />
            Go to Dashboard
          </button>
          <button className="notfound-btn secondary" onClick={() => navigate(-1)}>
            <ArrowLeft size={18} />
            Go Back
          </button>
        </div>
      </div>

      <div className="notfound-bg">
        <div className="notfound-blob notfound-blob-1"></div>
        <div className="notfound-blob notfound-blob-2"></div>
      </div>
    </div>
  );
};

export default NotFound;
