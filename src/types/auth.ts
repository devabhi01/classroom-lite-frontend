export type UserRole = 'TEACHER' | 'STUDENT' | 'HOST';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  role?: UserRole;
  isEmailVerified?: boolean;
  isPhoneVerified?: boolean;
}

export interface AuthResponse {
  user: User;
  token: string;
  requiresVerification?: boolean;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface SignupDto {
  name: string;
  email: string;
  password: string;
  phone?: string;
  avatar?: string;
  role?: UserRole;
}

export interface VerifyEmailDto {
  token?: string;
  code?: string;
  email?: string;
  phone?: string;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (credentials: LoginDto) => Promise<void>;
  signup: (credentials: SignupDto) => Promise<{ requiresVerification?: boolean; email?: string; phone?: string } | void>;
  verifyEmail: (data: VerifyEmailDto) => Promise<void>;
  resendVerification: (identifier: string) => Promise<string>;
  loginAsDemo: (role?: 'HOST' | 'STUDENT', customName?: string) => void;
  logout: () => void;
}
