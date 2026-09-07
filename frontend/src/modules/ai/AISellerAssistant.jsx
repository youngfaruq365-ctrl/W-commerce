import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { DollarSign, TrendingUp, Search, Megaphone, Sparkles, X, Loader2, ChevronRight, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { WButton, WModal } from '../../design/components';
import axios from 'axios';

const TOOLS = [
  {
    id: 'price',
    icon: DollarSign,
    color: 'from-green-600 to-emerald-700',
    glow: 'rgba(16,185,129,0.2)',
    title: 'Price Optimizer',
    description: 'Get AI-powered optimal pricing based on competition, demand signals, and your costs.',
    fields: [
      { id: 'productName', label: 'Product Name', placeholder: 'e.g. Wireless Bluetooth Speaker' },
      { id: 'category', label: 'Category', placeholder: 'e.g. Electronics' },
      { id: 'cost', label: 'Your Cost ($)', placeholder: 'e.g. 24.50', type: 'number' },
      { id: 'currentPrice', label: 'Current Price ($)', placeholder: 'e.g. 59.99', type: 'number' },
    ],
  },
  {
    id: 'demand',
    icon: TrendingUp,
    color: 'from-blue-600 to-indigo-700',
    glow: 'rgba(99,102,241,0.2)',
    title: 'Demand Forecaster',
    description: 'Predict future demand for your products using market trends and seasonal data.',
    fields: [
      { id: 'category', label: 'Product Category', placeholder: 'e.g. Winter Clothing' },
      { id: 'region', label: 'Target Region', placeholder: 'e.g. United States' },
      { id: 'timeframe', label: 'Forecast Period', placeholder: 'e.g. Next 30 days' },
    ],
  },
  {
    id: 'competition',
    icon: Search,
    color: 'from-orange-600 to-red-700',
    glow: 'rgba(249,115,22,0.2)',
    title: 'Competition Analyzer',
    description: 'Analyze your top competitors to find gaps, pricing opportunities, and positioning strategies.',
    fields: [
      { id: 'keyword', label: 'Product Keyword', placeholder: 'e.g. portable air purifier' },
      { id: 'priceRange', label: 'Price Range ($)', placeholder: 'e.g. 50-150' },
    ],
  },
  {
    id: 'marketing',
    icon: Megaphone,
    color: 'from-purple-600 to-pink-700',
    glow: 'rgba(168,85,247,0.2)',
    title: 'Marketing Advisor',
    description: 'Get AI-generated marketing copy, ad strategies, and campaign ideas for your products.',
    fields: [
      { id: 'product', label: 'Product Name', placeholder: 'e.g. Eco-Friendly Water Bottle' },
      { id: 'audience', label: 'Target Audience', placeholder: 'e.g. Outdoor enthusiasts aged 25-40' },
      { id: 'budget', label: 'Monthly Budget ($)', placeholder: 'e.g. 500', type: 'number' },
    ],
  },
];

const MOCK_OUTPUTS = {
  price: `**Optimal Price Recommendation: $64.99**\n\n📊 Market Analysis:\n• Average competitor price: $62.30\n• Your current margin at $59.99: 59.2%\n• Recommended price margin: 63.1%\n\n💡 Insights:\n• Raising to $64.99 is supported by market demand — 78% of buyers in this segment prefer prices $60-$70\n• Your product has 4.6★ avg which justifies premium over average\n• Consider promotional pricing at $54.99 during flash sales\n\n🔮 Projected Impact:\n• Expected revenue increase: +14%\n• Expected conversion rate: 3.2% (current: 3.8% — slight dip but higher margin)`,
  demand: `**Demand Forecast: High Growth Expected 📈**\n\n📅 30-Day Forecast:\n• Week 1: 145 units\n• Week 2: 162 units\n• Week 3: 178 units (peak)\n• Week 4: 155 units\n\n🌡️ Trend Signals:\n• Search volume up 34% YoY for this category\n• Seasonal uplift: +22% expected in coming weeks\n• Regional demand (US): Strong in Northeast & Pacific\n\n⚠️ Inventory Recommendation:\n• Stock at least 640 units to meet projected demand\n• Reorder point: 150 units\n• Lead time buffer: 7 days`,
  competition: `**Competition Analysis Report 🔍**\n\n🏆 Top Competitors Found: 6\n\n1. AirPure Pro — $89.99 — 4.7★ (12k reviews)\n2. CleanBreeze Ultra — $74.95 — 4.5★ (8.2k reviews)\n3. FreshAir Slim — $55.00 — 4.2★ (3.4k reviews)\n\n📌 Market Gaps Identified:\n• No budget option under $60 with 4.5+ rating\n• Weak presence in portable/travel segment\n• Feature gap: Most don't offer app connectivity\n\n✅ Positioning Opportunity:\n• Compete on portability + smart features at $65-$75\n• Highlight filter lifespan — competitor avg is 90 days, yours can be 180\n• Target "desk air purifier" keyword — low competition, high intent`,
  marketing: `**Marketing Strategy 🚀**\n\n🎯 Campaign Recommendations:\n\n**1. Instagram Reels (Budget: $150/mo)**\n"Show the before/after — murky water vs crystal clear"\nEstimated reach: 45,000 | CPC: ~$0.82\n\n**2. Google Shopping Ads (Budget: $250/mo)**\nKeywords: eco water bottle, reusable hiking bottle, BPA-free flask\nEstimated conversions: 28-35/mo\n\n**3. Influencer Micro Campaign (Budget: $100/mo)**\nTarget 3-5 outdoor/wellness micro-influencers (10k-50k followers)\nEstimated ROI: 340%\n\n📝 Ad Copy Draft:\n"Adventure awaits — your hydration shouldn't compromise the planet. Meet the bottle that does it all."\n\n🔑 Top Keywords to Target:\n#EcoBottle #HydrationGoals #SustainableLiving`,
};

function ToolModal({ tool, onClose }) {
  const [form, setForm] = useState({});
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    setOutput('');
    try {
      const res = await axios.post(`/api/v1/ai/tools/${tool.id}`, { context: form }, { withCredentials: true });
      if (res.data.success) {
        setOutput(res.data.reply);
      } else {
        const msg = res.data.message || 'Analysis failed';
        setOutput('Error: ' + msg);
        toast.error(msg);
      }
    } catch (err) {
      const errMsg = err?.response?.data?.message || err.message;
      setOutput('Error: ' + errMsg);
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const IconComp = tool.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-[var(--bg-secondary)] border border-[var(--glass-border)] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-[var(--shadow-lg)] animate-[fadeInUp_0.3s_ease_forwards]">
        <div className={`bg-gradient-to-r ${tool.color} p-5 rounded-t-2xl flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <IconComp size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg">{tool.title}</h2>
              <p className="text-white/70 text-xs">{tool.description}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all">
            <X size={15} className="text-white" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          {tool.fields.map(f => (
            <div key={f.id}>
              <label className="text-[var(--text-muted)] text-xs font-medium mb-1.5 block">{f.label}</label>
              <input
                type={f.type || 'text'}
                placeholder={f.placeholder}
                value={form[f.id] || ''}
                onChange={e => setForm(prev => ({ ...prev, [f.id]: e.target.value }))}
                className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-main)] placeholder-[var(--text-faint)] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[var(--border-hover)] transition-colors"
              />
            </div>
          ))}
          <WButton variant="primary" fullWidth icon={loading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />} onClick={run} loading={loading}>
            {loading ? 'AI is analyzing...' : `Run ${tool.title}`}
          </WButton>
          {output && (
            <div className="bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl p-4 mt-2">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={13} className="text-purple-400" />
                <span className="text-purple-400 text-xs font-medium">AI Output</span>
              </div>
              <div className="text-[var(--text-main)] text-sm leading-relaxed whitespace-pre-wrap">
                {output.split('\n').map((line, i) => (
                  <p key={i} className={`${line.startsWith('**') ? 'font-bold text-white' : ''} ${line === '' ? 'h-2' : ''}`}>
                    {line.replace(/\*\*/g, '')}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AISellerAssistant() {
  const [activeTool, setActiveTool] = useState(null);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] px-4 py-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-purple-900/30 border border-purple-500/30 px-4 py-1.5 rounded-full mb-4">
            <Sparkles size={14} className="text-purple-400" />
            <span className="text-purple-300 text-sm font-medium">AI Seller Tools</span>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-[var(--accent-gray)] bg-clip-text text-transparent mb-2">Your AI Business Partner</h1>
          <p className="text-[var(--text-muted)] max-w-xl mx-auto">Supercharge your store with AI-powered insights. Optimize pricing, forecast demand, outsmart competitors, and craft killer marketing campaigns.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          {[
            { label: 'Sellers using AI tools', value: '47,200+', trend: '+12%' },
            { label: 'Avg revenue increase', value: '28%', trend: '+3% this month' },
            { label: 'AI analyses run today', value: '8,940', trend: 'Real-time' },
          ].map(s => (
            <div key={s.label} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4 text-center">
              <p className="text-2xl font-bold text-white">{s.value}</p>
              <p className="text-[var(--text-faint)] text-xs mt-0.5">{s.label}</p>
              <p className="text-green-400 text-xs mt-1 flex items-center justify-center gap-1"><ArrowUpRight size={11} />{s.trend}</p>
            </div>
          ))}
        </div>

        {/* Tool Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {TOOLS.map(tool => {
            const Icon = tool.icon;
            return (
              <div key={tool.id} className="group bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 hover:border-[var(--border-hover)] transition-all duration-300 hover:shadow-[var(--shadow-md)] cursor-pointer" onClick={() => setActiveTool(tool)}>
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${tool.color} flex items-center justify-center shadow-[0_0_20px_${tool.glow}] shrink-0`}>
                    <Icon size={22} className="text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-[var(--text-main)] font-bold text-lg group-hover:text-white transition-colors">{tool.title}</h3>
                    <p className="text-[var(--text-muted)] text-sm mt-1 leading-relaxed">{tool.description}</p>
                  </div>
                </div>
                <div className="mt-5 flex items-center justify-between">
                  <div className="flex gap-2">
                    <span className="text-xs bg-[var(--accent-gray-dim)] text-[var(--text-muted)] px-2.5 py-1 rounded-full">AI-Powered</span>
                    <span className="text-xs bg-[var(--accent-gray-dim)] text-[var(--text-muted)] px-2.5 py-1 rounded-full">Instant Results</span>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); setActiveTool(tool); }} className="flex items-center gap-1 text-sm text-[var(--text-muted)] group-hover:text-white transition-colors font-medium">
                    Use Tool <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Tip */}
        <div className="mt-8 bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-500/20 rounded-2xl p-5 flex items-start gap-3">
          <Sparkles size={18} className="text-purple-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-white font-semibold text-sm">Pro Tip: Combine Tools for Maximum Impact</p>
            <p className="text-[var(--text-muted)] text-xs mt-1">Use the Competition Analyzer first to understand the market, then run the Price Optimizer to set the ideal price, and finally use the Marketing Advisor to attract your ideal customers.</p>
          </div>
        </div>
      </div>

      {activeTool && <ToolModal tool={activeTool} onClose={() => setActiveTool(null)} />}

      <style>{`
        @keyframes fadeInUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
      `}</style>
    </div>
  );
}
