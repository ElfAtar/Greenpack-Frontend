import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PendingApproval from '../pages/PendingApproval';

interface PrivateRouteProps {
  children: React.ReactNode;
  requireRole?: number;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children, requireRole }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div
          style={{
            width: 50,
            height: 50,
            border: '5px solid #f3f3f3',
            borderTop: '5px solid #3498db',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }}
        />
        <style>{`@keyframes spin {0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (!isAuthenticated) {
    // ✅ already on /sso? don't redirect again
    if (location.pathname === '/sso') return null;
    return <Navigate to="/sso" replace state={{ from: location }} />;
  }

  if (user?.roleLevel === -1) return <PendingApproval />;

  if (requireRole !== undefined && user && user.roleLevel < requireRole) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', textAlign: 'center', padding: 20 }}>
        <h1 style={{ color: '#dc3545' }}>Yetkisiz Erişim</h1>
        <p>Bu sayfaya erişim için yeterli yetkiniz bulunmamaktadır.</p>
      </div>
    );
  }

  return <>{children}</>;
};

export default PrivateRoute;
