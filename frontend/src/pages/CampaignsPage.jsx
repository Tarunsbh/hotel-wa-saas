import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Play, StopCircle, X, Loader2, Check, AlertCircle,
  BarChart2, Users, Clock, ArrowLeft, Send, Trash2, RefreshCw,
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  Upload, List, Tag, MessageSquare, Calendar,
  RotateCcw, TrendingUp, Link2, Zap, CheckCircle2,
  Radio, Settings, FileText, Eye, Smartphone,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { campaigns, templates } from '../api/index.js';
import { format } from 'date-fns';

// ─── Constants ────────────────────────────────────────────────────────────────
const AUDIENCE_LABELS = {
  ALL:         'All Guests',
  ARRIVING:    'Arriving',
  IN_HOUSE:    'In-House',
  CHECKED_OUT: 'Checked Out',
  TAG:         'By Tag',
  CSV:         'Custom List',
};

const STATUS_STYLE = {
  DRAFT:     'bg-gray-100 text-gray-600',
  SCHEDULED: 'bg-purple-100 text-purple-700',
  RUNNING:   'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-600',
  FAILED:    'bg-red-100 text-red-600',
};

// ─── Small Helpers ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const s = (status || '').toUpperCase();
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_STYLE[s] || 'bg-gray-100 text-gray-600'}`}>
      {s.toLowerCase()}
    </span>
  );
}

function Toast({ msg, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 4500); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed top-[72px] right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl text-white text-sm max-w-[calc(100vw-2rem)] ${type === 'error' ? 'bg-red-500' : 'bg-[#25D366]'}`}>
      {type === 'error' ? <AlertCircle size={16} /> : <Check size={16} />}
      <span>{msg}</span>
    </div>
  );
}

