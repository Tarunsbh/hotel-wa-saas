import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Edit2, Trash2, Play, ToggleLeft, ToggleRight,
  X, Loader2, Check, Zap, Clock,
} from 'lucide-react';
import { automation, templates } from '../api/index.js';
import { format } from 'date-fns';

// ─── Constants ────────────────────────────────────────────────────────────────
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

// ─── Reverse-map DB enum values back to form values (for edit modal) ──────────
function reverseMapTrigger(dbTriggerType, dbOffsetDirection) {
  switch (dbTriggerType) {
    case 'BEFORE_ARRIVAL':
      return { triggerType: 'check_in', offsetDirection: 'before' };
    case 'AFTER_CHECKIN':
      return { triggerType: 'check_in', offsetDirection: 'after' };
    case 'BEFORE_CHECKOUT':
      return { triggerType: 'check_out', offsetDirection: 'before' };
    case 'AFTER_CHECKOUT':
      return { triggerType: 'check_out', offsetDirection: 'after' };
    case 'CUSTOM_DATE':
    default:
      return {
        triggerType: 'reservation_created',
        offsetDirection: String(dbOffsetDirection || 'AFTER').toLowerCase(),
      };
  }
}

function reverseMapAudience(dbAudienceType) {
  switch (String(dbAudienceType || '').toUpperCase()) {
    case 'IN_HOUSE':    return 'in_house';
    case 'ARRIVING':    return 'arriving';
    case 'CHECKED_OUT': return 'checked_out';
    case 'CSV':         return 'custom';
    case 'ALL':
    default:            return 'all';
  }
}

