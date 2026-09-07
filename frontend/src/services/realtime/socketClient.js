import { io } from 'socket.io-client';

// In a real environment, this URL would be dynamic based on the environment (e.g., import.meta.env.VITE_API_URL)
// Since proxy is set up in Vite, we can just connect to the root namespace
const SOCKET_URL = '/'; 

class SocketClient {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.listeners = new Map();
    }

    connect(token) {
        if (this.socket) {
            console.warn('Socket is already connected or connecting.');
            return;
        }

        this.socket = io(SOCKET_URL, {
            auth: { token },
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
        });

        this.socket.on('connect', () => {
            console.log('Connected to realtime delivery namespace');
            this.isConnected = true;
            this._notifyStatusChange('connected');
        });

        this.socket.on('disconnect', (reason) => {
            console.warn('Disconnected from realtime server:', reason);
            this.isConnected = false;
            this._notifyStatusChange('disconnected');
        });

        // Register core logistics events
        this._registerEvent('courier:location');
        this._registerEvent('courier:online');
        this._registerEvent('courier:offline');
        this._registerEvent('delivery:assigned');
        this._registerEvent('delivery:status');
        this._registerEvent('delivery:reassigned');
        this._registerEvent('delivery:completed');
        this._registerEvent('delivery:offer');
        
        // Re-register any custom events that were added before connection
        for (const eventName of this.listeners.keys()) {
            if (eventName !== 'connection_status' && !this.socket._callbacks?.[`$${eventName}`]) {
                this._registerEvent(eventName);
            }
        }
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.isConnected = false;
        }
    }

    _registerEvent(eventName) {
        this.socket.on(eventName, (data) => {
            const callbacks = this.listeners.get(eventName) || [];
            callbacks.forEach(cb => cb(data));
        });
    }

    on(eventName, callback) {
        if (!this.listeners.has(eventName)) {
            this.listeners.set(eventName, []);
        }
        this.listeners.get(eventName).push(callback);

        // If the socket is already active and the event wasn't core registered, register it now
        if (this.socket && !this.socket._callbacks?.[`$${eventName}`]) {
            this._registerEvent(eventName);
        }
    }

    off(eventName, callback) {
        if (!this.listeners.has(eventName)) return;
        const callbacks = this.listeners.get(eventName).filter(cb => cb !== callback);
        this.listeners.set(eventName, callbacks);
    }

    emit(eventName, data) {
        if (!this.socket || !this.isConnected) {
            console.error(`Cannot emit ${eventName}: Socket is not connected.`);
            // In a robust PWA, we would queue this in offlineQueue
            return false;
        }
        this.socket.emit(eventName, data);
        return true;
    }

    _notifyStatusChange(status) {
        const callbacks = this.listeners.get('connection_status') || [];
        callbacks.forEach(cb => cb(status));
    }
}

// Export a singleton instance
export const realtimeClient = new SocketClient();
