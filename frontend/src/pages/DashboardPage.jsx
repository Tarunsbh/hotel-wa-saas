import React, { useState, useEffect, useCallback } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Users,
  MessageCircle,
  MessageSquare,
  Megaphone,
  TrendingUp,
  Eye,
  Loader2,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  Clock,
} from 'lucide-react';
import { analytics, conversations, campaigns } from '../api/index.js';
import { format, subDays, formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

// ─── Skeleton ──────────────────────────────────────────────────────────────────
function Skeleton({ className = '' }) {
  return (
    <div className={`animate-pulse bg-gray-100 rounded-lg ${className}`} />
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, sub, gradient, trend, loading }) {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <Skeleton className="w-10 h-10 rounded-xl mb-4" />
        <Skeleton className="w-16 h-6 mb-2" />
        <Skeleton className="w-24 h-3" />
      </div>
    );
  }
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow group">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${gradient}`}>
          <Icon size={18} className="text-white" />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-0.5 text-xs font-semibold px-2 py-1 rounded-full ${
            trend >= 0
              ? 'bg-emerald-50 text-emerald-600'
              : 'bg-red-50 text-red-500'
          }`}>
            {trend >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900 tracking-tight">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
      {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    OPEN:      'bg-blue-50 text-blue-600 border-blue-100',
    open:      'bg-blue-50 text-blue-600 border-blue-100',
    PENDING:   'bg-amber-50 text-amber-600 border-amber-100',
    pending:   'bg-amber-50 text-amber-600 border-amber-100',
    RESOLVED:  'bg-emerald-50 text-emerald-600 border-emerald-100',
    resolved:  'bg-emerald-50 text-emerald-600 border-emerald-100',
    COMPLETED: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    completed: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    RUNNING:   'bg-blue-50 text-blue-600 border-blue-100',
    running:   'bg-blue-50 text-blue-600 border-blue-100',
    SCHEDULED: 'bg-violet-50 text-violet-600 border-violet-100',
    scheduled: 'bg-violet-50 text-violet-600 border-violet-100',
    DRAFT:     'bg-gray-50 text-gray-500 border-gray-100',
    draft:     'bg-gray-50 text-gray-500 border-gray-100',
    FAILED:    'bg-red-50 text-red-500 border-red-100',
    failed:    'bg-red-50 text-red-500 border-red-100',
  };
  const cls = map[status] || 'bg-gray-50 text-gray-500 border-gray-100';
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide border ${cls}`}>
      {String(status || '').toLowerCase()}
    </span>
  );
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-xl p-3 text-xs">
      <p className="font-semibold text-gray-700 mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
          <span className="text-gray-500 capitalize">{p.dataKey}:</span>
          <span className="font-semibold text-gray-800">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Section Card wrapper ─────────────────────────────────────────────────────
