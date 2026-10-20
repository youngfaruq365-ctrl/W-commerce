import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { Sparkles, RefreshCw, Check, Palette, Type, Wand2, ChevronRight } from 'lucide-react';
import { WButton } from '../../design/components';
import { apiClient as axios } from '@/utils/apiClient';

const STYLES = [
  { id: 'minimal', label: 'Minimal', desc: 'Clean, whitespace, subtle', bg: 'from-gray-700 to-gray-900', accent: '#E5E5E5' },
  { id: 'bold', label: 'Bold', desc: 'High contrast, vivid colors', bg: 'from-red-700 to-orange-900', accent: '#FF4D00' },
  { id: 'luxury', label: 'Luxury', desc: 'Gold, dark, sophisticated', bg: 'from-yellow-800 to-stone-900', accent: '#D4AF37' },
  { id: 'playful', label: 'Playful', desc: 'Bright, rounded, fun', bg: 'from-pink-600 to-purple-700', accent: '#FF6AC1' },
  { id: 'corporate', label: 'Corporate', desc: 'Professional, trustworthy', bg: 'from-blue-700 to-indigo-900', accent: '#3B82F6' },
];

const DESIGNS = [
  {
    id: 1, name: 'Concept A — Signature Dark',
    bg: 'from-gray-900 via-slate-800 to-gray-900',
    accent: 'from-white to-gray-300',
    desc: 'Sleek dark aesthetic with sharp typography and minimal decoration.',
    palette: ['#0F0F13', '#FFFFFF', '#333333', '#D3D3D3'],
  },
  {
    id: 2, name: 'Concept B — Warm Gradient',
    bg: 'from-amber-900 via-orange-800 to-rose-900',
    accent: 'from-amber-200 to-orange-300',
    desc: 'Warm tones create an inviting, energetic shopping atmosphere.',
    palette: ['#7C2D12', '#FDE68A', '#F97316', '#FFF7ED'],
  },
  {
    id: 3, name: 'Concept C — Ocean Depth',
    bg: 'from-blue-950 via-cyan-900 to-teal-900',
    accent: 'from-cyan-200 to-teal-300',
    desc: 'Deep oceanic blues convey trust, calm, and premium quality.',
    palette: ['#0C1445', '#22D3EE', '#0F766E', '#E0F7FA'],
  },
];

