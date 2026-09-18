import React, { useState } from 'react'
import type { User } from './UsersTable'

interface EditUserModalProps {
  isOpen: boolean
  user: User | null
  onSave: (user: User) => void
  onCancel: () => void
}

const EditUserModal: React.FC<EditUserModalProps> = ({
  isOpen,
  user,
  onSave,
  onCancel
}) => {
  const [activeStatus, setActiveStatus] = useState(user?.active || false)
  const [role, setRole] = useState(user?.role || 'user')

  // Update form when user changes
  React.useEffect(() => {
    setActiveStatus(user?.active || false)
    setRole(user?.role || 'user')
  }, [user])

  if (!isOpen || !user) return null

  const handleSave = () => {
    const updatedUser = {
      ...user,
      active: activeStatus,
      role: role
    }
    onSave(updatedUser)
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Kullanıcı Düzenle</h3>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Kullanıcı Adı:</label>
            <div className="form-value">{user.username}</div>
          </div>
          <div className="form-group">
            <label className="form-label">Tam Adı:</label>
            <div className="form-value">{user.fullName}</div>
          </div>
          <div className="form-group">
            <label className="form-label">E-posta:</label>
            <div className="form-value">{user.email}</div>
          </div>
          <div className="form-group">
            <label className="form-label">Rol:</label>
            <div className="form-control">
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as 'admin' | 'user' | 'guest')}
                className="form-select"
              >
                <option value="admin">Admin</option>
                <option value="user">User</option>
                <option value="guest">Guest</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Etkin mi?</label>
            <div className="form-control">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={activeStatus}
                  onChange={(e) => setActiveStatus(e.target.checked)}
                  className="checkbox-input"
                />
                <span className="checkbox-text">
                  {activeStatus ? 'Evet' : 'Hayır'}
                </span>
              </label>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-cancel" onClick={onCancel}>
            İptal
          </button>
          <button className="btn-save" onClick={handleSave}>
            Kaydet
          </button>
        </div>
      </div>
    </div>
  )
}

export default EditUserModal 