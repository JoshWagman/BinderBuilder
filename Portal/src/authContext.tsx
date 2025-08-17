import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: number;
  username: string;
  email: string;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in on app start
    const storedToken = localStorage.getItem('token');
    console.log('AuthContext: Checking stored token:', storedToken ? 'exists' : 'none');
    console.log('AuthContext: Stored token length:', storedToken ? storedToken.length : 0);
    console.log('AuthContext: Stored token preview:', storedToken ? storedToken.substring(0, 20) + '...' : 'none');
    
    if (storedToken) {
      console.log('AuthContext: Setting token from localStorage...');
      setToken(storedToken);
      console.log('AuthContext: Token state set to:', storedToken ? 'exists' : 'none');
      // fetchUserProfile will be called in the next useEffect when token changes
    } else {
      console.log('AuthContext: No stored token, setting loading to false');
      setIsLoading(false);
    }
  }, []); // Only run once on mount

  useEffect(() => {
    console.log('AuthContext: Token useEffect triggered, token value:', token ? 'exists' : 'none');
    if (token) {
      console.log('AuthContext: Token available, fetching user profile...');
      fetchUserProfile();
    } else {
      console.log('AuthContext: No token available, skipping profile fetch');
    }
  }, [token]); // Run when token changes

  const fetchUserProfile = async (tokenToUse?: string) => {
    const tokenValue = tokenToUse || token;
    try {
      console.log('AuthContext: Fetching user profile with token:', tokenValue ? 'exists' : 'none');
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${tokenValue}`
        }
      });
      
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        // Token is invalid, clear it
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
      }
    } catch (error) {
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Login failed');
      }

      const data = await response.json();
      localStorage.setItem('token', data.access_token);
      setToken(data.access_token);
      await fetchUserProfile(data.access_token);
    } catch (error) {
      console.error('AuthContext: Login failed:', error);
      throw error;
    }
  };

  const register = async (username: string, email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Registration failed');
      }

      const userData = await response.json();
      setUser(userData);
      
      // Auto-login after successful registration
      await login(username, password);
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const value: AuthContextType = {
    user,
    token,
    login,
    register,
    logout,
    isLoading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