export default function AIStoreDesigner() {
  const [step, setStep] = useState(1);
  const [brandDesc, setBrandDesc] = useState('');
  const [selectedStyle, setSelectedStyle] = useState(null);
  const [selectedDesign, setSelectedDesign] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [applied, setApplied] = useState(false);

  const generate = () => {
    if (!brandDesc.trim() || !selectedStyle) return;
    setGenerating(true);
    setTimeout(() => { setGenerating(false); setGenerated(true); setStep(3); }, 2200);
  };

  const apply = async () => {
    if (!selectedDesign) return;
    try {
      const design = DESIGNS.find(d => d.id === selectedDesign);
      await axios.post('/api/v1/stores/theme/preview', { themeConfig: design }, { withCredentials: true });
      await axios.post('/api/v1/stores/theme/apply', {}, { withCredentials: true });
      setApplied(true);
      toast.success('Theme applied to store!');
      setTimeout(() => setApplied(false), 3000);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to apply design');
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-900/40 to-pink-900/40 border border-purple-500/30 px-4 py-1.5 rounded-full mb-4">
            <Wand2 size={14} className="text-purple-400" />
            <span className="text-purple-300 text-sm font-medium">AI Store Designer</span>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-[var(--accent-gray)] bg-clip-text text-transparent mb-2">Design Your Dream Store</h1>
          <p className="text-[var(--text-muted)]">Describe your brand, pick a style, and let AI create stunning design concepts for you.</p>
        </div>

        {/* Steps Progress */}
        <div className="flex items-center justify-center gap-2 mb-10">
          {[1, 2, 3].map((s, i) => (
            <React.Fragment key={s}>
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${step === s ? 'bg-[var(--text-main)] text-[var(--bg-primary)]' : step > s ? 'bg-green-500/20 text-green-400' : 'bg-[var(--bg-tertiary)] text-[var(--text-faint)]'} text-sm font-medium`}>
                {step > s ? <Check size={13} /> : <span className="w-4 h-4 rounded-full border border-current flex items-center justify-center text-[10px]">{s}</span>}
                {s === 1 ? 'Describe Brand' : s === 2 ? 'Choose Style' : 'Design Concepts'}
              </div>
              {i < 2 && <div className={`h-px w-8 transition-all ${step > s ? 'bg-green-500' : 'bg-[var(--border-color)]'}`} />}
            </React.Fragment>
          ))}
        </div>

        {/* Step 1: Describe Brand */}
        <div className={`transition-all ${step === 1 || step === 2 || step === 3 ? 'block' : 'hidden'}`}>
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-full bg-[var(--text-main)] text-[var(--bg-primary)] flex items-center justify-center text-xs font-bold">1</div>
              <h2 className="text-[var(--text-main)] font-bold">Describe Your Brand</h2>
            </div>
            <textarea
              value={brandDesc}
              onChange={e => setBrandDesc(e.target.value)}
              rows={4}
              placeholder="e.g. I sell handmade artisan candles. My target audience is women aged 25-45 who love home decor and wellness. My brand is warm, cozy, and slightly luxurious — think autumn evenings and self-care rituals."
              className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-main)] placeholder-[var(--text-faint)] rounded-xl px-4 py-3 text-sm outline-none focus:border-[var(--border-hover)] transition-colors resize-none leading-relaxed"
            />
            <p className="text-[var(--text-faint)] text-xs mt-2">{brandDesc.length}/500 characters · More detail = better designs</p>
            {step === 1 && <WButton variant="primary" className="mt-4" icon={<ChevronRight size={15} />} onClick={() => setStep(2)} disabled={brandDesc.trim().length < 10}>Continue</WButton>}
          </div>

          {/* Step 2: Choose Style */}
          {step >= 2 && (
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 mb-6">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-7 h-7 rounded-full bg-[var(--text-main)] text-[var(--bg-primary)] flex items-center justify-center text-xs font-bold">2</div>
                <h2 className="text-[var(--text-main)] font-bold">Choose Your Style Direction</h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {STYLES.map(style => (
                  <button
                    key={style.id}
                    onClick={() => setSelectedStyle(style.id)}
                    className={`relative p-1 rounded-xl border-2 transition-all ${selectedStyle === style.id ? 'border-white shadow-[0_0_15px_rgba(255,255,255,0.2)]' : 'border-transparent hover:border-[var(--border-hover)]'}`}
                  >
                    <div className={`h-20 rounded-lg bg-gradient-to-br ${style.bg} flex items-center justify-center`}>
                      {selectedStyle === style.id && <Check size={20} className="text-white" />}
                    </div>
                    <p className="text-[var(--text-main)] text-xs font-semibold mt-2">{style.label}</p>
                    <p className="text-[var(--text-faint)] text-[10px]">{style.desc}</p>
                  </button>
                ))}
              </div>
              <WButton variant="primary" className="mt-5" icon={generating ? <RefreshCw size={15} className="animate-spin" /> : <Sparkles size={15} />} onClick={generate} disabled={!selectedStyle || !brandDesc.trim() || generating} loading={generating}>
                {generating ? 'AI is designing...' : 'Generate Design Concepts'}
              </WButton>
            </div>
          )}

          {/* Step 3: Design Concepts */}
          {step >= 3 && generated && (
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-[var(--text-main)] text-[var(--bg-primary)] flex items-center justify-center text-xs font-bold">3</div>
                  <h2 className="text-[var(--text-main)] font-bold">Choose Your Design Concept</h2>
                </div>
                <button onClick={() => { setGenerated(false); setGenerating(true); setTimeout(() => { setGenerating(false); setGenerated(true); }, 1800); }}
                  className="flex items-center gap-1.5 text-[var(--text-muted)] hover:text-[var(--text-main)] text-xs transition-colors">
                  <RefreshCw size={13} /> Generate Again
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
                {DESIGNS.map(design => (
                  <button key={design.id} onClick={() => setSelectedDesign(design.id)}
                    className={`relative rounded-2xl overflow-hidden border-2 transition-all text-left ${selectedDesign === design.id ? 'border-white shadow-[0_0_20px_rgba(255,255,255,0.15)]' : 'border-transparent hover:border-[var(--border-hover)]'}`}>
                    <div className={`h-40 bg-gradient-to-br ${design.bg} relative flex flex-col items-center justify-center gap-2 p-4`}>
                      {selectedDesign === design.id && (
                        <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white flex items-center justify-center">
                          <Check size={13} className="text-[var(--bg-primary)]" />
                        </div>
                      )}
                      <div className={`h-2 w-24 rounded-full bg-gradient-to-r ${design.accent}`} />
                      <div className="h-1 w-16 rounded-full bg-white/20" />
                      <div className="h-1 w-20 rounded-full bg-white/20" />
                      <div className="flex gap-1 mt-2">
                        {design.palette.map(c => <div key={c} className="w-5 h-5 rounded-full border border-white/20" style={{ background: c }} />)}
                      </div>
                    </div>
                    <div className="bg-[var(--bg-tertiary)] p-3">
                      <p className="text-[var(--text-main)] font-semibold text-xs">{design.name}</p>
                      <p className="text-[var(--text-faint)] text-[11px] mt-0.5 leading-relaxed">{design.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
              {applied ? (
                <div className="flex items-center gap-2 bg-green-500/20 border border-green-500/30 rounded-xl p-4 text-green-400 text-sm font-medium">
                  <Check size={16} /> Design applied to your store successfully!
                </div>
              ) : (
                <WButton variant="primary" icon={<Palette size={15} />} onClick={apply} disabled={!selectedDesign}>
                  Apply Design to My Store
                </WButton>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
