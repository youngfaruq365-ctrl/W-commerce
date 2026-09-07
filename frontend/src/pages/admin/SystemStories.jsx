import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BookOpen, Layers, Zap, Star } from 'lucide-react';

const SystemStoriesPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStories = async () => {
      try {
        const res = await axios.get('/api/v1/admin/system-stories');
        setData(res.data);
      } catch (err) {
        // console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStories();
  }, []);

  if (loading || !data) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center">
            <BookOpen size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black">System Stories</h1>
            <p className="text-sm text-gray-500">Live component and engine documentation</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <Layers size={24} className="mb-4 text-black" />
            <div className="font-black text-lg">{data.stats.storeExperiences} Store Experiences</div>
            <div className="text-sm text-gray-500 mt-1">{data.engineRegistry.length} Engines × Store Count</div>
          </div>
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <Zap size={24} className="mb-4 text-black" />
            <div className="font-black text-lg">{data.stats.styleProfiles} Style Profiles</div>
            <div className="text-sm text-gray-500 mt-1">Deterministically assigned</div>
          </div>
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <Star size={24} className="mb-4 text-black" />
            <div className="font-black text-lg">{data.stats.priceTiers} Price Tiers</div>
            <div className="text-sm text-gray-500 mt-1">Based on active plans</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-black text-xl mb-4">Engine Registry</h2>
          {data.engineRegistry.map((engine) => (
            <div key={engine.name} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
              <span className="font-bold capitalize">{engine.name}</span>
              <span className="text-sm text-gray-400 bg-gray-50 px-3 py-1 rounded-full">{engine.count} Experiences</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SystemStoriesPage;
