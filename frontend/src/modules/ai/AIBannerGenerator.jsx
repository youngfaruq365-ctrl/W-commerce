import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { Sparkles, Download, Check, RefreshCw, Image, Zap } from 'lucide-react';
import { WButton } from '../../design/components';
import axios from 'axios';

const STYLES = ['Festive', 'Minimal', 'Bold', 'Gradient', 'Neon', 'Elegant'];

function BannerPreview({ imageUrl, active, onClick, onDownload, onUse }) {
  return (
    <div className={`rounded-2xl overflow-hidden border-2 transition-all ${active ? 'border-white shadow-[0_0_20px_rgba(255,255,255,0.2)]' : 'border-transparent hover:border-[var(--border-hover)]'}`}>
      <div className="relative h-48 cursor-pointer bg-[var(--bg-tertiary)]" onClick={onClick}>
        <img src={imageUrl} alt="Generated Banner" className="w-full h-full object-cover" />
        {active && (
          <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white flex items-center justify-center">
            <Check size={13} className="text-[var(--bg-primary)]" />
          </div>
        )}
      </div>
      <div className="bg-[var(--bg-tertiary)] border-t border-[var(--border-color)] flex">
        <button onClick={() => window.open(imageUrl, '_blank')} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card)] transition-all">
          <Download size={13} /> Open
        </button>
        <div className="w-px bg-[var(--border-color)]" />
        <button onClick={onUse} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-card)] transition-all font-medium">
          <Check size={13} /> Use Banner
        </button>
      </div>
    </div>
  );
}

export default function AIBannerGenerator() {
  const [productName, setProductName] = useState('');
  const [promoText, setPromoText] = useState('');
  const [style, setStyle] = useState('Festive');
  const [generated, setGenerated] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [activeUrl, setActiveUrl] = useState(null);
  const [used, setUsed] = useState(false);
  const [banners, setBanners] = useState([]);
  const [error, setError] = useState('');

  const generate = async () => {
    if (!productName.trim()) return;
    setGenerating(true);
    setGenerated(false);
    setError('');
    try {
      const prompt = `Product: ${productName}, Promotion: ${promoText}, Style: ${style}`;
      const res = await axios.post('/api/v1/ai/generate-banner', { prompt }, { withCredentials: true });
      if (res.data.success && res.data.asset) {
        setBanners([res.data.asset.assetUrl]); // Could loop for more
        setActiveUrl(res.data.asset.assetUrl);
        setGenerated(true);
      } else {
        const msg = res.data.message || 'Generation failed';
        setError(msg);
        toast.error(msg);
      }
    } catch (err) {
      const errMsg = err?.response?.data?.message || err.message;
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setGenerating(false);
    }
  };

  const handleUse = () => {
    setUsed(true);
    setTimeout(() => setUsed(false), 3000);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-900/40 to-red-900/40 border border-orange-500/30 px-4 py-1.5 rounded-full mb-4">
            <Image size={14} className="text-orange-400" />
            <span className="text-orange-300 text-sm font-medium">AI Banner Generator</span>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-[var(--accent-gray)] bg-clip-text text-transparent mb-2">Create Stunning Banners</h1>
          <p className="text-[var(--text-muted)]">Describe your product and promotion — AI generates professional marketing banners instantly.</p>
        </div>

        {/* Input Form */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-[var(--text-muted)] text-xs font-medium mb-1.5 block">Product Name *</label>
              <input
                value={productName}
                onChange={e => setProductName(e.target.value)}
                placeholder="e.g. Ultra Slim Wireless Earbuds"
                className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-main)] placeholder-[var(--text-faint)] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[var(--border-hover)] transition-colors"
              />
            </div>
            <div>
              <label className="text-[var(--text-muted)] text-xs font-medium mb-1.5 block">Promotion Text</label>
              <input
                value={promoText}
                onChange={e => setPromoText(e.target.value)}
                placeholder="e.g. 40% OFF — Limited Time Only!"
                className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-main)] placeholder-[var(--text-faint)] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[var(--border-hover)] transition-colors"
              />
            </div>
          </div>
          <div className="mb-5">
            <label className="text-[var(--text-muted)] text-xs font-medium mb-2 block">Banner Style</label>
            <div className="flex flex-wrap gap-2">
              {STYLES.map(s => (
                <button key={s} onClick={() => setStyle(s)}
                  className={`px-4 py-1.5 rounded-full text-sm transition-all ${style === s ? 'bg-[var(--text-main)] text-[var(--bg-primary)] font-semibold' : 'bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-muted)] hover:border-[var(--border-hover)] hover:text-[var(--text-main)]'}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          <WButton
            variant="primary"
            icon={generating ? <RefreshCw size={15} className="animate-spin" /> : <Sparkles size={15} />}
            onClick={generate}
            disabled={!productName.trim() || generating}
            loading={generating}
          >
            {generating ? 'Generating Banners...' : 'Generate 3 Banner Concepts'}
          </WButton>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-500/20 border border-red-500/30 rounded-xl p-3 mb-6 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Generated Banners */}
        {generated && (
          <div className="animate-[fadeInUp_0.4s_ease_forwards]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[var(--text-main)] font-bold text-xl">Generated Banners</h2>
              <button onClick={generate} className="flex items-center gap-1.5 text-[var(--text-muted)] hover:text-[var(--text-main)] text-sm transition-colors">
                <RefreshCw size={14} /> Generate Again
              </button>
            </div>
            {used && (
              <div className="flex items-center gap-2 bg-green-500/20 border border-green-500/30 rounded-xl p-3 mb-4 text-green-400 text-sm">
                <Check size={15} /> Banner applied to your store!
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {banners.map((url, i) => (
                <BannerPreview
                  key={i}
                  imageUrl={url}
                  active={activeUrl === url}
                  onClick={() => setActiveUrl(url)}
                  onUse={handleUse}
                />
              ))}
            </div>
            <p className="text-[var(--text-faint)] text-xs text-center mt-4">Click a banner to select it, then use Download or Use Banner.</p>
          </div>
        )}

        {!generated && !generating && (
          <div className="text-center py-16 text-[var(--text-faint)]">
            <Image size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Enter your product details and click Generate to see AI-created banners.</p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeInUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
      `}</style>
    </div>
  );
}
