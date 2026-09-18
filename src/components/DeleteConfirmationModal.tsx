import React from 'react'

interface DeleteConfirmationModalProps {
  isOpen: boolean
  userName: string
  onConfirm: () => void
  onCancel: () => void
}

const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  userName,
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Kullanıcı Silme</h3>
        </div>
        <div className="modal-body">
          <p>
            <strong>{userName}</strong> kullanıcısını silmek istiyor musunuz?
          </p>
        </div>
        <div className="modal-footer">
          <button className="btn-cancel" onClick={onCancel}>
            İptal
          </button>
          <button className="btn-delete" onClick={onConfirm}>
            Sil
          </button>
        </div>
      </div>
    </div>
  )
}

export default DeleteConfirmationModal 