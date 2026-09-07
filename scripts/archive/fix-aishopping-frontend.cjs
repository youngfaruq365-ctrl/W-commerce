const fs = require('fs');
const filePath = 'C:\\Users\\HomePC\\Downloads\\W-COMMERCE PROJECT\\src\\modules\\ai\\AIShoppingAssistant.jsx';

const content = `import React, { useState, useEffect, useRef } from 'react';
import { Send, Mic, Sparkles, Trash2, ShoppingCart, Star, Bot, User, X } from 'lucide-react';
import { WButton, WCard, WBadge } from '../../design/components';
import { apiClient } from '../../utils/apiClient';

const SUGGESTED_QUESTIONS = [
  'Find me gaming headphones under $80',
  "What's trending in fashion?",
  'Help me find a gift for my mom',
  'Best laptop for video editing?',
];

function ProductCardInline({ product }) {
  return (
    <div className="flex items-center gap-3 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl p-3 mt-2 hover:border-[var(--border-hover)] transition-all cursor-pointer group">
      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[var(--border-color)] to-[var(--bg-primary)] flex items-center justify-center shrink-0">
        <ShoppingCart size={18} className="text-[var(--text-muted)]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[var(--text-main)] text-sm font-medium truncate group-hover:text-white transition-colors">{product.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <Star size={11} className="text-yellow-400 fill-yellow-400" />
          <span className="text-[var(--text-faint)] text-xs">{product.rating} ({product.reviews?.toLocaleString()})</span>
          {product.tag && <span className="text-[10px] bg-[var(--accent-gray-dim)] text-[var(--accent-gray)] px-1.5 py-0.5 rounded-full">{product.tag}</span>}
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className="text-white font-bold text-sm">\${product.price}</p>
        <button className="text-[10px] text-[var(--text-muted)] hover:text-white transition-colors mt-0.5">Add to cart</button>
      </div>
    </div>
  );
}

function ChatMessage({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div className={\`flex gap-3 \${isUser ? 'flex-row-reverse' : 'flex-row'} animate-[fadeInUp_0.3s_ease_forwards]\`}>
      <div className={\`w-8 h-8 rounded-full flex items-center justify-center shrink-0 \${isUser ? 'bg-[var(--text-main)]' : 'bg-gradient-to-br from-purple-600 to-blue-600'}\`}>
        {isUser ? <User size={14} className="text-[var(--bg-primary)]" /> : <Bot size={14} className="text-white" />}
      </div>
      <div className={\`max-w-[75%] \${isUser ? 'items-end' : 'items-start'} flex flex-col\`}>
        <div className={\`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap \${isUser ? 'bg-[var(--text-main)] text-[var(--bg-primary)] rounded-tr-sm' : 'bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-main)] rounded-tl-sm'}\`}>
          {msg.content}
        </div>
        {msg.products && msg.products.length > 0 && (
          <div className="w-full mt-1 space-y-1">
            {msg.products.map(p => <ProductCardInline key={p.id} product={p} />)}
          </div>
        )}
        <span className="text-[var(--text-faint)] text-[10px] mt-1 px-1">{msg.time}</span>
      </div>
    </div>
  );
}

export default function AIShoppingAssistant() {
  const [messages, setMessages] = useState([
    { id: 1, role: 'assistant', content: "Hi! I'm your W-Commerce AI Shopping Assistant. I can help you discover products, compare prices, and find the best deals. What are you looking for today?", products: [], time: 'Just now' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const now = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const sendMessage = async (text) => {
    if (!text.trim()) return;
    const userMsg = { id: Date.now(), role: 'user', content: text.trim(), products: [], time: now() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);
    
    try {
      const payload = updatedMessages.map(m => ({ role: m.role, content: m.content }));
      const res = await apiClient.post('/api/v1/ai/chat', { messages: payload });
      
      const aiMsg = { 
        id: Date.now() + 1, 
        role: 'assistant', 
        content: res.data.reply || res.data.text || 'Sorry, I am unable to process that.', 
        products: res.data.products || [], 
        time: now() 
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      setMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', content: \`Error: \${error.message}\`, products: [], time: now() }]);
    } finally {
      setLoading(false);
    }
  };

  const clearConversation = () => setMessages([{ id: Date.now(), role: 'assistant', content: "Hi! I'm your W-Commerce AI Shopping Assistant. How can I help you today?", products: [], time: 'Just now' }]);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col text-[var(--text-main)]">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[var(--bg-primary)]/90 backdrop-blur-md border-b border-[var(--border-color)] px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.4)]">
              <Bot size={20} className="text-white" />
            </div>
            <div>
              <h1 className="font-bold text-base">AI Shopping Assistant</h1>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                <span className="text-[var(--text-muted)] text-xs">Online · Powered by Gemini AI</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 bg-gradient-to-r from-purple-900/40 to-blue-900/40 border border-purple-500/30 px-3 py-1.5 rounded-full">
              <Sparkles size={12} className="text-purple-400" />
              <span className="text-purple-300 text-xs font-medium">Powered by AI</span>
            </div>
            <button onClick={clearConversation} className="flex items-center gap-1.5 text-[var(--text-muted)] hover:text-white text-xs transition-colors px-2 py-1.5 rounded-lg hover:bg-[var(--bg-tertiary)]">
              <Trash2 size={13} />
              <span className="hidden sm:inline">Clear</span>
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto space-y-5">
          {messages.map(msg => <ChatMessage key={msg.id} msg={msg} />)}
          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center shrink-0">
                <Bot size={14} className="text-white" />
              </div>
              <div className="bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1">
                <span className="w-2 h-2 bg-[var(--text-muted)] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-[var(--text-muted)] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-[var(--text-muted)] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Suggested Questions */}
      {messages.length <= 2 && (
        <div className="px-4 pb-2">
          <div className="max-w-3xl mx-auto">
            <p className="text-[var(--text-faint)] text-xs mb-2 px-1">Suggested questions</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_QUESTIONS.map(q => (
                <button key={q} onClick={() => sendMessage(q)}
                  className="text-xs bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-white hover:border-[var(--border-hover)] px-3 py-2 rounded-full transition-all hover:bg-[var(--bg-card)]">
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="sticky bottom-0 bg-[var(--bg-primary)]/90 backdrop-blur-md border-t border-[var(--border-color)] px-4 py-4">
        <div className="max-w-3xl mx-auto">
          <form onSubmit={e => { e.preventDefault(); sendMessage(input); }} className="flex gap-2 items-end">
            <div className="flex-1 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-2xl flex items-center gap-2 px-4 py-3 focus-within:border-[var(--border-hover)] transition-all">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask me anything about products..."
                className="flex-1 bg-transparent text-[var(--text-main)] placeholder-[var(--text-faint)] text-sm outline-none"
              />
              <button type="button" onClick={() => setListening(!listening)}
                className={\`p-1.5 rounded-full transition-all \${listening ? 'text-red-400 bg-red-500/20' : 'text-[var(--text-muted)] hover:text-white'}\`}>
                <Mic size={16} />
              </button>
            </div>
            <button type="submit" disabled={!input.trim() || loading}
              className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(139,92,246,0.3)]">
              <Send size={16} className="text-white" />
            </button>
          </form>
        </div>
      </div>

      <style>{\`
        @keyframes fadeInUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
      \`}</style>
    </div>
  );
}
`;

fs.writeFileSync(filePath, content, 'utf8');
console.log("AIShoppingAssistant.jsx updated");
