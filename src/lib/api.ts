import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

export const TOKEN_STORAGE_KEY = 'tdp_classroom_token';
export const USER_STORAGE_KEY = 'tdp_classroom_user';

export const getApiBaseUrl = (): string => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/+$/, '');
  }
  if (typeof window !== 'undefined' && window.location) {
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    return `${protocol}//${hostname}:3000`;
  }
  return 'http://localhost:3000';
};

const baseURL = getApiBaseUrl();

export const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request interceptor to attach JWT token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // For multipart uploads, allow browser and Axios to automatically set boundary
    if (config.data instanceof FormData && config.headers) {
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle status codes
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string | string[]; error?: string; errors?: string[] }>) => {
    const status = error.response?.status;
    let message = 'An unexpected error occurred';

    const errorData = error.response?.data;
    if (errorData?.errors && Array.isArray(errorData.errors) && errorData.errors.length > 0) {
      message = errorData.errors.join(', ');
    } else if (errorData?.message) {
      if (Array.isArray(errorData.message)) {
        message = errorData.message.join(', ');
      } else {
        message = errorData.message;
      }
    } else if (errorData?.error) {
      message = errorData.error;
    }

    switch (status) {
      case 401:
        // Unauthorized - session expired or invalid credentials
        if (!error.config?.url?.includes('/auth/login') && !error.config?.url?.includes('/auth/signup')) {
          localStorage.removeItem(TOKEN_STORAGE_KEY);
          localStorage.removeItem(USER_STORAGE_KEY);
          window.dispatchEvent(new CustomEvent('auth:unauthorized', { detail: { message: 'Session expired. Please log in again.' } }));
        }
        break;
      case 403:
        // Forbidden
        message = message || 'You do not have permission to access this resource.';
        break;
      case 404:
        // Not Found
        message = message || 'Requested resource was not found.';
        break;
      case 500:
        // Server Error
        message = message || 'Internal server error. Please try again later.';
        break;
      default:
        if (!error.response) {
          message = 'Unable to connect to the server. Please check your network or server status.';
        }
        break;
    }

    return Promise.reject(new Error(message));
  }
);

export default api;
