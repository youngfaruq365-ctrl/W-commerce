import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { Sparkles, Copy, Check, RefreshCw, Plus, X, FileText } from 'lucide-react';
import { WButton } from '../../design/components';
import axios from 'axios';

const TONES = ['Professional', 'Friendly', 'Luxury', 'Playful'];
const CATEGORIES = ['Electronics', 'Fashion', 'Home & Kitchen', 'Beauty', 'Sports', 'Books', 'Toys', 'Automotive'];

const MOCK_DESCRIPTIONS = {
  Professional: (name, features) => `Introducing the ${name} — engineered for those who demand excellence.\n\n${features.slice(0, 3).join(', and ')} combine to deliver a product experience that sets a new standard in its category. Designed with precision and backed by rigorous quality control, this product is the smart choice for discerning customers.\n\n✓ Trusted by thousands of verified buyers\n✓ Premium materials built to last\n✓ Industry-leading performance metrics\n\nInvest in quality. Invest in the ${name}.`,
  Friendly: (name, features) => `Hey there! 👋 Meet the ${name} — you're going to love it!\n\nHere's what makes it awesome: ${features.slice(0, 3).join(', ')}! We designed this with real people in mind, so it's super easy to use and fits perfectly into your everyday life.\n\nWhether you're a first-timer or a pro, the ${name} has got your back. Thousands of happy customers can't be wrong!\n\n🌟 So go ahead — treat yourself. You deserve it!`,
  Luxury: (name, features) => `The ${name}. For those who settle for nothing less than extraordinary.\n\nCrafted with the finest attention to detail, this exquisite piece embodies ${features.slice(0, 2).join(' and ')} — hallmarks of true luxury. Every element has been meticulously curated to deliver an experience that transcends the ordinary.\n\nThis is not merely a purchase. It is an acquisition. A statement. A reflection of your refined taste and uncompromising standards.\n\nWelcome to the pinnacle of excellence.`,
  Playful: (name, features) => `🚀 Whooooa — the ${name} just landed, and it's AMAZING!\n\nOkay okay, let us tell you why you NEED this in your life right now:\n⚡ ${features.slice(0, 3).join('\n⚡ ')}\n\nSeriously though, this thing is SO MUCH FUN to use! Whether you're at home, on the go, or literally anywhere — the ${name} brings the good vibes.\n\nDon't sleep on this one. Your future self will thank you. 🙌\n\n#LevelUp #GameChanger #YouWantThis`,
};

