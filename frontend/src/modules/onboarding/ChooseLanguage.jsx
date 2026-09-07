import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Check, ArrowRight } from 'lucide-react';
import { useUIStore } from '../../store/uiStore';

const LANGUAGES = [
  { code: 'en',  flag: '🇺🇸', name: 'English',    native: 'English'       },
  { code: 'es',  flag: '🇪🇸', name: 'Spanish',    native: 'Español'       },
  { code: 'fr',  flag: '🇫🇷', name: 'French',     native: 'Français'      },
  { code: 'ar',  flag: '🇸🇦', name: 'Arabic',     native: 'العربية'       },
  { code: 'zh',  flag: '🇨🇳', name: 'Mandarin',   native: '普通话'         },
  { code: 'pt',  flag: '🇧🇷', name: 'Portuguese', native: 'Português'     },
  { code: 'hi',  flag: '🇮🇳', name: 'Hindi',      native: 'हिन्दी'         },
  { code: 'de',  flag: '🇩🇪', name: 'German',     native: 'Deutsch'       },
  { code: 'ja',  flag: '🇯🇵', name: 'Japanese',   native: '日本語'         },
  { code: 'ko',  flag: '🇰🇷', name: 'Korean',     native: '한국어'          },
  { code: 'ru',  flag: '🇷🇺', name: 'Russian',    native: 'Русский'       },
  { code: 'it',  flag: '🇮🇹', name: 'Italian',    native: 'Italiano'      },
  { code: 'tr',  flag: '🇹🇷', name: 'Turkish',    native: 'Türkçe'        },
  { code: 'nl',  flag: '🇳🇱', name: 'Dutch',      native: 'Nederlands'    },
  { code: 'sv',  flag: '🇸🇪', name: 'Swedish',    native: 'Svenska'       },
  { code: 'pl',  flag: '🇵🇱', name: 'Polish',     native: 'Polski'        },
  { code: 'th',  flag: '🇹🇭', name: 'Thai',       native: 'ภาษาไทย'       },
  { code: 'vi',  flag: '🇻🇳', name: 'Vietnamese', native: 'Tiếng Việt'   },
  { code: 'id',  flag: '🇮🇩', name: 'Indonesian', native: 'Bahasa Indonesia' },
  { code: 'sw',  flag: '🇰🇪', name: 'Swahili',    native: 'Kiswahili'     },
];

const langStyles = `
  @keyframes fadeSlideUp {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .lang-item { animation: fadeSlideUp 0.35s ease both; }
`;

export default function ChooseLanguage() {
  const navigate = useNavigate();
  const { setLanguage, language } = useUIStore();
  const [selected, setSelected] = useState(language || 'en');
  const [query, setQuery] = useState('');

  const filtered = LANGUAGES.filter(l =>
    l.name.toLowerCase().includes(query.toLowerCase()) ||
    l.native.toLowerCase().includes(query.toLowerCase())
  );

  const handleContinue = () => {
    setLanguage(selected);
    navigate('/onboarding/country');
  };

  return (
    <>
      <style>{langStyles}</style>
      <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col">

        {/* Header */}
        <div className="px-6 pt-12 pb-4 text-center">
          <p className="text-xs text-[var(--text-faint)] uppercase tracking-widest font-medium mb-2">Step 2 of 6</p>
          <h1 className="text-3xl font-black text-white mb-2">Choose Your Language</h1>
          <p className="text-sm text-[var(--text-muted)]">You can always change this in settings</p>
        </div>

        {/* Search */}
        <div className="px-6 py-3 sticky top-0 bg-[var(--bg-primary)] z-10">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-faint)]" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search language…"
              className="
                w-full pl-11 pr-4 py-3 rounded-xl text-sm text-white placeholder-[var(--text-faint)]
                bg-[var(--bg-secondary)] border border-[var(--border-color)]
                focus:outline-none focus:border-white/30 transition-colors
              "
            />
          </div>
        </div>

        {/* Language grid */}
        <div className="flex-1 overflow-y-auto px-6 pb-32">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2">
            {filtered.map((lang, idx) => {
              const isSelected = selected === lang.code;
              return (
                <button
                  key={lang.code}
                  onClick={() => setSelected(lang.code)}
                  className={`
                    lang-item flex flex-col items-start gap-0.5 p-3 rounded-xl border transition-all duration-200 text-left
                    ${isSelected
                      ? 'border-white bg-white/10 shadow-[0_0_20px_rgba(255,255,255,0.1)]'
                      : 'border-[var(--border-color)] bg-[var(--bg-secondary)] hover:border-[var(--border-hover)] hover:bg-[var(--bg-tertiary)]'
                    }
                  `}
                  style={{ animationDelay: `${idx * 0.02}s` }}
                >
                  <div className="flex items-center gap-2 w-full">
                    <span className="text-xl">{lang.flag}</span>
                    {isSelected && (
                      <div className="ml-auto w-4 h-4 rounded-full bg-white flex items-center justify-center flex-shrink-0">
                        <Check className="w-2.5 h-2.5 text-[var(--bg-primary)]" />
                      </div>
                    )}
                  </div>
                  <span className="text-xs font-semibold text-white mt-1">{lang.name}</span>
                  <span className="text-[10px] text-[var(--text-muted)]">{lang.native}</span>
                </button>
              );
            })}
          </div>

          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <span className="text-4xl mb-3">🔍</span>
              <p className="text-sm text-[var(--text-muted)]">No languages found for "{query}"</p>
            </div>
          )}
        </div>

        {/* Continue button — fixed bottom */}
        <div className="fixed bottom-0 inset-x-0 p-6 bg-gradient-to-t from-[var(--bg-primary)] via-[var(--bg-primary)]/90 to-transparent pointer-events-none">
          <button
            onClick={handleContinue}
            className="
              pointer-events-auto w-full max-w-sm mx-auto flex items-center justify-center gap-2
              bg-white text-[var(--bg-primary)] font-bold text-sm py-4 rounded-2xl
              hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:scale-[1.02]
              active:scale-[0.98] transition-all duration-200
            "
          >
            Continue <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  );
}
