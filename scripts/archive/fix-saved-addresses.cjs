const fs = require('fs');
const filePath = 'C:\\Users\\HomePC\\Downloads\\W-COMMERCE PROJECT\\src\\modules\\buyer\\SavedAddresses.jsx';

const content = `import React, { useState, useEffect } from 'react';
import { MapPin, Plus, Edit3, Trash2, Star, Check, Home, Briefcase, MoreHorizontal, Phone, User, AlertTriangle, RefreshCw } from 'lucide-react';
import { WButton, WModal, WSkeleton } from '../../design/components';
import { apiClient } from '../../utils/apiClient';
import { useAuthStore } from '../../store/authStore';

const labelIcons = { Home: Home, Work: Briefcase, Other: MoreHorizontal };
const labelColors = { Home: 'text-blue-400 bg-blue-400/10', Work: 'text-purple-400 bg-purple-400/10', Other: 'text-[var(--text-muted)] bg-[var(--bg-tertiary)]' };
const countryOptions = ['United States', 'United Kingdom', 'Canada', 'Australia', 'Germany', 'France'];

const emptyForm = { type: 'Home', street: '', city: '', state: '', postalCode: '', country: 'United States' };

export default function SavedAddresses() {
  const { user } = useAuthStore();
  const [addresses, setAddresses] = useState([]);
  const [status, setStatus] = useState('loading'); // idle, loading, success, error, retrying
  const [errorMsg, setErrorMsg] = useState('');
  
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchAddresses = async (isRetry = false) => {
    setStatus(isRetry ? 'retrying' : 'loading');
    try {
      const response = await apiClient.get('/api/v1/users/addresses');
      if (response.data.success) {
        setAddresses(response.data.addresses || []);
        setStatus('success');
      } else {
        setStatus('error');
        setErrorMsg(response.data.message || 'Failed to load addresses');
      }
    } catch (err) {
      setStatus('error');
      setErrorMsg(err.message || 'Failed to connect to server');
    }
  };

  useEffect(() => {
    fetchAddresses();
  }, []);

  const openAdd = () => { setForm(emptyForm); setEditing(null); setShowModal(true); };
  const openEdit = (addr) => { 
    setForm({ 
      type: addr.type || 'Home', 
      street: addr.street || '', 
      city: addr.city || '', 
      state: addr.state || '', 
      postalCode: addr.postalCode || '', 
      country: addr.country || 'United States' 
    }); 
    setEditing(addr.id); 
    setShowModal(true); 
  };

  const handleSave = async () => {
    setActionLoading(true);
    try {
      if (editing) {
        await apiClient.put(\`/api/v1/users/address/\${editing}\`, form);
      } else {
        await apiClient.post('/api/v1/users/address', form);
      }
      setShowModal(false);
      fetchAddresses(); // Refresh list
    } catch (err) {
      alert(err.message || 'Failed to save address');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id) => {
    setActionLoading(true);
    try {
      await apiClient.delete(\`/api/v1/users/address/\${id}\`);
      setDeleteId(null);
      fetchAddresses();
    } catch (err) {
      alert(err.message || 'Failed to delete address');
    } finally {
      setActionLoading(false);
    }
  };

  const setDefault = async (id) => {
    // Note: If you want to support isDefault, you need to add an endpoint or modify the update endpoint to handle it.
    // For now, we'll just mock this locally or ignore it if not implemented in backend.
    alert('Set default is not implemented in backend yet.');
  };

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  if (status === 'error' || status === 'retrying') {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-main)] flex items-center justify-center">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-16 h-16 bg-red-500/10 text-red-400 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle size={32} />
          </div>
          <h2 className="text-xl font-bold">Unable to load addresses</h2>
          <p className="text-[var(--text-muted)]">{errorMsg}</p>
          <WButton 
            variant="primary" 
            onClick={() => fetchAddresses(true)}
            icon={<RefreshCw size={16} className={status === 'retrying' ? 'animate-spin' : ''} />}
          >
            {status === 'retrying' ? 'Retrying...' : 'Retry'}
          </WButton>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-main)]">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Saved Addresses</h1>
            <p className="text-[var(--text-muted)] text-sm mt-1">{status === 'loading' ? '...' : addresses.length} addresses saved</p>
          </div>
          <WButton variant="primary" size="sm" icon={<Plus size={14} />} onClick={openAdd}>Add Address</WButton>
        </div>

        {/* Address Cards */}
        <div className="space-y-3">
          {status === 'loading' ? [1,2].map(i => <WSkeleton key={i} className="h-32 w-full rounded-2xl" />) :
           addresses.map(addr => {
            const labelStr = addr.type || 'Other';
            const LabelIcon = labelIcons[labelStr] || MoreHorizontal;
            return (
              <div key={addr.id}
                className={\`bg-[var(--bg-card)] border rounded-2xl p-5 transition-all duration-200 \${addr.isDefault ? 'border-[var(--text-main)]/30 shadow-[0_0_0_1px_var(--text-main)]/10' : 'border-[var(--border-color)] hover:border-[var(--border-hover)]'}\`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    {/* Label Badge */}
                    <div className={\`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 \${labelColors[labelStr] || labelColors.Other}\`}>
                      <LabelIcon size={17} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold">{labelStr}</span>
                        {addr.isDefault && (
                          <span className="text-xs bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 px-2 py-0.5 rounded-full flex items-center gap-1"><Check size={10} />Default</span>
                        )}
                      </div>
                      <p className="font-medium text-sm">{user?.name || user?.fullName || 'User'}</p>
                      <p className="text-[var(--text-muted)] text-sm mt-0.5">{addr.street}</p>
                      <p className="text-[var(--text-muted)] text-sm">{addr.city}, {addr.state} {addr.postalCode}, {addr.country}</p>
                      {user?.phone && <p className="text-[var(--text-muted)] text-sm mt-1 flex items-center gap-1.5"><Phone size={11} />{user.phone}</p>}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2">
                    <WButton variant="ghost" size="xs" icon={<Edit3 size={12} />} onClick={() => openEdit(addr)}>Edit</WButton>
                    {!addr.isDefault && (
                      <>
                        <WButton variant="ghost" size="xs" icon={<Star size={12} />} onClick={() => setDefault(addr.id)}>Default</WButton>
                        <WButton variant="danger" size="xs" icon={<Trash2 size={12} />} onClick={() => setDeleteId(addr.id)}>Delete</WButton>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {status === 'success' && addresses.length === 0 && (
          <div className="text-center py-16">
            <MapPin size={48} className="text-[var(--text-faint)] mx-auto mb-4" />
            <p className="font-semibold">No addresses saved yet</p>
            <p className="text-[var(--text-muted)] text-sm mt-1">Add your first delivery address</p>
            <WButton variant="primary" size="md" className="mt-4" onClick={openAdd}>Add Address</WButton>
          </div>
        )}

        {/* Add/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-[var(--bg-secondary)] border border-[var(--glass-border)] rounded-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-lg">{editing ? 'Edit Address' : 'Add New Address'}</h2>
                <button onClick={() => setShowModal(false)} className="text-[var(--text-muted)] hover:text-white"><MoreHorizontal size={18} /></button>
              </div>

              {/* Label Selector */}
              <div className="flex gap-3">
                {['Home', 'Work', 'Other'].map(l => {
                  const LI = labelIcons[l];
                  return (
                    <button key={l} onClick={() => setForm(f => ({ ...f, type: l }))}
                      className={\`flex-1 flex flex-col items-center gap-1 py-3 rounded-xl border text-sm font-medium transition-all \${form.type === l ? 'border-[var(--text-main)] bg-[var(--accent-gray-glow)]' : 'border-[var(--border-color)] text-[var(--text-muted)]'}\`}>
                      <LI size={16} />{l}
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { k: 'street', label: 'Street Address', icon: MapPin, colSpan: 2 },
                  { k: 'city', label: 'City', icon: null, colSpan: 1 },
                  { k: 'state', label: 'State', icon: null, colSpan: 1 },
                  { k: 'postalCode', label: 'ZIP Code', icon: null, colSpan: 1 },
                ].map(f => (
                  <div key={f.k} className={f.colSpan === 2 ? 'col-span-2' : ''}>
                    <label className="text-xs text-[var(--text-muted)] mb-1 block">{f.label}</label>
                    <input value={form[f.k]} onChange={set(f.k)} placeholder={f.label}
                      className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--border-hover)] transition-colors" />
                  </div>
                ))}
                <div className="col-span-2">
                  <label className="text-xs text-[var(--text-muted)] mb-1 block">Country</label>
                  <select value={form.country} onChange={set('country')}
                    className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--border-hover)] transition-colors">
                    {countryOptions.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <WButton variant="ghost" fullWidth onClick={() => setShowModal(false)} disabled={actionLoading}>Cancel</WButton>
                <WButton variant="primary" fullWidth onClick={handleSave} disabled={actionLoading}>{editing ? 'Update' : 'Save'} Address</WButton>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirm */}
        {deleteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="bg-[var(--bg-secondary)] border border-[var(--glass-border)] rounded-2xl p-6 max-w-sm w-full text-center space-y-4">
              <Trash2 size={36} className="text-red-400 mx-auto" />
              <h3 className="font-bold text-lg">Delete Address?</h3>
              <p className="text-[var(--text-muted)] text-sm">This action cannot be undone.</p>
              <div className="flex gap-3">
                <WButton variant="ghost" fullWidth onClick={() => setDeleteId(null)} disabled={actionLoading}>Cancel</WButton>
                <WButton variant="danger" fullWidth onClick={() => handleDelete(deleteId)} disabled={actionLoading}>Delete</WButton>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
`;

fs.writeFileSync(filePath, content, 'utf8');
console.log("SavedAddresses.jsx updated");
