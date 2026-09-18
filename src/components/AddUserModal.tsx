import React, { useState } from 'react'
import type { User } from './UsersTable'

interface AddUserModalProps {
  isOpen: boolean
  onSave: (user: Omit<User, 'id'>) => void
  onCancel: () => void
}

const AddUserModal: React.FC<AddUserModalProps> = ({
  isOpen,
  onSave,
  onCancel
}) => {
  const [formData, setFormData] = useState({
    username: '',
    fullName: '',
    email: '',
    role: 'user' as 'admin' | 'user' | 'guest',
    active: true
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  if (!isOpen) return null

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.username.trim()) {
      newErrors.username = 'Kullanıcı adı gereklidir'
    }

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Tam adı gereklidir'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'E-posta adresi gereklidir'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Geçerli bir e-posta adresi giriniz'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = () => {
    if (validateForm()) {
      onSave(formData)
      // Reset form
      setFormData({
        username: '',
        fullName: '',
        email: '',
        role: 'user',
        active: true
      })
      setErrors({})
    }
  }

  const handleCancel = () => {
    // Reset form
    setFormData({
      username: '',
      fullName: '',
      email: '',
      role: 'user',
      active: true
    })
    setErrors({})
    onCancel()
  }

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }))
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Yeni Kullanıcı Ekle</h3>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Kullanıcı Adı *</label>
            <input
              type="text"
              className={`form-input ${errors.username ? 'form-input-error' : ''}`}
              value={formData.username}
              onChange={(e) => handleInputChange('username', e.target.value)}
              placeholder="Kullanıcı adını giriniz"
            />
            {errors.username && <span className="error-message">{errors.username}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Tam Adı *</label>
            <input
              type="text"
              className={`form-input ${errors.fullName ? 'form-input-error' : ''}`}
              value={formData.fullName}
              onChange={(e) => handleInputChange('fullName', e.target.value)}
              placeholder="Tam adını giriniz"
            />
            {errors.fullName && <span className="error-message">{errors.fullName}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">E-posta Adresi *</label>
            <input
              type="email"
              className={`form-input ${errors.email ? 'form-input-error' : ''}`}
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="E-posta adresini giriniz"
            />
            {errors.email && <span className="error-message">{errors.email}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Rol *</label>
            <select
              className="form-select"
              value={formData.role}
              onChange={(e) => handleInputChange('role', e.target.value)}
            >
              <option value="admin">Admin</option>
              <option value="user">User</option>
              <option value="guest">Guest</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Etkin mi?</label>
            <div className="form-control">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.active}
                  onChange={(e) => handleInputChange('active', e.target.checked)}
                  className="checkbox-input"
                />
                <span className="checkbox-text">
                  {formData.active ? 'Evet' : 'Hayır'}
                </span>
              </label>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-cancel" onClick={handleCancel}>
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

export default AddUserModal 