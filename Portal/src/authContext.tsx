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
  refreshCountdown: number;
  showRefreshWarning: boolean;
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
  const [refreshTimer, setRefreshTimer] = useState<NodeJS.Timeout | null>(null);
  const [showRefreshWarning, setShowRefreshWarning] = useState(false);
  const [refreshCountdown, setRefreshCountdown] = useState(0);

  // Function to set up auto-refresh timer
  const setupAutoRefresh = (tokenExpiryMinutes: number = 30) => {
    // Clear any existing timer
    if (refreshTimer) {
      clearTimeout(refreshTimer);
    }

    // Show warning 2 minutes before expiry
    const warningTimeMs = (tokenExpiryMinutes - 2) * 60 * 1000;
    const refreshTimeMs = (tokenExpiryMinutes - 1) * 60 * 1000;
    
    console.log(`AuthContext: Setting auto-refresh timer for ${tokenExpiryMinutes - 1} minutes (${refreshTimeMs}ms)`);
    console.log(`AuthContext: Warning will show at ${tokenExpiryMinutes - 2} minutes (${warningTimeMs}ms)`);
    
    // Set warning timer
    setTimeout(() => {
      setShowRefreshWarning(true);
      setRefreshCountdown(120); // 2 minutes countdown
      
      // Start countdown
      const countdownInterval = setInterval(() => {
        setRefreshCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
    }, warningTimeMs);
    
    // Set refresh timer
    const timer = setTimeout(() => {
      console.log('AuthContext: JWT token expiring soon, refreshing page...');
      window.location.reload();
    }, refreshTimeMs);
    
    setRefreshTimer(timer);
  };

  // Function to clear auto-refresh timer
  const clearAutoRefresh = () => {
    if (refreshTimer) {
      clearTimeout(refreshTimer);
      setRefreshTimer(null);
      setShowRefreshWarning(false);
      setRefreshCountdown(0);
      console.log('AuthContext: Auto-refresh timer cleared');
    }
  };

  // Function to manually refresh now
  const refreshNow = () => {
    console.log('AuthContext: Manual refresh requested');
    window.location.reload();
  };

  // Function to extend session (reset timer)
  const extendSession = () => {
    if (token) {
      // Debounce the session extension to prevent too many calls
      if (refreshTimer) {
        clearTimeout(refreshTimer);
      }
      
      const debouncedExtension = setTimeout(() => {
        console.log('AuthContext: Extending session, resetting auto-refresh timer');
        setupAutoRefresh();
      }, 1000); // Wait 1 second after last activity
      
      setRefreshTimer(debouncedExtension);
    }
  };

  // Set up activity listeners to extend session
  useEffect(() => {
    if (token) {
      const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
      
      const handleActivity = () => {
        extendSession();
      };

      // Add event listeners
      activityEvents.forEach(event => {
        document.addEventListener(event, handleActivity, { passive: true });
      });

      // Cleanup function
      return () => {
        activityEvents.forEach(event => {
          document.removeEventListener(event, handleActivity);
        });
      };
    }
  }, [token]);

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
      // Set up auto-refresh for existing token
      setupAutoRefresh();
      // fetchUserProfile will be called in the next useEffect when token changes
    } else {
      console.log('AuthContext: No stored token, setting loading to false');
      setIsLoading(false);
    }

    // Cleanup function to clear timer on unmount
    return () => {
      clearAutoRefresh();
    };
  }, []); // Only run once on mount

  useEffect(() => {
    console.log('AuthContext: Token useEffect triggered, token value:', token ? 'exists' : 'none');
    if (token) {
      console.log('AuthContext: Token available, fetching user profile...');
      fetchUserProfile();
      // Set up auto-refresh for new token
      setupAutoRefresh();
    } else {
      console.log('AuthContext: No token available, skipping profile fetch');
      // Clear auto-refresh when no token
      clearAutoRefresh();
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
      
      // Set up auto-refresh for new token
      setupAutoRefresh();
      
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
    // Clear auto-refresh timer on logout
    clearAutoRefresh();
  };

  const value: AuthContextType = {
    user,
    token,
    login,
    register,
    logout,
    isLoading,
    refreshCountdown,
    showRefreshWarning,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      
      {/* JWT Expiry Warning */}
      {showRefreshWarning && (
        <div className="jwt-warning-popup">
          <div className="jwt-warning-title">
            ⚠️ Session Expiring Soon
          </div>
          <div className="jwt-warning-countdown">
            Your session will expire in {Math.floor(refreshCountdown / 60)}:{(refreshCountdown % 60).toString().padStart(2, '0')}
          </div>
          <div className="jwt-warning-buttons">
            <button
              onClick={refreshNow}
              className="jwt-warning-btn primary"
            >
              Refresh Now
            </button>
            <button
              onClick={() => setShowRefreshWarning(false)}
              className="jwt-warning-btn secondary"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
};
