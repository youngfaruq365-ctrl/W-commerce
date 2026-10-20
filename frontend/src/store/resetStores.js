import { useSellerStore } from './sellerStore';
import { useBuyerStore } from './buyerStore';
import { useCartStore } from './cartStore';
import { useCourierStore } from './courierStore';

export const resetAllStores = () => {
  try {
    useSellerStore.getState().resetSellerStore?.();
  } catch (e) {
    console.warn('Failed to reset seller store:', e);
  }
  try {
    useBuyerStore.getState().resetBuyerStore?.();
  } catch (e) {
    console.warn('Failed to reset buyer store:', e);
  }
  try {
    useCartStore.getState().clearCart?.();
  } catch (e) {
    console.warn('Failed to clear cart store:', e);
  }
  try {
    useCourierStore.setState({
      profile: null,
      earnings: { today: 0, thisWeek: 0, pending: 0, cleared: 0, balance: 0 },
      earningHistory: [],
      dashboard: null,
      profileLoading: false,
      earningsLoading: false,
      dashboardLoading: false,
    });
  } catch (e) {
    console.warn('Failed to reset courier store:', e);
  }
};
