import React, { createContext, useState, useEffect, useCallback } from 'react';
import api, { TOKEN_STORAGE_KEY, USER_STORAGE_KEY } from '@/lib/api';
import { disconnectSocket } from '@/lib/socket';
import { toast } from '@/components/ui/Toast';
import { User, UserRole, LoginDto, SignupDto, AuthContextType } from '@/types/auth';

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Initialize auth state from localStorage
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
      const storedUser = localStorage.getItem(USER_STORAGE_KEY);

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch (err) {
      console.error('Failed to parse stored auth user', err);
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(USER_STORAGE_KEY);
    } finally {
      setLoading(false);
    }

    const handleUnauthorized = (e: Event) => {
      const customEvent = e as CustomEvent<{ message?: string }>;
      logout();
      toast.error(customEvent.detail?.message || 'Session expired. Please log in again.');
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, []);

  const login = useCallback(async (credentials: LoginDto) => {
    try {
      const response = await api.post('/auth/login', {
        email: credentials.email.trim(),
        password: credentials.password,
      });
      const data = response.data;
      const authData = data?.data || data;

      const receivedToken: string =
        authData?.accessToken ||
        authData?.token ||
        authData?.access_token ||
        data?.accessToken ||
        data?.token;

      const userPayload = authData?.user || data?.user;
      const receivedUser: User = {
        id: userPayload?.id || userPayload?._id || data?.id || data?.userId || 'user_' + Date.now(),
        name: userPayload?.name || data?.name || credentials.email.split('@')[0],
        email: userPayload?.email || data?.email || credentials.email,
        avatar: userPayload?.avatar || data?.avatar,
        role: userPayload?.role || data?.role || 'TEACHER',
      };
      if (userPayload && !userPayload.role && data?.role) {
        receivedUser.role = data.role;
      }

      if (!receivedToken) {
        throw new Error('No authentication token received from server');
      }

      localStorage.setItem(TOKEN_STORAGE_KEY, receivedToken);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(receivedUser));

      setToken(receivedToken);
      setUser(receivedUser);
      toast.success(`Welcome back, ${receivedUser.name}!`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Invalid credentials';
      toast.error(message, 'Login Failed');
      throw error;
    }
  }, []);

  const signup = useCallback(async (payload: SignupDto) => {
    try {
      // Backend SignupDto strictly only accepts { name, email, password, avatar }
      // Sending additional properties like 'role' causes NestJS ValidationPipe to reject with 400 Bad Request
      const backendPayload: { name: string; email: string; password: string; avatar?: string; role?: string } = {
        name: payload.name.trim(),
        email: payload.email.trim(),
        password: payload.password,
      };
      if (payload.avatar) {
        backendPayload.avatar = payload.avatar;
      }
      if (payload.role) {
        backendPayload.role = payload.role;
      }

      const response = await api.post('/auth/signup', backendPayload);
      const data = response.data;
      const authData = data?.data || data;

      const receivedToken: string =
        authData?.accessToken ||
        authData?.token ||
        authData?.access_token ||
        data?.accessToken ||
        data?.token;

      const userPayload = authData?.user || data?.user;
      const receivedUser: User = {
        id: userPayload?.id || userPayload?._id || data?.id || data?.userId || 'user_' + Date.now(),
        name: userPayload?.name || payload.name,
        email: userPayload?.email || payload.email,
        avatar: userPayload?.avatar || payload.avatar,
        role: payload.role || userPayload?.role || data?.role || 'STUDENT',
      };

      if (receivedToken) {
        localStorage.setItem(TOKEN_STORAGE_KEY, receivedToken);
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(receivedUser));
        setToken(receivedToken);
        setUser(receivedUser);
        toast.success(`Account created successfully! Welcome, ${receivedUser.name}.`);
      } else {
        toast.success('Account created! Please log in to continue.');
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Signup failed';
      toast.error(message, 'Registration Error');
      throw error;
    }
  }, []);

  const loginAsDemo = useCallback((role: 'HOST' | 'STUDENT' = 'HOST', customName?: string) => {
    const isHostRole = role === 'HOST';
    const demoUser: User = {
      id: isHostRole ? 'demo_host_101' : 'demo_student_202',
      name: customName || (isHostRole ? 'Prof. Abhishek (Demo Host)' : 'Alex Kumar (Demo Student)'),
      email: isHostRole ? 'host@tdpclassroom.com' : 'student@tdpclassroom.com',
      role: isHostRole ? 'TEACHER' : 'STUDENT',
    };
    const demoToken = `demo_jwt_token_${Date.now()}`;

    localStorage.setItem(TOKEN_STORAGE_KEY, demoToken);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(demoUser));

    setToken(demoToken);
    setUser(demoUser);
    toast.success(`Logged in as ${demoUser.name} (Demo Mode)`);
  }, []);

  const updateRole = useCallback((newRole: UserRole) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, role: newRole };
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
    toast.success(`Role updated to ${newRole === 'TEACHER' || newRole === 'HOST' ? 'Teacher (Host)' : 'Student'}`);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
    disconnectSocket();
    setToken(null);
    setUser(null);
  }, []);

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: !!token && !!user,
    loading,
    login,
    signup,
    loginAsDemo,
    updateRole,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
