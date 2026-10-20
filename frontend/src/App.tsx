import { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import { AnimatePresence, motion } from 'framer-motion';
import { ROUTES } from './constants/routes';
import { useAuthStore } from './store/authStore';
import { MapProvider } from './maps/MapProvider';
import { initializeAdMob } from './services/adMobService';
import { initializeRevenueCat } from './services/revenueCatService';
// Guards
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/system/ErrorBoundary';
import GuestGuard from './components/GuestGuard';
import RootRedirect from './components/RootRedirect';
import PromoOverlay from './components/shared/PromoOverlay';
import CourierKycGuard from './components/CourierKycGuard';
import { WPageTransition } from './components/motion/WPageTransition';

// Shells
const AuthShell = lazy(() => import('./layout/AuthShell'));
const AppShell = lazy(() => import('./layout/AppShell'));
const StoreShell = lazy(() => import('./layout/StoreShell'));
const CustomerShell = lazy(() => import('./layout/CustomerShell'));
const SellerShell = lazy(() => import('./layout/SellerShell'));
const AdminShell = lazy(() => import('./layout/AdminShell'));

// Auth Pages
const AuthPage = lazy(() => import('./pages/auth/AuthPage'));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword'));
const OTPVerification = lazy(() => import('./pages/auth/OTPVerification'));
const EmailVerification = lazy(() => import('./pages/auth/EmailVerification'));
const RoleSelection = lazy(() => import('./pages/auth/RoleSelection'));
const UnlockAccess = lazy(() => import('./pages/auth/UnlockAccess'));
const FingerprintSetup = lazy(() => import('./pages/auth/FingerprintSetup'));
const TwoFactorAuthentication = lazy(() => import('./pages/auth/TwoFactorAuthentication'));
const SessionManagement = lazy(() => import('./pages/auth/SessionManagement'));

// Dev Pages — only imported in development builds, tree-shaken in production
const StoreVerifier = import.meta.env.DEV
  ? lazy(() => import('./components/dev/StoreVerifier').then(m => ({ default: m.StoreVerifier })))
  : null;

// Preview Page
const StorePreviewPage = lazy(() => import('./pages/StorePreviewPage').then(m => ({ default: m.StorePreviewPage })));

// Public Pages
const Shop = lazy(() => import('./pages/Home'));
const Search = lazy(() => import('./pages/Search'));
const Feed = lazy(() => import('./pages/Feed'));
const Cart = lazy(() => import('./pages/Cart'));
const Messages = lazy(() => import('./pages/Messages'));
const ProductDetails = lazy(() => import('./pages/ProductDetails'));
const PayAIPage = lazy(() => import('./pages/PayAI'));
const SystemStories = lazy(() => import('./pages/admin/SystemStories'));

// Storefront Pages
const StorefrontRouter = lazy(() => import('./components/storefront/StorefrontRouter'));

// Buyer Pages
const BuyerDashboard = lazy(() => import('./pages/buyer/Dashboard'));
const BuyerProfile = lazy(() => import('./pages/buyer/Profile'));
const BuyerReferrals = lazy(() => import('./pages/buyer/Referrals'));
const OrderDetail = lazy(() => import('./pages/buyer/OrderDetail'));

// Seller Pages
const SellerDashboard = lazy(() => import('./pages/seller/Dashboard'));
const SellerProfile = lazy(() => import('./pages/seller/Profile'));
const SellerOnboarding = lazy(() => import('./pages/seller/Onboarding'));
const SubscriptionPlans = lazy(() => import('./components/seller/SubscriptionPlans'));
const WalletPage = lazy(() => import('./modules/wallet/Wallet'));
const WalletTransactions = lazy(() => import('./modules/wallet/WalletTransactions'));
const TopUp = lazy(() => import('./modules/wallet/TopUp'));

// Admin Pages
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const AdminDisputes = lazy(() => import('./pages/admin/Disputes'));
const AdminKybReview = lazy(() => import('./pages/admin/KybReview'));
const AdminReferrals = lazy(() => import('./pages/admin/Referrals'));

// Error Pages
const Unauthorized403 = lazy(() => import('./pages/errors/Unauthorized403'));
const NotFound404 = lazy(() => import('./pages/errors/NotFound404'));
const Offline = lazy(() => import('./pages/errors/Offline'));

// Courier Pages
const CourierShell = lazy(() => import('./layout/CourierShell'));
const CourierDashboard = lazy(() => import('./pages/courier/CourierDashboard'));
const CourierMapStudio = lazy(() => import('./components/courier/CourierMapStudio'));
const DeliveryQueue = lazy(() => import('./pages/courier/DeliveryQueue'));
const ActiveDelivery = lazy(() => import('./pages/courier/ActiveDelivery'));
const CourierEarnings = lazy(() => import('./pages/courier/CourierEarnings'));
const CourierProfile = lazy(() => import('./pages/courier/CourierProfile'));
const CourierOnboarding = lazy(() => import('./pages/courier/CourierOnboarding'));
const CourierSubscriptionPlans = lazy(() => import('./pages/courier/CourierSubscriptionPlans'));

// Dispatch Pages
const DispatchShell = lazy(() => import('./layout/DispatchShell'));
const DispatchConsole = lazy(() => import('./pages/admin/DispatchConsole'));
const HubQueue = lazy(() => import('./pages/admin/HubQueue'));
const LiveDriverMap = lazy(() => import('./pages/admin/LiveDriverMap'));
const FleetAnalytics = lazy(() => import('./pages/admin/FleetAnalytics'));

const DeliveryDetails = lazy(() => import('./pages/shared/DeliveryDetails'));
const PaymentCallback = lazy(() => import('./pages/shared/PaymentCallback'));

const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
    <div className="w-8 h-8 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin"></div>
  </div>
);

