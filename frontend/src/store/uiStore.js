import { create } from 'zustand';

/**
 * UI Store — manages global UI preferences (language, country, currency, theme).
 * Used by onboarding flows: ChooseCountryCurrency, ChooseLanguage.
 */
export const useUIStore = create((set, get) => ({
  // ─── Language ──────────────────────────────────────────────
  language: localStorage.getItem('w_language') || 'en',
  setLanguage: (lang) => {
    localStorage.setItem('w_language', lang);
    set({ language: lang });
  },

  // ─── Country & Currency ────────────────────────────────────
  country: localStorage.getItem('w_country') || '',
  currency: localStorage.getItem('w_currency') || 'USD',
  setCountry: (code) => {
    localStorage.setItem('w_country', code);
    set({ country: code });
  },
  setCurrency: (code) => {
    localStorage.setItem('w_currency', code);
    set({ currency: code });
  },
  setCountryAndCurrency: (country, currency) => {
    localStorage.setItem('w_country', country);
    localStorage.setItem('w_currency', currency);
    set({ country, currency });
  },

  // ─── Theme ─────────────────────────────────────────────────
  theme: localStorage.getItem('w_theme') || 'dark',
  setTheme: (theme) => {
    localStorage.setItem('w_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    set({ theme });
  },

  // ─── Onboarding ────────────────────────────────────────────
  onboardingComplete: !!localStorage.getItem('w_onboarding_done'),
  completeOnboarding: () => {
    localStorage.setItem('w_onboarding_done', '1');
    set({ onboardingComplete: true });
  },
}));

export default useUIStore;
