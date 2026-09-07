import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Copy, CheckCircle, Users, Award, ArrowLeft } from 'lucide-react';

const Referrals = () => {
  const [data, setData] = useState({ referrals: [], stats: null });
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchReferrals = async () => {
      try {
        const res = await axios.get('/api/v1/user/referrals');
        if (res.data.success) {
          setData({ referrals: res.data.referrals, stats: res.data.stats });
        }
      } catch (err) {
        // console.error("Failed to fetch referrals", err);
      } finally {
        setLoading(false);
      }
    };
    fetchReferrals();
  }, []);

  const handleCopy = () => {
    if (data.stats?.referralCode) {
      navigator.clipboard.writeText(data.stats.referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-cyber-black overflow-hidden flex flex-col">
      <header className="border-b border-white/10 bg-white/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/buyer/dashboard" className="p-2 hover:bg-white/10 rounded-xl transition-colors text-gray-700 hover:text-black">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-xl font-bold text-black tracking-widest uppercase">Global<span className="text-neon-blue">X</span> Rewards</h1>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <div className="max-w-5xl mx-auto space-y-8">
            <h1 className="text-3xl font-bold text-black mb-2">Referrals & Rewards</h1>
            <p className="text-gray-700 mb-8">Invite friends and unlock premium portfolio grades.</p>

            {loading ? (
              <div className="flex justify-center p-12"><div className="animate-spin h-8 w-8 border-t-2 border-neon-blue rounded-full"></div></div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Code Card */}
                  <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group border border-neon-blue/20">
                    <div className="absolute inset-0 bg-gradient-to-br from-neon-blue/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <h3 className="text-gray-700 text-sm font-medium mb-1 relative z-10">Your Referral Code</h3>
                    <div className="flex items-center justify-between mt-4 relative z-10">
                      <span className="text-2xl font-bold text-neon-blue tracking-wider">{data.stats?.referralCode || 'N/A'}</span>
                      <button onClick={handleCopy} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors">
                        {copied ? <CheckCircle className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5 text-gray-400" />}
                      </button>
                    </div>
                  </div>

                  {/* Stats Cards */}
                  <div className="glass-panel p-6 rounded-2xl border border-white/5 flex items-center gap-4">
                    <div className="p-4 bg-neon-purple/20 rounded-xl text-neon-purple">
                      <Users className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="text-gray-700 text-sm font-medium">Total Signups</h3>
                      <p className="text-3xl font-bold text-black mt-1">{data.stats?.referralCount || 0}</p>
                    </div>
                  </div>

                  <div className="glass-panel p-6 rounded-2xl border border-white/5 flex items-center gap-4">
                    <div className="p-4 bg-yellow-500/20 rounded-xl text-yellow-500">
                      <Award className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="text-gray-700 text-sm font-medium">Referral Grade</h3>
                      <p className="text-3xl font-bold text-black mt-1">Grade {data.stats?.referralGrade || 0}</p>
                    </div>
                  </div>
                </div>

                <div className="glass-panel rounded-2xl overflow-hidden mt-8 border border-white/5">
                  <div className="p-6 border-b border-white/10">
                    <h2 className="text-xl font-bold text-black">Recent Referrals</h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-white/5 text-gray-700 text-sm">
                          <th className="px-6 py-4 font-medium">Referred User</th>
                          <th className="px-6 py-4 font-medium">Date Joined</th>
                          <th className="px-6 py-4 font-medium text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-gray-800">
                        {data.referrals.length === 0 ? (
                          <tr><td colSpan="3" className="px-6 py-8 text-center text-gray-500">No referrals yet. Share your code!</td></tr>
                        ) : (
                          data.referrals.map((ref) => (
                            <tr key={ref.id} className="hover:bg-white/5 transition-colors">
                              <td className="px-6 py-4 font-medium text-black">{ref.referred?.fullName || 'Anonymous User'}</td>
                              <td className="px-6 py-4">{new Date(ref.createdAt).toLocaleDateString()}</td>
                              <td className="px-6 py-4 text-right">
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${ref.status === 'COMPLETED' ? 'bg-gray-500/20 text-gray-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                  {ref.status}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
      </main>
    </div>
  );
};

export default Referrals;
