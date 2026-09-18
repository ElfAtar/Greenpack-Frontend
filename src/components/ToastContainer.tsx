import React, { useState, useCallback } from 'react'
import Toast, { type ToastProps } from './Toast'

export interface ToastData extends Omit<ToastProps, 'onClose'> {
  id: string
}

interface ToastContainerProps {
  toasts: ToastData[]
  onRemoveToast: (id: string) => void
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemoveToast }) => {
  return (
    <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 9999 }}>
      {toasts.map((toast, index) => (
        <div
          key={toast.id}
          style={{
            marginBottom: index > 0 ? '10px' : '0',
            transform: `translateY(${index * 10}px)`
          }}
        >
          <Toast
            message={toast.message}
            type={toast.type}
            duration={toast.duration}
            onClose={() => onRemoveToast(toast.id)}
          />
        </div>
      ))}
    </div>
  )
}

// Custom hook for managing toasts
export const useToast = () => {
  const [toasts, setToasts] = useState<ToastData[]>([])

  const addToast = useCallback((toast: Omit<ToastData, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9)
    const newToast: ToastData = { ...toast, id }
    
    setToasts(prev => [...prev, newToast])
    
    // Auto remove after duration
    setTimeout(() => {
      removeToast(id)
    }, toast.duration || 3000)
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  const showSuccess = useCallback((message: string, duration?: number) => {
    addToast({ message, type: 'success', duration })
  }, [addToast])

  const showError = useCallback((message: string, duration?: number) => {
    // Errors stay longer (10s) so users can read and act on them; still overridable.
    addToast({ message, type: 'error', duration: duration ?? 10000 })
  }, [addToast])

  const showWarning = useCallback((message: string, duration?: number) => {
    addToast({ message, type: 'warning', duration })
  }, [addToast])

  const showInfo = useCallback((message: string, duration?: number) => {
    addToast({ message, type: 'info', duration })
  }, [addToast])

  return {
    toasts,
    addToast,
    removeToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    ToastContainer: () => <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
  }
}

export default ToastContainer
