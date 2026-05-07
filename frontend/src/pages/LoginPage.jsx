import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MessageSquare, Mail, Lock, Eye, EyeOff, Loader2,
  ShieldCheck, Zap, BarChart3, AlertCircle,
} from 'lucide-react';
import { auth } from '../api/index.js';

const features = [
  { icon: MessageSquare, title: 'Real-time Messaging', desc: 'Send & receive WhatsApp messages instantly with full conversation history.' },
  { icon: Zap, title: 'Smart Automation', desc: 'Automate welcome messages, check-in reminders, and more.' },
  { icon: BarChart3, title: 'Campaign Analytics', desc: 'Track delivery, read rates, and campaign ROI across all guests.' },
  { icon: ShieldCheck, title: 'Enterprise Security', desc: 'End-to-end encryption, webhook validation, and secure token management.' },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await auth.login(form);
      const { token, user } = res.data.data || res.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      navigate('/dashboard');
    } catch (err) {
      setError(
        err.response?.data?.message || err.response?.data?.error || 'Invalid credentials. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const inputCls = 'w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm bg-gray-50 text-gray-800 placeholder-gray-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#25D366]/30 focus:border-[#25D366] transition-all';

  return (
    <div className="min-h-dvh flex">

      {/* ── Left panel (branding) — hidden on mobile ──────── */}
      <div className="hidden lg:flex flex-col w-[52%] bg-[#0F1623] relative overflow-hidden p-12 text-white">
        {/* Decorative circles */}
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-[#25D366]/8" />
        <div className="absolute top-1/2 -right-32 w-80 h-80 rounded-full bg-[#25D366]/5" />
        <div className="absolute -bottom-20 left-1/3 w-64 h-64 rounded-full bg-[#128C7E]/10" />

        {/* Logo */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#25D366] to-[#075E54] flex items-center justify-center shadow-lg shadow-[#25D366]/30">
            <MessageSquare size={18} className="text-white" />
          </div>
          <div>
            <p className="text-base font-bold leading-tight">Hotel WA SaaS</p>
            <p className="text-xs text-[#25D366] font-medium leading-tight">Guest Communication Platform</p>
          </div>
        </div>

        {/* Headline */}
        <div className="flex-1 flex flex-col justify-center relative z-10 mt-16">
          <h1 className="text-4xl font-bold leading-snug text-white mb-4">
            Elevate your<br />
            <span className="text-[#25D366]">guest experience</span><br />
            with WhatsApp
          </h1>
          <p className="text-white/50 text-base leading-relaxed max-w-sm">
            The all-in-one platform to manage WhatsApp conversations, automate messages, and run campaigns — built for modern hotels.
          </p>

          {/* Features */}
          <div className="mt-10 space-y-5">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-4">
                <div className="w-9 h-9 rounded-xl bg-[#25D366]/12 border border-[#25D366]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Icon size={16} className="text-[#25D366]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{title}</p>
                  <p className="text-xs text-white/40 mt-0.5 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="text-xs text-white/20 relative z-10">&copy; {new Date().getFullYear()} Hotel WA SaaS. All rights reserved.</p>
      </div>

      {/* ── Right panel (form) ──────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center bg-white px-6 py-12 relative">

        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2.5 mb-8 self-start">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-[#25D366] to-[#075E54] flex items-center justify-center">
            <MessageSquare size={16} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">Hotel WA SaaS</p>
            <p className="text-[10px] text-[#25D366] font-medium">Guest Communication Platform</p>
          </div>
        </div>

        <div className="w-full max-w-[380px]">
          {/* Heading */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Welcome back</h2>
            <p className="text-sm text-gray-400 mt-1">Sign in to your dashboard</p>
          </div>

          {/* Demo hint */}
          <div className="mb-6 flex items-center gap-2.5 p-3.5 bg-[#25D366]/6 border border-[#25D366]/15 rounded-2xl">
            <ShieldCheck size={14} className="text-[#25D366] flex-shrink-0" />
            <p className="text-xs text-[#075E54] font-medium">
              Demo: <span className="font-bold">admin@demo.com</span> / <span className="font-bold">Admin@123</span>
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-5 flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm">
              <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email address</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="admin@demo.com"
                  className={inputCls}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Password</label>
              <div className="relative">
                <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••"
                  className={`${inputCls} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 bg-[#25D366] text-white text-sm font-bold rounded-2xl hover:bg-[#128C7E] transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-[#25D366]/25 active:scale-[0.98] mt-2"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Signing in…
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-[11px] text-gray-300">
            Secured with WhatsApp Business API &bull; End-to-end encrypted
          </p>
        </div>
      </div>
    </div>
  );
}
