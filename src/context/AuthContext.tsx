// src/context/AuthContext.tsx
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import api from '../services/api';

interface User {
  username: string;
  email: string;
  roleLevel: number;
  roleName: string;
  [key: string]: any;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  refreshMe: (force?: boolean) => Promise<boolean>;
  logoutLocal: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);


let meInFlight: Promise<boolean> | null = null;
let meCached: boolean | null = null;

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const initOnce = useRef(false);

  /**
   * Refresh current user (/api/me)
   * @param force bypass cache + in-flight reuse
   */
  const refreshMe = async (force: boolean = false): Promise<boolean> => {
    // use cache (unless forced)
    if (!force && meCached !== null) {
      setIsLoading(false);
      return meCached;
    }

    // reuse in-flight request (unless forced)
    if (!force && meInFlight) {
      return meInFlight;
    }

    const run = async (): Promise<boolean> => {
      try {
        const res = await api.get('/me');
        const ok = res.status === 200 && !!res.data?.user;

        if (ok) {
          setUser(res.data.user);
          setIsAuthenticated(true);
        } else {
          setUser(null);
          setIsAuthenticated(false);
        }

        meCached = ok;
        return ok;
      } catch {
        setUser(null);
        setIsAuthenticated(false);
        meCached = false;
        return false;
      } finally {
        setIsLoading(false);
        meInFlight = null;
      }
    };

    // reset cache if forced
    if (force) {
      meCached = null;
      meInFlight = null;
    }

    meInFlight = run();
    return meInFlight;
  };

  /**
   * Initial bootstrap (runs once)
   * - restore token from sessionStorage
   * - set axios Authorization header
   * - call /me
   */
  useEffect(() => {
    if (initOnce.current) return;
    initOnce.current = true;

    const token = sessionStorage.getItem('access_token');
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }

    refreshMe(false);
  }, []);

  /**
   * Local logout (frontend only)
   */
  const logoutLocal = () => {
    meCached = null;
    meInFlight = null;

    sessionStorage.removeItem('access_token');
    delete api.defaults.headers.common['Authorization'];

    setUser(null);
    setIsAuthenticated(false);
    setIsLoading(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        refreshMe,
        logoutLocal,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
};
