/**
 * Re-export socketClient from the original realtime services location.
 * This file exists so that geolocationService.js in this directory can import it
 * without broken relative paths.
 */
export { realtimeClient } from '../../../realtime/socketClient';
