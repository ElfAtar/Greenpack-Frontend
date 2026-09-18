import React from 'react';
import { useNavigate } from 'react-router-dom';

const LoggedOut: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', textAlign: 'center' }}>
      <h2>Çıkış Yapıldı</h2>
      <p style={{ maxWidth: 520 }}>
        Uygulamadan çıkış yaptınız. Atlas oturumunuz açık olabilir. Tekrar giriş yapmak için butona basın.
      </p>
      <button
        onClick={() => navigate('/sso')}
        style={{ marginTop: 16, padding: '10px 18px', borderRadius: 6, border: '1px solid #ccc', cursor: 'pointer' }}
      >
        Tekrar giriş yap
      </button>
    </div>
  );
};

export default LoggedOut;
