/**
 * socketClient.js
 * Singleton socket.io connection used across all dashboards.
 * Connects to the backend and authenticates using the logged-in user's id.
 */
import { io } from 'socket.io-client';

let socket = null;

export const getSocket = () => {
  if (!socket) {
    const serverUrl = import.meta.env.VITE_API_URL || window.location.origin;
    socket = io(serverUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });
  }
  return socket;
};

/**
 * Identify the current user to the socket server.
 * Call this once after login / on dashboard mount.
 */
export const identifyUser = (userId) => {
  const s = getSocket();
  if (userId && s.connected) {
    s.emit('identify', { user: String(userId), status: 'online' });
  } else {
    // Wait for connection then identify
    s.once('connect', () => {
      s.emit('identify', { user: String(userId), status: 'online' });
    });
  }
};

export const disconnectSocket = () => {
  if (socket) {
    socket.emit('setStatus', { status: 'offline' });
    socket.disconnect();
    socket = null;
  }
};

export default getSocket;