const TemplatePurchaseVerification = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const reference = params.get('verify_template');
    if (reference) {
      const verify = async () => {
        try {
          const res = await fetch(`/api/v1/templates/verify-purchase/${reference}`, {
            credentials: 'include'
          });
          const data = await res.json();
          if (data.success) {
            toast.success('Template Purchased Successfully!');
          } else {
            toast.error(data.message || 'Verification failed');
          }
        } catch (err) {
          toast.error('An error occurred verifying purchase');
        } finally {
          // Remove query param
          params.delete('verify_template');
          const newSearch = params.toString() ? `?${params.toString()}` : '';
          navigate(`${location.pathname}${newSearch}`, { replace: true });
        }
      };
      verify();
    }
  }, [location, navigate]);

  return null;
};

const AnimatedRoutes = () => {
  const location = useLocation();
  return (
    <Routes location={location}>
          {/* Public Routes with Smart Redirects */}
          <Route path="/" element={<RootRedirect />} />
          <Route path="/payment-callback" element={<PaymentCallback />} />
          
          {/* Shared Layout for Public and Auth Routes */}
          <Route element={<AppShell />}>
            {/* Public App Routes */}
            <Route path={ROUTES.SHOP} element={<Shop />} />
            <Route path="/search" element={<Search />} />
            <Route path={ROUTES.FEED} element={<Feed />} />
            <Route path={ROUTES.CART} element={<Cart />} />
            <Route path={ROUTES.MESSAGES} element={<Messages />} />
            <Route path={ROUTES.PRODUCT} element={<ProductDetails />} />
            <Route path={ROUTES.PAYAI} element={<PayAIPage />} />
            <Route path={ROUTES.SYSTEM_STORIES} element={<SystemStories />} />
            <Route path="/seller/:sellerId" element={<SellerProfile />} />

            {/* Auth Routes (Guarded: Only for non-logged-in users) */}
            <Route element={<GuestGuard />}>
              <Route path={ROUTES.LOGIN} element={<AuthPage initialMode="login" />} />
              <Route path={ROUTES.SIGNUP} element={<AuthPage initialMode="signup" />} />
              <Route path={ROUTES.FORGOT_PASSWORD} element={<ForgotPassword />} />
              <Route path={ROUTES.RESET_PASSWORD} element={<ResetPassword />} />
              <Route path={ROUTES.VERIFY_OTP} element={<OTPVerification />} />
              <Route path={ROUTES.VERIFY_EMAIL} element={<EmailVerification />} />
              <Route path={ROUTES.UNLOCK_ACCESS} element={<UnlockAccess />} />
            </Route>

            {/* Security & Account Management Routes (Protected for any authenticated user) */}
            <Route element={<ProtectedRoute roles={['BUYER', 'USER', 'SELLER', 'COURIER', 'ADMIN', 'PENDING']} />}>
              <Route path={ROUTES.FINGERPRINT_SETUP} element={<FingerprintSetup />} />
              <Route path={ROUTES.TWO_FACTOR_AUTH} element={<TwoFactorAuthentication />} />
              <Route path={ROUTES.SESSION_MANAGEMENT} element={<SessionManagement />} />
            </Route>
          </Route>

          {/* Courier Routes — protected: COURIER and ADMIN roles only */}
          <Route element={<ProtectedRoute roles={['COURIER', 'ADMIN']} />}>
            <Route path="/courier/onboarding" element={<CourierOnboarding />} />
            <Route path="/courier" element={<CourierKycGuard><CourierShell /></CourierKycGuard>}>
              <Route index element={<Navigate to="/courier/dashboard" replace />} />
              <Route path="dashboard" element={<CourierDashboard />} />
              <Route path="map" element={<CourierMapStudio />} />
              <Route path="active" element={<ActiveDelivery />} />
              <Route path="queue" element={<DeliveryQueue />} />
              <Route path="earnings" element={<CourierEarnings />} />
              <Route path="profile" element={<CourierProfile />} />
              <Route path="subscription" element={<CourierSubscriptionPlans />} />
              <Route path="delivery/:id" element={<DeliveryDetails />} />
            </Route>
          </Route>

          {/* Dispatch Console Routes — protected: ADMIN only */}
          <Route element={<ProtectedRoute roles={['ADMIN']} />}>
            <Route path="/dispatch" element={<DispatchShell />}>
              <Route index element={<Navigate to="/dispatch/console" replace />} />
              <Route path="console" element={<DispatchConsole />} />
              <Route path="hub-queue" element={<HubQueue />} />
              <Route path="map" element={<LiveDriverMap />} />
              <Route path="analytics" element={<FleetAnalytics />} />
              <Route path="delivery/:id" element={<DeliveryDetails />} />
            </Route>
          </Route>

          {/* Role Selection Route (Protected) */}
          <Route element={<ProtectedRoute roles={['PENDING']} />}>
            <Route element={<AuthShell />}>
              <Route path={ROUTES.ROLE_SELECTION} element={<RoleSelection />} />
            </Route>
          </Route>

          {/* Storefront Routes */}
          <Route element={<StoreShell />}>
            <Route path={ROUTES.STORE} element={<StorefrontRouter />} />
            <Route path={ROUTES.STORE_FREE} element={<StorefrontRouter />} />
            <Route path={ROUTES.STORE_PREMIUM} element={<StorefrontRouter />} />
            <Route path={ROUTES.STORE_PRO} element={<StorefrontRouter />} />
            <Route path={ROUTES.STORE_ULTRA} element={<StorefrontRouter />} />
          </Route>

          {/* Buyer Routes (Protected) */}
          <Route element={<ProtectedRoute roles={['BUYER', 'USER', 'SELLER', 'ADMIN']} />}>
            <Route element={<CustomerShell />}>
              <Route path={ROUTES.BUYER_DASHBOARD} element={<BuyerDashboard />} />
              <Route path="/buyer/orders" element={<BuyerDashboard />} />
              <Route path="/buyer/orders/:id" element={<OrderDetail />} />
              <Route path="/buyer/active-orders" element={<BuyerDashboard />} />
              <Route path="/buyer/history" element={<BuyerDashboard />} />
              <Route path="/buyer/tracking" element={<BuyerDashboard />} />
              <Route path="/buyer/disputes" element={<BuyerDashboard />} />
              <Route path="/buyer/escrow" element={<Navigate to={ROUTES.BUYER_WALLET} replace />} />
              <Route path="/buyer/notifications" element={<BuyerDashboard />} />
              <Route path={ROUTES.BUYER_PROFILE} element={<BuyerProfile />} />
              <Route path={ROUTES.BUYER_REFERRALS} element={<BuyerReferrals />} />
              <Route path={ROUTES.BUYER_WALLET}>
                <Route index element={<WalletPage />} />
                <Route path="transactions" element={<WalletTransactions />} />
                <Route path="topup" element={<TopUp />} />
                <Route path="*" element={<WalletPage />} />
              </Route>
              <Route path="/wallet" element={<Navigate to={ROUTES.BUYER_WALLET} replace />} />
              <Route path={ROUTES.ORDERS} element={<BuyerDashboard />} />
              <Route path={ROUTES.ORDER_DETAIL} element={<OrderDetail />} />
            </Route>
          </Route>

          {/* Seller Routes (Protected) */}
          <Route element={<ProtectedRoute roles={['SELLER', 'ADMIN']} />}>
            <Route element={<SellerShell />}>
              <Route path={ROUTES.SELLER_DASHBOARD} element={<SellerDashboard />} />
              <Route path={ROUTES.SELLER_ONBOARDING} element={<SellerOnboarding />} />
              <Route path={ROUTES.SELLER_SUBSCRIPTION} element={<SubscriptionPlans />} />
              <Route path={ROUTES.SELLER_WALLET}>
                <Route index element={<WalletPage />} />
                <Route path="transactions" element={<WalletTransactions />} />
                <Route path="topup" element={<TopUp />} />
                {/* Fallback to WalletPage for unimplemented sub-routes like transfer */}
                <Route path="*" element={<WalletPage />} />
              </Route>
            </Route>
          </Route>

          {/* Admin Routes (Protected) */}
          <Route element={<ProtectedRoute roles={['ADMIN']} />}>
            <Route element={<AdminShell />}>
              <Route path={ROUTES.ADMIN_DASHBOARD} element={<AdminDashboard />} />
              <Route path={ROUTES.ADMIN_DISPUTES} element={<AdminDisputes />} />
              <Route path={ROUTES.ADMIN_KYB_REVIEW} element={<AdminKybReview />} />
              <Route path={ROUTES.ADMIN_REFERRALS} element={<AdminReferrals />} />
              <Route path="/admin/system-stories" element={<SystemStories />} />
            </Route>
          </Route>

          {/* Dev Routes — only available in development builds, tree-shaken in production */}
          {import.meta.env.DEV && StoreVerifier && (
            <Route path="/dev/store-verifier" element={<StoreVerifier />} />
          )}

          {/* Preview Routes */}
          <Route path="/preview/:engine/:storeId" element={<StorePreviewPage />} />

          {/* Errors & Fallback */}
          <Route path="/offline" element={<Offline />} />
          <Route path="/403" element={<Unauthorized403 />} />
          <Route path="/404" element={<NotFound404 />} />
          <Route path="*" element={<NotFound404 />} />
        </Routes>
  );
};

