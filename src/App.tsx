import './App.css';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import { navigationItems } from './config/navigation';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import SSORedirector from './components/SSORedirector';
import LoggedOut from './pages/LoggedOut';

import Run from './pages/Run';
import Scenario from './pages/Scenario';
import ProductList from './pages/ProductList';
import BoxList from './pages/BoxList';
import CartonList from './pages/CartonList';
import ProductGroupList from './pages/ProductGroupList';
import DefaultValues from './pages/DefaultValues';
import UserManagement from './pages/UserManagement';
import Visualization from './pages/Visualization';
import Result from './pages/Result';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* PUBLIC */}
          <Route path="/sso" element={<SSORedirector />} />
          <Route path="/logged-out" element={<LoggedOut />} />

          {/* PROTECTED APP */}
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Layout navigationItems={navigationItems} logoUrl="/Abdi_logo.png" logoAlt="Green Harmonization Logo" />
              </PrivateRoute>
            }
          >
            <Route index element={<Navigate to="/run" replace />} />
            <Route path="run" element={<Run />} />
            <Route path="scenario" element={<Scenario />} />
            <Route path="products" element={<ProductList />} />
            <Route path="boxes" element={<BoxList />} />
            <Route path="cartons" element={<CartonList />} />
            <Route path="groups" element={<ProductGroupList />} />
            <Route path="default-values" element={<DefaultValues />} />
            <Route path="visualization" element={<Visualization />} />
            <Route path="result" element={<Result />} />

            <Route
              path="users"
              element={
                <PrivateRoute requireRole={2}>
                  <UserManagement />
                </PrivateRoute>
              }
            />

            <Route path="*" element={<div className="main-content"><h2>404 - Sayfa Bulunamadı</h2></div>} />
          </Route>

          {/* fallback */}
          <Route path="*" element={<Navigate to="/run" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
