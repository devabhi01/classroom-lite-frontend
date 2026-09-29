export type UserRole = 'TEACHER' | 'STUDENT' | 'HOST';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role?: UserRole;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface SignupDto {
  name: string;
  email: string;
  password: string;
  avatar?: string;
  role?: UserRole;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (credentials: LoginDto) => Promise<void>;
  signup: (credentials: SignupDto) => Promise<void>;
  loginAsDemo: (role?: 'HOST' | 'STUDENT', customName?: string) => void;
  updateRole: (role: UserRole) => void;
  logout: () => void;
}
