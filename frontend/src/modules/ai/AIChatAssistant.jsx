import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { MessageSquare, Sparkles, Globe, Zap, ChevronRight, Check, Languages, Bot, RefreshCw } from 'lucide-react';
import { WButton, WCard, WBadge } from '../../design/components';

const CONTEXTS = [
  {
    id: 1,
    label: 'Buyer asking about shipping',
    context: 'Customer: "Hi, when will my order arrive? I ordered 3 days ago."',
    suggestions: [
      "Hi! Your order is on its way. Standard shipping takes 5–7 business days. You can track your order in real-time from your account dashboard. Is there anything else I can help you with?",
      "Hello! Thanks for reaching out. Your order placed 3 days ago is currently in transit and should arrive within 2–4 more business days. I'll send you the tracking link now.",
      "Hey there! Great news — your package is already shipped! Typical delivery is 5–7 days from order date. Head to Orders > Track to see the live location.",
    ],
  },
  {
    id: 2,
    label: 'Customer requesting refund',
    context: 'Customer: "I received a damaged product. I want a refund immediately."',
    suggestions: [
      "I'm so sorry to hear your order arrived damaged! That's absolutely not acceptable and I want to make this right immediately. Please send a photo of the damage and I'll process your full refund within 24 hours.",
      "We sincerely apologize for the damaged item. Your satisfaction is our top priority. I've initiated a refund for you — it will appear in your account within 3–5 business days. No need to return the item.",
      "Oh no! A damaged product is the last thing we want you to experience. Let me take care of this right away — I'm processing a full refund + sending you a replacement at no extra cost.",
    ],
  },
];

const LANGUAGES = [
  { code: 'es', name: 'Spanish', flag: '🇪🇸', sample: '¡Hola! Tu pedido está en camino.' },
  { code: 'fr', name: 'French', flag: '🇫🇷', sample: 'Bonjour! Votre commande est en route.' },
  { code: 'de', name: 'German', flag: '🇩🇪', sample: 'Hallo! Ihre Bestellung ist unterwegs.' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵', sample: 'こんにちは！ご注文は発送中です。' },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦', sample: 'مرحبا! طلبك في الطريق.' },
];

