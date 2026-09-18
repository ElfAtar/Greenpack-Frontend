import React from 'react'

interface HeaderProps {
  logo?: React.ReactNode
  logoUrl?: string
  logoAlt?: string
  onMenuToggle?: () => void
  isSidebarOpen?: boolean
}

const Header: React.FC<HeaderProps> = ({ 
  logo, 
  logoUrl,
  logoAlt = "Logo",
  onMenuToggle,
  isSidebarOpen: _isSidebarOpen
}) => {
  const appVersion = __APP_VERSION__;
  return (
    <header className="header">
      <div className="header-content">
        <div className="header-left">
          <button 
            type="button"
            className="logo-toggle-button"
            onClick={onMenuToggle}
            aria-label="Toggle menu"
          >
            {logo || (
              logoUrl ? (
                <img 
                  src={logoUrl} 
                  alt={logoAlt}
                  className="logo-image"
                />
              ) : (
                <div className="logo-placeholder">
                  <span className="logo-text">LOGO</span>
                </div>
              )
            )}
          </button>
        </div>
        <div className="header-right">
          <span style={{ fontSize: '12px', color: '#6c757d', marginRight: '10px' }}>
            v{appVersion}
          </span>
          <img 
            src="/opti-pro-logo.png" 
            alt="OptiPro Software Inc. Logo" 
            className="opti-pro-logo"
          />
        </div>
      </div>
    </header>
  )
}

export default Header 
