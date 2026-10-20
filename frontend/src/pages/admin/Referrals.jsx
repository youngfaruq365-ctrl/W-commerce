import React, { useState, useEffect } from 'react';
import { apiClient as axios } from '../../utils/apiClient';
import { Users, DollarSign, Activity, CheckCircle, Clock } from 'lucide-react';

const Referrals = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReferrals = async () => {
      try {
        const res = await axios.get('/api/v1/admin/referrals');
        setData(res.data);
      } catch (err) {
        // console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchReferrals();
  }, []);

  if (loading || !data) {
    return <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[var(--text-main)] mb-2">Referrals Program</h1>
          <p className="text-[var(--text-muted)]">Manage and monitor platform referral activity.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {[
            { label: 'Total Referrals', value: data.stats.totalReferrals, icon: Users, color: 'text-blue-500', bg: 'bg-blue-100' },
            { label: 'Successful', value: data.stats.successfulReferrals, icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-100' },
            { label: 'Pending', value: data.stats.pendingReferrals, icon: Clock, color: 'text-orange-500', bg: 'bg-orange-100' },
            { label: 'Rewards Paid', value: `$${data.stats.totalRewardsPaid}`, icon: DollarSign, color: 'text-purple-500', bg: 'bg-purple-100' }
          ].map((stat, i) => (
            <div key={i} className="bg-[var(--bg-secondary)] rounded-xl shadow-sm border border-[var(--border-color)] p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-full ${stat.bg}`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
              <div className="text-2xl font-bold text-[var(--text-main)]">{stat.value}</div>
              <div className="text-sm text-[var(--text-muted)] mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="bg-[var(--bg-secondary)] rounded-xl shadow-sm border border-[var(--border-color)] overflow-hidden">
          <div className="p-6 border-b border-[var(--border-color)]">
            <h2 className="text-xl font-bold text-[var(--text-main)]">Recent Referrals</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[var(--bg-primary)] border-b border-[var(--border-color)]">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Referrer</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Referred User</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Reward</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {data.referrals.map((ref) => (
                  <tr key={ref.id} className="hover:bg-[var(--bg-primary)] transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-main)]">
                      {new Date(ref.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-main)] font-medium">
                      {ref.referrer}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-muted)]">
                      {ref.referred}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-main)]">
                      ₦{ref.reward}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        ref.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                      }`}>
                        {ref.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Referrals;
