import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Search, Plus, Upload, Tag, ChevronLeft, ChevronRight,
  X, Loader2, Edit2, Trash2, RefreshCw, AlertCircle, CheckCircle, Send
} from 'lucide-react';
import { guests, hotels, messages, templates } from '../api/index.js';
import { format } from 'date-fns';

// ─── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className={`fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${
      type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
    }`}>
      {type === 'success' ? <CheckCircle size={16} className="text-green-600" /> : <AlertCircle size={16} className="text-red-600" />}
      {message}
      <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100"><X size={14} /></button>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function StayBadge({ status }) {
  const map = {
    ARRIVING: { bg: 'bg-blue-100 text-blue-700', label: 'Arriving' },
    IN_HOUSE: { bg: 'bg-green-100 text-green-700', label: 'In House' },
    CHECKED_OUT: { bg: 'bg-gray-100 text-gray-600', label: 'Checked Out' },
    NO_STAY: { bg: 'bg-gray-100 text-gray-500', label: 'No Stay' },
  };
  const s = map[(status || '').toUpperCase()];
  if (!s) return <span className="text-xs text-gray-400">—</span>;
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.bg}`}>{s.label}</span>
  );
}

function TagPill({ tag }) {
  const style = tag.color
    ? { backgroundColor: tag.color + '22', color: tag.color, borderColor: tag.color + '44' }
    : {};
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium border"
      style={style}
    >
      <Tag size={9} />
      {tag.name}
    </span>
  );
}

function fmtDate(d) {
  if (!d) return '—';
  try { return format(new Date(d), 'MMM d, yyyy'); } catch { return d; }
}

// ─── Guest Modal ───────────────────────────────────────────────────────────────
const BLANK_FORM = {
  name: '', phone: '', email: '', roomNumber: '',
  stayStatus: 'NO_STAY', checkInDate: '', checkOutDate: '', optIn: true,
};

