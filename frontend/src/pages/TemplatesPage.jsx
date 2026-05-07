import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Plus, RefreshCw, Search, Copy, Edit2, Trash2,
  Send, X, Loader2, Check, AlertCircle, FileText,
} from 'lucide-react';
import { templates } from '../api/index.js';

const CATEGORIES = ['All', 'UTILITY', 'MARKETING', 'AUTHENTICATION'];
const STATUSES   = ['All', 'APPROVED', 'PENDING', 'REJECTED', 'DRAFT'];

// ─── Shared styles ─────────────────────────────────────────────────────────────
const inputCls = 'w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm bg-white text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#25D366]/30 focus:border-[#25D366] transition-all';
const selectCls = `${inputCls} cursor-pointer`;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const STATUS_CLS = {
  APPROVED: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  PENDING:  'bg-amber-50 text-amber-600 border-amber-100',
  REJECTED: 'bg-red-50 text-red-500 border-red-100',
  DRAFT:    'bg-gray-50 text-gray-500 border-gray-100',
};

const CAT_CLS = {
  UTILITY:        'bg-blue-50 text-blue-600',
  MARKETING:      'bg-violet-50 text-violet-600',
  AUTHENTICATION: 'bg-orange-50 text-orange-600',
};

function StatusBadge({ status }) {
  const cls = STATUS_CLS[status] || 'bg-gray-50 text-gray-500 border-gray-100';
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide border ${cls}`}>
      {status}
    </span>
  );
}

function Toast({ msg, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed top-[72px] right-4 z-[60] flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl text-sm font-medium border max-w-[calc(100vw-2rem)]
      ${type === 'error'
        ? 'bg-red-50 text-red-700 border-red-100'
        : 'bg-emerald-50 text-emerald-700 border-emerald-100'
      }`}>
      {type === 'error' ? <AlertCircle size={14} className="text-red-500" /> : <Check size={14} className="text-emerald-500" />}
      {msg}
      <button onClick={onClose} className="ml-1 opacity-50 hover:opacity-100"><X size={12} /></button>
    </div>
  );
}

function BodyPreview({ text }) {
  if (!text) return null;
  const parts = text.split(/({{[^}]+}})/g);
  return (
    <p className="text-xs text-gray-500 line-clamp-3 leading-relaxed">
      {parts.map((p, i) =>
        /^{{.+}}$/.test(p)
          ? <span key={i} className="bg-amber-50 text-amber-700 px-1 rounded font-mono text-[10px]">{p}</span>
          : <span key={i}>{p}</span>
      )}
    </p>
  );
}

function getVariableKeys(text = '') {
  return [...new Set((text.match(/{{\s*(\d+)\s*}}/g) || []).map((m) => m.replace(/\D/g, '')))].sort((a, b) => +a - +b);
}

function renderPreview(text = '', vals = {}) {
  return String(text).replace(/{{\s*(\d+)\s*}}/g, (_, i) => vals[i] || `{{${i}}}`);
}

