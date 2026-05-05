import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
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
} from 'lucide-react';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/inbox', label: 'Chat Inbox', icon: MessageCircle },
  { to: '/contacts', label: 'Contacts', icon: Users },
  { to: '/templates', label: 'Templates', icon: FileText },
  { to: '/campaigns', label: 'Campaigns', icon: Megaphone },
  { to: '/automation', label: 'Automation', icon: Zap },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function Layout() {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const userRaw = localStorage.getItem('user');
  const user = userRaw ? JSON.parse(userRaw) : { name: 'Admin', role: 'admin', hotel: { name: 'Hotel' } };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex flex-col bg-[#075E54] text-white transition-all duration-200 ${
          collapsed ? 'w-16' : 'w-60'
        } flex-shrink-0`}
      >
        {/* Logo area */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-[#128C7E]">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#25D366] flex items-center justify-center flex-shrink-0">
                <MessageSquare size={16} className="text-white" />
              </div>
              <span className="font-bold text-sm leading-tight">
                Hotel WA<br />
                <span className="text-[#25D366] text-xs font-normal">SaaS Platform</span>
              </span>
            </div>
          )}
          {collapsed && (
            <div className="w-8 h-8 rounded-full bg-[#25D366] flex items-center justify-center mx-auto">
              <MessageSquare size={16} className="text-white" />
            </div>
          )}
          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              className="text-[#a8d8d4] hover:text-white transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors relative group ${
                  isActive
                    ? 'bg-[#128C7E] text-white'
                    : 'text-[#c3e6e3] hover:bg-[#128C7E] hover:text-white'
                }`
              }
            >
              <Icon size={18} className="flex-shrink-0" />
              {!collapsed && <span>{label}</span>}
              {collapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
                  {label}
                </div>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Collapse toggle when collapsed */}
        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            className="flex items-center justify-center py-3 text-[#a8d8d4] hover:text-white border-t border-[#128C7E]"
          >
            <ChevronRight size={16} />
          </button>
        )}

        {/* User info */}
        {!collapsed && (
          <div className="p-4 border-t border-[#128C7E]">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#25D366] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {user?.name?.charAt(0)?.toUpperCase() || 'A'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.name || 'Admin'}</p>
                <span className="inline-block px-1.5 py-0.5 bg-[#25D366] text-white text-xs rounded capitalize">
                  {user?.role || 'admin'}
                </span>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Mobile sidebar */}
      {mobileOpen && <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setMobileOpen(false)} />}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 transform lg:hidden transition-transform ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } bg-[#075E54] text-white flex flex-col shadow-xl`}
      >
        <div className="flex items-center justify-between px-4 py-4 border-b border-[#128C7E]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#25D366] flex items-center justify-center flex-shrink-0">
              <MessageSquare size={16} className="text-white" />
            </div>
            <span className="font-bold text-sm leading-tight">Hotel WA</span>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="text-[#a8d8d4] hover:text-white transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
        </div>
        <nav className="flex-1 py-4 overflow-y-auto">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[#128C7E] text-white'
                    : 'text-[#c3e6e3] hover:bg-[#128C7E] hover:text-white'
                }`
              }
            >
              <Icon size={18} className="flex-shrink-0" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top header */}
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen((open) => !open)}
              className="lg:hidden p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Menu size={18} />
            </button>
            <div>
              <h1 className="text-base font-semibold text-gray-800">
                {user?.hotel?.name || 'Your Hotel'}
              </h1>
              <p className="text-xs text-gray-500">WhatsApp Guest Communication Platform</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
              <Bell size={18} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-[#25D366] rounded-full"></span>
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#25D366] flex items-center justify-center text-white font-bold text-sm">
                {user?.name?.charAt(0)?.toUpperCase() || 'A'}
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-medium text-gray-700">{user?.name || 'Admin'}</p>
                <span className="inline-block px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded capitalize">
                  {user?.role || 'admin'}
                </span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut size={16} />
              <span className="hidden md:inline">Logout</span>
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto min-h-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
