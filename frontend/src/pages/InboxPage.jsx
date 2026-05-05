import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Send, Check, CheckCheck, Loader2, MessageCircle, X, Phone, Plus, RefreshCw, FileText, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { conversations, messages, auth, templates, guests } from '../api/index.js';
import { format, formatDistanceToNow } from 'date-fns';
import { io } from 'socket.io-client';

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

function StayBadge({ status }) {
  const map = {
    ARRIVING: 'bg-blue-100 text-blue-700',
    IN_HOUSE: 'bg-green-100 text-green-700',
    CHECKED_OUT: 'bg-gray-100 text-gray-600',
    NO_STAY: 'bg-gray-100 text-gray-500',
  };
  const label = { ARRIVING: 'Arriving', IN_HOUSE: 'In House', CHECKED_OUT: 'Checked Out', NO_STAY: 'No Stay' };
  if (!status) return null;
  return (
    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${map[status] || 'bg-gray-100 text-gray-600'}`}>
      {label[status] || status}
    </span>
  );
}

function StatusBadge({ status }) {
  const map = {
    OPEN: 'bg-blue-100 text-blue-700',
    PENDING: 'bg-yellow-100 text-yellow-700',
    RESOLVED: 'bg-green-100 text-green-700',
    ARCHIVED: 'bg-gray-100 text-gray-500',
  };
  return (
    <span className={`px-1.5 py-0.5 rounded text-xs font-medium capitalize ${map[status?.toUpperCase()] || 'bg-gray-100 text-gray-600'}`}>
      {(status || '').toLowerCase()}
    </span>
  );
}

function MsgStatus({ status }) {
  if (status === 'READ') return <CheckCheck size={14} className="text-blue-400 flex-shrink-0" />;
  if (status === 'DELIVERED') return <CheckCheck size={14} className="text-gray-400 flex-shrink-0" />;
  if (status === 'SENT') return <Check size={14} className="text-gray-400 flex-shrink-0" />;
  if (status === 'FAILED') return <X size={14} className="text-red-400 flex-shrink-0" />;
  return <Check size={14} className="text-gray-300 flex-shrink-0" />;
}

function ConvItem({ conv, active, onClick }) {
  const name = getGuestName(conv);
  const timeAgo = conv.lastMessageAt
    ? formatDistanceToNow(new Date(conv.lastMessageAt), { addSuffix: false })
    : '';
  return (
    <div
      onClick={onClick}
      className={`flex items-start gap-3 px-4 py-3.5 cursor-pointer transition-colors border-b border-gray-100 ${
        active ? 'bg-green-50 border-l-2 border-l-[#25D366]' : 'hover:bg-gray-50'
      }`}
    >
      <div className="relative flex-shrink-0">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#25D366] to-[#128C7E] flex items-center justify-center text-white font-bold text-sm">
          {getInitial(name)}
        </div>
        {conv.unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold">
            {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <p className="text-sm font-semibold text-gray-800 truncate">{name}</p>
          <span className="text-xs text-gray-400 flex-shrink-0 ml-2">{timeAgo}</span>
        </div>
        <p className="text-xs text-gray-500 truncate">
          {conv.lastMessage || 'No messages yet'}
        </p>
        <div className="flex items-center gap-1.5 mt-1">
          <StayBadge status={conv.guest?.stayStatus} />
          <StatusBadge status={conv.status} />
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ msg }) {
  const isOut = msg.direction === 'OUTBOUND' || msg.direction === 'outbound';
  const body = msg.body || msg.text || '';
  return (
    <div className={`flex ${isOut ? 'justify-end' : 'justify-start'} mb-2`}>
      <div
        className={`max-w-[75%] px-3.5 py-2.5 rounded-2xl shadow-sm ${
          isOut ? 'bg-[#DCF8C6] rounded-br-sm' : 'bg-white rounded-bl-sm'
        }`}
      >
        {msg.type === 'IMAGE' && msg.mediaUrl && (
          <img src={msg.mediaUrl} alt="media" className="rounded-lg mb-1 max-w-full" />
        )}
        {body && <p className="text-sm leading-relaxed whitespace-pre-wrap break-words text-gray-800">{body}</p>}
        <div className={`flex items-center gap-1 mt-1 ${isOut ? 'justify-end' : 'justify-start'}`}>
          <span className="text-[10px] text-gray-400">
            {msg.createdAt ? format(new Date(msg.createdAt), 'HH:mm') : ''}
          </span>
          {isOut && <MsgStatus status={msg.status} />}
        </div>
      </div>
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

    // Normalize phone
    let to = phone.trim().replace(/\s+/g, '');
    if (!to.startsWith('+')) to = '+' + to;

    setSending(true);
    try {
      const res = await messages.sendToNumber(to, msgText.trim());
      const { conversation } = res.data;
      onConversationStarted(conversation);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send message. Check the phone number.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-800">New Conversation</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <form onSubmit={handleSend} className="px-6 py-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="917812345678 or +917812345678"
              required
              autoFocus
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#25D366]"
            />
            <p className="text-[10px] text-gray-400 mt-1">Enter with or without +, e.g. 917812345678</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Message <span className="text-red-500">*</span>
            </label>
            <textarea
              value={msgText}
              onChange={(e) => setMsgText(e.target.value)}
              placeholder="Type your first message..."
              required
              rows={3}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#25D366] resize-none"
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={sending || !phone.trim() || !msgText.trim()}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#25D366] text-white rounded-lg text-sm font-medium hover:bg-[#128C7E] disabled:opacity-50 transition-colors">
              {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              {sending ? 'Sending...' : 'Send Message'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Send Template Modal ──────────────────────────────────────────────────────
function SendTemplateModal({ conversationId, onClose, onSent }) {
  const [allTemplates, setAllTemplates]   = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [selected,      setSelected]      = useState(null);
  const [variables,     setVariables]     = useState({});
  const [sending,       setSending]       = useState(false);
  const [error,         setError]         = useState('');

  // Load approved templates on mount
  useEffect(() => {
    templates.list({ status: 'APPROVED', limit: 100 })
      .then((res) => {
        const data = res.data?.data || res.data || [];
        setAllTemplates(Array.isArray(data) ? data : []);
      })
      .catch(() => setAllTemplates([]))
      .finally(() => setLoading(false));
  }, []);

  // Extract {{1}}, {{2}}, … from a template's bodyText
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

  const handleSelectTemplate = (tpl) => {
    setSelected(tpl);
    setVariables({});
    setError('');
  };

  // Build preview text with variables filled in
  const preview = selected ? (selected.bodyText || '').replace(/{{(\d+)}}/g, (_, n) => variables[n] || `{{${n}}}`) : '';

  const handleSend = async () => {
    setError('');
    setSending(true);
    try {
      const varKeys = extractVars(selected);
      // Check all variables are filled
      for (const k of varKeys) {
        const idx = k.replace(/[{}]/g, '');
        if (!variables[idx]?.trim()) {
          setError(`Please fill in variable ${k}`);
          setSending(false);
          return;
        }
      }
      await messages.sendTemplate(conversationId, {
        templateId:    selected.id,
        variableValues: variables,
      });
      onSent();
      onClose();
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to send template');
    } finally {
      setSending(false);
    }
  };

  const varKeys = extractVars(selected);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
            <FileText size={16} className="text-[#25D366]" />
            Send Template
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={22} className="animate-spin text-[#25D366]" />
            </div>
          ) : allTemplates.length === 0 ? (
            <div className="p-6 text-center text-gray-400">
              <p className="text-sm">No approved templates found.</p>
              <p className="text-xs mt-1">Create and submit a template for Meta approval first.</p>
            </div>
          ) : (
            <div className="p-4 space-y-4">
              {/* Template picker */}
              {!selected ? (
                <div className="space-y-2">
                  <p className="text-xs text-gray-500 font-medium">Choose a template:</p>
                  {allTemplates.map((tpl) => (
                    <button
                      key={tpl.id}
                      onClick={() => handleSelectTemplate(tpl)}
                      className="w-full text-left p-3 border border-gray-200 rounded-xl hover:border-[#25D366] hover:bg-green-50 transition-colors flex items-start gap-3 group"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-mono font-semibold text-gray-700 truncate">{tpl.name}</p>
                          <span className="text-xs px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded font-medium flex-shrink-0">{tpl.category}</span>
                        </div>
                        <p className="text-xs text-gray-500 line-clamp-2">{tpl.bodyText}</p>
                      </div>
                      <ChevronRight size={14} className="text-gray-300 group-hover:text-[#25D366] mt-0.5 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Back button + selected template name */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelected(null)}
                      className="text-xs text-[#25D366] hover:underline"
                    >
                      ← Back
                    </button>
                    <span className="text-xs text-gray-400">/</span>
                    <span className="text-xs font-mono font-semibold text-gray-700">{selected.name}</span>
                  </div>

                  {/* Preview bubble */}
                  <div className="bg-[#DCF8C6] rounded-2xl rounded-br-sm px-4 py-3 shadow-sm">
                    {selected.headerText && (
                      <p className="text-sm font-semibold text-gray-800 mb-1">{selected.headerText}</p>
                    )}
                    <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                      {preview || selected.bodyText}
                    </p>
                    {selected.footerText && (
                      <p className="text-xs text-gray-500 mt-1 italic">{selected.footerText}</p>
                    )}
                    {selected.buttons && selected.buttons.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1 pt-2 border-t border-green-200">
                        {selected.buttons.map((btn, i) => (
                          <span key={i} className="px-3 py-1 bg-white text-blue-600 text-xs rounded-full border border-blue-100">
                            {btn.text}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Variable inputs */}
                  {varKeys.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-xs font-medium text-gray-600">Fill in variables:</p>
                      {varKeys.map((k) => {
                        const idx = k.replace(/[{}]/g, '');
                        return (
                          <div key={k}>
                            <label className="block text-xs text-gray-500 mb-1">
                              Variable <span className="font-mono font-semibold text-gray-700">{k}</span>
                            </label>
                            <input
                              value={variables[idx] || ''}
                              onChange={(e) => setVariables({ ...variables, [idx]: e.target.value })}
                              placeholder={`Value for ${k}`}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#25D366]"
                              autoFocus={idx === '1'}
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs">
                      {error}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {selected && (
          <div className="px-5 py-4 border-t flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={sending}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#25D366] text-white rounded-lg text-sm font-medium hover:bg-[#128C7E] disabled:opacity-60"
            >
              {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              {sending ? 'Sending…' : 'Send Template'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function InboxPage() {
  const [convList, setConvList] = useState([]);
  const [selectedConv, setSelectedConv] = useState(null);
  const [msgList, setMsgList] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [agentList, setAgentList] = useState([]);
  const [error, setError] = useState('');
  const [showNewChat,       setShowNewChat]       = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [refreshingMsgs,    setRefreshingMsgs]    = useState(false);
  const [socketConnected,   setSocketConnected]   = useState(false);
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);
  const selectedConvRef = useRef(null);
  selectedConvRef.current = selectedConv;

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
      if (status === 401) {
        // interceptor will redirect to login
        return;
      }
      setError(`Failed to load conversations (${status || 'Network error'}: ${msg}). Try refreshing.`);
      setConvList([]);
    } finally {
      setLoadingConvs(false);
    }
  }, [statusFilter]);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  // Load agents
  useEffect(() => {
    auth.listAgents()
      .then((res) => {
        const data = res.data?.data || res.data || [];
        setAgentList(Array.isArray(data) ? data : []);
      })
      .catch(() => setAgentList([]));
  }, []);

  // Socket.IO
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    // If VITE_API_URL is relative (e.g. /api/v1) or empty, use window.location.origin
    // so Socket.IO connects to the same host (nginx handles the /socket.io/ proxy)
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

    socket.on('connect', () => { console.log('Socket connected'); setSocketConnected(true); });
    socket.on('disconnect', () => setSocketConnected(false));
    socket.on('connect_error', (e) => { console.warn('Socket error:', e.message); setSocketConnected(false); });

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

    socket.on('conversation_update', () => {
      loadConversations();
    });

    socketRef.current = socket;
    return () => { socket.disconnect(); };
  }, [loadConversations]);

  // Load messages function (reusable for manual refresh)
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
      setRefreshingMsgs(false);
    }
  }, []);

  // Load messages when conversation selected
  useEffect(() => {
    if (!selectedConv) return;
    setMsgList([]);
    loadMessages(selectedConv.id, true);
    conversations.markRead(selectedConv.id).catch(() => {});
    setConvList((prev) => prev.map((c) => c.id === selectedConv.id ? { ...c, unreadCount: 0 } : c));
    // Join socket room
    socketRef.current?.emit('join_conversation', { conversationId: selectedConv.id });
  }, [selectedConv?.id, loadMessages]);

  // ── Polling fallback — every 4s refresh messages + convs in case socket is down ──
  useEffect(() => {
    if (!selectedConv?.id) return;
    const msgInterval = setInterval(() => {
      loadMessages(selectedConv.id, false);
    }, 4000);
    return () => clearInterval(msgInterval);
  }, [selectedConv?.id, loadMessages]);

  useEffect(() => {
    const convInterval = setInterval(() => {
      loadConversations();
    }, 8000);
    return () => clearInterval(convInterval);
  }, [loadConversations]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgList]);

  const handleSelectConv = (conv) => {
    if (selectedConv?.id) {
      socketRef.current?.emit('leave_conversation', { conversationId: selectedConv.id });
    }
    setSelectedConv(conv);
  };

  const closeMobileChat = () => {
    setSelectedConv(null);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    const text = inputText.trim();
    if (!text || !selectedConv || sending) return;
    setSending(true);
    const tempId = `temp_${Date.now()}`;
    const optimistic = {
      id: tempId,
      body: text,
      direction: 'OUTBOUND',
      status: 'PENDING',
      type: 'TEXT',
      createdAt: new Date().toISOString(),
    };
    setMsgList((prev) => [...prev, optimistic]);
    setInputText('');
    try {
      const res = await messages.sendText(selectedConv.id, { body: text });
      const sent = res.data;
      setMsgList((prev) => prev.map((m) => m.id === tempId ? { ...sent, body: sent.body || text } : m));
    } catch (e) {
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
    const confirmed = window.confirm(
      `Delete this chat with ${getGuestPhone(selectedConv)}? This will remove the conversation from the inbox.`,
    );
    if (!confirmed) return;

    try {
      await conversations.remove(selectedConv.id);
      setConvList((prev) => prev.filter((c) => c.id !== selectedConv.id));
      setSelectedConv(null);
      setMsgList([]);
      loadConversations();
    } catch (e) {
      window.alert(e.response?.data?.message || 'Unable to delete chat.');
    }
  };

  const handleDeleteNumber = async () => {
    if (!selectedConv?.guest?.id) return;
    const confirmed = window.confirm(
      `Delete this phone number (${getGuestPhone(selectedConv)}) and remove all associated chat history from the database? This cannot be undone.`,
    );
    if (!confirmed) return;

    try {
      await guests.forceRemove(selectedConv.guest.id);
      setConvList((prev) => prev.filter((c) => c.guest?.id !== selectedConv.guest.id));
      setSelectedConv(null);
      setMsgList([]);
      loadConversations();
    } catch (e) {
      window.alert(e.response?.data?.message || 'Unable to delete number.');
    }
  };

  const filteredConvs = convList.filter((c) => {
    const name = getGuestName(c).toLowerCase();
    const phone = getGuestPhone(c);
    const matchSearch = !search || name.includes(search.toLowerCase()) || phone.includes(search);
    const matchStatus = statusFilter === 'all' || (c.status || '').toUpperCase() === statusFilter.toUpperCase();
    return matchSearch && matchStatus;
  });

  const handleNewConversationStarted = (conversation) => {
    // Add to list if not already there, then select it
    setConvList((prev) => {
      const exists = prev.find((c) => c.id === conversation.id);
      if (exists) return prev;
      return [conversation, ...prev];
    });
    setSelectedConv(conversation);
    loadConversations();
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row h-full overflow-hidden bg-[#e5ddd5]">
      {/* New Chat Modal */}
      {showNewChat && (
        <NewChatModal
          onClose={() => setShowNewChat(false)}
          onConversationStarted={handleNewConversationStarted}
        />
      )}

      {/* Send Template Modal */}
      {showTemplateModal && selectedConv && (
        <SendTemplateModal
          conversationId={selectedConv.id}
          onClose={() => setShowTemplateModal(false)}
          onSent={() => {
            loadMessages(selectedConv.id, false);
            loadConversations();
          }}
        />
      )}

      {/* Chat list panel */}
      <div className={`w-full lg:w-[340px] flex-shrink-0 bg-white border-b border-gray-200 lg:border-r lg:border-b-0 flex flex-col min-h-0 ${selectedConv ? 'hidden lg:flex' : 'flex'}`}>
        <div className="px-4 py-3 border-b border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-gray-800">Chat Inbox</h2>
              <span title={socketConnected ? 'Live (real-time)' : 'Polling (4s)'}
                className={`w-2 h-2 rounded-full flex-shrink-0 ${socketConnected ? 'bg-green-400' : 'bg-yellow-400'}`} />
            </div>
            <button
              onClick={() => setShowNewChat(true)}
              title="Start new conversation"
              className="flex items-center gap-1 px-2.5 py-1.5 bg-[#25D366] hover:bg-[#128C7E] text-white rounded-lg text-xs font-medium transition-colors"
            >
              <Plus size={13} />
              New Chat
            </button>
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or phone..."
              className="w-full pl-8 pr-3 py-2 text-xs border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#25D366] focus:bg-white"
            />
          </div>
          <div className="flex gap-1 mt-2">
            {['all', 'OPEN', 'PENDING', 'RESOLVED'].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`flex-1 py-1 text-xs rounded-lg font-medium transition-colors capitalize ${
                  statusFilter === s ? 'bg-[#25D366] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {s.toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingConvs ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={22} className="animate-spin text-[#25D366]" />
            </div>
          ) : error ? (
            <div className="p-4 text-center">
              <p className="text-xs text-red-500">{error}</p>
              <button onClick={loadConversations} className="mt-2 text-xs text-[#25D366] underline">Retry</button>
            </div>
          ) : filteredConvs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <MessageCircle size={32} className="mb-2 opacity-50" />
              <p className="text-sm">No conversations yet</p>
              <p className="text-xs mt-1">Messages from guests will appear here</p>
            </div>
          ) : (
            filteredConvs.map((conv) => (
              <ConvItem
                key={conv.id}
                conv={conv}
                active={selectedConv?.id === conv.id}
                onClick={() => handleSelectConv(conv)}
              />
            ))
          )}
        </div>
      </div>

      {/* Conversation panel */}
      <div className={`flex-1 flex flex-col bg-[#e5ddd5] overflow-hidden min-h-0 ${selectedConv ? 'block' : 'hidden lg:block'}`}>
        {!selectedConv ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
            <MessageCircle size={48} className="mb-3 opacity-30" />
            <p className="text-base font-medium text-gray-600">Select a conversation</p>
            <p className="text-sm text-gray-400 mt-1">Choose a chat from the left panel</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="bg-[#075E54] text-white px-4 py-3 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={closeMobileChat}
                  className="lg:hidden p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <ChevronLeft size={18} />
                </button>
                <div className="w-9 h-9 rounded-full bg-[#25D366] flex items-center justify-center text-white font-bold text-sm">
                  {getInitial(getGuestName(selectedConv))}
                </div>
                <div>
                  <p className="font-semibold text-sm">{getGuestName(selectedConv)}</p>
                  <p className="text-[#a8d8d4] text-xs flex items-center gap-1">
                    <Phone size={10} />
                    {getGuestPhone(selectedConv)}
                  </p>
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-2">
                <StayBadge status={selectedConv.guest?.stayStatus} />
                <button
                  onClick={() => setShowTemplateModal(true)}
                  title="Send template"
                  className="px-3 py-1.5 text-xs bg-white/10 border border-white/20 rounded-full hover:bg-white/20 transition-colors"
                >
                  Template
                </button>
              </div>
            </div>

            <div className="px-4 py-3 bg-[#075E54] text-white flex flex-wrap gap-2 items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-white/80">
                <RefreshCw size={14} className={refreshingMsgs ? 'animate-spin text-white' : 'text-white'} />
                <span>Last updated</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleDeleteConversation}
                  title="Delete chat"
                  className="px-3 py-1.5 text-xs bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  <Trash2 size={14} className="inline mr-1" />
                  Delete
                </button>
                <button
                  onClick={handleDeleteNumber}
                  title="Delete phone number"
                  className="px-3 py-1.5 text-xs bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  <X size={14} className="inline mr-1" />
                  Delete No.
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col">
              {loadingMsgs ? (
                <div className="flex items-center justify-center flex-1">
                  <Loader2 size={22} className="animate-spin text-[#25D366]" />
                </div>
              ) : msgList.length === 0 ? (
                <div className="flex flex-col items-center justify-center flex-1 text-gray-400">
                  <MessageCircle size={32} className="mb-2 opacity-30" />
                  <p className="text-sm">No messages yet</p>
                  <p className="text-xs mt-1 text-gray-300">Send a message or wait for a reply</p>
                </div>
              ) : (
                <div className="flex flex-col justify-end flex-1 py-2">
                  {msgList.map((msg) => <MessageBubble key={msg.id} msg={msg} />)}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Input */}
            <div className="bg-white border-t border-gray-200 px-4 py-3 flex-shrink-0">
              <form onSubmit={handleSend} className="flex items-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowTemplateModal(true)}
                  title="Send a template message"
                  className="w-10 h-10 rounded-full bg-white border border-gray-200 hover:bg-[#DCF8C6] text-[#075E54] flex items-center justify-center transition-colors flex-shrink-0"
                >
                  <FileText size={16} />
                </button>
                <div className="relative flex-1">
                  <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e); }
                    }}
                    rows={1}
                    placeholder="Type a message…"
                    className="w-full min-h-[44px] max-h-28 px-4 py-3 pr-12 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[#25D366] resize-none bg-white"
                    style={{ overflowY: 'auto' }}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">Shift+Enter</span>
                </div>
                <button
                  type="submit"
                  disabled={!inputText.trim() || sending}
                  className="w-12 h-12 rounded-full bg-[#25D366] hover:bg-[#128C7E] disabled:opacity-40 flex items-center justify-center text-white transition-colors flex-shrink-0 shadow-lg"
                >
                  {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={18} />}
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