export default function AIProductDescription() {
  const [productName, setProductName] = useState('');
  const [category, setCategory] = useState('');
  const [features, setFeatures] = useState(['', '', '']);
  const [tone, setTone] = useState('Professional');
  const [output, setOutput] = useState('');
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editableOutput, setEditableOutput] = useState('');

  const addFeature = () => setFeatures(prev => [...prev, '']);
  const removeFeature = (i) => setFeatures(prev => prev.filter((_, idx) => idx !== i));
  const updateFeature = (i, v) => setFeatures(prev => prev.map((f, idx) => idx === i ? v : f));

  const generate = async () => {
    if (!productName.trim()) return;
    setGenerating(true);
    setOutput('');
    setEditing(false);
    try {
      const res = await axios.post('/api/v1/ai/product-description', { productName, category, features: features.filter(f => f.trim()), tone, length: 'Medium', language: 'English' }, { withCredentials: true });
      if (res.data.success) {
         const d = res.data.data;
         const text = `${d.title || productName}\n\n${d.description || ''}\n\nHighlights:\n${(d.highlights || []).map(h => '• ' + h).join('\n')}\n\nSEO Tags: ${(d.tags || []).join(', ')}`;
         setOutput(text);
         setEditableOutput(text);
      } else {
         const msg = res.data.message || 'Generation failed.';
         setOutput(msg);
         setEditableOutput(msg);
         toast.error(msg);
      }
    } catch (err) {
      const errMsg = err?.response?.data?.message || err.message;
      setOutput('Error: ' + errMsg);
      setEditableOutput('Error: ' + errMsg);
      toast.error(errMsg);
    } finally {
      setGenerating(false);
    }
  };

  const copy = () => {
    navigator.clipboard.writeText(editing ? editableOutput : output);
    setCopied(true);
    toast.success('Description copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const wordCount = (editing ? editableOutput : output).split(/\s+/).filter(Boolean).length;
  const charCount = (editing ? editableOutput : output).length;

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-green-900/40 to-teal-900/40 border border-green-500/30 px-4 py-1.5 rounded-full mb-4">
            <FileText size={14} className="text-green-400" />
            <span className="text-green-300 text-sm font-medium">AI Description Writer</span>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-[var(--accent-gray)] bg-clip-text text-transparent mb-2">Perfect Product Descriptions</h1>
          <p className="text-[var(--text-muted)]">Generate SEO-optimized, conversion-focused product descriptions in seconds.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Panel */}
          <div className="space-y-4">
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5">
              <h2 className="text-[var(--text-main)] font-bold mb-4">Product Details</h2>
              <div className="space-y-3">
                <div>
                  <label className="text-[var(--text-muted)] text-xs font-medium mb-1.5 block">Product Name *</label>
                  <input value={productName} onChange={e => setProductName(e.target.value)} placeholder="e.g. ErgoDesk Pro Standing Desk" className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-main)] placeholder-[var(--text-faint)] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[var(--border-hover)] transition-colors" />
                </div>
                <div>
                  <label className="text-[var(--text-muted)] text-xs font-medium mb-1.5 block">Category</label>
                  <select value={category} onChange={e => setCategory(e.target.value)} className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-main)] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[var(--border-hover)] transition-colors">
                    <option value="">Select category...</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[var(--text-muted)] text-xs font-medium">Key Features</label>
                    <button onClick={addFeature} className="flex items-center gap-1 text-[var(--text-faint)] hover:text-[var(--text-main)] text-xs transition-colors">
                      <Plus size={11} /> Add
                    </button>
                  </div>
                  <div className="space-y-2">
                    {features.map((f, i) => (
                      <div key={i} className="flex gap-2">
                        <input value={f} onChange={e => updateFeature(i, e.target.value)} placeholder={`Feature ${i + 1}...`} className="flex-1 bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-main)] placeholder-[var(--text-faint)] rounded-xl px-3 py-2 text-sm outline-none focus:border-[var(--border-hover)] transition-colors" />
                        {features.length > 1 && <button onClick={() => removeFeature(i)} className="text-[var(--text-faint)] hover:text-red-400 transition-colors"><X size={14} /></button>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Tone */}
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5">
              <h2 className="text-[var(--text-main)] font-bold mb-3">Writing Tone</h2>
              <div className="grid grid-cols-2 gap-2">
                {TONES.map(t => (
                  <button key={t} onClick={() => setTone(t)} className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${tone === t ? 'bg-[var(--text-main)] text-[var(--bg-primary)]' : 'bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-muted)] hover:border-[var(--border-hover)] hover:text-[var(--text-main)]'}`}>
                    {t === 'Professional' && '🎩 '}{t === 'Friendly' && '😊 '}{t === 'Luxury' && '💎 '}{t === 'Playful' && '🚀 '}{t}
                  </button>
                ))}
              </div>
            </div>

            <WButton variant="primary" fullWidth icon={generating ? <RefreshCw size={15} className="animate-spin" /> : <Sparkles size={15} />} onClick={generate} disabled={!productName.trim() || generating} loading={generating}>
              {generating ? 'Generating Description...' : 'Generate Description'}
            </WButton>
          </div>

          {/* Output Panel */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl overflow-hidden flex flex-col" style={{ minHeight: 400 }}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border-color)]">
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-green-400" />
                <span className="text-[var(--text-main)] font-semibold text-sm">Generated Description</span>
              </div>
              {output && (
                <div className="flex items-center gap-2">
                  <span className="text-[var(--text-faint)] text-xs">{wordCount} words · {charCount} chars</span>
                  <button onClick={() => { setEditing(!editing); setEditableOutput(output); }} className={`text-xs px-2.5 py-1 rounded-full transition-all ${editing ? 'bg-[var(--text-main)] text-[var(--bg-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-main)] border border-[var(--border-color)] hover:border-[var(--border-hover)]'}`}>
                    {editing ? 'Editing' : 'Edit'}
                  </button>
                  <button onClick={copy} className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full transition-all ${copied ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'text-[var(--text-muted)] hover:text-[var(--text-main)] border border-[var(--border-color)] hover:border-[var(--border-hover)]'}`}>
                    {copied ? <><Check size={11} /> Copied!</> : <><Copy size={11} /> Copy</>}
                  </button>
                </div>
              )}
            </div>
            <div className="flex-1 p-5">
              {generating ? (
                <div className="flex flex-col items-center justify-center h-full gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-600 to-teal-600 flex items-center justify-center animate-pulse">
                    <Sparkles size={22} className="text-white" />
                  </div>
                  <p className="text-[var(--text-muted)] text-sm">AI is crafting your description...</p>
                </div>
              ) : output ? (
                editing ? (
                  <textarea
                    value={editableOutput}
                    onChange={e => setEditableOutput(e.target.value)}
                    className="w-full h-full bg-transparent text-[var(--text-main)] text-sm leading-relaxed outline-none resize-none"
                  />
                ) : (
                  <div className="text-[var(--text-main)] text-sm leading-relaxed whitespace-pre-wrap">{output}</div>
                )
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-[var(--text-faint)]">
                  <FileText size={36} className="mb-3 opacity-30" />
                  <p className="text-sm text-center">Your AI-generated description will appear here.<br />Fill in the details and click Generate.</p>
                </div>
              )}
            </div>
            {output && (
              <div className="border-t border-[var(--border-color)] px-5 py-3 flex gap-2">
                <WButton variant="ghost" size="sm" icon={<RefreshCw size={13} />} onClick={generate}>Regenerate</WButton>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
