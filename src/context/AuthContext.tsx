import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, SchoolIdentity } from '../types/index.ts';

interface AuthContextType {
  user: User | null;
  token: string | null;
  hasSchoolIdentity: boolean;
  isIdentityLocked: boolean;
  schoolIdentity: SchoolIdentity | null;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  refreshUserData: () => Promise<void>;
  setSchoolIdentityData: (identity: SchoolIdentity | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('si_sumatif_token'));
  const [hasSchoolIdentity, setHasSchoolIdentity] = useState<boolean>(false);
  const [isIdentityLocked, setIsIdentityLocked] = useState<boolean>(false);
  const [schoolIdentity, setSchoolIdentity] = useState<SchoolIdentity | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchIdentity = async (authToken: string) => {
    try {
      const res = await fetch('/api/school-identity', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSchoolIdentity(data.identity);
        setHasSchoolIdentity(!!data.identity);
        setIsIdentityLocked(!!data.identity?.isLocked);
      }
    } catch (e) {
      console.error('Error fetching school identity:', e);
    }
  };

  const refreshUserData = async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        await fetchIdentity(token);
      } else {
        logout();
      }
    } catch {
      logout();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUserData();
  }, [token]);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem('si_sumatif_token', newToken);
    setToken(newToken);
    setUser(newUser);
    fetchIdentity(newToken);
  };

  const logout = () => {
    localStorage.removeItem('si_sumatif_token');
    setToken(null);
    setUser(null);
    setSchoolIdentity(null);
    setHasSchoolIdentity(false);
    setIsIdentityLocked(false);
  };

  const setSchoolIdentityData = (identity: SchoolIdentity | null) => {
    setSchoolIdentity(identity);
    setHasSchoolIdentity(!!identity);
    setIsIdentityLocked(!!identity?.isLocked);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        hasSchoolIdentity,
        isIdentityLocked,
        schoolIdentity,
        isLoading,
        login,
        logout,
        refreshUserData,
        setSchoolIdentityData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
