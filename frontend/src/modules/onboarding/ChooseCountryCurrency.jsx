import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Check, ArrowRight, Navigation, ChevronRight, AlertTriangle } from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { apiClient as axios } from '@/utils/apiClient';

/* ─── Data ────────────────────────────────────────────────────── */
const COUNTRIES = [
  { code: 'US', flag: '🇺🇸', name: 'United States',    currency: 'USD' },
  { code: 'GB', flag: '🇬🇧', name: 'United Kingdom',   currency: 'GBP' },
  { code: 'DE', flag: '🇩🇪', name: 'Germany',           currency: 'EUR' },
  { code: 'FR', flag: '🇫🇷', name: 'France',            currency: 'EUR' },
  { code: 'JP', flag: '🇯🇵', name: 'Japan',             currency: 'JPY' },
  { code: 'CN', flag: '🇨🇳', name: 'China',             currency: 'CNY' },
  { code: 'BR', flag: '🇧🇷', name: 'Brazil',            currency: 'BRL' },
  { code: 'CA', flag: '🇨🇦', name: 'Canada',            currency: 'CAD' },
  { code: 'AU', flag: '🇦🇺', name: 'Australia',         currency: 'AUD' },
  { code: 'IN', flag: '🇮🇳', name: 'India',             currency: 'INR' },
  { code: 'NG', flag: '🇳🇬', name: 'Nigeria',           currency: 'NGN' },
  { code: 'KE', flag: '🇰🇪', name: 'Kenya',             currency: 'KES' },
  { code: 'ZA', flag: '🇿🇦', name: 'South Africa',      currency: 'ZAR' },
  { code: 'GH', flag: '🇬🇭', name: 'Ghana',             currency: 'GHS' },
  { code: 'EG', flag: '🇪🇬', name: 'Egypt',             currency: 'EGP' },
  { code: 'MX', flag: '🇲🇽', name: 'Mexico',            currency: 'MXN' },
  { code: 'AR', flag: '🇦🇷', name: 'Argentina',         currency: 'ARS' },
  { code: 'RU', flag: '🇷🇺', name: 'Russia',            currency: 'RUB' },
  { code: 'KR', flag: '🇰🇷', name: 'South Korea',       currency: 'KRW' },
  { code: 'SG', flag: '🇸🇬', name: 'Singapore',         currency: 'SGD' },
  { code: 'AE', flag: '🇦🇪', name: 'UAE',               currency: 'AED' },
  { code: 'ID', flag: '🇮🇩', name: 'Indonesia',         currency: 'IDR' },
  { code: 'TR', flag: '🇹🇷', name: 'Turkey',            currency: 'TRY' },
  { code: 'PH', flag: '🇵🇭', name: 'Philippines',       currency: 'PHP' },
  { code: 'PK', flag: '🇵🇰', name: 'Pakistan',          currency: 'PKR' },
];

const CURRENCIES = [
  { code: 'USD', symbol: '$',   name: 'US Dollar'          },
  { code: 'EUR', symbol: '€',   name: 'Euro'               },
  { code: 'GBP', symbol: '£',   name: 'British Pound'      },
  { code: 'JPY', symbol: '¥',   name: 'Japanese Yen'       },
  { code: 'CNY', symbol: '¥',   name: 'Chinese Yuan'       },
  { code: 'CAD', symbol: 'C$',  name: 'Canadian Dollar'    },
  { code: 'AUD', symbol: 'A$',  name: 'Australian Dollar'  },
  { code: 'INR', symbol: '₹',   name: 'Indian Rupee'       },
  { code: 'NGN', symbol: '₦',   name: 'Nigerian Naira'     },
  { code: 'KES', symbol: 'Ksh', name: 'Kenyan Shilling'    },
  { code: 'ZAR', symbol: 'R',   name: 'South African Rand' },
  { code: 'GHS', symbol: '₵',   name: 'Ghanaian Cedi'      },
  { code: 'BRL', symbol: 'R$',  name: 'Brazilian Real'     },
  { code: 'MXN', symbol: 'MX$', name: 'Mexican Peso'       },
  { code: 'SGD', symbol: 'S$',  name: 'Singapore Dollar'   },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham'         },
  { code: 'KRW', symbol: '₩',   name: 'South Korean Won'   },
  { code: 'RUB', symbol: '₽',   name: 'Russian Ruble'      },
];

const ccStyles = `
  @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
  .cc-in { animation: fadeUp 0.35s ease both; }
`;

