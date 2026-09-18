import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

export interface NavigationItem {
  id: string
  label: string
  icon: React.ComponentType
  path?: string
  children?: NavigationItem[]
}

interface SidebarProps {
  navigationItems: NavigationItem[]
  activePage?: string // now optional
  onPageChange?: (pageId: string) => void // now optional
  isOpen?: boolean
  onClose?: () => void
}

const Sidebar: React.FC<SidebarProps> = ({ 
  navigationItems,
  isOpen = true,
  onClose
}) => {
  const [openMenu, setOpenMenu] = React.useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  useLocation(); // Required for route change detection

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleParentClick = (itemId: string) => {
    setOpenMenu(openMenu === itemId ? null : itemId);
  };

  const handleNavClick = () => {
    // Close any open dropdown menus when a navigation item is clicked
    setOpenMenu(null);
    
    // Close sidebar on mobile when a navigation item is clicked
    if (isMobile && onClose) {
      onClose();
    }
  };

  const handleChildNavClick = () => {
    // Don't close dropdown for child items, only close sidebar on mobile
    if (isMobile && onClose) {
      onClose();
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && isMobile && (
        <div className="sidebar-overlay" onClick={onClose} />
      )}
      
      <nav className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-content">
          <div className="nav-items">
            {navigationItems.map((item) => {
              const IconComponent = item.icon;
              if (item.children && item.children.length > 0) {
                return (
                  <div key={item.id} className="nav-item-parent">
                    <div
                      className="nav-item"
                      onClick={() => handleParentClick(item.id)}
                      style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                        <IconComponent />
                        <span className="nav-label" style={{ 
                          whiteSpace: 'normal', 
                          wordWrap: 'break-word', 
                          overflowWrap: 'break-word' 
                        }}>{item.label}</span>
                      </div>
                      <div 
                        style={{ 
                          transform: openMenu === item.id ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 0.3s ease',
                          fontSize: '12px',
                          color: '#666',
                          marginLeft: '8px'
                        }}
                      >
                        ▼
                      </div>
                    </div>
                    {openMenu === item.id && (
                      <div className="nav-sub-items" style={{ marginLeft: 24 }}>
                        {item.children.map((child) => {
                          const ChildIcon = child.icon;
                          return (
                            <NavLink
                              key={child.id}
                              to={child.path || '/'}
                              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                              aria-label={child.label}
                              style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}
                              onClick={handleChildNavClick}
                            >
                              <ChildIcon />
                              <span className="nav-label" style={{ 
                                whiteSpace: 'normal', 
                                wordWrap: 'break-word', 
                                overflowWrap: 'break-word' 
                              }}>{child.label}</span>
                            </NavLink>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }
              return (
                <NavLink
                  key={item.id}
                  to={item.path || '/'}
                  className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                  aria-label={item.label}
                  style={{ textDecoration: 'none' }}
                  onClick={handleNavClick}
                >
                  <IconComponent />
                  <span className="nav-label" style={{ 
                    whiteSpace: 'normal', 
                    wordWrap: 'break-word', 
                    overflowWrap: 'break-word' 
                  }}>{item.label}</span>
                </NavLink>
              );
            })}
          </div>
        </div>
      </nav>
    </>
  );
};

export default Sidebar; 