function GuestModal({ guest, onClose, onSaved, showToast }) {
  const isEdit = !!guest?.id;
  const [form, setForm] = useState(isEdit ? {
    name: guest.name || '',
    phone: guest.phone || '',
    email: guest.email || '',
    roomNumber: guest.roomNumber || '',
    stayStatus: guest.stayStatus || 'NO_STAY',
    checkInDate: guest.checkInDate ? guest.checkInDate.substring(0, 10) : '',
    checkOutDate: guest.checkOutDate ? guest.checkOutDate.substring(0, 10) : '',
    optIn: guest.optIn ?? true,
  } : { ...BLANK_FORM });
  const [saving, setSaving] = useState(false);

  const setField = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.phone) { showToast('Name and phone are required', 'error'); return; }

    // Normalize phone to E.164: strip spaces, ensure leading +
    let normalizedPhone = form.phone.trim().replace(/\s+/g, '');
    if (normalizedPhone && !normalizedPhone.startsWith('+')) {
      normalizedPhone = '+' + normalizedPhone;
    }
    const payload = { ...form, phone: normalizedPhone };

    setSaving(true);
    try {
      if (isEdit) {
        await guests.update(guest.id, payload);
        showToast('Guest updated', 'success');
      } else {
        await guests.create(payload);
        showToast('Guest created', 'success');
      }
      onSaved();
      onClose();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save guest', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-800">{isEdit ? 'Edit Guest' : 'New Guest'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Full Name <span className="text-red-500">*</span></label>
              <input value={form.name} onChange={(e) => setField('name', e.target.value)} required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#25D366]" placeholder="John Smith" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Phone <span className="text-red-500">*</span></label>
              <input value={form.phone} onChange={(e) => setField('phone', e.target.value)} required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#25D366]" placeholder="917812345678" />
              <p className="text-[10px] text-gray-400 mt-0.5">With or without +, e.g. 917812345678</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={form.email} onChange={(e) => setField('email', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#25D366]" placeholder="john@example.com" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Room Number</label>
              <input value={form.roomNumber} onChange={(e) => setField('roomNumber', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#25D366]" placeholder="301" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Stay Status</label>
              <select value={form.stayStatus} onChange={(e) => setField('stayStatus', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#25D366]">
                <option value="NO_STAY">No Stay</option>
                <option value="ARRIVING">Arriving</option>
                <option value="IN_HOUSE">In House</option>
                <option value="CHECKED_OUT">Checked Out</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Check-in Date</label>
              <input type="date" value={form.checkInDate} onChange={(e) => setField('checkInDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#25D366]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Check-out Date</label>
              <input type="date" value={form.checkOutDate} onChange={(e) => setField('checkOutDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#25D366]" />
            </div>
            <div className="flex items-center gap-2 pt-4">
              <input type="checkbox" id="optIn" checked={form.optIn} onChange={(e) => setField('optIn', e.target.checked)}
                className="w-4 h-4 rounded accent-[#25D366]" />
              <label htmlFor="optIn" className="text-xs text-gray-700 font-medium">WhatsApp Opt-in</label>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#25D366] text-white rounded-lg text-sm font-medium hover:bg-[#128C7E] disabled:opacity-50 transition-colors">
              {saving ? <Loader2 size={14} className="animate-spin" /> : null}
              {isEdit ? 'Save Changes' : 'Create Guest'}
            </button>
            <button type="button" onClick={onClose}
              className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Delete Confirm ────────────────────────────────────────────────────────────
function DeleteConfirm({ guest, onClose, onDeleted, showToast }) {
  const [deleting, setDeleting] = useState(false);
  const handleDelete = async () => {
    setDeleting(true);
    try {
      await guests.remove(guest.id);
      showToast('Guest deleted', 'success');
      onDeleted();
      onClose();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete guest', 'error');
    } finally {
      setDeleting(false);
    }
  };
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-2">Delete Guest</h2>
        <p className="text-sm text-gray-600 mb-5">
          Are you sure you want to delete <span className="font-medium">{guest.name}</span>? This cannot be undone.
        </p>
        <div className="flex gap-2">
          <button onClick={handleDelete} disabled={deleting}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50">
            {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            Delete
          </button>
          <button onClick={onClose} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">Cancel</button>
        </div>
      </div>
    </div>
  );
}

function SendMessageModal({ guest, onClose, onSent, showToast }) {
  const [mode, setMode] = useState('custom');
  const [message, setMessage] = useState('');
  const [templatesList, setTemplatesList] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [hotel, setHotel] = useState(null);
  const [variables, setVariables] = useState({});
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    Promise.all([templates.list({ status: 'APPROVED', limit: 100 }), hotels.get()])
      .then(([tplRes, hotelRes]) => {
        const tplData = tplRes.data?.data || tplRes.data || [];
        setTemplatesList(Array.isArray(tplData) ? tplData : []);
        setSelectedTemplate((Array.isArray(tplData) ? tplData[0] : null) || null);

        const hotelData = hotelRes.data?.data || hotelRes.data || {};
        setHotel(hotelData);
      })
      .catch(() => {
        setTemplatesList([]);
        setHotel(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const extractVariables = (tpl) => {
    if (!tpl) return [];
    const text = [tpl.headerText, tpl.bodyText, tpl.footerText].join(' ');
    const matches = [...new Set(text.match(/{{(\d+)}}/g) || [])];
    return matches.sort((a, b) => {
      const ai = Number(a.replace(/[^0-9]/g, ''));
      const bi = Number(b.replace(/[^0-9]/g, ''));
      return ai - bi;
    });
  };

  const shouldAutoFillAddress = useMemo(() => {
    if (!selectedTemplate) return false;
    const text = [selectedTemplate.headerText, selectedTemplate.bodyText, selectedTemplate.footerText].join(' ').toLowerCase();
    const addressKeywords = /(address|location|street|road|drive|lane|avenue|boulevard|map|website|site|hotel|direction|directions)/;
    const nonAddressKeywords = /(review|feedback|link|share|rate|survey|google|click)/;
    const regex = /{{\s*3\s*}}/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
      const start = Math.max(0, match.index - 40);
      const end = Math.min(text.length, match.index + match[0].length + 40);
      const context = text.slice(start, end);
      if (nonAddressKeywords.test(context)) return false;
      if (addressKeywords.test(context)) return true;
    }
    return false;
  }, [selectedTemplate]);

  const varKeys = extractVariables(selectedTemplate);

  const autoVariableDefaults = useMemo(() => ({
    '1': guest.name || '',
    '2': hotel?.name || '',
    '3': hotel?.settings?.address || hotel?.website || hotel?.settings?.website || '',
    '4': hotel?.settings?.direction || '',
  }), [guest.name, hotel]);

  const autoVariableKeys = varKeys
    .map((key) => key.replace(/[{}]/g, ''))
    .filter((idx) => {
      if (idx === '3') {
        return shouldAutoFillAddress && Boolean(autoVariableDefaults[idx]);
      }
      return ['1', '2', '4'].includes(idx) && autoVariableDefaults[idx];
    });

  const manualVariableKeys = varKeys.filter((key) => {
    const idx = key.replace(/[{}]/g, '');
    if (idx === '3') {
      return !shouldAutoFillAddress || !autoVariableDefaults[idx];
    }
    return !['1', '2', '4'].includes(idx) || !autoVariableDefaults[idx];
  });

  const handleSend = async (e) => {
    e.preventDefault();
    setError('');
    if (mode === 'custom') {
      if (!message.trim()) {
        setError('Please enter a message to send');
        return;
      }
      setSending(true);
      try {
        await messages.sendToNumber(guest.phone, message.trim());
        showToast('Message sent', 'success');
        onSent();
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to send message');
      } finally {
        setSending(false);
      }
      return;
    }

    if (!selectedTemplate) {
      setError('Select a template first');
      return;
    }

    const payload = {};
    for (const key of varKeys) {
      const idx = key.replace(/[{}]/g, '');
      if (autoVariableDefaults[idx]) {
        payload[idx] = autoVariableDefaults[idx];
        continue;
      }
      if (!variables[idx]?.trim()) {
        setError(`Please fill in variable ${key}`);
        return;
      }
      payload[idx] = variables[idx].trim();
    }

    setSending(true);
    try {
      await messages.sendTemplateToNumber(guest.phone, {
        templateId: selectedTemplate.id,
        variableValues: payload,
      });
      showToast('Template sent', 'success');
      onSent();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send template');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-base font-semibold text-gray-800">Send message to {guest.name || guest.phone}</h2>
            <p className="text-xs text-gray-500">Choose a custom text or an approved template.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode('custom')}
              className={`px-4 py-2 rounded-xl text-sm font-medium ${mode === 'custom' ? 'bg-[#25D366] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              Custom Message
            </button>
            <button
              type="button"
              onClick={() => setMode('template')}
              className={`px-4 py-2 rounded-xl text-sm font-medium ${mode === 'template' ? 'bg-[#25D366] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              Template
            </button>
          </div>
          {mode === 'custom' ? (
            <div className="space-y-3">
              <label className="text-xs font-medium text-gray-700">Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                className="w-full px-4 py-3 border border-gray-300 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#25D366] resize-none"
                placeholder="Type your message here..."
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-700">Template</label>
                <div className="mt-2">
                  <select
                    value={selectedTemplate?.id || ''}
                    onChange={(e) => {
                      const tpl = templatesList.find((t) => t.id === e.target.value);
                      setSelectedTemplate(tpl);
                      setVariables({});
                      setError('');
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#25D366]"
                  >
                    <option value="">Select a template</option>
                    {templatesList.map((tpl) => (
                      <option key={tpl.id} value={tpl.id}>{tpl.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              {selectedTemplate && (
                <div className="space-y-3">
                  <div className="bg-gray-50 rounded-2xl p-4 text-sm text-gray-700 whitespace-pre-wrap">
                    <div className="font-semibold mb-2">Preview</div>
                    <div>{(selectedTemplate.bodyText || '').replace(/{{(\d+)}}/g, '{{ $1 }}')}</div>
                  </div>
                  {autoVariableKeys.length > 0 && (
                    <div className="rounded-2xl border border-green-100 bg-green-50 p-4 space-y-3">
                      <div className="font-semibold text-sm text-gray-700">Auto-filled values</div>
                      {autoVariableKeys.map((idx) => (
                        <div key={idx} className="text-sm text-gray-700">
                          <div className="font-medium">
                            {idx === '1'
                              ? 'Guest name'
                              : idx === '2'
                              ? 'Hotel name'
                              : idx === '3'
                              ? 'Hotel address / URL'
                              : 'Direction'}
                          </div>
                          <div className="mt-1 break-words">{autoVariableDefaults[idx]}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  {manualVariableKeys.length > 0 && (
                    <div className="space-y-3">
                      {manualVariableKeys.map((key) => {
                        const idx = key.replace(/[{}]/g, '');
                        return (
                          <div key={key}>
                            <label className="block text-xs text-gray-600 mb-1">Variable {key}</label>
                            <input
                              value={variables[idx] || ''}
                              onChange={(e) => setVariables((prev) => ({ ...prev, [idx]: e.target.value }))}
                              className="w-full px-4 py-3 border border-gray-300 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#25D366]"
                              placeholder={`Value for ${key}`}
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          {error && (
            <div className="p-3 rounded-xl bg-red-50 text-red-700 text-sm border border-red-200">{error}</div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
          <button
            onClick={handleSend}
            disabled={sending || (mode === 'custom' ? !message.trim() : !selectedTemplate)}
            className="flex items-center gap-2 px-4 py-2 bg-[#25D366] text-white rounded-lg text-sm font-medium hover:bg-[#128C7E] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            {mode === 'custom' ? 'Send Message' : 'Send Template'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────
const STATUS_FILTERS = ['ALL', 'ARRIVING', 'IN_HOUSE', 'CHECKED_OUT'];

export default function ContactsPage() {
  const [guestList, setGuestList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });
  const [toast, setToast] = useState(null);
  const [editGuest, setEditGuest] = useState(null);   // null=closed, {} = new, guest obj = edit
  const [deleteGuest, setDeleteGuest] = useState(null);
  const [sendGuest, setSendGuest] = useState(null);
  const [importing, setImporting] = useState(false);
  const csvRef = useRef(null);
  const LIMIT = 20;

  const showToast = (message, type = 'success') => setToast({ message, type });

  const loadGuests = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT };
      if (search) params.search = search;
      if (statusFilter !== 'ALL') params.stayStatus = statusFilter;
      const res = await guests.list(params);
      const data = res.data?.data || res.data || [];
      const m = res.data?.meta || {};
      setGuestList(Array.isArray(data) ? data : []);
      setMeta({ total: m.total || 0, totalPages: m.totalPages || 1 });
    } catch (err) {
      showToast('Failed to load guests', 'error');
      setGuestList([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => { setPage(1); }, [search, statusFilter]);
  useEffect(() => { loadGuests(); }, [loadGuests]);

  const handleCsvImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await guests.importCsv(fd);
      const count = res.data?.imported || res.data?.count || '?';
      showToast(`Imported ${count} guests`, 'success');
      loadGuests();
    } catch (err) {
      showToast(err.response?.data?.message || 'Import failed', 'error');
    } finally {
      setImporting(false);
      if (csvRef.current) csvRef.current.value = '';
    }
  };

  const totalPages = meta.totalPages || 1;

  return (
    <div className="p-6 max-w-7xl mx-auto flex flex-col h-full">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      {editGuest !== null && (
        <GuestModal
          guest={editGuest?.id ? editGuest : null}
          onClose={() => setEditGuest(null)}
          onSaved={loadGuests}
          showToast={showToast}
        />
      )}
      {deleteGuest && (
        <DeleteConfirm
          guest={deleteGuest}
          onClose={() => setDeleteGuest(null)}
          onDeleted={loadGuests}
          showToast={showToast}
        />
      )}
      {sendGuest && (
        <SendMessageModal
          guest={sendGuest}
          onClose={() => setSendGuest(null)}
          onSent={() => setSendGuest(null)}
          showToast={showToast}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Contacts</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {meta.total > 0 ? `${meta.total} guest${meta.total !== 1 ? 's' : ''}` : 'Manage your hotel guests'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadGuests}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw size={16} />
          </button>
          <label className={`flex items-center gap-1.5 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 cursor-pointer transition-colors ${importing ? 'opacity-50 pointer-events-none' : ''}`}>
            {importing ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            Import CSV
            <input ref={csvRef} type="file" accept=".csv" className="hidden" onChange={handleCsvImport} />
          </label>
          <button
            onClick={() => setEditGuest({})}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#25D366] text-white rounded-lg text-sm font-medium hover:bg-[#128C7E] transition-colors"
          >
            <Plus size={14} />
            Add Guest
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, phone, email..."
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#25D366]"
          />
        </div>
        <div className="flex gap-1">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                statusFilter === s ? 'bg-[#25D366] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {s === 'ALL' ? 'All' : s === 'IN_HOUSE' ? 'In House' : s === 'CHECKED_OUT' ? 'Checked Out' : 'Arriving'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Phone</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Stay Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Check-in</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Check-out</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Room</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Tags</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center">
                    <Loader2 size={24} className="animate-spin text-[#25D366] mx-auto" />
                  </td>
                </tr>
              ) : guestList.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-gray-400">
                    <div className="flex flex-col items-center gap-2">
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-30">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                      </svg>
                      <p className="text-sm">No guests found</p>
                      <p className="text-xs">Add guests manually or import a CSV file</p>
                    </div>
                  </td>
                </tr>
              ) : (
                guestList.map((guest) => (
                  <tr key={guest.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#25D366] to-[#128C7E] flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                          {(guest.name || '?').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800 text-sm">{guest.name || '—'}</p>
                          {guest.optIn === false && (
                            <span className="text-[10px] text-red-500 font-medium">Opted out</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 font-mono text-xs">{guest.phone || '—'}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs truncate max-w-[160px]">{guest.email || '—'}</td>
                    <td className="px-4 py-3"><StayBadge status={guest.stayStatus} /></td>
                    <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">{fmtDate(guest.checkInDate)}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">{fmtDate(guest.checkOutDate)}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{guest.roomNumber || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(guest.guestTags || []).map((gt, i) =>
                          gt.tag ? <TagPill key={gt.tag.id || i} tag={gt.tag} /> : null
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setSendGuest(guest)}
                          className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Send message"
                        >
                          <Send size={14} />
                        </button>
                        <button
                          onClick={() => setEditGuest(guest)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteGuest(guest)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && guestList.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
            <p className="text-xs text-gray-500">
              Page {page} of {totalPages} &nbsp;&middot;&nbsp; {meta.total} total guests
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pg = i + 1;
                if (totalPages > 5) {
                  if (page <= 3) pg = i + 1;
                  else if (page >= totalPages - 2) pg = totalPages - 4 + i;
                  else pg = page - 2 + i;
                }
                return (
                  <button
                    key={pg}
                    onClick={() => setPage(pg)}
                    className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${
                      pg === page ? 'bg-[#25D366] text-white' : 'text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {pg}
                  </button>
                );
              })}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
