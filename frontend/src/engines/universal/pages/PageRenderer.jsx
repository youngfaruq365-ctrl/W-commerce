import React, { lazy, Suspense } from 'react';
import toast from 'react-hot-toast';
import { usePreview } from '../commerce/PreviewContext';
import { CheckoutOS } from './CheckoutOS';
import { ProductCard } from '../commerce/ProductCard';
import { motion } from 'framer-motion';
import { MapPin, Phone, Mail, Clock, Star, ChevronRight, Calendar, Users, Filter, Grid, List, Search } from 'lucide-react';

// ── Shared Loading Stub ──────────────────────────────────────────────────────
const PageShell = ({ title, children, padTop = true }) => (
  <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24 ${padTop ? 'pt-24 md:pt-32' : ''}`}>
    {title && <h1 className="text-4xl md:text-5xl font-black mb-10 capitalize" style={{ fontFamily: 'var(--s-font-heading)', letterSpacing: 'var(--s-letter-spacing)' }}>{title}</h1>}
    {children}
  </div>
);

// ── Universal Pages ──────────────────────────────────────────────────────────

// Products page
const ProductsPage = ({ store, styleProfile }) => {
  const { products, setActivePage, setActiveProduct } = usePreview();
  const tier = styleProfile?.tier || 'essential';
  return (
    <PageShell title="All Products">
      <div className="flex flex-wrap gap-4 mb-10">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40" />
          <input readOnly placeholder="Search products..." className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm" />
        </div>
        {['All', 'New', 'Sale', 'Popular'].map(f => (
          <button onClick={() => toast('Feature coming soon', { icon: '🚀' })}  key={f} className="px-4 py-2 rounded-full border border-gray-200 text-sm font-bold hover:bg-black hover:text-white transition-colors">{f}</button>
        ))}
      </div>
      <div className={`grid gap-6 ${tier === 'essential' || tier === 'plus' ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : tier === 'pro' ? 'grid-cols-2 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
        {products.map(p => <ProductCard key={p.id} product={p} tier={tier} />)}
      </div>
    </PageShell>
  );
};

