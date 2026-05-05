import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Play, StopCircle, X, Loader2, Check, AlertCircle,
  BarChart2, Users, Clock, ArrowLeft, Send, Trash2, RefreshCw
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { campaigns, templates } from '../api/index.js';
import { format } from 'date-fns';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const AUDIENCE_LABELS = {
  ALL: 'All Guests',
  ARRIVING: 'Arriving',
  IN_HOUSE: 'In-House',
  CHECKED_OUT: 'Checked Out',
  TAG: 'By Tag',
  CSV: 'Custom List',
};

function StatusBadge({ status }) {
  const s = (status || '').toUpperCase();
  const map = {
    DRAFT:     'bg-gray-100 text-gray-600',
    SCHEDULED: 'bg-purple-100 text-purple-700',
    RUNNING:   'bg-blue-100 text-blue-700',
    COMPLETED: 'bg-green-100 text-green-700',
    CANCELLED: 'bg-red-100 text-red-600',
    FAILED:    'bg-red-100 text-red-600',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${map[s] || 'bg-gray-100 text-gray-600'}`}>
      {s.toLowerCase()}
    </span>
  );
}

function Toast({ msg, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-white text-sm ${type === 'error' ? 'bg-red-500' : 'bg-[#25D366]'}`}>
      {type === 'error' ? <AlertCircle size={16} /> : <Check size={16} />}
      {msg}
    </div>
  );
}

// Extract {{1}}, {{2}} variables from a text string
function extractVarKeys(text) {
  if (!text) return [];
  return [...new Set((text.match(/{{(\d+)}}/g) || []))].sort((a, b) => {
    return parseInt(a.replace(/[{}]/g,''),10) - parseInt(b.replace(/[{}]/g,''),10);
  });
}

