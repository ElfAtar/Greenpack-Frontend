import React from 'react';
import { useAuth } from '../context/AuthContext';
import LogoutButton from '../components/LogoutButton';

const PendingApproval: React.FC = () => {
    const { user } = useAuth();

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            backgroundColor: '#f5f5f5',
            padding: '20px'
        }}>
            <div style={{
                backgroundColor: 'white',
                padding: '40px',
                borderRadius: '8px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                maxWidth: '500px',
                textAlign: 'center'
            }}>
                <div style={{ fontSize: '64px', marginBottom: '20px' }}>⏳</div>
                <h1 style={{ color: '#333', marginBottom: '20px' }}>Hesabınız Onay Bekliyor</h1>
                <p style={{ color: '#666', marginBottom: '10px', lineHeight: '1.6' }}>
                    Merhaba <strong>{user?.fullName || user?.email}</strong>,
                </p>
                <p style={{ color: '#666', marginBottom: '30px', lineHeight: '1.6' }}>
                    Hesabınız başarıyla oluşturuldu ancak henüz bir yönetici tarafından onaylanmadı.
                    Lütfen sistem yöneticisi ile iletişime geçerek hesabınızın aktifleştirilmesini talep edin.
                </p>

                <div style={{
                    backgroundColor: '#f0f7ff',
                    padding: '15px',
                    borderRadius: '4px',
                    marginBottom: '30px',
                    borderLeft: '4px solid #0066cc'
                }}>
                    <p style={{ margin: 0, color: '#0066cc', fontSize: '14px' }}>
                        <strong>Not:</strong> Hesabınız onaylandıktan sonra sisteme tekrar giriş yapmanız gerekecektir.
                    </p>
                </div>

                <LogoutButton />
            </div>
        </div>
    );
};

export default PendingApproval;
