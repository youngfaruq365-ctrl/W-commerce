import { create } from 'zustand';

const useAssetStore = create((set) => ({
  theme: 'basic', // basic, pro, premium, ultra, proultra
  setTheme: (theme) => set({ theme }),
}));

export default useAssetStore;