export default function ChooseCountryCurrency() {
  const navigate = useNavigate();
  const { setCountry, setCurrency, country: savedCountry } = useUIStore();

  const [step, setStep] = useState(1); // 1 = country, 2 = currency
  const [countryQuery, setCountryQuery] = useState('');
  const [selectedCountry, setSelectedCountry] = useState(
    COUNTRIES.find(c => c.code === savedCountry) || COUNTRIES[0]
  );
  const [selectedCurrency, setSelectedCurrency] = useState(
    CURRENCIES.find(c => c.code === selectedCountry.currency) || CURRENCIES[0]
  );
  const [detecting, setDetecting] = useState(false);
  const [detectError, setDetectError] = useState('');
  const [detectedSuggestion, setDetectedSuggestion] = useState(null);

  /* Auto-sync currency when country changes */
  useEffect(() => {
    const match = CURRENCIES.find(c => c.code === selectedCountry.currency);
    if (match) setSelectedCurrency(match);
  }, [selectedCountry]);

  // Attempt auto-detect on mount
  useEffect(() => {
    handleAutoDetect(true);
  }, []);

  const filteredCountries = COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(countryQuery.toLowerCase()) ||
    c.code.toLowerCase().includes(countryQuery.toLowerCase())
  );

  const handleAutoDetect = async (silent = false) => {
    setDetecting(true);
    setDetectError('');
    try {
      // Free IP geolocation API (use native fetch without credentials/custom headers to avoid CORS block)
      const response = await fetch('https://ipapi.co/json/');
      if (!response.ok) throw new Error('Geo lookup failed');
      const data = await response.json();
      const countryCode = data.country; // e.g. "US"
      if (countryCode) {
        const found = COUNTRIES.find(c => c.code === countryCode);
        if (found) {
          setSelectedCountry(found);
          setDetectedSuggestion(found);
        }
      }
    } catch (err) {
      if (!silent) {
        setDetectError('Could not detect location. Please select manually.');
      }
    } finally {
      setDetecting(false);
    }
  };

  const handleContinue = () => {
    if (step === 1) {
      setStep(2);
    } else {
      setCountry(selectedCountry.code);
      setCurrency(selectedCurrency.code);
      navigate('/onboarding/permissions');
    }
  };

  return (
    <>
      <style>{ccStyles}</style>
      <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col text-[var(--text-main)]">

        {/* Header */}
        <div className="px-6 pt-12 pb-4">
          {step === 2 && (
            <button
              onClick={() => setStep(1)}
              className="text-xs text-[var(--text-muted)] hover:text-white mb-4 flex items-center gap-1 transition-colors"
            >
              ← Back to Country
            </button>
          )}
          <p className="text-xs text-[var(--text-faint)] uppercase tracking-widest font-medium mb-2">Step 3 of 6</p>
          <h1 className="text-3xl font-black mb-1">
            {step === 1 ? 'Your Country' : 'Your Currency'}
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            {step === 1 ? 'Where are you shopping from?' : 'Auto-set from your country — change if needed'}
          </p>
        </div>

        {step === 1 ? (
          <>
            {/* Auto-detect */}
            <div className="px-6 mb-3">
              <button
                onClick={() => handleAutoDetect(false)}
                disabled={detecting}
                className="
                  w-full flex items-center gap-3 p-3 rounded-xl border border-[var(--border-color)]
                  bg-[var(--bg-secondary)] hover:border-[var(--border-hover)] hover:bg-[var(--bg-tertiary)]
                  transition-all duration-200 text-left
                "
              >
                <div className="w-8 h-8 rounded-lg bg-[var(--text-main)]/10 flex items-center justify-center">
                  <Navigation className={`w-4 h-4 text-[var(--text-main)] ${detecting ? 'animate-spin' : ''}`} />
                </div>
                <div>
                  <div className="text-xs font-semibold">
                    {detecting ? 'Detecting location…' : (detectedSuggestion ? `Suggested: ${detectedSuggestion.name}` : 'Auto-detect my location')}
                  </div>
                  <div className="text-[10px] text-[var(--text-faint)]">
                    {detectedSuggestion ? 'Based on your IP address' : 'Uses IP geolocation — no GPS needed'}
                  </div>
                </div>
                {!detecting && <ChevronRight className="w-4 h-4 text-[var(--text-faint)] ml-auto" />}
              </button>
              
              {detectError && (
                <div className="mt-2 text-xs text-red-400 flex items-center gap-1">
                  <AlertTriangle size={12} />
                  {detectError}
                </div>
              )}
            </div>

            {/* Search */}
            <div className="px-6 mb-3 sticky top-0 bg-[var(--bg-primary)] z-10 py-2">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-faint)]" />
                <input
                  value={countryQuery}
                  onChange={e => setCountryQuery(e.target.value)}
                  placeholder="Search country…"
                  className="
                    w-full pl-11 pr-4 py-3 rounded-xl text-sm placeholder-[var(--text-faint)]
                    bg-[var(--bg-secondary)] border border-[var(--border-color)]
                    focus:outline-none focus:border-[var(--border-hover)] transition-colors text-[var(--text-main)]
                  "
                />
              </div>
            </div>

            {/* Country list */}
            <div className="flex-1 overflow-y-auto px-6 pb-32">
              <div className="space-y-2">
                {filteredCountries.map((country, idx) => {
                  const isSelected = selectedCountry.code === country.code;
                  return (
                    <button
                      key={country.code}
                      onClick={() => setSelectedCountry(country)}
                      className={`
                        cc-in w-full flex items-center gap-3 p-3 rounded-xl border transition-all duration-200
                        ${isSelected
                          ? 'border-[var(--text-main)] bg-[var(--text-main)]/10'
                          : 'border-[var(--border-color)] bg-[var(--bg-secondary)] hover:border-[var(--border-hover)] hover:bg-[var(--bg-tertiary)]'
                        }
                      `}
                      style={{ animationDelay: `${idx * 0.02}s` }}
                    >
                      <span className="text-2xl">{country.flag}</span>
                      <div className="flex-1 text-left">
                        <div className="text-sm font-semibold">{country.name}</div>
                        <div className="text-[10px] text-[var(--text-faint)]">{country.currency}</div>
                      </div>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-[var(--text-main)] flex items-center justify-center">
                          <Check className="w-3 h-3 text-[var(--bg-primary)]" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          /* Currency step */
          <div className="flex-1 overflow-y-auto px-6 pb-32">
            {/* Selected summary */}
            <div className="cc-in mb-4 p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex items-center gap-3">
              <span className="text-3xl">{selectedCountry.flag}</span>
              <div>
                <div className="text-sm font-semibold">{selectedCountry.name}</div>
                <div className="text-xs text-[var(--text-muted)]">Default: {selectedCountry.currency}</div>
              </div>
            </div>

            <p className="text-xs text-[var(--text-faint)] uppercase tracking-widest mb-3">Available Currencies</p>
            <div className="space-y-2">
              {CURRENCIES.map((curr, idx) => {
                const isSelected = selectedCurrency.code === curr.code;
                return (
                  <button
                    key={curr.code}
                    onClick={() => setSelectedCurrency(curr)}
                    className={`
                      cc-in w-full flex items-center gap-4 p-3 rounded-xl border transition-all duration-200
                      ${isSelected
                        ? 'border-[var(--text-main)] bg-[var(--text-main)]/10'
                        : 'border-[var(--border-color)] bg-[var(--bg-secondary)] hover:border-[var(--border-hover)] hover:bg-[var(--bg-tertiary)]'
                      }
                    `}
                    style={{ animationDelay: `${idx * 0.02}s` }}
                  >
                    <div className={`w-10 h-10 rounded-xl font-bold text-sm flex items-center justify-center ${isSelected ? 'bg-[var(--text-main)] text-[var(--bg-primary)]' : 'bg-[var(--bg-tertiary)] text-[var(--text-main)]'}`}>
                      {curr.symbol}
                    </div>
                    <div className="flex-1 text-left">
                      <div className="text-sm font-semibold">{curr.name}</div>
                      <div className="text-[10px] text-[var(--text-faint)]">{curr.code}</div>
                    </div>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-[var(--text-main)] flex items-center justify-center">
                        <Check className="w-3 h-3 text-[var(--bg-primary)]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Fixed bottom CTA */}
        <div className="fixed bottom-0 inset-x-0 p-6 bg-gradient-to-t from-[var(--bg-primary)] via-[var(--bg-primary)]/90 to-transparent pointer-events-none z-20">
          <button
            onClick={handleContinue}
            className="
              pointer-events-auto w-full max-w-sm mx-auto flex items-center justify-center gap-2
              bg-[var(--text-main)] text-[var(--bg-primary)] font-bold text-sm py-4 rounded-2xl
              hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200
            "
          >
            {step === 1 ? 'Choose Currency' : 'Continue'} <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  );
}
