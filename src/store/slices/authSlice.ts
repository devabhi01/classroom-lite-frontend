import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import api, { TOKEN_STORAGE_KEY, USER_STORAGE_KEY } from '@/lib/api';
import { disconnectSocket } from '@/lib/socket';
import { toast } from '@/components/ui/Toast';
import { User, LoginDto, SignupDto, VerifyEmailDto } from '@/types/auth';

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

// Synchronously restore authentication state from localStorage
const getInitialAuthState = (): AuthState => {
  try {
    const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    const storedUser = localStorage.getItem(USER_STORAGE_KEY);

    if (storedToken && storedUser) {
      return {
        user: JSON.parse(storedUser),
        token: storedToken,
        isAuthenticated: true,
        loading: false,
        error: null,
      };
    }
  } catch (err) {
    console.error('Failed to parse stored auth user', err);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
  }

  return {
    user: null,
    token: null,
    isAuthenticated: false,
    loading: false,
    error: null,
  };
};

const initialState: AuthState = getInitialAuthState();

/**
 * Async Thunk: User Login
 */
export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async (credentials: LoginDto, { rejectWithValue }) => {
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
        isEmailVerified: userPayload?.isEmailVerified ?? true,
      };
      if (userPayload && !userPayload.role && data?.role) {
        receivedUser.role = data.role;
      }

      if (!receivedToken) {
        throw new Error('No authentication token received from server');
      }

      localStorage.setItem(TOKEN_STORAGE_KEY, receivedToken);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(receivedUser));

      toast.success(`Welcome back, ${receivedUser.name}!`);
      return { user: receivedUser, token: receivedToken };
    } catch (error: any) {
      const errResponse = error.response?.data;
      const message =
        errResponse?.message ||
        (error instanceof Error ? error.message : 'Invalid credentials');

      // Preserve requiresVerification flag in rejection payload
      if (errResponse?.requiresVerification) {
        toast.error(message, 'Verification Required');
        return rejectWithValue({ message, requiresVerification: true, email: errResponse.email || credentials.email });
      }

      toast.error(message, 'Login Failed');
      return rejectWithValue(message);
    }
  },
);

/**
 * Async Thunk: User Signup
 */
export const signupUser = createAsyncThunk(
  'auth/signupUser',
  async (payload: SignupDto, { rejectWithValue }) => {
    try {
      // Backend SignupDto accepts { name, email, password, avatar, role, phone }
      const backendPayload: {
        name: string;
        email: string;
        password: string;
        avatar?: string;
        role?: string;
        phone?: string;
      } = {
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
      if (payload.phone) {
        backendPayload.phone = payload.phone.trim();
      }

      const response = await api.post('/auth/signup', backendPayload);
      const data = response.data;
      const authData = data?.data || data;

      const receivedToken: string | undefined =
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
        phone: userPayload?.phone || payload.phone,
        avatar: userPayload?.avatar || payload.avatar,
        role: payload.role || userPayload?.role || data?.role || 'STUDENT',
        isEmailVerified: false,
      };

      if (receivedToken) {
        localStorage.setItem(TOKEN_STORAGE_KEY, receivedToken);
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(receivedUser));
        toast.success(`Account created successfully! Welcome, ${receivedUser.name}.`);
        return { user: receivedUser, token: receivedToken, requiresVerification: false };
      } else {
        const msg = payload.phone
          ? 'Account created! Verification OTP sent to your email and phone.'
          : 'Account created! Please check your email to verify your account.';
        toast.success(msg);
        return {
          user: null,
          token: null,
          requiresVerification: true,
          email: payload.email,
          phone: payload.phone,
        };
      }
    } catch (error: any) {
      const message =
        error.response?.data?.message ||
        (error instanceof Error ? error.message : 'Signup failed');
      toast.error(message, 'Registration Error');
      return rejectWithValue(message);
    }
  },
);

/**
 * Async Thunk: Verify Email
 */
export const verifyEmailThunk = createAsyncThunk(
  'auth/verifyEmail',
  async (payload: VerifyEmailDto, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/verify-email', payload);
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
        id: userPayload?.id || userPayload?._id || data?.id || 'user_' + Date.now(),
        name: userPayload?.name || data?.name || 'Classroom User',
        email: userPayload?.email || data?.email || payload.email || '',
        avatar: userPayload?.avatar || data?.avatar,
        role: userPayload?.role || data?.role || 'STUDENT',
        isEmailVerified: true,
      };

      if (receivedToken) {
        localStorage.setItem(TOKEN_STORAGE_KEY, receivedToken);
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(receivedUser));
      }

      toast.success(data?.message || 'Email verified successfully! Welcome.');
      return { user: receivedUser, token: receivedToken };
    } catch (error: any) {
      const message =
        error.response?.data?.message ||
        (error instanceof Error ? error.message : 'Failed to verify email');
      toast.error(message, 'Verification Failed');
      return rejectWithValue(message);
    }
  },
);

/**
 * Async Thunk: Resend Verification Email
 */
export const resendVerificationThunk = createAsyncThunk(
  'auth/resendVerification',
  async (identifier: string, { rejectWithValue }) => {
    try {
      const clean = identifier.trim();
      const payload = clean.includes('@') ? { email: clean } : { phone: clean };
      const response = await api.post('/auth/resend-verification', payload);
      const message =
        response.data?.message || 'Verification OTP resent! Please check your inbox or phone.';
      toast.success(message);
      return message;
    } catch (error: any) {
      const message =
        error.response?.data?.message ||
        (error instanceof Error ? error.message : 'Failed to resend verification OTP');
      toast.error(message, 'Resend Failed');
      return rejectWithValue(message);
    }
  },
);

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginAsDemo: (
      state,
      action: PayloadAction<{ role?: 'HOST' | 'STUDENT'; customName?: string } | undefined>,
    ) => {
      const role = action.payload?.role || 'HOST';
      const customName = action.payload?.customName;
      const isHostRole = role === 'HOST';
      const demoUser: User = {
        id: isHostRole ? 'demo_host_101' : 'demo_student_202',
        name: customName || (isHostRole ? 'Prof. Abhishek (Demo Host)' : 'Alex Kumar (Demo Student)'),
        email: isHostRole ? 'host@tdpclassroom.com' : 'student@tdpclassroom.com',
        role: isHostRole ? 'TEACHER' : 'STUDENT',
        isEmailVerified: true,
      };
      const demoToken = `demo_jwt_token_${Date.now()}`;

      localStorage.setItem(TOKEN_STORAGE_KEY, demoToken);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(demoUser));

      state.user = demoUser;
      state.token = demoToken;
      state.isAuthenticated = true;
      state.loading = false;
      state.error = null;
      toast.success(`Logged in as ${demoUser.name} (Demo Mode)`);
    },
    logout: (state) => {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(USER_STORAGE_KEY);
      disconnectSocket();
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.loading = false;
      state.error = null;
    },
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(action.payload));
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Login
    builder
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = typeof action.payload === 'string' ? action.payload : (action.payload as any)?.message || 'Login failed';
      });

    // Signup
    builder
      .addCase(signupUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(signupUser.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload.token && action.payload.user) {
          state.user = action.payload.user;
          state.token = action.payload.token;
          state.isAuthenticated = true;
        }
        state.error = null;
      })
      .addCase(signupUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Verify Email
    builder
      .addCase(verifyEmailThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(verifyEmailThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(verifyEmailThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const authActions = authSlice.actions;
export default authSlice.reducer;
