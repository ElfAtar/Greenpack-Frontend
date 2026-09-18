// src/components/SSORedirector.tsx
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const SSORedirector: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoading, isAuthenticated, refreshMe } = useAuth();

  // Where to go after auth
  const from = (location.state as any)?.from?.pathname || '/run';

  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    const run = async () => {
      if (started.current) return;
      started.current = true;

      const params = new URLSearchParams(location.search);

      // If we already cleaned the URL once, remove the "login started" lock
      if (params.get('cb') === '1') {
        sessionStorage.removeItem('sso_login_started');
      }

      const token = params.get('token');

      // ✅ 0) Callback returned a token → store it + set axios Authorization header
      if (token) {
        try {
          sessionStorage.setItem('access_token', token);
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

          // ✅ Remove token from URL to avoid leaking via history/referrer
          navigate(location.pathname + '?cb=1', { replace: true });

          // ✅ Force /me with the new token
          const ok = await refreshMe(true);
          if (ok || isAuthenticated) {
            sessionStorage.removeItem('sso_login_started');
            navigate(from, { replace: true });
            return;
          }

          // Token didn't validate
          sessionStorage.removeItem('access_token');
          delete api.defaults.headers.common['Authorization'];
          setError('Token alındı ama doğrulanamadı. Lütfen tekrar deneyin.');
          return;
        } catch {
          sessionStorage.removeItem('access_token');
          delete api.defaults.headers.common['Authorization'];
          setError('SSO token işlenirken bir hata oluştu. Lütfen tekrar deneyin.');
          return;
        }
      }

      // ✅ 1) Check /me first (non-force)
      const ok = await refreshMe(false);
      if (ok || isAuthenticated) {
        navigate(from, { replace: true });
        return;
      }

      // ✅ 2) Start /login only once (sessionStorage lock)
      const lockKey = 'sso_login_started';
      if (sessionStorage.getItem(lockKey) === '1') {
        setError('SSO giriş denendi ama oturum açılamadı. Sayfayı yenileyin veya tekrar deneyin.');
        return;
      }
      sessionStorage.setItem(lockKey, '1');

      try {
        const r = await api.get('/login');
        if (r.data?.url) {
          window.location.href = r.data.url;
          return;
        }
        setError('Failed to get authorization URL from backend');
      } catch {
        setError('Failed to connect to authentication service');
      }
    };

    if (!isLoading) run();
  }, [
    isLoading,
    navigate,
    from,
    refreshMe,
    isAuthenticated,
    location.pathname,
    location.search,
  ]);

  if (error) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          flexDirection: 'column',
          textAlign: 'center',
          padding: 20,
        }}
      >
        <h2>Authentication Error</h2>
        <p style={{ color: 'red', maxWidth: 600 }}>{error}</p>
        <button
          onClick={() => {
            sessionStorage.removeItem('sso_login_started');
            sessionStorage.removeItem('access_token');
            delete api.defaults.headers.common['Authorization'];
            window.location.href = '/sso';
          }}
          style={{ marginTop: 16, padding: '10px 20px', cursor: 'pointer' }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        flexDirection: 'column',
      }}
    >
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
      <p style={{ marginTop: 20, fontSize: 18 }}>Checking authentication...</p>
    </div>
  );
};

export default SSORedirector;