// ─── Field wrapper ─────────────────────────────────────────────────────────────
function Field({ label, required, hint, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1.5">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-[10px] text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

// ─── Phone Preview (WhatsApp bubble) ─────────────────────────────────────────
function PhoneBubble({ form, sampleValues }) {
  const hasContent = form.bodyText || (form.headerType === 'TEXT' && form.headerText);
  return (
    <div className="bg-[#ECF0F1] rounded-2xl p-4">
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Live Preview</p>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        {!hasContent ? (
          <p className="text-xs text-gray-300 italic">Start typing to see preview…</p>
        ) : (
          <div className="space-y-1.5">
            {form.headerType === 'TEXT' && form.headerText && (
              <p className="text-xs font-bold text-gray-800">{renderPreview(form.headerText, sampleValues)}</p>
            )}
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
              {renderPreview(form.bodyText, sampleValues) || <span className="text-gray-300 italic">Body text…</span>}
            </p>
            {form.footerText && (
              <p className="text-[11px] text-gray-400 italic mt-2">{renderPreview(form.footerText, sampleValues)}</p>
            )}
            {form.buttons?.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-1.5">
                {form.buttons.map((btn, i) => (
                  <span key={i} className="px-3 py-1 bg-[#25D366]/10 text-[#128C7E] text-xs font-medium rounded-full border border-[#25D366]/15">
                    {btn.text || 'Button'}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Create / Edit Modal ──────────────────────────────────────────────────────
function TemplateModal({ template, onClose, onSaved }) {
  const isEdit = !!template?.id;
  const [form, setForm] = useState({
    name:        template?.name       || '',
    category:    template?.category   || 'UTILITY',
    language:    template?.language   || 'en',
    headerType:  template?.headerType || 'NONE',
    headerText:  template?.headerText || '',
    bodyText:    template?.bodyText   || '',
    footerText:  template?.footerText || '',
    buttons:     template?.buttons    || [],
    submitToMeta: false,
  });
  const [sampleValues, setSampleValues] = useState({});
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const variableKeys = useMemo(
    () => getVariableKeys(`${form.headerText} ${form.bodyText} ${form.footerText}`),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form.headerText, form.bodyText, form.footerText],
  );

  useEffect(() => {
    setSampleValues((prev) => {
      const next = {};
      variableKeys.forEach((k) => { next[k] = prev[k] || ''; });
      return next;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variableKeys.join(',')]);

  const f = (field, val) => setForm((p) => ({ ...p, [field]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      if (isEdit) await templates.update(template.id, form);
      else await templates.create(form);
      onSaved(`Template ${isEdit ? 'updated' : 'created'}${form.submitToMeta && !isEdit ? ' & submitted to Meta' : ''}`);
      onClose();
    } catch (error) {
      setErr(error.response?.data?.message || 'Failed to save template');
    } finally {
      setLoading(false);
    }
  };

  const addButton = () => {
    if (form.buttons.length < 3) f('buttons', [...form.buttons, { type: 'QUICK_REPLY', text: '' }]);
  };
  const removeButton = (idx) => f('buttons', form.buttons.filter((_, i) => i !== idx));
  const updateButton = (idx, key, val) => {
    const btns = [...form.buttons];
    btns[idx] = { ...btns[idx], [key]: val };
    f('buttons', btns);
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[1080px] max-h-[90vh] flex flex-col overflow-hidden">

        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900">{isEdit ? 'Edit Template' : 'Create Template'}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{isEdit ? 'Update template details' : 'Design a new WhatsApp message template'}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto p-6">
            {err && (
              <div className="mb-4 flex items-center gap-2.5 p-3.5 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm">
                <AlertCircle size={14} className="flex-shrink-0" /> {err}
              </div>
            )}

            <div className="grid xl:grid-cols-[1fr_340px] gap-6">
              {/* Left: form fields */}
              <div className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <Field label="Template Name" required hint="Lowercase letters, numbers and underscores only">
                      <input
                        required
                        value={form.name}
                        onChange={(e) => f('name', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                        className={inputCls}
                        placeholder="e.g. pre_arrival_welcome"
                      />
                    </Field>
                  </div>
                  <Field label="Category" required>
                    <select value={form.category} onChange={(e) => f('category', e.target.value)} className={selectCls}>
                      <option value="UTILITY">Utility</option>
                      <option value="MARKETING">Marketing</option>
                      <option value="AUTHENTICATION">Authentication</option>
                    </select>
                  </Field>
                  <Field label="Language" required>
                    <select value={form.language} onChange={(e) => f('language', e.target.value)} className={selectCls}>
                      {[['en','English'],['en_US','English US'],['en_GB','English UK'],['hi','Hindi'],['ar','Arabic'],['es','Spanish'],['fr','French'],['de','German'],['pt_BR','Portuguese BR'],['zh_CN','Chinese']].map(([v,l]) => (
                        <option key={v} value={v}>{l} ({v})</option>
                      ))}
                    </select>
                  </Field>
                </div>

                {/* Header */}
                <div className="space-y-2">
                  <Field label="Header Type">
                    <select value={form.headerType} onChange={(e) => f('headerType', e.target.value)} className={selectCls}>
                      <option value="NONE">None</option>
                      <option value="TEXT">Text</option>
                    </select>
                  </Field>
                  {form.headerType === 'TEXT' && (
                    <input
                      value={form.headerText}
                      onChange={(e) => f('headerText', e.target.value)}
                      className={inputCls}
                      placeholder="Header text (max 60 chars, use {{1}} for variables)"
                      maxLength={60}
                    />
                  )}
                </div>

                {/* Body */}
                <Field label="Body" required>
                  <textarea
                    required
                    rows={6}
                    value={form.bodyText}
                    onChange={(e) => f('bodyText', e.target.value)}
                    className={`${inputCls} resize-none min-h-[160px]`}
                    placeholder="Message body. Use {{1}}, {{2}}, {{3}} for dynamic variables."
                    maxLength={1024}
                  />
                  <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                    <span>Use {'{{1}}'}, {'{{2}}'}, {'{{3}}'} for variables</span>
                    <span>{form.bodyText.length}/1024</span>
                  </div>
                </Field>

                {/* Footer */}
                <Field label="Footer">
                  <input
                    value={form.footerText}
                    onChange={(e) => f('footerText', e.target.value)}
                    className={inputCls}
                    placeholder="Optional footer (e.g. Reply STOP to unsubscribe)"
                    maxLength={60}
                  />
                </Field>

                {/* Variable samples */}
                {variableKeys.length > 0 && (
                  <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl space-y-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">Variable Samples</p>
                      <p className="text-xs text-gray-500 mt-0.5">Provide sample values so Meta can review. Don't use real personal data.</p>
                    </div>
                    {variableKeys.map((key) => (
                      <Field key={key} label={`{{${key}}}`}>
                        <input
                          value={sampleValues[key] || ''}
                          onChange={(e) => setSampleValues((p) => ({ ...p, [key]: e.target.value }))}
                          className={inputCls}
                          placeholder={`Sample for {{${key}}}`}
                        />
                      </Field>
                    ))}
                  </div>
                )}

                {/* Buttons */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-gray-600">Buttons (max 3)</span>
                    {form.buttons.length < 3 && (
                      <button type="button" onClick={addButton}
                        className="text-xs text-[#25D366] font-semibold hover:text-[#128C7E] transition-colors">
                        + Add Button
                      </button>
                    )}
                  </div>
                  <div className="space-y-2">
                    {form.buttons.map((btn, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <select value={btn.type} onChange={(e) => updateButton(idx, 'type', e.target.value)}
                          className="px-2.5 py-2 border border-gray-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#25D366]/30 flex-shrink-0">
                          <option value="QUICK_REPLY">Quick Reply</option>
                          <option value="URL">URL</option>
                          <option value="PHONE_NUMBER">Phone</option>
                        </select>
                        <input value={btn.text} onChange={(e) => updateButton(idx, 'text', e.target.value)}
                          placeholder="Button text" maxLength={20}
                          className="flex-1 px-2.5 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#25D366]/30" />
                        {btn.type === 'URL' && (
                          <input value={btn.url || ''} onChange={(e) => updateButton(idx, 'url', e.target.value)}
                            placeholder="https://…"
                            className="flex-1 px-2.5 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#25D366]/30" />
                        )}
                        {btn.type === 'PHONE_NUMBER' && (
                          <input value={btn.phoneNumber || ''} onChange={(e) => updateButton(idx, 'phoneNumber', e.target.value)}
                            placeholder="+1234567890"
                            className="flex-1 px-2.5 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#25D366]/30" />
                        )}
                        <button type="button" onClick={() => removeButton(idx)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0">
                          <X size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Submit to Meta toggle */}
                {!isEdit && (
                  <div className="flex items-start gap-3 p-4 bg-[#25D366]/6 border border-[#25D366]/15 rounded-2xl">
                    <input id="submitToMeta" type="checkbox" checked={form.submitToMeta}
                      onChange={(e) => f('submitToMeta', e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded accent-[#25D366] cursor-pointer" />
                    <label htmlFor="submitToMeta" className="cursor-pointer">
                      <p className="text-sm font-semibold text-gray-700">Submit to Meta for approval</p>
                      <p className="text-xs text-gray-500 mt-0.5">Submits the template after saving. Approval takes minutes to 24 hours.</p>
                    </label>
                  </div>
                )}
              </div>

              {/* Right: preview */}
              <div className="xl:sticky xl:top-0 xl:self-start">
                <PhoneBubble form={form} sampleValues={sampleValues} />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-gray-100 bg-gray-50/50">
            <button type="button" onClick={onClose}
              className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-[#25D366] text-white rounded-xl hover:bg-[#128C7E] disabled:opacity-60 transition-all shadow-sm shadow-[#25D366]/25">
              {loading && <Loader2 size={14} className="animate-spin" />}
              {isEdit ? 'Save Changes' : form.submitToMeta ? 'Create & Submit to Meta' : 'Create Template'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Template Card ────────────────────────────────────────────────────────────
function TemplateCard({ t, onEdit, onDuplicate, onDelete, onSubmit, submitting }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex flex-col overflow-hidden group">
      <div className="p-4 flex-1">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-800 text-sm font-mono truncate">{t.name}</p>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-semibold ${CAT_CLS[t.category] || 'bg-gray-50 text-gray-500'}`}>
                {t.category}
              </span>
              <span className="text-[10px] text-gray-400">{t.language}</span>
            </div>
          </div>
          <StatusBadge status={t.status} />
        </div>

        {/* Header text preview */}
        {t.headerType === 'TEXT' && t.headerText && (
          <p className="text-xs font-semibold text-gray-700 mb-1.5">{t.headerText}</p>
        )}
        {['IMAGE', 'VIDEO', 'DOCUMENT'].includes(t.headerType) && (
          <div className="w-full h-8 bg-gray-50 border border-gray-100 rounded-lg flex items-center justify-center text-gray-300 text-xs mb-1.5">
            [{t.headerType}]
          </div>
        )}

        {/* Body */}
        <BodyPreview text={t.bodyText} />

        {/* Footer */}
        {t.footerText && (
          <p className="text-[10px] text-gray-400 mt-2 italic">{t.footerText}</p>
        )}

        {/* Buttons */}
        {t.buttons?.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {(Array.isArray(t.buttons) ? t.buttons : []).map((btn, i) => (
              <span key={i} className="px-2 py-0.5 bg-[#25D366]/8 text-[#128C7E] text-[10px] rounded-full border border-[#25D366]/12 font-medium">
                {btn.text}
              </span>
            ))}
          </div>
        )}

        {/* Rejection */}
        {t.rejectionReason && (
          <div className="mt-2 p-2.5 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600">
            {t.rejectionReason}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="border-t border-gray-50 px-4 py-3 flex items-center justify-between bg-gray-50/30">
        <div className="flex items-center gap-0.5">
          <button onClick={() => onEdit(t)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-colors" title="Edit">
            <Edit2 size={13} />
          </button>
          <button onClick={() => onDuplicate(t.id)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 transition-colors" title="Duplicate">
            <Copy size={13} />
          </button>
          <button onClick={() => onDelete(t.id)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="Delete">
            <Trash2 size={13} />
          </button>
        </div>

        {(t.status === 'DRAFT' || t.status === 'REJECTED') && (
          <button onClick={() => onSubmit(t.id)} disabled={submitting === t.id}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-semibold bg-[#25D366] text-white rounded-lg hover:bg-[#128C7E] disabled:opacity-60 transition-colors">
            {submitting === t.id ? <Loader2 size={10} className="animate-spin" /> : <Send size={10} />}
            Submit to Meta
          </button>
        )}
        {t.status === 'APPROVED' && (
          <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600">
            <Check size={11} /> Ready to use
          </span>
        )}
        {t.status === 'PENDING' && (
          <span className="text-[10px] text-amber-600 font-medium">Under review…</span>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function TemplatesPage() {
  const [templateList, setTemplateList] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState('');
  const [catFilter,    setCatFilter]    = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [modal,        setModal]        = useState(null);
  const [toast,        setToast]        = useState(null);
  const [syncing,      setSyncing]      = useState(false);
  const [submitting,   setSubmitting]   = useState(null);

  const showToast = (msg, type = 'success') => setToast({ msg, type });

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await templates.list();
      const data = res.data?.data || res.data;
      setTemplateList(Array.isArray(data) ? data : []);
    } catch {
      showToast('Failed to load templates', 'error');
      setTemplateList([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTemplates(); }, [loadTemplates]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await templates.sync();
      const { synced, errors } = res.data || {};
      showToast(`Synced ${synced} template(s)${errors ? ` (${errors} errors)` : ''}`);
      loadTemplates();
    } catch (e) {
      showToast(e.response?.data?.message || 'Sync failed', 'error');
    } finally { setSyncing(false); }
  };

  const handleSubmit = async (id) => {
    setSubmitting(id);
    try {
      await templates.submit(id);
      showToast('Submitted to Meta — awaiting review');
      loadTemplates();
    } catch (e) {
      showToast(e.response?.data?.message || 'Failed to submit', 'error');
    } finally { setSubmitting(null); }
  };

  const handleDuplicate = async (id) => {
    try {
      await templates.duplicate(id);
      showToast('Template duplicated');
      loadTemplates();
    } catch { showToast('Failed to duplicate', 'error'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this template?')) return;
    try {
      await templates.remove(id);
      showToast('Template deleted');
      loadTemplates();
    } catch { showToast('Failed to delete', 'error'); }
  };

  const filtered = templateList.filter((t) => {
    const q = search.toLowerCase();
    const matchSearch = !q || t.name.toLowerCase().includes(q) || (t.bodyText || '').toLowerCase().includes(q);
    const matchCat    = catFilter    === 'All' || t.category === catFilter;
    const matchStatus = statusFilter === 'All' || t.status   === statusFilter;
    return matchSearch && matchCat && matchStatus;
  });

  return (
    <div className="flex flex-col h-full">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {modal && (
        <TemplateModal
          template={modal === 'add' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={(msg) => { showToast(msg); loadTemplates(); }}
        />
      )}

      {/* ── Page Header ──────────────────────────────── */}
      <div className="bg-white border-b border-gray-100 px-4 md:px-6 py-4 flex-shrink-0">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h1 className="text-lg font-bold text-gray-900">Templates</h1>
              <p className="text-xs text-gray-400 mt-0.5">
                {filtered.length} of {templateList.length} template{templateList.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleSync} disabled={syncing}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-all shadow-sm">
                <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />
                <span className="hidden sm:inline">Sync from Meta</span>
              </button>
              <button onClick={() => setModal('add')}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-[#25D366] text-white rounded-xl hover:bg-[#128C7E] transition-colors shadow-sm shadow-[#25D366]/25">
                <Plus size={14} /> New Template
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search templates…"
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#25D366]/30 focus:border-[#25D366] transition-all" />
            </div>
            <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)}
              className="px-3 py-2 text-xs border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#25D366]/30 text-gray-600 cursor-pointer">
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-xs border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#25D366]/30 text-gray-600 cursor-pointer">
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* ── Content ──────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 space-y-4">

          {/* Info banner */}
          <div className="flex items-start gap-3 p-3.5 bg-blue-50 border border-blue-100 rounded-2xl text-sm text-blue-700">
            <AlertCircle size={14} className="mt-0.5 flex-shrink-0 text-blue-500" />
            <span className="text-xs leading-relaxed">
              Templates must be <strong>APPROVED</strong> by Meta before sending. Create a template, then click <strong>Submit to Meta</strong> to start review. Sync to get the latest status.
            </span>
          </div>

          {/* Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 animate-pulse">
                  <div className="flex justify-between mb-3">
                    <div className="space-y-2">
                      <div className="h-3 bg-gray-100 rounded w-40" />
                      <div className="h-2 bg-gray-100 rounded w-20" />
                    </div>
                    <div className="h-4 bg-gray-100 rounded-full w-16" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="h-2.5 bg-gray-100 rounded w-full" />
                    <div className="h-2.5 bg-gray-100 rounded w-5/6" />
                    <div className="h-2.5 bg-gray-100 rounded w-4/6" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
                <FileText size={28} className="text-gray-200" />
              </div>
              <p className="text-base font-semibold text-gray-700">
                {search ? 'No templates matched' : 'No templates yet'}
              </p>
              <p className="text-sm text-gray-400 mt-1 mb-5 max-w-xs">
                {search
                  ? `No results for "${search}". Try a different search.`
                  : 'Create your first template or sync from Meta to import existing ones.'}
              </p>
              {!search && (
                <button onClick={() => setModal('add')}
                  className="flex items-center gap-2 px-4 py-2.5 bg-[#25D366] text-white rounded-xl text-sm font-semibold hover:bg-[#128C7E] transition-colors shadow-sm shadow-[#25D366]/25">
                  <Plus size={14} /> Create Template
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map((t) => (
                <TemplateCard
                  key={t.id}
                  t={t}
                  onEdit={setModal}
                  onDuplicate={handleDuplicate}
                  onDelete={handleDelete}
                  onSubmit={handleSubmit}
                  submitting={submitting}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
