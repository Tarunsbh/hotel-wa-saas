import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search, Send, Check, CheckCheck, Loader2, MessageCircle, X, Phone,
  Plus, RefreshCw, FileText, ChevronLeft, ChevronRight, Trash2,
  MoreVertical, AlertCircle, Clock, CheckCircle, Archive,
  Wifi, WifiOff, User,
} from 'lucide-react';
import { conversations, messages, auth, templates, guests } from '../api/index.js';
import { format, formatDistanceToNow } from 'date-fns';
import { io } from 'socket.io-client';

// ─── Shared styles ─────────────────────────────────────────────────────────────
const inputCls =
  'w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 text-gray-800 placeholder-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#25D366]/30 focus:border-[#25D366] transition-all';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getGuestName(conv) {
  return conv.guest?.name || conv.guest?.phone || 'Unknown';
}
function getGuestPhone(conv) {
  return conv.guest?.phone || '';
}
function getInitial(name) {
  return (name || '?').charAt(0).toUpperCase();
}

// ─── Badges ───────────────────────────────────────────────────────────────────
function StayBadge({ status }) {
  const map = {
    ARRIVING:    'bg-blue-50 text-blue-600 border border-blue-100',
    IN_HOUSE:    'bg-emerald-50 text-emerald-600 border border-emerald-100',
    CHECKED_OUT: 'bg-gray-50 text-gray-500 border border-gray-100',
    NO_STAY:     'bg-gray-50 text-gray-400 border border-gray-100',
  };
  const label = { ARRIVING: 'Arriving', IN_HOUSE: 'In House', CHECKED_OUT: 'Checked Out', NO_STAY: 'No Stay' };
  if (!status) return null;
  return (
    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold ${map[status] || 'bg-gray-50 text-gray-500 border border-gray-100'}`}>
      {label[status] || status}
    </span>
  );
}

function ConvStatusBadge({ status }) {
  const map = {
    OPEN:     'bg-blue-50 text-blue-600 border border-blue-100',
    PENDING:  'bg-amber-50 text-amber-600 border border-amber-100',
    RESOLVED: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
    ARCHIVED: 'bg-gray-50 text-gray-500 border border-gray-100',
  };
  return (
    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold capitalize ${map[status?.toUpperCase()] || 'bg-gray-50 text-gray-500 border border-gray-100'}`}>
      {(status || '').toLowerCase()}
    </span>
  );
}

