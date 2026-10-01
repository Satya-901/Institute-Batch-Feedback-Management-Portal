'use client';

import React, { useState } from 'react';
import { Lock, School } from 'lucide-react';
import { checkAdminCredentials } from '@/lib/storage';
import { toastSuccess, toastError } from '@/lib/notification';

interface AdminLoginProps {
  onLoginSuccess: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      toastError('Please enter username and password');
      return;
    }

    setLoading(true);
    const valid = await checkAdminCredentials(username.trim(), password.trim());
    setLoading(false);

    if (valid) {
      toastSuccess('Welcome to Admin Portal');
      onLoginSuccess();
    } else {
      toastError('Invalid username or password');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Brand Card */}
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
          {/* Top Banner */}
          <div className="bg-slate-900 text-white p-6 text-center border-b border-slate-800">
            <div className="w-12 h-12 rounded-xl bg-teal-600 flex items-center justify-center mx-auto mb-3 text-white shadow-md">
              <School className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">EduPulse Administration</h1>
            <p className="text-xs text-slate-400 mt-1">
              Class, Batch, Faculty & Feedback Management Portal
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Admin Username
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg shadow-sm transition-all flex items-center justify-center space-x-2"
            >
              <Lock className="w-4 h-4" />
              <span>{loading ? 'Authenticating...' : 'Sign In as Admin'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
