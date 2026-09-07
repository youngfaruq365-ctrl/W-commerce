import { realtimeClient } from './socketClient';
import { useTrackingStore } from '../../store/trackingStore';

class GeolocationService {
    constructor() {
        this.watchId = null;
        this.lastPosition = null;
        this.lastTransmitTime = 0;
        this.minDistanceMeters = 15;
        this.heartbeatMs = 15000; // 15 seconds
        this.minAccuracyMeters = 50; // Reject wildly inaccurate GPS
    }

    startTracking() {
        if (!navigator.geolocation) {
            console.error('Geolocation is not supported by this browser.');
            useTrackingStore.getState().setGpsStatus('UNSUPPORTED');
            return;
        }

        if (this.watchId !== null) return;

        useTrackingStore.getState().setGpsStatus('CONNECTING');

        this.watchId = navigator.geolocation.watchPosition(
            (position) => this.handlePosition(position),
            (error) => this.handleError(error),
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 5000 // Accept up to 5s old cached position initially
            }
        );
    }

    stopTracking() {
        if (this.watchId !== null) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
            this.lastPosition = null;
            this.lastTransmitTime = 0;
            useTrackingStore.getState().setGpsStatus('OFFLINE');
        }
    }

    handlePosition(position) {
        const { latitude, longitude, accuracy, speed, heading } = position.coords;

        // 1. Accuracy Filter
        if (accuracy > this.minAccuracyMeters) {
            useTrackingStore.getState().setGpsStatus('POOR_SIGNAL');
            // We might still save it locally but not transmit it if it's too bad
            if (accuracy > 150) return; // Completely ignore terrible signals
        } else {
            useTrackingStore.getState().setGpsStatus('ACTIVE');
        }

        const now = Date.now();
        const timeSinceLastTransmit = now - this.lastTransmitTime;

        // 2. Distance & Heartbeat Filter
        let shouldTransmit = false;
        
        if (!this.lastPosition) {
            shouldTransmit = true;
        } else if (timeSinceLastTransmit >= this.heartbeatMs) {
            shouldTransmit = true; // Heartbeat
        } else {
            const dist = this.calculateDistanceMeters(
                this.lastPosition.latitude,
                this.lastPosition.longitude,
                latitude,
                longitude
            );
            if (dist >= this.minDistanceMeters) {
                shouldTransmit = true; // Moved enough
            }
        }

        if (shouldTransmit) {
            this.transmitLocation({
                lat: latitude,
                lng: longitude,
                accuracy,
                speed,
                heading,
                timestamp: position.timestamp
            });
        }
    }

    transmitLocation(payload) {
        // Save to local store
        useTrackingStore.getState().updateCourierLocation(payload);
        
        // Transmit over socket
        realtimeClient.emit('courier:location', payload);

        this.lastPosition = { latitude: payload.lat, longitude: payload.lng };
        this.lastTransmitTime = Date.now();
    }

    handleError(error) {
        let status = 'ERROR';
        switch(error.code) {
            case error.PERMISSION_DENIED:
                status = 'DENIED';
                break;
            case error.POSITION_UNAVAILABLE:
            case error.TIMEOUT:
                status = 'LOST_SIGNAL';
                break;
        }
        useTrackingStore.getState().setGpsStatus(status);
        console.error('Geolocation Error:', error.message);
    }

    // Helper: Haversine distance
    calculateDistanceMeters(lat1, lon1, lat2, lon2) {
        const R = 6371e3;
        const p1 = lat1 * Math.PI / 180;
        const p2 = lat2 * Math.PI / 180;
        const dp = (lat2 - lat1) * Math.PI / 180;
        const dl = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dp/2) * Math.sin(dp/2) +
                  Math.cos(p1) * Math.cos(p2) *
                  Math.sin(dl/2) * Math.sin(dl/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }
}

export const geolocationService = new GeolocationService();
