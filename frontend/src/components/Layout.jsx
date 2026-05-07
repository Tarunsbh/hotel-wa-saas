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
  { to: '/dashboard',  label: 'Dashboard',  icon: LayoutDashboard },
  { to: '/inbox',      label: 'Inbox',       icon: MessageCircle },
  { to: '/contacts',   label: 'Contacts',    icon: Users },
  { to: '/templates',  label: 'Templates',   icon: FileText },
  { to: '/campaigns',  label: 'Campaigns',   icon: Megaphone },
  { to: '/automation', label: 'Automation',  icon: Zap },
  { to: '/settings',   label: 'Settings',    icon: Settings },
];

// Mobile bottom nav — 5 most-used items
const mobileNav = [
  { to: '/dashboard', label: 'Home',      icon: LayoutDashboard },
  { to: '/inbox',     label: 'Inbox',     icon: MessageCircle },
  { to: '/contacts',  label: 'Contacts',  icon: Users },
  { to: '/campaigns', label: 'Campaigns', icon: Megaphone },
  { to: '/settings',  label: 'More',      icon: MoreHorizontal },
];

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed,         setCollapsed]         = useState(false);
  const [mobileDrawerOpen,  setMobileDrawerOpen]  = useState(false);

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

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileDrawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileDrawerOpen]);

  const initials  = (user?.name || 'A').charAt(0).toUpperCase();
  const hotelName = user?.hotel?.name || 'Hotel';

  return (
    /*
     * ROOT: h-dvh (dynamic viewport height) fixes the infamous Safari mobile bug
     * where 100vh includes the address bar, causing content to be hidden behind it.
     * dvh updates as the browser chrome shows/hides — gives a stable, correct height.
     * overflow-hidden is essential — all scrolling happens inside child containers.
     */
    <div className="flex h-dvh overflow-hidden bg-[#F4F6F8]">

      {/* ── Desktop Sidebar ──────────────────────────────────────────────── */}
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

        {/* Nav — overflow-y-auto for long nav lists on small screens */}
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

      {/* ── Mobile Drawer Overlay ────────────────────────────────────────── */}
      {mobileDrawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden backdrop-blur-sm"
          onClick={() => setMobileDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Mobile Drawer ────────────────────────────────────────────────── */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[280px] flex flex-col lg:hidden
          transition-transform duration-300 ease-in-out will-change-transform
          ${mobileDrawerOpen ? 'translate-x-0' : '-translate-x-full'}
          bg-[#0F1623] text-white shadow-2xl`}
        /* Safe-area padding for notched phones — left side landscape */
        style={{ paddingLeft: 'env(safe-area-inset-left, 0px)' }}
      >
        {/* Drawer header */}
        <div
          className="flex items-center justify-between px-5 border-b border-white/8"
          style={{
            height: '60px',
            paddingTop: 'env(safe-area-inset-top, 0px)',
            minHeight: 'calc(60px + env(safe-area-inset-top, 0px))',
          }}
        >
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
            aria-label="Close menu"
          >
            <X size={16} />
          </button>
        </div>

        {/* Drawer nav */}
        <nav className="flex-1 py-3 overflow-y-auto scrollbar-none">
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

        {/* Drawer user + safe-area bottom */}
        <div
          className="border-t border-white/8 px-4 py-4"
          style={{ paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))' }}
        >
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

      {/* ── Main content area ────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/*
         * TOP HEADER
         * z-10 so fixed toast notifications (z-50+) can still appear above it.
         * flex-shrink-0 ensures it never compresses — always exactly 60px.
         * No sticky/fixed needed — it's a flex item in a non-scrolling parent.
         */}
        <header className="bg-white border-b border-gray-100 flex-shrink-0 z-10 shadow-sm"
          style={{ height: '60px' }}
        >
          <div className="h-full px-4 md:px-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Mobile hamburger — opens drawer */}
              <button
                onClick={() => setMobileDrawerOpen(true)}
                className="lg:hidden p-2 -ml-1 rounded-xl text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors tap-target flex items-center justify-center"
                aria-label="Open menu"
              >
                <Menu size={19} />
              </button>

              {/* Hotel name breadcrumb */}
              <div className="hidden sm:block">
                <p className="text-sm font-bold text-gray-800">{hotelName}</p>
                <p className="text-[11px] text-gray-400 leading-tight">WhatsApp Communication Platform</p>
              </div>

              {/* Mobile — just show logo text */}
              <div className="sm:hidden flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#25D366] to-[#075E54] flex items-center justify-center">
                  <MessageSquare size={13} className="text-white" />
                </div>
                <p className="text-sm font-bold text-gray-800">Hotel WA</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Notification bell */}
              <button className="relative p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors tap-target flex items-center justify-center">
                <Bell size={17} />
                <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-[#25D366] rounded-full ring-1 ring-white" />
              </button>

              {/* User avatar chip */}
              <div className="flex items-center gap-2 pl-1">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#25D366] to-[#075E54] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
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
                className="p-2 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors tap-target flex items-center justify-center"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </header>

        {/*
         * PAGE CONTENT
         * flex-1 min-h-0: fills remaining vertical space without overflowing.
         * min-h-0 is critical — without it, flex children can grow beyond the container.
         * overflow-y-auto: this is the ONE scroll container for normal pages.
         * overflow-x-hidden: prevents any page-level horizontal scroll.
         * scroll-ios (from index.css): enables iOS momentum scrolling.
         *
         * Special case — InboxPage uses h-full overflow-hidden internally,
         * which means main has nothing to scroll for that route. Each InboxPage
         * sub-panel manages its own overflow-y-auto scroll.
         */}
        <main
          className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden scroll-ios"
          id="main-content"
        >
          <Outlet />
        </main>

        {/*
         * MOBILE BOTTOM NAVIGATION
         * flex-shrink-0: never compressed — always its natural height.
         * lg:hidden: desktop uses sidebar, mobile gets this bar.
         * padding-bottom: env(safe-area-inset-bottom) — extends into the iPhone X+
         *   home-indicator zone so nav items aren't obscured.
         * z-20: above page content but below modals (z-50+) and toasts (z-60+).
         */}
        <nav
          className="lg:hidden flex-shrink-0 bg-white border-t border-gray-100 z-20 shadow-[0_-2px_12px_rgba(0,0,0,0.06)]"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          <div className="flex items-stretch">
            {mobileNav.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 text-[10px] font-semibold transition-colors min-h-[52px]
                  ${isActive ? 'text-[#25D366]' : 'text-gray-400 hover:text-gray-600'}`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className={`p-1 rounded-xl transition-all ${isActive ? 'bg-[#25D366]/10 scale-110' : ''}`}>
                      <Icon size={19} strokeWidth={isActive ? 2.5 : 2} />
                    </div>
                    <span className="leading-tight">{label}</span>
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