// Pull variable placeholders {{1}}, {{2}} … from template body
function extractVarKeys(bodyText = '') {
  const matches = [...(bodyText || '').matchAll(/\{\{(\d+)\}\}/g)];
  return [...new Set(matches.map((m) => m[1]))].sort((a, b) => +a - +b);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function Toast({ msg, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div
      className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-white text-sm
        ${type === 'error' ? 'bg-red-500' : 'bg-[#25D366]'}`}
    >
      {type === 'error' ? <X size={16} /> : <Check size={16} />}
      {msg}
    </div>
  );
}

function TriggerLabel({ dbTriggerType, triggerOffsetHours, triggerOffsetDirection }) {
  const { triggerType, offsetDirection } = reverseMapTrigger(dbTriggerType, triggerOffsetDirection);
  const label = TRIGGER_TYPES.find((t) => t.value === triggerType)?.label || dbTriggerType;
  const dir = offsetDirection === 'before' ? 'before' : 'after';
  return (
    <span className="text-sm text-gray-600">
      {triggerOffsetHours}h {dir}{' '}
      <span className="font-medium text-gray-800">{label}</span>
    </span>
  );
}

// ─── Rule Modal ───────────────────────────────────────────────────────────────
function RuleModal({ rule, onClose, onSaved }) {
  const isEdit = !!rule?.id;

  // Reverse-map DB values to form values when editing
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

  const [templateList, setTemplateList] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [loading, setLoading]     = useState(false);
  const [err, setErr]             = useState('');

  // Load approved templates
  useEffect(() => {
    templates.list({ status: 'APPROVED' })
      .then((res) => {
        const data = res.data?.data || res.data;
        const list = Array.isArray(data) ? data : data?.templates || [];
        setTemplateList(list);
        // If editing, find the pre-selected template
        if (rule?.templateId) {
          const found = list.find((t) => t.id === rule.templateId);
          if (found) setSelectedTemplate(found);
        }
      })
      .catch(() => setTemplateList([]));
  }, [rule?.templateId]);

  // When template selection changes, update selectedTemplate
  useEffect(() => {
    if (form.templateId) {
      const found = templateList.find((t) => t.id === form.templateId);
      setSelectedTemplate(found || null);
      // Reset variable values when template changes
      if (found?.id !== rule?.templateId) {
        setForm((prev) => ({ ...prev, variableValues: {} }));
      }
    } else {
      setSelectedTemplate(null);
    }
  }, [form.templateId, templateList, rule?.templateId]);

  const f = (field, val) => setForm((prev) => ({ ...prev, [field]: val }));

  const varKeys = extractVarKeys(selectedTemplate?.bodyText);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      const payload = {
        name:           form.name,
        triggerType:    form.triggerType,
        offsetHours:    Number(form.offsetHours),
        offsetDirection: form.offsetDirection,
        sendTime:       form.sendTime,
        triggerConfig: {
          offsetHours:    Number(form.offsetHours),
          offsetDirection: form.offsetDirection,
          sendTime:       form.sendTime,
        },
        templateId:    form.templateId,
        audienceType:  form.audienceType,
        variableValues: Object.keys(form.variableValues).length ? form.variableValues : undefined,
        isActive:      rule?.isActive ?? true,
      };
      if (isEdit) {
        await automation.updateRule(rule.id, payload);
      } else {
        await automation.createRule(payload);
      }
      onSaved(`Rule ${isEdit ? 'updated' : 'created'}`);
      onClose();
    } catch (error) {
      setErr(error.response?.data?.message || 'Failed to save rule');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-base font-semibold text-gray-800">
            {isEdit ? 'Edit Rule' : 'Create Automation Rule'}
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {err && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {err}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rule Name *</label>
            <input
              required
              value={form.name}
              onChange={(e) => f('name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#25D366]"
              placeholder="e.g. Pre-Arrival Welcome"
            />
          </div>

          {/* Trigger */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Trigger Event *</label>
            <select
              value={form.triggerType}
              onChange={(e) => f('triggerType', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#25D366]"
            >
              {TRIGGER_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Offset */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Offset (hours)</label>
              <input
                type="number"
                min={0}
                max={168}
                value={form.offsetHours}
                onChange={(e) => f('offsetHours', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#25D366]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Direction</label>
              <select
                value={form.offsetDirection}
                onChange={(e) => f('offsetDirection', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#25D366]"
              >
                <option value="before">Before</option>
                <option value="after">After</option>
              </select>
            </div>
          </div>

          {/* Send time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Send Time</label>
            <input
              type="time"
              value={form.sendTime}
              onChange={(e) => f('sendTime', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#25D366]"
            />
          </div>

          {/* Template */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Template *</label>
            <select
              required
              value={form.templateId}
              onChange={(e) => f('templateId', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#25D366]"
            >
              <option value="">Select template…</option>
              {templateList.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            {templateList.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">
                No approved templates found. Submit a template for approval first.
              </p>
            )}
          </div>

          {/* Variable values */}
          {varKeys.length > 0 && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
              <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                Template Variables
              </p>
              <div className="bg-white border border-gray-200 rounded p-2 text-xs text-gray-700 font-mono whitespace-pre-wrap">
                {selectedTemplate?.bodyText}
              </div>
              {varKeys.map((k) => (
                <div key={k} className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-8 shrink-0">{`{{${k}}}`}</span>
                  <input
                    type="text"
                    value={form.variableValues[k] || ''}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        variableValues: { ...prev.variableValues, [k]: e.target.value },
                      }))
                    }
                    placeholder={`Value for {{${k}}}`}
                    className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#25D366]"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Audience */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Audience</label>
            <select
              value={form.audienceType}
              onChange={(e) => f('audienceType', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#25D366]"
            >
              {AUDIENCE_TYPES.map((a) => (
                <option key={a.value} value={a.value}>{a.label}</option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-2">
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
              {isEdit ? 'Save Changes' : 'Create Rule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function AutomationPage() {
  const [rules, setRules]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState(null);   // null | 'add' | rule object
  const [toast, setToast]       = useState(null);
  const [runningId, setRunningId] = useState(null);

  const showToast = (msg, type = 'success') => setToast({ msg, type });

  const loadRules = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await automation.listRules();
      const data = res.data?.data || res.data;
      setRules(Array.isArray(data) ? data : data?.rules || []);
    } catch {
      setRules([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadRules(); }, [loadRules]);

  // Toggle uses rule.isActive (not rule.active)
  const handleToggle = async (rule) => {
    try {
      await automation.toggleRule(rule.id, !rule.isActive);
      setRules((prev) =>
        prev.map((r) => r.id === rule.id ? { ...r, isActive: !r.isActive } : r),
      );
      showToast(`Rule ${!rule.isActive ? 'enabled' : 'disabled'}`);
    } catch {
      showToast('Failed to toggle rule', 'error');
    }
  };

  const handleRunNow = async (id) => {
    setRunningId(id);
    try {
      await automation.runNow(id);
      showToast('Rule triggered manually');
      loadRules();
    } catch (e) {
      showToast(e.response?.data?.message || 'Failed to run rule', 'error');
    } finally {
      setRunningId(null);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this automation rule?')) return;
    try {
      await automation.deleteRule(id);
      showToast('Rule deleted');
      loadRules();
    } catch {
      showToast('Failed to delete', 'error');
    }
  };

  const activeCount = rules.filter((r) => r.isActive).length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      {toast && (
        <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />
      )}
      {modal && (
        <RuleModal
          rule={modal === 'add' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={(msg) => { showToast(msg); loadRules(); }}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Automation</h1>
          <p className="text-sm text-gray-500 mt-0.5">{activeCount} active rule{activeCount !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setModal('add')}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-[#25D366] text-white rounded-lg hover:bg-[#128C7E] transition-colors"
        >
          <Plus size={14} />
          New Rule
        </button>
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <Zap size={18} className="text-blue-500 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-blue-800">Automation Rules</p>
          <p className="text-xs text-blue-600 mt-0.5">
            Rules automatically send WhatsApp messages to guests based on triggers like check-in and
            check-out events. Set offsets to control when messages are sent relative to the trigger.
          </p>
        </div>
      </div>

      {/* Rules list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={28} className="animate-spin text-[#25D366]" />
        </div>
      ) : (
        <div className="space-y-3">
          {rules.length === 0 && (
            <div className="py-16 text-center text-gray-400 bg-white rounded-xl border">
              No automation rules yet. Create one to get started.
            </div>
          )}

          {rules.map((rule) => (
            <div
              key={rule.id}
              className={`bg-white rounded-xl shadow-sm border transition-all ${
                rule.isActive ? 'border-gray-100' : 'border-gray-100 opacity-70'
              }`}
            >
              <div className="p-5 flex items-start justify-between gap-4">
                {/* Left info */}
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      rule.isActive ? 'bg-[#25D366]' : 'bg-gray-200'
                    }`}
                  >
                    <Zap size={18} className={rule.isActive ? 'text-white' : 'text-gray-500'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-gray-800">{rule.name}</p>
                      {rule.isActive ? (
                        <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                          Active
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full font-medium">
                          Inactive
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                      {/* Trigger */}
                      <span className="flex items-center gap-1.5 text-gray-600">
                        <Zap size={12} className="text-[#25D366]" />
                        <TriggerLabel
                          dbTriggerType={rule.triggerType}
                          triggerOffsetHours={rule.triggerOffsetHours ?? 0}
                          triggerOffsetDirection={rule.triggerOffsetDirection}
                        />
                      </span>

                      {/* Send time */}
                      {rule.sendTime && (
                        <span className="flex items-center gap-1.5 text-gray-600">
                          <Clock size={12} className="text-blue-400" />
                          Send at {rule.sendTime}
                        </span>
                      )}

                      {/* Template name */}
                      {rule.template?.name && (
                        <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 text-xs rounded font-mono">
                          {rule.template.name}
                        </span>
                      )}

                      {/* Audience */}
                      {rule.audienceType && (
                        <span className="px-1.5 py-0.5 bg-orange-50 text-orange-600 text-xs rounded capitalize">
                          {reverseMapAudience(rule.audienceType).replace('_', ' ')}
                        </span>
                      )}
                    </div>

                    {/* Last run */}
                    {rule.lastRunAt && (
                      <p className="text-xs text-gray-400 mt-1.5">
                        Last run: {format(new Date(rule.lastRunAt), 'MMM dd, yyyy HH:mm')}
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => handleRunNow(rule.id)}
                    disabled={runningId === rule.id}
                    className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                    title="Run now"
                  >
                    {runningId === rule.id
                      ? <Loader2 size={16} className="animate-spin" />
                      : <Play size={16} />}
                  </button>
                  <button
                    onClick={() => setModal(rule)}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(rule.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                  <button
                    onClick={() => handleToggle(rule)}
                    className="p-2 transition-colors"
                    title={rule.isActive ? 'Disable' : 'Enable'}
                  >
                    {rule.isActive
                      ? <ToggleRight size={24} className="text-[#25D366]" />
                      : <ToggleLeft  size={24} className="text-gray-400" />}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
