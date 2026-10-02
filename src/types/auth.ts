export type UserRole = 'TEACHER' | 'STUDENT' | 'HOST';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role?: UserRole;
  isEmailVerified?: boolean;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface VerifyEmailDto {
  email: string;
  otp: string;
}

export interface SignupDto {
  name: string;
  email: string;
  password: string;
  avatar?: string;
  role?: UserRole;
  // Teacher options
  institutionName?: string;
  institutionId?: string;
  institutionCode?: string;
  // Student options
  institutionIds?: string[];
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (credentials: LoginDto) => Promise<void>;
  signup: (credentials: SignupDto) => Promise<void>;
  verifyEmail: (dto: VerifyEmailDto) => Promise<void>;
  resendVerification: (email: string) => Promise<void>;
  updateRole: (role: UserRole) => void;
  logout: () => void;
}