function RecipientBadge({ status }) {
  const s = (status || '').toUpperCase();
  const map = {
    PENDING:   'bg-gray-100 text-gray-500',
    SENT:      'bg-blue-100 text-blue-700',
    DELIVERED: 'bg-green-100 text-green-700',
    READ:      'bg-indigo-100 text-indigo-700',
    FAILED:    'bg-red-100 text-red-600',
    SKIPPED:   'bg-yellow-100 text-yellow-700',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${map[s] || 'bg-gray-100 text-gray-500'}`}>
      {s.toLowerCase()}
    </span>
  );
}

function extractVarKeys(text) {
  if (!text) return [];
  return [...new Set((text.match(/\{\{(\d+)\}\}/g) || []))].sort((a, b) =>
    parseInt(a.replace(/[{}]/g, ''), 10) - parseInt(b.replace(/[{}]/g, ''), 10)
  );
}

// ─── Phone Preview ─────────────────────────────────────────────────────────────
function PhonePreview({ template, variableValues }) {
  const renderText = (text) => {
    if (!text) return '';
    let out = text;
    Object.entries(variableValues || {}).forEach(([k, v]) => {
      out = out.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), v || `{{${k}}}`);
    });
    return out;
  };

  return (
    <div className="flex flex-col items-center py-6">
      {/* Phone chassis */}
      <div className="relative w-56 h-[460px] bg-gray-900 rounded-[38px] shadow-2xl border-[5px] border-gray-800 flex flex-col overflow-hidden">
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-5 bg-gray-900 rounded-b-xl z-10" />
        {/* Screen */}
        <div className="flex-1 flex flex-col bg-[#E5DDD5] overflow-hidden">
          {/* WA header */}
          <div className="bg-[#128C7E] px-3 pt-6 pb-2 flex items-center gap-2 flex-shrink-0">
            <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
              <Users size={12} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-semibold truncate">Guest</p>
              <p className="text-green-200 text-[9px]">online</p>
            </div>
          </div>
          {/* Chat area */}
          <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
            {template ? (
              <div className="max-w-[85%] ml-auto">
                <div className="bg-[#DCF8C6] rounded-xl rounded-tr-none p-2.5 shadow-sm">
                  {template.headerText && (
                    <p className="text-[11px] font-bold text-gray-800 mb-1 leading-tight">{renderText(template.headerText)}</p>
                  )}
                  <p className="text-[11px] text-gray-800 whitespace-pre-wrap leading-relaxed">
                    {renderText(template.bodyText) || <span className="text-gray-400 italic">No message body</span>}
                  </p>
                  {template.footerText && (
                    <p className="text-[9px] text-gray-500 mt-1 italic">{renderText(template.footerText)}</p>
                  )}
                  {template.buttons && template.buttons.length > 0 && (
                    <div className="mt-2 border-t border-green-200 pt-1.5 space-y-1">
                      {template.buttons.map((btn, i) => (
                        <p key={i} className="text-center text-[10px] text-[#128C7E] font-semibold py-0.5">
                          {btn.text || btn}
                        </p>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center justify-end gap-1 mt-1">
                    <span className="text-[9px] text-gray-400">{format(new Date(), 'HH:mm')}</span>
                    <CheckCircle2 size={9} className="text-blue-500" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center opacity-40 py-8">
                <MessageSquare size={24} className="text-gray-400 mb-2" />
                <p className="text-[10px] text-gray-400 text-center leading-relaxed">Select a template<br/>to see preview</p>
              </div>
            )}
          </div>
          {/* Input bar */}
          <div className="bg-[#F0F0F0] px-2 py-1.5 flex items-center gap-1.5 flex-shrink-0">
            <div className="flex-1 bg-white rounded-full px-2.5 py-1">
              <p className="text-[10px] text-gray-400">Type a message…</p>
            </div>
            <div className="w-6 h-6 rounded-full bg-[#128C7E] flex items-center justify-center flex-shrink-0">
              <Send size={9} className="text-white" />
            </div>
          </div>
        </div>
      </div>
      <p className="text-xs text-gray-400 mt-3 font-medium">Live Preview</p>
    </div>
  );
}

// ─── Wizard Step (accordion) ──────────────────────────────────────────────────
function WizardStep({ number, title, icon, isOpen, isCompleted, onToggle, children, subtitle }) {
  return (
    <div className={`rounded-xl border overflow-hidden transition-all duration-200 ${isOpen ? 'border-green-400 shadow-md' : isCompleted ? 'border-green-200' : 'border-gray-200'}`}>
      <button
        type="button"
        onClick={onToggle}
        className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors ${isOpen ? 'bg-green-50' : 'bg-white hover:bg-gray-50'}`}
      >
        <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold transition-colors ${
          isCompleted && !isOpen ? 'bg-green-500 text-white' : isOpen ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-500'
        }`}>
          {isCompleted && !isOpen ? <Check size={13} /> : number}
        </div>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className={`flex-shrink-0 ${isOpen ? 'text-green-600' : 'text-gray-400'}`}>{icon}</span>
          <div className="min-w-0">
            <p className={`text-sm font-semibold ${isOpen ? 'text-green-700' : 'text-gray-700'}`}>{title}</p>
            {subtitle && !isOpen && (
              <p className="text-xs text-gray-400 truncate">{subtitle}</p>
            )}
          </div>
        </div>
        <span className="text-gray-400 flex-shrink-0">
          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </span>
      </button>
      {isOpen && (
        <div className="px-4 pb-5 pt-2 bg-white border-t border-gray-100">
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Campaign Wizard (full-page creation) ─────────────────────────────────────
function CampaignWizard({ onClose, onSaved }) {
  const [campaignName, setCampaignName] = useState('Untitled Campaign');
  const [openStep, setOpenStep]         = useState(1);
  const [loading, setLoading]           = useState(false);
  const [launching, setLaunching]       = useState(false);
  const [err, setErr]                   = useState('');
  const [templateList, setTemplateList] = useState([]);

  const [form, setForm] = useState({
    campaignType: 'one_time',    // one_time | ongoing | api_triggered
    templateId: '',
    variableValues: {},
    audienceMode: 'list',        // list | segment | csv | manual
    audienceType: 'ALL',
    scheduledMode: 'now',        // now | later
    scheduledAt: '',
    retriesEnabled: false,
    retryCount: 1,
    retryInterval: 24,
    conversionUTM: false,
    conversionCustom: false,
    fallbackEnabled: false,
  });

  const [selectedTpl, setSelectedTpl] = useState(null);

  const f = (field, val) => setForm((p) => ({ ...p, [field]: val }));

  useEffect(() => {
    templates.list({ status: 'APPROVED', limit: 100 })
      .then((res) => {
        const data = res.data?.data || res.data || [];
        setTemplateList(Array.isArray(data) ? data : []);
      })
      .catch(() => setTemplateList([]));
  }, []);

  const varKeys = selectedTpl
    ? extractVarKeys([selectedTpl.headerText, selectedTpl.bodyText, selectedTpl.footerText].join(' '))
    : [];

  const handleTemplateSelect = (id) => {
    const tpl = templateList.find((t) => t.id === id) || null;
    f('templateId', id);
    setSelectedTpl(tpl);
    setForm((p) => ({ ...p, templateId: id, variableValues: {} }));
  };

  // Step completion checks
  const step1Done = !!form.campaignType;
  const step2Done = !!form.templateId;
  const step3Done = !!form.audienceType;
  const step4Done = form.scheduledMode === 'now' || !!form.scheduledAt;

  const audienceTypeFromMode = () => {
    if (form.audienceMode === 'csv') return 'CSV';
    return form.audienceType;
  };

  const buildPayload = () => ({
    name: campaignName.trim() || 'Untitled Campaign',
    templateId: form.templateId,
    audienceType: audienceTypeFromMode(),
    scheduledAt: form.scheduledMode === 'now' ? null : form.scheduledAt,
    variableValues: Object.keys(form.variableValues).length ? form.variableValues : undefined,
  });

  const validate = () => {
    if (!campaignName.trim()) return 'Please enter a campaign name.';
    if (!form.templateId) return 'Please select a message template.';
    for (const k of varKeys) {
      const idx = k.replace(/[{}]/g, '');
      if (!form.variableValues[idx]?.trim()) return `Please fill in variable ${k}`;
    }
    if (!form.audienceType) return 'Please select an audience.';
    if (form.scheduledMode === 'later' && !form.scheduledAt) return 'Please pick a scheduled date/time.';
    return null;
  };

  const handleSaveDraft = async () => {
    const e = validate();
    if (e) { setErr(e); return; }
    setErr('');
    setLoading(true);
    try {
      await campaigns.create(buildPayload());
      onSaved('Campaign saved as draft');
    } catch (ex) {
      setErr(ex.response?.data?.message || 'Failed to save draft');
    } finally {
      setLoading(false);
    }
  };

  const handleGoLive = async () => {
    const e = validate();
    if (e) { setErr(e); return; }
    setErr('');
    setLaunching(true);
    try {
      const res = await campaigns.create(buildPayload());
      const id  = res.data?.id;
      if (id) await campaigns.launch(id);
      onSaved('Campaign launched successfully!');
    } catch (ex) {
      setErr(ex.response?.data?.message || 'Failed to launch campaign');
    } finally {
      setLaunching(false);
    }
  };

  const toggle = (step) => setOpenStep((p) => (p === step ? null : step));

  return (
    <div className="min-h-full bg-[#F4F6F8] flex flex-col">
      {/* Wizard header — sticky within the scrollable main container */}
      <div className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 sm:py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
          {/* Row 1 on mobile: back + name. Row 1 on sm+: back + name + buttons all inline */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 text-gray-500 hover:text-gray-800 text-sm flex-shrink-0 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft size={15} />
              <span className="hidden sm:inline">Back</span>
            </button>
            <input
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              className="flex-1 text-sm sm:text-base font-semibold text-gray-800 border-none outline-none bg-transparent focus:ring-2 focus:ring-[#25D366]/30 rounded-lg px-1 min-w-0"
              placeholder="Campaign name…"
            />
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleSaveDraft}
              disabled={loading || launching}
              className="px-3 py-1.5 text-xs sm:text-sm border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 disabled:opacity-50 flex items-center gap-1.5 font-medium"
            >
              {loading && <Loader2 size={12} className="animate-spin" />}
              <span className="hidden sm:inline">Save</span>
              <span className="sm:hidden">Draft</span>
            </button>
            <button
              onClick={handleGoLive}
              disabled={loading || launching}
              className="px-3 py-1.5 text-xs sm:text-sm bg-[#25D366] text-white rounded-xl hover:bg-[#128C7E] disabled:opacity-50 flex items-center gap-1.5 font-bold shadow-sm shadow-[#25D366]/25"
            >
              {launching && <Loader2 size={12} className="animate-spin" />}
              {launching ? 'Launching…' : 'Go Live'}
            </button>
          </div>
        </div>
        {err && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-3">
            <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs flex items-center gap-2">
              <AlertCircle size={13} className="flex-shrink-0" />
              {err}
            </div>
          </div>
        )}
      </div>

      {/* Two-column body — pb-nav accounts for mobile bottom nav clearance */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-4 sm:py-6 pb-nav lg:pb-6">
        <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
          {/* Left: accordion steps */}
          <div className="flex-1 min-w-0 space-y-3">

            {/* Step 1 — Campaign Type */}
            <WizardStep
              number={1} title="Campaign Type" icon={<Radio size={15} />}
              isOpen={openStep === 1} isCompleted={step1Done}
              onToggle={() => toggle(1)}
              subtitle={form.campaignType === 'one_time' ? 'One Time' : form.campaignType === 'ongoing' ? 'Ongoing' : 'API Triggered'}
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-1">
                {[
                  { value: 'one_time',      label: 'One Time',      desc: 'Send once to an audience',   icon: <Send size={18} /> },
                  { value: 'ongoing',       label: 'Ongoing',       desc: 'Recurring scheduled sends',  icon: <RotateCcw size={18} /> },
                  { value: 'api_triggered', label: 'API Triggered', desc: 'Triggered via API endpoint', icon: <Zap size={18} /> },
                ].map(({ value, label, desc, icon }) => (
                  <label
                    key={value}
                    className={`flex flex-col items-center text-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      form.campaignType === value
                        ? 'border-[#25D366] bg-green-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="campaignType"
                      value={value}
                      checked={form.campaignType === value}
                      onChange={() => { f('campaignType', value); setOpenStep(2); }}
                      className="sr-only"
                    />
                    <span className={form.campaignType === value ? 'text-[#25D366]' : 'text-gray-400'}>
                      {icon}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </WizardStep>

            {/* Step 2 — Message Template */}
            <WizardStep
              number={2} title="Message Template" icon={<MessageSquare size={15} />}
              isOpen={openStep === 2} isCompleted={step2Done}
              onToggle={() => toggle(2)}
              subtitle={selectedTpl?.name}
            >
              <div className="space-y-4 mt-1">
                {templateList.length === 0 ? (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 flex items-center gap-2">
                    <AlertCircle size={13} />
                    No approved templates found. Go to Templates and get one approved first.
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Select Template</label>
                    <select
                      value={form.templateId}
                      onChange={(e) => handleTemplateSelect(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#25D366]"
                    >
                      <option value="">— Choose an approved template —</option>
                      {templateList.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {selectedTpl && varKeys.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Fill in Variables</p>
                    {varKeys.map((k) => {
                      const idx = k.replace(/[{}]/g, '');
                      return (
                        <div key={k} className="flex items-center gap-3">
                          <span className="text-xs font-mono bg-yellow-100 text-yellow-800 px-2 py-1 rounded w-14 text-center flex-shrink-0">{k}</span>
                          <input
                            value={form.variableValues[idx] || ''}
                            onChange={(e) => f('variableValues', { ...form.variableValues, [idx]: e.target.value })}
                            placeholder={`Value for ${k}`}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#25D366]"
                          />
                        </div>
                      );
                    })}
                  </div>
                )}

                {step2Done && (
                  <button
                    type="button"
                    onClick={() => setOpenStep(3)}
                    className="w-full py-2.5 bg-[#25D366] text-white text-sm font-medium rounded-lg hover:bg-[#128C7E] transition-colors"
                  >
                    Next: Choose Audience →
                  </button>
                )}
              </div>
            </WizardStep>

            {/* Step 3 — Audience */}
            <WizardStep
              number={3} title="Audience" icon={<Users size={15} />}
              isOpen={openStep === 3} isCompleted={step3Done}
              onToggle={() => toggle(3)}
              subtitle={AUDIENCE_LABELS[audienceTypeFromMode()] || audienceTypeFromMode()}
            >
              <div className="space-y-4 mt-1">
                {/* Audience mode picker */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { value: 'list',    label: 'Select from List', icon: <List size={18} /> },
                    { value: 'segment', label: 'Select Segment',   icon: <Tag size={18} /> },
                    { value: 'csv',     label: 'Upload CSV',       icon: <Upload size={18} /> },
                    { value: 'manual',  label: 'Enter Manually',   icon: <FileText size={18} /> },
                  ].map(({ value, label, icon }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => f('audienceMode', value)}
                      className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 text-center transition-all ${
                        form.audienceMode === value
                          ? 'border-[#25D366] bg-green-50 text-[#25D366]'
                          : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}
                    >
                      {icon}
                      <span className="text-[11px] font-medium leading-tight">{label}</span>
                    </button>
                  ))}
                </div>

                {/* Audience sub-options */}
                {form.audienceMode === 'list' && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-gray-500">Audience Group</p>
                    {[
                      { value: 'ALL',         label: 'All Guests',         desc: 'All opted-in guests' },
                      { value: 'ARRIVING',    label: 'Arriving Guests',    desc: 'Guests with upcoming check-in' },
                      { value: 'IN_HOUSE',    label: 'In-House Guests',    desc: 'Guests currently staying' },
                      { value: 'CHECKED_OUT', label: 'Checked-Out Guests', desc: 'Post-stay guests' },
                    ].map(({ value, label, desc }) => (
                      <label
                        key={value}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                          form.audienceType === value && form.audienceMode === 'list'
                            ? 'border-[#25D366] bg-green-50'
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="audienceType"
                          value={value}
                          checked={form.audienceType === value}
                          onChange={() => f('audienceType', value)}
                          className="accent-[#25D366]"
                        />
                        <div>
                          <p className="text-sm font-medium text-gray-800">{label}</p>
                          <p className="text-xs text-gray-400">{desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}

                {form.audienceMode === 'segment' && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-gray-500">Segment</p>
                    <label
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                        form.audienceType === 'TAG' ? 'border-[#25D366] bg-green-50' : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="audienceType"
                        value="TAG"
                        checked={form.audienceType === 'TAG'}
                        onChange={() => f('audienceType', 'TAG')}
                        className="accent-[#25D366]"
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-800">By Guest Tag</p>
                        <p className="text-xs text-gray-400">Send to guests with a specific tag</p>
                      </div>
                    </label>
                  </div>
                )}

                {form.audienceMode === 'csv' && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm font-medium text-blue-800 mb-1">CSV Upload</p>
                    <p className="text-xs text-blue-600">Upload guest phone numbers via CSV using the Guests → Import CSV feature, then come back and select those guests using "Select from List → All Guests" with the uploaded batch.</p>
                  </div>
                )}

                {form.audienceMode === 'manual' && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm font-medium text-blue-800 mb-1">Manual Entry</p>
                    <p className="text-xs text-blue-600">Add guests manually from the Guests page first, then select them here via "Select from List".</p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setOpenStep(4)}
                  className="w-full py-2.5 bg-[#25D366] text-white text-sm font-medium rounded-lg hover:bg-[#128C7E] transition-colors"
                >
                  Next: Schedule →
                </button>
              </div>
            </WizardStep>

            {/* Step 4 — Schedule */}
            <WizardStep
              number={4} title="Schedule" icon={<Calendar size={15} />}
              isOpen={openStep === 4} isCompleted={step4Done}
              onToggle={() => toggle(4)}
              subtitle={form.scheduledMode === 'now' ? 'Launch immediately' : form.scheduledAt ? format(new Date(form.scheduledAt), 'MMM dd, HH:mm') : 'Scheduled'}
            >
              <div className="space-y-3 mt-1">
                <div className="flex gap-3">
                  {[
                    { value: 'now',   label: 'Launch Now',       desc: 'Send immediately on Go Live' },
                    { value: 'later', label: 'Schedule for Later', desc: 'Pick a date and time' },
                  ].map(({ value, label, desc }) => (
                    <label
                      key={value}
                      className={`flex-1 flex items-start gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                        form.scheduledMode === value ? 'border-[#25D366] bg-green-50' : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="scheduledMode"
                        value={value}
                        checked={form.scheduledMode === value}
                        onChange={() => f('scheduledMode', value)}
                        className="accent-[#25D366] mt-0.5 flex-shrink-0"
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-800">{label}</p>
                        <p className="text-xs text-gray-400">{desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
                {form.scheduledMode === 'later' && (
                  <input
                    type="datetime-local"
                    value={form.scheduledAt}
                    onChange={(e) => f('scheduledAt', e.target.value)}
                    min={new Date().toISOString().slice(0, 16)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#25D366]"
                  />
                )}
                <button
                  type="button"
                  onClick={() => setOpenStep(5)}
                  className="w-full py-2.5 bg-[#25D366] text-white text-sm font-medium rounded-lg hover:bg-[#128C7E] transition-colors"
                >
                  Next: Advanced Settings →
                </button>
              </div>
            </WizardStep>

            {/* Step 5 — Post-Campaign Reply Flows */}
            <WizardStep
              number={5} title="Post-Campaign Reply Flows" icon={<MessageSquare size={15} />}
              isOpen={openStep === 5} isCompleted={openStep > 5}
              onToggle={() => toggle(5)}
            >
              <div className="space-y-3 mt-1">
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-500 flex items-center gap-2">
                  <AlertCircle size={13} className="flex-shrink-0" />
                  Automated reply flows will route guest responses based on keywords or intent. Coming soon.
                </div>
                <button type="button" onClick={() => setOpenStep(6)} className="w-full py-2.5 bg-[#25D366] text-white text-sm font-medium rounded-lg hover:bg-[#128C7E]">
                  Next: Setup Retries →
                </button>
              </div>
            </WizardStep>

            {/* Step 6 — Retries */}
            <WizardStep
              number={6} title="Setup Retries" icon={<RotateCcw size={15} />}
              isOpen={openStep === 6} isCompleted={openStep > 6}
              onToggle={() => toggle(6)}
            >
              <div className="space-y-3 mt-1">
                <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer">
                  <div>
                    <p className="text-sm font-medium text-gray-800">Enable Retries</p>
                    <p className="text-xs text-gray-500 mt-0.5">Retry failed messages after a set interval</p>
                  </div>
                  <div
                    onClick={() => f('retriesEnabled', !form.retriesEnabled)}
                    className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer flex-shrink-0 ${form.retriesEnabled ? 'bg-[#25D366]' : 'bg-gray-300'}`}
                  >
                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.retriesEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </div>
                </label>
                {form.retriesEnabled && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-gray-500 block mb-1">Retry attempts</label>
                      <select
                        value={form.retryCount}
                        onChange={(e) => f('retryCount', Number(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#25D366]"
                      >
                        {[1, 2, 3].map((n) => <option key={n} value={n}>{n} {n === 1 ? 'time' : 'times'}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 block mb-1">Retry after (hrs)</label>
                      <select
                        value={form.retryInterval}
                        onChange={(e) => f('retryInterval', Number(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#25D366]"
                      >
                        {[1, 6, 12, 24, 48].map((h) => <option key={h} value={h}>{h}h</option>)}
                      </select>
                    </div>
                  </div>
                )}
                <button type="button" onClick={() => setOpenStep(7)} className="w-full py-2.5 bg-[#25D366] text-white text-sm font-medium rounded-lg hover:bg-[#128C7E]">
                  Next: Conversion Tracking →
                </button>
              </div>
            </WizardStep>

            {/* Step 7 — Conversion Tracking */}
            <WizardStep
              number={7} title="Conversion Tracking" icon={<TrendingUp size={15} />}
              isOpen={openStep === 7} isCompleted={openStep > 7}
              onToggle={() => toggle(7)}
            >
              <div className="space-y-3 mt-1">
                <p className="text-xs text-gray-500">Track which guests converted after receiving your campaign.</p>
                <div className="space-y-2">
                  {[
                    { field: 'conversionUTM',    label: 'Via UTM Parameters',  desc: 'Append UTM tags to links in your template' },
                    { field: 'conversionCustom', label: 'Via Custom Events',    desc: 'Fire custom events when guests take action' },
                  ].map(({ field, label, desc }) => (
                    <label key={field} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                      form[field] ? 'border-[#25D366] bg-green-50' : 'border-gray-200 hover:bg-gray-50'
                    }`}>
                      <input
                        type="checkbox"
                        checked={form[field]}
                        onChange={() => f(field, !form[field])}
                        className="accent-[#25D366] mt-0.5 flex-shrink-0"
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-800">{label}</p>
                        <p className="text-xs text-gray-400">{desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
                <button type="button" onClick={() => setOpenStep(8)} className="w-full py-2.5 bg-[#25D366] text-white text-sm font-medium rounded-lg hover:bg-[#128C7E]">
                  Next: Fallback Channels →
                </button>
              </div>
            </WizardStep>

            {/* Step 8 — Fallback Channels */}
            <WizardStep
              number={8} title="Fallback Channels" icon={<Zap size={15} />}
              isOpen={openStep === 8} isCompleted={openStep > 8}
              onToggle={() => toggle(8)}
            >
              <div className="space-y-3 mt-1">
                <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer">
                  <div>
                    <p className="text-sm font-medium text-gray-800">Enable Fallback</p>
                    <p className="text-xs text-gray-500 mt-0.5">Send via SMS or Email if WhatsApp delivery fails</p>
                  </div>
                  <div
                    onClick={() => f('fallbackEnabled', !form.fallbackEnabled)}
                    className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer flex-shrink-0 ${form.fallbackEnabled ? 'bg-[#25D366]' : 'bg-gray-300'}`}
                  >
                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.fallbackEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </div>
                </label>
                {form.fallbackEnabled && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 flex items-center gap-2">
                    <AlertCircle size={12} className="flex-shrink-0" />
                    Fallback channel configuration will be available in a future update.
                  </div>
                )}
                {/* Final CTA */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleSaveDraft}
                    disabled={loading || launching}
                    className="flex-1 py-3 border border-gray-300 text-sm font-medium text-gray-700 rounded-xl hover:bg-gray-50 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading && <Loader2 size={14} className="animate-spin" />}
                    Save as Draft
                  </button>
                  <button
                    type="button"
                    onClick={handleGoLive}
                    disabled={loading || launching}
                    className="flex-1 py-3 bg-[#25D366] text-white text-sm font-semibold rounded-xl hover:bg-[#128C7E] disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {launching && <Loader2 size={14} className="animate-spin" />}
                    {launching ? 'Launching…' : '🚀 Go Live'}
                  </button>
                </div>
              </div>
            </WizardStep>
          </div>

          {/* Right: phone preview */}
          <div className="lg:w-72 xl:w-80 flex-shrink-0">
            <div className="lg:sticky lg:top-24">
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                  <Smartphone size={15} className="text-[#25D366]" />
                  <span className="text-sm font-semibold text-gray-700">Message Preview</span>
                </div>
                <PhonePreview template={selectedTpl} variableValues={form.variableValues} />
              </div>
              {selectedTpl && (
                <div className="mt-3 p-3 bg-white rounded-xl border border-gray-200 shadow-sm space-y-1.5">
                  <p className="text-xs font-semibold text-gray-600">Template Info</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Name</span>
                    <span className="text-xs font-medium text-gray-700">{selectedTpl.name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Category</span>
                    <span className="text-xs font-medium text-gray-700 capitalize">{selectedTpl.category?.toLowerCase() || '—'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Status</span>
                    <span className="text-xs font-medium text-green-600">{selectedTpl.status}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Variables</span>
                    <span className="text-xs font-medium text-gray-700">{varKeys.length}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Campaign Detail ───────────────────────────────────────────────────────────
function CampaignDetail({ campaign, onBack, onRefresh }) {
  const [stats,       setStats]       = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [recipients,  setRecipients]  = useState([]);
  const [rcptPage,    setRcptPage]    = useState(1);
  const [rcptTotal,   setRcptTotal]   = useState(0);
  const [rcptFilter,  setRcptFilter]  = useState('');
  const [rcptLoading, setRcptLoading] = useState(false);
  const LIMIT = 20;

  useEffect(() => {
    campaigns.getStats(campaign.id)
      .then((r) => setStats(r.data))
      .catch(() => setStats({ total: 0, sent: campaign.sentCount || 0, delivered: campaign.deliveredCount || 0, read: campaign.readCount || 0, failed: campaign.failedCount || 0, deliveryRate: 0, readRate: 0 }))
      .finally(() => setLoading(false));
  }, [campaign.id]);

  const loadRecipients = useCallback(async (page = 1, status = '') => {
    setRcptLoading(true);
    try {
      const p = { page, limit: LIMIT };
      if (status) p.status = status;
      const res = await campaigns.getRecipients(campaign.id, p);
      setRecipients(res.data?.data || []);
      setRcptTotal(res.data?.meta?.total || 0);
    } catch { setRecipients([]); }
    finally   { setRcptLoading(false); }
  }, [campaign.id]);

  useEffect(() => { loadRecipients(1, rcptFilter); }, [loadRecipients, rcptFilter]);

  const totalPages = Math.ceil(rcptTotal / LIMIT);
  const s = stats || {};
  const pct = (a, b) => (b > 0 ? ((a / b) * 100).toFixed(1) : '0');

  const chartData = [
    { name: 'Sent',      value: s.sent      || 0, color: '#6366f1' },
    { name: 'Delivered', value: s.delivered || 0, color: '#25D366' },
    { name: 'Read',      value: s.read      || 0, color: '#0ea5e9' },
    { name: 'Failed',    value: s.failed    || 0, color: '#ef4444' },
  ];

  return (
    <div className="space-y-5">
      {/* Nav */}
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
          <ArrowLeft size={16} /> Back to Campaigns
        </button>
        <button onClick={onRefresh} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600">
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {/* Header card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{campaign.name}</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Template: <span className="font-medium text-gray-700">{campaign.template?.name || '—'}</span>
            </p>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-500">
              <span className="flex items-center gap-1"><Users size={12} />{AUDIENCE_LABELS[campaign.audienceType] || campaign.audienceType}</span>
              {campaign._count?.recipients > 0 && <span className="flex items-center gap-1">{campaign._count.recipients} recipients</span>}
              {campaign.scheduledAt && <span className="flex items-center gap-1"><Clock size={12} />{format(new Date(campaign.scheduledAt), 'MMM dd, HH:mm')}</span>}
            </div>
          </div>
          <StatusBadge status={campaign.status} />
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-[#25D366]" /></div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
              {[
                { label: 'Sent',      value: s.sent || 0,      sub: '',                                   color: 'text-indigo-600', bg: 'bg-indigo-50' },
                { label: 'Delivered', value: s.delivered || 0, sub: `${pct(s.delivered, s.sent)}% rate`,  color: 'text-green-600',  bg: 'bg-green-50' },
                { label: 'Read',      value: s.read || 0,      sub: `${pct(s.read, s.delivered)}% of dlv`, color: 'text-blue-600',  bg: 'bg-blue-50' },
                { label: 'Failed',    value: s.failed || 0,    sub: `${pct(s.failed, s.sent)}% rate`,     color: 'text-red-500',    bg: 'bg-red-50' },
              ].map((c) => (
                <div key={c.label} className={`text-center p-3 sm:p-4 ${c.bg} rounded-xl`}>
                  <p className={`text-2xl sm:text-3xl font-bold ${c.color}`}>{c.value}</p>
                  <p className="text-xs text-gray-600 mt-0.5 font-medium">{c.label}</p>
                  {c.sub && <p className="text-[10px] text-gray-400 mt-0.5">{c.sub}</p>}
                </div>
              ))}
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }} />
                <Bar dataKey="value" radius={[5, 5, 0, 0]}>
                  {chartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </>
        )}
      </div>

      {/* Recipients */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <h3 className="font-semibold text-gray-800 text-sm">Recipients</h3>
          <div className="flex items-center gap-2">
            <select
              value={rcptFilter}
              onChange={(e) => { setRcptFilter(e.target.value); setRcptPage(1); }}
              className="px-2 py-1.5 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none"
            >
              <option value="">All Statuses</option>
              {['PENDING','SENT','DELIVERED','READ','FAILED','SKIPPED'].map((v) => (
                <option key={v} value={v}>{v.charAt(0) + v.slice(1).toLowerCase()}</option>
              ))}
            </select>
            <span className="text-xs text-gray-400">{rcptTotal} total</span>
          </div>
        </div>
        {rcptLoading ? (
          <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-[#25D366]" /></div>
        ) : recipients.length === 0 ? (
          <div className="py-10 text-center text-gray-400 text-sm">No recipients found</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['Guest','Phone','Status','Sent','Delivered','Read','Error'].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {recipients.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 font-medium text-gray-800">{r.guest?.name || '—'}</td>
                      <td className="px-4 py-2.5 text-gray-500 font-mono text-xs">{r.phone}</td>
                      <td className="px-4 py-2.5"><RecipientBadge status={r.status} /></td>
                      <td className="px-4 py-2.5 text-xs text-gray-500">{r.sentAt      ? format(new Date(r.sentAt),      'MMM dd HH:mm') : '—'}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-500">{r.deliveredAt ? format(new Date(r.deliveredAt), 'MMM dd HH:mm') : '—'}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-500">{r.readAt      ? format(new Date(r.readAt),      'MMM dd HH:mm') : '—'}</td>
                      <td className="px-4 py-2.5 text-xs text-red-500 max-w-xs truncate">{r.errorMessage || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="px-4 py-3 border-t flex items-center justify-between">
                <span className="text-xs text-gray-400">Page {rcptPage} of {totalPages} · {rcptTotal} recipients</span>
                <div className="flex gap-1">
                  <button disabled={rcptPage <= 1} onClick={() => { setRcptPage(p => p - 1); loadRecipients(rcptPage - 1, rcptFilter); }}
                    className="p-1.5 text-gray-400 hover:text-gray-700 disabled:opacity-40 rounded">
                    <ChevronLeft size={14} />
                  </button>
                  <button disabled={rcptPage >= totalPages} onClick={() => { setRcptPage(p => p + 1); loadRecipients(rcptPage + 1, rcptFilter); }}
                    className="p-1.5 text-gray-400 hover:text-gray-700 disabled:opacity-40 rounded">
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function CampaignsPage() {
  // view: 'list' | 'wizard' | 'detail'
  const [view,         setView]         = useState('list');
  const [campaignList, setCampaignList] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [selected,     setSelected]     = useState(null);
  const [toast,        setToast]        = useState(null);
  const [actingId,     setActingId]     = useState(null);
  const [analytics,    setAnalytics]    = useState(null);
  const [activeTab,    setActiveTab]    = useState('one_time');
  const [searchQuery,  setSearchQuery]  = useState('');

  const showToast = (msg, type = 'success') => setToast({ msg, type });

  const loadCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const [listRes, analyticsRes] = await Promise.allSettled([
        campaigns.list(),
        campaigns.getAnalytics(),
      ]);
      if (listRes.status === 'fulfilled') {
        const data = listRes.value.data?.data || listRes.value.data || [];
        setCampaignList(Array.isArray(data) ? data : []);
      } else {
        setCampaignList([]);
        showToast(listRes.reason?.response?.data?.message || 'Failed to load campaigns', 'error');
      }
      if (analyticsRes.status === 'fulfilled') setAnalytics(analyticsRes.value.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadCampaigns(); }, [loadCampaigns]);

  const handleLaunch = async (id, e) => {
    e?.stopPropagation();
    setActingId(id);
    try {
      await campaigns.launch(id);
      showToast('Campaign launched!');
      loadCampaigns();
    } catch (ex) {
      showToast(ex.response?.data?.message || 'Failed to launch', 'error');
    } finally { setActingId(null); }
  };

  const handleCancel = async (id, e) => {
    e?.stopPropagation();
    if (!window.confirm('Cancel this campaign?')) return;
    setActingId(id);
    try {
      await campaigns.cancel(id);
      showToast('Campaign cancelled');
      loadCampaigns();
    } catch (ex) {
      showToast(ex.response?.data?.message || 'Failed to cancel', 'error');
    } finally { setActingId(null); }
  };

  const handleDelete = async (id, e) => {
    e?.stopPropagation();
    if (!window.confirm('Delete this campaign?')) return;
    setActingId(id);
    try {
      await campaigns.remove(id);
      showToast('Campaign deleted');
      loadCampaigns();
    } catch (ex) {
      showToast(ex.response?.data?.message || 'Failed to delete', 'error');
    } finally { setActingId(null); }
  };

  const handleViewDetail = (c) => { setSelected(c); setView('detail'); };

  const handleBackFromDetail = () => { setSelected(null); setView('list'); };

  const refreshSelected = async () => {
    await loadCampaigns();
    setCampaignList((prev) => {
      const updated = prev.find((c) => c.id === selected?.id);
      if (updated) setSelected(updated);
      return prev;
    });
  };

  // Tab filtering
  const tabFilter = (c) => {
    const status = (c.status || '').toUpperCase();
    if (activeTab === 'one_time')       return !['SCHEDULED'].includes(status);
    if (activeTab === 'ongoing')        return status === 'SCHEDULED';
    if (activeTab === 'api_triggered')  return false; // future
    return true;
  };

  const filteredList = campaignList
    .filter(tabFilter)
    .filter((c) => !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase()));

  // ── Wizard view ──────────────────────────────────────────────────────────────
  if (view === 'wizard') {
    return (
      <>
        {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
        <CampaignWizard
          onClose={() => setView('list')}
          onSaved={(msg) => { showToast(msg); loadCampaigns(); setView('list'); }}
        />
      </>
    );
  }

  // ── Detail view ──────────────────────────────────────────────────────────────
  if (view === 'detail' && selected) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
        <CampaignDetail campaign={selected} onBack={handleBackFromDetail} onRefresh={refreshSelected} />
      </div>
    );
  }

  // ── List view ────────────────────────────────────────────────────────────────
  const an = analytics?.totals || {};
  const bs = analytics?.byStatus || {};

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Campaigns</h1>
          <p className="text-sm text-gray-500 mt-0.5">Send bulk WhatsApp messages to your guests</p>
        </div>
        <button
          onClick={() => setView('wizard')}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#25D366] text-white text-sm font-semibold rounded-xl hover:bg-[#128C7E] transition-colors shadow-sm"
        >
          <Plus size={16} />
          Create New Campaign
        </button>
      </div>

      {/* Analytics cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total Campaigns',  value: an.campaigns || 0,                      color: 'text-gray-800',   bg: 'bg-white' },
          { label: 'Running',          value: bs.running   || 0,                      color: 'text-blue-600',   bg: 'bg-blue-50' },
          { label: 'Completed',        value: bs.completed || 0,                      color: 'text-green-600',  bg: 'bg-green-50' },
          { label: 'Total Sent',       value: an.sent      || 0,                      color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Delivery Rate',    value: `${an.deliveryRate || 0}%`,              color: 'text-green-600',  bg: 'bg-green-50' },
          { label: 'Read Rate',        value: `${an.readRate || 0}%`,                 color: 'text-blue-600',   bg: 'bg-blue-50' },
        ].map((card) => (
          <div key={card.label} className={`${card.bg} rounded-xl border border-gray-100 shadow-sm p-4 text-center`}>
            <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
            <p className="text-xs text-gray-500 mt-0.5 leading-tight">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs + search */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-5 pt-4 pb-0 border-b border-gray-100">
          {/* Tabs */}
          <div className="flex gap-0 overflow-x-auto">
            {[
              { key: 'one_time',      label: 'One Time' },
              { key: 'ongoing',       label: 'Ongoing' },
              { key: 'api_triggered', label: 'API Triggered' },
            ].map(({ key, label }) => {
              const cnt = key === 'one_time'
                ? campaignList.filter((c) => !['SCHEDULED'].includes((c.status||'').toUpperCase())).length
                : key === 'ongoing'
                ? campaignList.filter((c) => (c.status||'').toUpperCase() === 'SCHEDULED').length
                : 0;
              return (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    activeTab === key
                      ? 'border-[#25D366] text-[#25D366]'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {label}
                  <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${activeTab === key ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {cnt}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search */}
          <div className="pb-3 sm:pb-2">
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search campaigns…"
              className="w-full sm:w-56 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#25D366]"
            />
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={28} className="animate-spin text-[#25D366]" />
          </div>
        ) : filteredList.length === 0 ? (
          <div className="py-16 text-center">
            <Send size={32} className="mx-auto mb-3 text-gray-300" />
            <p className="text-sm text-gray-500 font-medium">No campaigns found</p>
            <p className="text-xs text-gray-400 mt-1">
              {searchQuery ? 'Try a different search term.' : 'Create your first campaign to get started.'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setView('wizard')}
                className="mt-4 px-4 py-2 bg-[#25D366] text-white text-sm rounded-lg hover:bg-[#128C7E]"
              >
                Create Campaign
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Campaign Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Channel</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Template / Category</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Attempted</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Sent</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Delivered</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Read</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Set Live</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredList.map((c) => {
                  const status    = (c.status || '').toUpperCase();
                  const isActing  = actingId === c.id;
                  const attempted = (c.sentCount || 0) + (c.failedCount || 0);
                  return (
                    <tr
                      key={c.id}
                      onClick={() => handleViewDetail(c)}
                      className="hover:bg-gray-50 cursor-pointer transition-colors group"
                    >
                      {/* Name + audience */}
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-gray-900 group-hover:text-[#25D366] transition-colors">{c.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                          <Users size={10} />
                          {AUDIENCE_LABELS[c.audienceType] || c.audienceType}
                          {c._count?.recipients > 0 && ` · ${c._count.recipients}`}
                        </p>
                      </td>

                      {/* Channel */}
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                          <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.136.558 4.142 1.534 5.878L.057 23.012c-.09.321.029.659.295.844.266.185.623.16.862-.06l4.985-4.284A11.94 11.94 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.205-1.489l-.361-.218-3.76 3.231 1.098-3.981-.245-.38A9.782 9.782 0 012.182 12c0-5.418 4.4-9.818 9.818-9.818 5.419 0 9.818 4.4 9.818 9.818S17.419 21.818 12 21.818z"/>
                          </svg>
                          WhatsApp
                        </span>
                      </td>

                      {/* Template / Category */}
                      <td className="px-4 py-3.5">
                        <p className="text-xs font-medium text-gray-700">{c.template?.name || '—'}</p>
                        {c.template?.category && (
                          <p className="text-xs text-gray-400 capitalize mt-0.5">{c.template.category.toLowerCase()}</p>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5"><StatusBadge status={c.status} /></td>

                      {/* Numbers */}
                      <td className="px-4 py-3.5 text-right text-sm text-gray-600 font-medium">{attempted || c._count?.recipients || 0}</td>
                      <td className="px-4 py-3.5 text-right text-sm text-gray-600">{c.sentCount      ?? 0}</td>
                      <td className="px-4 py-3.5 text-right text-sm text-gray-600">{c.deliveredCount ?? 0}</td>
                      <td className="px-4 py-3.5 text-right text-sm text-gray-600">{c.readCount      ?? 0}</td>

                      {/* Set Live / scheduled */}
                      <td className="px-4 py-3.5 text-xs text-gray-500">
                        {c.startedAt ? (
                          <span className="flex items-center gap-1">
                            <Clock size={10} className="text-green-500" />
                            {format(new Date(c.startedAt), 'MMM dd, HH:mm')}
                          </span>
                        ) : c.scheduledAt ? (
                          <span className="flex items-center gap-1 text-purple-600">
                            <Calendar size={10} />
                            {format(new Date(c.scheduledAt), 'MMM dd, HH:mm')}
                          </span>
                        ) : '—'}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          {isActing ? (
                            <Loader2 size={14} className="animate-spin text-gray-400 mx-1" />
                          ) : (
                            <>
                              <button
                                onClick={(e) => handleViewDetail(c)}
                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="View details"
                              >
                                <BarChart2 size={14} />
                              </button>
                              {(status === 'DRAFT' || status === 'SCHEDULED') && (
                                <button
                                  onClick={(e) => handleLaunch(c.id, e)}
                                  className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                  title="Launch"
                                >
                                  <Play size={14} />
                                </button>
                              )}
                              {(status === 'RUNNING' || status === 'SCHEDULED') && (
                                <button
                                  onClick={(e) => handleCancel(c.id, e)}
                                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Cancel"
                                >
                                  <StopCircle size={14} />
                                </button>
                              )}
                              {(status === 'DRAFT' || status === 'CANCELLED' || status === 'FAILED') && (
                                <button
                                  onClick={(e) => handleDelete(c.id, e)}
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

        {/* Table footer */}
        {!loading && filteredList.length > 0 && (
          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between bg-gray-50">
            <p className="text-xs text-gray-500">
              Showing {filteredList.length} of {campaignList.length} campaigns
            </p>
            <button onClick={loadCampaigns} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 transition-colors">
              <RefreshCw size={12} />
              Refresh
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
