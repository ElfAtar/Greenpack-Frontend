import React, { useState, useEffect } from 'react'

export interface ToastProps {
  message: string
  type: 'success' | 'error' | 'warning' | 'info'
  duration?: number
  onClose?: () => void
}

const Toast: React.FC<ToastProps> = ({ message, type, duration = 3000, onClose }) => {
  const [isVisible, setIsVisible] = useState(true)
  const [isLeaving, setIsLeaving] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      handleClose()
    }, duration)

    return () => clearTimeout(timer)
  }, [duration])

  const handleClose = () => {
    setIsLeaving(true)
    setTimeout(() => {
      setIsVisible(false)
      onClose?.()
    }, 300) // Match CSS transition duration
  }

  if (!isVisible) return null

  const getToastStyles = () => {
    const baseStyles = {
      position: 'fixed' as const,
      top: '20px',
      right: '20px',
      zIndex: 9999,
      padding: '12px 20px',
      borderRadius: '8px',
      color: 'white',
      fontWeight: '500',
      fontSize: '14px',
      maxWidth: '400px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      transform: isLeaving ? 'translateX(100%)' : 'translateX(0)',
      transition: 'transform 0.3s ease-in-out, opacity 0.3s ease-in-out',
      opacity: isLeaving ? 0 : 1,
      cursor: 'pointer'
    }

    switch (type) {
      case 'success':
        return { ...baseStyles, backgroundColor: '#28a745' }
      case 'error':
        return { ...baseStyles, backgroundColor: '#dc3545' }
      case 'warning':
        return { ...baseStyles, backgroundColor: '#ffc107', color: '#212529' }
      case 'info':
        return { ...baseStyles, backgroundColor: '#17a2b8' }
      default:
        return { ...baseStyles, backgroundColor: '#6c757d' }
    }
  }

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <i className="fa-solid fa-check-circle"></i>
      case 'error':
        return <i className="fa-solid fa-exclamation-circle"></i>
      case 'warning':
        return <i className="fa-solid fa-exclamation-triangle"></i>
      case 'info':
        return <i className="fa-solid fa-info-circle"></i>
      default:
        return <i className="fa-solid fa-bell"></i>
    }
  }

  return (
    <div style={getToastStyles()} onClick={handleClose} title="Kapatmak için tıklayın">
      {getIcon()}
      <span>{message}</span>
      <button
        onClick={(e) => {
          e.stopPropagation()
          handleClose()
        }}
        style={{
          background: 'none',
          border: 'none',
          color: 'inherit',
          fontSize: '16px',
          cursor: 'pointer',
          padding: '0',
          marginLeft: 'auto',
          opacity: 0.7
        }}
        title="Kapat"
      >
        <i className="fa-solid fa-times"></i>
      </button>
    </div>
  )
}

export default Toast