export default function AIChatAssistant() {
  const [activeContext, setActiveContext] = useState(CONTEXTS[0]);
  const [selectedReply, setSelectedReply] = useState(null);
  const [intent, setIntent] = useState('');
  const [expanded, setExpanded] = useState('');
  const [expanding, setExpanding] = useState(false);
  const [detectedLang, setDetectedLang] = useState(null);
  const [translatedTo, setTranslatedTo] = useState(null);
  const [translating, setTranslating] = useState(false);
  const [accuracy] = useState(94);

  const expandIntent = () => {
    if (!intent.trim()) return;
    setExpanding(true);
    setTimeout(() => {
      setExpanded(`Thank you for reaching out! I completely understand your concern and I want to assure you that we take this very seriously. ${intent}. Please don't hesitate to let me know if you need any further assistance — I'm here to help and will ensure this gets resolved to your complete satisfaction. Thank you for your patience.`);
      setExpanding(false);
    }, 1200);
  };

  const detectLanguage = () => {
    setDetectedLang({ code: 'es', name: 'Spanish', flag: '🇪🇸', confidence: 98 });
  };

  const translate = (lang) => {
    setTranslating(true);
    setTimeout(() => { setTranslatedTo(lang); setTranslating(false); }, 900);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] px-4 py-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Bot size={18} className="text-purple-400" />
              <span className="text-purple-400 text-sm font-medium">AI Chat Assistant</span>
            </div>
            <h1 className="text-3xl font-bold text-[var(--text-main)]">Smart Reply Composer</h1>
            <p className="text-[var(--text-muted)] mt-1 text-sm">AI-powered tools to help you respond faster and smarter.</p>
          </div>
          <div className="hidden md:flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-2">
            <Zap size={14} className="text-green-400" />
            <span className="text-green-400 text-sm font-medium">{accuracy}% AI Accuracy</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Suggested Replies */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare size={15} className="text-[var(--text-muted)]" />
              <h2 className="text-[var(--text-main)] font-bold">Suggested Replies</h2>
              <WBadge variant="info" size="sm">AI</WBadge>
            </div>
            {/* Context Selector */}
            <div className="flex gap-2 mb-4 flex-wrap">
              {CONTEXTS.map(c => (
                <button key={c.id} onClick={() => { setActiveContext(c); setSelectedReply(null); }}
                  className={`text-xs px-3 py-1.5 rounded-full transition-all ${activeContext.id === c.id ? 'bg-[var(--text-main)] text-[var(--bg-primary)] font-medium' : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)] border border-[var(--border-color)] hover:border-[var(--border-hover)]'}`}>
                  {c.label}
                </button>
              ))}
            </div>
            <div className="bg-[var(--bg-tertiary)] rounded-xl p-3 mb-4 text-[var(--text-muted)] text-xs italic border-l-2 border-[var(--border-color)]">
              {activeContext.context}
            </div>
            <div className="space-y-2">
              {activeContext.suggestions.map((s, i) => (
                <button key={i} onClick={() => setSelectedReply(i)}
                  className={`w-full text-left text-xs p-3 rounded-xl border transition-all leading-relaxed ${selectedReply === i ? 'border-white bg-[var(--accent-gray-dim)] text-[var(--text-main)]' : 'border-[var(--border-color)] bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:border-[var(--border-hover)] hover:text-[var(--text-main)]'}`}>
                  <div className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-[var(--bg-card)] border border-current flex items-center justify-center shrink-0 mt-0.5 text-[10px]">{selectedReply === i ? '✓' : i + 1}</span>
                    {s}
                  </div>
                </button>
              ))}
            </div>
            {selectedReply !== null && (
              <WButton
                variant="primary"
                size="sm"
                fullWidth
                className="mt-3"
                icon={<Check size={13} />}
                onClick={() => {
                  if (activeContext?.suggestions?.[selectedReply]) {
                    navigator.clipboard.writeText(activeContext.suggestions[selectedReply]);
                    toast.success('Reply copied to clipboard!');
                  }
                }}
              >
                Use This Reply
              </WButton>
            )}
          </div>

          <div className="space-y-4">
            {/* AI Compose */}
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles size={15} className="text-purple-400" />
                <h2 className="text-[var(--text-main)] font-bold">AI Compose</h2>
                <span className="text-[var(--text-faint)] text-xs">Type your intent → AI writes the full message</span>
              </div>
              <textarea
                value={intent}
                onChange={e => setIntent(e.target.value)}
                rows={3}
                placeholder="e.g. Tell the customer we're sorry for the delay and offer a 10% discount coupon..."
                className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-main)] placeholder-[var(--text-faint)] rounded-xl px-4 py-3 text-sm outline-none focus:border-[var(--border-hover)] transition-colors resize-none"
              />
              <WButton variant="ghost" size="sm" icon={expanding ? <RefreshCw size={13} className="animate-spin" /> : <ChevronRight size={13} />} onClick={expandIntent} disabled={!intent.trim() || expanding} className="mt-2">
                {expanding ? 'Composing...' : 'Expand to Full Message'}
              </WButton>
              {expanded && (
                <div className="mt-3 bg-[var(--bg-tertiary)] border border-green-500/20 rounded-xl p-3 text-[var(--text-main)] text-sm leading-relaxed">
                  {expanded}
                </div>
              )}
            </div>

            {/* Translation Helper */}
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Languages size={15} className="text-blue-400" />
                <h2 className="text-[var(--text-main)] font-bold">Translation Helper</h2>
              </div>
              <div className="bg-[var(--bg-tertiary)] rounded-xl p-3 mb-3 text-[var(--text-muted)] text-xs">
                "¿Cuándo llegará mi pedido? Lo hice hace 3 días."
              </div>
              {!detectedLang ? (
                <WButton variant="ghost" size="sm" icon={<Globe size={13} />} onClick={detectLanguage}>Detect Language</WButton>
              ) : (
                <div>
                  <div className="flex items-center gap-2 mb-3 bg-blue-500/10 border border-blue-500/20 rounded-xl p-2.5">
                    <span className="text-lg">{detectedLang.flag}</span>
                    <div>
                      <p className="text-[var(--text-main)] text-xs font-semibold">{detectedLang.name} detected</p>
                      <p className="text-[var(--text-faint)] text-[10px]">{detectedLang.confidence}% confidence</p>
                    </div>
                  </div>
                  <p className="text-[var(--text-faint)] text-xs mb-2">Translate reply to:</p>
                  <div className="flex flex-wrap gap-2">
                    {LANGUAGES.map(lang => (
                      <button key={lang.code} onClick={() => translate(lang)}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs transition-all ${translatedTo?.code === lang.code ? 'bg-[var(--text-main)] text-[var(--bg-primary)] font-medium' : 'bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-muted)] hover:border-[var(--border-hover)]'}`}>
                        {lang.flag} {lang.name}
                      </button>
                    ))}
                  </div>
                  {translatedTo && !translating && (
                    <div className="mt-3 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl p-3 text-sm text-[var(--text-main)]">
                      <p className="text-[var(--text-faint)] text-[10px] mb-1">{translatedTo.flag} {translatedTo.name}</p>
                      {translatedTo.sample}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
