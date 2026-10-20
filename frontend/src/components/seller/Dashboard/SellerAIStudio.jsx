import React, { useState, useEffect } from 'react';
import { apiClient as axios } from '@/utils/apiClient';
import { Bot, Users, Search, Send, X, Loader2, Sparkles, Target, Zap } from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import toast from 'react-hot-toast';
import { AISearchingState } from '../../states/AIStates';
import SellerNegotiationControlRoom from './SellerNegotiationControlRoom';

const SellerAIStudio = ({ products = [] }) => {
  const { user } = useAuthStore();
  const [onlineBuyers, setOnlineBuyers] = useState([]);
  const [productSeekers, setProductSeekers] = useState([]);
  const [loadingBuyers, setLoadingBuyers] = useState(true);
  const [loadingSeekers, setLoadingSeekers] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBuyer, setSelectedBuyer] = useState(null);
  const [messageContent, setMessageContent] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchOnlineBuyers();
  }, []);

  const fetchOnlineBuyers = async () => {
    try {
      setLoadingBuyers(true);
      const res = await axios.get('/api/v1/ai/ultra-online-buyers', {
        withCredentials: true
      });
      if (res.data.success) {
        setOnlineBuyers(res.data.buyers);
      }
    } catch (error) {
      console.error('Failed to fetch online buyers:', error);
    } finally {
      setLoadingBuyers(false);
    }
  };

  const handleSearchSeekers = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    try {
      setLoadingSeekers(true);
      const res = await axios.post('/api/v1/ai/ultra-product-seekers', 
        { query: searchQuery },
        { withCredentials: true }
      );
      if (res.data.success) {
        setProductSeekers(res.data.seekers);
      }
    } catch (error) {
      console.error('Failed to find product seekers:', error);
      toast.error('Failed to analyze product seekers. Please try again.');
    } finally {
      setLoadingSeekers(false);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedBuyer || !messageContent.trim()) return;
    
    try {
      setSending(true);
      const res = await axios.post('/api/v1/messages/send', {
        receiverId: selectedBuyer.id,
        content: messageContent,
        type: 'TEXT'
      }, {
        withCredentials: true
      });
      
      if (res.data.success) {
        toast.success('Message sent successfully!');
        setSelectedBuyer(null);
        setMessageContent('');
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Error sending message. The buyer might not be registered properly in the mock data.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-[fadeIn_0.5s_ease-in-out] px-2 sm:px-0 max-w-full relative">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 relative z-10 glass-premium p-6 md:p-8 rounded-3xl border border-white/20 dark:border-white/10 shadow-lg">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full text-purple-600 dark:text-purple-400 text-xs font-bold uppercase tracking-wider mb-3">
            <Bot size={14} /> Ultra AI Assistant
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-500 dark:from-purple-400 dark:to-blue-300 mb-2 tracking-tight">AI Command Center</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm md:text-base font-medium">Harness the power of AI to discover active buyers and drive sales.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative z-10">
        {/* Online Buyers Section */}
        <div className="glass-standard p-6 md:p-8 rounded-3xl border border-white/20 dark:border-white/10 shadow-md">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold flex items-center gap-2 text-gray-800 dark:text-white">
              <Users className="text-blue-500" /> Active Platform Buyers
            </h2>
            <div className="flex items-center gap-2 text-xs font-bold bg-green-100 text-green-700 px-3 py-1 rounded-full animate-pulse">
              <div className="w-2 h-2 rounded-full bg-green-500"></div> Live
            </div>
          </div>
          
          {loadingBuyers ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Loader2 className="animate-spin mb-2" size={32} />
              <p>Scanning platform activity...</p>
            </div>
          ) : onlineBuyers.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No active buyers found at the moment.
            </div>
          ) : (
            <div className="space-y-4">
              {onlineBuyers.map(buyer => (
                <div key={buyer.id} className="bg-white/50 dark:bg-black/30 border border-gray-100 dark:border-white/5 p-4 rounded-2xl flex items-center justify-between hover:shadow-md transition-shadow">
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white">{buyer.name}</h3>
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                      <Zap size={12} className="text-yellow-500" /> {buyer.currentActivity}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{buyer.location}</p>
                  </div>
                  <button 
                    onClick={() => setSelectedBuyer(buyer)}
                    className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl transition-colors"
                    title="Send Quick Message"
                  >
                    <Send size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AI Seeker Search Section */}
        <div className="glass-standard p-6 md:p-8 rounded-3xl border border-white/20 dark:border-white/10 shadow-md flex flex-col">
          <h2 className="text-xl font-bold flex items-center gap-2 text-gray-800 dark:text-white mb-2">
            <Target className="text-purple-500" /> Find Product Seekers
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Ask the AI who is searching for your specific products right now.</p>
          
          <form onSubmit={handleSearchSeekers} className="flex items-center gap-3 mb-6">
            <div className="relative flex-1 h-14">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input 
                type="text" 
                placeholder="e.g., Who is looking for wireless headphones?"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-full pl-12 pr-4 bg-white/50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-purple-500 outline-none transition-all dark:text-white placeholder:text-gray-500 text-base"
              />
            </div>
            <button 
              type="submit"
              disabled={loadingSeekers || !searchQuery.trim()}
              className="bg-purple-600 hover:bg-purple-700 text-white px-8 h-14 rounded-2xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-colors shrink-0 shadow-lg shadow-purple-500/25"
            >
              {loadingSeekers ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
              Ask AI
            </button>
          </form>

          <div className="flex-1 overflow-y-auto">
            {loadingSeekers ? (
              <AISearchingState />
            ) : productSeekers.length > 0 ? (
              <div className="space-y-4">
                <div className="text-sm font-medium text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-white/10 pb-2 mb-4">
                  AI Found {productSeekers.length} potential buyers matching your criteria
                </div>
                {productSeekers.map(seeker => (
                  <div key={seeker.id} className="bg-gradient-to-r from-purple-50/50 to-transparent dark:from-purple-900/20 border border-purple-100 dark:border-purple-500/20 p-4 rounded-2xl flex items-center justify-between hover:shadow-md transition-shadow">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-gray-900 dark:text-white">{seeker.name}</h3>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${seeker.intentMatch === 'High' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                          {seeker.intentMatch} Intent
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Searching: <span className="font-medium text-purple-600 dark:text-purple-400">"{seeker.searchTerms.join(', ')}"</span>
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">{seeker.location}</p>
                    </div>
                    <button 
                      onClick={() => setSelectedBuyer(seeker)}
                      className="p-2 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-xl transition-colors"
                      title="Send Quick Offer"
                    >
                      <Send size={18} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <Bot size={48} className="mb-4 opacity-50" />
                <p>Ask the AI to find interested buyers.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI Sales Representative & Deterministic Negotiation Control Room */}
      <div className="pt-4 border-t border-gray-200 dark:border-white/10">
        <SellerNegotiationControlRoom products={products} />
      </div>

      {/* Quick Message Modal */}
      {selectedBuyer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
              <div>
                <h3 className="font-bold text-lg dark:text-white">Quick Message</h3>
                <p className="text-sm text-gray-500">To: {selectedBuyer.name}</p>
              </div>
              <button 
                onClick={() => setSelectedBuyer(null)}
                className="p-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-full transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <p className="text-xs text-gray-500 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-800/30">
                This message will be delivered via in-app notification and email to maximize visibility.
              </p>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Message</label>
                <textarea 
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  placeholder={`Hi ${selectedBuyer.name.split(' ')[0]}, I saw you were looking for items like ours. We're offering a special 10% discount today...`}
                  className="w-full h-32 p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none resize-none dark:text-white"
                ></textarea>
              </div>
              
              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setSelectedBuyer(null)}
                  className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-bold transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSendMessage}
                  disabled={sending || !messageContent.trim()}
                  className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold flex justify-center items-center gap-2 transition-colors disabled:opacity-50"
                >
                  {sending ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                  Send Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SellerAIStudio;
