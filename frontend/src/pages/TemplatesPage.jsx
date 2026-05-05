import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Plus, RefreshCw, Search, Copy, Edit2, Trash2,
  Send, X, Loader2, Check, AlertCircle
} from 'lucide-react';
import { templates } from '../api/index.js';

const CATEGORIES = ['All', 'UTILITY', 'MARKETING', 'AUTHENTICATION'];
const STATUSES   = ['All', 'APPROVED', 'PENDING', 'REJECTED', 'DRAFT'];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    APPROVED: 'bg-green-100 text-green-700',
    PENDING:  'bg-yellow-100 text-yellow-700',
    REJECTED: 'bg-red-100 text-red-700',
    DRAFT:    'bg-gray-100 text-gray-600',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[status] || 'bg-gray-100 text-gray-600'}`}>
      {status}
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

// Body preview with {{variable}} highlighting
function BodyPreview({ text }) {
  if (!text) return null;
  const parts = text.split(/({{[^}]+}})/g);
  return (
    <p className="text-xs text-gray-600 line-clamp-3">
      {parts.map((p, i) =>
        /^{{.+}}$/.test(p) ? (
          <span key={i} className="bg-yellow-100 text-yellow-800 px-1 rounded font-mono">{p}</span>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </p>
  );
}

function getTemplateVariableKeys(text = '') {
  return [...new Set(
    (text.match(/{{\s*(\d+)\s*}}/g) || []).map((match) => match.replace(/[^0-9]/g, ''))
  )].sort((a, b) => Number(a) - Number(b));
}

function renderTemplatePreviewText(text = '', sampleValues = {}) {
  return String(text || '').replace(/{{\s*(\d+)\s*}}/g, (_, idx) => sampleValues[idx] || `{{${idx}}}`);
}

// ─── Create / Edit Modal ──────────────────────────────────────────────────────
function TemplateModal({ template, onClose, onSaved }) {
  const isEdit = !!template?.id;
  const [form, setForm] = useState({
    name:       template?.name        || '',
    category:   template?.category    || 'UTILITY',
    language:   template?.language    || 'en',
    headerType: template?.headerType  || 'NONE',
    headerText: template?.headerText  || '',
    bodyText:   template?.bodyText    || '',
    footerText: template?.footerText  || '',
    buttons:    template?.buttons     || [],
    submitToMeta: false,
  });
  const [sampleValues, setSampleValues] = useState({});
  const [loading, setLoading]     = useState(false);
  const [err, setErr]             = useState('');

  const variableKeys = useMemo(() =>
    getTemplateVariableKeys(`${form.headerText} ${form.bodyText} ${form.footerText}`),
    [form.headerText, form.bodyText, form.footerText],
  );

  useEffect(() => {
    setSampleValues((prev) => {
      const next = {};
      variableKeys.forEach((key) => {
        next[key] = prev[key] || '';
      });
      return next;
    });
  }, [variableKeys.join(',')] );

  const f = (field, val) => setForm(prev => ({ ...prev, [field]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      // normalizeTemplatePayload in api/index.js maps body→bodyText, footer→footerText
      // but we're already sending bodyText/footerText directly here
      if (isEdit) {
        await templates.update(template.id, form);
      } else {
        await templates.create(form);
      }
      onSaved(`Template ${isEdit ? 'updated' : 'created'}${form.submitToMeta && !isEdit ? ' & submitted to Meta' : ''}`);
      onClose();
    } catch (error) {
      setErr(error.response?.data?.message || 'Failed to save template');
    } finally {
      setLoading(false);
    }
  };

  const addButton = () => {
    if (form.buttons.length < 3) {
      f('buttons', [...form.buttons, { type: 'QUICK_REPLY', text: '' }]);
    }
  };
  const removeButton = (idx) => f('buttons', form.buttons.filter((_, i) => i !== idx));
  const updateButton = (idx, key, val) => {
    const btns = [...form.buttons];
    btns[idx] = { ...btns[idx], [key]: val };
    f('buttons', btns);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-[1100px] max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-base font-semibold text-gray-800">
            {isEdit ? 'Edit Template' : 'Create Template'}
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="overflow-y-auto max-h-[calc(90vh-88px)] p-6 space-y-4">
            {err && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex gap-2 items-start">
                <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                {err}
              </div>
            )}

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
              <div className="space-y-4 min-w-0">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Template Name *</label>
                    <input
                      required
                      value={form.name}
                      onChange={(e) => f('name', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#25D366]"
                      placeholder="e.g. pre_arrival_welcome"
                    />
                    <p className="text-xs text-gray-400 mt-1">Lowercase letters, numbers and underscores only</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                    <select
                      value={form.category}
                      onChange={(e) => f('category', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#25D366]"
                    >
                      <option value="UTILITY">Utility</option>
                      <option value="MARKETING">Marketing</option>
                      <option value="AUTHENTICATION">Authentication</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Language *</label>
                    <select
                      value={form.language}
                      onChange={(e) => f('language', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#25D366]"
                    >
                      <option value="en">English (en)</option>
                      <option value="en_US">English US (en_US)</option>
                      <option value="en_GB">English UK (en_GB)</option>
                      <option value="hi">Hindi (hi)</option>
                      <option value="ar">Arabic (ar)</option>
                      <option value="es">Spanish (es)</option>
                      <option value="fr">French (fr)</option>
                      <option value="de">German (de)</option>
                      <option value="pt_BR">Portuguese BR (pt_BR)</option>
                      <option value="zh_CN">Chinese (zh_CN)</option>
                    </select>
                  </div>
                </div>

                {/* Header */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Header Type</label>
                  <select
                    value={form.headerType}
                    onChange={(e) => f('headerType', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#25D366]"
                  >
                    <option value="NONE">None</option>
                    <option value="TEXT">Text</option>
                  </select>
                  {form.headerType === 'TEXT' && (
                    <input
                      value={form.headerText}
                      onChange={(e) => f('headerText', e.target.value)}
                      className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#25D366]"
                      placeholder="Header text (max 60 chars, use {{1}} for variables)"
                      maxLength={60}
                    />
                  )}
                </div>

                {/* Body */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Body *</label>
                  <textarea
                    required
                    rows={6}
                    value={form.bodyText}
                    onChange={(e) => f('bodyText', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#25D366] resize-none min-h-[160px]"
                    placeholder="Message body. Use {{1}}, {{2}}, {{3}} for dynamic variables."
                    maxLength={1024}
                  />
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between mt-2 text-xs text-gray-400">
                    <span>Variables: {'{{1}}'}, {'{{2}}'}, {'{{3}}'} …</span>
                    <span>{form.bodyText.length}/1024</span>
                  </div>
                </div>

                {/* Footer */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Footer</label>
                  <input
                    value={form.footerText}
                    onChange={(e) => f('footerText', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#25D366]"
                    placeholder="Optional footer (e.g. Reply STOP to unsubscribe)"
                    maxLength={60}
                  />
                </div>

                {variableKeys.length > 0 && (
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                    <div className="font-semibold text-sm text-gray-800 mb-2">Variable Samples</div>
                    <p className="text-xs text-gray-500 mb-4">
                      Include samples of every variable in your message to help Meta review the template. Do not include any customer personal information.
                    </p>
                    <div className="space-y-3">
                      {variableKeys.map((key) => (
                        <div key={key}>
                          <label className="block text-xs text-gray-600 mb-1">{`{{${key}}}`}</label>
                          <input
                            value={sampleValues[key] || ''}
                            onChange={(e) => setSampleValues((prev) => ({ ...prev, [key]: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#25D366]"
                            placeholder={`Enter content for {{${key}}}`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Buttons */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">Buttons (max 3)</label>
                    {form.buttons.length < 3 && (
                      <button
                        type="button"
                        onClick={addButton}
                        className="text-xs text-[#25D366] hover:underline"
                      >
                        + Add Button
                      </button>
                    )}
                  </div>
                  {form.buttons.map((btn, idx) => (
                    <div key={idx} className="flex flex-col gap-2 mb-2 md:flex-row md:items-center">
                      <select
                        value={btn.type}
                        onChange={(e) => updateButton(idx, 'type', e.target.value)}
                        className="px-2 py-1.5 border border-gray-300 rounded-lg text-xs bg-white focus:outline-none"
                      >
                        <option value="QUICK_REPLY">Quick Reply</option>
                        <option value="URL">URL</option>
                        <option value="PHONE_NUMBER">Phone</option>
                      </select>
                      <input
                        value={btn.text}
                        onChange={(e) => updateButton(idx, 'text', e.target.value)}
                        placeholder="Button text"
                        className="flex-1 px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none"
                        maxLength={20}
                      />
                      {btn.type === 'URL' && (
                        <input
                          value={btn.url || ''}
                          onChange={(e) => updateButton(idx, 'url', e.target.value)}
                          placeholder="https://…"
                          className="flex-1 px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none"
                        />
                      )}
                      {btn.type === 'PHONE_NUMBER' && (
                        <input
                          value={btn.phoneNumber || ''}
                          onChange={(e) => updateButton(idx, 'phoneNumber', e.target.value)}
                          placeholder="+1234567890"
                          className="flex-1 px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none"
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => removeButton(idx)}
                        className="self-start p-1.5 text-red-400 hover:text-red-600"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Submit to Meta toggle (only on create) */}
                {!isEdit && (
                  <div className="flex items-start gap-3 p-3 bg-green-50 border border-green-100 rounded-lg">
                    <input
                      id="submitToMeta"
                      type="checkbox"
                      checked={form.submitToMeta}
                      onChange={(e) => f('submitToMeta', e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded text-[#25D366] cursor-pointer"
                    />
                    <label htmlFor="submitToMeta" className="cursor-pointer">
                      <span className="text-sm font-medium text-gray-700">Submit to Meta for approval</span>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Sends the template directly to Meta after saving. Approval usually takes a few minutes to 24 hours.
                      </p>
                    </label>
                  </div>
                )}
              </div>

              <div className="space-y-4 min-w-0 xl:sticky xl:top-6 xl:self-start">
                <div className="rounded-3xl border border-gray-200 bg-[#FAFBF8] p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">Template preview</p>
                      <p className="text-xs text-gray-500">Preview the template as it will appear to the recipient.</p>
                    </div>
                    <span className="text-xs text-gray-400">{form.bodyText.length}/1024</span>
                  </div>
                  <div className="rounded-3xl bg-white p-4 shadow-sm text-sm text-gray-700">
                    {form.headerType === 'TEXT' && form.headerText && (
                      <p className="text-xs font-semibold text-gray-600 mb-3">{renderTemplatePreviewText(form.headerText, sampleValues)}</p>
                    )}
                    <div className="whitespace-pre-wrap">
                      {renderTemplatePreviewText(form.bodyText, sampleValues)}
                    </div>
                    {form.footerText && (
                      <p className="mt-4 text-xs text-gray-500">{renderTemplatePreviewText(form.footerText, sampleValues)}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-[#25D366] text-white rounded-lg hover:bg-[#128C7E] disabled:opacity-60"
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              {isEdit ? 'Save Changes' : form.submitToMeta ? 'Create & Submit to Meta' : 'Create Template'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function TemplatesPage() {
  const [templateList, setTemplateList] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState('');
  const [catFilter,    setCatFilter]    = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [modal,        setModal]        = useState(null);  // null | 'add' | template object
  const [toast,        setToast]        = useState(null);
  const [syncing,      setSyncing]      = useState(false);
  const [submitting,   setSubmitting]   = useState(null);  // template id being submitted

  const showToast = (msg, type = 'success') => setToast({ msg, type });

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await templates.list();
      const data = res.data?.data || res.data;
      setTemplateList(Array.isArray(data) ? data : []);
    } catch (e) {
      showToast('Failed to load templates', 'error');
      setTemplateList([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTemplates(); }, [loadTemplates]);

  // ── Sync from Meta ────────────────────────────────────────────────────────
  const handleSync = async () => {
    setSyncing(true);
    try {
      const res  = await templates.sync();
      const { synced, errors } = res.data || {};
      showToast(`Synced ${synced} template(s) from Meta${errors ? ` (${errors} errors)` : ''}`);
      loadTemplates();
    } catch (e) {
      const msg = e.response?.data?.message || 'Sync failed';
      showToast(msg, 'error');
    } finally {
      setSyncing(false);
    }
  };

  // ── Submit DRAFT/REJECTED template to Meta ────────────────────────────────
  const handleSubmit = async (id) => {
    setSubmitting(id);
    try {
      await templates.submit(id);
      showToast('Submitted to Meta — awaiting review');
      loadTemplates();
    } catch (e) {
      showToast(e.response?.data?.message || 'Failed to submit', 'error');
    } finally {
      setSubmitting(null);
    }
  };

  const handleDuplicate = async (id) => {
    try {
      await templates.duplicate(id);
      showToast('Template duplicated');
      loadTemplates();
    } catch {
      showToast('Failed to duplicate', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this template?')) return;
    try {
      await templates.remove(id);
      showToast('Template deleted');
      loadTemplates();
    } catch {
      showToast('Failed to delete', 'error');
    }
  };

  const filtered = templateList.filter((t) => {
    const matchSearch = !search ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      (t.bodyText || '').toLowerCase().includes(search.toLowerCase());
    const matchCat    = catFilter    === 'All' || t.category === catFilter;
    const matchStatus = statusFilter === 'All' || t.status   === statusFilter;
    return matchSearch && matchCat && matchStatus;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {modal && (
        <TemplateModal
          template={modal === 'add' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={(msg) => { showToast(msg); loadTemplates(); }}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Templates</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {filtered.length} of {templateList.length} templates
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-60"
          >
            <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
            Sync from Meta
          </button>
          <button
            onClick={() => setModal('add')}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-[#25D366] text-white rounded-lg hover:bg-[#128C7E]"
          >
            <Plus size={14} />
            New Template
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search templates…"
            className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#25D366] bg-white"
          />
        </div>
        <select
          value={catFilter}
          onChange={(e) => setCatFilter(e.target.value)}
          className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#25D366]"
        >
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#25D366]"
        >
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      {/* Info banner about Meta template flow */}
      <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-700">
        <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
        <span>
          Templates must be <strong>APPROVED</strong> by Meta before sending.
          Create a template, then click <strong>Submit to Meta</strong> to start the review process.
          Sync to pull the latest status from Meta.
        </span>
      </div>

      {/* Template Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={28} className="animate-spin text-[#25D366]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center text-gray-400">
          <p className="text-lg mb-2">No templates found</p>
          <p className="text-sm">Create a new template or sync from Meta to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((t) => (
            <div key={t.id} className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col hover:shadow-md transition-shadow">
              <div className="p-4 flex-1">
                {/* Template name + status */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 text-sm font-mono truncate" title={t.name}>
                      {t.name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 text-xs rounded font-medium">
                        {t.category}
                      </span>
                      <span className="text-xs text-gray-400">{t.language}</span>
                    </div>
                  </div>
                  <StatusBadge status={t.status} />
                </div>

                {/* Header preview */}
                {t.headerType && t.headerType !== 'NONE' && (
                  <div className="mb-2">
                    {t.headerType === 'TEXT' && t.headerText && (
                      <p className="text-xs font-semibold text-gray-700">{t.headerText}</p>
                    )}
                    {['IMAGE', 'VIDEO', 'DOCUMENT'].includes(t.headerType) && (
                      <div className="w-full h-10 bg-gray-100 rounded flex items-center justify-center text-gray-400 text-xs">
                        [{t.headerType} Header]
                      </div>
                    )}
                  </div>
                )}

                {/* Body */}
                <BodyPreview text={t.bodyText} />

                {/* Footer */}
                {t.footerText && (
                  <p className="text-xs text-gray-400 mt-2 italic">{t.footerText}</p>
                )}

                {/* Buttons */}
                {t.buttons && t.buttons.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {(Array.isArray(t.buttons) ? t.buttons : []).map((btn, i) => (
                      <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-600 text-xs rounded border border-blue-100">
                        {btn.text}
                      </span>
                    ))}
                  </div>
                )}

                {/* Rejection reason */}
                {t.rejectionReason && (
                  <div className="mt-2 p-2 bg-red-50 rounded text-xs text-red-600">
                    {t.status === 'REJECTED' ? 'Rejected:' : 'Submission issue:'} {t.rejectionReason}
                  </div>
                )}
              </div>

              {/* Actions footer */}
              <div className="border-t border-gray-100 px-4 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setModal(t)}
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => handleDuplicate(t.id)}
                    className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    title="Duplicate"
                  >
                    <Copy size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(t.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* Submit to Meta — for DRAFT or REJECTED */}
                {(t.status === 'DRAFT' || t.status === 'REJECTED') && (
                  <button
                    onClick={() => handleSubmit(t.id)}
                    disabled={submitting === t.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[#25D366] text-white rounded-lg hover:bg-[#128C7E] disabled:opacity-60 transition-colors"
                  >
                    {submitting === t.id
                      ? <Loader2 size={11} className="animate-spin" />
                      : <Send size={11} />
                    }
                    Submit to Meta
                  </button>
                )}

                {t.status === 'APPROVED' && (
                  <span className="flex items-center gap-1 text-xs text-green-600">
                    <Check size={12} /> Ready to send
                  </span>
                )}

                {t.status === 'PENDING' && (
                  <span className="text-xs text-yellow-600">Under review…</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
