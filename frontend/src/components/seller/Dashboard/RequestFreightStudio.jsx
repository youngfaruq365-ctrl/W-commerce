import React, { useState, useEffect } from 'react';
import { Truck, CheckCircle, ArrowRight, ArrowLeft, Sparkles, Download, Package, AlertCircle, Users, Settings, Star, Link, Megaphone, Zap, DollarSign, MapPin } from 'lucide-react';
import { apiClient as axios } from '@/utils/apiClient';
import { toast } from 'react-hot-toast';
import { GoogleMapProvider } from '../../../maps/GoogleMapProvider';
import { PolylineF } from '@react-google-maps/api';

const RequestFreightStudio = ({ onSuccess }) => {
  const [step, setStep] = useState('details');
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [pickupLocation, setPickupLocation] = useState('');
  const [dropoffAddress, setDropoffAddress] = useState('Lagos Central Hub');
  const [deliveryFee, setDeliveryFee] = useState('');
  const [pickupTime, setPickupTime] = useState('');
  const [deliverRate, setDeliverRate] = useState('');
  const [weight, setWeight] = useState('');
  const [volume, setVolume] = useState('');
  
  // Map waypoints
  const [waypoints, setWaypoints] = useState([]);
  const [centerLoc, setCenterLoc] = useState({ lat: 6.5244, lng: 3.3792 });
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchingMap, setIsSearchingMap] = useState(false);

  const handleSearchArea = async (e) => {
      e.preventDefault();
      if (!searchQuery.trim()) return;
      setIsSearchingMap(true);
      try {
          const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
          if (!res.ok) throw new Error('Failed to fetch map data');
          const data = await res.json();
          if (data && data.length > 0) {
              const { lat, lon } = data[0];
              setCenterLoc({ lat: parseFloat(lat), lng: parseFloat(lon) });
              setSearchQuery('');
          } else {
              toast.error("Location not found");
          }
      } catch (err) {
          console.error('Search area error:', err);
          toast.error("Error searching area: " + (err.message || 'Unknown error'));
      } finally {
          setIsSearchingMap(false);
      }
  };

  useEffect(() => {
      if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
              (pos) => setCenterLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
              () => {},
              { enableHighAccuracy: true }
          );
      }
  }, []);

  const clearMap = () => setWaypoints([]);

  const handleMapClick = (e) => {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      let name = `Stop ${waypoints.length + 1}`;
      if (waypoints.length === 0) name = "Pickup";
      else if (waypoints.length === 1) name = "Dropoff";
      
      setWaypoints([...waypoints, { lat, lng, name }]);
  };

  const startProcess = async () => {
    setStep('processing');
    setIsSubmitting(true);
    setProgress(10);
    setProgressText('Initializing...');
    
    try {
      setProgress(40);
      setProgressText('Verifying data...');
      
      const payload = {
        pickupLocation,
        dropoffAddress,
        deliveryFee: Number(deliveryFee),
        pickupTime,
        deliverRate: Number(deliverRate),
        weight: Number(weight),
        volume: Number(volume),
        waypoints
      };

      const response = await axios.post('/api/v1/seller-studio/freight', payload, { withCredentials: true });
      
      setProgress(75);
      setProgressText('Calculating freight quote...');
      
      if (response.data.success) {
        setProgress(100);
        setStep('success');
        return;
      } else {
        throw new Error(response.data.message || 'Error requesting freight quote');
      }
    } catch (err) {
      setStep('cargo');
      toast.error(err.response?.data?.message || err.message || 'Error requesting freight quote');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col relative w-full h-full max-w-4xl mx-auto">
      
      {/* STEPPER HEADER */}
      {step !== 'processing' && step !== 'success' && (
        <div className="flex justify-center items-center mb-8 pb-6 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-2 ${step === 'details' ? 'text-[#00b873] font-bold' : 'text-[#00b873]'}`}>
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs text-white bg-[#00b873]">1</div>
              Route & Time
            </div>
            <div className={`w-8 h-px ${step === 'cargo' ? 'bg-[#00b873]' : 'bg-gray-200'}`}></div>
            <div className={`flex items-center gap-2 ${step === 'cargo' ? 'text-[#00b873] font-bold' : 'text-gray-400'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs text-white ${step === 'cargo' ? 'bg-[#00b873]' : 'bg-gray-200'}`}>2</div>
              Fees & Cargo
            </div>
          </div>
        </div>
      )}

      {/* 1. DETAILS STEP */}
      {step === 'details' && (
        <div className="animate-in slide-in-from-right duration-300 flex-1 flex flex-col w-full mx-auto max-w-4xl">
          <div className="text-center mb-4">
            <h2 className="text-2xl font-extrabold text-black mb-1">Visual Map Delivery Route</h2>
            <p className="text-gray-500 mb-2">Click on the map to set your pickup and dropoff points.</p>
          </div>
          
          <div className="flex flex-col md:flex-row gap-6 mb-4">
              <div className="flex-1 space-y-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-800">Pickup Location (Text)</label>
                    <input type="text" value={pickupLocation} onChange={e => setPickupLocation(e.target.value)} className="w-full p-3 border-2 border-gray-200 rounded-xl font-bold text-black bg-white" placeholder="e.g. Shenzhen, China or Local Store Address" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-800">Buyer Dropoff Address (Text)</label>
                    <input type="text" value={dropoffAddress} onChange={e => setDropoffAddress(e.target.value)} className="w-full p-3 border-2 border-gray-200 rounded-xl font-bold text-black bg-white" placeholder="e.g. Lagos Central Hub" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-800">Pickup Time</label>
                    <input type="datetime-local" value={pickupTime} onChange={e => setPickupTime(e.target.value)} className="w-full p-3 border-2 border-gray-200 rounded-xl font-bold text-black bg-white" />
                  </div>
              </div>
              <div className="flex-1 flex flex-col h-64 md:h-auto min-h-[400px] bg-gray-100 rounded-2xl overflow-hidden relative border-2 border-gray-200">
                  <div className="p-2 bg-white flex items-center justify-between gap-4 border-b border-gray-200">
                      <form onSubmit={handleSearchArea} className="flex-1 flex shadow-sm rounded-lg overflow-hidden border border-gray-200">
                          <input 
                              type="text" 
                              value={searchQuery}
                              onChange={e => setSearchQuery(e.target.value)}
                              placeholder="Search map area..." 
                              className="w-full px-3 py-2 text-sm outline-none text-black font-bold"
                          />
                          <button type="submit" disabled={isSearchingMap} className="bg-blue-500 text-white px-4 py-2 text-sm font-bold tracking-wide">
                              {isSearchingMap ? '...' : 'Search'}
                          </button>
                      </form>
                      <button onClick={clearMap} className="bg-red-50 text-xs font-bold px-4 py-2.5 rounded-lg shadow-sm border border-red-100 text-red-500 hover:bg-red-100 whitespace-nowrap transition-colors">Clear Map</button>
                  </div>
                  <div className="flex-1 relative">
                      {(() => {
                          const mapMarkers = waypoints.map((wp, i) => {
                              let type = wp.type || 'WAYPOINT';
                              if (i === 0) type = 'PICKUP';
                              else if (i === waypoints.length - 1) type = 'DROPOFF';
                              return {
                                  id: `wp-${i}`,
                                  lat: wp.lat,
                                  lng: wp.lng,
                                  type: type,
                                  popup: `<div style="font-weight:bold">${wp.name}</div>`
                              };
                          });
                          
                          const allPositions = waypoints.map(w => ({ lat: w.lat, lng: w.lng }));

                          return (
                              <div className="absolute inset-0">
                                  <GoogleMapProvider center={centerLoc} markers={mapMarkers} onMapClick={handleMapClick}>
                                      {allPositions.length > 1 && <PolylineF path={allPositions} options={{ strokeColor: '#3b82f6', strokeWeight: 4, strokeOpacity: 0.8 }} />}
                                  </GoogleMapProvider>
                              </div>
                          );
                      })()}
                  </div>
              </div>
          </div>
          <button onClick={() => setStep('cargo')} disabled={(!pickupLocation && waypoints.length === 0) || !pickupTime} className="w-full bg-[#00b873] text-white font-bold py-4 rounded-xl hover:bg-[#009960] transition-colors shadow-lg hover:-translate-y-1">
            Continue to Fees & Cargo
          </button>
        </div>
      )}

      {/* 2. CARGO STEP */}
      {step === 'cargo' && (
        <div className="animate-in slide-in-from-right duration-300 flex-1 flex flex-col w-full mx-auto max-w-2xl">
          <div className="flex items-center mb-6">
            <button onClick={() => setStep('details')} className="mr-4 p-2 hover:bg-gray-100 rounded-full transition-colors text-black"><ArrowLeft size={24} /></button>
            <div>
              <h2 className="text-2xl font-extrabold text-black">Fees & Cargo Specs</h2>
              <p className="text-gray-500">Set the delivery fee, courier payout, and cargo details.</p>
            </div>
          </div>
          <div className="space-y-6 flex-1 text-left">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-800">Delivery Fee (₦) <span className="text-gray-400 font-normal text-xs">(Customer pays)</span></label>
                <input type="number" value={deliveryFee} onChange={e => setDeliveryFee(e.target.value)} className="w-full p-4 border-2 border-gray-200 rounded-xl text-xl font-bold text-black placeholder-gray-400 bg-white" placeholder="3000" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-800">Deliver Rate (₦) <span className="text-gray-400 font-normal text-xs">(Courier earns)</span></label>
                <input type="number" value={deliverRate} onChange={e => setDeliverRate(e.target.value)} className="w-full p-4 border-2 border-gray-200 rounded-xl text-xl font-bold text-black placeholder-gray-400 bg-white" placeholder="2400" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-800">Total Weight <span className="text-gray-400 font-normal text-xs">(kg)</span></label>
                <input type="number" value={weight} onChange={e => setWeight(e.target.value)} className="w-full p-4 border-2 border-gray-200 rounded-xl text-xl font-bold text-black placeholder-gray-400 bg-white" placeholder="500" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-800">Total Volume <span className="text-gray-400 font-normal text-xs">(CBM)</span></label>
                <input type="number" value={volume} onChange={e => setVolume(e.target.value)} className="w-full p-4 border-2 border-gray-200 rounded-xl text-xl font-bold text-black placeholder-gray-400 bg-white" placeholder="2.5" />
              </div>
            </div>
          </div>
          <button onClick={startProcess} disabled={isSubmitting || !deliveryFee || !deliverRate} className="w-full bg-black text-white font-bold py-4 rounded-xl hover:bg-gray-800 transition-colors mt-6 shadow-xl hover:shadow-2xl flex justify-center items-center gap-2 text-lg">
            Request Freight Quote <Sparkles size={20}/>
          </button>
        </div>
      )}

      {/* 3. PROCESSING STEP */}
      {step === 'processing' && (
        <div className="flex flex-col items-center justify-center flex-1 py-12 animate-in fade-in zoom-in duration-500">
          <div className="relative w-48 h-48 mb-8">
            <div className="absolute inset-0 border-4 border-gray-100 rounded-full"></div>
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
              <circle
                cx="50" cy="50" r="48"
                fill="none"
                stroke="#00b873"
                strokeWidth="4"
                strokeDasharray={`${progress * 3}, 300`}
                strokeLinecap="round"
                className="transform -rotate-90 origin-center transition-all duration-500 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-black">
              <img src="/assets/images/studio/payment-rocket.png" alt="Processing" className="w-16 h-16 object-contain animate-bounce mb-2" onError={(e) => { e.target.style.display='none'; }} />
              <span className="text-3xl font-bold">{progress}%</span>
            </div>
          </div>
          <h3 className="text-2xl font-extrabold text-black mb-2 animate-pulse">Calculating freight quote...</h3>
          <p className="text-[var(--text-muted)] text-lg">{progressText}</p>
        </div>
      )}

      {/* 4. SUCCESS STEP */}
      {step === 'success' && (
        <div className="flex flex-col items-center justify-center flex-1 py-12 animate-in slide-in-from-bottom duration-500">
          <img src="/assets/images/studio/success-celebration.png" alt="Success" className="w-full max-w-[280px] mx-auto mb-4 object-contain h-[200px]" onError={(e) => { e.target.style.display='none'; }} />
          <h2 className="text-3xl font-extrabold text-black mb-2">Success!</h2>
          <p className="text-[var(--text-muted)] text-lg mb-8 max-w-md text-center">
            Your freight request has been submitted for review.
          </p>
          <div className="flex gap-4 w-full max-w-[400px]">
            <button 
              onClick={() => { if (onSuccess) onSuccess(); }} 
              className="flex-1 bg-[#00b873] hover:bg-[#009960] text-white font-bold py-3 rounded-xl transition-all shadow-lg hover:-translate-y-1"
            >
              View Logistics
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RequestFreightStudio;