// ─── Campaign Create Modal ─────────────────────────────────────────────────────
function CampaignModal({ onClose, onSaved }) {
  const [form, setForm] = useState({
    name: '',
    templateId: '',
    audienceType: 'ALL',
    scheduleType: 'now',
    scheduledAt: '',
    variableValues: {},
  });
  const [templateList, setTemplateList] = useState([]);
  const [selectedTpl, setSelectedTpl]   = useState(null);
  const [loading, setLoading]           = useState(false);
  const [err, setErr]                   = useState('');

  useEffect(() => {
    templates.list({ status: 'APPROVED', limit: 100 })
      .then((res) => {
        const data = res.data?.data || res.data || [];
        setTemplateList(Array.isArray(data) ? data : []);
      })
      .catch(() => setTemplateList([]));
  }, []);

  const f = (field, val) => setForm((prev) => ({ ...prev, [field]: val }));

  const handleTemplateChange = (id) => {
    const tpl = templateList.find((t) => t.id === id) || null;
    f('templateId', id);
    setSelectedTpl(tpl);
    setForm((prev) => ({ ...prev, templateId: id, variableValues: {} }));
  };

  const varKeys = selectedTpl ? extractVarKeys(
    [selectedTpl.headerText, selectedTpl.bodyText, selectedTpl.footerText].join(' ')
  ) : [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr('');
    // Validate all vars filled
    for (const k of varKeys) {
      const idx = k.replace(/[{}]/g, '');
      if (!form.variableValues[idx]?.trim()) {
        setErr(`Please fill in variable ${k}`);
        return;
      }
    }
    setLoading(true);
    try {
      const payload = {
        name:           form.name,
        templateId:     form.templateId,
        audienceType:   form.audienceType,
        scheduledAt:    form.scheduleType === 'now' ? null : form.scheduledAt,
        variableValues: Object.keys(form.variableValues).length ? form.variableValues : undefined,
      };
      await campaigns.create(payload);
      onSaved('Campaign created');
      onClose();
    } catch (error) {
      setErr(error.response?.data?.message || 'Failed to create campaign');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-base font-semibold text-gray-800">Create Campaign</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {err && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex gap-2 items-start">
              <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
              {err}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Name *</label>
            <input
              required
              value={form.name}
              onChange={(e) => f('name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#25D366]"
              placeholder="e.g. Pre-Arrival Welcome Jan"
            />
          </div>

          {/* Template */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Template * <span className="text-xs text-gray-400 font-normal">(must be APPROVED)</span>
            </label>
            <select
              required
              value={form.templateId}
              onChange={(e) => handleTemplateChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#25D366]"
            >
              <option value="">Select a template…</option>
              {templateList.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            {templateList.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">No approved templates found. Create and submit a template first.</p>
            )}
          </div>

          {/* Template preview + variable inputs */}
          {selectedTpl && (
            <div className="space-y-3">
              <div className="p-3 bg-[#DCF8C6] rounded-xl text-sm text-gray-800 whitespace-pre-wrap">
                {selectedTpl.headerText && <p className="font-semibold mb-1">{selectedTpl.headerText}</p>}
                {selectedTpl.bodyText}
                {selectedTpl.footerText && <p className="text-xs text-gray-500 mt-1 italic">{selectedTpl.footerText}</p>}
              </div>
              {varKeys.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-600">Template variables:</p>
                  {varKeys.map((k) => {
                    const idx = k.replace(/[{}]/g, '');
                    return (
                      <div key={k} className="flex items-center gap-2">
                        <span className="text-xs font-mono bg-yellow-100 text-yellow-800 px-2 py-1 rounded w-12 text-center flex-shrink-0">{k}</span>
                        <input
                          required
                          value={form.variableValues[idx] || ''}
                          onChange={(e) => f('variableValues', { ...form.variableValues, [idx]: e.target.value })}
                          placeholder={`Value for ${k}`}
                          className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#25D366]"
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Audience */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Audience</label>
            <div className="space-y-2">
              {[
                { value: 'ALL',         label: 'All Guests',          desc: 'All opted-in registered guests' },
                { value: 'ARRIVING',    label: 'Arriving Guests',     desc: 'Guests with ARRIVING stay status' },
                { value: 'IN_HOUSE',    label: 'In-House Guests',     desc: 'Guests currently staying' },
                { value: 'CHECKED_OUT', label: 'Checked-Out Guests',  desc: 'Guests with CHECKED_OUT status' },
              ].map(({ value, label, desc }) => (
                <label
                  key={value}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    form.audienceType === value ? 'border-[#25D366] bg-green-50' : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="audienceType"
                    value={value}
                    checked={form.audienceType === value}
                    onChange={() => f('audienceType', value)}
                    className="mt-0.5 accent-[#25D366]"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-800">{label}</p>
                    <p className="text-xs text-gray-500">{desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Schedule */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Schedule</label>
            <div className="flex gap-3 mb-3">
              {[
                { value: 'now',   label: 'Launch Now' },
                { value: 'later', label: 'Schedule for later' },
              ].map(({ value, label }) => (
                <label
                  key={value}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer flex-1 justify-center ${
                    form.scheduleType === value ? 'border-[#25D366] bg-green-50' : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="scheduleType"
                    value={value}
                    checked={form.scheduleType === value}
                    onChange={() => f('scheduleType', value)}
                    className="accent-[#25D366]"
                  />
                  <span className="text-sm font-medium text-gray-700">{label}</span>
                </label>
              ))}
            </div>
            {form.scheduleType === 'later' && (
              <input
                type="datetime-local"
                required
                value={form.scheduledAt}
                onChange={(e) => f('scheduledAt', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#25D366]"
              />
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={loading} className="flex items-center gap-2 px-4 py-2 text-sm bg-[#25D366] text-white rounded-lg hover:bg-[#128C7E] disabled:opacity-60">
              {loading && <Loader2 size={14} className="animate-spin" />}
              Create Campaign
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Campaign Detail with live stats ─────────────────────────────────────────
function CampaignDetail({ campaign, onBack, onRefresh }) {
  const [stats, setStats]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    campaigns.getStats(campaign.id)
      .then((res) => setStats(res.data))
      .catch(() => setStats({
        total: 0,
        sent: campaign.sentCount || 0,
        delivered: campaign.deliveredCount || 0,
        read: campaign.readCount || 0,
        failed: campaign.failedCount || 0,
        deliveryRate: 0,
        readRate: 0,
      }))
      .finally(() => setLoading(false));
  }, [campaign.id]);

  const s = stats || {};
  const pct = (a, b) => (b > 0 ? ((a / b) * 100).toFixed(1) : '0');
  const chartData = [
    { name: 'Sent',      value: s.sent      || 0, color: '#6366f1' },
    { name: 'Delivered', value: s.delivered || 0, color: '#25D366' },
    { name: 'Read',      value: s.read      || 0, color: '#0ea5e9' },
    { name: 'Failed',    value: s.failed    || 0, color: '#ef4444' },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800">
          <ArrowLeft size={16} /> Back
        </button>
        <button onClick={onRefresh} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600">
          <RefreshCw size={12} /> Refresh stats
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-800">{campaign.name}</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Template: <span className="font-mono">{campaign.template?.name || '—'}</span>
            </p>
            <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
              <Users size={12} />
              {AUDIENCE_LABELS[campaign.audienceType] || campaign.audienceType}
              {campaign._count?.recipients > 0 && ` · ${campaign._count.recipients} recipients`}
            </div>
          </div>
          <StatusBadge status={campaign.status} />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={22} className="animate-spin text-[#25D366]" />
          </div>
        ) : (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { label: 'Sent',      value: s.sent || 0,      sub: '',                                  color: 'text-indigo-600' },
                { label: 'Delivered', value: s.delivered || 0, sub: `${pct(s.delivered, s.sent)}%`,       color: 'text-green-600' },
                { label: 'Read',      value: s.read || 0,      sub: `${pct(s.read, s.delivered)}% of dlv`, color: 'text-blue-600' },
                { label: 'Failed',    value: s.failed || 0,    sub: `${pct(s.failed, s.sent)}%`,          color: 'text-red-500' },
              ].map((card) => (
                <div key={card.label} className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{card.label}</p>
                  {card.sub && <p className="text-[10px] text-gray-400">{card.sub}</p>}
                </div>
              ))}
            </div>

            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </>
        )}

        {campaign.scheduledAt && (
          <p className="mt-4 text-xs text-gray-400 flex items-center gap-1">
            <Clock size={11} />
            Scheduled: {format(new Date(campaign.scheduledAt), 'MMM dd yyyy, HH:mm')}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function CampaignsPage() {
  const [campaignList, setCampaignList] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [showModal,    setShowModal]    = useState(false);
  const [selected,     setSelected]     = useState(null);
  const [toast,        setToast]        = useState(null);
  const [actingId,     setActingId]     = useState(null);

  const showToast = (msg, type = 'success') => setToast({ msg, type });

  const loadCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await campaigns.list();
      const data = res.data?.data || res.data || [];
      setCampaignList(Array.isArray(data) ? data : []);
    } catch (e) {
      showToast(e.response?.data?.message || 'Failed to load campaigns', 'error');
      setCampaignList([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadCampaigns(); }, [loadCampaigns]);

  const handleLaunch = async (id) => {
    setActingId(id);
    try {
      await campaigns.launch(id);
      showToast('Campaign launched');
      loadCampaigns();
    } catch (e) {
      showToast(e.response?.data?.message || 'Failed to launch', 'error');
    } finally {
      setActingId(null);
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this campaign?')) return;
    setActingId(id);
    try {
      await campaigns.cancel(id);
      showToast('Campaign cancelled');
      loadCampaigns();
    } catch (e) {
      showToast(e.response?.data?.message || 'Failed to cancel', 'error');
    } finally {
      setActingId(null);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this campaign?')) return;
    setActingId(id);
    try {
      await campaigns.remove(id);
      showToast('Campaign deleted');
      loadCampaigns();
    } catch (e) {
      showToast(e.response?.data?.message || 'Failed to delete', 'error');
    } finally {
      setActingId(null);
    }
  };

  // If a campaign is selected, refresh it from the list after reload
  const refreshSelected = () => {
    if (!selected) return;
    loadCampaigns().then(() => {
      setCampaignList((prev) => {
        const updated = prev.find((c) => c.id === selected.id);
        if (updated) setSelected(updated);
        return prev;
      });
    });
  };

  if (selected) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-5">
        <CampaignDetail
          campaign={selected}
          onBack={() => setSelected(null)}
          onRefresh={refreshSelected}
        />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      {showModal && (
        <CampaignModal
          onClose={() => setShowModal(false)}
          onSaved={(msg) => { showToast(msg); loadCampaigns(); }}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Campaigns</h1>
          <p className="text-sm text-gray-500 mt-0.5">{campaignList.length} campaigns</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-[#25D366] text-white rounded-lg hover:bg-[#128C7E] transition-colors"
        >
          <Plus size={14} />
          New Campaign
        </button>
      </div>

      {/* Info */}
      <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700 flex items-start gap-2">
        <AlertCircle size={13} className="mt-0.5 flex-shrink-0" />
        Campaigns send an approved WhatsApp template to a group of guests. Create a campaign in DRAFT, then click Launch to send.
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={28} className="animate-spin text-[#25D366]" />
          </div>
        ) : campaignList.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <Send size={32} className="mx-auto mb-3 opacity-30" />
            <p>No campaigns yet. Create your first campaign.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Campaign</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Template</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Audience</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Scheduled</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">Sent</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">Delivered</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">Read</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">Failed</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {campaignList.map((c) => {
                  const status = (c.status || '').toUpperCase();
                  const isActing = actingId === c.id;
                  return (
                    <tr
                      key={c.id}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => setSelected(c)}
                    >
                      <td className="px-4 py-3 font-medium text-gray-800">{c.name}</td>
                      <td className="px-4 py-3 text-gray-600 font-mono text-xs">
                        {c.template?.name || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1 text-gray-600 text-xs">
                          <Users size={11} />
                          {AUDIENCE_LABELS[c.audienceType] || c.audienceType}
                          {c._count?.recipients > 0 && ` (${c._count.recipients})`}
                        </span>
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                      <td className="px-4 py-3 text-gray-600 text-xs">
                        {c.scheduledAt ? (
                          <span className="flex items-center gap-1">
                            <Clock size={11} />
                            {format(new Date(c.scheduledAt), 'MMM dd, HH:mm')}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">{c.sentCount      ?? 0}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{c.deliveredCount ?? 0}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{c.readCount      ?? 0}</td>
                      <td className="px-4 py-3 text-right text-red-500">{c.failedCount     ?? 0}</td>
                      <td className="px-4 py-3">
                        <div
                          className="flex items-center justify-end gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {isActing ? (
                            <Loader2 size={14} className="animate-spin text-gray-400 mx-2" />
                          ) : (
                            <>
                              {(status === 'DRAFT' || status === 'SCHEDULED') && (
                                <button
                                  onClick={() => handleLaunch(c.id)}
                                  className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                  title="Launch"
                                >
                                  <Play size={14} />
                                </button>
                              )}
                              {(status === 'RUNNING' || status === 'SCHEDULED') && (
                                <button
                                  onClick={() => handleCancel(c.id)}
                                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Cancel"
                                >
                                  <StopCircle size={14} />
                                </button>
                              )}
                              <button
                                onClick={() => setSelected(c)}
                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="View stats"
                              >
                                <BarChart2 size={14} />
                              </button>
                              {(status === 'DRAFT' || status === 'CANCELLED' || status === 'FAILED') && (
                                <button
                                  onClick={() => handleDelete(c.id)}
                                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
