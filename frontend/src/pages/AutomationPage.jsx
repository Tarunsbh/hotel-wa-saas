import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Edit2, Trash2, Play, ToggleLeft, ToggleRight,
  X, Loader2, Check, Zap, Clock, CheckCircle2, XCircle,
  BarChart2, AlertCircle,
} from 'lucide-react';
import { automation, templates } from '../api/index.js';
import { format } from 'date-fns';

// ─── Constants ─────────────────────────────────────────────────────────────────
const TRIGGER_TYPES = [
  { value: 'check_in',            label: 'Check-in' },
  { value: 'check_out',           label: 'Check-out' },
  { value: 'reservation_created', label: 'Reservation Created' },
  { value: 'birthday',            label: 'Birthday' },
  { value: 'anniversary',         label: 'Anniversary' },
];

const AUDIENCE_TYPES = [
  { value: 'all',         label: 'All Guests' },
  { value: 'arriving',    label: 'Arriving' },
  { value: 'in_house',    label: 'In House' },
  { value: 'checked_out', label: 'Checked Out' },
];

const inputCls  = 'w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm bg-white text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#25D366]/30 focus:border-[#25D366] transition-all';
const selectCls = `${inputCls} cursor-pointer`;
const labelCls  = 'block text-xs font-semibold text-gray-600 mb-1.5';

// ─── Reverse-map DB values ────────────────────────────────────────────────────
function reverseMapTrigger(dbTriggerType, dbOffsetDirection) {
  switch (dbTriggerType) {
    case 'BEFORE_ARRIVAL':  return { triggerType: 'check_in',  offsetDirection: 'before' };
    case 'AFTER_CHECKIN':   return { triggerType: 'check_in',  offsetDirection: 'after'  };
    case 'BEFORE_CHECKOUT': return { triggerType: 'check_out', offsetDirection: 'before' };
    case 'AFTER_CHECKOUT':  return { triggerType: 'check_out', offsetDirection: 'after'  };
    case 'CUSTOM_DATE':
    default: return { triggerType: 'reservation_created', offsetDirection: String(dbOffsetDirection || 'AFTER').toLowerCase() };
  }
}

function reverseMapAudience(dbAudienceType) {
  switch (String(dbAudienceType || '').toUpperCase()) {
    case 'IN_HOUSE':    return 'in_house';
    case 'ARRIVING':    return 'arriving';
    case 'CHECKED_OUT': return 'checked_out';
    case 'CSV':         return 'custom';
    default:            return 'all';
  }
}

function extractVarKeys(bodyText = '') {
  const matches = [...(bodyText || '').matchAll(/\{\{(\d+)\}\}/g)];
  return [...new Set(matches.map((m) => m[1]))].sort((a, b) => +a - +b);
}

// ─── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ msg, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed top-[72px] right-4 z-[60] flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl text-sm font-medium border max-w-[calc(100vw-2rem)]
      ${type === 'error' ? 'bg-red-50 text-red-700 border-red-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
      {type === 'error' ? <AlertCircle size={14} className="text-red-500" /> : <Check size={14} className="text-emerald-500" />}
      {msg}
      <button onClick={onClose} className="ml-1 opacity-50 hover:opacity-100"><X size={12} /></button>
    </div>
  );
}

// ─── Trigger label ────────────────────────────────────────────────────────────
function TriggerLabel({ dbTriggerType, triggerOffsetHours, triggerOffsetDirection }) {
  const { triggerType, offsetDirection } = reverseMapTrigger(dbTriggerType, triggerOffsetDirection);
  const label = TRIGGER_TYPES.find((t) => t.value === triggerType)?.label || dbTriggerType;
  return (
    <span className="text-xs text-gray-500">
      {triggerOffsetHours}h {offsetDirection === 'before' ? 'before' : 'after'}{' '}
      <span className="font-semibold text-gray-700">{label}</span>
    </span>
  );
}

