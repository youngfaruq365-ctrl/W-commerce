import React, { createContext, useContext, useState, useEffect } from 'react';

// Create a unified MapContext that any provider (Mock, Mapbox, Google) will populate
const MapContext = createContext(null);

export const useMap = () => {
    const context = useContext(MapContext);
    if (!context) {
        throw new Error('useMap must be used within a MapProvider');
    }
    return context;
};

// Abstract MapProvider that can swap out underlying implementations
export const MapProvider = ({ children, provider = 'leaflet', apiKey }) => {
    // In the future, this component will dynamically render MockMapProvider, MapboxProvider, etc.
    // based on the `provider` prop.

    return (
        <MapContext.Provider value={{ provider }}>
            {children}
        </MapContext.Provider>
    );
};