// Product Detail page
const ProductDetailPage = ({ store, styleProfile }) => {
  const { activeProduct, addToCart, addToWishlist, wishlist, products, setActivePage, setActiveProduct } = usePreview();
  const product = activeProduct || products[0];
  const [selectedImage, setSelectedImage] = React.useState(0);
  const [qty, setQty] = React.useState(1);
  const [selectedSize, setSelectedSize] = React.useState('M');
  const isWishlisted = wishlist.some(w => w.id === product.id);
  const tier = styleProfile?.tier || 'essential';
  return (
    <div className="pt-20 pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col lg:flex-row gap-12">
          {/* Images */}
          <div className="flex-1">
            <div className={`relative bg-gray-100 overflow-hidden mb-4 ${tier === 'signature' || tier === 'studio' ? 'aspect-[3/4]' : 'aspect-square'} rounded-[var(--s-radius,8px)]`}>
              <img src={product.images[selectedImage]} alt={product.name} className="w-full h-full object-cover" />
              {(tier === 'pro' || tier === 'studio' || tier === 'signature') && (
                <>
                  <button onClick={() => setSelectedImage(i => (i - 1 + product.images.length) % product.images.length)}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 rounded-full flex items-center justify-center shadow-lg"><ChevronRight size={20} className="rotate-180" /></button>
                  <button onClick={() => setSelectedImage(i => (i + 1) % product.images.length)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 rounded-full flex items-center justify-center shadow-lg"><ChevronRight size={20} /></button>
                </>
              )}
            </div>
            {(tier === 'pro' || tier === 'studio' || tier === 'signature') && (
              <div className="flex gap-3">
                {product.images.map((img, i) => (
                  <button key={i} onClick={() => setSelectedImage(i)}
                    className={`w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors ${selectedImage === i ? 'border-black' : 'border-transparent'}`}>
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* Info */}
          <div className="flex-1 flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              {Array(5).fill(null).map((_, i) => <Star key={i} size={14} className={i < Math.floor(product.rating) ? 'fill-amber-400 text-amber-400' : 'text-gray-200 fill-gray-200'} />)}
              <span className="text-sm text-gray-500">({product.reviews} reviews)</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black mb-4" style={{ fontFamily: 'var(--s-font-heading)' }}>{product.name}</h1>
            <div className="flex items-center gap-4 mb-6">
              <span className="text-3xl font-black">${product.price}</span>
              {product.originalPrice > product.price && <span className="text-xl line-through opacity-40">${product.originalPrice}</span>}
              {product.originalPrice > product.price && <span className="text-sm bg-red-100 text-red-600 font-bold px-2 py-0.5 rounded">-{Math.round((1 - product.price/product.originalPrice)*100)}%</span>}
            </div>
            <p className="text-gray-600 leading-relaxed mb-8">{product.description}</p>
            {/* Sizes */}
            {(tier !== 'essential') && (
              <div className="mb-6">
                <div className="font-bold mb-3">Size: <span className="text-gray-500">{selectedSize}</span></div>
                <div className="flex gap-2 flex-wrap">
                  {product.sizes.map(s => (
                    <button key={s} onClick={() => setSelectedSize(s)}
                      className={`w-12 h-12 rounded-lg border-2 font-bold text-sm transition-colors ${selectedSize === s ? 'border-black bg-black text-white' : 'border-gray-200 hover:border-black'}`}>{s}</button>
                  ))}
                </div>
              </div>
            )}
            {/* Colors */}
            {(tier === 'pro' || tier === 'studio' || tier === 'signature') && (
              <div className="mb-8">
                <div className="font-bold mb-3">Color</div>
                <div className="flex gap-2">
                  {product.colors.map((c, i) => (
                    <button onClick={() => toast('Feature coming soon', { icon: '🚀' })}  key={i} className="w-8 h-8 rounded-full border-4 border-white shadow-md ring-2 ring-transparent hover:ring-black transition-all" style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
            )}
            {/* Qty + Actions */}
            <div className="flex gap-4 mt-auto">
              {(tier !== 'essential') && (
                <div className="flex items-center gap-3 border border-gray-200 rounded-xl px-4 py-3">
                  <button onClick={() => setQty(q => Math.max(1, q-1))} className="font-bold text-lg leading-none">−</button>
                  <span className="w-6 text-center font-bold">{qty}</span>
                  <button onClick={() => setQty(q => q+1)} className="font-bold text-lg leading-none">+</button>
                </div>
              )}
              <button onClick={() => addToCart(product, qty)}
                className="flex-1 py-4 bg-[var(--s-primary,#000)] text-[var(--s-bg,#fff)] font-black rounded-xl text-lg hover:opacity-90 transition-opacity">
                Add to Cart
              </button>
            </div>
            <button onClick={() => setActivePage('products')} className="mt-4 text-sm text-gray-400 hover:text-black transition-colors">&larr; Back to products</button>
          </div>
        </div>
        {/* Related Products */}
        <div className="mt-24">
          <h2 className="text-2xl font-black mb-8">You May Also Like</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {products.slice(0, 4).map(p => <ProductCard key={p.id} product={p} tier={tier} />)}
          </div>
        </div>
      </div>
    </div>
  );
};

// About page
const AboutPage = ({ store }) => (
  <PageShell title="">
    <div className="min-h-[60vh] flex flex-col justify-center">
      <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        <p className="text-sm uppercase tracking-widest font-bold opacity-50 mb-6">Our Story</p>
        <h1 className="text-5xl md:text-7xl font-black leading-tight mb-8" style={{ fontFamily: 'var(--s-font-heading)' }}>
          Built with <br /><span style={{ color: 'var(--s-primary)' }}>purpose.</span>
        </h1>
        <p className="text-xl opacity-70 max-w-2xl leading-relaxed mb-10">
          {store.name} was founded with a single mission: to create the most exceptional {store.engine} experience our customers have ever had.
          Every detail is intentional. Every moment is designed.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
          {[['2018', 'Founded'], ['50K+', 'Happy Customers'], ['4.9★', 'Average Rating']].map(([num, label]) => (
            <div key={label} className="border-t-2 border-[var(--s-primary)] pt-6">
              <div className="text-4xl font-black mb-2">{num}</div>
              <div className="opacity-60">{label}</div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  </PageShell>
);

// Contact page
const ContactPage = ({ store }) => (
  <PageShell title="Contact">
    <div className="grid md:grid-cols-2 gap-16">
      <div>
        <p className="text-lg opacity-70 mb-10">We'd love to hear from you. Fill out the form and we'll get back to you within 24 hours.</p>
        <div className="space-y-4">
          {[['Name','Your full name'],['Email','your@email.com'],['Message','Tell us how we can help']].map(([label, placeholder]) => (
            <div key={label}>
              <label className="block text-xs font-bold uppercase tracking-wider mb-2 opacity-50">{label}</label>
              {label === 'Message'
                ? <textarea readOnly placeholder={placeholder} rows={5} className="w-full border border-gray-200 rounded-xl px-4 py-3 resize-none bg-white" />
                : <input readOnly placeholder={placeholder} className="w-full border border-gray-200 rounded-xl px-4 py-3 bg-white" />
              }
            </div>
          ))}
          <button onClick={() => toast('Feature coming soon', { icon: '🚀' })}  className="w-full py-4 bg-[var(--s-primary,#000)] text-[var(--s-bg,#fff)] font-bold rounded-xl">Send Message</button>
        </div>
      </div>
      <div className="space-y-8 mt-8 md:mt-20">
        {[[MapPin, 'Location', '123 Business Ave, Suite 100'], [Phone, 'Phone', '+1 (555) 123-4567'], [Mail, 'Email', `hello@${store.name.toLowerCase().replace(' ', '')}.com`], [Clock, 'Hours', 'Mon–Fri: 9am–6pm']].map(([Icon, label, value]) => (
          <div key={label} className="flex gap-4">
            <div className="w-12 h-12 rounded-full bg-[var(--s-primary)]/10 flex items-center justify-center flex-shrink-0"><Icon size={20} style={{ color: 'var(--s-primary)' }} /></div>
            <div><div className="font-bold mb-0.5">{label}</div><div className="opacity-60">{value}</div></div>
          </div>
        ))}
      </div>
    </div>
  </PageShell>
);

// Reviews page
const ReviewsPage = ({ store }) => {
  const reviews = Array(9).fill(null).map((_, i) => ({
    name: ['Sarah M.', 'James K.', 'Priya R.', 'Tom W.', 'Aaliya B.', 'Chris D.', 'Nina L.', 'Mark S.', 'Fatima A.'][i],
    rating: [5, 4, 5, 5, 4, 5, 4, 5, 5][i],
    text: 'Absolutely incredible experience. The quality exceeded my expectations and the service was impeccable from start to finish.',
    date: ['2 days ago', '5 days ago', '1 week ago', '10 days ago', '2 weeks ago', '3 weeks ago', '1 month ago', '5 days ago', '8 days ago'][i],
    verified: true
  }));
  return (
    <PageShell title="Reviews">
      <div className="flex items-center gap-6 mb-12 p-8 bg-gray-50 rounded-2xl">
        <div className="text-center"><div className="text-6xl font-black">4.9</div><div className="flex justify-center gap-1 mt-2">{Array(5).fill(null).map((_,i) => <Star key={i} size={20} className="fill-amber-400 text-amber-400" />)}</div><div className="text-sm opacity-50 mt-1">Based on 2,847 reviews</div></div>
        <div className="flex-1 space-y-2">
          {[5,4,3,2,1].map(n => <div key={n} className="flex items-center gap-3"><span className="text-sm w-4">{n}</span><div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden"><div className="h-full bg-amber-400 rounded-full" style={{ width: `${[80,12,5,2,1][5-n]}%` }} /></div><span className="text-sm opacity-50">{[80,12,5,2,1][5-n]}%</span></div>)}
        </div>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reviews.map((r, i) => (
          <div key={i} className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center font-black text-sm">{r.name[0]}</div>
                <div><div className="font-bold text-sm">{r.name}</div>{r.verified && <div className="text-xs text-green-600 font-medium">✓ Verified</div>}</div>
              </div>
              <div className="flex">{Array(r.rating).fill(null).map((_,j) => <Star key={j} size={12} className="fill-amber-400 text-amber-400" />)}</div>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">{r.text}</p>
            <div className="text-xs opacity-40 mt-4">{r.date}</div>
          </div>
        ))}
      </div>
    </PageShell>
  );
};

// Search page
const SearchPage = ({ store, styleProfile }) => {
  const { products } = usePreview();
  const tier = styleProfile?.tier || 'essential';
  return (
    <PageShell title="Search">
      <div className="relative mb-10">
        <Search size={20} className="absolute left-5 top-1/2 -translate-y-1/2 opacity-40" />
        <input readOnly placeholder="Search products, collections, and more..." className="w-full border border-gray-200 rounded-2xl pl-14 pr-6 py-5 text-lg bg-white shadow-sm" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {products.map(p => <ProductCard key={p.id} product={p} tier={tier} />)}
      </div>
    </PageShell>
  );
};

// ── Engine-Specific Pages ────────────────────────────────────────────────────

// Restaurant: Menu
const MenuPage = ({ store }) => {
  const categories = ['Starters', 'Mains', 'Desserts', 'Drinks'];
  const [activeCategory, setActiveCategory] = React.useState('Starters');
  const items = Array(6).fill(null).map((_, i) => ({ id: i, name: `${activeCategory} Item ${i+1}`, price: (8 + i * 4).toFixed(2), desc: 'Fresh, locally-sourced ingredients prepared daily by our expert chefs.' }));
  const { addToCart, products } = usePreview();
  return (
    <PageShell title="Our Menu">
      <div className="flex gap-3 mb-10 overflow-x-auto pb-2">
        {categories.map(c => <button key={c} onClick={() => setActiveCategory(c)}
          className={`px-5 py-2.5 rounded-full font-bold text-sm whitespace-nowrap transition-all ${activeCategory === c ? 'bg-[var(--s-primary,#000)] text-[var(--s-bg,#fff)]' : 'border border-gray-200 hover:border-black'}`}>{c}</button>)}
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {items.map(item => (
          <div key={item.id} className="flex gap-4 bg-white border border-gray-100 rounded-2xl p-5 hover:shadow-md transition-shadow">
            <img src={`https://picsum.photos/seed/menu-${item.id}/120/120`} className="w-24 h-24 rounded-xl object-cover flex-shrink-0" alt={item.name} />
            <div className="flex-1">
              <div className="flex justify-between mb-1">
                <div className="font-bold">{item.name}</div>
                <div className="font-black">${item.price}</div>
              </div>
              <p className="text-sm opacity-60 mb-3">{item.desc}</p>
              <button onClick={() => addToCart({ ...products[item.id % products.length], name: item.name, price: parseFloat(item.price) })}
                className="text-xs font-bold px-4 py-1.5 bg-black text-white rounded-full">Add</button>
            </div>
          </div>
        ))}
      </div>
    </PageShell>
  );
};

// Restaurant: Reservations
const ReservationPage = ({ store }) => {
  const { addBooking } = usePreview();
  return (
    <PageShell title="Reserve a Table">
      <div className="max-w-2xl">
        <p className="opacity-60 mb-8 text-lg">Book your perfect dining experience. We'll confirm within 2 hours.</p>
        <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm space-y-6">
          <div className="grid grid-cols-2 gap-4">
            {[['Date','date'],['Time','time'],['Guests','number'],['Name','text']].map(([l,t]) => (
              <div key={l}>
                <label className="block text-xs font-bold uppercase tracking-wider mb-2 opacity-50">{l}</label>
                <input type={t} className="w-full border border-gray-200 rounded-xl px-4 py-3" placeholder={l} readOnly />
              </div>
            ))}
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-2 opacity-50">Special Requests</label>
            <textarea rows={3} readOnly className="w-full border border-gray-200 rounded-xl px-4 py-3 resize-none" />
          </div>
          <button onClick={() => addBooking({ type: 'restaurant', date: 'Tonight', guests: 2 })}
            className="w-full py-4 bg-[var(--s-primary,#000)] text-[var(--s-bg,#fff)] font-black rounded-xl text-lg">
            Confirm Reservation
          </button>
        </div>
      </div>
    </PageShell>
  );
};

// Fashion: Collections
const CollectionsPage = ({ store, styleProfile }) => {
  const { setActivePage } = usePreview();
  const collections = [
    { name: 'Summer 2025', image: 'https://picsum.photos/seed/col1/800/1000', items: 42 },
    { name: 'Essentials', image: 'https://picsum.photos/seed/col2/800/1000', items: 28 },
    { name: 'Limited Edition', image: 'https://picsum.photos/seed/col3/800/1000', items: 12 },
    { name: 'Accessories', image: 'https://picsum.photos/seed/col4/800/1000', items: 65 },
  ];
  return (
    <PageShell title="Collections">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {collections.map((col, i) => (
          <motion.div key={col.name} whileHover={{ scale: 1.02 }} onClick={() => setActivePage('products')}
            className="group cursor-pointer relative overflow-hidden rounded-[var(--s-radius,8px)] aspect-[3/4]">
            <img src={col.image} alt={col.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
            <div className="absolute bottom-0 left-0 p-5 text-white">
              <div className="font-black text-xl mb-1">{col.name}</div>
              <div className="text-sm opacity-80">{col.items} items</div>
            </div>
          </motion.div>
        ))}
      </div>
    </PageShell>
  );
};

// Healthcare: Services
const ServicesPage = ({ store }) => {
  const { addBooking } = usePreview();
  const services = [
    { name: 'General Consultation', duration: '30 min', price: 80, icon: '🩺' },
    { name: 'Specialist Review', duration: '45 min', price: 150, icon: '👨‍⚕️' },
    { name: 'Diagnostics', duration: '60 min', price: 200, icon: '🔬' },
    { name: 'Follow-up Visit', duration: '15 min', price: 40, icon: '📋' },
    { name: 'Telehealth', duration: '20 min', price: 60, icon: '💻' },
    { name: 'Annual Check-up', duration: '60 min', price: 120, icon: '❤️' },
  ];
  return (
    <PageShell title="Our Services">
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.map(s => (
          <div key={s.name} className="bg-white border border-gray-100 rounded-2xl p-6 hover:shadow-lg transition-shadow">
            <div className="text-4xl mb-4">{s.icon}</div>
            <h3 className="font-bold text-lg mb-2">{s.name}</h3>
            <div className="flex items-center gap-4 mb-4 text-sm opacity-60">
              <span>⏱ {s.duration}</span><span>From ${s.price}</span>
            </div>
            <button onClick={() => addBooking({ type: 'healthcare', service: s.name })}
              className="w-full py-3 bg-[var(--s-primary,#3b82f6)] text-white font-bold rounded-xl hover:opacity-90 transition-opacity">
              Book Now
            </button>
          </div>
        ))}
      </div>
    </PageShell>
  );
};

// Automotive: Vehicles
const VehiclesPage = ({ store }) => {
  const { setActivePage, setActiveProduct, products } = usePreview();
  const vehicles = Array(6).fill(null).map((_, i) => ({
    id: `v-${i}`, name: ['Sedan EV', 'SUV Pro', 'Coupe Sport', 'Pickup 4x4', 'Luxury Saloon', 'Convertible GT'][i],
    price: [32000, 48000, 55000, 39000, 89000, 72000][i],
    image: `https://picsum.photos/seed/vehicle-${i}/800/500`,
    badge: i === 0 ? 'New' : i === 4 ? 'Best Seller' : null
  }));
  return (
    <PageShell title="Our Vehicles">
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {vehicles.map(v => (
          <motion.div key={v.id} whileHover={{ y: -4 }} className="group cursor-pointer bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl transition-shadow"
            onClick={() => setActivePage('product')}>
            <div className="relative aspect-[16/9] overflow-hidden bg-gray-100">
              <img src={v.image} alt={v.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
              {v.badge && <div className="absolute top-4 left-4 bg-[var(--s-primary)] text-white text-xs font-black px-3 py-1 rounded-full">{v.badge}</div>}
            </div>
            <div className="p-6">
              <div className="font-black text-xl mb-1">{v.name}</div>
              <div className="text-2xl font-black mt-3" style={{ color: 'var(--s-primary)' }}>
                ${v.price.toLocaleString()}
              </div>
              <button onClick={() => toast('Feature coming soon', { icon: '🚀' })}  className="mt-4 text-sm font-bold hover:opacity-70 transition-opacity flex items-center gap-1">
                View Details <ChevronRight size={14} />
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </PageShell>
  );
};

// Property: Listings
const ListingsPage = ({ store }) => {
  const { setActivePage } = usePreview();
  const listings = Array(6).fill(null).map((_, i) => ({
    id: i, name: ['Luxury Penthouse', 'Modern Apartment', 'Family Home', 'Studio Loft', 'Beachfront Villa', 'City Townhouse'][i],
    price: [2500000, 450000, 680000, 280000, 3200000, 890000][i],
    beds: [3,2,4,1,5,3][i], baths: [2,1,3,1,4,2][i], sqft: [2200,850,2600,520,4800,1800][i],
    image: `https://picsum.photos/seed/property-${i}/800/500`
  }));
  return (
    <PageShell title="Properties">
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {listings.map(l => (
          <motion.div key={l.id} whileHover={{ y: -4 }} className="group cursor-pointer" onClick={() => setActivePage('product')}>
            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden mb-4">
              <img src={l.image} alt={l.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
            </div>
            <div className="font-black text-lg mb-1">{l.name}</div>
            <div className="text-2xl font-black mb-3" style={{ color: 'var(--s-primary)' }}>
              ${l.price.toLocaleString()}
            </div>
            <div className="flex gap-4 text-sm opacity-60">
              <span>🛏 {l.beds} beds</span><span>🚿 {l.baths} baths</span><span>📐 {l.sqft.toLocaleString()} sqft</span>
            </div>
          </motion.div>
        ))}
      </div>
    </PageShell>
  );
};

// Creator: Portfolio
const PortfolioPage = ({ store }) => {
  const works = Array(9).fill(null).map((_, i) => ({ id: i, title: `Project ${i+1}`, category: ['Design','Photo','Film','3D'][i % 4], image: `https://picsum.photos/seed/port-${i}/600/600` }));
  return (
    <PageShell title="Portfolio">
      <div className="columns-2 md:columns-3 gap-4 space-y-4">
        {works.map(w => (
          <div key={w.id} className="group break-inside-avoid cursor-pointer relative overflow-hidden rounded-2xl">
            <img src={w.image} alt={w.title} className="w-full object-cover group-hover:scale-105 transition-transform duration-700" />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
              <div className="text-white">
                <div className="font-bold">{w.title}</div>
                <div className="text-xs opacity-70">{w.category}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </PageShell>
  );
};

// ── Main PageRenderer ─────────────────────────────────────────────────────────
const ENGINE_PAGE_MAP = {
  restaurant: { menu: MenuPage, reservations: ReservationPage, reservation: ReservationPage },
  fashion:    { collections: CollectionsPage, lookbook: CollectionsPage, wishlist: ProductsPage },
  creator:    { portfolio: PortfolioPage, courses: ProductsPage, membership: ProductsPage },
  property:   { properties: ListingsPage, listings: ListingsPage },
  healthcare: { services: ServicesPage, doctors: ServicesPage, appointments: ReservationPage },
  automotive: { vehicles: VehiclesPage, inventory: VehiclesPage },
};

export const PageRenderer = ({ store, styleProfile }) => {
  const { activePage, setActivePage } = usePreview();
  const engine = store?.engine;

  // 1. Checkout
  if (activePage === 'checkout') return <CheckoutOS />;
  // 2. Product detail
  if (activePage === 'product')  return <ProductDetailPage store={store} styleProfile={styleProfile} />;
  // 3. Engine-specific pages
  const EnginePages = ENGINE_PAGE_MAP[engine] || {};
  const EnginePage = EnginePages[activePage];
  if (EnginePage) return <EnginePage store={store} styleProfile={styleProfile} />;
  // 4. Universal pages
  switch (activePage) {
    case 'products':    return <ProductsPage    store={store} styleProfile={styleProfile} />;
    case 'about':       return <AboutPage       store={store} />;
    case 'contact':     return <ContactPage     store={store} />;
    case 'reviews':     return <ReviewsPage     store={store} />;
    case 'search':      return <SearchPage      store={store} styleProfile={styleProfile} />;
    default:            return null; // Home is rendered by ExperienceRenderer
  }
};
