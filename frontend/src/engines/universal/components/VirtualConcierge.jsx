import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Sparkles, Loader2, ShoppingCart } from 'lucide-react';
import { usePreview } from '../commerce/PreviewContext';

export const VirtualConcierge = ({ store }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef(null);
  const { products, addToCart } = usePreview();

  // Tier awareness
  const tier = store?.tier || 'essential';
  const isAvailable = ['pro', 'studio', 'signature'].includes(tier);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        id: 'msg-1',
        role: 'assistant',
        content: `Hi there! I'm your ${tier === 'signature' ? 'Personal Stylist' : 'Shopping Assistant'}. What are you looking for today?`
      }]);
    }
  }, [isOpen, tier, messages.length]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  if (!isAvailable) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg = { id: Date.now().toString(), role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    // Simulate AI processing
    setTimeout(() => {
      // Find matching products (mock logic: just shuffle and pick 2-3)
      const shuffled = [...products].sort(() => 0.5 - Math.random()); // Intentional random shuffle for discovery UX
      const recommended = shuffled.slice(0, tier === 'pro' ? 2 : 3);

      const aiMsg = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `I found some excellent options for you based on our current inventory. Here are my top picks:`,
        products: recommended
      };
      setMessages(prev => [...prev, aiMsg]);
      setIsTyping(false);
    }, 1800);
  };

  return (
    <>
      {/* Floating Action Button */}
      <motion.button
        onClick={() => setIsOpen(true)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className="fixed bottom-6 right-24 z-[100] w-14 h-14 bg-black text-white rounded-full flex items-center justify-center shadow-2xl shadow-black/20"
      >
        <MessageSquare size={24} />
        {tier === 'signature' && <Sparkles size={12} className="absolute top-3 right-3 text-yellow-400" />}
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-6 w-[380px] h-[600px] max-h-[80vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden z-[150] border border-gray-100"
          >
            {/* Header */}
            <div className="bg-black text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center"><Sparkles size={16} /></div>
                <div>
                  <div className="font-bold text-sm">Virtual Concierge</div>
                  <div className="text-xs text-white/50 uppercase tracking-widest">{tier} Level</div>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="opacity-50 hover:opacity-100 p-2"><X size={20} /></button>
            </div>

            {/* Message Area */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-6 bg-gray-50/50">
              {messages.map(msg => (
                <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user' ? 'bg-black text-white rounded-tr-sm' : 'bg-white text-black border border-gray-100 shadow-sm rounded-tl-sm'
                  }`}>
                    {msg.content}
                  </div>
                  
                  {/* Recommended Products */}
                  {msg.products && (
                    <div className="mt-3 flex gap-3 overflow-x-auto w-full pb-2 snap-x px-1">
                      {msg.products.map(p => (
                        <div key={p.id} className="min-w-[160px] bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm snap-start shrink-0">
                          <img src={p.image} alt={p.name} className="w-full h-32 object-cover bg-gray-100" />
                          <div className="p-3">
                            <div className="text-xs font-bold truncate mb-1">{p.name}</div>
                            <div className="text-xs text-gray-500 mb-2">₦{p.price}</div>
                            <button onClick={() => addToCart(p)} className="w-full py-2 bg-gray-100 hover:bg-black hover:text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-colors">
                              <ShoppingCart size={12} /> Add
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {isTyping && (
                <div className="flex items-start">
                  <div className="bg-white border border-gray-100 p-4 rounded-2xl rounded-tl-sm shadow-sm flex gap-1 items-center">
                    <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0 }} className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                    <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                    <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                  </div>
                </div>
              )}
            </div>

            {/* Input Area */}
            <form onSubmit={handleSubmit} className="p-4 bg-white border-t border-gray-100">
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="Ask me anything..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-full pl-5 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                />
                <button type="submit" disabled={!input.trim() || isTyping} className="absolute right-2 p-2 bg-black text-white rounded-full disabled:opacity-50">
                  <Send size={14} />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
