import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { auth } from '../api/index.js';

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#075E54] via-[#128C7E] to-[#25D366] flex items-center justify-center p-4">
      {/* Background pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full opacity-5 bg-white"
            style={{
              width: `${120 + i * 80}px`,
              height: `${120 + i * 80}px`,
              top: `${10 + i * 12}%`,
              left: `${5 + i * 14}%`,
            }}
          />
        ))}
      </div>

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#075E54] to-[#128C7E] px-8 py-8 text-center">
            <div className="w-16 h-16 bg-white rounded-2xl shadow-lg flex items-center justify-center mx-auto mb-4">
              <MessageSquare size={32} className="text-[#25D366]" />
            </div>
            <h1 className="text-2xl font-bold text-white">Hotel WA SaaS</h1>
            <p className="text-[#a8d8d4] text-sm mt-1">Guest Communication Platform</p>
          </div>

          {/* Form */}
          <div className="px-8 py-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-1">Welcome back</h2>
            <p className="text-gray-500 text-sm mb-6">Sign in to your hotel dashboard</p>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-start gap-2">
                <span className="mt-0.5">⚠</span>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="rounded-lg border border-[#25D366]/20 bg-[#effffb] p-3 text-xs text-[#075E54]">
                Use admin@demo.com / Admin@123 for the default seeded account.
              </div>
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="admin@demo.com"
                    className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#25D366] focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-10 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#25D366] focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>

            <p className="mt-6 text-center text-xs text-gray-400">
              Powered by WhatsApp Business API &bull; Secure &bull; Reliable
            </p>
          </div>
        </div>

        <p className="text-center text-white/60 text-xs mt-4">
          &copy; {new Date().getFullYear()} Hotel WA SaaS Platform
        </p>
      </div>
    </div>
  );
}
