import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { WIcon } from '../../components/visual/WIcon';
import { apiClient } from '../../utils/apiClient';

const SessionManagement = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const resp = await apiClient.get('/api/v1/auth/sessions');
      setSessions(resp.data.sessions || []);
    } catch(err) {
      toast.error('Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  const revokeSession = async (id) => {
    try {
      await apiClient.delete(`/api/v1/auth/sessions/${id}`);
      toast.success('Session revoked successfully');
      setSessions(prev => prev.filter(s => s.id !== id));
    } catch(err) {
      toast.error('Failed to revoke session');
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] p-4 sm:p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm border border-gray-100 p-6 sm:p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <WIcon name="shield" className="w-6 h-6 text-[#4A5568]" />
          Active Sessions
        </h1>
        <p className="text-gray-500 mb-8">Manage the devices that are currently logged into your account.</p>
        
        {sessions.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No active sessions found.</p>
        ) : (
          <div className="space-y-4">
            {sessions.map(session => (
              <div key={session.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-gray-100 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-white rounded-lg shadow-sm">
                    <WIcon name={session.userAgent?.includes('Mobile') ? 'smartphone' : 'monitor'} className="w-6 h-6 text-[#4A5568]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      {session.userAgent ? session.userAgent.split(' ')[0] : 'Unknown Device'}
                      {session.isCurrent && (
                        <span className="text-xs font-bold bg-green-100 text-green-700 px-2 py-1 rounded-full">Current Session</span>
                      )}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">IP: {session.ipAddress || 'Unknown'}</p>
                    <p className="text-xs text-gray-400 mt-1">Signed in: {new Date(session.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                {!session.isCurrent && (
                  <button 
                    onClick={() => revokeSession(session.id)}
                    className="mt-4 sm:mt-0 px-4 py-2 text-sm font-bold text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    Revoke Access
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SessionManagement;
