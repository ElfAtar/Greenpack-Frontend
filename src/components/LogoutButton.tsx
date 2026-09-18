import React from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const LogoutButton: React.FC = () => {
  const { logoutLocal } = useAuth();

  const handleLogout = async () => {
    try {
      await api.post('/logout');
    } catch (e) {
      console.error('Logout failed', e);
    } finally {
      logoutLocal();
      window.location.href = '/logged-out';
    }
  };

  return (
    <button
      onClick={handleLogout}
      style={{
        padding: '8px 16px',
        backgroundColor: '#dc3545',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '14px',
      }}
    >
      Logout
    </button>
  );
};

export default LogoutButton;
