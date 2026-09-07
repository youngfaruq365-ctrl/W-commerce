/**
 * useSocket.js
 * React hook for socket.io real-time events.
 * Automatically identifies the user and listens for dashboard-specific events.
 */
import { useEffect, useRef } from 'react';
import { getSocket, identifyUser } from '../lib/socketClient';
import { useAuthStore } from '../store/authStore';

/**
 * @param {Object} events - Map of socket event name → callback function
 * @example
 * useSocket({
 *   'order:updated': (data) => refetchOrders(),
 *   'dispute:new': (data) => refetchDisputes(),
 * })
 */
export const useSocket = (events = {}) => {
  const { user } = useAuthStore();
  const listenersRef = useRef({});

  useEffect(() => {
    const socket = getSocket();

    // Identify user to the socket server (joins personal room)
    if (user?.id) {
      identifyUser(user.id);
    }

    // Register event listeners
    const registered = [];
    Object.entries(events).forEach(([event, handler]) => {
      socket.on(event, handler);
      registered.push([event, handler]);
    });
    listenersRef.current = registered;

    // Cleanup on unmount or events change
    return () => {
      registered.forEach(([event, handler]) => {
        socket.off(event, handler);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);
};

export default useSocket;