function MsgStatus({ status }) {
  if (status === 'READ')      return <CheckCheck size={13} className="text-blue-400 flex-shrink-0" />;
  if (status === 'DELIVERED') return <CheckCheck size={13} className="text-gray-400 flex-shrink-0" />;
  if (status === 'SENT')      return <Check size={13} className="text-gray-400 flex-shrink-0" />;
  if (status === 'FAILED')    return <X size={13} className="text-red-400 flex-shrink-0" />;
  return <Check size={13} className="text-gray-300 flex-shrink-0" />;
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ name, size = 10 }) {
  return (
    <div className={`w-${size} h-${size} rounded-2xl bg-gradient-to-br from-[#25D366] to-[#075E54] flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
      {getInitial(name)}
    </div>
  );
}

// ─── Conversation list item ────────────────────────────────────────────────────
function ConvItem({ conv, active, onClick }) {
  const name = getGuestName(conv);
  const timeAgo = conv.lastMessageAt
    ? formatDistanceToNow(new Date(conv.lastMessageAt), { addSuffix: false })
    : '';

  return (
    <button
      onClick={onClick}
      className={`w-full text-left flex items-start gap-3 px-4 py-3.5 transition-all relative ${
        active
          ? 'bg-[#25D366]/8 border-l-2 border-l-[#25D366]'
          : 'border-l-2 border-l-transparent hover:bg-gray-50/80'
      }`}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0 mt-0.5">
        <Avatar name={name} size={10} />
        {conv.unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-[#25D366] rounded-full flex items-center justify-center text-white text-[9px] font-bold">
            {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-1 mb-0.5">
          <p className={`text-sm truncate ${conv.unreadCount > 0 ? 'font-bold text-gray-900' : 'font-semibold text-gray-700'}`}>
            {name}
          </p>
          <span className="text-[10px] text-gray-400 flex-shrink-0 mt-0.5">{timeAgo}</span>
        </div>
        <p className={`text-xs truncate ${conv.unreadCount > 0 ? 'font-medium text-gray-700' : 'text-gray-400'}`}>
          {conv.lastMessage || 'No messages yet'}
        </p>
        <div className="flex items-center gap-1.5 mt-1.5">
          <StayBadge status={conv.guest?.stayStatus} />
          <ConvStatusBadge status={conv.status} />
        </div>
      </div>
    </button>
  );
}

// ─── Skeleton loaders ─────────────────────────────────────────────────────────
function ConvSkeleton() {
  return (
    <div className="flex items-start gap-3 px-4 py-3.5 border-l-2 border-l-transparent animate-pulse">
      <div className="w-10 h-10 rounded-2xl bg-gray-100 flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="flex justify-between">
          <div className="h-3.5 w-24 bg-gray-100 rounded-lg" />
          <div className="h-3 w-10 bg-gray-100 rounded-lg" />
        </div>
        <div className="h-3 w-40 bg-gray-100 rounded-lg" />
        <div className="flex gap-1.5">
          <div className="h-4 w-14 bg-gray-100 rounded-lg" />
          <div className="h-4 w-12 bg-gray-100 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

// ─── Message bubble ───────────────────────────────────────────────────────────
function MessageBubble({ msg }) {
  const isOut = msg.direction === 'OUTBOUND' || msg.direction === 'outbound';
  const body = msg.body || msg.text || '';
  const isFailed = msg.status === 'FAILED';

  return (
    <div className={`flex ${isOut ? 'justify-end' : 'justify-start'} mb-1.5`}>
      <div
        className={`max-w-[78%] sm:max-w-[65%] px-3.5 py-2.5 rounded-2xl shadow-sm ${
          isFailed
            ? 'bg-red-50 border border-red-100 rounded-br-sm'
            : isOut
            ? 'bg-[#DCF8C6] rounded-br-sm'
            : 'bg-white rounded-bl-sm'
        }`}
      >
        {msg.type === 'IMAGE' && msg.mediaUrl && (
          <img src={msg.mediaUrl} alt="media" className="rounded-xl mb-1.5 max-w-full" />
        )}
        {body && (
          <p className={`text-sm leading-relaxed whitespace-pre-wrap break-words ${isFailed ? 'text-red-700' : 'text-gray-800'}`}>
            {body}
          </p>
        )}
        <div className={`flex items-center gap-1 mt-1 ${isOut ? 'justify-end' : 'justify-start'}`}>
          {isFailed && <span className="text-[10px] text-red-400 font-medium">Failed</span>}
          <span className="text-[10px] text-gray-400">
            {msg.createdAt ? format(new Date(msg.createdAt), 'HH:mm') : ''}
          </span>
          {isOut && <MsgStatus status={msg.status} />}
        </div>
      </div>
    </div>
  );
}

// ─── Date divider ─────────────────────────────────────────────────────────────
function DateDivider({ date }) {
  return (
    <div className="flex items-center gap-3 my-3">
      <div className="flex-1 h-px bg-gray-200/60" />
      <span className="text-[10px] text-gray-400 font-medium bg-[#e9eef3] px-2 py-0.5 rounded-full">
        {date}
      </span>
      <div className="flex-1 h-px bg-gray-200/60" />
    </div>
  );
}

// ─── Message list with date grouping ─────────────────────────────────────────
function MessageList({ msgList, messagesEndRef }) {
  const grouped = [];
  let lastDate = null;
  for (const msg of msgList) {
    const d = msg.createdAt ? format(new Date(msg.createdAt), 'MMMM d, yyyy') : null;
    if (d && d !== lastDate) {
      grouped.push({ type: 'divider', date: d });
      lastDate = d;
    }
    grouped.push({ type: 'msg', msg });
  }

  return (
    <div className="flex flex-col py-3 px-4 sm:px-6">
      {grouped.map((item, i) =>
        item.type === 'divider'
          ? <DateDivider key={`d-${i}`} date={item.date} />
          : <MessageBubble key={item.msg.id || i} msg={item.msg} />
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}

// ─── New Chat Modal ────────────────────────────────────────────────────────────
function NewChatModal({ onClose, onConversationStarted }) {
  const [phone, setPhone] = useState('');
  const [msgText, setMsgText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const handleSend = async (e) => {
    e.preventDefault();
    setError('');
    if (!phone.trim() || !msgText.trim()) return;
    let to = phone.trim().replace(/\s+/g, '');
    if (!to.startsWith('+')) to = '+' + to;
    setSending(true);
    try {
      const res = await messages.sendToNumber(to, msgText.trim());
      const { conversation } = res.data;
      onConversationStarted(conversation);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send. Check the phone number and try again.');
    } finally {
      setSending(false);
    }
  };

  const fieldCls = 'w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 placeholder-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#25D366]/30 focus:border-[#25D366] transition-all';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl">
        {/* Handle bar (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 sm:pt-5 pb-3 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900">New Conversation</h2>
            <p className="text-xs text-gray-400 mt-0.5">Start a chat with any WhatsApp number</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors">
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSend} className="px-5 py-4 space-y-4">
          {error && (
            <div className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs">
              <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Phone Number <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="917812345678 or +917812345678"
                required
                autoFocus
                className={`${fieldCls} pl-9`}
              />
            </div>
            <p className="text-[10px] text-gray-400 mt-1.5">Enter with country code, e.g. 917812345678</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Message <span className="text-red-400">*</span>
            </label>
            <textarea
              value={msgText}
              onChange={(e) => setMsgText(e.target.value)}
              placeholder="Type your first message…"
              required
              rows={3}
              className={`${fieldCls} resize-none`}
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={sending || !phone.trim() || !msgText.trim()}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#25D366] text-white rounded-xl text-sm font-bold hover:bg-[#128C7E] disabled:opacity-50 transition-all shadow-sm shadow-[#25D366]/25">
              {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              {sending ? 'Sending…' : 'Send'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Send Template Modal ──────────────────────────────────────────────────────
function SendTemplateModal({ conversationId, onClose, onSent }) {
  const [allTemplates, setAllTemplates] = useState([]);
  const [loading,       setLoading]     = useState(true);
  const [selected,      setSelected]    = useState(null);
  const [variables,     setVariables]   = useState({});
  const [sending,       setSending]     = useState(false);
  const [error,         setError]       = useState('');

  useEffect(() => {
    templates.list({ status: 'APPROVED', limit: 100 })
      .then((res) => {
        const data = res.data?.data || res.data || [];
        setAllTemplates(Array.isArray(data) ? data : []);
      })
      .catch(() => setAllTemplates([]))
      .finally(() => setLoading(false));
  }, []);

  const extractVars = (tpl) => {
    if (!tpl) return [];
    const text = [tpl.headerText, tpl.bodyText, tpl.footerText].join(' ');
    const matches = [...new Set(text.match(/{{(\d+)}}/g) || [])];
    return matches.sort((a, b) => {
      const ai = parseInt(a.replace(/[{}]/g, ''), 10);
      const bi = parseInt(b.replace(/[{}]/g, ''), 10);
      return ai - bi;
    });
  };

  const handleSelectTemplate = (tpl) => { setSelected(tpl); setVariables({}); setError(''); };

  const preview = selected
    ? (selected.bodyText || '').replace(/{{(\d+)}}/g, (_, n) => variables[n] || `{{${n}}}`)
    : '';

  const handleSend = async () => {
    setError('');
    setSending(true);
    try {
      const varKeys = extractVars(selected);
      for (const k of varKeys) {
        const idx = k.replace(/[{}]/g, '');
        if (!variables[idx]?.trim()) {
          setError(`Please fill in variable ${k}`);
          setSending(false);
          return;
        }
      }
      await messages.sendTemplate(conversationId, { templateId: selected.id, variableValues: variables });
      onSent();
      onClose();
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to send template');
    } finally {
      setSending(false);
    }
  };

  const varKeys = extractVars(selected);
  const fieldCls = 'w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 placeholder-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#25D366]/30 focus:border-[#25D366] transition-all';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[85vh]">
        {/* Mobile handle */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 sm:pt-5 pb-3 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            {selected && (
              <button onClick={() => setSelected(null)}
                className="w-7 h-7 flex items-center justify-center rounded-xl bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors">
                <ChevronLeft size={14} />
              </button>
            )}
            <div>
              <h2 className="text-base font-bold text-gray-900">
                {selected ? selected.name : 'Send Template'}
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {selected ? 'Fill in variables and send' : 'Choose an approved template'}
              </p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors">
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col gap-3 p-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-gray-100 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : allTemplates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
                <FileText size={22} className="text-gray-400" />
              </div>
              <p className="text-sm font-semibold text-gray-700">No approved templates</p>
              <p className="text-xs text-gray-400 mt-1">Create and submit a template for Meta approval first.</p>
            </div>
          ) : !selected ? (
            <div className="p-4 space-y-2">
              {allTemplates.map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => handleSelectTemplate(tpl)}
                  className="w-full text-left p-3.5 border border-gray-100 rounded-2xl hover:border-[#25D366]/40 hover:bg-[#25D366]/4 transition-all flex items-start gap-3 group shadow-sm hover:shadow-md"
                >
                  <div className="w-8 h-8 rounded-xl bg-[#25D366]/10 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-[#25D366]/20 transition-colors">
                    <FileText size={14} className="text-[#25D366]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-semibold text-gray-800 truncate">{tpl.name}</p>
                      <span className="text-[10px] px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded-lg font-semibold flex-shrink-0 border border-indigo-100">
                        {tpl.category}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 line-clamp-2">{tpl.bodyText}</p>
                  </div>
                  <ChevronRight size={14} className="text-gray-300 group-hover:text-[#25D366] mt-1 flex-shrink-0 transition-colors" />
                </button>
              ))}
            </div>
          ) : (
            <div className="p-4 space-y-4">
              {/* Preview bubble */}
              <div className="bg-[#DCF8C6] rounded-2xl rounded-br-sm px-4 py-3 shadow-sm mx-auto max-w-[85%] self-end ml-auto">
                {selected.headerText && (
                  <p className="text-sm font-bold text-gray-800 mb-1">{selected.headerText}</p>
                )}
                <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                  {preview || selected.bodyText}
                </p>
                {selected.footerText && (
                  <p className="text-xs text-gray-500 mt-1.5 italic">{selected.footerText}</p>
                )}
                {selected.buttons?.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5 pt-2.5 border-t border-green-200">
                    {selected.buttons.map((btn, i) => (
                      <span key={i} className="px-3 py-1 bg-white text-blue-600 text-xs rounded-full border border-blue-100 font-medium">
                        {btn.text}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Variable inputs */}
              {varKeys.length > 0 && (
                <div className="space-y-3 p-4 bg-amber-50 border border-amber-100 rounded-2xl">
                  <p className="text-xs font-semibold text-amber-700">Fill in variables:</p>
                  {varKeys.map((k) => {
                    const idx = k.replace(/[{}]/g, '');
                    return (
                      <div key={k}>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                          Variable <span className="font-mono text-[#25D366]">{k}</span>
                        </label>
                        <input
                          value={variables[idx] || ''}
                          onChange={(e) => setVariables({ ...variables, [idx]: e.target.value })}
                          placeholder={`Value for ${k}`}
                          className={fieldCls}
                          autoFocus={idx === '1'}
                        />
                      </div>
                    );
                  })}
                </div>
              )}

              {error && (
                <div className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs">
                  <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {selected && (
          <div className="px-5 py-4 border-t border-gray-100 flex gap-3 flex-shrink-0">
            <button onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button onClick={handleSend} disabled={sending}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#25D366] text-white rounded-xl text-sm font-bold hover:bg-[#128C7E] disabled:opacity-60 transition-all shadow-sm shadow-[#25D366]/25">
              {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              {sending ? 'Sending…' : 'Send Template'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Conversation header actions ──────────────────────────────────────────────
function ConvHeader({ conv, onBack, onTemplate, onStatusChange, onDelete, onDeleteNumber, agentList, onAssign }) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const STATUS_ACTIONS = [
    { value: 'OPEN',     label: 'Mark Open',     icon: MessageCircle, cls: 'text-blue-600' },
    { value: 'PENDING',  label: 'Mark Pending',  icon: Clock,          cls: 'text-amber-600' },
    { value: 'RESOLVED', label: 'Mark Resolved', icon: CheckCircle,    cls: 'text-emerald-600' },
    { value: 'ARCHIVED', label: 'Archive',        icon: Archive,        cls: 'text-gray-500' },
  ];

  return (
    <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 flex-shrink-0 shadow-sm">
      {/* Back (mobile) */}
      <button onClick={onBack}
        className="lg:hidden w-8 h-8 flex items-center justify-center rounded-xl bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors flex-shrink-0">
        <ChevronLeft size={16} />
      </button>

      {/* Avatar */}
      <Avatar name={getGuestName(conv)} size={10} />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-gray-900 truncate">{getGuestName(conv)}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-xs text-gray-400 flex items-center gap-1">
            <Phone size={9} />
            {getGuestPhone(conv)}
          </p>
          <StayBadge status={conv.guest?.stayStatus} />
          <ConvStatusBadge status={conv.status} />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Template button */}
        <button onClick={onTemplate}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#25D366]/10 text-[#25D366] text-xs font-semibold hover:bg-[#25D366]/20 transition-colors border border-[#25D366]/20">
          <FileText size={12} />
          Template
        </button>

        {/* More menu */}
        <div className="relative" ref={menuRef}>
          <button onClick={() => setShowMenu((s) => !s)}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors">
            <MoreVertical size={15} />
          </button>

          {showMenu && (
            <div className="absolute right-0 top-10 z-50 w-52 bg-white rounded-2xl shadow-xl border border-gray-100 py-1.5 overflow-hidden">
              {/* Template (mobile) */}
              <button onClick={() => { onTemplate(); setShowMenu(false); }}
                className="sm:hidden w-full text-left flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                <FileText size={14} className="text-[#25D366]" />
                Send Template
              </button>

              {/* Status changes */}
              <div className="px-3 py-1.5">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Status</p>
              </div>
              {STATUS_ACTIONS.filter((a) => a.value !== (conv.status || '').toUpperCase()).map((a) => (
                <button key={a.value}
                  onClick={() => { onStatusChange(a.value); setShowMenu(false); }}
                  className="w-full text-left flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                  <a.icon size={14} className={a.cls} />
                  {a.label}
                </button>
              ))}

              {/* Agent assign */}
              {agentList.length > 0 && (
                <>
                  <div className="border-t border-gray-100 mx-2 my-1" />
                  <div className="px-3 py-1.5">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Assign to</p>
                  </div>
                  {agentList.slice(0, 5).map((agent) => (
                    <button key={agent.id}
                      onClick={() => { onAssign(agent.id); setShowMenu(false); }}
                      className="w-full text-left flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                      <User size={14} className="text-gray-400" />
                      {agent.name || agent.email}
                    </button>
                  ))}
                  <button onClick={() => { onAssign(null); setShowMenu(false); }}
                    className="w-full text-left flex items-center gap-2.5 px-4 py-2 text-sm text-gray-500 hover:bg-gray-50 transition-colors">
                    <User size={14} className="text-gray-300" />
                    Unassign
                  </button>
                </>
              )}

              {/* Delete actions */}
              <div className="border-t border-gray-100 mx-2 my-1" />
              <button onClick={() => { onDelete(); setShowMenu(false); }}
                className="w-full text-left flex items-center gap-2.5 px-4 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors">
                <Trash2 size={14} />
                Delete Chat
              </button>
              <button onClick={() => { onDeleteNumber(); setShowMenu(false); }}
                className="w-full text-left flex items-center gap-2.5 px-4 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors">
                <X size={14} />
                Delete Number
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function InboxPage() {
  const [convList,          setConvList]          = useState([]);
  const [selectedConv,      setSelectedConv]      = useState(null);
  const [msgList,           setMsgList]           = useState([]);
  const [search,            setSearch]            = useState('');
  const [statusFilter,      setStatusFilter]      = useState('all');
  const [inputText,         setInputText]         = useState('');
  const [sending,           setSending]           = useState(false);
  const [loadingConvs,      setLoadingConvs]      = useState(true);
  const [loadingMsgs,       setLoadingMsgs]       = useState(false);
  const [agentList,         setAgentList]         = useState([]);
  const [error,             setError]             = useState('');
  const [showNewChat,       setShowNewChat]       = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [socketConnected,   setSocketConnected]   = useState(false);

  const messagesEndRef    = useRef(null);
  const socketRef         = useRef(null);
  const selectedConvRef   = useRef(null);
  const textareaRef       = useRef(null);
  selectedConvRef.current = selectedConv;

  // ── Load conversations ────────────────────────────────────────────────────
  const loadConversations = useCallback(async () => {
    setLoadingConvs(true);
    setError('');
    try {
      const params = {};
      if (statusFilter !== 'all') params.status = statusFilter.toUpperCase();
      const res = await conversations.list(params);
      const raw = res.data?.data || res.data || [];
      setConvList(Array.isArray(raw) ? raw : []);
    } catch (e) {
      const status = e?.response?.status;
      const msg = e?.response?.data?.message || e?.message || 'Unknown error';
      if (status === 401) return;
      setError(`Failed to load (${status || 'Network'}: ${msg})`);
      setConvList([]);
    } finally {
      setLoadingConvs(false);
    }
  }, [statusFilter]);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  // ── Load agents ───────────────────────────────────────────────────────────
  useEffect(() => {
    auth.listAgents()
      .then((res) => { const d = res.data?.data || res.data || []; setAgentList(Array.isArray(d) ? d : []); })
      .catch(() => setAgentList([]));
  }, []);

  // ── Socket.IO ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    const apiUrl = import.meta.env.VITE_API_URL || '';
    const SOCKET_URL = apiUrl.startsWith('http')
      ? apiUrl.replace('/api/v1', '')
      : window.location.origin;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socket.on('connect',       () => { setSocketConnected(true); });
    socket.on('disconnect',    () => setSocketConnected(false));
    socket.on('connect_error', () => setSocketConnected(false));

    socket.on('new_message', (payload) => {
      const current = selectedConvRef.current;
      if (current && payload.conversationId === current.id) {
        setMsgList((prev) => {
          const exists = prev.find((m) => m.id === payload.message?.id || m.waMessageId === payload.message?.waMessageId);
          if (exists) return prev;
          return [...prev, payload.message];
        });
      }
      loadConversations();
    });

    socket.on('message_status', (payload) => {
      setMsgList((prev) =>
        prev.map((m) =>
          m.waMessageId === payload.waMessageId || m.id === payload.messageId
            ? { ...m, status: payload.status }
            : m,
        ),
      );
    });

    socket.on('conversation_update', () => { loadConversations(); });

    socketRef.current = socket;
    return () => { socket.disconnect(); };
  }, [loadConversations]);

  // ── Load messages ─────────────────────────────────────────────────────────
  const loadMessages = useCallback(async (convId, showSpinner = true) => {
    if (!convId) return;
    if (showSpinner) setLoadingMsgs(true);
    try {
      const res = await messages.listByConversation(convId, { limit: 100 });
      const data = res.data?.data || res.data || [];
      setMsgList(Array.isArray(data) ? data : []);
    } catch {
      // keep existing messages on error
    } finally {
      setLoadingMsgs(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedConv) return;
    setMsgList([]);
    loadMessages(selectedConv.id, true);
    conversations.markRead(selectedConv.id).catch(() => {});
    setConvList((prev) => prev.map((c) => c.id === selectedConv.id ? { ...c, unreadCount: 0 } : c));
    socketRef.current?.emit('join_conversation', { conversationId: selectedConv.id });
    textareaRef.current?.focus();
  }, [selectedConv?.id, loadMessages]);

  // ── Polling fallback ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedConv?.id) return;
    const i = setInterval(() => loadMessages(selectedConv.id, false), 4000);
    return () => clearInterval(i);
  }, [selectedConv?.id, loadMessages]);

  useEffect(() => {
    const i = setInterval(() => loadConversations(), 8000);
    return () => clearInterval(i);
  }, [loadConversations]);

  // ── Scroll to bottom ──────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgList]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSelectConv = (conv) => {
    if (selectedConv?.id) socketRef.current?.emit('leave_conversation', { conversationId: selectedConv.id });
    setSelectedConv(conv);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    const text = inputText.trim();
    if (!text || !selectedConv || sending) return;
    setSending(true);
    const tempId = `temp_${Date.now()}`;
    const optimistic = { id: tempId, body: text, direction: 'OUTBOUND', status: 'PENDING', type: 'TEXT', createdAt: new Date().toISOString() };
    setMsgList((prev) => [...prev, optimistic]);
    setInputText('');
    try {
      const res = await messages.sendText(selectedConv.id, { body: text });
      const sent = res.data;
      setMsgList((prev) => prev.map((m) => m.id === tempId ? { ...sent, body: sent.body || text } : m));
    } catch {
      setMsgList((prev) => prev.map((m) => m.id === tempId ? { ...m, status: 'FAILED' } : m));
    } finally {
      setSending(false);
    }
  };

  const handleStatusChange = async (status) => {
    if (!selectedConv) return;
    try {
      await conversations.updateStatus(selectedConv.id, status.toUpperCase());
      setSelectedConv((prev) => ({ ...prev, status: status.toUpperCase() }));
      setConvList((prev) => prev.map((c) => c.id === selectedConv.id ? { ...c, status: status.toUpperCase() } : c));
    } catch {}
  };

  const handleAssign = async (agentId) => {
    if (!selectedConv) return;
    try {
      const res = await conversations.assign(selectedConv.id, agentId || null);
      setSelectedConv((prev) => ({ ...prev, assignedAgent: res.data?.assignedAgent || null }));
    } catch {}
  };

  const handleDeleteConversation = async () => {
    if (!selectedConv) return;
    if (!window.confirm(`Delete this chat with ${getGuestPhone(selectedConv)}?`)) return;
    try {
      await conversations.remove(selectedConv.id);
      setConvList((prev) => prev.filter((c) => c.id !== selectedConv.id));
      setSelectedConv(null);
      setMsgList([]);
    } catch (e) {
      window.alert(e.response?.data?.message || 'Unable to delete chat.');
    }
  };

  const handleDeleteNumber = async () => {
    if (!selectedConv?.guest?.id) return;
    if (!window.confirm(`Delete ${getGuestPhone(selectedConv)} and all chat history? This cannot be undone.`)) return;
    try {
      await guests.forceRemove(selectedConv.guest.id);
      setConvList((prev) => prev.filter((c) => c.guest?.id !== selectedConv.guest.id));
      setSelectedConv(null);
      setMsgList([]);
    } catch (e) {
      window.alert(e.response?.data?.message || 'Unable to delete number.');
    }
  };

  const handleNewConversationStarted = (conversation) => {
    setConvList((prev) => {
      const exists = prev.find((c) => c.id === conversation.id);
      return exists ? prev : [conversation, ...prev];
    });
    setSelectedConv(conversation);
    loadConversations();
  };

  const filteredConvs = convList.filter((c) => {
    const name  = getGuestName(c).toLowerCase();
    const phone = getGuestPhone(c);
    const matchSearch = !search || name.includes(search.toLowerCase()) || phone.includes(search);
    const matchStatus = statusFilter === 'all' || (c.status || '').toUpperCase() === statusFilter.toUpperCase();
    return matchSearch && matchStatus;
  });

  const FILTERS = [
    { value: 'all',      label: 'All' },
    { value: 'OPEN',     label: 'Open' },
    { value: 'PENDING',  label: 'Pending' },
    { value: 'RESOLVED', label: 'Resolved' },
  ];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="h-full flex overflow-hidden bg-[#F4F6F8]">
      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      {showNewChat && (
        <NewChatModal
          onClose={() => setShowNewChat(false)}
          onConversationStarted={handleNewConversationStarted}
        />
      )}
      {showTemplateModal && selectedConv && (
        <SendTemplateModal
          conversationId={selectedConv.id}
          onClose={() => setShowTemplateModal(false)}
          onSent={() => { loadMessages(selectedConv.id, false); loadConversations(); }}
        />
      )}

      {/* ── Left panel: conversation list ──────────────────────────────────── */}
      <div className={`w-full lg:w-[320px] xl:w-[360px] flex-shrink-0 bg-white border-r border-gray-100 flex flex-col min-h-0 shadow-sm ${
        selectedConv ? 'hidden lg:flex' : 'flex'
      }`}>
        {/* Panel header */}
        <div className="px-4 pt-4 pb-3 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-gray-900">Inbox</h1>
              {/* Live indicator */}
              <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                socketConnected
                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                  : 'bg-amber-50 text-amber-600 border border-amber-100'
              }`}>
                {socketConnected ? <Wifi size={9} /> : <WifiOff size={9} />}
                {socketConnected ? 'Live' : 'Polling'}
              </div>
              {convList.length > 0 && (
                <span className="text-xs text-gray-400 font-medium">{convList.length}</span>
              )}
            </div>
            <button onClick={() => setShowNewChat(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#25D366] hover:bg-[#128C7E] text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-[#25D366]/25 active:scale-95">
              <Plus size={12} />
              New Chat
            </button>
          </div>

          {/* Search */}
          <div className="relative mb-2.5">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or phone…"
              className="w-full pl-8 pr-3 py-2 text-xs border border-gray-200 rounded-xl bg-gray-50 placeholder-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#25D366]/30 focus:border-[#25D366] transition-all"
            />
          </div>

          {/* Status filters */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={`flex-1 py-1 text-[11px] rounded-lg font-semibold transition-all ${
                  statusFilter === f.value
                    ? 'bg-white text-gray-800 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {loadingConvs ? (
            <div className="divide-y divide-gray-50">
              {[1, 2, 3, 4, 5].map((i) => <ConvSkeleton key={i} />)}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mb-3">
                <AlertCircle size={20} className="text-red-400" />
              </div>
              <p className="text-xs text-red-500 mb-2">{error}</p>
              <button onClick={loadConversations}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#25D366]/10 text-[#25D366] rounded-xl text-xs font-semibold hover:bg-[#25D366]/20 transition-colors">
                <RefreshCw size={11} />
                Retry
              </button>
            </div>
          ) : filteredConvs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
                <MessageCircle size={22} className="text-gray-400" />
              </div>
              <p className="text-sm font-semibold text-gray-600">
                {search ? 'No matches found' : 'No conversations yet'}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {search ? 'Try a different name or phone' : 'Guest messages will appear here'}
              </p>
              {!search && (
                <button onClick={() => setShowNewChat(true)}
                  className="mt-4 flex items-center gap-1.5 px-4 py-2 bg-[#25D366] text-white rounded-xl text-xs font-bold shadow-sm shadow-[#25D366]/25 hover:bg-[#128C7E] transition-all">
                  <Plus size={12} />
                  Start New Chat
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {filteredConvs.map((conv) => (
                <ConvItem
                  key={conv.id}
                  conv={conv}
                  active={selectedConv?.id === conv.id}
                  onClick={() => handleSelectConv(conv)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Right panel: chat window ────────────────────────────────────────── */}
      <div className={`flex-1 flex flex-col min-h-0 overflow-hidden ${selectedConv ? 'flex' : 'hidden lg:flex'}`}>
        {!selectedConv ? (
          /* Empty state */
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
            <div className="w-20 h-20 rounded-3xl bg-white border border-gray-100 shadow-sm flex items-center justify-center mb-4">
              <MessageCircle size={32} className="text-gray-300" />
            </div>
            <p className="text-base font-bold text-gray-700">Select a conversation</p>
            <p className="text-sm text-gray-400 mt-1 max-w-xs">
              Choose a chat from the left panel, or start a new conversation
            </p>
            <button onClick={() => setShowNewChat(true)}
              className="mt-5 flex items-center gap-2 px-5 py-2.5 bg-[#25D366] text-white rounded-2xl text-sm font-bold shadow-md shadow-[#25D366]/25 hover:bg-[#128C7E] transition-all active:scale-95">
              <Plus size={15} />
              New Conversation
            </button>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <ConvHeader
              conv={selectedConv}
              onBack={() => setSelectedConv(null)}
              onTemplate={() => setShowTemplateModal(true)}
              onStatusChange={handleStatusChange}
              onDelete={handleDeleteConversation}
              onDeleteNumber={handleDeleteNumber}
              agentList={agentList}
              onAssign={handleAssign}
            />

            {/* Messages area */}
            <div
              className="flex-1 overflow-y-auto"
              style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #d1d9e0 1px, transparent 0)', backgroundSize: '24px 24px' }}
            >
              {loadingMsgs ? (
                <div className="flex flex-col gap-3 p-6">
                  {[70, 45, 80, 55, 65].map((w, i) => (
                    <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className="h-10 rounded-2xl bg-white/80 animate-pulse"
                        style={{ width: `${w}%`, maxWidth: '65%' }}
                      />
                    </div>
                  ))}
                </div>
              ) : msgList.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center px-6">
                  <div className="w-16 h-16 rounded-3xl bg-white/80 flex items-center justify-center mb-3 shadow-sm">
                    <MessageCircle size={24} className="text-gray-300" />
                  </div>
                  <p className="text-sm font-semibold text-gray-500">No messages yet</p>
                  <p className="text-xs text-gray-400 mt-1">Send a message to start the conversation</p>
                </div>
              ) : (
                <MessageList msgList={msgList} messagesEndRef={messagesEndRef} />
              )}
            </div>

            {/* Input bar */}
            <div className="bg-white border-t border-gray-100 px-4 py-3 flex-shrink-0">
              <form onSubmit={handleSend} className="flex items-end gap-2.5">
                {/* Template shortcut */}
                <button
                  type="button"
                  onClick={() => setShowTemplateModal(true)}
                  title="Send a template"
                  className="w-10 h-10 rounded-2xl bg-gray-100 hover:bg-[#25D366]/10 text-gray-400 hover:text-[#25D366] flex items-center justify-center transition-all flex-shrink-0"
                >
                  <FileText size={16} />
                </button>

                {/* Message input */}
                <div className="flex-1 relative">
                  <textarea
                    ref={textareaRef}
                    value={inputText}
                    onChange={(e) => {
                      setInputText(e.target.value);
                      // Auto-resize
                      e.target.style.height = 'auto';
                      e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e); }
                    }}
                    rows={1}
                    placeholder="Type a message…"
                    className="w-full min-h-[42px] max-h-[120px] px-4 py-2.5 border border-gray-200 rounded-2xl text-sm bg-gray-50 placeholder-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#25D366]/30 focus:border-[#25D366] transition-all resize-none leading-relaxed"
                    style={{ overflowY: 'auto' }}
                  />
                </div>

                {/* Send button */}
                <button
                  type="submit"
                  disabled={!inputText.trim() || sending}
                  className="w-10 h-10 rounded-2xl bg-[#25D366] hover:bg-[#128C7E] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-white transition-all flex-shrink-0 shadow-md shadow-[#25D366]/25 active:scale-95"
                >
                  {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                </button>
              </form>

              <p className="text-center text-[10px] text-gray-300 mt-1.5">
                Press Enter to send &bull; Shift+Enter for new line
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
