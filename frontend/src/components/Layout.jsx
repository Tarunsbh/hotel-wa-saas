import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  MessageCircle,
  Users,
  FileText,
  Megaphone,
  Zap,
  Settings,
  LogOut,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Bell,
  Menu,
  X,
  MoreHorizontal,
} from 'lucide-react';

const primaryNav = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/inbox', label: 'Inbox', icon: MessageCircle },
  { to: '/contacts', label: 'Contacts', icon: Users },
  { to: '/templates', label: 'Templates', icon: FileText },
  { to: '/campaigns', label: 'Campaigns', icon: Megaphone },
  { to: '/automation', label: 'Automation', icon: Zap },
  { to: '/settings', label: 'Settings', icon: Settings },
];

// Mobile bottom nav — 5 most-used items
const mobileNav = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/inbox', label: 'Inbox', icon: MessageCircle },
  { to: '/contacts', label: 'Contacts', icon: Users },
  { to: '/campaigns', label: 'Campaigns', icon: Megaphone },
  { to: '/settings', label: 'More', icon: MoreHorizontal },
];

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const userRaw = localStorage.getItem('user');
  const user = userRaw
    ? JSON.parse(userRaw)
    : { name: 'Admin', role: 'admin', hotel: { name: 'Hotel' } };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  // Close drawer on route change
  useEffect(() => {
    setMobileDrawerOpen(false);
  }, [location.pathname]);

  const initials = (user?.name || 'A').charAt(0).toUpperCase();
  const hotelName = user?.hotel?.name || 'Hotel';

  return (
    <div className="flex h-screen overflow-hidden bg-[#F4F6F8]">

      {/* ── Desktop Sidebar ──────────────────────────────── */}
      <aside
        className={`hidden lg:flex flex-col transition-all duration-250 ease-in-out flex-shrink-0
          ${collapsed ? 'w-[68px]' : 'w-[220px]'}
          bg-[#0F1623] text-white`}
      >
        {/* Logo */}
        <div className={`flex items-center border-b border-white/8 h-[60px] px-4 ${collapsed ? 'justify-center' : 'justify-between'}`}>
          {!collapsed ? (
            <>
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#25D366] to-[#075E54] flex items-center justify-center flex-shrink-0 shadow-lg shadow-[#25D366]/20">
                  <MessageSquare size={15} className="text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white leading-tight truncate">Hotel WA</p>
                  <p className="text-[10px] text-[#25D366] font-medium leading-tight truncate">{hotelName}</p>
                </div>
              </div>
              <button
                onClick={() => setCollapsed(true)}
                className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/8 transition-colors flex-shrink-0"
              >
                <ChevronLeft size={15} />
              </button>
            </>
          ) : (
            <button
              onClick={() => setCollapsed(false)}
              className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#25D366] to-[#075E54] flex items-center justify-center shadow-lg shadow-[#25D366]/20"
            >
              <MessageSquare size={15} className="text-white" />
            </button>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 overflow-y-auto overflow-x-hidden scrollbar-none">
          {primaryNav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `relative flex items-center gap-3 mx-2 my-0.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 group
                ${isActive
                  ? 'bg-[#25D366]/14 text-[#25D366]'
                  : 'text-white/50 hover:text-white hover:bg-white/6'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-[#25D366] rounded-r-full" />
                  )}
                  <Icon size={17} className="flex-shrink-0" />
                  {!collapsed && <span className="leading-none">{label}</span>}
                  {collapsed && (
                    <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-[#1E2535] text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-xl border border-white/10">
                      {label}
                    </div>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Expand when collapsed */}
        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            className="flex items-center justify-center mx-2 mb-2 py-2.5 rounded-xl text-white/30 hover:text-white hover:bg-white/6 transition-colors border border-white/8"
          >
            <ChevronRight size={15} />
          </button>
        )}

        {/* User + logout */}
        <div className={`border-t border-white/8 p-3 ${collapsed ? 'flex flex-col items-center gap-2' : ''}`}>
          {!collapsed ? (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#25D366] to-[#075E54] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate">{user?.name || 'Admin'}</p>
                <p className="text-[10px] text-white/40 truncate capitalize">{user?.role || 'admin'}</p>
              </div>
              <button
                onClick={handleLogout}
                title="Logout"
                className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors flex-shrink-0"
              >
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <>
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#25D366] to-[#075E54] flex items-center justify-center text-white font-bold text-sm">
                {initials}
              </div>
              <button
                onClick={handleLogout}
                title="Logout"
                className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <LogOut size={14} />
              </button>
            </>
          )}
        </div>
      </aside>

      {/* ── Mobile Drawer Overlay ──────────────────────── */}
      {mobileDrawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden backdrop-blur-sm"
          onClick={() => setMobileDrawerOpen(false)}
        />
      )}

      {/* ── Mobile Drawer ─────────────────────────────── */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[280px] flex flex-col lg:hidden transition-transform duration-300 ease-in-out
          ${mobileDrawerOpen ? 'translate-x-0' : '-translate-x-full'}
          bg-[#0F1623] text-white shadow-2xl`}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-5 h-[60px] border-b border-white/8">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#25D366] to-[#075E54] flex items-center justify-center flex-shrink-0">
              <MessageSquare size={15} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Hotel WA</p>
              <p className="text-[10px] text-[#25D366]">{hotelName}</p>
            </div>
          </div>
          <button
            onClick={() => setMobileDrawerOpen(false)}
            className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/8 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Drawer nav */}
        <nav className="flex-1 py-3 overflow-y-auto">
          {primaryNav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `relative flex items-center gap-3 mx-3 my-0.5 rounded-xl px-4 py-3 text-sm font-medium transition-all
                ${isActive
                  ? 'bg-[#25D366]/14 text-[#25D366]'
                  : 'text-white/50 hover:text-white hover:bg-white/6'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-[#25D366] rounded-r-full" />
                  )}
                  <Icon size={18} />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Drawer user */}
        <div className="border-t border-white/8 px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#25D366] to-[#075E54] flex items-center justify-center text-white font-bold text-sm">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user?.name || 'Admin'}</p>
              <p className="text-xs text-white/40 truncate capitalize">{user?.role || 'admin'}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top header */}
        <header className="bg-white border-b border-gray-100 h-[60px] px-4 md:px-6 flex items-center justify-between flex-shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            {/* Mobile menu trigger */}
            <button
              onClick={() => setMobileDrawerOpen(true)}
              className="lg:hidden p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <Menu size={18} />
            </button>

            {/* Page breadcrumb hint (hotel name) */}
            <div className="hidden sm:block">
              <p className="text-sm font-semibold text-gray-800">{hotelName}</p>
              <p className="text-[11px] text-gray-400 leading-tight">WhatsApp Communication Platform</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Notification bell */}
            <button className="relative p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
              <Bell size={17} />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[#25D366] rounded-full ring-2 ring-white" />
            </button>

            {/* User chip */}
            <div className="flex items-center gap-2 pl-1">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#25D366] to-[#075E54] flex items-center justify-center text-white font-bold text-sm">
                {initials}
              </div>
              <div className="hidden md:block">
                <p className="text-xs font-semibold text-gray-700 leading-tight">{user?.name || 'Admin'}</p>
                <p className="text-[10px] text-gray-400 capitalize leading-tight">{user?.role || 'admin'}</p>
              </div>
            </div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              title="Logout"
              className="ml-1 p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>

        {/* Page */}
        <main className="flex-1 overflow-y-auto min-h-0 pb-safe">
          <Outlet />
        </main>

        {/* ── Mobile Bottom Nav ───────────────────────── */}
        <nav className="lg:hidden flex-shrink-0 bg-white border-t border-gray-100 pb-safe shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
          <div className="flex items-center">
            {mobileNav.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 text-[10px] font-medium transition-colors
                  ${isActive ? 'text-[#25D366]' : 'text-gray-400 hover:text-gray-600'}`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className={`p-1 rounded-lg transition-colors ${isActive ? 'bg-[#25D366]/10' : ''}`}>
                      <Icon size={19} />
                    </div>
                    <span>{label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}
