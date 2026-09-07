import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { WIcon } from '../../components/visual/WIcon';

const API_URL = import.meta.env.VITE_API_URL || window.location.origin;

const ProductDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [similar, setSimilar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState(false);
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    fetchProductDetails();
    fetchSimilarProducts();
    trackView();
  }, [id]);

  const getToken = () => document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1] || '';

  const trackView = async () => {
    try {
      const token = getToken();
      if (token) {
        await axios.post(`${API_URL}/api/v1/products/${id}/interaction`, { type: 'view' }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
    } catch(err) {
      // silent fail
    }
  };

  const fetchProductDetails = async () => {
    try {
      setLoading(true);
      const resp = await axios.get(`${API_URL}/api/v1/products/${id}`);
      setProduct(resp.data.data || resp.data);
    } catch (err) {
      toast.error('Product not found');
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };

  const fetchSimilarProducts = async () => {
    try {
      const resp = await axios.get(`${API_URL}/api/v1/products/${id}/similar`);
      setSimilar(resp.data.data || []);
    } catch (err) {
      // ignore
    }
  };

  const handleAddToCart = async () => {
    const token = getToken();
    if (!token) {
      toast.error('Please login to add to cart');
      navigate('/login');
      return;
    }
    
    setAddingToCart(true);
    try {
      await axios.post(`${API_URL}/api/v1/cart`, { productId: id, quantity: 1 }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Added to cart!');
    } catch(err) {
      toast.error(err.response?.data?.message || 'Failed to add to cart');
    } finally {
      setAddingToCart(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse flex flex-col items-center">
           <WIcon name="loader" className="w-8 h-8 animate-spin text-slate-800 mb-4" />
           <p className="text-gray-500 font-medium">Loading product details...</p>
        </div>
      </div>
    );
  }

  if (!product) return null;

  const images = product.images && product.images.length > 0 ? product.images : [product.imageUrl || 'https://via.placeholder.com/600'];

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar space */}
      <div className="h-20 border-b border-gray-100 flex items-center px-6 sticky top-0 bg-white/80 backdrop-blur-md z-50">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full transition-colors mr-4">
          <WIcon name="chevron-left" className="w-6 h-6 text-gray-800" />
        </button>
        <span className="font-semibold text-gray-900 truncate">Back</span>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col lg:flex-row gap-16">
        {/* Gallery */}
        <div className="lg:w-1/2 flex flex-col gap-6">
          <div className="aspect-square bg-gray-50 rounded-3xl overflow-hidden relative group">
            <img 
              src={images[activeImage]} 
              alt={product.name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            {product.stockQuantity < 5 && (
              <div className="absolute top-4 left-4 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest shadow-md">
                Only {product.stockQuantity} left
              </div>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
              {images.map((img, idx) => (
                <button 
                  key={idx} 
                  onClick={() => setActiveImage(idx)}
                  className={`flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 transition-all ${activeImage === idx ? 'border-slate-800 opacity-100' : 'border-transparent opacity-60 hover:opacity-100'}`}
                >
                  <img src={img} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="lg:w-1/2 flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-4">
            <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-semibold uppercase tracking-wider">{product.category || 'Product'}</span>
            <span className="flex items-center gap-1 text-yellow-500 text-sm font-bold">
              <WIcon name="star" className="w-4 h-4 fill-current" />
              {product.rating?.toFixed(1) || '4.5'}
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 leading-tight mb-4">{product.name}</h1>
          <div className="text-3xl font-bold text-slate-800 mb-8">${product.price?.toLocaleString()}</div>
          
          <div className="prose prose-slate mb-10">
            <p className="text-gray-600 leading-relaxed text-lg">{product.description}</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <button 
              onClick={handleAddToCart}
              disabled={addingToCart || product.stockQuantity === 0}
              className="flex-1 bg-slate-900 text-white py-4 px-8 rounded-2xl font-bold text-lg hover:bg-slate-800 transition-all hover:-translate-y-1 hover:shadow-xl disabled:opacity-50 disabled:hover:-translate-y-0 disabled:hover:shadow-none flex items-center justify-center gap-2"
            >
              {addingToCart ? 'Adding...' : product.stockQuantity === 0 ? 'Out of Stock' : 'Add to Cart'}
            </button>
            <button className="flex-none p-4 border-2 border-gray-200 rounded-2xl hover:border-slate-900 hover:text-slate-900 text-gray-400 transition-colors">
               <WIcon name="heart" className="w-6 h-6" />
            </button>
          </div>
          
          {/* Metadata */}
          <div className="mt-12 pt-8 border-t border-gray-100 grid grid-cols-2 gap-6">
            <div>
               <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Brand</h4>
               <p className="font-semibold text-gray-900">{product.brand || 'Generic'}</p>
            </div>
            <div>
               <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">SKU</h4>
               <p className="font-semibold text-gray-900">{product.id.split('-')[0].toUpperCase()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Similar Products */}
      {similar.length > 0 && (
        <div className="max-w-7xl mx-auto px-6 py-16 border-t border-gray-100">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">You might also like</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {similar.slice(0, 4).map(item => (
              <div key={item.id} onClick={() => navigate(`/product/${item.id}`)} className="group cursor-pointer">
                <div className="aspect-square bg-gray-50 rounded-2xl overflow-hidden mb-4 relative">
                  <img src={item.imageUrl || 'https://via.placeholder.com/300'} alt={item.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                </div>
                <h3 className="font-semibold text-gray-900 truncate group-hover:text-slate-700 transition-colors">{item.name}</h3>
                <p className="font-bold text-slate-800">${item.price?.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDetails;
