import React, { useState, useEffect } from 'react';
import {
  Building2, Phone, Users, Lock, Save, Eye, EyeOff,
  Plus, Loader2, Check, X, Key, Info, AlertCircle, CheckCircle
} from 'lucide-react';
import { auth, hotels } from '../api/index.js';

// ─── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className={`fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-all ${
      type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
    }`}>
      {type === 'success' ? <CheckCircle size={16} className="text-green-600" /> : <AlertCircle size={16} className="text-red-600" />}
      {message}
      <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100"><X size={14} /></button>
    </div>
  );
}

// ─── Tabs ──────────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'hotel', label: 'Hotel Settings', icon: Building2 },
  { id: 'whatsapp', label: 'WhatsApp Config', icon: Phone },
  { id: 'team', label: 'Team', icon: Users },
  { id: 'password', label: 'Password', icon: Lock },
];

const TIMEZONES = [
  'Asia/Dubai', 'Asia/Riyadh', 'Asia/Kolkata', 'Asia/Singapore', 'Asia/Tokyo',
  'Europe/London', 'Europe/Paris', 'America/New_York', 'America/Los_Angeles',
  'America/Chicago', 'Pacific/Auckland', 'Australia/Sydney',
];

// ─── Hotel Settings Tab ────────────────────────────────────────────────────────
function HotelTab({ showToast }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', timezone: '', country: '', website: '', address: '', direction: '' });

  useEffect(() => {
    hotels.get()
      .then((res) => {
        const d = res.data?.data || res.data || {};
        setForm({
          name: d.name || '',
          timezone: d.timezone || '',
          country: d.country || '',
          website: d.settings?.website || '',
          address: d.settings?.address || '',
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
      await hotels.update({
        ...form,
        settings: {
          website: form.website,
          address: form.address,
          direction: form.direction,
        },
      });
      showToast('Hotel settings saved', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={28} className="animate-spin text-[#25D366]" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="max-w-xl space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Hotel Name</label>
        <input
          value={form.name}
          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#25D366]"
          placeholder="The Grand Palace Hotel"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
        <select
          value={form.timezone}
          onChange={(e) => setForm((p) => ({ ...p, timezone: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#25D366]"
        >
          <option value="">Select timezone...</option>
          {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Country Code</label>
        <input
          value={form.country}
          onChange={(e) => setForm((p) => ({ ...p, country: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#25D366]"
          placeholder="AE"
          maxLength={2}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Website (optional)</label>
        <input
          value={form.website}
          onChange={(e) => setForm((p) => ({ ...p, website: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#25D366]"
          placeholder="https://yourhotel.com"
          type="url"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Address (optional)</label>
        <input
          value={form.address}
          onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#25D366]"
          placeholder="123 Ocean Drive, Dubai"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Property Direction (optional)</label>
        <input
          value={form.direction}
          onChange={(e) => setForm((p) => ({ ...p, direction: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#25D366]"
          placeholder="e.g. Sea-facing, Road-facing, North-facing"
        />
      </div>
      <button
        type="submit"
        disabled={saving}
        className="flex items-center gap-2 px-5 py-2.5 bg-[#25D366] text-white rounded-lg text-sm font-medium hover:bg-[#128C7E] disabled:opacity-50 transition-colors"
      >
        {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
        Save Hotel Settings
      </button>
    </form>
  );
}

// ─── WhatsApp Config Tab ───────────────────────────────────────────────────────
function WhatsAppTab({ showToast }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [activeToken, setActiveToken] = useState(null); // existing saved token info
  const [form, setForm] = useState({ accessToken: '', wabaId: '', phoneNumberId: '' });

  // Load existing hotel config + saved token on mount
  const loadData = async () => {
    setLoading(true);
    try {
      const [hotelRes, tokensRes] = await Promise.allSettled([
        hotels.get(),
        hotels.getTokens(),
      ]);

      if (hotelRes.status === 'fulfilled') {
        const d = hotelRes.value.data?.data || hotelRes.value.data || {};
        setForm((p) => ({
          ...p,
          wabaId: d.wabaId || '',
          phoneNumberId: d.phoneNumberId || '',
        }));
      }

      if (tokensRes.status === 'fulfilled') {
        const tokens = tokensRes.value.data?.data || tokensRes.value.data || [];
        const active = Array.isArray(tokens) ? tokens.find((t) => t.isActive) : null;
        setActiveToken(active || null);
      }
    } catch (e) {
      // silent — form just stays empty
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.accessToken) {
      showToast('Access Token is required', 'error');
      return;
    }
    if (!form.wabaId || !form.phoneNumberId) {
      showToast('WABA ID and Phone Number ID are required', 'error');
      return;
    }
    setSaving(true);
    try {
      await hotels.saveToken({
        accessToken: form.accessToken,
        wabaId: form.wabaId,
        phoneNumberId: form.phoneNumberId,
      });
      showToast('WhatsApp credentials saved successfully ✓', 'success');
      setForm((p) => ({ ...p, accessToken: '' })); // clear token field only
      await loadData(); // reload to show new token status
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to save token';
      showToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={28} className="animate-spin text-[#25D366]" />
      </div>
    );
  }

  return (
    <div className="max-w-xl space-y-6">

      {/* Current token status banner */}
      {activeToken ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
          <CheckCircle size={18} className="text-green-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-green-800">Token is active</p>
            <p className="text-green-700 mt-0.5">
              Saved: <span className="font-mono">{activeToken.accessToken}</span>
            </p>
            {activeToken.expiresAt && (
              <p className="text-green-600 text-xs mt-1">
                Expires: {new Date(activeToken.expiresAt).toLocaleString()}
              </p>
            )}
            <p className="text-green-600 text-xs mt-1">
              Last used: {activeToken.lastUsedAt ? new Date(activeToken.lastUsedAt).toLocaleString() : 'Never'}
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle size={18} className="text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-800">
            <p className="font-semibold">No token configured</p>
            <p className="text-yellow-700 mt-0.5">Add your WhatsApp credentials below to start sending messages.</p>
          </div>
        </div>
      )}

      {/* How-to instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
        <Info size={18} className="text-blue-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-semibold mb-1">How to get your credentials</p>
          <ol className="list-decimal ml-4 space-y-1 text-blue-700 text-xs">
            <li>Go to <span className="font-mono bg-blue-100 px-1 rounded">developers.facebook.com</span></li>
            <li>Open your App → WhatsApp → API Setup</li>
            <li>Copy <strong>Temporary Access Token</strong>, <strong>WABA ID</strong>, and <strong>Phone Number ID</strong></li>
          </ol>
          <p className="mt-2 text-blue-600 text-xs flex items-center gap-1">
            <Key size={12} />
            Token is AES-256 encrypted before storing in the database.
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSave} className="space-y-5">

        {/* Access Token */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Access Token <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type={showToken ? 'text' : 'password'}
              value={form.accessToken}
              onChange={(e) => setForm((p) => ({ ...p, accessToken: e.target.value }))}
              className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#25D366]"
              placeholder={activeToken ? '••••••• (paste new token to replace)' : 'EAABsb...'}
            />
            <button
              type="button"
              onClick={() => setShowToken((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1">From developers.facebook.com → Your App → WhatsApp → API Setup</p>
        </div>

        {/* WABA ID */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            WhatsApp Business Account ID (WABA ID) <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.wabaId}
            onChange={(e) => setForm((p) => ({ ...p, wabaId: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#25D366]"
            placeholder="123456789012345"
          />
        </div>

        {/* Phone Number ID */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Phone Number ID <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.phoneNumberId}
            onChange={(e) => setForm((p) => ({ ...p, phoneNumberId: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#25D366]"
            placeholder="987654321098765"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#25D366] text-white rounded-lg text-sm font-medium hover:bg-[#128C7E] disabled:opacity-50 transition-colors"
        >
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          {activeToken ? 'Update Credentials' : 'Save Credentials'}
        </button>
      </form>
    </div>
  );
}

// ─── Team Tab ─────────────────────────────────────────────────────────────────
function TeamTab({ showToast }) {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'agent' });

  const loadAgents = () => {
    setLoading(true);
    auth.listAgents()
      .then((res) => {
        const data = res.data?.data || res.data || [];
        setAgents(Array.isArray(data) ? data : []);
      })
      .catch(() => showToast('Failed to load team members', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadAgents(); }, []);

  const handleRegister = async (e) => {
    e.preventDefault();
    setRegistering(true);
    try {
      await auth.register(form);
      showToast('Agent registered successfully', 'success');
      setForm({ name: '', email: '', password: '', role: 'agent' });
      setShowForm(false);
      loadAgents();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to register agent', 'error');
    } finally {
      setRegistering(false);
    }
  };

  const ROLE_COLORS = { admin: 'bg-purple-100 text-purple-700', agent: 'bg-blue-100 text-blue-700' };

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-800">Team Members</h3>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#25D366] text-white rounded-lg text-xs font-medium hover:bg-[#128C7E] transition-colors"
        >
          <Plus size={13} />
          Add Agent
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleRegister} className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4 space-y-3">
          <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">New Agent</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Full Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#25D366]"
                placeholder="Maria Santos"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#25D366]"
                placeholder="maria@hotel.com"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Password</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#25D366]"
                placeholder="Min 8 characters"
                required
                minLength={8}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Role</label>
              <select
                value={form.role}
                onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#25D366]"
              >
                <option value="agent">Agent</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={registering}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#25D366] text-white rounded-lg text-xs font-medium hover:bg-[#128C7E] disabled:opacity-50 transition-colors"
            >
              {registering ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
              Register
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={22} className="animate-spin text-[#25D366]" />
        </div>
      ) : agents.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Users size={32} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm">No team members yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {agents.map((agent) => (
            <div key={agent.id} className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-xl">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#25D366] to-[#128C7E] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {(agent.name || '?').charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800">{agent.name}</p>
                <p className="text-xs text-gray-500 truncate">{agent.email}</p>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[agent.role] || 'bg-gray-100 text-gray-600'}`}>
                {agent.role}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Password Tab ─────────────────────────────────────────────────────────────
