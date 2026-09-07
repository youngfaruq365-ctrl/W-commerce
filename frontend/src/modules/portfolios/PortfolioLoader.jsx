import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Store, AlertCircle } from 'lucide-react';
import { WSkeleton, WButton } from '../../design/components';
import FreePortfolio from './FreePortfolio';
import PremiumPortfolio from './PremiumPortfolio';
import ProPortfolio from './ProPortfolio';
import UltraPortfolio from './UltraPortfolio';
import EnterprisePortfolio from './EnterprisePortfolio';



const PortfolioSkeleton = () => (
  <div className="min-h-screen bg-[var(--bg-primary)]">
    <WSkeleton className="h-72 w-full rounded-none" />
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-8">
        <WSkeleton className="w-20 h-20 rounded-full" />
        <div className="flex flex-col gap-2">
          <WSkeleton className="w-48 h-7 rounded-xl" />
          <WSkeleton className="w-72 h-4 rounded-xl" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <WSkeleton key={i} className="h-64 rounded-2xl" />
        ))}
      </div>
    </div>
  </div>
);

const NotFoundState = ({ slug }) => (
  <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4">
    <div className="text-center max-w-md">
      <div className="w-24 h-24 rounded-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] flex items-center justify-center mx-auto mb-6">
        <Store size={40} className="text-[var(--text-faint)]" />
      </div>
      <h1 className="text-3xl font-bold text-[var(--text-main)] mb-3">Store Not Found</h1>
      <p className="text-[var(--text-muted)] mb-8">The store "{slug}" does not exist or has been removed.</p>
      <div className="flex gap-3 justify-center">
        <WButton variant="primary" onClick={() => window.history.back()}>Go Back</WButton>
        <WButton variant="ghost" onClick={() => window.location.href = '/'}>Browse Marketplace</WButton>
      </div>
    </div>
  </div>
);

const ErrorState = ({ onRetry }) => (
  <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4">
    <div className="text-center max-w-md">
      <div className="w-24 h-24 rounded-full bg-red-900/20 border border-red-800/40 flex items-center justify-center mx-auto mb-6">
        <AlertCircle size={40} className="text-red-400" />
      </div>
      <h1 className="text-2xl font-bold text-[var(--text-main)] mb-3">Something went wrong</h1>
      <p className="text-[var(--text-muted)] mb-8">Failed to load the store. Please try again.</p>
      <WButton variant="primary" onClick={onRetry}>Try Again</WButton>
    </div>
  </div>
);

const EmptyState = ({ storeName, onBack }) => (
  <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4">
    <div className="text-center max-w-md">
      <div className="w-24 h-24 rounded-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] flex items-center justify-center mx-auto mb-6">
        <Store size={40} className="text-[var(--text-faint)]" />
      </div>
      <h1 className="text-2xl font-bold text-[var(--text-main)] mb-3">{storeName || 'Store'} has no products</h1>
      <p className="text-[var(--text-muted)] mb-8">This store hasn't listed any products yet, or they are currently out of stock.</p>
      <WButton variant="primary" onClick={onBack}>Browse Marketplace</WButton>
    </div>
  </div>
);

const PORTFOLIO_MAP = {
  free: FreePortfolio,
  premium: PremiumPortfolio,
  pro: ProPortfolio,
  ultra: UltraPortfolio,
  enterprise: EnterprisePortfolio,
};

export default function PortfolioLoader() {
  const { slug } = useParams();
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [empty, setEmpty] = useState(false);

  const fetchStore = async () => {
    setLoading(true);
    setError(null);
    setNotFound(false);
    setEmpty(false);
    try {
      const res = await axios.get(`/api/v1/stores/by-slug/${slug}`, { withCredentials: true });
      const { data } = res.data;
      
      const formattedStore = {
        id: data.store.id,
        slug: data.store.slug,
        name: data.store.name,
        logo: data.store.logo,
        banner: data.store.banner,
        description: data.store.description,
        rating: data.metrics.rating,
        reviewCount: data.metrics.reviews,
        followerCount: data.metrics.followers,
        productCount: data.metrics.products,
        verified: data.store.verification,
        subscriptionTier: data.store.subscriptionTier ? data.store.subscriptionTier.toLowerCase() : 'free',
        theme: data.portfolio.configuration?.visual?.colors || { primary: '#6366f1', accent: '#818cf8', bg: '#0f0f13' },
        seller: data.seller,
        products: data.products || []
      };

      setStore(formattedStore);
      if (formattedStore.products.length === 0) {
        setEmpty(true);
      }
    } catch (err) {
      if (err?.response?.status === 404) {
        setNotFound(true);
      } else {
        setError(err?.message || 'Unknown error');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStore(); }, [slug]);

  if (loading) return <PortfolioSkeleton />;
  if (notFound) return <NotFoundState slug={slug} />;
  if (error) return <ErrorState onRetry={fetchStore} />;
  if (empty) return <EmptyState storeName={store?.name} onBack={() => window.location.href = '/'} />;

  const tier = store?.subscriptionTier || store?.seller?.subscriptionTier || 'free';
  const PortfolioComponent = PORTFOLIO_MAP[tier] || FreePortfolio;

  return <PortfolioComponent store={store} />;
}