function SectionCard({ title, action, actionHref, children, className = '' }) {
  const navigate = useNavigate();
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden ${className}`}>
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
        <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
        {action && (
          <button
            onClick={() => navigate(actionHref)}
            className="flex items-center gap-1 text-xs text-[#25D366] font-medium hover:text-[#128C7E] transition-colors"
          >
            {action}
            <ChevronRight size={12} />
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyState({ icon: Icon, message, sub }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center mb-3">
        <Icon size={22} className="text-gray-300" />
      </div>
      <p className="text-sm font-medium text-gray-500">{message}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

// ─── Mock fallback ────────────────────────────────────────────────────────────
const mockVolumeData = Array.from({ length: 7 }, (_, i) => ({
  date: format(subDays(new Date(), 6 - i), 'MMM d'),
  inbound: Math.floor(Math.random() * 60 + 20),
  outbound: Math.floor(Math.random() * 100 + 40),
}));

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [volumeData, setVolumeData] = useState([]);
  const [recentConvs, setRecentConvs] = useState([]);
  const [recentCampaigns, setRecentCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    const [statsRes, volRes, convsRes, campRes] = await Promise.allSettled([
      analytics.getDashboard(),
      analytics.getMessageVolume({ days: 7 }),
      conversations.list({ limit: 5, sortBy: 'updatedAt', order: 'desc' }),
      campaigns.list({ limit: 5, sortBy: 'createdAt', order: 'desc' }),
    ]);

    // Stats
    if (statsRes.status === 'fulfilled') {
      const d = statsRes.value?.data?.data ?? statsRes.value?.data ?? {};
      setStats(d);
    }

    // Volume chart
    if (volRes.status === 'fulfilled') {
      const raw = volRes.value?.data?.data ?? volRes.value?.data ?? [];
      const arr = Array.isArray(raw) ? raw : [];
      setVolumeData(
        arr.map((r) => ({
          ...r,
          date: r.date
            ? format(new Date(r.date), 'MMM d')
            : r.date,
        }))
      );
    } else {
      setVolumeData(mockVolumeData);
    }

    // Recent conversations  ← THIS is what was broken before: dashboard API never returned these
    if (convsRes.status === 'fulfilled') {
      const raw = convsRes.value?.data?.data ?? convsRes.value?.data ?? [];
      setRecentConvs(Array.isArray(raw) ? raw.slice(0, 5) : []);
    }

    // Recent campaigns  ← same fix
    if (campRes.status === 'fulfilled') {
      const raw = campRes.value?.data?.data ?? campRes.value?.data ?? [];
      setRecentCampaigns(Array.isArray(raw) ? raw.slice(0, 5) : []);
    }

    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const d = stats || {};
  const vol = volumeData.length ? volumeData : mockVolumeData;

  const kpis = [
    {
      icon: Users,
      label: 'Total Guests',
      value: (d.totalGuests ?? 0).toLocaleString(),
      sub: 'Registered contacts',
      gradient: 'bg-gradient-to-br from-indigo-500 to-indigo-600',
      trend: 12,
    },
    {
      icon: MessageCircle,
      label: 'Active Conversations',
      value: (d.activeConversations ?? d.openConversations ?? 0).toLocaleString(),
      sub: 'Currently open',
      gradient: 'bg-gradient-to-br from-blue-500 to-blue-600',
      trend: 5,
    },
    {
      icon: MessageSquare,
      label: 'Messages Today',
      value: (d.messagesToday ?? 0).toLocaleString(),
      sub: 'Sent & received',
      gradient: 'bg-gradient-to-br from-[#25D366] to-[#075E54]',
      trend: 8,
    },
    {
      icon: Megaphone,
      label: 'Total Campaigns',
      value: (d.totalCampaigns ?? d.campaignsSent ?? 0).toLocaleString(),
      sub: 'All time',
      gradient: 'bg-gradient-to-br from-orange-400 to-orange-500',
      trend: -3,
    },
    {
      icon: TrendingUp,
      label: 'Delivery Rate',
      value: `${d.deliveryRate ?? 0}%`,
      sub: 'Last 30 days',
      gradient: 'bg-gradient-to-br from-teal-500 to-teal-600',
      trend: 1,
    },
    {
      icon: Eye,
      label: 'Read Rate',
      value: `${d.readRate ?? 0}%`,
      sub: 'Of delivered',
      gradient: 'bg-gradient-to-br from-violet-500 to-violet-600',
      trend: 4,
    },
  ];

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5 pb-6">

      {/* ── Header ──────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-xs text-gray-400 mt-0.5">Overview of your communication activity</p>
        </div>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50 transition-all shadow-sm"
        >
          <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {/* ── KPI Cards ───────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 md:gap-4">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} loading={loading} />
        ))}
      </div>

      {/* ── Chart ───────────────────────────────────────── */}
      <SectionCard title="Message Volume — Last 7 Days">
        {loading ? (
          <div className="h-[240px] flex items-center justify-center">
            <Loader2 size={24} className="animate-spin text-[#25D366]" />
          </div>
        ) : (
          <div className="px-5 pt-4 pb-2">
            <div className="flex items-center gap-5 mb-4 text-[11px] text-gray-400">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-1.5 rounded-full bg-[#25D366] inline-block" /> Outbound
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-1.5 rounded-full bg-blue-400 inline-block" /> Inbound
              </span>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={vol} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradOut" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#25D366" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#25D366" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradIn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#e5e7eb', strokeWidth: 1 }} />
                <Area
                  type="monotone"
                  dataKey="outbound"
                  stroke="#25D366"
                  strokeWidth={2}
                  fill="url(#gradOut)"
                  dot={false}
                  activeDot={{ r: 4, fill: '#25D366', stroke: '#fff', strokeWidth: 2 }}
                />
                <Area
                  type="monotone"
                  dataKey="inbound"
                  stroke="#60a5fa"
                  strokeWidth={2}
                  fill="url(#gradIn)"
                  dot={false}
                  activeDot={{ r: 4, fill: '#60a5fa', stroke: '#fff', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </SectionCard>

      {/* ── Two-column bottom ───────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-5">

        {/* Recent Conversations — now fetched via conversations.list() */}
        <SectionCard title="Recent Conversations" action="View all" actionHref="/inbox">
          {loading ? (
            <div className="p-4 space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="w-9 h-9 rounded-xl" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="h-2.5 w-48" />
                  </div>
                  <Skeleton className="h-4 w-12 rounded-full" />
                </div>
              ))}
            </div>
          ) : recentConvs.length === 0 ? (
            <EmptyState
              icon={MessageCircle}
              message="No conversations yet"
              sub="Conversations will appear here when guests message you"
            />
          ) : (
            <div className="divide-y divide-gray-50">
              {recentConvs.map((conv) => {
                const name = conv.guest?.name || conv.guestName || conv.phone || 'Unknown';
                const lastMsg = conv.lastMessage?.body || conv.lastMessage || '—';
                const timeAgo = conv.updatedAt
                  ? formatDistanceToNow(new Date(conv.updatedAt), { addSuffix: true })
                  : '';
                return (
                  <div
                    key={conv.id}
                    className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50/70 transition-colors"
                  >
                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#25D366] to-[#075E54] flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-sm shadow-[#25D366]/20">
                      {String(name).charAt(0).toUpperCase()}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{name}</p>
                      <p className="text-xs text-gray-400 truncate mt-0.5">{lastMsg}</p>
                    </div>

                    {/* Right */}
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <StatusBadge status={conv.status} />
                      {timeAgo && (
                        <span className="text-[10px] text-gray-300 flex items-center gap-0.5">
                          <Clock size={9} /> {timeAgo}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>

        {/* Campaign Performance — now fetched via campaigns.list() */}
        <SectionCard title="Recent Campaigns" action="View all" actionHref="/campaigns">
          {loading ? (
            <div className="p-4 space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-40" />
                    <Skeleton className="h-2.5 w-24" />
                  </div>
                  <Skeleton className="h-4 w-16 rounded-full" />
                </div>
              ))}
            </div>
          ) : recentCampaigns.length === 0 ? (
            <EmptyState
              icon={Megaphone}
              message="No campaigns yet"
              sub="Create your first campaign to reach guests"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50/60">
                    <th className="text-left px-5 py-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Campaign</th>
                    <th className="text-left px-3 py-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="text-right px-3 py-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Sent</th>
                    <th className="text-right px-3 py-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Read</th>
                    <th className="text-right px-5 py-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Failed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {recentCampaigns.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-5 py-3 font-medium text-gray-800 text-sm truncate max-w-[140px]">{c.name}</td>
                      <td className="px-3 py-3"><StatusBadge status={c.status} /></td>
                      <td className="px-3 py-3 text-right text-xs text-gray-500">{(c.sent ?? c.totalSent ?? 0).toLocaleString()}</td>
                      <td className="px-3 py-3 text-right text-xs text-gray-500">{(c.read ?? c.totalRead ?? 0).toLocaleString()}</td>
                      <td className="px-5 py-3 text-right text-xs text-red-400">{(c.failed ?? c.totalFailed ?? 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