function App() {
  const { checkAuth, user } = useAuthStore();

  useEffect(() => {
    checkAuth();
    // Initialize Capacitor plugins
    initializeAdMob();
  }, [checkAuth]);

  useEffect(() => {
    if (user?.id) {
      initializeRevenueCat(user.id);
    }
  }, [user]);

  return (
    <BrowserRouter>
      <TemplatePurchaseVerification />
      <Toaster 
        position="top-center" 
        toastOptions={{
          className: '',
          style: {
            background: 'var(--glass-bg)',
            border: '1px solid var(--glass-border-outer)',
            boxShadow: 'var(--glass-shadow)',
            color: 'var(--text-main)',
            borderRadius: '16px',
            padding: '16px 24px',
            fontSize: '15px',
            fontWeight: '500',
            letterSpacing: '-0.01em',
            backdropFilter: 'var(--glass-blur)',
            WebkitBackdropFilter: 'var(--glass-blur)',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: 'var(--bg-primary)',
            },
            style: {
              border: '1px solid rgba(16, 185, 129, 0.3)',
            }
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: 'var(--bg-primary)',
            },
            style: {
              border: '1px solid rgba(239, 68, 68, 0.3)',
            }
          },
        }}
      />
      <WPageTransition />
      <PromoOverlay />
      <Suspense fallback={<LoadingFallback />}>
        <MapProvider>
          <ErrorBoundary>
            <AnimatedRoutes />
          </ErrorBoundary>
          <Messages />
        </MapProvider>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
