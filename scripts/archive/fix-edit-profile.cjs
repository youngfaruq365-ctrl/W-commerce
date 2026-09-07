const fs = require('fs');
const filePath = 'C:\\Users\\HomePC\\Downloads\\W-COMMERCE PROJECT\\src\\modules\\buyer\\EditProfile.jsx';

const content = `import React, { useState, useRef, useEffect } from 'react';
import { Camera, User, Phone, Calendar, ChevronDown, Instagram, Twitter, Globe, Save, X, Check, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { WButton, WInput } from '../../design/components';
import { apiClient } from '../../utils/apiClient';

const genderOptions = ['Prefer not to say', 'Male', 'Female', 'Non-binary', 'Other'];

function FormField({ label, error, children }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-[var(--text-muted)]">{label}</label>
      {children}
      {error && <p className="text-xs text-red-400 flex items-center gap-1"><AlertCircle size={11} />{error}</p>}
    </div>
  );
}

export default function EditProfile() {
  const { user, setUser } = useAuthStore();
  const fileRef = useRef();
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  
  const [form, setForm] = useState({
    fullName: user?.name || user?.fullName || '',
    phone: user?.phone || '',
    username: user?.username || '',
    dob: user?.dob || '',
    gender: user?.gender || 'Prefer not to say',
    bio: user?.bio || '',
    instagram: user?.socials?.instagram || '',
    twitter: user?.socials?.twitter || '',
    website: user?.website || '',
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await apiClient.get('/api/v1/users/profile');
        if (response.data.success) {
          const u = response.data.user;
          setForm(f => ({
            ...f,
            fullName: u.fullName || u.name || '',
            phone: u.phone || '',
          }));
          if (u.avatarUrl) setAvatarPreview(u.avatarUrl);
        }
      } catch (error) {
        console.error("Failed to fetch profile", error);
      }
    };
    fetchProfile();
  }, []);

  const handleAvatar = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setAvatarPreview(ev.target.result);
      reader.readAsDataURL(file);
    }
  };

  const validate = () => {
    const errs = {};
    if (!form.fullName.trim()) errs.fullName = 'Full name is required';
    if (form.phone && !/^\\+?[\\d\\s\\-()]{7,}$/.test(form.phone)) errs.phone = 'Enter a valid phone number';
    return errs;
  };

  const handleSave = async () => {
    setServerError('');
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);
    
    try {
      const response = await apiClient.put('/api/v1/users/profile', {
        fullName: form.fullName,
        phone: form.phone,
        // Bio, dob, gender, social fields might be ignored by backend for now, but we send them just in case
        bio: form.bio,
        gender: form.gender,
        dob: form.dob
      });
      
      if (response.data.success) {
        // update local user state
        setUser({ ...user, name: response.data.user.fullName, phone: response.data.user.phone });
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      } else {
        setServerError(response.data.message || 'Failed to update profile');
      }
    } catch (error) {
      setServerError(error.message || 'Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-main)]">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Edit Profile</h1>
          <p className="text-[var(--text-muted)] text-sm mt-1">Update your personal information</p>
          {serverError && (
             <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm flex items-center gap-2">
                <AlertCircle size={16} /> {serverError}
             </div>
          )}
        </div>

        {/* Avatar Upload */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 flex flex-col items-center gap-4">
          <div className="relative group">
            <div className="w-28 h-28 rounded-full bg-[var(--bg-tertiary)] border-2 border-[var(--glass-border)] overflow-hidden flex items-center justify-center text-4xl font-bold">
              {avatarPreview
                ? <img src={avatarPreview} alt="preview" className="w-full h-full object-cover" />
                : <span>{form.fullName?.[0] || 'A'}</span>
              }
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera size={22} className="text-white" />
            </button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatar} />
          <div className="flex gap-3">
            <WButton variant="ghost" size="sm" onClick={() => fileRef.current?.click()} icon={<Camera size={13} />}>Upload Photo</WButton>
            {avatarPreview && <WButton variant="danger" size="sm" onClick={() => setAvatarPreview(null)} icon={<X size={13} />}>Remove</WButton>}
          </div>
          <p className="text-xs text-[var(--text-muted)]">JPG, PNG or WebP. Max 5MB. Square images work best.</p>
        </div>

        {/* Form */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 space-y-5">
          <h2 className="font-bold text-sm text-[var(--text-muted)] uppercase tracking-wider">Personal Info</h2>

          <div className="grid sm:grid-cols-2 gap-4">
            <FormField label="Full Name" error={errors.fullName}>
              <input value={form.fullName} onChange={set('fullName')}
                className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[var(--border-hover)] transition-colors" />
            </FormField>
            <FormField label="Username" error={errors.username}>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-sm">@</span>
                <input value={form.username} onChange={set('username')}
                  className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl pl-7 pr-4 py-2.5 text-sm focus:outline-none focus:border-[var(--border-hover)] transition-colors" />
              </div>
            </FormField>
          </div>

          <FormField label="Phone Number" error={errors.phone}>
            <input value={form.phone} onChange={set('phone')} type="tel"
              className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[var(--border-hover)] transition-colors" />
          </FormField>

          <div className="grid sm:grid-cols-2 gap-4">
            <FormField label="Date of Birth">
              <input value={form.dob} onChange={set('dob')} type="date"
                className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[var(--border-hover)] transition-colors [color-scheme:dark]" />
            </FormField>
            <FormField label="Gender">
              <div className="relative">
                <select value={form.gender} onChange={set('gender')}
                  className="w-full appearance-none bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[var(--border-hover)] transition-colors pr-8">
                  {genderOptions.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
              </div>
            </FormField>
          </div>

          <FormField label="Bio">
            <textarea value={form.bio} onChange={set('bio')} rows={3}
              className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[var(--border-hover)] transition-colors resize-none"
              placeholder="Write something about yourself..." />
            <p className="text-right text-xs text-[var(--text-faint)]">{form.bio.length}/150</p>
          </FormField>
        </div>

        {/* Social Links */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 space-y-4">
          <h2 className="font-bold text-sm text-[var(--text-muted)] uppercase tracking-wider">Social Links <span className="normal-case font-normal">(optional)</span></h2>
          {[
            { key: 'instagram', icon: Instagram, placeholder: 'Instagram username', prefix: '@' },
            { key: 'twitter', icon: Twitter, placeholder: 'Twitter handle', prefix: '@' },
            { key: 'website', icon: Globe, placeholder: 'https://yourwebsite.com', prefix: null },
          ].map(({ key, icon: Icon, placeholder, prefix }) => (
            <div key={key} className="flex items-center gap-3">
              <div className="w-9 h-9 bg-[var(--bg-tertiary)] rounded-xl flex items-center justify-center flex-shrink-0">
                <Icon size={15} className="text-[var(--text-muted)]" />
              </div>
              <div className="relative flex-1">
                {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-sm">{prefix}</span>}
                <input value={form[key]} onChange={set(key)} placeholder={placeholder}
                  className={\`w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl py-2.5 text-sm focus:outline-none focus:border-[var(--border-hover)] transition-colors \${prefix ? 'pl-7 pr-4' : 'px-4'}\`} />
              </div>
            </div>
          ))}
        </div>

        {/* Save Button */}
        <div className="flex gap-3 pb-6">
          <WButton variant="ghost" size="md" fullWidth>Cancel</WButton>
          <WButton variant="primary" size="md" fullWidth onClick={handleSave} disabled={loading}
            icon={saved ? <Check size={15} /> : <Save size={15} />}>
            {saved ? 'Saved!' : loading ? 'Saving...' : 'Save Changes'}
          </WButton>
        </div>
      </div>
    </div>
  );
}
`;

fs.writeFileSync(filePath, content, 'utf8');
console.log("EditProfile.jsx updated");
