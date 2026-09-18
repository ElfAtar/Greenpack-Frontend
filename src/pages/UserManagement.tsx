import React, { useState, useEffect } from 'react';
import api from '../services/api';

interface ApplicationUser {
    email: string;
    fullName: string;
    roleLevel: number;
    roleName: string;
    department?: string;
    title?: string;
    lastLoginAt?: string;
}

const UserManagement: React.FC = () => {
    const [users, setUsers] = useState<ApplicationUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const response = await api.get('users');
            // Backend returns: { success: true, users: [...] }
            if (response.data && response.data.success && response.data.users) {
                setUsers(response.data.users);
            } else {
                setUsers([]);
            }
        } catch (err: any) {
            console.error('Failed to fetch users', err);
            setError(err.response?.data?.error || 'Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    const updateUserRole = async (email: string, newRoleLevel: number) => {
        try {
            // Backend expects: { RoleLevel: number }
            const response = await api.put(`users/${encodeURIComponent(email)}/role`, {
                RoleLevel: newRoleLevel
            });

            // Backend returns: { success: true, user: {...} }
            if (response.data && response.data.success && response.data.user) {
                // Update local state with the updated user from backend
                setUsers(users.map(u =>
                    u.email === email
                        ? response.data.user
                        : u
                ));
            }
        } catch (err: any) {
            console.error('Failed to update user role', err);
            const errorMessage = err.response?.data?.error || 'Failed to update user role';
            alert(errorMessage);
        }
    };

    const getRoleName = (roleLevel: number): string => {
        switch (roleLevel) {
            case -1: return 'Unknown';
            case 0: return 'User';
            case 1: return 'Advanced User';
            case 2: return 'Admin';
            default: return 'Unknown';
        }
    };

    const getRoleBadgeClass = (roleLevel: number): string => {
        switch (roleLevel) {
            case -1: return 'role-unknown';
            case 0: return 'role-user';
            case 1: return 'role-advanced';
            case 2: return 'role-admin';
            default: return 'role-unknown';
        }
    };

    if (loading) {
        return (
            <div className="main-content" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
                <div>Yükleniyor...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="main-content">
                <div style={{ color: 'red', padding: '20px' }}>
                    Hata: {error}
                </div>
                <button 
                    onClick={fetchUsers}
                    style={{ marginLeft: '20px', padding: '8px 16px', cursor: 'pointer' }}
                >
                    Tekrar Dene
                </button>
            </div>
        );
    }

    return (
        <div className="main-content">
            <div className="users-table-wrapper">
                <div className="users-table-header">
                    <h2>Kullanıcı Yönetimi</h2>
                </div>
                <div className="users-table-scroll">
                    <table className="users-table">
                        <thead>
                            <tr>
                                <th>E-posta</th>
                                <th>Tam Adı</th>
                                <th>Departman</th>
                                <th>Ünvan</th>
                                <th>Rol</th>
                                <th>Son Giriş</th>
                                <th>Rol Kontrolü</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.length === 0 ? (
                                <tr>
                                    <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                                        Henüz kullanıcı bulunmamaktadır.
                                    </td>
                                </tr>
                            ) : (
                                users.map(user => (
                                    <tr key={user.email}>
                                        <td>{user.email}</td>
                                        <td>{user.fullName}</td>
                                        <td>{user.department || '-'}</td>
                                        <td>{user.title || '-'}</td>
                                        <td>
                                            <span className={`role-badge ${getRoleBadgeClass(user.roleLevel)}`}>
                                                {user.roleName || getRoleName(user.roleLevel)}
                                            </span>
                                        </td>
                                        <td>
                                            {user.lastLoginAt
                                                ? new Date(user.lastLoginAt).toLocaleString('tr-TR')
                                                : 'Hiç giriş yapmadı'}
                                        </td>
                                        <td>
                                            <select
                                                value={user.roleLevel}
                                                onChange={(e) => updateUserRole(user.email, parseInt(e.target.value))}
                                                style={{
                                                    padding: '5px 10px',
                                                    borderRadius: '4px',
                                                    border: '1px solid #ddd',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                <option value={-1}>Unknown</option>
                                                <option value={0}>User</option>
                                                <option value={1}>Advanced User</option>
                                                <option value={2}>Admin</option>
                                            </select>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default UserManagement;
