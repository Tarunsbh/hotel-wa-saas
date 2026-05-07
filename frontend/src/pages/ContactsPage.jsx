import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Search, Plus, Upload, Tag, ChevronLeft, ChevronRight,
  X, Loader2, Edit2, Trash2, RefreshCw, AlertCircle,
  CheckCircle, Send, Users, Phone, Mail, Calendar,
  BedDouble, MoreVertical, Filter,
} from 'lucide-react';
import { guests, hotels, messages, templates } from '../api/index.js';
import { format } from 'date-fns';

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className={`fixed top-[72px] right-4 z-[60] flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl text-sm font-medium max-w-[calc(100vw-2rem)] border backdrop-blur-sm animate-in slide-in-from-top-2
      ${type === 'success'
        ? 'bg-emerald-50 text-emerald-800 border-emerald-100'
        : 'bg-red-50 text-red-800 border-red-100'
      }`}
    >
      {type === 'success'
        ? <CheckCircle size={15} className="text-emerald-500 flex-shrink-0" />
        : <AlertCircle size={15} className="text-red-500 flex-shrink-0" />
      }
      <span className="flex-1">{message}</span>
      <button onClick={onClose} className="opacity-50 hover:opacity-100 transition-opacity ml-1">
        <X size={13} />
      </button>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const STAY_MAP = {
  ARRIVING:    { label: 'Arriving',    cls: 'bg-blue-50 text-blue-600 border-blue-100' },
  IN_HOUSE:    { label: 'In House',    cls: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
  CHECKED_OUT: { label: 'Checked Out', cls: 'bg-gray-50 text-gray-500 border-gray-100' },
  NO_STAY:     { label: 'No Stay',     cls: 'bg-gray-50 text-gray-400 border-gray-100' },
};

function StayBadge({ status }) {
  const s = STAY_MAP[(status || '').toUpperCase()];
  if (!s) return <span className="text-xs text-gray-300">—</span>;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide border ${s.cls}`}>
      {s.label}
    </span>
  );
}

function TagPill({ tag }) {
  const style = tag.color
    ? { backgroundColor: tag.color + '18', color: tag.color, borderColor: tag.color + '33' }
    : { backgroundColor: '#f3f4f6', color: '#6b7280', borderColor: '#e5e7eb' };
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium border" style={style}>
      <Tag size={8} />
      {tag.name}
    </span>
  );
}

function Avatar({ name, size = 8 }) {
  const initials = String(name || '?').charAt(0).toUpperCase();
  return (
    <div className={`w-${size} h-${size} rounded-xl bg-gradient-to-br from-[#25D366] to-[#075E54] flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-sm shadow-[#25D366]/20`}>
      {initials}
    </div>
  );
}

function fmtDate(d) {
  if (!d) return '—';
  try { return format(new Date(d), 'MMM d, yyyy'); } catch { return d; }
}

// ─── Input helper ─────────────────────────────────────────────────────────────
function Field({ label, required, children, hint }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1.5">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      {children}
      {hint && <p className="text-[10px] text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

const inputCls = 'w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm bg-white text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#25D366]/30 focus:border-[#25D366] transition-all';
const selectCls = `${inputCls} cursor-pointer`;

// ─── Guest Modal (Create / Edit) ──────────────────────────────────────────────
const BLANK = {
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
  } : { ...BLANK });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) {
      showToast('Name and phone are required', 'error');
      return;
    }
    let phone = form.phone.trim().replace(/\s+/g, '');
    if (!phone.startsWith('+')) phone = '+' + phone;

    setSaving(true);
    try {
      if (isEdit) {
        await guests.update(guest.id, { ...form, phone });
        showToast('Guest updated', 'success');
      } else {
        await guests.create({ ...form, phone });
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900">{isEdit ? 'Edit Guest' : 'New Guest'}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{isEdit ? 'Update guest details' : 'Add a guest to your contacts'}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-5 py-5 overflow-y-auto max-h-[75vh]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Full Name" required>
              <input value={form.name} onChange={(e) => set('name', e.target.value)} required
                className={inputCls} placeholder="John Smith" />
            </Field>

            <Field label="Phone Number" required hint="With country code, e.g. +917812345678">
              <div className="relative">
                <Phone size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300" />
                <input value={form.phone} onChange={(e) => set('phone', e.target.value)} required
                  className={`${inputCls} pl-9`} placeholder="+917812345678" />
              </div>
            </Field>

            <Field label="Email">
              <div className="relative">
                <Mail size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300" />
                <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)}
                  className={`${inputCls} pl-9`} placeholder="john@example.com" />
              </div>
            </Field>

            <Field label="Room Number">
              <div className="relative">
                <BedDouble size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300" />
                <input value={form.roomNumber} onChange={(e) => set('roomNumber', e.target.value)}
                  className={`${inputCls} pl-9`} placeholder="301" />
              </div>
            </Field>

            <Field label="Stay Status">
              <select value={form.stayStatus} onChange={(e) => set('stayStatus', e.target.value)} className={selectCls}>
                <option value="NO_STAY">No Stay</option>
                <option value="ARRIVING">Arriving</option>
                <option value="IN_HOUSE">In House</option>
                <option value="CHECKED_OUT">Checked Out</option>
              </select>
            </Field>

            <Field label="Check-in Date">
              <div className="relative">
                <Calendar size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
                <input type="date" value={form.checkInDate} onChange={(e) => set('checkInDate', e.target.value)}
                  className={`${inputCls} pl-9`} />
              </div>
            </Field>

            <Field label="Check-out Date">
              <div className="relative">
                <Calendar size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
                <input type="date" value={form.checkOutDate} onChange={(e) => set('checkOutDate', e.target.value)}
                  className={`${inputCls} pl-9`} />
              </div>
            </Field>

            <div className="sm:col-span-2 flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
              <input
                type="checkbox"
                id="optIn"
                checked={form.optIn}
                onChange={(e) => set('optIn', e.target.checked)}
                className="w-4 h-4 rounded accent-[#25D366] cursor-pointer"
              />
              <label htmlFor="optIn" className="flex-1 cursor-pointer">
                <p className="text-sm font-medium text-gray-700">WhatsApp Opt-in</p>
                <p className="text-xs text-gray-400">Guest has agreed to receive WhatsApp messages</p>
              </label>
            </div>
          </div>

          <div className="flex gap-2.5 mt-5 pt-4 border-t border-gray-100">
            <button type="submit" disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#25D366] text-white rounded-xl text-sm font-semibold hover:bg-[#128C7E] disabled:opacity-50 transition-all shadow-sm shadow-[#25D366]/30">
              {saving && <Loader2 size={14} className="animate-spin" />}
              {isEdit ? 'Save Changes' : 'Create Guest'}
            </button>
            <button type="button" onClick={onClose}
              className="px-5 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Delete Confirm ───────────────────────────────────────────────────────────
function DeleteConfirm({ guest, onClose, onDeleted, showToast }) {
  const [deleting, setDeleting] = useState(false);
  const handle = async () => {
    setDeleting(true);
    try {
      await guests.remove(guest.id);
      showToast('Guest deleted', 'success');
      onDeleted();
      onClose();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete', 'error');
      setDeleting(false);
    }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
          <Trash2 size={20} className="text-red-500" />
        </div>
        <h2 className="text-base font-bold text-gray-900 mb-1">Delete Guest</h2>
        <p className="text-sm text-gray-500 mb-5">
          Remove <span className="font-semibold text-gray-700">{guest.name}</span> from your contacts? This action cannot be undone.
        </p>
        <div className="flex gap-2.5">
          <button onClick={handle} disabled={deleting}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-500 text-white rounded-xl text-sm font-semibold hover:bg-red-600 disabled:opacity-50 transition-colors">
            {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            Delete
          </button>
          <button onClick={onClose} className="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Send Message Modal ───────────────────────────────────────────────────────
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
        setSelectedTemplate(Array.isArray(tplData) && tplData[0] ? tplData[0] : null);
        setHotel(hotelRes.data?.data || hotelRes.data || {});
      })
      .catch(() => { setTemplatesList([]); setHotel(null); })
      .finally(() => setLoading(false));
  }, []);

  const extractVariables = (tpl) => {
    if (!tpl) return [];
    const text = [tpl.headerText, tpl.bodyText, tpl.footerText].join(' ');
    return [...new Set(text.match(/{{(\d+)}}/g) || [])].sort((a, b) =>
      Number(a.replace(/\D/g, '')) - Number(b.replace(/\D/g, ''))
    );
  };

  const autoDefaults = useMemo(() => ({
    '1': guest.name || '',
    '2': hotel?.name || '',
    '3': hotel?.settings?.address || hotel?.website || '',
    '4': hotel?.settings?.direction || '',
  }), [guest.name, hotel]);

  const varKeys = extractVariables(selectedTemplate);
  const manualKeys = varKeys.filter((k) => {
    const idx = k.replace(/\D/g, '');
    return !autoDefaults[idx];
  });

  const handleSend = async (e) => {
    e.preventDefault();
    setError('');

    if (mode === 'custom') {
      if (!message.trim()) { setError('Please enter a message'); return; }
      setSending(true);
      try {
        await messages.sendToNumber(guest.phone, message.trim());
        showToast('Message sent', 'success');
        onSent();
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to send');
      } finally { setSending(false); }
      return;
    }

    if (!selectedTemplate) { setError('Select a template'); return; }
    const payload = {};
    for (const key of varKeys) {
      const idx = key.replace(/\D/g, '');
      payload[idx] = autoDefaults[idx] || variables[idx]?.trim() || '';
      if (!payload[idx]) { setError(`Fill in variable ${key}`); return; }
    }
    setSending(true);
    try {
      await messages.sendTemplateToNumber(guest.phone, { templateId: selectedTemplate.id, variableValues: payload });
      showToast('Template sent', 'success');
      onSent();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send');
    } finally { setSending(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900">Send Message</h2>
            <p className="text-xs text-gray-400 mt-0.5">to {guest.name || guest.phone}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4 overflow-y-auto max-h-[65vh]">
          {/* Mode toggle */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
            {['custom', 'template'].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all capitalize ${
                  mode === m ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {m === 'custom' ? 'Custom Message' : 'Use Template'}
              </button>
            ))}
          </div>

          {mode === 'custom' ? (
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              className={`${inputCls} resize-none`}
              placeholder="Type your message here…"
            />
          ) : (
            <div className="space-y-3">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 size={20} className="animate-spin text-[#25D366]" />
                </div>
              ) : (
                <>
                  <select
                    value={selectedTemplate?.id || ''}
                    onChange={(e) => {
                      setSelectedTemplate(templatesList.find((t) => t.id === e.target.value) || null);
                      setVariables({});
                      setError('');
                    }}
                    className={selectCls}
                  >
                    <option value="">Select a template…</option>
                    {templatesList.map((tpl) => (
                      <option key={tpl.id} value={tpl.id}>{tpl.name}</option>
                    ))}
                  </select>

                  {selectedTemplate && (
                    <>
                      <div className="bg-[#ECF7F0] rounded-xl p-4 text-sm text-gray-700 border border-[#25D366]/10">
                        <p className="text-[10px] font-semibold text-[#128C7E] uppercase tracking-wider mb-2">Preview</p>
                        <p className="whitespace-pre-wrap leading-relaxed">{selectedTemplate.bodyText || ''}</p>
                      </div>
                      {manualKeys.length > 0 && (
                        <div className="space-y-2.5">
                          {manualKeys.map((key) => {
                            const idx = key.replace(/\D/g, '');
                            return (
                              <Field key={key} label={`Variable ${key}`}>
                                <input
                                  value={variables[idx] || ''}
                                  onChange={(e) => setVariables((p) => ({ ...p, [idx]: e.target.value }))}
                                  className={inputCls}
                                  placeholder={`Value for ${key}`}
                                />
                              </Field>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 text-red-600 text-sm border border-red-100">
              <AlertCircle size={14} /> {error}
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-gray-100 flex gap-2.5">
          <button onClick={onClose} className="px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={sending || (mode === 'custom' ? !message.trim() : !selectedTemplate)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#25D366] text-white rounded-xl text-sm font-semibold hover:bg-[#128C7E] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm shadow-[#25D366]/30"
          >
            {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            {mode === 'custom' ? 'Send Message' : 'Send Template'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Guest Row Actions Menu ───────────────────────────────────────────────────
function ActionsMenu({ guest, onSend, onEdit, onDelete }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
      >
        <MoreVertical size={14} />
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-30 w-40 bg-white rounded-xl border border-gray-100 shadow-xl py-1">
          {[
            { icon: Send, label: 'Send Message', action: onSend, cls: 'text-gray-700' },
            { icon: Edit2, label: 'Edit', action: onEdit, cls: 'text-gray-700' },
            { icon: Trash2, label: 'Delete', action: onDelete, cls: 'text-red-500' },
          ].map(({ icon: Icon, label, action, cls }) => (
            <button
              key={label}
              onClick={() => { action(); setOpen(false); }}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors ${cls}`}
            >
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Mobile Guest Card ────────────────────────────────────────────────────────
function GuestCard({ guest, onSend, onEdit, onDelete }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <Avatar name={guest.name} size={10} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold text-gray-900 text-sm truncate">{guest.name || '—'}</p>
            <ActionsMenu guest={guest} onSend={() => onSend(guest)} onEdit={() => onEdit(guest)} onDelete={() => onDelete(guest)} />
          </div>
          <p className="text-xs text-gray-400 font-mono mt-0.5">{guest.phone}</p>
          <div className="flex items-center flex-wrap gap-2 mt-2">
            <StayBadge status={guest.stayStatus} />
            {guest.roomNumber && (
              <span className="text-[10px] text-gray-400 flex items-center gap-1">
                <BedDouble size={9} /> Room {guest.roomNumber}
              </span>
            )}
            {guest.optIn === false && (
              <span className="text-[10px] text-red-400 font-medium">Opted out</span>
            )}
          </div>
          {(guest.checkInDate || guest.checkOutDate) && (
            <div className="flex items-center gap-3 mt-2">
              {guest.checkInDate && (
                <span className="text-[10px] text-gray-400 flex items-center gap-1">
                  <Calendar size={9} /> In: {fmtDate(guest.checkInDate)}
                </span>
              )}
              {guest.checkOutDate && (
                <span className="text-[10px] text-gray-400 flex items-center gap-1">
                  <Calendar size={9} /> Out: {fmtDate(guest.checkOutDate)}
                </span>
              )}
            </div>
          )}
          {(guest.guestTags || []).length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {guest.guestTags.map((gt, i) =>
                gt.tag ? <TagPill key={gt.tag.id || i} tag={gt.tag} /> : null
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState({ search, onAdd }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-4">
      <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
        <Users size={28} className="text-gray-200" />
      </div>
      <p className="text-base font-semibold text-gray-700">{search ? 'No results found' : 'No guests yet'}</p>
      <p className="text-sm text-gray-400 mt-1 mb-5 max-w-xs">
        {search
          ? `No guests matched "${search}". Try a different search.`
          : 'Add your first guest manually or import a CSV file.'}
      </p>
      {!search && (
        <button onClick={onAdd}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#25D366] text-white rounded-xl text-sm font-semibold hover:bg-[#128C7E] transition-colors shadow-sm shadow-[#25D366]/30">
          <Plus size={14} /> Add First Guest
        </button>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const STATUS_FILTERS = [
  { key: 'ALL', label: 'All' },
  { key: 'ARRIVING', label: 'Arriving' },
  { key: 'IN_HOUSE', label: 'In House' },
  { key: 'CHECKED_OUT', label: 'Checked Out' },
];

export default function ContactsPage() {
  const [guestList, setGuestList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });
  const [toast, setToast] = useState(null);
  const [editGuest, setEditGuest] = useState(null);
  const [deleteGuest, setDeleteGuest] = useState(null);
  const [sendGuest, setSendGuest] = useState(null);
  const [importing, setImporting] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
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
    } catch {
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
      showToast(`Imported ${res.data?.imported ?? '?'} guests`, 'success');
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
    <div className="flex flex-col h-full">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Modals */}
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

      {/* ── Page Header ──────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100 px-4 md:px-6 py-4 flex-shrink-0">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-lg font-bold text-gray-900">Contacts</h1>
              <p className="text-xs text-gray-400 mt-0.5">
                {meta.total > 0 ? `${meta.total.toLocaleString()} guest${meta.total !== 1 ? 's' : ''}` : 'Manage your hotel guests'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={loadGuests}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors" title="Refresh">
                <RefreshCw size={15} />
              </button>
              <label className={`hidden sm:flex items-center gap-1.5 px-3 py-2 border border-gray-200 text-gray-600 rounded-xl text-xs font-semibold hover:bg-gray-50 cursor-pointer transition-colors ${importing ? 'opacity-50 pointer-events-none' : ''}`}>
                {importing ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                Import CSV
                <input ref={csvRef} type="file" accept=".csv" className="hidden" onChange={handleCsvImport} />
              </label>
              <button
                onClick={() => setEditGuest({})}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-[#25D366] text-white rounded-xl text-xs font-semibold hover:bg-[#128C7E] transition-colors shadow-sm shadow-[#25D366]/30"
              >
                <Plus size={14} /> Add Guest
              </button>
            </div>
          </div>

          {/* Search + filters */}
          <div className="flex items-center gap-2 mt-3">
            <div className="relative flex-1">
              <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, phone, email…"
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#25D366]/30 focus:border-[#25D366] transition-all"
              />
            </div>

            {/* Status filter pills — hidden on very small, shown via toggle */}
            <div className="hidden sm:flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
              {STATUS_FILTERS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setStatusFilter(key)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    statusFilter === key
                      ? 'bg-white text-gray-800 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Mobile filter button */}
            <button
              onClick={() => setShowFilters((o) => !o)}
              className={`sm:hidden p-2 rounded-xl border transition-colors ${showFilters ? 'bg-[#25D366]/10 border-[#25D366]/20 text-[#25D366]' : 'border-gray-200 text-gray-500'}`}
            >
              <Filter size={15} />
            </button>
          </div>

          {/* Mobile filter pills */}
          {showFilters && (
            <div className="flex items-center gap-1.5 mt-2 sm:hidden overflow-x-auto pb-1">
              {STATUS_FILTERS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => { setStatusFilter(key); setShowFilters(false); }}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-full whitespace-nowrap transition-colors ${
                    statusFilter === key
                      ? 'bg-[#25D366] text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4">

          {loading ? (
            /* Skeleton */
            <div className="space-y-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gray-100" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-gray-100 rounded w-40" />
                      <div className="h-2.5 bg-gray-100 rounded w-28" />
                    </div>
                    <div className="h-4 bg-gray-100 rounded-full w-16" />
                  </div>
                </div>
              ))}
            </div>
          ) : guestList.length === 0 ? (
            <EmptyState search={search} onAdd={() => setEditGuest({})} />
          ) : (
            <>
              {/* Mobile: cards */}
              <div className="md:hidden space-y-2.5">
                {guestList.map((guest) => (
                  <GuestCard
                    key={guest.id}
                    guest={guest}
                    onSend={setSendGuest}
                    onEdit={setEditGuest}
                    onDelete={setDeleteGuest}
                  />
                ))}
              </div>

              {/* Desktop: table */}
              <div className="hidden md:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left px-5 py-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Guest</th>
                        <th className="text-left px-4 py-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Phone</th>
                        <th className="text-left px-4 py-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider hidden lg:table-cell">Email</th>
                        <th className="text-left px-4 py-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                        <th className="text-left px-4 py-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider hidden lg:table-cell">Check-in</th>
                        <th className="text-left px-4 py-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider hidden lg:table-cell">Check-out</th>
                        <th className="text-left px-4 py-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider hidden xl:table-cell">Room</th>
                        <th className="text-left px-4 py-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider hidden xl:table-cell">Tags</th>
                        <th className="px-5 py-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider text-right"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {guestList.map((guest) => (
                        <tr key={guest.id} className="hover:bg-gray-50/50 transition-colors group">
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-3">
                              <Avatar name={guest.name} size={8} />
                              <div>
                                <p className="font-semibold text-gray-800 text-sm">{guest.name || '—'}</p>
                                {guest.optIn === false && (
                                  <span className="text-[10px] text-red-400 font-medium">Opted out</span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs font-mono text-gray-500">{guest.phone}</td>
                          <td className="px-4 py-3 text-xs text-gray-400 hidden lg:table-cell truncate max-w-[160px]">{guest.email || '—'}</td>
                          <td className="px-4 py-3"><StayBadge status={guest.stayStatus} /></td>
                          <td className="px-4 py-3 text-xs text-gray-400 hidden lg:table-cell whitespace-nowrap">{fmtDate(guest.checkInDate)}</td>
                          <td className="px-4 py-3 text-xs text-gray-400 hidden lg:table-cell whitespace-nowrap">{fmtDate(guest.checkOutDate)}</td>
                          <td className="px-4 py-3 text-xs text-gray-400 hidden xl:table-cell">{guest.roomNumber || '—'}</td>
                          <td className="px-4 py-3 hidden xl:table-cell">
                            <div className="flex flex-wrap gap-1">
                              {(guest.guestTags || []).map((gt, i) =>
                                gt.tag ? <TagPill key={gt.tag.id || i} tag={gt.tag} /> : null
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => setSendGuest(guest)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-[#25D366] hover:bg-[#25D366]/10 transition-colors" title="Send message">
                                <Send size={13} />
                              </button>
                              <button onClick={() => setEditGuest(guest)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-colors" title="Edit">
                                <Edit2 size={13} />
                              </button>
                              <button onClick={() => setDeleteGuest(guest)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="Delete">
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {guestList.length > 0 && (
                  <div className="flex items-center justify-between px-5 py-3 border-t border-gray-50 bg-gray-50/50">
                    <p className="text-xs text-gray-400">
                      Page {page} of {totalPages} &middot; {meta.total.toLocaleString()} total
                    </p>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                        className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                        <ChevronLeft size={14} />
                      </button>
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pg = i + 1;
                        if (totalPages > 5) {
                          if (page <= 3) pg = i + 1;
                          else if (page >= totalPages - 2) pg = totalPages - 4 + i;
                          else pg = page - 2 + i;
                        }
                        return (
                          <button key={pg} onClick={() => setPage(pg)}
                            className={`w-7 h-7 rounded-lg text-xs font-semibold transition-colors ${
                              pg === page ? 'bg-[#25D366] text-white shadow-sm' : 'text-gray-500 hover:bg-gray-200'
                            }`}>
                            {pg}
                          </button>
                        );
                      })}
                      <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                        className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Mobile pagination */}
              {totalPages > 1 && (
                <div className="md:hidden flex items-center justify-between mt-4">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                    className="flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-600 disabled:opacity-40">
                    <ChevronLeft size={13} /> Prev
                  </button>
                  <span className="text-xs text-gray-400">{page} / {totalPages}</span>
                  <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                    className="flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-600 disabled:opacity-40">
                    Next <ChevronRight size={13} />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Mobile CSV import FAB — bottom-[88px] clears the bottom nav (52px) + iPhone home indicator (34px) + buffer */}
      <div className="md:hidden fixed right-4 z-30" style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 72px)' }}>
        <label className={`flex items-center gap-1.5 px-4 py-2.5 bg-white border border-gray-200 text-gray-600 rounded-2xl text-xs font-semibold shadow-lg cursor-pointer transition-all active:scale-95 ${importing ? 'opacity-50 pointer-events-none' : ''}`}>
          {importing ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
          Import CSV
          <input ref={csvRef} type="file" accept=".csv" className="hidden" onChange={handleCsvImport} />
        </label>
      </div>
    </div>
  );
}
