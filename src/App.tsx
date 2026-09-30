import React, { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from '@/store';
import { useAppDispatch } from '@/store/hooks';
import { authActions } from '@/store/slices/authSlice';
import { AppRoutes } from '@/routes/AppRoutes';
import { Toaster, toast } from '@/components/ui/Toast';

const AuthEventListener: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const handleUnauthorized = (e: Event) => {
      const customEvent = e as CustomEvent<{ message?: string }>;
      dispatch(authActions.logout());
      toast.error(customEvent.detail?.message || 'Session expired. Please log in again.');
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, [dispatch]);

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <AuthEventListener>
          <AppRoutes />
          <Toaster />
        </AuthEventListener>
      </BrowserRouter>
    </Provider>
  );
};

export default App;
