import React, { useEffect } from 'react';
import { MapView } from '../../maps/MapView';
import { useTrackingStore } from '../../store/trackingStore';
import { useDispatchStore } from '../../store/dispatchStore';
import { realtimeClient } from '../../services/realtime/socketClient';

const LiveDriverMap = () => {
    const { courierLocations, initRealtime } = useTrackingStore();
    const { fleet, fetchFleet } = useDispatchStore();

    useEffect(() => {
        fetchFleet();
        initRealtime();
        
        // Function to join the admin room
        const joinAdminRoom = () => {
            realtimeClient.emit('join_chat', { room: 'dispatch:admins' });
        };

        if (realtimeClient.isConnected) {
            joinAdminRoom();
        } else {
            // In socketClient.js we might not have a direct 'connect' event exposed like this, 
            // but we can listen to connection_status changes from trackingStore.
            // Let's just use a timeout or assume it connects fast enough, or we can use the trackingStore status.
        }
        
        // Let's register a connection_status listener if needed, but since we are using socket.io,
        // we can just emit. If it's not connected, the client might queue it, but it's better to ensure it.
        const checkInterval = setInterval(() => {
            if (realtimeClient.isConnected) {
                joinAdminRoom();
                clearInterval(checkInterval);
            }
        }, 1000);

        return () => clearInterval(checkInterval);
    }, [fetchFleet, initRealtime]);

    const activeCouriers = Object.keys(courierLocations).map(id => {
        const loc = courierLocations[id];
        const courierProfile = fleet.find(c => c.userId === id);
        
        // Calculate staleness
        const ageSeconds = (Date.now() - loc.timestamp) / 1000;
        let status = 'ACTIVE';
        if (ageSeconds > 120) status = 'OFFLINE';
        else if (ageSeconds > 30) status = 'STALE';

        return {
            id,
            lat: loc.lat,
            lng: loc.lng,
            name: courierProfile?.user?.fullName || `Courier ${id.substring(0, 4)}`,
            gpsStatus: status,
        };
    });

    return (
        <div className="flex flex-col h-full">
            <div className="p-4 border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm z-10 absolute top-0 w-full pointer-events-none">
                <h1 className="text-xl font-bold text-white">Live Fleet Tracking</h1>
                <p className="text-sm text-slate-400">Monitoring {activeCouriers.length} active couriers</p>
            </div>
            
            <div className="flex-1 h-full pt-20">
                <MapView couriers={activeCouriers} />
            </div>
        </div>
    );
};

export default LiveDriverMap;
