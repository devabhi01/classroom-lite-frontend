import { io, Socket } from 'socket.io-client';
import { TOKEN_STORAGE_KEY, getApiBaseUrl } from './api';

let socket: Socket | null = null;

export const getSocketUrl = (): string => {
  const base = getApiBaseUrl();
  const cleaned = base.replace(/\/+$/, '');
  return `${cleaned}/classroom`;
};

export const getSocket = (): Socket => {
  if (socket) {
    return socket;
  }

  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  const socketUrl = getSocketUrl();

  socket = io(socketUrl, {
    autoConnect: false,
    transports: ['websocket', 'polling'],
    auth: {
      token: token ? (token.startsWith('Bearer ') ? token : `Bearer ${token}`) : '',
    },
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    timeout: 10000,
  });

  return socket;
};

export const connectSocket = (customToken?: string): Socket => {
  const currentSocket = getSocket();
  const token = customToken || localStorage.getItem(TOKEN_STORAGE_KEY);

  if (currentSocket) {
    currentSocket.auth = {
      token: token ? (token.startsWith('Bearer ') ? token : `Bearer ${token}`) : '',
    };

    if (!currentSocket.connected) {
      currentSocket.connect();
    }
  }

  return currentSocket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
};