// ─── Rule Modal ───────────────────────────────────────────────────────────────
function RuleModal({ rule, onClose, onSaved }) {
  const isEdit = !!rule?.id;
  const initTrigger  = isEdit ? reverseMapTrigger(rule.triggerType, rule.triggerOffsetDirection) : {};
  const initAudience = isEdit ? reverseMapAudience(rule.audienceType) : 'all';

  const [form, setForm] = useState({
    name:            rule?.name            || '',
    triggerType:     initTrigger.triggerType     || 'check_in',
    offsetHours:     rule?.triggerOffsetHours    ?? 24,
    offsetDirection: initTrigger.offsetDirection || 'before',
    sendTime:        rule?.sendTime        || '10:00',
    templateId:      rule?.templateId      || '',
    audienceType:    initAudience,
    variableValues:  rule?.variableValues || {},
  });
  const [templateList,     setTemplateList]     = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr]         = useState('');

  useEffect(() => {
    templates.list({ status: 'APPROVED' })
      .then((res) => {
        const data = res.data?.data || res.data;
        const list = Array.isArray(data) ? data : data?.templates || [];
        setTemplateList(list);
        if (rule?.templateId) setSelectedTemplate(list.find((t) => t.id === rule.templateId) || null);
      })
      .catch(() => setTemplateList([]));
  }, [rule?.templateId]);

  useEffect(() => {
    if (form.templateId) {
      const found = templateList.find((t) => t.id === form.templateId);
      setSelectedTemplate(found || null);
      if (found?.id !== rule?.templateId) setForm((p) => ({ ...p, variableValues: {} }));
    } else {
      setSelectedTemplate(null);
    }
  }, [form.templateId, templateList, rule?.templateId]);

  const f = (field, val) => setForm((p) => ({ ...p, [field]: val }));
  const varKeys = extractVarKeys(selectedTemplate?.bodyText);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      const payload = {
        name: form.name, triggerType: form.triggerType,
        offsetHours: Number(form.offsetHours), offsetDirection: form.offsetDirection,
        sendTime: form.sendTime,
        triggerConfig: { offsetHours: Number(form.offsetHours), offsetDirection: form.offsetDirection, sendTime: form.sendTime },
        templateId: form.templateId, audienceType: form.audienceType,
        variableValues: Object.keys(form.variableValues).length ? form.variableValues : undefined,
        isActive: rule?.isActive ?? true,
      };
      if (isEdit) await automation.updateRule(rule.id, payload);
      else await automation.createRule(payload);
      onSaved(`Rule ${isEdit ? 'updated' : 'created'}`);
      onClose();
    } catch (error) {
      setErr(error.response?.data?.message || 'Failed to save rule');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[88vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900">{isEdit ? 'Edit Rule' : 'Create Automation Rule'}</h2>
            <p className="text-xs text-gray-400 mt-0.5">Configure trigger, timing, and message template</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {err && (
            <div className="flex items-center gap-2.5 p-3.5 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm">
              <AlertCircle size={14} /> {err}
            </div>
          )}

          <div>
            <label className={labelCls}>Rule Name <span className="text-red-400">*</span></label>
            <input required value={form.name} onChange={(e) => f('name', e.target.value)}
              className={inputCls} placeholder="e.g. Pre-Arrival Welcome" />
          </div>

          <div>
            <label className={labelCls}>Trigger Event <span className="text-red-400">*</span></label>
            <select value={form.triggerType} onChange={(e) => f('triggerType', e.target.value)} className={selectCls}>
              {TRIGGER_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Offset (hours)</label>
              <input type="number" min={0} max={168} value={form.offsetHours}
                onChange={(e) => f('offsetHours', parseInt(e.target.value) || 0)}
                className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Direction</label>
              <select value={form.offsetDirection} onChange={(e) => f('offsetDirection', e.target.value)} className={selectCls}>
                <option value="before">Before</option>
                <option value="after">After</option>
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls}>Send Time</label>
            <input type="time" value={form.sendTime} onChange={(e) => f('sendTime', e.target.value)} className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>Template <span className="text-red-400">*</span></label>
            <select required value={form.templateId} onChange={(e) => f('templateId', e.target.value)} className={selectCls}>
              <option value="">Select template…</option>
              {templateList.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            {templateList.length === 0 && (
              <p className="text-[10px] text-amber-600 mt-1">No approved templates. Submit a template for approval first.</p>
            )}
          </div>

          {varKeys.length > 0 && (
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 space-y-3">
              <p className="text-xs font-bold text-gray-700">Template Variables</p>
              <div className="bg-white border border-gray-100 rounded-xl p-3 text-xs text-gray-600 font-mono whitespace-pre-wrap">
                {selectedTemplate?.bodyText}
              </div>
              {varKeys.map((k) => (
                <div key={k} className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 w-10 shrink-0 font-mono">{`{{${k}}}`}</span>
                  <input
                    type="text"
                    value={form.variableValues[k] || ''}
                    onChange={(e) => setForm((p) => ({ ...p, variableValues: { ...p.variableValues, [k]: e.target.value } }))}
                    placeholder={`Value for {{${k}}}`}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#25D366]/30"
                  />
                </div>
              ))}
            </div>
          )}

          <div>
            <label className={labelCls}>Audience</label>
            <select value={form.audienceType} onChange={(e) => f('audienceType', e.target.value)} className={selectCls}>
              {AUDIENCE_TYPES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
          </div>

          <div className="flex justify-end gap-2.5 pt-2 border-t border-gray-100">
            <button type="button" onClick={onClose}
              className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-[#25D366] text-white rounded-xl hover:bg-[#128C7E] disabled:opacity-60 transition-all shadow-sm shadow-[#25D366]/25">
              {loading && <Loader2 size={14} className="animate-spin" />}
              {isEdit ? 'Save Changes' : 'Create Rule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Logs Panel ───────────────────────────────────────────────────────────────
function LogsPanel({ ruleId, onClose }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    automation.getLogs(ruleId)
      .then((res) => setData(res.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [ruleId]);

  const logs  = data?.logs  || [];
  const stats = data?.stats || {};

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-xl rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[80vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-gray-900">Execution Logs</h3>
            {stats.total > 0 && (
              <p className="text-xs text-gray-400 mt-0.5">
                {stats.total} total ·{' '}
                <span className="text-emerald-600 font-medium">{stats.success} success</span> ·{' '}
                <span className="text-red-500 font-medium">{stats.failed} failed</span>
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-4 space-y-2">
          {loading && <div className="flex justify-center py-12"><Loader2 size={22} className="animate-spin text-[#25D366]" /></div>}
          {!loading && logs.length === 0 && (
            <div className="flex flex-col items-center py-12 text-center">
              <BarChart2 size={28} className="text-gray-200 mb-3" />
              <p className="text-sm text-gray-400">No executions yet</p>
            </div>
          )}
          {logs.map((log) => (
            <div key={log.id} className="flex items-start gap-3 p-3.5 bg-gray-50 rounded-2xl border border-gray-100">
              {log.status === 'SUCCESS'
                ? <CheckCircle2 size={15} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                : <XCircle      size={15} className="text-red-500 mt-0.5 flex-shrink-0" />}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800">
                  {log.guest?.name || log.guest?.phone || 'Unknown Guest'}
                  {log.guest?.phone && log.guest?.name && (
                    <span className="ml-1.5 text-xs text-gray-400 font-normal">{log.guest.phone}</span>
                  )}
                </p>
                {log.error && <p className="text-xs text-red-500 mt-0.5">{log.error}</p>}
              </div>
              <span className="text-[10px] text-gray-400 flex-shrink-0">
                {log.createdAt ? format(new Date(log.createdAt), 'MMM dd HH:mm') : ''}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Rule Card ────────────────────────────────────────────────────────────────
function RuleCard({ rule, onEdit, onDelete, onToggle, onRunNow, onLogs, runningId }) {
  const isRunning = runningId === rule.id;
  return (
    <div className={`bg-white rounded-2xl border shadow-sm hover:shadow-md transition-all ${
      rule.isActive ? 'border-gray-100' : 'border-gray-100 opacity-60'
    }`}>
      <div className="p-4 md:p-5 flex items-start gap-4">
        {/* Icon */}
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm transition-colors ${
          rule.isActive
            ? 'bg-gradient-to-br from-[#25D366] to-[#075E54] shadow-[#25D366]/20'
            : 'bg-gray-100'
        }`}>
          <Zap size={17} className={rule.isActive ? 'text-white' : 'text-gray-400'} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-gray-800 text-sm">{rule.name}</p>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
              rule.isActive
                ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                : 'bg-gray-50 text-gray-400 border-gray-100'
            }`}>
              {rule.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-2">
            <span className="flex items-center gap-1.5">
              <Zap size={10} className="text-[#25D366]" />
              <TriggerLabel
                dbTriggerType={rule.triggerType}
                triggerOffsetHours={rule.triggerOffsetHours ?? 0}
                triggerOffsetDirection={rule.triggerOffsetDirection}
              />
            </span>
            {rule.sendTime && (
              <span className="flex items-center gap-1.5 text-xs text-gray-500">
                <Clock size={10} className="text-blue-400" /> at {rule.sendTime}
              </span>
            )}
            {rule.template?.name && (
              <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] font-mono rounded-md">
                {rule.template.name}
              </span>
            )}
            {rule.audienceType && (
              <span className="px-1.5 py-0.5 bg-orange-50 text-orange-600 text-[10px] rounded-md capitalize font-medium">
                {reverseMapAudience(rule.audienceType).replace(/_/g, ' ')}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 mt-1.5">
            {rule.lastRunAt && (
              <p className="text-[10px] text-gray-400">Last run: {format(new Date(rule.lastRunAt), 'MMM dd, HH:mm')}</p>
            )}
            {rule.runCount > 0 && (
              <p className="text-[10px] text-gray-400">{rule.runCount} execution{rule.runCount !== 1 ? 's' : ''}</p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button onClick={() => onRunNow(rule.id)} disabled={isRunning}
            className="p-2 rounded-xl text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors" title="Run now">
            {isRunning ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />}
          </button>
          <button onClick={() => onLogs(rule.id)}
            className="p-2 rounded-xl text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 transition-colors" title="View logs">
            <BarChart2 size={15} />
          </button>
          <button onClick={() => onEdit(rule)}
            className="p-2 rounded-xl text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-colors" title="Edit">
            <Edit2 size={15} />
          </button>
          <button onClick={() => onDelete(rule.id)}
            className="p-2 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="Delete">
            <Trash2 size={15} />
          </button>
          <button onClick={() => onToggle(rule)} className="p-1.5 transition-colors" title={rule.isActive ? 'Disable' : 'Enable'}>
            {rule.isActive
              ? <ToggleRight size={24} className="text-[#25D366]" />
              : <ToggleLeft  size={24} className="text-gray-300" />}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AutomationPage() {
  const [rules, setRules]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [modal, setModal]           = useState(null);
  const [toast, setToast]           = useState(null);
  const [runningId, setRunningId]   = useState(null);
  const [logsRuleId, setLogsRuleId] = useState(null);

  const showToast = (msg, type = 'success') => setToast({ msg, type });

  const loadRules = useCallback(async () => {
    setLoading(true);
    try {
      const res = await automation.listRules();
      const data = res.data?.data || res.data;
      setRules(Array.isArray(data) ? data : data?.rules || []);
    } catch { setRules([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadRules(); }, [loadRules]);

  const handleToggle = async (rule) => {
    try {
      await automation.toggleRule(rule.id, !rule.isActive);
      setRules((prev) => prev.map((r) => r.id === rule.id ? { ...r, isActive: !r.isActive } : r));
      showToast(`Rule ${!rule.isActive ? 'enabled' : 'disabled'}`);
    } catch { showToast('Failed to toggle rule', 'error'); }
  };

  const handleRunNow = async (id) => {
    setRunningId(id);
    try {
      const res = await automation.runNow(id);
      const { sent = 0, failed = 0, skipped = 0 } = res.data || {};
      showToast(
        `Done: ${sent} sent${skipped > 0 ? `, ${skipped} skipped` : ''}${failed > 0 ? `, ${failed} failed` : ''}`,
        failed > 0 ? 'error' : 'success',
      );
      loadRules();
    } catch (e) {
      showToast(e.response?.data?.message || 'Failed to run rule', 'error');
    } finally { setRunningId(null); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this automation rule?')) return;
    try {
      await automation.deleteRule(id);
      showToast('Rule deleted');
      loadRules();
    } catch { showToast('Failed to delete', 'error'); }
  };

  const activeCount = rules.filter((r) => r.isActive).length;

  return (
    <div className="flex flex-col h-full">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      {modal && (
        <RuleModal
          rule={modal === 'add' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={(msg) => { showToast(msg); loadRules(); }}
        />
      )}
      {logsRuleId && <LogsPanel ruleId={logsRuleId} onClose={() => setLogsRuleId(null)} />}

      {/* ── Header ─────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100 px-4 md:px-6 py-4 flex-shrink-0">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Automation</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {activeCount} active rule{activeCount !== 1 ? 's' : ''} of {rules.length} total
            </p>
          </div>
          <button onClick={() => setModal('add')}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-[#25D366] text-white rounded-xl hover:bg-[#128C7E] transition-colors shadow-sm shadow-[#25D366]/25">
            <Plus size={14} /> New Rule
          </button>
        </div>
      </div>

      {/* ── Content ──────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-4 space-y-4">

          {/* Info banner */}
          <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded-2xl">
            <Zap size={14} className="text-blue-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700 leading-relaxed">
              <span className="font-semibold">Automation rules</span> automatically send WhatsApp messages based on triggers like check-in and check-out events.
              Set an offset and send time to control exactly when each message is delivered.
            </p>
          </div>

          {/* Rules */}
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gray-100" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3.5 bg-gray-100 rounded w-48" />
                      <div className="h-2.5 bg-gray-100 rounded w-72" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : rules.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-2xl border border-gray-100">
              <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
                <Zap size={28} className="text-gray-200" />
              </div>
              <p className="text-base font-semibold text-gray-700">No automation rules yet</p>
              <p className="text-sm text-gray-400 mt-1 mb-5 max-w-xs">
                Create your first rule to automatically send messages to guests based on events.
              </p>
              <button onClick={() => setModal('add')}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#25D366] text-white rounded-xl text-sm font-semibold hover:bg-[#128C7E] transition-colors shadow-sm shadow-[#25D366]/25">
                <Plus size={14} /> Create First Rule
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {rules.map((rule) => (
                <RuleCard
                  key={rule.id}
                  rule={rule}
                  onEdit={setModal}
                  onDelete={handleDelete}
                  onToggle={handleToggle}
                  onRunNow={handleRunNow}
                  onLogs={setLogsRuleId}
                  runningId={runningId}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
