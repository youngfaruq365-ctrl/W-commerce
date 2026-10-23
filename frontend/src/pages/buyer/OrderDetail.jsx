import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useBuyerStore } from '../../store/buyerStore';
import { Package, Truck, Clock, MapPin, CheckCircle2, AlertCircle, ArrowLeft, Navigation, Phone, MessageCircle } from 'lucide-react';
import { format } from 'date-fns';
import { MapView } from '../../maps/MapView';
import { useTrackingStore } from '../../store/trackingStore';
import { isVideoUrl, getImageUrl } from '@/utils/imageHelpers';


const fmt = (n) => Number(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const OrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { fetchOrderById, isLoading } = useBuyerStore();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  
  const { courierLocations } = useTrackingStore();

  useEffect(() => {
    const token = localStorage.getItem('token') || '';
    useTrackingStore.getState().initRealtime(token);
    if (id) {
      fetchOrderById(id).then(data => {
        if (data) setOrder(data);
        else setError('Order not found or you do not have permission to view it.');
      });
    }
  }, [id, fetchOrderById]);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-[var(--text-main)]">
        <div className="w-8 h-8 border-2 border-[var(--accent-gray)] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-[var(--text-main)]">
        <AlertCircle size={48} className="text-red-400 mb-4" />
        <h2 className="text-xl font-bold mb-4">{error || 'Order Not Found'}</h2>
        <button onClick={() => navigate('/buyer/dashboard?tab=active_orders')} className="text-[var(--accent-gray)] hover:underline flex items-center gap-2">
          <ArrowLeft size={16} /> Back to Orders
        </button>
      </div>
    );
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'PENDING': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
      case 'PROCESSING': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
      case 'SHIPPED': return 'text-purple-400 bg-purple-400/10 border-purple-400/20';
      case 'DELIVERED': return 'text-green-400 bg-green-400/10 border-green-400/20';
      case 'DELIVERY_FAILED': return 'text-orange-400 bg-orange-400/10 border-orange-400/20';
      case 'CANCELLED': return 'text-red-400 bg-red-400/10 border-red-400/20';
      default: return 'text-[var(--text-muted)] bg-[var(--bg-tertiary)] border-[var(--border-color)]';
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 text-[var(--text-main)]">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-[var(--text-muted)] hover:text-white transition mb-6">
        <ArrowLeft size={18} /> Back
      </button>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-sans font-black tracking-tight mb-1">Order #{order?.id?.slice(-8).toUpperCase() || ''}</h1>
          <p className="text-[var(--text-muted)] text-sm">Placed on {format(new Date(order?.createdAt || Date.now()), 'MMM dd, yyyy h:mm a')}</p>
        </div>
        <div className={`px-4 py-2 rounded-full border font-sans font-bold tracking-widest uppercase text-xs ${getStatusColor(order.status)}`}>
          {order.status}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Shipping Info */}
        <div className="premium-glass p-6 rounded-xl border border-[var(--border-color)]">
          <h3 className="font-bold text-[var(--text-muted)] uppercase tracking-wider text-xs mb-4 flex items-center gap-2">
            <MapPin size={14} /> Shipping Address
          </h3>
          <p className="font-medium text-sm mb-1">{order.shippingAddress?.fullName || 'Buyer'}</p>
          <p className="text-[var(--text-muted)] text-sm">{order.shippingAddress?.street}</p>
          <p className="text-[var(--text-muted)] text-sm">{order.shippingAddress?.city}, {order.shippingAddress?.state}</p>
          <p className="text-[var(--text-muted)] text-sm">{order.shippingAddress?.zipCode}, {order.shippingAddress?.country}</p>
          <p className="text-[var(--text-muted)] text-sm mt-2">{order.shippingAddress?.phone}</p>
        </div>

        {/* Payment Info */}
        <div className="premium-glass p-6 rounded-xl border border-[var(--border-color)]">
          <h3 className="font-bold text-[var(--text-muted)] uppercase tracking-wider text-xs mb-4 flex items-center gap-2">
            <CheckCircle2 size={14} /> Payment Details
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Method:</span>
              <span className="font-medium uppercase">{order.paymentMethod || 'Paystack'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Status:</span>
              <span className={`font-bold ${order.paymentStatus === 'PAID' ? 'text-green-400' : 'text-yellow-400'}`}>
                {order.paymentStatus}
              </span>
            </div>
          </div>
        </div>

        {/* Delivery Timeline */}
        <div className="premium-glass p-6 rounded-xl border border-[var(--border-color)]">
          <h3 className="font-bold text-[var(--text-muted)] uppercase tracking-wider text-xs mb-4 flex items-center gap-2">
            <Clock size={14} /> Estimated Delivery
          </h3>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center flex-shrink-0">
              <Truck size={18} className="text-[var(--accent-gray)]" />
            </div>
            <div>
              <p className="font-bold text-sm">3 - 5 Business Days</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">Via W-Commerce Hub</p>
            </div>
          </div>
          {order.deliveryConfirmationCode && (
            <div className="bg-[var(--bg-tertiary)] p-3 rounded-lg border border-[var(--border-color)] mt-4 text-center">
              <p className="text-xs text-[var(--text-muted)] mb-1 uppercase tracking-wider font-bold">Delivery PIN</p>
              <p className="font-mono text-2xl font-black tracking-widest text-green-400">
                {order.deliveryConfirmationCode}
              </p>
              <p className="text-[10px] text-[var(--text-muted)] mt-1">Provide this to your courier</p>
            </div>
          )}
        </div>
      </div>

      {order.status === 'DELIVERY_FAILED' && (
        <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-6 mb-8 text-orange-400">
          <h3 className="font-bold flex items-center gap-2 mb-2"><AlertCircle size={20} /> Delivery Attempt Failed</h3>
          <p className="text-sm mb-4">The courier was unable to deliver your package. You can request a redelivery or arrange for pickup at the nearest hub.</p>
          <div className="flex gap-4">
            <button onClick={() => navigate('/buyer/dashboard?tab=support')} className="bg-orange-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-orange-600 transition">Request Redelivery</button>
            <button onClick={() => navigate('/buyer/dashboard?tab=support')} className="bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-white font-bold py-2 px-4 rounded-lg hover:bg-[var(--bg-secondary)] transition">Change to Pickup</button>
          </div>
        </div>
      )}

      {/* Live Tracking */}
      {(order.status === 'IN_TRANSIT' || order.status === 'OUT_FOR_DELIVERY') && (
        <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md rounded-2xl border border-[var(--border-color)] overflow-hidden shadow-lg mb-8">
          <div className="bg-[var(--bg-secondary)] border-b border-[var(--border-color)] px-6 py-4 flex justify-between items-center">
            <h3 className="font-sans font-bold tracking-tight text-lg flex items-center gap-2">
              <Navigation size={20} className="text-blue-500 animate-pulse" /> Live Tracking
            </h3>
            <span className="text-xs text-blue-500 font-bold px-2 py-1 bg-blue-500/10 rounded-full border border-blue-500/20">
              {order.status === 'IN_TRANSIT' ? 'On the way' : 'Arriving soon'}
            </span>
          </div>
          <div className="h-[400px] w-full relative z-0">
            <MapView 
              activeRoute={{
                pickupLat: order.deliveryAssignment?.pickupLat || 6.5244,
                pickupLng: order.deliveryAssignment?.pickupLng || 3.3792,
                pickupAddress: 'Seller Address',
                dropoffLat: order.deliveryAssignment?.dropoffLat || 6.5400,
                dropoffLng: order.deliveryAssignment?.dropoffLng || 3.4000,
                dropoffAddress: order?.shippingAddress?.street || 'Delivery Address'
              }}
              couriers={Object.entries(courierLocations)
                .filter(([cid]) => !order.deliveryAssignment || cid === order.deliveryAssignment.courierId)
                .map(([cid, loc]) => ({
                id: cid,
                lat: loc.lat,
                lng: loc.lng,
                name: 'Dispatch Rider',
                gpsStatus: 'ACTIVE'
              }))} 
            />
          </div>
          <div className="flex gap-4 p-4 border-t border-[var(--border-color)] bg-[var(--bg-secondary)]">
            <button 
              onClick={() => {
                const phone = order.deliveryAssignment?.courier?.user?.phone;
                if (phone) window.location.href = `tel:${phone}`;
                else toast.error('Courier phone number not available');
              }}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-600/20 text-blue-400 py-3 rounded-xl font-bold">
              <Phone size={18} /> Contact Courier
            </button>
              <button 
                onClick={() => {
                  const courierUserId = order.deliveryAssignment?.courier?.userId;
                  if (courierUserId) {
                    navigate(`/messages?user=${courierUserId}`);
                  } else {
                    toast.success("Opening secure chat with courier...");
                  }
                }}
                className="flex-1 flex items-center justify-center gap-2 bg-indigo-600/20 text-indigo-400 py-3 rounded-xl font-bold">
                <MessageCircle size={18} /> Chat
              </button>
          </div>
        </div>
      )}

      {/* Order Items */}
      <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md rounded-2xl border border-[var(--border-color)] overflow-hidden shadow-lg">
        <div className="bg-[var(--bg-secondary)] border-b border-[var(--border-color)] px-6 py-4">
          <h3 className="font-sans font-bold tracking-tight text-lg flex items-center gap-2">
            <Package size={20} className="text-[var(--accent-gray)]" /> Items
          </h3>
        </div>
        <div className="divide-y divide-[var(--border-color)]">
          {order.items?.map((item) => (
            <div key={item.id} className="p-6 flex flex-col sm:flex-row gap-6 items-start sm:items-center transition-all duration-300 hover:bg-[var(--bg-tertiary)] group">
              <div className="w-24 h-24 aspect-square rounded-xl overflow-hidden bg-white border border-[var(--border-color)] flex-shrink-0">
                {(() => {
                  const media = item.product?.images?.[0]?.url || item.product?.images?.[0];
                  if (isVideoUrl(media)) {
                    return (
                      <video
                        src={getImageUrl(media)}
                        className="w-full h-full object-cover"
                        muted
                        playsInline
                        preload="metadata"
                      />
                    );
                  }
                  return (
                    <img
                      src={media ? getImageUrl(media) : 'https://via.placeholder.com/80'}
                      alt={item.productName || item.product?.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  );
                })()}
              </div>
              <div className="flex-1">
                <h4 className="font-sans font-bold tracking-tight text-lg mb-1">{item.productName || item.product?.title}</h4>
                {item.variants && <p className="text-xs text-[var(--accent-gray)] mb-2 font-semibold">{item.variants}</p>}
                <div className="flex items-center gap-4 text-sm text-[var(--text-muted)]">
                  <span className="font-medium">Qty: {item.quantity}</span>
                  <span className="font-medium">Price: ₦{fmt(item.price)}</span>
                </div>
              </div>
              <div className="font-sans text-2xl font-black tracking-tight text-right">
                ₦{fmt(item.price * item.quantity)}
              </div>
            </div>
          ))}
        </div>
        
        {/* Totals */}
        <div className="bg-[var(--bg-secondary)] p-6 space-y-3">
          <div className="flex justify-between text-sm text-[var(--text-muted)]">
            <span>Subtotal</span>
            <span>₦{fmt(order.totalAmount - (order.shippingCost || 0))}</span>
          </div>
          <div className="flex justify-between text-sm text-[var(--text-muted)]">
            <span>Shipping</span>
            <span>₦{fmt(order.shippingCost || 0)}</span>
          </div>
          <div className="flex justify-between font-bold text-lg pt-4 border-t border-[var(--border-color)] mt-4">
            <span>Total</span>
            <span className="text-[var(--accent-gray)]">₦{fmt(order.totalAmount)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetail;
