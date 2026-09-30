import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  loginUser,
  signupUser,
  verifyEmailThunk,
  resendVerificationThunk,
  authActions,
} from '@/store/slices/authSlice';
import { LoginDto, SignupDto, VerifyEmailDto, AuthContextType } from '@/types/auth';

/**
 * useAuth Hook powered completely by Redux Toolkit
 * Replaces React Context while maintaining full backward-compatibility
 * with all existing components.
 */
export const useAuth = (): AuthContextType => {
  const dispatch = useAppDispatch();
  const { user, token, isAuthenticated, loading } = useAppSelector((state) => state.auth);

  const login = useCallback(
    async (credentials: LoginDto) => {
      const resultAction = await dispatch(loginUser(credentials));
      if (loginUser.rejected.match(resultAction)) {
        const payload: any = resultAction.payload;
        const err: any = new Error(typeof payload === 'string' ? payload : payload?.message || 'Login failed');
        if (payload?.requiresVerification) {
          err.requiresVerification = true;
          err.email = payload.email;
        }
        throw err;
      }
    },
    [dispatch],
  );

  const signup = useCallback(
    async (payload: SignupDto) => {
      const resultAction = await dispatch(signupUser(payload));
      if (signupUser.rejected.match(resultAction)) {
        throw new Error((resultAction.payload as string) || 'Signup failed');
      }
      return resultAction.payload;
    },
    [dispatch],
  );

  const verifyEmail = useCallback(
    async (data: VerifyEmailDto) => {
      const resultAction = await dispatch(verifyEmailThunk(data));
      if (verifyEmailThunk.rejected.match(resultAction)) {
        throw new Error((resultAction.payload as string) || 'Verification failed');
      }
    },
    [dispatch],
  );

  const resendVerification = useCallback(
    async (email: string) => {
      const resultAction = await dispatch(resendVerificationThunk(email));
      if (resendVerificationThunk.rejected.match(resultAction)) {
        throw new Error((resultAction.payload as string) || 'Resend failed');
      }
      return resultAction.payload as string;
    },
    [dispatch],
  );

  const loginAsDemo = useCallback(
    (role: 'HOST' | 'STUDENT' = 'HOST', customName?: string) => {
      dispatch(authActions.loginAsDemo({ role, customName }));
    },
    [dispatch],
  );

  const logout = useCallback(() => {
    dispatch(authActions.logout());
  }, [dispatch]);

  return {
    user,
    token,
    isAuthenticated,
    loading,
    login,
    signup,
    verifyEmail,
    resendVerification,
    loginAsDemo,
    logout,
  };
};