function PasswordTab({ showToast }) {
  const [saving, setSaving] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  const handleSave = async (e) => {
    e.preventDefault();
    if (form.newPassword !== form.confirmPassword) {
      showToast('New passwords do not match', 'error');
      return;
    }
    if (form.newPassword.length < 8) {
      showToast('Password must be at least 8 characters', 'error');
      return;
    }
    setSaving(true);
    try {
      await auth.changePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      showToast('Password changed successfully', 'success');
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to change password', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="max-w-sm space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
        <div className="relative">
          <input
            type={showCurrent ? 'text' : 'password'}
            value={form.currentPassword}
            onChange={(e) => setForm((p) => ({ ...p, currentPassword: e.target.value }))}
            className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#25D366]"
            required
          />
          <button type="button" onClick={() => setShowCurrent((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
            {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
        <div className="relative">
          <input
            type={showNew ? 'text' : 'password'}
            value={form.newPassword}
            onChange={(e) => setForm((p) => ({ ...p, newPassword: e.target.value }))}
            className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#25D366]"
            required
            minLength={8}
          />
          <button type="button" onClick={() => setShowNew((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
            {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
        <input
          type="password"
          value={form.confirmPassword}
          onChange={(e) => setForm((p) => ({ ...p, confirmPassword: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#25D366]"
          required
        />
        {form.confirmPassword && form.newPassword !== form.confirmPassword && (
          <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
        )}
      </div>
      <button
        type="submit"
        disabled={saving}
        className="flex items-center gap-2 px-5 py-2.5 bg-[#25D366] text-white rounded-lg text-sm font-medium hover:bg-[#128C7E] disabled:opacity-50 transition-colors"
      >
        {saving ? <Loader2 size={15} className="animate-spin" /> : <Lock size={15} />}
        Change Password
      </button>
    </form>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('hotel');
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your hotel and account settings</p>
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        {activeTab === 'hotel' && <HotelTab showToast={showToast} />}
        {activeTab === 'whatsapp' && <WhatsAppTab showToast={showToast} />}
        {activeTab === 'team' && <TeamTab showToast={showToast} />}
        {activeTab === 'password' && <PasswordTab showToast={showToast} />}
      </div>
    </div>
  );
}
