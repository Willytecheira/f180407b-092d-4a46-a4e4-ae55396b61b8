import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'operator' | 'viewer';
  createdAt: string;
  lastLogin?: string;
  permissions: string[];
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEFAULT_PERMISSIONS = {
  admin: [
    'sessions:read', 'sessions:create', 'sessions:update', 'sessions:delete',
    'messages:read', 'messages:send', 'messages:delete',
    'users:read', 'users:create', 'users:update', 'users:delete',
    'metrics:read', 'webhooks:read', 'webhooks:create', 'webhooks:update', 'webhooks:delete',
    'system:read', 'system:update'
  ],
  operator: [
    'sessions:read', 'sessions:create', 'sessions:update',
    'messages:read', 'messages:send',
    'metrics:read', 'webhooks:read'
  ],
  viewer: [
    'sessions:read', 'messages:read', 'metrics:read'
  ]
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    const userData = localStorage.getItem('user_data');
    
    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser({
          ...parsedUser,
          permissions: DEFAULT_PERMISSIONS[parsedUser.role as keyof typeof DEFAULT_PERMISSIONS] || []
        });
      } catch (error) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      // Simulate API call to backend
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (response.ok) {
        const data = await response.json();
        const userData: User = {
          ...data.user,
          permissions: DEFAULT_PERMISSIONS[data.user.role as keyof typeof DEFAULT_PERMISSIONS] || []
        };
        
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('user_data', JSON.stringify(userData));
        setUser(userData);
        return true;
      }
      return false;
    } catch (error) {
      // Fallback demo login for development
      if (username === 'admin' && password === 'admin123') {
        const demoUser: User = {
          id: '1',
          username: 'admin',
          email: 'admin@whatsapp-api.com',
          role: 'admin',
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
          permissions: DEFAULT_PERMISSIONS.admin
        };
        
        localStorage.setItem('auth_token', 'demo_token_123');
        localStorage.setItem('user_data', JSON.stringify(demoUser));
        setUser(demoUser);
        return true;
      }
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
    setUser(null);
  };

  const hasPermission = (permission: string): boolean => {
    return user?.permissions.includes(permission) || false;
  };

  const value: AuthContextType = {
    user,
    login,
    logout,
    isAuthenticated: !!user,
    isLoading,
    hasPermission
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};