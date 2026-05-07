import React, { useState, useEffect } from 'react';
import {
  Building2, Phone, Users, Lock, Save, Eye, EyeOff,
  Plus, Loader2, Check, X, Key, Info, AlertCircle, CheckCircle,
} from 'lucide-react';
import { auth, hotels } from '../api/index.js';

// ─── Shared styles ─────────────────────────────────────────────────────────────
const inputCls = 'w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm bg-white text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#25D366]/30 focus:border-[#25D366] transition-all';
const selectCls = `${inputCls} cursor-pointer`;
const labelCls  = 'block text-xs font-semibold text-gray-600 mb-1.5';
const hintCls   = 'text-[10px] text-gray-400 mt-1';

// ─── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ message, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed top-[72px] right-4 z-[60] flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl text-sm font-medium border max-w-[calc(100vw-2rem)]
      ${type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
      {type === 'success'
        ? <CheckCircle size={14} className="text-emerald-500" />
        : <AlertCircle size={14} className="text-red-500" />}
      {message}
      <button onClick={onClose} className="ml-1 opacity-50 hover:opacity-100"><X size={12} /></button>
    </div>
  );
}

// ─── Tabs config ──────────────────────────────────────────────────────────────
const TABS = [
  { id: 'hotel',    label: 'Hotel',     desc: 'Name, timezone, location',  icon: Building2 },
  { id: 'whatsapp', label: 'WhatsApp',  desc: 'API credentials & tokens',  icon: Phone },
  { id: 'team',     label: 'Team',      desc: 'Agents & access',           icon: Users },
  { id: 'password', label: 'Password',  desc: 'Change your password',      icon: Lock },
];

const TIMEZONES = [
  'Asia/Dubai','Asia/Riyadh','Asia/Kolkata','Asia/Singapore','Asia/Tokyo',
  'Europe/London','Europe/Paris','America/New_York','America/Los_Angeles',
  'America/Chicago','Pacific/Auckland','Australia/Sydney',
];

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({ title, desc, children }) {
  return (
    <div className="space-y-4">
      <div className="pb-3 border-b border-gray-100">
        <h2 className="text-base font-bold text-gray-900">{title}</h2>
        {desc && <p className="text-xs text-gray-400 mt-0.5">{desc}</p>}
      </div>
      {children}
    </div>
  );
}

function SubmitBtn({ saving, icon: Icon = Save, label }) {
  return (
    <button type="submit" disabled={saving}
      className="flex items-center gap-2 px-5 py-2.5 bg-[#25D366] text-white rounded-xl text-sm font-semibold hover:bg-[#128C7E] disabled:opacity-50 transition-all shadow-sm shadow-[#25D366]/25">
      {saving ? <Loader2 size={14} className="animate-spin" /> : <Icon size={14} />}
      {label}
    </button>
  );
}

