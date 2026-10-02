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
        if (storedToken.startsWith('demo_jwt_token_')) {
          localStorage.removeItem(TOKEN_STORAGE_KEY);
          localStorage.removeItem(USER_STORAGE_KEY);
        } else {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        }
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
      const backendPayload: Record<string, any> = {
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
      if (payload.institutionName) {
        backendPayload.institutionName = payload.institutionName.trim();
      }
      if (payload.institutionId) {
        backendPayload.institutionId = payload.institutionId;
      }
      if (payload.institutionCode) {
        backendPayload.institutionCode = payload.institutionCode.trim();
      }
      if (payload.institutionIds && payload.institutionIds.length > 0) {
        backendPayload.institutionIds = payload.institutionIds;
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

      const requiresVerification =
        data?.requiresVerification === true ||
        authData?.requiresVerification === true ||
        userPayload?.isEmailVerified === false;

      if (requiresVerification) {
        toast.info('Account created! Please enter the 6-digit verification code sent to your email.');
        return;
      }

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

  const verifyEmail = useCallback(async (dto: { email: string; otp: string }) => {
    try {
      const response = await api.post('/auth/verify-email', {
        email: dto.email.toLowerCase().trim(),
        otp: dto.otp.trim(),
      });
      const data = response.data;
      const authData = data?.data || data;

      const receivedToken: string =
        authData?.accessToken ||
        authData?.token ||
        data?.accessToken ||
        data?.token;

      const userPayload = authData?.user || data?.user;
      if (receivedToken && userPayload) {
        const receivedUser: User = {
          id: userPayload.id || userPayload._id,
          name: userPayload.name,
          email: userPayload.email,
          avatar: userPayload.avatar,
          role: userPayload.role,
          isEmailVerified: true,
        };
        localStorage.setItem(TOKEN_STORAGE_KEY, receivedToken);
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(receivedUser));
        setToken(receivedToken);
        setUser(receivedUser);
      }
      toast.success('Email verified successfully! Welcome.');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Verification failed';
      toast.error(message, 'Verification Error');
      throw error;
    }
  }, []);

  const resendVerification = useCallback(async (email: string) => {
    try {
      await api.post('/auth/resend-verification', {
        email: email.toLowerCase().trim(),
      });
      toast.success('A new 6-digit verification code has been sent to your email.');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to resend code';
      toast.error(message, 'Resend Failed');
      throw error;
    }
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
    verifyEmail,
    resendVerification,
    updateRole,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
