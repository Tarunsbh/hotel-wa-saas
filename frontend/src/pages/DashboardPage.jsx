import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
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
} from 'lucide-react';
import { analytics } from '../api/index.js';
import { format, subDays } from 'date-fns';

// ─── Mock data fallback ───────────────────────────────────────────────────────
const mockDashboard = {
  totalGuests: 1284,
  activeConversations: 47,
  messagesToday: 312,
  campaignsSent: 28,
  deliveryRate: 96.4,
  readRate: 72.1,
  recentConversations: [
    { id: 1, guestName: 'James Wilson', phone: '+1234567890', status: 'open', lastMessage: 'What time is checkout?', updatedAt: new Date().toISOString() },
    { id: 2, guestName: 'Sarah Chen', phone: '+1987654321', status: 'pending', lastMessage: 'Can I get extra towels?', updatedAt: new Date(Date.now() - 600000).toISOString() },
    { id: 3, guestName: 'Michael Brown', phone: '+1122334455', status: 'resolved', lastMessage: 'Thank you so much!', updatedAt: new Date(Date.now() - 3600000).toISOString() },
    { id: 4, guestName: 'Emma Davis', phone: '+1555666777', status: 'open', lastMessage: 'The AC is not working', updatedAt: new Date(Date.now() - 7200000).toISOString() },
    { id: 5, guestName: 'Lucas Martin', phone: '+1888999000', status: 'pending', lastMessage: 'Room service please', updatedAt: new Date(Date.now() - 10800000).toISOString() },
  ],
  recentCampaigns: [
    { id: 1, name: 'Pre-Arrival Welcome', status: 'completed', sent: 450, delivered: 435, read: 312, failed: 15 },
    { id: 2, name: 'Checkout Reminder', status: 'completed', sent: 380, delivered: 370, read: 245, failed: 10 },
    { id: 3, name: 'Spa Promotion', status: 'running', sent: 200, delivered: 195, read: 140, failed: 5 },
    { id: 4, name: 'Weekend Special', status: 'scheduled', sent: 0, delivered: 0, read: 0, failed: 0 },
    { id: 5, name: 'Loyalty Program', status: 'draft', sent: 0, delivered: 0, read: 0, failed: 0 },
  ],
};

const mockVolumeData = Array.from({ length: 7 }, (_, i) => ({
  date: format(subDays(new Date(), 6 - i), 'MMM dd'),
  inbound: Math.floor(Math.random() * 80 + 40),
  outbound: Math.floor(Math.random() * 120 + 60),
}));

// ─── Sub-components ───────────────────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, sub, color, trend }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={20} className="text-white" />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-0.5 text-xs font-medium ${trend >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {trend >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div>
        <p className="text-sm text-gray-500 mb-0.5">{label}</p>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    open: 'bg-blue-100 text-blue-700',
    pending: 'bg-yellow-100 text-yellow-700',
    resolved: 'bg-green-100 text-green-700',
    completed: 'bg-green-100 text-green-700',
    running: 'bg-blue-100 text-blue-700',
    scheduled: 'bg-purple-100 text-purple-700',
    draft: 'bg-gray-100 text-gray-600',
    failed: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${map[status] || 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [dashboard, setDashboard] = useState(null);
  const [volumeData, setVolumeData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [dashRes, volRes] = await Promise.allSettled([
        analytics.getDashboard(),
        analytics.getMessageVolume({ days: 7 }),
      ]);
      setDashboard(
        dashRes.status === 'fulfilled' ? dashRes.value.data?.data || dashRes.value.data : mockDashboard
      );
      setVolumeData(
        volRes.status === 'fulfilled' ? volRes.value.data?.data || volRes.value.data : mockVolumeData
      );
    } catch {
      setDashboard(mockDashboard);
      setVolumeData(mockVolumeData);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="animate-spin text-[#25D366]" />
          <p className="text-gray-500 text-sm">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const d = dashboard || mockDashboard;
  const vol = volumeData.length ? volumeData : mockVolumeData;

  const kpis = [
    { icon: Users, label: 'Total Guests', value: d.totalGuests?.toLocaleString() || '0', sub: 'Registered contacts', color: 'bg-indigo-500', trend: 12 },
    { icon: MessageCircle, label: 'Active Conversations', value: d.activeConversations || '0', sub: 'Currently open', color: 'bg-blue-500', trend: 5 },
    { icon: MessageSquare, label: 'Messages Today', value: d.messagesToday?.toLocaleString() || '0', sub: 'Sent & received', color: 'bg-[#25D366]', trend: 8 },
    { icon: Megaphone, label: 'Campaigns Sent', value: d.campaignsSent || '0', sub: 'This month', color: 'bg-orange-500', trend: -3 },
    { icon: TrendingUp, label: 'Delivery Rate', value: `${d.deliveryRate || 0}%`, sub: 'Last 30 days', color: 'bg-teal-500', trend: 1 },
    { icon: Eye, label: 'Read Rate', value: `${d.readRate || 0}%`, sub: 'Of delivered msgs', color: 'bg-purple-500', trend: 4 },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Overview of your hotel communication</p>
        </div>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-800 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-60"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} />
        ))}
      </div>

      {/* Charts row */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-800">Message Volume — Last 7 Days</h2>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-[#25D366] inline-block rounded" />
              Outbound
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-blue-400 inline-block rounded" />
              Inbound
            </span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={vol} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line
              type="monotone"
              dataKey="outbound"
              stroke="#25D366"
              strokeWidth={2.5}
              dot={{ r: 4, fill: '#25D366' }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="inbound"
              stroke="#60a5fa"
              strokeWidth={2.5}
              dot={{ r: 4, fill: '#60a5fa' }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Tables row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Recent conversations */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-800">Recent Conversations</h2>
            <a href="/inbox" className="text-xs text-[#25D366] hover:underline font-medium">View all</a>
          </div>
          <div className="divide-y divide-gray-50">
            {(d.recentConversations || []).map((conv) => (
              <div key={conv.id} className="flex items-center gap-3 px-6 py-3 hover:bg-gray-50 transition-colors">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#25D366] to-[#128C7E] flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                  {conv.guestName?.charAt(0) || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{conv.guestName}</p>
                  <p className="text-xs text-gray-500 truncate">{conv.lastMessage}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <StatusBadge status={conv.status} />
                  <p className="text-xs text-gray-400">
                    {conv.updatedAt ? format(new Date(conv.updatedAt), 'HH:mm') : ''}
                  </p>
                </div>
              </div>
            ))}
            {(!d.recentConversations || d.recentConversations.length === 0) && (
              <p className="px-6 py-8 text-center text-sm text-gray-400">No recent conversations</p>
            )}
          </div>
        </div>

        {/* Campaign performance */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-800">Campaign Performance</h2>
            <a href="/campaigns" className="text-xs text-[#25D366] hover:underline font-medium">View all</a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Campaign</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Status</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500">Sent</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500">Read</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500">Failed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(d.recentCampaigns || []).map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800 truncate max-w-[140px]">{c.name}</td>
                    <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                    <td className="px-4 py-3 text-right text-gray-600">{c.sent?.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{c.read?.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-red-500">{c.failed?.toLocaleString()}</td>
                  </tr>
                ))}
                {(!d.recentCampaigns || d.recentCampaigns.length === 0) && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400">No campaigns yet</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