// ─── Hotel Settings Tab ────────────────────────────────────────────────────────
function HotelTab({ showToast }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name:'', timezone:'', country:'', website:'', address:'', direction:'' });
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    hotels.get()
      .then((res) => {
        const d = res.data?.data || res.data || {};
        setForm({
          name: d.name || '', timezone: d.timezone || '', country: d.country || '',
          website: d.settings?.website || '', address: d.settings?.address || '',
          direction: d.settings?.direction || '',
        });
      })
      .catch(() => showToast('Failed to load hotel settings', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await hotels.update({ ...form, settings: { website: form.website, address: form.address, direction: form.direction } });
      showToast('Hotel settings saved', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save settings', 'error');
    } finally { setSaving(false); }
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-[#25D366]" /></div>;

  return (
    <Section title="Hotel Profile" desc="Basic information about your property">
      <form onSubmit={handleSave} className="max-w-lg space-y-4">
        <div>
          <label className={labelCls}>Hotel Name <span className="text-red-400">*</span></label>
          <input value={form.name} onChange={(e) => set('name', e.target.value)} required
            className={inputCls} placeholder="The Grand Palace Hotel" />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Timezone</label>
            <select value={form.timezone} onChange={(e) => set('timezone', e.target.value)} className={selectCls}>
              <option value="">Select timezone…</option>
              {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Country Code</label>
            <input value={form.country} onChange={(e) => set('country', e.target.value)}
              className={inputCls} placeholder="AE" maxLength={2} />
          </div>
        </div>
        <div>
          <label className={labelCls}>Website</label>
          <input type="url" value={form.website} onChange={(e) => set('website', e.target.value)}
            className={inputCls} placeholder="https://yourhotel.com" />
        </div>
        <div>
          <label className={labelCls}>Address</label>
          <input value={form.address} onChange={(e) => set('address', e.target.value)}
            className={inputCls} placeholder="123 Ocean Drive, Dubai" />
          <p className={hintCls}>Used to auto-fill address in message templates</p>
        </div>
        <div>
          <label className={labelCls}>Property Direction</label>
          <input value={form.direction} onChange={(e) => set('direction', e.target.value)}
            className={inputCls} placeholder="e.g. Sea-facing, North-facing" />
        </div>
        <SubmitBtn saving={saving} label="Save Hotel Settings" />
      </form>
    </Section>
  );
}

// ─── WhatsApp Config Tab ───────────────────────────────────────────────────────
function WhatsAppTab({ showToast }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [activeToken, setActiveToken] = useState(null);
  const [form, setForm] = useState({ accessToken: '', wabaId: '', phoneNumberId: '' });
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const loadData = async () => {
    setLoading(true);
    try {
      const [hotelRes, tokensRes] = await Promise.allSettled([hotels.get(), hotels.getTokens()]);
      if (hotelRes.status === 'fulfilled') {
        const d = hotelRes.value.data?.data || hotelRes.value.data || {};
        setForm((p) => ({ ...p, wabaId: d.wabaId || '', phoneNumberId: d.phoneNumberId || '' }));
      }
      if (tokensRes.status === 'fulfilled') {
        const tokens = tokensRes.value.data?.data || tokensRes.value.data || [];
        setActiveToken(Array.isArray(tokens) ? (tokens.find((t) => t.isActive) || null) : null);
      }
    } finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.accessToken) { showToast('Access Token is required', 'error'); return; }
    if (!form.wabaId || !form.phoneNumberId) { showToast('WABA ID and Phone Number ID are required', 'error'); return; }
    setSaving(true);
    try {
      await hotels.saveToken({ accessToken: form.accessToken, wabaId: form.wabaId, phoneNumberId: form.phoneNumberId });
      showToast('WhatsApp credentials saved ✓', 'success');
      setForm((p) => ({ ...p, accessToken: '' }));
      await loadData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save token', 'error');
    } finally { setSaving(false); }
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-[#25D366]" /></div>;

  return (
    <Section title="WhatsApp Business API" desc="Configure your Meta API credentials to start sending messages">
      <div className="max-w-lg space-y-4">
        {/* Status banner */}
        {activeToken ? (
          <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl">
            <CheckCircle size={16} className="text-emerald-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-emerald-800">Token active</p>
              <p className="text-emerald-600 text-xs mt-0.5 font-mono truncate">{activeToken.accessToken}</p>
              {activeToken.expiresAt && (
                <p className="text-emerald-500 text-[10px] mt-1">Expires: {new Date(activeToken.expiresAt).toLocaleString()}</p>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-100 rounded-2xl">
            <AlertCircle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800">No token configured</p>
              <p className="text-xs text-amber-600 mt-0.5">Add your WhatsApp credentials below to start sending messages.</p>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded-2xl">
          <Info size={16} className="text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-blue-800 space-y-1">
            <p className="font-semibold">How to get credentials</p>
            <ol className="list-decimal ml-4 space-y-0.5 text-blue-700">
              <li>Go to <span className="font-mono bg-blue-100 px-1 rounded">developers.facebook.com</span></li>
              <li>Open your App → WhatsApp → API Setup</li>
              <li>Copy Access Token, WABA ID, Phone Number ID</li>
            </ol>
            <p className="text-blue-600 flex items-center gap-1 mt-1.5">
              <Key size={10} /> Token is AES-256 encrypted before storing.
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className={labelCls}>Access Token <span className="text-red-400">*</span></label>
            <div className="relative">
              <input
                type={showToken ? 'text' : 'password'}
                value={form.accessToken}
                onChange={(e) => set('accessToken', e.target.value)}
                className={`${inputCls} pr-10 font-mono`}
                placeholder={activeToken ? '••••••••• (paste to replace)' : 'EAABsb…'}
              />
              <button type="button" onClick={() => setShowToken((v) => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
                {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
          <div>
            <label className={labelCls}>WABA ID <span className="text-red-400">*</span></label>
            <input type="text" value={form.wabaId} onChange={(e) => set('wabaId', e.target.value)}
              className={`${inputCls} font-mono`} placeholder="123456789012345" />
          </div>
          <div>
            <label className={labelCls}>Phone Number ID <span className="text-red-400">*</span></label>
            <input type="text" value={form.phoneNumberId} onChange={(e) => set('phoneNumberId', e.target.value)}
              className={`${inputCls} font-mono`} placeholder="987654321098765" />
          </div>
          <SubmitBtn saving={saving} label={activeToken ? 'Update Credentials' : 'Save Credentials'} />
        </form>
      </div>
    </Section>
  );
}

// ─── Team Tab ─────────────────────────────────────────────────────────────────
function TeamTab({ showToast }) {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [form, setForm] = useState({ name:'', email:'', password:'', role:'agent' });
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const loadAgents = () => {
    setLoading(true);
    auth.listAgents()
      .then((res) => { const d = res.data?.data || res.data || []; setAgents(Array.isArray(d) ? d : []); })
      .catch(() => showToast('Failed to load team', 'error'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { loadAgents(); }, []);

  const handleRegister = async (e) => {
    e.preventDefault();
    setRegistering(true);
    try {
      await auth.register(form);
      showToast('Agent registered', 'success');
      setForm({ name:'', email:'', password:'', role:'agent' });
      setShowForm(false);
      loadAgents();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to register agent', 'error');
    } finally { setRegistering(false); }
  };

  const ROLE_CLS = {
    admin: 'bg-violet-50 text-violet-600 border-violet-100',
    agent: 'bg-blue-50 text-blue-600 border-blue-100',
  };

  return (
    <Section title="Team Members" desc="Manage agents who have access to this platform">
      <div className="max-w-xl space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400">{agents.length} member{agents.length !== 1 ? 's' : ''}</p>
          <button onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#25D366] text-white rounded-xl text-xs font-semibold hover:bg-[#128C7E] transition-colors shadow-sm shadow-[#25D366]/25">
            <Plus size={13} /> {showForm ? 'Cancel' : 'Add Agent'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleRegister}
            className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-3">
            <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">New Agent</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Full Name</label>
                <input value={form.name} onChange={(e) => set('name', e.target.value)}
                  className={inputCls} placeholder="Maria Santos" required />
              </div>
              <div>
                <label className={labelCls}>Email</label>
                <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)}
                  className={inputCls} placeholder="maria@hotel.com" required />
              </div>
              <div>
                <label className={labelCls}>Password</label>
                <input type="password" value={form.password} onChange={(e) => set('password', e.target.value)}
                  className={inputCls} placeholder="Min 8 characters" required minLength={8} />
              </div>
              <div>
                <label className={labelCls}>Role</label>
                <select value={form.role} onChange={(e) => set('role', e.target.value)} className={selectCls}>
                  <option value="agent">Agent</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={registering}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#25D366] text-white rounded-xl text-xs font-semibold hover:bg-[#128C7E] disabled:opacity-50 transition-colors">
                {registering ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                Register Agent
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-xl text-xs font-medium hover:bg-gray-50 transition-colors">
                Cancel
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-[#25D366]" /></div>
        ) : agents.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center mb-3">
              <Users size={22} className="text-gray-200" />
            </div>
            <p className="text-sm text-gray-500 font-medium">No team members</p>
            <p className="text-xs text-gray-400 mt-1">Add your first agent above</p>
          </div>
        ) : (
          <div className="space-y-2">
            {agents.map((agent) => (
              <div key={agent.id} className="flex items-center gap-3 p-3.5 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#25D366] to-[#075E54] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {(agent.name || '?').charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800">{agent.name}</p>
                  <p className="text-xs text-gray-400 truncate">{agent.email}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide border ${ROLE_CLS[agent.role] || 'bg-gray-50 text-gray-500 border-gray-100'}`}>
                  {agent.role}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Section>
  );
}

// ─── Password Tab ─────────────────────────────────────────────────────────────
function PasswordTab({ showToast }) {
  const [saving, setSaving] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ currentPassword:'', newPassword:'', confirmPassword:'' });
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSave = async (e) => {
    e.preventDefault();
    if (form.newPassword !== form.confirmPassword) { showToast('New passwords do not match', 'error'); return; }
    if (form.newPassword.length < 8) { showToast('Password must be at least 8 characters', 'error'); return; }
    setSaving(true);
    try {
      await auth.changePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword });
      showToast('Password changed successfully', 'success');
      setForm({ currentPassword:'', newPassword:'', confirmPassword:'' });
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to change password', 'error');
    } finally { setSaving(false); }
  };

  return (
    <Section title="Change Password" desc="Update your account password">
      <form onSubmit={handleSave} className="max-w-sm space-y-4">
        <div>
          <label className={labelCls}>Current Password</label>
          <div className="relative">
            <input type={showCurrent ? 'text' : 'password'} value={form.currentPassword}
              onChange={(e) => set('currentPassword', e.target.value)}
              className={`${inputCls} pr-10`} required />
            <button type="button" onClick={() => setShowCurrent((v) => !v)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
              {showCurrent ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>
        <div>
          <label className={labelCls}>New Password</label>
          <div className="relative">
            <input type={showNew ? 'text' : 'password'} value={form.newPassword}
              onChange={(e) => set('newPassword', e.target.value)}
              className={`${inputCls} pr-10`} required minLength={8} />
            <button type="button" onClick={() => setShowNew((v) => !v)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
              {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>
        <div>
          <label className={labelCls}>Confirm New Password</label>
          <input type="password" value={form.confirmPassword}
            onChange={(e) => set('confirmPassword', e.target.value)}
            className={inputCls} required />
          {form.confirmPassword && form.newPassword !== form.confirmPassword && (
            <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
              <AlertCircle size={10} /> Passwords do not match
            </p>
          )}
        </div>
        <SubmitBtn saving={saving} icon={Lock} label="Change Password" />
      </form>
    </Section>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('hotel');
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => setToast({ message, type });

  return (
    <div className="flex flex-col h-full">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 md:px-6 py-4 flex-shrink-0">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-lg font-bold text-gray-900">Settings</h1>
          <p className="text-xs text-gray-400 mt-0.5">Manage your hotel and account configuration</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-6">
          <div className="flex flex-col md:flex-row gap-6">

            {/* ── Sidebar tabs ─────────── */}
            <aside className="md:w-52 flex-shrink-0">
              <nav className="flex md:flex-col gap-1">
                {TABS.map(({ id, label, desc, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id)}
                    className={`flex items-center gap-3 w-full px-3.5 py-3 rounded-2xl text-left transition-all
                      ${activeTab === id
                        ? 'bg-[#25D366]/10 text-[#128C7E]'
                        : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                      }`}
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors
                      ${activeTab === id ? 'bg-[#25D366] text-white' : 'bg-gray-100 text-gray-400'}`}>
                      <Icon size={14} />
                    </div>
                    <div className="hidden md:block min-w-0">
                      <p className={`text-xs font-semibold leading-tight ${activeTab === id ? 'text-[#128C7E]' : 'text-gray-700'}`}>
                        {label}
                      </p>
                      <p className="text-[10px] text-gray-400 leading-tight truncate">{desc}</p>
                    </div>
                    <span className="md:hidden text-xs font-semibold">{label}</span>
                  </button>
                ))}
              </nav>
            </aside>

            {/* ── Tab content ──────────── */}
            <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-5 md:p-6 min-w-0">
              {activeTab === 'hotel'    && <HotelTab    showToast={showToast} />}
              {activeTab === 'whatsapp' && <WhatsAppTab showToast={showToast} />}
              {activeTab === 'team'     && <TeamTab     showToast={showToast} />}
              {activeTab === 'password' && <PasswordTab showToast={showToast} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
