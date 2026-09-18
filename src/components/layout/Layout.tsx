import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import type { NavigationItem } from './Sidebar';

interface LayoutProps {
  navigationItems: NavigationItem[];
  logo?: React.ReactNode;
  logoUrl?: string;
  logoAlt?: string;
}

const Layout: React.FC<LayoutProps> = ({ navigationItems, logo, logoUrl, logoAlt }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    const handleResize = () => setIsSidebarOpen(window.innerWidth > 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="app">
      <Header
        logo={logo}
        logoUrl={logoUrl}
        logoAlt={logoAlt}
        onMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        isSidebarOpen={isSidebarOpen}
      />
      <div className="main-layout">
        <Sidebar navigationItems={navigationItems} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
