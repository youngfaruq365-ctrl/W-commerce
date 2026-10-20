import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, X, Send, Sparkles, ChevronDown } from 'lucide-react';
import { apiClient as axios } from '@/utils/apiClient';
import { WReasoningAnimation } from '../motion/WReasoningAnimation';

const AIAssistantWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { id: 1, role: 'ai', content: "Hello! I'm your GlobalX AI Assistant. How can I help you today?" }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!input.trim() || isTyping) return;

    const userText = input.trim();
    const userMessage = { id: Date.now(), role: 'user', content: userText };
    const aiMessageId = Date.now() + 1;
    const historyPayload = [...messages, userMessage].slice(-10).map(m => ({
      role: m.role === 'ai' ? 'assistant' : 'user',
      content: m.content
    }));

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      const response = await fetch('/api/v1/ai-chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message: userText, messages: historyPayload })
      });

      if (!response.ok || !response.body) {
        throw new Error('Stream unavailable');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let accumulated = '';
      let buffer = '';
      let addedPlaceholder = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const jsonStr = trimmed.slice(5).trim();
          if (!jsonStr) continue;
          try {
            const parsed = JSON.parse(jsonStr);
            if (parsed.delta) {
              accumulated += parsed.delta;
              if (!addedPlaceholder) {
                addedPlaceholder = true;
                setIsTyping(false);
                setMessages(prev => [...prev, { id: aiMessageId, role: 'ai', content: accumulated }]);
              } else {
                setMessages(prev =>
                  prev.map(m => (m.id === aiMessageId ? { ...m, content: accumulated } : m))
                );
              }
            } else if (parsed.done && parsed.reply && !accumulated) {
              accumulated = parsed.reply;
              setMessages(prev => [...prev, { id: aiMessageId, role: 'ai', content: accumulated }]);
            }
          } catch (_) {
            // Ignore partial chunk parse error
          }
        }
      }

      if (!accumulated) {
        const fallbackRes = await axios.post('/api/v1/ai-chat', { message: userText, messages: historyPayload });
        setMessages(prev => [...prev, { id: aiMessageId, role: 'ai', content: fallbackRes.data.reply, image: fallbackRes.data.image }]);
      }
    } catch (error) {
      try {
        const fallbackRes = await axios.post('/api/v1/ai-chat', { message: userText, messages: historyPayload });
        setMessages(prev => [...prev, { id: aiMessageId, role: 'ai', content: fallbackRes.data.reply, image: fallbackRes.data.image }]);
      } catch (_) {
        setMessages(prev => [...prev, { id: aiMessageId, role: 'ai', content: "Sorry, I'm currently having trouble connecting to the network." }]);
      }
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      <div className="fixed bottom-24 right-6 z-50 flex flex-col items-end">
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="mb-4 w-[350px] sm:w-[400px] h-[500px] max-h-[70vh] premium-glass rounded-2xl border border-[var(--border-color)] shadow-2xl flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="p-4 border-b border-[var(--border-color)] bg-[var(--bg-primary)]/80 backdrop-blur flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[var(--accent-gray)]/20 flex items-center justify-center text-[var(--accent-gray)]">
                    <Bot size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg leading-tight text-[var(--text-main)]">AI Assistant</h3>
                    <p className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                      Online
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-[var(--border-color)] rounded-full transition-colors"
                >
                  <ChevronDown size={20} className="text-[var(--text-muted)]" />
                </button>
              </div>

              {/* Chat Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                      msg.role === 'user' 
                        ? 'bg-[var(--accent-gray)] text-black rounded-tr-sm' 
                        : 'bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-main)] rounded-tl-sm'
                    }`}>
                      {msg.role === 'ai' ? (
                        <>
                          {msg.image && <img src={msg.image} alt="Product" className="w-full h-32 object-cover rounded-lg shadow-sm border border-[var(--border-color)] mb-3" />}
                          <div dangerouslySetInnerHTML={{ __html: msg.content.replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<b>$1</b>').replace(/\- /g, '• ') }} />
                        </>
                      ) : (
                        msg.content
                      )}
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="max-w-[85%] rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-main)] rounded-tl-sm overflow-hidden scale-75 origin-left">
                       <WReasoningAnimation message="Thinking..." />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-4 border-t border-[var(--border-color)] bg-[var(--bg-primary)]/80 backdrop-blur">
                <form onSubmit={handleSend} className="relative flex items-center">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask me anything..."
                    className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-full py-3 pl-4 pr-12 text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--accent-gray)] transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || isTyping}
                    className="absolute right-2 p-2 bg-[var(--accent-gray)] text-black rounded-full hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100"
                  >
                    <Send size={16} />
                  </button>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(!isOpen)}
          className={`w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-colors ${
            isOpen ? 'bg-[var(--bg-secondary)] text-[var(--text-main)] border border-[var(--border-color)]' : 'bg-[var(--accent-gray)] text-black'
          }`}
        >
          {isOpen ? <X size={24} /> : <Sparkles size={24} />}
        </motion.button>
      </div>
    </>
  );
};

export default AIAssistantWidget;
