import React, { useState, useEffect } from 'react';
import { apiClient } from '../../../utils/apiClient';
import { Truck, MessageCircle, Navigation, Star, Phone, CheckCircle2, Search, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const CouriersView = () => {
  const [couriers, setCouriers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCourier, setSelectedCourier] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCouriers();
  }, []);

  const fetchCouriers = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/api/v1/courier/online/available');
      if (res.data.success) {
        setCouriers(res.data.couriers);
      }
    } catch (err) {
      setError('Failed to fetch online couriers. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleWhatsApp = (e, phone) => {
    e.stopPropagation();
    if (!phone) return;
    // Format phone if necessary, stripping out non-numeric characters
    let formattedPhone = phone.replace(/\D/g, '');
    if (formattedPhone.startsWith('0')) {
        // Simple fallback to Nigeria +234 if it starts with 0 for demo purposes, or just rely on what they entered
        formattedPhone = '234' + formattedPhone.substring(1);
    }
    const message = encodeURIComponent("Hello! I am a seller on GlobalX and I need a courier for a delivery.");
    window.open(`https://wa.me/${formattedPhone}?text=${message}`, '_blank');
  };

  const handleInternalMessage = (e, userId) => {
    e.stopPropagation();
    navigate(`/messages?user=${userId}`);
  };

  const filteredCouriers = couriers.filter(c => 
    c.user?.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.activeVehicle?.plateNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const shipping = selectedCourier?.user?.addresses?.find(a => a.type === 'SHIPPING' && a.isDefault) || selectedCourier?.user?.addresses?.find(a => a.type === 'SHIPPING') || selectedCourier?.user?.addresses?.[0];

  return (
    <div className="w-full h-full p-4 md:p-8 bg-gray-50/50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Truck className="text-emerald-500" size={28} />
              Online Couriers
            </h1>
            <p className="text-gray-500 mt-1">Find and negotiate directly with available couriers in your area.</p>
          </div>
          
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by name or plate..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
            />
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 animate-pulse">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 bg-gray-200 rounded-full"></div>
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
                <div className="h-20 bg-gray-50 rounded-xl mb-4"></div>
                <div className="flex gap-2">
                  <div className="h-10 bg-gray-200 rounded-xl flex-1"></div>
                  <div className="h-10 bg-gray-200 rounded-xl flex-1"></div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 flex items-center gap-2">
            <CheckCircle2 className="text-red-500" />
            {error}
          </div>
        ) : filteredCouriers.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Truck className="text-gray-400" size={32} />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">No couriers found</h3>
            <p className="text-gray-500">There are currently no online couriers matching your criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {filteredCouriers.map((courier) => (
                <motion.div
                  key={courier.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onClick={() => setSelectedCourier(courier)}
                  className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-xl hover:border-emerald-100 transition-all cursor-pointer group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <img 
                          src={courier.user?.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(courier.user?.fullName || 'Courier')}&background=10b981&color=fff`}
                          alt={courier.user?.fullName}
                          className="w-16 h-16 rounded-full object-cover shadow-sm"
                        />
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-2 border-white rounded-full flex items-center justify-center">
                          <CheckCircle2 size={12} className="text-white" />
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-gray-900 flex items-center">
                            {courier.user?.fullName || 'Anonymous Courier'}
                            {courier.user?.subscriptionTier === 'COURIER_PRO' && (
                                <span className="bg-gradient-to-r from-amber-400 to-yellow-600 text-white text-[9px] font-black uppercase px-1.5 py-0.5 rounded flex items-center gap-0.5 ml-2">
                                    <Star size={8} className="fill-white" /> PRO
                                </span>
                            )}
                          </h3>
                          <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${
                            courier.isSocketOnline !== false ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'
                          }`}>
                            <span className="relative flex h-2 w-2">
                              {courier.isSocketOnline !== false && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
                              <span className={`relative inline-flex rounded-full h-2 w-2 ${courier.isSocketOnline !== false ? 'bg-emerald-500' : 'bg-gray-400'}`}></span>
                            </span>
                            {courier.isSocketOnline !== false ? 'Online' : 'Offline'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-amber-500 text-sm font-medium mt-1">
                          <Star size={14} className="fill-current" />
                          <span>{courier.rating?.toFixed(1) || '5.0'}</span>
                          <span className="text-gray-400 mx-1">•</span>
                          <span className="text-gray-500">{courier.totalDeliveries || 0} trips</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-4 mb-6 space-y-2 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => setSelectedCourier(courier)}>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-start justify-between text-sm gap-2">
                        <span className="text-gray-500 flex items-center gap-1.5 shrink-0"><Navigation size={14}/> Vehicle</span>
                        <span className="font-medium text-gray-900 text-right line-clamp-2">
                          {(courier.activeVehicle || courier.vehicles?.[0])?.make || ''} {(courier.activeVehicle || courier.vehicles?.[0])?.model || (courier.activeVehicle || courier.vehicles?.[0])?.type || 'Standard Bike'}
                        </span>
                      </div>
                      <div className="flex items-start justify-between text-sm gap-2">
                        <span className="text-gray-500 flex items-center gap-1.5 shrink-0"><Truck size={14}/> Plate No</span>
                        <span className="font-medium text-gray-900 uppercase text-right break-all">{(courier.activeVehicle || courier.vehicles?.[0])?.plateNumber || 'N/A'}</span>
                      </div>
                    </div>
                    <div className="text-center pt-2">
                       <span className="text-xs text-emerald-600 font-medium">Click to view courier details</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={(e) => handleWhatsApp(e, courier.user?.phone)}
                      disabled={!courier.user?.phone}
                      className="flex items-center justify-center gap-1.5 bg-[#25D366] hover:bg-[#1fae54] text-white py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Phone size={16} className="shrink-0" />
                      <span className="truncate">WhatsApp</span>
                    </button>
                    <button
                      onClick={(e) => handleInternalMessage(e, courier.user?.id)}
                      className="flex items-center justify-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 py-2 rounded-xl text-sm font-medium transition-colors"
                    >
                      <MessageCircle size={16} className="shrink-0" />
                      <span className="truncate">Message</span>
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
      {/* Courier Details Modal */}
      <AnimatePresence>
        {selectedCourier && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedCourier(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h2 className="text-xl font-bold text-gray-900">Courier Details</h2>
                <button onClick={() => setSelectedCourier(null)} className="p-2 -mr-2 bg-white rounded-full text-gray-400 hover:text-gray-900 shadow-sm border border-gray-100 transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 overflow-y-auto space-y-6">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <img 
                      src={selectedCourier.user?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedCourier.user?.fullName || 'Courier')}&background=10b981&color=fff`}
                      alt={selectedCourier.user?.fullName}
                      className="w-20 h-20 rounded-full object-cover shadow-sm border-2 border-white"
                    />
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 border-2 border-white rounded-full flex items-center justify-center">
                      <CheckCircle2 size={14} className="text-white" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 flex items-center">
                        {selectedCourier.user?.fullName || 'Anonymous Courier'}
                        {selectedCourier.user?.subscriptionTier === 'COURIER_PRO' && (
                            <span className="bg-gradient-to-r from-amber-400 to-yellow-600 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded shadow-sm ml-2 flex items-center gap-1">
                                <Star size={10} className="fill-white" /> PRO
                            </span>
                        )}
                    </h3>
                    <p className="text-gray-500">{selectedCourier.user?.email}</p>
                    <div className="flex items-center gap-1 text-amber-500 text-sm font-medium mt-1">
                      <Star size={16} className="fill-current" />
                      <span>{selectedCourier.rating?.toFixed(1) || '5.0'}</span>
                      <span className="text-gray-400 mx-1">•</span>
                      <span className="text-gray-500">{selectedCourier.totalDeliveries || 0} lifetime trips</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900 border-b border-gray-100 pb-2">Personal Information</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50/80 p-3 rounded-xl border border-gray-100 col-span-2">
                      <span className="text-xs text-gray-500 block mb-1">Full Name</span>
                      <span className="font-medium text-gray-900">{selectedCourier.user?.fullName || 'N/A'}</span>
                    </div>
                    <div className="bg-gray-50/80 p-3 rounded-xl border border-gray-100">
                      <span className="text-xs text-gray-500 block mb-1">Phone Number</span>
                      <span className="font-medium text-gray-900">{selectedCourier.user?.phone || 'N/A'}</span>
                    </div>
                    <div className="bg-gray-50/80 p-3 rounded-xl border border-gray-100">
                      <span className="text-xs text-gray-500 block mb-1">Country</span>
                      <span className="font-medium text-gray-900">{selectedCourier.user?.country || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-2">
                  <h4 className="font-semibold text-gray-900 border-b border-gray-100 pb-2">Guarantor Information</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50/80 p-3 rounded-xl border border-gray-100 col-span-2">
                      <span className="text-xs text-gray-500 block mb-1">Guarantor Name</span>
                      <span className="font-medium text-gray-900">{selectedCourier.guarantorName || 'N/A'}</span>
                    </div>
                    <div className="bg-gray-50/80 p-3 rounded-xl border border-gray-100">
                      <span className="text-xs text-gray-500 block mb-1">Guarantor Phone</span>
                      <span className="font-medium text-gray-900">{selectedCourier.guarantorPhone || 'N/A'}</span>
                    </div>
                    <div className="bg-gray-50/80 p-3 rounded-xl border border-gray-100">
                      <span className="text-xs text-gray-500 block mb-1">Guarantor Address</span>
                      <span className="font-medium text-gray-900">{selectedCourier.guarantorAddress || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-2">
                  <h4 className="font-semibold text-gray-900 border-b border-gray-100 pb-2">Vehicle Information</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50/80 p-3 rounded-xl border border-gray-100">
                      <span className="text-xs text-gray-500 block mb-1">Type</span>
                      <span className="font-medium text-gray-900">{(selectedCourier.activeVehicle || selectedCourier.vehicles?.[0])?.type || 'Standard Bike'}</span>
                    </div>
                    <div className="bg-gray-50/80 p-3 rounded-xl border border-gray-100">
                      <span className="text-xs text-gray-500 block mb-1">Make/Model</span>
                      <span className="font-medium text-gray-900">{(selectedCourier.activeVehicle || selectedCourier.vehicles?.[0])?.make || 'Unknown'} {(selectedCourier.activeVehicle || selectedCourier.vehicles?.[0])?.model || ''}</span>
                    </div>
                    <div className="bg-gray-50/80 p-3 rounded-xl border border-gray-100">
                      <span className="text-xs text-gray-500 block mb-1">Plate Number</span>
                      <span className="font-medium text-gray-900 uppercase">{(selectedCourier.activeVehicle || selectedCourier.vehicles?.[0])?.plateNumber || 'N/A'}</span>
                    </div>
                    <div className="bg-gray-50/80 p-3 rounded-xl border border-gray-100">
                      <span className="text-xs text-gray-500 block mb-1">Capacity</span>
                      <span className="font-medium text-gray-900">{(selectedCourier.activeVehicle || selectedCourier.vehicles?.[0])?.capacityKg ? `${(selectedCourier.activeVehicle || selectedCourier.vehicles?.[0]).capacityKg} kg` : 'N/A'}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-2">
                  <h4 className="font-semibold text-gray-900 border-b border-gray-100 pb-2">KYC & Guarantor Details</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50/80 p-3 rounded-xl border border-gray-100">
                      <span className="text-xs text-gray-500 block mb-1">KYC Status</span>
                      <span className={`font-medium ${['APPROVED', 'VERIFIED'].includes(selectedCourier.kycStatus) ? 'text-emerald-600' : 'text-amber-500'}`}>{selectedCourier.kycStatus || 'PENDING'}</span>
                    </div>
                    <div className="bg-gray-50/80 p-3 rounded-xl border border-gray-100">
                      <span className="text-xs text-gray-500 block mb-1">Driver's License</span>
                      <span className="font-medium text-gray-900">
                         {selectedCourier.driversLicenseUrl ? (
                           <a href={selectedCourier.driversLicenseUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">View License</a>
                         ) : 'Not Provided'}
                      </span>
                    </div>
                    <div className="bg-gray-50/80 p-3 rounded-xl border border-gray-100 col-span-2 sm:col-span-1">
                      <span className="text-xs text-gray-500 block mb-1">Guarantor Name</span>
                      <span className="font-medium text-gray-900">{selectedCourier.guarantorName || 'N/A'}</span>
                    </div>
                    <div className="bg-gray-50/80 p-3 rounded-xl border border-gray-100 col-span-2 sm:col-span-1">
                      <span className="text-xs text-gray-500 block mb-1">Guarantor Phone</span>
                      <span className="font-medium text-gray-900">{selectedCourier.guarantorPhone || 'N/A'}</span>
                    </div>
                    <div className="bg-gray-50/80 p-3 rounded-xl border border-gray-100 col-span-2">
                      <span className="text-xs text-gray-500 block mb-1">Guarantor Address</span>
                      <span className="font-medium text-gray-900">{selectedCourier.guarantorAddress || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-2">
                  <h4 className="font-semibold text-gray-900 border-b border-gray-100 pb-2">Contact Courier</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={(e) => { setSelectedCourier(null); handleWhatsApp(e, selectedCourier.user?.phone) }}
                      disabled={!selectedCourier.user?.phone}
                      className="flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1fae54] text-white py-3 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Phone size={18} />
                      WhatsApp
                    </button>
                    <button
                      onClick={(e) => { setSelectedCourier(null); handleInternalMessage(e, selectedCourier.user?.id) }}
                      className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-medium transition-colors"
                    >
                      <MessageCircle size={18} />
                      In-App Message
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default CouriersView;
